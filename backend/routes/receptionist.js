// routes/receptionist.js
// Receptionist dashboard
// Can see all bookings, confirm appointments, assign doctors, schedule UK TB

const express = require('express');
const pool    = require('../db');
const mailer  = require('../utils/mailer');
const { requireReceptionist } = require('../middleware/auth');

const router = express.Router();

router.use(requireReceptionist);


// ── GET /receptionist  →  Dashboard ──────────────────────────
router.get('/', async (req, res) => {
  try {
    const [pending, confirmed, uktb, doctors] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total FROM bookings WHERE status = 'pending'`),
      pool.query(`SELECT COUNT(*) AS total FROM bookings WHERE status = 'confirmed'`),
      pool.query(`SELECT COUNT(*) AS total FROM uktb_screenings
                  WHERE paystack_status = 'success' AND booking_status = 'paid'`),
      pool.query(`SELECT id, full_name, specialty FROM users
                  WHERE role = 'doctor' AND is_active = TRUE ORDER BY full_name`)
    ]);

    res.send(renderDashboard({
      pending:   pending.rows[0].total,
      confirmed: confirmed.rows[0].total,
      uktb:      uktb.rows[0].total,
      doctors:   doctors.rows
    }, req.session));

  } catch (err) {
    console.error('Receptionist dashboard error:', err.message);
    res.status(500).send('Error loading dashboard');
  }
});


// ── GET /receptionist/bookings  →  All bookings ───────────────
router.get('/bookings', async (req, res) => {
  const status = req.query.status || 'pending';
  const page   = parseInt(req.query.page) || 1;
  const limit  = 20;
  const offset = (page - 1) * limit;

  try {
    const [rows, count, doctors] = await Promise.all([
      pool.query(`
        SELECT b.*, u.full_name AS doctor_name, u.specialty AS doctor_specialty
        FROM bookings b
        LEFT JOIN users u ON b.assigned_doctor_id = u.id
        WHERE b.status = $1
        ORDER BY b.created_at DESC
        LIMIT $2 OFFSET $3`,
        [status, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM bookings WHERE status = $1`, [status]),
      pool.query(`SELECT id, full_name, specialty FROM users
                  WHERE role = 'doctor' AND is_active = TRUE ORDER BY full_name`)
    ]);

    const totalPages = Math.ceil(parseInt(count.rows[0].count) / limit);

    res.send(renderBookings(
      rows.rows,
      doctors.rows,
      { status, page, totalPages },
      req.session
    ));

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error loading bookings');
  }
});


// ── POST /receptionist/bookings/:id/confirm  →  Confirm booking
// This is the key action — receptionist picks doctor, date, time
// System sends emails to patient and doctor automatically
router.post('/bookings/:id/confirm', async (req, res) => {
  const { id } = req.params;
  const { assigned_doctor_id, confirmed_date, confirmed_time, receptionist_notes } = req.body;

  if (!assigned_doctor_id || !confirmed_date || !confirmed_time) {
    return res.redirect(`/receptionist/bookings?status=pending&error=Please fill all fields`);
  }

  try {
    // Get the booking details
    const bookingResult = await pool.query(
      'SELECT * FROM bookings WHERE id = $1',
      [id]
    );

    if (!bookingResult.rows.length) {
      return res.redirect('/receptionist/bookings?status=pending');
    }

    const booking = bookingResult.rows[0];

    // Get the doctor details
    const doctorResult = await pool.query(
      'SELECT id, full_name, specialty, email FROM users WHERE id = $1',
      [assigned_doctor_id]
    );

    if (!doctorResult.rows.length) {
      return res.redirect('/receptionist/bookings?status=pending&error=Doctor not found');
    }

    const doctor = doctorResult.rows[0];

    // Update the booking
    await pool.query(`
      UPDATE bookings SET
        status             = 'confirmed',
        assigned_doctor_id = $1,
        confirmed_date     = $2,
        confirmed_time     = $3,
        receptionist_notes = $4,
        confirmed_at       = NOW()
      WHERE id = $5`,
      [assigned_doctor_id, confirmed_date, confirmed_time, receptionist_notes || null, id]
    );

    // Format date and time nicely for emails
    const formattedDate = new Date(confirmed_date).toLocaleDateString('en-GB', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Format time from 24hr to 12hr
    const [hours, minutes] = confirmed_time.split(':');
    const h = parseInt(hours);
    const formattedTime = `${h > 12 ? h - 12 : h || 12}:${minutes} ${h >= 12 ? 'PM' : 'AM'}`;

    // Send emails to patient and doctor simultaneously
    const emailData = {
      booking,
      doctor,
      formattedDate,
      formattedTime,
      confirmed_date,
      confirmed_time
    };

    Promise.all([
      mailer.sendAppointmentConfirmationToPatient(emailData),
      mailer.sendAppointmentNotificationToDoctor(emailData)
    ]).catch(err => {
      console.error('Email error (confirm appointment):', err.message);
    });

    res.redirect('/receptionist/bookings?status=confirmed&success=Appointment confirmed and emails sent');

  } catch (err) {
    console.error('Confirm booking error:', err.message);
    res.redirect('/receptionist/bookings?status=pending&error=Error confirming appointment');
  }
});


// ── POST /receptionist/bookings/:id/cancel ────────────────────
router.post('/bookings/:id/cancel', async (req, res) => {
  await pool.query(
    `UPDATE bookings SET status = 'cancelled' WHERE id = $1`,
    [req.params.id]
  );
  res.redirect('/receptionist/bookings?status=pending');
});


// ── GET /receptionist/uktb  →  Paid TB screenings ────────────
router.get('/uktb', async (req, res) => {
  try {
    const [screenings, doctors] = await Promise.all([
      pool.query(`
        SELECT s.*, u.full_name AS doctor_name
        FROM uktb_screenings s
        LEFT JOIN users u ON s.assigned_doctor_id = u.id
        WHERE s.paystack_status = 'success'
        ORDER BY s.created_at DESC`
      ),
      pool.query(`SELECT id, full_name, specialty FROM users
                  WHERE role = 'doctor' AND is_active = TRUE ORDER BY full_name`)
    ]);

    res.send(renderUKTB(screenings.rows, doctors.rows, req.session));

  } catch (err) {
    res.status(500).send('Error loading TB screenings');
  }
});


// ── POST /receptionist/uktb/:id/schedule ─────────────────────
router.post('/uktb/:id/schedule', async (req, res) => {
  const { id } = req.params;
  const { assigned_doctor_id, confirmed_date, confirmed_time } = req.body;

  if (!assigned_doctor_id || !confirmed_date || !confirmed_time) {
    return res.redirect('/receptionist/uktb?error=Please fill all fields');
  }

  try {
    const [screeningResult, doctorResult] = await Promise.all([
      pool.query('SELECT * FROM uktb_screenings WHERE id = $1', [id]),
      pool.query('SELECT * FROM users WHERE id = $1', [assigned_doctor_id])
    ]);

    if (!screeningResult.rows.length) return res.redirect('/receptionist/uktb');

    const screening = screeningResult.rows[0];
    const doctor    = doctorResult.rows[0];

    await pool.query(`
      UPDATE uktb_screenings SET
        booking_status     = 'scheduled',
        assigned_doctor_id = $1,
        confirmed_date     = $2,
        confirmed_time     = $3
      WHERE id = $4`,
      [assigned_doctor_id, confirmed_date, confirmed_time, id]
    );

    const formattedDate = new Date(confirmed_date).toLocaleDateString('en-GB', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const [hours, minutes] = confirmed_time.split(':');
    const h = parseInt(hours);
    const formattedTime = `${h > 12 ? h - 12 : h || 12}:${minutes} ${h >= 12 ? 'PM' : 'AM'}`;

    Promise.all([
      mailer.sendUKTBScheduledToPatient({ screening, doctor, formattedDate, formattedTime }),
      mailer.sendUKTBScheduledToDoctor({ screening, doctor, formattedDate, formattedTime })
    ]).catch(err => {
      console.error('UKTB schedule email error:', err.message);
    });

    res.redirect('/receptionist/uktb?success=TB screening scheduled');

  } catch (err) {
    console.error('UKTB schedule error:', err.message);
    res.redirect('/receptionist/uktb?error=Error scheduling screening');
  }
});


// ════════════════════════════════════════════════════════════
// HTML RENDER FUNCTIONS
// ════════════════════════════════════════════════════════════

function layout(title, content, session, activePage = '') {
  const navItems = [
    { href: '/receptionist',          label: 'Dashboard', icon: '📊' },
    { href: '/receptionist/bookings?status=pending',   label: 'Pending',   icon: '🔔' },
    { href: '/receptionist/bookings?status=confirmed', label: 'Confirmed', icon: '✅' },
    { href: '/receptionist/uktb',     label: 'UK TB',     icon: '✈️'  },
  ];

  const navHTML = navItems.map(item => `
    <a href="${item.href}"
       style="display:flex;align-items:center;gap:10px;padding:10px 16px;
              border-radius:8px;font-size:13px;font-weight:500;
              color:${activePage===item.href?'#fff':'rgba(255,255,255,0.65)'};
              background:${activePage===item.href?'rgba(255,255,255,0.12)':'transparent'};
              text-decoration:none;">
      <span>${item.icon}</span>${item.label}
    </a>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — Receptionist</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
           background:#F0F4F8; color:#0D1B2E; display:flex; min-height:100vh; }
    a { text-decoration:none; color:inherit; }
    table { border-collapse:collapse; width:100%; }
    th,td { text-align:left; padding:12px 16px; border-bottom:1px solid #E2E8F0; font-size:13px; }
    th { font-size:11px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase;
         color:#7A8BAA; background:#F7F8FA; }
    tr:hover td { background:#F7FBFF; }
    .badge { display:inline-flex; align-items:center; padding:3px 10px;
             border-radius:20px; font-size:11px; font-weight:600; }
    .badge-pending   { background:#FEF3C7; color:#92400E; }
    .badge-confirmed { background:#DBEAFE; color:#1E40AF; }
    .badge-seen      { background:#D1FAE5; color:#065F46; }
    .badge-cancelled { background:#FEE2E2; color:#991B1B; }
    .badge-paid      { background:#D1FAE5; color:#065F46; }
    .badge-scheduled { background:#DBEAFE; color:#1E40AF; }
    .card { background:#fff; border-radius:12px; border:1px solid #E2E8F0; }
    .btn { display:inline-flex; align-items:center; gap:6px; padding:8px 16px;
           border-radius:8px; font-size:13px; font-weight:600; cursor:pointer;
           border:none; font-family:inherit; }
    .btn-navy  { background:#002B5C; color:#fff; }
    .btn-red   { background:#DC2626; color:#fff; }
    .btn-green { background:#059669; color:#fff; }
    select.sel { padding:7px 10px; border:1px solid #CBD5E1; border-radius:6px;
                 font-size:12px; background:#fff; font-family:inherit; width:100%; }
    input.inp  { padding:8px 10px; border:1px solid #CBD5E1; border-radius:6px;
                 font-size:13px; font-family:inherit; outline:none; width:100%; }
    input.inp:focus { border-color:#1E9FD4; }
    .alert-success { background:#D1FAE5; color:#065F46; padding:10px 14px;
                     border-radius:8px; font-size:13px; margin-bottom:16px; }
    .alert-error   { background:#FEE2E2; color:#991B1B; padding:10px 14px;
                     border-radius:8px; font-size:13px; margin-bottom:16px; }
  </style>
</head>
<body>

  <!-- Sidebar -->
  <aside style="width:210px;background:#001A3A;padding:24px 16px;
                display:flex;flex-direction:column;gap:4px;flex-shrink:0;
                position:sticky;top:0;height:100vh;">

    <div style="padding:0 8px;margin-bottom:24px;">
      <div style="font-family:Georgia,serif;font-size:15px;font-weight:600;color:#fff;">
        St. Nicholas
      </div>
      <div style="font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:0.14em;
                  text-transform:uppercase;margin-top:2px;">Receptionist</div>
    </div>

    ${navHTML}

    <div style="margin-top:auto;padding-top:24px;border-top:1px solid rgba(255,255,255,0.08);">
      <div style="font-size:12px;color:rgba(255,255,255,0.5);padding:0 8px;margin-bottom:10px;">
        ${session.fullName}
      </div>
      <form method="POST" action="/logout">
        <button style="width:100%;background:rgba(255,255,255,0.07);
                       border:1px solid rgba(255,255,255,0.12);
                       color:rgba(255,255,255,0.65);padding:8px;border-radius:8px;
                       cursor:pointer;font-size:12px;font-family:inherit;">Sign Out</button>
      </form>
    </div>
  </aside>

  <!-- Main -->
  <main style="flex:1;padding:32px;overflow-y:auto;">
    <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:600;
               color:#002B5C;margin-bottom:4px;">${title}</h1>
    <div style="height:1px;background:#E2E8F0;margin:20px 0 28px;"></div>
    ${content}
  </main>

</body>
</html>`;
}


// ── Dashboard ─────────────────────────────────────────────────
function renderDashboard(stats, session) {
  const content = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px;">
      <div class="card" style="padding:24px;background:#FEF3C7;border-color:transparent;">
        <div style="font-size:40px;font-weight:700;color:#92400E;font-family:Georgia,serif;line-height:1;">
          ${stats.pending}
        </div>
        <div style="font-size:12px;color:#92400E;margin-top:6px;text-transform:uppercase;letter-spacing:0.08em;">
          Pending Bookings
        </div>
        <a href="/receptionist/bookings?status=pending"
           style="display:inline-block;margin-top:12px;font-size:12px;
                  font-weight:600;color:#92400E;text-decoration:underline;">
          View and confirm →
        </a>
      </div>

      <div class="card" style="padding:24px;background:#DBEAFE;border-color:transparent;">
        <div style="font-size:40px;font-weight:700;color:#1E40AF;font-family:Georgia,serif;line-height:1;">
          ${stats.confirmed}
        </div>
        <div style="font-size:12px;color:#1E40AF;margin-top:6px;text-transform:uppercase;letter-spacing:0.08em;">
          Confirmed Today
        </div>
        <a href="/receptionist/bookings?status=confirmed"
           style="display:inline-block;margin-top:12px;font-size:12px;
                  font-weight:600;color:#1E40AF;text-decoration:underline;">
          View confirmed →
        </a>
      </div>

      <div class="card" style="padding:24px;background:#D1FAE5;border-color:transparent;">
        <div style="font-size:40px;font-weight:700;color:#065F46;font-family:Georgia,serif;line-height:1;">
          ${stats.uktb}
        </div>
        <div style="font-size:12px;color:#065F46;margin-top:6px;text-transform:uppercase;letter-spacing:0.08em;">
          TB Paid — Need Scheduling
        </div>
        <a href="/receptionist/uktb"
           style="display:inline-block;margin-top:12px;font-size:12px;
                  font-weight:600;color:#065F46;text-decoration:underline;">
          Schedule now →
        </a>
      </div>
    </div>

    <div class="card" style="padding:20px;">
      <div style="font-size:14px;font-weight:600;color:#002B5C;margin-bottom:12px;">
        Active Doctors (${stats.doctors.length})
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${stats.doctors.map(d => `
          <div style="background:#F7F8FA;border:1px solid #E2E8F0;border-radius:8px;
                      padding:8px 14px;">
            <div style="font-size:13px;font-weight:600;color:#002B5C;">${d.full_name}</div>
            <div style="font-size:11px;color:#7A8BAA;">${d.specialty || 'General'}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  return layout('Dashboard', content, session, '/receptionist');
}


// ── Bookings ──────────────────────────────────────────────────
function renderBookings(bookings, doctors, pagination, session) {
  const urlParams  = new URLSearchParams();
  const successMsg = ''; // would come from query params in real use
  const errorMsg   = '';

  const statuses = ['pending', 'confirmed', 'seen', 'cancelled'];
  const tabs = statuses.map(s => `
    <a href="/receptionist/bookings?status=${s}"
       style="padding:8px 18px;border-radius:20px;font-size:12px;font-weight:500;
              background:${pagination.status===s?'#002B5C':'#fff'};
              color:${pagination.status===s?'#fff':'#7A8BAA'};
              border:1px solid ${pagination.status===s?'#002B5C':'#E2E8F0'};">${s}</a>
  `).join('');

  // Doctor select options
  const doctorOptions = doctors.map(d =>
    `<option value="${d.id}">${d.full_name}${d.specialty ? ` — ${d.specialty}` : ''}</option>`
  ).join('');

  const rows = bookings.map(b => `
    <tr>
      <td>
        <strong style="color:#002B5C;display:block;">${b.name}</strong>
        <span style="font-size:12px;color:#7A8BAA;">${b.phone}</span>
        ${b.email ? `<span style="font-size:12px;color:#7A8BAA;display:block;">${b.email}</span>` : ''}
      </td>
      <td>
        <span style="font-weight:500;">${b.branch}</span><br>
        <span style="font-size:12px;color:#7A8BAA;">${b.specialty}</span>
      </td>
      <td style="color:#7A8BAA;font-size:12px;">
        ${b.preferred_date ? new Date(b.preferred_date).toLocaleDateString('en-GB') : 'Flexible'}
      </td>
      <td style="color:#7A8BAA;font-size:12px;max-width:150px;">
        ${b.message || '—'}
      </td>
      <td><span class="badge badge-${b.status}">${b.status}</span></td>
      <td style="color:#7A8BAA;">
        ${b.doctor_name ? `<strong>${b.doctor_name}</strong><br>
        <span style="font-size:12px;">${new Date(b.confirmed_date).toLocaleDateString('en-GB')} at ${b.confirmed_time}</span>` : '—'}
      </td>
      <td style="min-width:280px;">
        ${b.status === 'pending' ? `
          <details style="cursor:pointer;">
            <summary style="font-size:12px;font-weight:600;color:#1E9FD4;list-style:none;
                            padding:6px 12px;background:#F0F9FF;border-radius:6px;
                            border:1px solid #BAE6FD;">
              ▶ Confirm Appointment
            </summary>
            <form method="POST" action="/receptionist/bookings/${b.id}/confirm"
                  style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
              <select name="assigned_doctor_id" class="sel" required>
                <option value="">Select Doctor</option>
                ${doctorOptions}
              </select>
              <input class="inp" type="date" name="confirmed_date"
                     min="${new Date().toISOString().split('T')[0]}" required>
              <input class="inp" type="time" name="confirmed_time" required>
              <textarea name="receptionist_notes" placeholder="Internal notes (optional)"
                style="padding:8px;border:1px solid #CBD5E1;border-radius:6px;
                       font-size:12px;font-family:inherit;resize:vertical;min-height:60px;"></textarea>
              <div style="display:flex;gap:8px;">
                <button type="submit" class="btn btn-navy" style="flex:1;justify-content:center;font-size:12px;">
                  ✅ Confirm & Send Emails
                </button>
              </div>
            </form>
            <form method="POST" action="/receptionist/bookings/${b.id}/cancel"
                  style="margin-top:6px;">
              <button class="btn btn-red" style="width:100%;justify-content:center;font-size:12px;">
                ✗ Cancel Booking
              </button>
            </form>
          </details>
        ` : '—'}
      </td>
    </tr>
  `).join('');

  const content = `
    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;">${tabs}</div>

    <div class="card" style="overflow:auto;">
      <table>
        <thead><tr>
          <th>Patient</th><th>Branch / Specialty</th><th>Preferred Date</th>
          <th>Message</th><th>Status</th><th>Assigned</th>
          ${pagination.status === 'pending' ? '<th>Action</th>' : ''}
        </tr></thead>
        <tbody>
          ${rows || `<tr><td colspan="7" style="text-align:center;color:#7A8BAA;padding:40px;">
            No ${pagination.status} bookings
          </td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  return layout(
    `${pagination.status.charAt(0).toUpperCase() + pagination.status.slice(1)} Bookings`,
    content, session,
    `/receptionist/bookings?status=${pagination.status}`
  );
}


// ── UK TB ─────────────────────────────────────────────────────
function renderUKTB(screenings, doctors, session) {
  const doctorOptions = doctors.map(d =>
    `<option value="${d.id}">${d.full_name}${d.specialty ? ` — ${d.specialty}` : ''}</option>`
  ).join('');

  const rows = screenings.map(s => `
    <tr>
      <td>
        <strong style="color:#002B5C;">${s.name}</strong><br>
        <span style="font-size:12px;color:#7A8BAA;">${s.phone}</span>
      </td>
      <td style="color:#7A8BAA;">${s.email}</td>
      <td style="text-align:center;">${s.num_applicants}</td>
      <td>₦${(s.amount_kobo/100).toLocaleString()}</td>
      <td><span class="badge badge-${s.booking_status}">${s.booking_status}</span></td>
      <td style="color:#7A8BAA;">
        ${s.doctor_name ? `<strong>${s.doctor_name}</strong><br>
        <span style="font-size:12px;">${new Date(s.confirmed_date).toLocaleDateString('en-GB')}</span>` : '—'}
      </td>
      <td style="min-width:260px;">
        ${s.booking_status === 'paid' ? `
          <details style="cursor:pointer;">
            <summary style="font-size:12px;font-weight:600;color:#1E9FD4;
                            padding:6px 12px;background:#F0F9FF;border-radius:6px;
                            border:1px solid #BAE6FD;list-style:none;">
              ▶ Schedule Screening
            </summary>
            <form method="POST" action="/receptionist/uktb/${s.id}/schedule"
                  style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
              <select name="assigned_doctor_id" class="sel" required>
                <option value="">Select Doctor</option>
                ${doctorOptions}
              </select>
              <input class="inp" type="date" name="confirmed_date"
                     min="${new Date().toISOString().split('T')[0]}" required>
              <input class="inp" type="time" name="confirmed_time" required>
              <button type="submit" class="btn btn-navy"
                      style="justify-content:center;font-size:12px;">
                ✅ Schedule & Send Emails
              </button>
            </form>
          </details>
        ` : '—'}
      </td>
    </tr>
  `).join('');

  const content = `
    <div class="card" style="overflow:auto;">
      <table>
        <thead><tr>
          <th>Patient</th><th>Email</th><th>Applicants</th>
          <th>Amount</th><th>Status</th><th>Doctor / Date</th><th>Action</th>
        </tr></thead>
        <tbody>
          ${rows || `<tr><td colspan="7" style="text-align:center;color:#7A8BAA;padding:40px;">
            No paid TB screenings pending scheduling
          </td></tr>`}
        </tbody>
      </table>
    </div>
  `;
  return layout('UK TB Screenings', content, session, '/receptionist/uktb');
}


module.exports = router;

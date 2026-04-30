// routes/doctor.js
// Doctor dashboard — each doctor only sees their own patients
// Can mark patients as seen after the appointment

const express = require('express');
const pool    = require('../db');
const { requireDoctor } = require('../middleware/auth');

const router = express.Router();

router.use(requireDoctor);


// ── GET /doctor  →  My patients ──────────────────────────────
router.get('/', async (req, res) => {
  const doctorId = req.session.userId;
  const status   = req.query.status || 'confirmed';

  try {
    const [patients, counts] = await Promise.all([
      pool.query(`
        SELECT * FROM bookings
        WHERE assigned_doctor_id = $1
          AND status = $2
        ORDER BY confirmed_date ASC, confirmed_time ASC`,
        [doctorId, status]
      ),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed,
          COUNT(*) FILTER (WHERE status = 'seen')      AS seen,
          COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled
        FROM bookings
        WHERE assigned_doctor_id = $1`,
        [doctorId]
      )
    ]);

    res.send(renderDashboard(
      patients.rows,
      counts.rows[0],
      status,
      req.session
    ));

  } catch (err) {
    console.error('Doctor dashboard error:', err.message);
    res.status(500).send('Error loading patients');
  }
});


// ── POST /doctor/patients/:id/seen  →  Mark as seen ──────────
router.post('/patients/:id/seen', async (req, res) => {
  const doctorId = req.session.userId;

  try {
    // Security check — make sure this booking actually belongs to this doctor
    // A doctor cannot mark someone else's patient as seen
    const result = await pool.query(
      `UPDATE bookings
       SET status  = 'seen',
           seen_at = NOW()
       WHERE id = $1
         AND assigned_doctor_id = $2
         AND status = 'confirmed'
       RETURNING id`,
      [req.params.id, doctorId]
    );

    if (!result.rows.length) {
      return res.redirect('/doctor?error=Booking not found or already updated');
    }

    res.redirect('/doctor?status=confirmed&success=Patient marked as seen');

  } catch (err) {
    console.error('Mark seen error:', err.message);
    res.redirect('/doctor');
  }
});


// ── GET /doctor/history  →  Past patients (seen) ─────────────
router.get('/history', async (req, res) => {
  const doctorId = req.session.userId;

  try {
    const patients = await pool.query(`
      SELECT * FROM bookings
      WHERE assigned_doctor_id = $1
        AND status = 'seen'
      ORDER BY seen_at DESC
      LIMIT 50`,
      [doctorId]
    );

    res.send(renderHistory(patients.rows, req.session));

  } catch (err) {
    res.status(500).send('Error loading history');
  }
});


// ════════════════════════════════════════════════════════════
// HTML RENDER FUNCTIONS
// ════════════════════════════════════════════════════════════

function layout(title, content, session) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — Doctor Portal</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
           background:#F0F4F8; color:#0D1B2E; display:flex; min-height:100vh; }
    a { text-decoration:none; color:inherit; }
    .card { background:#fff; border-radius:12px; border:1px solid #E2E8F0; }
    .badge { display:inline-flex; align-items:center; padding:3px 10px;
             border-radius:20px; font-size:11px; font-weight:600; }
    .badge-confirmed { background:#DBEAFE; color:#1E40AF; }
    .badge-seen      { background:#D1FAE5; color:#065F46; }
    .btn { display:inline-flex; align-items:center; gap:6px; padding:8px 16px;
           border-radius:8px; font-size:13px; font-weight:600; cursor:pointer;
           border:none; font-family:inherit; transition:all 0.2s; }
    .btn-navy  { background:#002B5C; color:#fff; }
    .btn-navy:hover { background:#003D80; }
    .btn-green { background:#059669; color:#fff; }
    .btn-green:hover { background:#047857; }
  </style>
</head>
<body>

  <!-- Sidebar -->
  <aside style="width:210px;background:#001A3A;padding:24px 16px;
                display:flex;flex-direction:column;gap:4px;flex-shrink:0;
                position:sticky;top:0;height:100vh;">

    <div style="padding:0 8px;margin-bottom:28px;">
      <div style="font-family:Georgia,serif;font-size:15px;font-weight:600;color:#fff;">
        St. Nicholas
      </div>
      <div style="font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:0.14em;
                  text-transform:uppercase;margin-top:2px;">Doctor Portal</div>
    </div>

    <a href="/doctor"
       style="display:flex;align-items:center;gap:10px;padding:10px 16px;
              border-radius:8px;font-size:13px;font-weight:500;
              color:rgba(255,255,255,0.80);text-decoration:none;
              background:rgba(255,255,255,0.08);">
      👥 My Patients
    </a>

    <a href="/doctor/history"
       style="display:flex;align-items:center;gap:10px;padding:10px 16px;
              border-radius:8px;font-size:13px;font-weight:500;
              color:rgba(255,255,255,0.60);text-decoration:none;">
      📋 Past Patients
    </a>

    <div style="margin-top:auto;padding-top:24px;
                border-top:1px solid rgba(255,255,255,0.08);">
      <!-- Doctor info -->
      <div style="padding:12px 8px;background:rgba(255,255,255,0.06);
                  border-radius:8px;margin-bottom:10px;">
        <div style="font-size:13px;font-weight:600;color:#fff;">${session.fullName}</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:2px;">Doctor</div>
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


// ── Dashboard / Patient list ───────────────────────────────────
function renderDashboard(patients, counts, activeStatus, session) {
  const tabs = [
    { status: 'confirmed', label: 'Upcoming', count: counts.confirmed },
    { status: 'seen',      label: 'Seen',     count: counts.seen },
    { status: 'cancelled', label: 'Cancelled', count: counts.cancelled }
  ];

  const tabHTML = tabs.map(t => `
    <a href="/doctor?status=${t.status}"
       style="display:flex;align-items:center;gap:8px;padding:8px 18px;
              border-radius:20px;font-size:13px;font-weight:500;
              background:${activeStatus===t.status?'#002B5C':'#fff'};
              color:${activeStatus===t.status?'#fff':'#7A8BAA'};
              border:1px solid ${activeStatus===t.status?'#002B5C':'#E2E8F0'};">
      ${t.label}
      <span style="background:${activeStatus===t.status?'rgba(255,255,255,0.20)':'#F0F4F8'};
                   padding:1px 8px;border-radius:10px;font-size:11px;">${t.count}</span>
    </a>
  `).join('');

  // Patient cards
  const cards = patients.map(p => {
    const confirmedDate = p.confirmed_date
      ? new Date(p.confirmed_date).toLocaleDateString('en-GB', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })
      : '—';

    // Format time 24hr to 12hr
    let formattedTime = '—';
    if (p.confirmed_time) {
      const [h, m] = p.confirmed_time.split(':');
      const hour = parseInt(h);
      formattedTime = `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
    }

    // Check if appointment is today
    const isToday = p.confirmed_date &&
      new Date(p.confirmed_date).toDateString() === new Date().toDateString();

    return `
      <div class="card" style="padding:24px;position:relative;
           ${isToday ? 'border-color:#1E9FD4;border-left:4px solid #1E9FD4;' : ''}">

        ${isToday ? `
          <div style="position:absolute;top:16px;right:16px;
                      background:#DBEAFE;color:#1E40AF;padding:3px 10px;
                      border-radius:20px;font-size:11px;font-weight:700;">TODAY</div>
        ` : ''}

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
          <div>
            <div style="font-size:11px;color:#7A8BAA;text-transform:uppercase;
                        letter-spacing:0.08em;margin-bottom:4px;">Patient</div>
            <div style="font-size:18px;font-weight:600;color:#002B5C;
                        font-family:Georgia,serif;">${p.name}</div>
          </div>
          <div>
            <div style="font-size:11px;color:#7A8BAA;text-transform:uppercase;
                        letter-spacing:0.08em;margin-bottom:4px;">Contact</div>
            <div style="font-size:14px;font-weight:500;color:#0D1B2E;">${p.phone}</div>
            ${p.email ? `<div style="font-size:12px;color:#7A8BAA;">${p.email}</div>` : ''}
          </div>
          <div>
            <div style="font-size:11px;color:#7A8BAA;text-transform:uppercase;
                        letter-spacing:0.08em;margin-bottom:4px;">Appointment</div>
            <div style="font-size:14px;font-weight:500;color:#0D1B2E;">${confirmedDate}</div>
            <div style="font-size:14px;color:#1E9FD4;font-weight:600;">${formattedTime}</div>
          </div>
          <div>
            <div style="font-size:11px;color:#7A8BAA;text-transform:uppercase;
                        letter-spacing:0.08em;margin-bottom:4px;">Branch / Specialty</div>
            <div style="font-size:14px;font-weight:500;color:#0D1B2E;">${p.branch}</div>
            <div style="font-size:12px;color:#7A8BAA;">${p.specialty}</div>
          </div>
        </div>

        ${p.message ? `
          <div style="background:#F7F8FA;border-radius:8px;padding:12px 16px;
                      margin-bottom:16px;font-size:13px;color:#4A5568;line-height:1.6;">
            <strong style="color:#002B5C;">Patient note:</strong> ${p.message}
          </div>
        ` : ''}

        ${p.receptionist_notes ? `
          <div style="background:#FFF7ED;border-radius:8px;padding:12px 16px;
                      margin-bottom:16px;font-size:13px;color:#4A5568;line-height:1.6;
                      border-left:3px solid #F59E0B;">
            <strong style="color:#92400E;">Receptionist note:</strong> ${p.receptionist_notes}
          </div>
        ` : ''}

        ${activeStatus === 'confirmed' ? `
          <form method="POST" action="/doctor/patients/${p.id}/seen" style="margin:0;">
            <button type="submit" class="btn btn-green">
              ✓ Mark as Seen
            </button>
          </form>
        ` : `
          <span class="badge badge-${activeStatus}" style="font-size:12px;">
            ${activeStatus === 'seen' ? `Seen on ${new Date(p.seen_at).toLocaleDateString('en-GB')}` : activeStatus}
          </span>
        `}
      </div>
    `;
  }).join('');

  const content = `
    <div style="display:flex;gap:8px;margin-bottom:24px;">${tabHTML}</div>

    ${patients.length === 0
      ? `<div class="card" style="padding:48px;text-align:center;color:#7A8BAA;">
           No ${activeStatus} patients
         </div>`
      : `<div style="display:flex;flex-direction:column;gap:16px;">${cards}</div>`
    }
  `;

  return layout('My Patients', content, session);
}


// ── History ───────────────────────────────────────────────────
function renderHistory(patients, session) {
  const rows = patients.map(p => `
    <tr>
      <td><strong style="color:#002B5C;">${p.name}</strong></td>
      <td>${p.phone}</td>
      <td>${p.branch}</td>
      <td>${p.specialty}</td>
      <td style="color:#7A8BAA;font-size:12px;">
        ${p.confirmed_date ? new Date(p.confirmed_date).toLocaleDateString('en-GB') : '—'}
      </td>
      <td style="color:#7A8BAA;font-size:12px;">
        ${p.seen_at ? new Date(p.seen_at).toLocaleDateString('en-GB') : '—'}
      </td>
      <td><span class="badge badge-seen">Seen</span></td>
    </tr>
  `).join('');

  const content = `
    <div class="card" style="overflow:auto;">
      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr style="background:#F7F8FA;">
            <th style="text-align:left;padding:12px 16px;font-size:11px;font-weight:600;color:#7A8BAA;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid #E2E8F0;">Patient</th>
            <th style="text-align:left;padding:12px 16px;font-size:11px;font-weight:600;color:#7A8BAA;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid #E2E8F0;">Phone</th>
            <th style="text-align:left;padding:12px 16px;font-size:11px;font-weight:600;color:#7A8BAA;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid #E2E8F0;">Branch</th>
            <th style="text-align:left;padding:12px 16px;font-size:11px;font-weight:600;color:#7A8BAA;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid #E2E8F0;">Specialty</th>
            <th style="text-align:left;padding:12px 16px;font-size:11px;font-weight:600;color:#7A8BAA;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid #E2E8F0;">Appt Date</th>
            <th style="text-align:left;padding:12px 16px;font-size:11px;font-weight:600;color:#7A8BAA;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid #E2E8F0;">Seen On</th>
            <th style="text-align:left;padding:12px 16px;font-size:11px;font-weight:600;color:#7A8BAA;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid #E2E8F0;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="7" style="text-align:center;color:#7A8BAA;padding:40px;">No history yet</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
  return layout('Patient History', content, session);
}


module.exports = router;

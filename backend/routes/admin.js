// routes/admin.js
// Superadmin dashboard — full access to everything
// Can create/deactivate doctors and receptionists
// Can see all bookings, screenings, enquiries, applications

const express  = require('express');
const bcrypt   = require('bcryptjs');
const pool     = require('../db');
const { requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require superadmin role
router.use(requireSuperAdmin);


// ── GET /admin  →  Dashboard overview ────────────────────────
router.get('/', async (req, res) => {
  try {
    const [bookings, uktb, elderly, careers, newsletter, doctors, receptionists] =
      await Promise.all([
        pool.query(`SELECT
          COUNT(*)                                            AS total,
          COUNT(*) FILTER (WHERE status = 'pending')         AS pending,
          COUNT(*) FILTER (WHERE status = 'confirmed')       AS confirmed,
          COUNT(*) FILTER (WHERE status = 'seen')            AS seen
          FROM bookings`),
        pool.query(`SELECT
          COUNT(*)                                            AS total,
          COUNT(*) FILTER (WHERE paystack_status = 'success') AS paid
          FROM uktb_screenings`),
        pool.query(`SELECT COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'new')             AS new_count
          FROM elderly_enquiries`),
        pool.query(`SELECT COUNT(*) AS total FROM career_applications`),
        pool.query(`SELECT COUNT(*) AS total FROM newsletter_subscribers WHERE is_active = TRUE`),
        pool.query(`SELECT COUNT(*) AS total FROM users WHERE role = 'doctor' AND is_active = TRUE`),
        pool.query(`SELECT COUNT(*) AS total FROM users WHERE role = 'receptionist' AND is_active = TRUE`)
      ]);

    res.send(renderDashboard({
      bookings:      bookings.rows[0],
      uktb:          uktb.rows[0],
      elderly:       elderly.rows[0],
      careers:       careers.rows[0],
      newsletter:    newsletter.rows[0],
      doctors:       doctors.rows[0],
      receptionists: receptionists.rows[0]
    }, req.session));

  } catch (err) {
    console.error('Admin dashboard error:', err.message);
    res.status(500).send('Error loading dashboard');
  }
});


// ── GET /admin/bookings  →  All bookings ─────────────────────
router.get('/bookings', async (req, res) => {
  const status = req.query.status || '';
  const page   = parseInt(req.query.page) || 1;
  const limit  = 25;
  const offset = (page - 1) * limit;

  try {
    const where = status ? `WHERE b.status = '${status}'` : '';

    const [rows, count] = await Promise.all([
      pool.query(`
        SELECT b.*,
               u.full_name AS doctor_name,
               u.specialty AS doctor_specialty
        FROM bookings b
        LEFT JOIN users u ON b.assigned_doctor_id = u.id
        ${where}
        ORDER BY b.created_at DESC
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM bookings b ${where}`)
    ]);

    const totalPages = Math.ceil(parseInt(count.rows[0].count) / limit);
    res.send(renderBookings(rows.rows, { status, page, totalPages }, req.session));

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error loading bookings');
  }
});


// ── GET /admin/users  →  Manage staff accounts ───────────────
router.get('/users', async (req, res) => {
  try {
    const users = await pool.query(
      `SELECT id, full_name, email, role, specialty, is_active, last_login, created_at
       FROM users ORDER BY role, full_name`
    );
    res.send(renderUsers(users.rows, req.session));
  } catch (err) {
    res.status(500).send('Error loading users');
  }
});


// ── POST /admin/users/create  →  Create new staff account ────
router.post('/users/create', async (req, res) => {
  const { full_name, email, password, role, specialty } = req.body;

  if (!full_name || !email || !password || !role) {
    return res.redirect('/admin/users?error=All fields are required');
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, specialty)
       VALUES ($1, $2, $3, $4, $5)`,
      [full_name, email.toLowerCase().trim(), passwordHash, role, specialty || null]
    );

    res.redirect('/admin/users?success=Account created successfully');

  } catch (err) {
    if (err.code === '23505') {
      // Unique violation — email already exists
      return res.redirect('/admin/users?error=That email address is already registered');
    }
    console.error('Create user error:', err.message);
    res.redirect('/admin/users?error=Error creating account');
  }
});


// ── POST /admin/users/:id/toggle  →  Activate / Deactivate ───
router.post('/users/:id/toggle', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      'UPDATE users SET is_active = NOT is_active WHERE id = $1',
      [id]
    );
    res.redirect('/admin/users');
  } catch (err) {
    res.redirect('/admin/users');
  }
});


// ── GET /admin/uktb ──────────────────────────────────────────
router.get('/uktb', async (req, res) => {
  try {
    const rows = await pool.query(
      `SELECT s.*, u.full_name AS doctor_name
       FROM uktb_screenings s
       LEFT JOIN users u ON s.assigned_doctor_id = u.id
       ORDER BY s.created_at DESC LIMIT 100`
    );
    res.send(renderUKTB(rows.rows, req.session));
  } catch (err) {
    res.status(500).send('Error loading screenings');
  }
});


// ── GET /admin/elderly ───────────────────────────────────────
router.get('/elderly', async (req, res) => {
  try {
    const rows = await pool.query(
      'SELECT * FROM elderly_enquiries ORDER BY created_at DESC LIMIT 100'
    );
    res.send(renderElderly(rows.rows, req.session));
  } catch (err) {
    res.status(500).send('Error loading enquiries');
  }
});

router.post('/elderly/:id/status', async (req, res) => {
  await pool.query(
    'UPDATE elderly_enquiries SET status = $1 WHERE id = $2',
    [req.body.status, req.params.id]
  );
  res.redirect('/admin/elderly');
});


// ── GET /admin/careers ───────────────────────────────────────
router.get('/careers', async (req, res) => {
  try {
    const rows = await pool.query(
      'SELECT * FROM career_applications ORDER BY created_at DESC LIMIT 100'
    );
    res.send(renderCareers(rows.rows, req.session));
  } catch (err) {
    res.status(500).send('Error loading applications');
  }
});

router.post('/careers/:id/status', async (req, res) => {
  await pool.query(
    'UPDATE career_applications SET status = $1 WHERE id = $2',
    [req.body.status, req.params.id]
  );
  res.redirect('/admin/careers');
});

// CV download
router.get('/cv/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT cv_filepath, cv_filename FROM career_applications WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows.length || !result.rows[0].cv_filepath) {
      return res.status(404).send('CV not found');
    }
    // cv_filepath is now a Cloudinary URL — just redirect to it
    return res.redirect(result.rows[0].cv_filepath);
  } catch (err) {
    res.status(500).send('Error downloading CV');
  }
});

// ── GET /admin/newsletter ────────────────────────────────────
router.get('/newsletter', async (req, res) => {
  try {
    const rows = await pool.query(
      'SELECT * FROM newsletter_subscribers WHERE is_active = TRUE ORDER BY subscribed_at DESC'
    );
    res.send(renderNewsletter(rows.rows, req.session));
  } catch (err) {
    res.status(500).send('Error loading subscribers');
  }
});


// ════════════════════════════════════════════════════════════
// HTML RENDER FUNCTIONS
// ════════════════════════════════════════════════════════════

function layout(title, content, session, activePage = '') {
  const navItems = [
    { href: '/admin',            label: 'Dashboard',   icon: '' },
    { href: '/admin/bookings',   label: 'Bookings',    icon: '' },
    { href: '/admin/uktb',       label: 'UK TB',       icon: ''  },
    { href: '/admin/elderly',    label: 'Elderly',     icon: '' },
    { href: '/admin/careers',    label: 'Careers',     icon: '' },
    { href: '/admin/newsletter', label: 'Newsletter',  icon: '' },
    { href: '/admin/users',      label: 'Staff',       icon: '' },
  ];

  const navHTML = navItems.map(item => `
    <a href="${item.href}"
       style="display:flex;align-items:center;gap:10px;padding:10px 16px;
              border-radius:8px;font-size:13px;font-weight:500;
              color:${activePage === item.href ? '#fff' : 'rgba(255,255,255,0.65)'};
              background:${activePage === item.href ? 'rgba(255,255,255,0.12)' : 'transparent'};
              text-decoration:none;transition:all 0.2s;"
       onmouseover="if('${activePage}'!=='${item.href}'){this.style.background='rgba(255,255,255,0.07)';this.style.color='#fff'}"
       onmouseout="if('${activePage}'!=='${item.href}'){this.style.background='transparent';this.style.color='rgba(255,255,255,0.65)'}">
      <span>${item.icon}</span>${item.label}
    </a>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — St. Nicholas Admin</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
           background:#F0F4F8; color:#0D1B2E; display:flex; min-height:100vh; }
    a { text-decoration:none; color:inherit; }
    table { border-collapse:collapse; width:100%; }
    th, td { text-align:left; padding:12px 16px; border-bottom:1px solid #E2E8F0; font-size:13px; }
    th { font-size:11px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase;
         color:#7A8BAA; background:#F7F8FA; }
    tr:hover td { background:#F7FBFF; }
    .badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:20px;
             font-size:11px; font-weight:600; }
    .badge-pending    { background:#FEF3C7; color:#92400E; }
    .badge-confirmed  { background:#DBEAFE; color:#1E40AF; }
    .badge-seen       { background:#D1FAE5; color:#065F46; }
    .badge-cancelled  { background:#FEE2E2; color:#991B1B; }
    .badge-paid       { background:#D1FAE5; color:#065F46; }
    .badge-unpaid     { background:#FEE2E2; color:#991B1B; }
    .badge-new        { background:#EDE9FE; color:#5B21B6; }
    .badge-received   { background:#EDE9FE; color:#5B21B6; }
    .badge-active     { background:#D1FAE5; color:#065F46; }
    .badge-inactive   { background:#F3F4F6; color:#6B7280; }
    .badge-success    { background:#D1FAE5; color:#065F46; }
    .card { background:#fff; border-radius:12px; border:1px solid #E2E8F0; }
    .btn { display:inline-flex; align-items:center; gap:6px; padding:8px 16px;
           border-radius:8px; font-size:13px; font-weight:600; cursor:pointer;
           border:none; font-family:inherit; transition:all 0.2s; }
    .btn-navy { background:#002B5C; color:#fff; }
    .btn-navy:hover { background:#003D80; }
    .btn-red { background:#DC2626; color:#fff; }
    .btn-red:hover { background:#B91C1C; }
    .btn-green { background:#059669; color:#fff; }
    select.sel { padding:5px 10px; border:1px solid #CBD5E1; border-radius:6px;
                 font-size:12px; background:#fff; cursor:pointer; font-family:inherit; }
    input.inp { padding:9px 12px; border:1px solid #CBD5E1; border-radius:6px;
                font-size:13px; font-family:inherit; outline:none; }
    input.inp:focus { border-color:#1E9FD4; }
  </style>
</head>
<body>

  <!-- Sidebar -->
  <aside style="width:220px;background:#001A3A;padding:24px 16px;
                display:flex;flex-direction:column;gap:4px;flex-shrink:0;
                position:sticky;top:0;height:100vh;overflow-y:auto;">

    <div style="padding:0 8px;margin-bottom:24px;">
      <div style="font-family:Georgia,serif;font-size:15px;font-weight:600;color:#fff;">
        St. Nicholas
      </div>
      <div style="font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:0.14em;
                  text-transform:uppercase;margin-top:2px;">Super Admin</div>
    </div>

    ${navHTML}

    <div style="margin-top:auto;padding-top:24px;border-top:1px solid rgba(255,255,255,0.08);">
      <div style="font-size:12px;color:rgba(255,255,255,0.5);padding:0 8px;margin-bottom:10px;">
        ${session.fullName || 'Admin'}
      </div>
      <form method="POST" action="/logout">
        <button style="width:100%;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);
                       color:rgba(255,255,255,0.65);padding:8px;border-radius:8px;cursor:pointer;
                       font-size:12px;font-family:inherit;">Sign Out</button>
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
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px;">
      ${stat('Pending Bookings', stats.bookings.pending, '#FEF3C7', '#92400E')}
      ${stat('Confirmed',        stats.bookings.confirmed, '#DBEAFE', '#1E40AF')}
      ${stat('TB Paid',          stats.uktb.paid, '#D1FAE5', '#065F46')}
      ${stat('New Enquiries',    stats.elderly.new_count, '#EDE9FE', '#5B21B6')}
      ${stat('Active Doctors',   stats.doctors.total, '#F0FDF4', '#166534')}
      ${stat('Receptionists',    stats.receptionists.total, '#FFF7ED', '#9A3412')}
      ${stat('Newsletter',       stats.newsletter.total, '#F0F9FF', '#0C4A6E')}
      ${stat('Applications',     stats.careers.total, '#FDF4FF', '#6B21A8')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      ${quickLink('/admin/bookings?status=pending', '', 'Pending Bookings', 'View and assign doctors to new requests')}
      ${quickLink('/admin/uktb',                   '',  'UK TB Screenings',  'Track payments and schedule screenings')}
      ${quickLink('/admin/users',                  '', 'Manage Staff',       'Create doctor and receptionist accounts')}
      ${quickLink('/admin/careers',                '', 'Career Applications','Review CVs and manage applicants')}
    </div>
  `;
  return layout('Dashboard', content, session, '/admin');
}

function stat(label, value, bg, color) {
  return `
    <div class="card" style="padding:20px;background:${bg};border-color:transparent;">
      <div style="font-size:32px;font-weight:700;color:${color};font-family:Georgia,serif;line-height:1;">${value || 0}</div>
      <div style="font-size:11px;color:${color};opacity:0.8;margin-top:6px;text-transform:uppercase;letter-spacing:0.08em;">${label}</div>
    </div>
  `;
}

function quickLink(href, icon, title, desc) {
  return `
    <a href="${href}" class="card" style="display:flex;align-items:center;gap:16px;
       padding:20px;cursor:pointer;transition:box-shadow 0.2s;"
       onmouseover="this.style.boxShadow='0 4px 20px rgba(0,43,92,0.10)'"
       onmouseout="this.style.boxShadow='none'">
      <span style="font-size:28px;">${icon}</span>
      <div>
        <div style="font-size:14px;font-weight:600;color:#002B5C;">${title}</div>
        <div style="font-size:12px;color:#7A8BAA;margin-top:2px;">${desc}</div>
      </div>
    </a>
  `;
}


// ── Bookings ──────────────────────────────────────────────────
function renderBookings(bookings, pagination, session) {
  const statuses = ['', 'pending', 'confirmed', 'seen', 'cancelled'];
  const filters = statuses.map(s => `
    <a href="/admin/bookings?status=${s}"
       style="padding:6px 14px;border-radius:20px;font-size:12px;font-weight:500;
              background:${pagination.status===s?'#002B5C':'#fff'};
              color:${pagination.status===s?'#fff':'#7A8BAA'};
              border:1px solid ${pagination.status===s?'#002B5C':'#E2E8F0'};">
      ${s || 'All'}
    </a>`).join('');

  const rows = bookings.map(b => `
    <tr>
      <td><strong style="color:#002B5C;">${b.name}</strong></td>
      <td>${b.phone}</td>
      <td>${b.branch}</td>
      <td>${b.specialty}</td>
      <td><span class="badge badge-${b.status}">${b.status}</span></td>
      <td style="color:#7A8BAA;">${b.doctor_name || '—'}</td>
      <td style="color:#7A8BAA;">${b.confirmed_date ? new Date(b.confirmed_date).toLocaleDateString('en-GB') : '—'}</td>
      <td style="color:#7A8BAA;">${b.confirmed_time || '—'}</td>
      <td style="font-size:12px;color:#7A8BAA;">${new Date(b.created_at).toLocaleDateString('en-GB')}</td>
    </tr>
  `).join('');

  const content = `
    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;">${filters}</div>
    <div class="card" style="overflow:auto;">
      <table>
        <thead><tr>
          <th>Patient</th><th>Phone</th><th>Branch</th><th>Specialty</th>
          <th>Status</th><th>Doctor</th><th>Date</th><th>Time</th><th>Submitted</th>
        </tr></thead>
        <tbody>${rows || noData(9)}</tbody>
      </table>
    </div>
    ${pages(pagination, '/admin/bookings')}
  `;
  return layout('All Bookings', content, session, '/admin/bookings');
}


// ── Users / Staff Management ──────────────────────────────────
function renderUsers(users, session) {
  const error   = '';
  const success  = '';

  const rows = users.map(u => `
    <tr>
      <td><strong style="color:#002B5C;">${u.full_name}</strong></td>
      <td style="color:#7A8BAA;">${u.email}</td>
      <td><span class="badge badge-${u.role}" style="text-transform:capitalize;">${u.role}</span></td>
      <td style="color:#7A8BAA;">${u.specialty || '—'}</td>
      <td><span class="badge badge-${u.is_active?'active':'inactive'}">${u.is_active?'Active':'Inactive'}</span></td>
      <td style="color:#7A8BAA;font-size:12px;">${u.last_login ? new Date(u.last_login).toLocaleDateString('en-GB') : 'Never'}</td>
      <td>
        <form method="POST" action="/admin/users/${u.id}/toggle" style="margin:0;">
          <button class="btn ${u.is_active?'btn-red':'btn-green'}" style="font-size:11px;padding:5px 12px;">
            ${u.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </form>
      </td>
    </tr>
  `).join('');

  const content = `
    <div style="display:grid;grid-template-columns:1fr 340px;gap:24px;align-items:start;">

      <!-- Users table -->
      <div class="card" style="overflow:auto;">
        <div style="padding:16px 20px;border-bottom:1px solid #E2E8F0;">
          <strong style="color:#002B5C;">${users.length} Staff Accounts</strong>
        </div>
        <table>
          <thead><tr>
            <th>Name</th><th>Email</th><th>Role</th><th>Specialty</th>
            <th>Status</th><th>Last Login</th><th>Action</th>
          </tr></thead>
          <tbody>${rows || noData(7)}</tbody>
        </table>
      </div>

      <!-- Create account form -->
      <div class="card" style="padding:24px;">
        <div style="font-size:15px;font-weight:600;color:#002B5C;margin-bottom:4px;">
          Create New Account
        </div>
        <div style="font-size:12px;color:#7A8BAA;margin-bottom:20px;">
          Add a doctor or receptionist
        </div>

        <form method="POST" action="/admin/users/create">
          <div style="margin-bottom:14px;">
            <label style="display:block;font-size:11px;font-weight:600;color:#002B5C;
                          text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">
              Full Name *
            </label>
            <input class="inp" type="text" name="full_name"
                   placeholder="Dr. Adaeze Obi" required style="width:100%;">
          </div>

          <div style="margin-bottom:14px;">
            <label style="display:block;font-size:11px;font-weight:600;color:#002B5C;
                          text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">
              Email Address *
            </label>
            <input class="inp" type="email" name="email"
                   placeholder="doctor@hospital.com" required style="width:100%;">
          </div>

          <div style="margin-bottom:14px;">
            <label style="display:block;font-size:11px;font-weight:600;color:#002B5C;
                          text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">
              Temporary Password *
            </label>
            <input class="inp" type="text" name="password"
                   placeholder="They can change this later" required style="width:100%;">
          </div>

          <div style="margin-bottom:14px;">
            <label style="display:block;font-size:11px;font-weight:600;color:#002B5C;
                          text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">
              Role *
            </label>
            <select name="role" class="sel" style="width:100%;padding:9px 12px;" required>
              <option value="">Select role</option>
              <option value="doctor">Doctor</option>
              <option value="receptionist">Receptionist</option>
            </select>
          </div>

          <div style="margin-bottom:20px;">
            <label style="display:block;font-size:11px;font-weight:600;color:#002B5C;
                          text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">
              Specialty (doctors only)
            </label>
            <input class="inp" type="text" name="specialty"
                   placeholder="e.g. Cardiology, Obstetrics" style="width:100%;">
          </div>

          <button type="submit" class="btn btn-navy" style="width:100%;justify-content:center;">
            Create Account
          </button>
        </form>
      </div>
    </div>
  `;
  return layout('Staff Management', content, session, '/admin/users');
}


// ── UK TB ─────────────────────────────────────────────────────
function renderUKTB(screenings, session) {
  const rows = screenings.map(s => `
    <tr>
      <td><strong style="color:#002B5C;">${s.name}</strong></td>
      <td>${s.phone}</td>
      <td style="color:#7A8BAA;">${s.email}</td>
      <td style="text-align:center;">${s.num_applicants}</td>
      <td>₦${(s.amount_kobo/100).toLocaleString()}</td>
      <td><span class="badge badge-${s.paystack_status}">${s.paystack_status}</span></td>
      <td><span class="badge badge-${s.booking_status}">${s.booking_status}</span></td>
      <td style="color:#7A8BAA;">${s.doctor_name || '—'}</td>
      <td style="font-size:12px;color:#7A8BAA;">${new Date(s.created_at).toLocaleDateString('en-GB')}</td>
    </tr>
  `).join('');

  const content = `
    <div class="card" style="overflow:auto;">
      <table>
        <thead><tr>
          <th>Name</th><th>Phone</th><th>Email</th><th>Applicants</th>
          <th>Amount</th><th>Payment</th><th>Status</th><th>Doctor</th><th>Date</th>
        </tr></thead>
        <tbody>${rows || noData(9)}</tbody>
      </table>
    </div>
  `;
  return layout('UK TB Screenings', content, session, '/admin/uktb');
}


// ── Elderly ───────────────────────────────────────────────────
function renderElderly(enquiries, session) {
  const rows = enquiries.map(e => `
    <tr>
      <td><strong style="color:#002B5C;">${e.name}</strong></td>
      <td>${e.phone}</td>
      <td style="color:#7A8BAA;">${e.email}</td>
      <td>${e.parent_age}</td>
      <td><span class="badge badge-${e.status}">${e.status}</span></td>
      <td style="font-size:12px;color:#7A8BAA;">${new Date(e.created_at).toLocaleDateString('en-GB')}</td>
      <td>
        <form method="POST" action="/admin/elderly/${e.id}/status" style="margin:0;">
          <select name="status" class="sel" onchange="this.form.submit()">
            ${['new','contacted','enrolled','not-interested'].map(s =>
              `<option value="${s}" ${e.status===s?'selected':''}>${s}</option>`
            ).join('')}
          </select>
        </form>
      </td>
    </tr>
  `).join('');

  const content = `
    <div class="card" style="overflow:auto;">
      <table>
        <thead><tr>
          <th>Name</th><th>Phone</th><th>Email</th>
          <th>Parent Age</th><th>Status</th><th>Date</th><th>Update</th>
        </tr></thead>
        <tbody>${rows || noData(7)}</tbody>
      </table>
    </div>
  `;
  return layout('Elderly Enquiries', content, session, '/admin/elderly');
}


// ── Careers ───────────────────────────────────────────────────
function renderCareers(applications, session) {
  const rows = applications.map(a => `
    <tr>
      <td><strong style="color:#002B5C;">${a.full_name}</strong></td>
      <td>${a.phone}</td>
      <td>${a.role_applied}</td>
      <td>${a.department || '—'}</td>
      <td>
        ${a.cv_filepath
          ? `<a href="/admin/cv/${a.id}" style="color:#1E9FD4;font-size:12px;font-weight:600;">Download</a>`
          : '<span style="color:#7A8BAA;font-size:12px;">None</span>'}
      </td>
      <td><span class="badge badge-${a.status}">${a.status}</span></td>
      <td style="font-size:12px;color:#7A8BAA;">${new Date(a.created_at).toLocaleDateString('en-GB')}</td>
      <td>
        <form method="POST" action="/admin/careers/${a.id}/status" style="margin:0;">
          <select name="status" class="sel" onchange="this.form.submit()">
            ${['received','reviewing','shortlisted','interviewed','offered','rejected'].map(s =>
              `<option value="${s}" ${a.status===s?'selected':''}>${s}</option>`
            ).join('')}
          </select>
        </form>
      </td>
    </tr>
  `).join('');

  const content = `
    <div class="card" style="overflow:auto;">
      <table>
        <thead><tr>
          <th>Name</th><th>Phone</th><th>Role</th><th>Department</th>
          <th>CV</th><th>Status</th><th>Date</th><th>Update</th>
        </tr></thead>
        <tbody>${rows || noData(8)}</tbody>
      </table>
    </div>
  `;
  return layout('Career Applications', content, session, '/admin/careers');
}


// ── Newsletter ────────────────────────────────────────────────
function renderNewsletter(subscribers, session) {
  const rows = subscribers.map(s => `
    <tr>
      <td>${s.email}</td>
      <td style="color:#7A8BAA;font-size:12px;">${new Date(s.subscribed_at).toLocaleDateString('en-GB')}</td>
    </tr>
  `).join('');

  const content = `
    <div style="margin-bottom:16px;font-size:14px;color:#7A8BAA;">
      ${subscribers.length} active subscribers
    </div>
    <div class="card" style="overflow:hidden;">
      <table>
        <thead><tr><th>Email</th><th>Subscribed</th></tr></thead>
        <tbody>${rows || noData(2)}</tbody>
      </table>
    </div>
  `;
  return layout('Newsletter', content, session, '/admin/newsletter');
}


// ── Helpers ───────────────────────────────────────────────────
function noData(cols) {
  return `<tr><td colspan="${cols}" style="text-align:center;color:#7A8BAA;padding:40px;">No records found</td></tr>`;
}

function pages(pagination, base) {
  if (pagination.totalPages <= 1) return '';
  return `
    <div style="display:flex;gap:8px;margin-top:16px;justify-content:center;">
      ${Array.from({length: pagination.totalPages}, (_, i) => `
        <a href="${base}?page=${i+1}&status=${pagination.status}"
           style="padding:6px 12px;border-radius:6px;font-size:12px;
                  background:${pagination.page===i+1?'#002B5C':'#fff'};
                  color:${pagination.page===i+1?'#fff':'#7A8BAA'};
                  border:1px solid #E2E8F0;">${i+1}</a>
      `).join('')}
    </div>
  `;
}

module.exports = router;

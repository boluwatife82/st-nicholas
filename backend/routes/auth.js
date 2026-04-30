// routes/auth.js
// Single login page for all roles.
// After login, redirects each role to their own dashboard.

const express  = require('express');
const bcrypt   = require('bcryptjs');
const pool     = require('../db');

const router = express.Router();


// ── GET /login ───────────────────────────────────────────────
router.get('/login', (req, res) => {
  if (req.session?.userId) {
    return redirectByRole(res, req.session.role);
  }
  res.send(renderLogin({ error: null }));
});


// ── POST /login ──────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.send(renderLogin({ error: 'Please enter your email and password' }));
  }

try {
    // Check superadmin credentials from .env first
    if (
      email    === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD
    ) {
      req.session.userId   = 0;
      req.session.role     = 'superadmin';
      req.session.fullName = 'Super Admin';
      return res.redirect('/admin');
    }

    // Check database users
    const result = await pool.query(
      `SELECT id, full_name, email, password_hash, role, is_active
       FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.send(renderLogin({ error: 'Invalid email or password' }));
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.send(renderLogin({ error: 'Your account has been deactivated.' }));
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return res.send(renderLogin({ error: 'Invalid email or password' }));
    }

    // Set session then redirect — only one response
    req.session.userId   = user.id;
    req.session.role     = user.role;
    req.session.fullName = user.full_name;
    req.session.email    = user.email;

    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    return redirectByRole(res, user.role);

  } catch (err) {
    console.error('Login error:', err.message);
    return res.send(renderLogin({ error: 'Server error. Please try again.' }));
  }
}); 


// ── POST /logout ─────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});


// ── Helper: redirect to correct dashboard ────────────────────
function redirectByRole(res, role) {
  switch (role) {
    case 'superadmin':   return res.redirect('/admin');
    case 'receptionist': return res.redirect('/receptionist');
    case 'doctor':       return res.redirect('/doctor');
    default:             return res.redirect('/login');
  }
}


// ── Login page HTML ──────────────────────────────────────────
function renderLogin({ error }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Staff Login — St. Nicholas Hospital</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #001A3A;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    /* Background pattern */
    body::before {
      content: '';
      position: fixed; inset: 0;
      background-image: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
      background-size: 32px 32px;
      pointer-events: none;
    }

    .card {
      background: #fff;
      border-radius: 20px;
      padding: 48px 40px;
      width: 100%;
      max-width: 400px;
      position: relative;
      box-shadow: 0 24px 64px rgba(0,0,0,0.35);
    }

    /* Gold top accent */
    .card::before {
      content: '';
      position: absolute;
      top: 0; left: 40px; right: 40px;
      height: 3px;
      background: linear-gradient(90deg, #B8953A, #D4AF5A, transparent);
      border-radius: 2px;
    }

    .logo {
      font-family: Georgia, serif;
      font-size: 20px;
      font-weight: 600;
      color: #002B5C;
      margin-bottom: 2px;
    }

    .logo span { color: #B8953A; }

    .logo-sub {
      font-size: 11px;
      color: #7A8BAA;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 36px;
      display: block;
    }

    .field-label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: #002B5C;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 7px;
    }

    input {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      color: #0D1B2E;
      margin-bottom: 18px;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    input:focus {
      border-color: #1E9FD4;
      box-shadow: 0 0 0 3px rgba(30,159,212,0.08);
    }

    .btn-login {
      width: 100%;
      padding: 14px;
      background: #002B5C;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.2s, transform 0.15s;
      margin-top: 4px;
    }

    .btn-login:hover {
      background: #003D80;
      transform: translateY(-1px);
    }

    .error {
      background: #FEE2E2;
      color: #991B1B;
      padding: 12px 14px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 20px;
      border: 1px solid #FECACA;
    }

    .footer-note {
      text-align: center;
      font-size: 11px;
      color: #B0BAC8;
      margin-top: 24px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">St. Nicholas <span>Hospital</span></div>
    <span class="logo-sub">Staff Portal — Lagos</span>

    ${error ? `<div class="error">⚠️ ${error}</div>` : ''}

    <form method="POST" action="/login">
      <label class="field-label" for="email">Email Address</label>
      <input
        type="email"
        id="email"
        name="email"
        placeholder="yourname@hospital.com"
        required
        autofocus
        autocomplete="email"
      >

      <label class="field-label" for="password">Password</label>
      <input
        type="password"
        id="password"
        name="password"
        placeholder="Enter your password"
        required
        autocomplete="current-password"
      >

      <button type="submit" class="btn-login">Sign In</button>
    </form>

    <p class="footer-note">
      Access restricted to authorised St. Nicholas Hospital staff only.<br>
      Contact your administrator if you cannot log in.
    </p>
  </div>
</body>
</html>`;
}


module.exports = router;            

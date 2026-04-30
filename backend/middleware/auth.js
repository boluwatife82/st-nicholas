// middleware/auth.js
// Route protection for all three roles.
// Import the function you need in each route file.

// ── Require any logged in user ───────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  return res.redirect('/login');
}

// ── Require superadmin role ──────────────────────────────────
function requireSuperAdmin(req, res, next) {
  if (req.session && req.session.role === 'superadmin') {
    return next();
  }
  return res.status(403).send(accessDenied('Super Admin'));
}

// ── Require receptionist OR superadmin ──────────────────────
function requireReceptionist(req, res, next) {
  if (req.session && ['superadmin', 'receptionist'].includes(req.session.role)) {
    return next();
  }
  return res.status(403).send(accessDenied('Receptionist'));
}

// ── Require doctor OR superadmin ────────────────────────────
function requireDoctor(req, res, next) {
  if (req.session && ['superadmin', 'doctor'].includes(req.session.role)) {
    return next();
  }
  return res.status(403).send(accessDenied('Doctor'));
}

// ── Simple access denied page ────────────────────────────────
function accessDenied(requiredRole) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Access Denied</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center;
           justify-content: center; min-height: 100vh; background: #F0F4F8; margin: 0; }
    .box { background: #fff; border-radius: 12px; padding: 48px; text-align: center;
           box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 400px; }
    h2 { color: #002B5C; margin-bottom: 8px; }
    p  { color: #7A8BAA; margin-bottom: 24px; }
    a  { background: #002B5C; color: #fff; padding: 10px 24px;
         border-radius: 20px; text-decoration: none; font-size: 14px; }
  </style>
</head>
<body>
  <div class="box">
    <h2>Access Denied</h2>
    <p>You don't have permission to view this page.<br>
       This area requires ${requiredRole} access.</p>
    <a href="/login">Go to Login</a>
  </div>
</body>
</html>`;
}

module.exports = {
  requireAuth,
  requireSuperAdmin,
  requireReceptionist,
  requireDoctor
};

// server.js
// Main entry point for the St. Nicholas Hospital backend.

require('dotenv').config();

const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const session   = require('express-session');
const rateLimit = require('express-rate-limit');

// API routes
const bookingsRouter   = require('./routes/bookings');
const uktbRouter       = require('./routes/uktb');
const elderlyRouter    = require('./routes/elderly');
const careersRouter    = require('./routes/careers');
const newsletterRouter = require('./routes/newsletter');

// Dashboard routes
const authRouter         = require('./routes/auth');
const adminRouter        = require('./routes/admin');
const receptionistRouter = require('./routes/receptionist');
const doctorRouter       = require('./routes/doctor');

const app  = express();
const PORT = process.env.PORT || 3000;
// this are my security messures to prevent attacks like xss and sql injection
const xss = require('xss-clean');
app.use(xss());

const hpp = require('hpp');
app.use(hpp());

// SECURITY

app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://saintnicholashospital.com', 'https://www.saintnicholashospital.com']
    : ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3001'],
  credentials: true
}));



// RATE LIMITING

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests. Please try again later.' }
});

const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many submissions. Please try again later.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Too many login attempts. Please try again in 15 minutes.'
});

app.use('/api/', apiLimiter);


// BODY PARSING
// Webhook needs raw bytes — must come before json parser

app.use('/api/uktb/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));



// SESSION

app.use(session({
  secret:            process.env.SESSION_SECRET || 'change-this-in-production',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge:   8 * 60 * 60 * 1000 // 8 hours
  }
}));



// API ROUTES — public facing (called from the website forms)

app.use('/api/bookings',   formLimiter, bookingsRouter);
app.use('/api/uktb',       uktbRouter);
app.use('/api/elderly',    formLimiter, elderlyRouter);
app.use('/api/careers',    formLimiter, careersRouter);
app.use('/api/newsletter', newsletterRouter);



// AUTH — login/logout (shared single page for all roles)

app.use('/',  loginLimiter, authRouter);
app.use('/', authRouter);

// Root redirects to login
app.get('/', (req, res) => res.redirect('/login'));



// DASHBOARD ROUTES — protected by role middleware inside each router

app.use('/admin',        adminRouter);
app.use('/receptionist', receptionistRouter);
app.use('/doctor',       doctorRouter);



// HEALTH CHECK

app.get('/health', (req, res) => {
  res.json({
    status:      'ok',
    service:     'St. Nicholas Hospital API',
    environment: process.env.NODE_ENV,
    timestamp:   new Date().toISOString()
  });
});



// GLOBAL ERROR HANDLER

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  const message = process.env.NODE_ENV === 'production'
    ? 'Something went wrong. Please try again.'
    : err.message;

  if (req.path.startsWith('/api/')) {
    return res.status(err.status || 500).json({ success: false, message });
  }
  res.status(500).send(`<h2>Server Error</h2><p>${message}</p>`);
});

// 404
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Endpoint not found' });
  }
  res.redirect('/login');
});

// this forces https in production, important for security and session cookies. In development i allow http for ease of testing.
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
  });
}



// START SERVER

app.listen(PORT, () => {
  console.log('');
 
  console.log('   St. Nicholas Hospital — Backend Server    ');
  
  console.log(`   Running on  http://localhost:${PORT}      `);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}  `);
 
  console.log('   Dashboards:                                    ');
  console.log(`   Login        http://localhost:${PORT}/login         `);
  console.log(`   Admin        http://localhost:${PORT}/admin         `);
  console.log(`   Receptionist http://localhost:${PORT}/receptionist  `);
  console.log(`   Doctor       http://localhost:${PORT}/doctor        `);
 
  console.log('   API Endpoints:       ');
  console.log('  POST  /api/bookings    ');
  console.log('   POST  /api/uktb/initiate   ');
  console.log('   POST  /api/uktb/webhook  ');
  console.log('   GET   /api/uktb/verify/:ref  ');
  console.log('   POST  /api/elderly   ');
  console.log('   POST  /api/careers       ');
  console.log('   POST  /api/newsletter/subscribe  ');

  console.log('');
});



module.exports = app;

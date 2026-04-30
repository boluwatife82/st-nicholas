// routes/bookings.js
// Handles appointment booking form submissions from all pages
// (homepage modal, consultants page, branch pages)

const express = require('express');
const { body, validationResult } = require('express-validator');
const pool    = require('../db');
const mailer  = require('../utils/mailer');

const router = express.Router();


// ─────────────────────────────────────────────────────────────
// POST /api/bookings
// Receives the booking form, saves to DB, sends emails
// ─────────────────────────────────────────────────────────────
router.post(
  '/',

  // Validate the incoming data
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ max: 200 }).withMessage('Name too long'),

    body('phone')
      .trim()
      .notEmpty().withMessage('Phone number is required')
      .matches(/^[\d\s\+\-\(\)]{7,20}$/).withMessage('Invalid phone number'),

    body('email')
      .optional({ checkFalsy: true })
      .isEmail().withMessage('Invalid email address')
      .normalizeEmail(),

    body('branch')
      .trim()
      .notEmpty().withMessage('Please select a branch'),

    body('specialty')
      .trim()
      .notEmpty().withMessage('Please select a specialty'),

    body('preferred_date')
      .optional({ checkFalsy: true })
      .isDate().withMessage('Invalid date format'),
  ],

  async (req, res) => {
    // Return validation errors to the frontend
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(e => e.msg)
      });
    }

    const { name, phone, email, branch, specialty, preferred_date, message, source_page } = req.body;

    try {
      // Save booking to database
      const result = await pool.query(
        `INSERT INTO bookings
           (name, phone, email, branch, specialty, preferred_date, message, source_page)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          name,
          phone,
          email        || null,
          branch,
          specialty,
          preferred_date || null,
          message      || null,
          source_page  || 'website'
        ]
      );

      const booking = result.rows[0];

      // Send emails — we don't await both sequentially to keep the response fast.
      // We send them in parallel and don't fail the whole request if an email fails.
      const emailPromises = [
        mailer.sendBookingNotificationToHospital(booking)
      ];

      // Only send confirmation to patient if they gave an email
      if (email) {
        emailPromises.push(mailer.sendBookingConfirmationToPatient(booking));
      }

      // Fire emails without blocking the response
      Promise.all(emailPromises).catch(err => {
        console.error('Email error (booking):', err.message);
      });

      return res.status(201).json({
        success: true,
        message: 'Booking received. We will contact you shortly.',
        bookingId: booking.id
      });

    } catch (err) {
      console.error('Booking error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again or call us directly.'
      });
    }
  }
);


module.exports = router;

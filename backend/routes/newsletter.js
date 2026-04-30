// routes/newsletter.js
// Handles footer newsletter subscription

const express = require('express');
const { body, validationResult } = require('express-validator');
const pool   = require('../db');
const mailer = require('../utils/mailer');

const router = express.Router();


// POST /api/newsletter/subscribe
router.post(
  '/subscribe',

  [
    body('email')
      .trim()
      .isEmail().withMessage('Please enter a valid email address')
      .normalizeEmail()
  ],

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { email } = req.body;

    try {
      // Check if this email already exists and is already active
      const existing = await pool.query(
        'SELECT is_active FROM newsletter_subscribers WHERE email = $1',
        [email]
      );

      const alreadySubscribed = existing.rows.length > 0 && existing.rows[0].is_active;

      // Save or reactivate the subscriber
      await pool.query(
        `INSERT INTO newsletter_subscribers (email)
         VALUES ($1)
         ON CONFLICT (email) DO UPDATE SET is_active = TRUE`,
        [email]
      );

      // Only send the welcome email if this is a NEW subscriber
      // Don't send it again if they were already subscribed
      if (!alreadySubscribed) {
        mailer.sendNewsletterWelcome(email).catch(err => {
          console.error('Newsletter welcome email error:', err.message);
        });
      }

      return res.status(201).json({
        success: true,
        message: 'You have been subscribed. Thank you!'
      });

    } catch (err) {
      console.error('Newsletter error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.'
      });
    }
  }
);


// POST /api/newsletter/unsubscribe
router.post(
  '/unsubscribe',
  [body('email').trim().isEmail().normalizeEmail()],
  async (req, res) => {
    const { email } = req.body;
    try {
      await pool.query(
        `UPDATE newsletter_subscribers
         SET is_active = FALSE, unsubscribed_at = NOW()
         WHERE email = $1`,
        [email]
      );
      return res.json({ success: true, message: 'You have been unsubscribed.' });
    } catch (err) {
      return res.status(500).json({ success: false });
    }
  }
);


module.exports = router;

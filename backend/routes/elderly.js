// routes/elderly.js
// Handles Elderly Pre-Paid Medical Scheme enquiry form

const express = require('express');
const { body, validationResult } = require('express-validator');
const pool   = require('../db');
const mailer = require('../utils/mailer');

const router = express.Router();


// POST /api/elderly
router.post(
  '/',

  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 200 }),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('parent_age').trim().notEmpty().withMessage('Parent age range is required'),
    body('consent').equals('true').withMessage('Consent is required'),
  ],

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(e => e.msg)
      });
    }

    const { name, phone, email, parent_age, message } = req.body;

    try {
      const result = await pool.query(
        `INSERT INTO elderly_enquiries (name, phone, email, parent_age, message, consent_given)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         RETURNING *`,
        [name, phone, email, parent_age, message || null]
      );

      const enquiry = result.rows[0];

      Promise.all([
        mailer.sendElderlyEnquiryConfirmation(enquiry),
        mailer.sendElderlyEnquiryNotificationToHospital(enquiry)
      ]).catch(err => {
        console.error('Email error (elderly):', err.message);
      });

      return res.status(201).json({
        success: true,
        message: 'Enquiry received. Our team will contact you within 24 hours.'
      });

    } catch (err) {
      console.error('Elderly enquiry error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.'
      });
    }
  }
);


module.exports = router;

// routes/uktb.js
// Handles UK TB Screening bookings with Paystack payment integration.
//
// Flow:
// 1. Frontend POSTs booking details to /api/uktb/initiate
// 2. Backend saves a "pending" record in DB
// 3. Backend calls Paystack API to initialise a transaction
// 4. Paystack returns a payment URL
// 5. Backend sends that URL back to the frontend
// 6. Frontend redirects the user to Paystack's hosted payment page
// 7. After payment, Paystack calls our webhook at /api/uktb/webhook
// 8. Webhook verifies the payment and marks the booking as paid
// 9. Confirmation emails are sent

const express = require('express');
const { body, validationResult } = require('express-validator');
const axios   = require('axios');
const crypto  = require('crypto');
const pool    = require('../db');
const mailer  = require('../utils/mailer');

const router = express.Router();

const PRICE_PER_APPLICANT_NGN = 25000;
const PRICE_PER_APPLICANT_KOBO = PRICE_PER_APPLICANT_NGN * 100; // Paystack uses kobo


// ─────────────────────────────────────────────────────────────
// POST /api/uktb/initiate
// Step 1-5: Save pending booking, get Paystack payment URL
// ─────────────────────────────────────────────────────────────
router.post(
  '/initiate',

 [
  body('first_name').trim().notEmpty().withMessage('First name is required'),
  body('last_name').trim().notEmpty().withMessage('Last name is required'),
  body('middle_name').optional({ checkFalsy: true }).trim(),
  body('date_of_birth').notEmpty().withMessage('Date of birth is required').isDate(),
  body('sex').notEmpty().withMessage('Please select sex'),
  body('nationality').notEmpty().withMessage('Please select nationality'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('passport_number').optional({ checkFalsy: true }).trim(),
  body('visa_type').optional({ checkFalsy: true }).trim(),
  body('address_nigeria').trim().notEmpty().withMessage('Nigeria address is required'),
  body('address_uk').trim().notEmpty().withMessage('UK address is required'),
  body('service').trim().notEmpty().withMessage('Please select a service'),
  body('preferred_date').notEmpty().withMessage('Appointment date is required').isDate(),
  body('terms_accepted').equals('true').withMessage('You must accept the terms and conditions'),
],

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(e => e.msg)
      });
    }

    const {
          service, first_name, last_name, middle_name,
          date_of_birth, sex, lmp, nationality,
          passport_number, visa_type, phone, email,
          address_nigeria, address_uk, preferred_date
        } = req.body;

    const fullName = `${first_name} ${last_name}`;
    const totalKobo = PRICE_PER_APPLICANT_KOBO;
    const totalNGN  = PRICE_PER_APPLICANT_NGN;

    try {
      // Save a "pending" booking record first
      const dbResult = await pool.query(
        `INSERT INTO uktb_screenings
          (name, phone, email, num_applicants, amount_kobo, preferred_date,
            service, first_name, last_name, middle_name, date_of_birth, sex,
            lmp, nationality, passport_number, visa_type,
            address_nigeria, address_uk, terms_accepted,
            paystack_status, booking_status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,TRUE,'pending','unpaid')
        RETURNING id`,
        [
          fullName, phone, email, 1, totalKobo, preferred_date,
          service, first_name, last_name, middle_name || null,
          date_of_birth, sex, lmp || null, nationality,
          passport_number || null, visa_type || null,
          address_nigeria, address_uk
        ]
    );

      const screeningId = dbResult.rows[0].id;

      // Call Paystack to initialise the transaction
      const paystackResponse = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email:     email,
          amount:    totalKobo,
          currency:  'NGN',
          reference: `SNTB-${screeningId}-${Date.now()}`,
        metadata: {
          custom_fields: [
            { display_name: 'Patient Name',    variable_name: 'patient_name',    value: fullName },
            { display_name: 'Phone',           variable_name: 'phone',           value: phone },
            { display_name: 'Service',         variable_name: 'service',         value: service },
            { display_name: 'Screening ID',    variable_name: 'screening_id',    value: screeningId }
          ]
        },
          // Paystack redirects here after payment
          callback_url: `${process.env.APP_URL || 'http://localhost:3000'}/uktb-success.html`
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const { reference, authorization_url, access_code } = paystackResponse.data.data;

      // Store the Paystack reference against the booking
      await pool.query(
        `UPDATE uktb_screenings SET paystack_reference = $1 WHERE id = $2`,
        [reference, screeningId]
      );

      return res.status(200).json({
        success: true,
        paymentUrl:   authorization_url,
        reference:    reference,
        screeningId:  screeningId,
        amountNGN:    totalNGN,
        numApplicants
      });

    } catch (err) {
      console.error('UK TB initiate error:', err.response?.data || err.message);
      return res.status(500).json({
        success: false,
        message: 'Could not initiate payment. Please try again.'
      });
    }
  }
);


// ─────────────────────────────────────────────────────────────
// POST /api/uktb/webhook
// Step 7-9: Paystack calls this URL after payment
// THIS MUST NOT require auth — Paystack calls it directly
//
// IMPORTANT: Add this URL in your Paystack dashboard:
// Settings → Webhooks → Webhook URL → https://yoursite.com/api/uktb/webhook
// ─────────────────────────────────────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  // Verify the request actually came from Paystack
  // Paystack signs the payload with your secret key using HMAC SHA512
  const signature = req.headers['x-paystack-signature'];
  const body      = req.body;

  const expectedSignature = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    console.warn('⚠️  Invalid Paystack webhook signature — request rejected');
    return res.status(401).json({ message: 'Invalid signature' });
  }

  // Parse the raw body now that we've verified it
  const event = JSON.parse(body.toString());

  // We only care about successful charges
  if (event.event !== 'charge.success') {
    return res.status(200).json({ received: true });
  }

  const { reference, status, amount, customer } = event.data;

  try {
    // Double-verify the payment directly with Paystack (never trust only the webhook)
    const verifyResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
      }
    );

    const txData = verifyResponse.data.data;

    if (txData.status !== 'success') {
      console.log(`Payment reference ${reference} not successful — status: ${txData.status}`);
      return res.status(200).json({ received: true });
    }

    // Update our database record
    const updateResult = await pool.query(
      `UPDATE uktb_screenings
       SET paystack_status = 'success',
           booking_status  = 'paid',
           updated_at      = NOW()
       WHERE paystack_reference = $1
         AND paystack_status != 'success'
       RETURNING *`,
      [reference]
    );

    if (updateResult.rows.length === 0) {
      // Either already processed (duplicate webhook) or reference not found
      console.log(`Webhook: reference ${reference} already processed or not found`);
      return res.status(200).json({ received: true });
    }

    const screening = updateResult.rows[0];

    // Send confirmation emails
    Promise.all([
      mailer.sendUKTBPaymentConfirmation(screening),
      mailer.sendUKTBNotificationToHospital(screening)
    ]).catch(err => {
      console.error('Email error (UKTB webhook):', err.message);
    });

    console.log(`✅ UK TB payment confirmed: ${reference} — ${screening.name}`);
    return res.status(200).json({ received: true });

  } catch (err) {
    console.error('Webhook processing error:', err.message);
    // Always return 200 to Paystack even on error, so they don't keep retrying
    return res.status(200).json({ received: true });
  }
});


// ─────────────────────────────────────────────────────────────
// GET /api/uktb/verify/:reference
// Called by the success page to confirm payment status to the user
// ─────────────────────────────────────────────────────────────
router.get('/verify/:reference', async (req, res) => {
  const { reference } = req.params;

  try {
    const result = await pool.query(
      `SELECT name, num_applicants, amount_kobo, paystack_status, booking_status, preferred_date
       FROM uktb_screenings
       WHERE paystack_reference = $1`,
      [reference]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Reference not found' });
    }

    const screening = result.rows[0];

    return res.json({
      success: true,
      paid:    screening.paystack_status === 'success',
      name:    screening.name,
      amount:  screening.amount_kobo / 100,
      status:  screening.booking_status
    });

  } catch (err) {
    console.error('Verify error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});


module.exports = router;

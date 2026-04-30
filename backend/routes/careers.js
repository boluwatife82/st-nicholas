// routes/careers.js
// Handles job application form with CV upload to Cloudinary

const express    = require('express');
const { body, validationResult } = require('express-validator');
const multer     = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const pool       = require('../db');
const mailer     = require('../utils/mailer');

const router = express.Router();


// ── CLOUDINARY CONFIGURATION ─────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});


// ── MULTER CLOUDINARY STORAGE ────────────────────────────────
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder:          'st-nicholas/cvs',
      resource_type:   'raw',
      public_id:       `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '-')}`,
      allowed_formats: ['pdf', 'doc', 'docx']
    };
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC and DOCX files are allowed for CVs'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024
  }
});


// ─────────────────────────────────────────────────────────────
// POST /api/careers
// ─────────────────────────────────────────────────────────────
router.post(
  '/',
  upload.single('cv'),
  [
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('role_applied').trim().notEmpty().withMessage('Please specify the role'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file?.public_id) {
        cloudinary.uploader.destroy(req.file.public_id, { resource_type: 'raw' })
          .catch(err => console.error('Cloudinary delete error:', err.message));
      }
      return res.status(400).json({
        success: false,
        errors: errors.array().map(e => e.msg)
      });
    }

    const { full_name, email, phone, role_applied, department, cover_letter } = req.body;
    const cvFile = req.file;

    try {
      const result = await pool.query(
        `INSERT INTO career_applications
           (full_name, email, phone, role_applied, department, cover_letter,
            cv_filename, cv_filepath, cv_mimetype)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          full_name,
          email,
          phone,
          role_applied,
          department   || null,
          cover_letter || null,
          cvFile ? cvFile.originalname : null,
          cvFile ? cvFile.path         : null,
          cvFile ? cvFile.mimetype     : null
        ]
      );

      const application = result.rows[0];

      Promise.all([
        mailer.sendCareerApplicationConfirmation(application),
        mailer.sendCareerApplicationNotificationToHospital(application, cvFile ? cvFile.path : null)
      ]).catch(err => {
        console.error('Email error (careers):', err.message);
      });

      return res.status(201).json({
        success: true,
        message: 'Application received. We will be in touch if your profile matches our needs.'
      });

    } catch (err) {
      console.error('Career application error:', err.message);
      if (cvFile?.public_id) {
        cloudinary.uploader.destroy(cvFile.public_id, { resource_type: 'raw' })
          .catch(e => console.error('Cloudinary cleanup error:', e.message));
      }
      return res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.'
      });
    }
  }
);

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message.includes('Only PDF')) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});

module.exports = router;
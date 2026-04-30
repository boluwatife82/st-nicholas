// utils/mailer.js
// Central email utility using Nodemailer.
// All routes call functions from here instead of setting up transports themselves.

const nodemailer = require('nodemailer');

// Create the transporter once and reuse it
const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST,
  port:   parseInt(process.env.EMAIL_PORT),
  secure: false, // true for 465, false for 587 (TLS)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify connection on startup (only in development)
if (process.env.NODE_ENV === 'development') {
  transporter.verify((error) => {
    if (error) {
      console.warn('⚠️  Email transporter not ready:', error.message);
    } else {
      console.log('✅ Email transporter ready');
    }
  });
}


// ─────────────────────────────────────────────────────────────
// SHARED HTML WRAPPER
// Wraps every email in the St. Nicholas branded template
// ─────────────────────────────────────────────────────────────
function emailWrapper(title, bodyHtml) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin:0;padding:0;background:#F0F4F8;font-family:'DM Sans',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

            <!-- Header -->
            <tr>
              <td style="background:#001A3A;border-radius:12px 12px 0 0;padding:28px 36px;">
                <p style="margin:0;font-family:Georgia,serif;font-size:22px;font-weight:600;color:#fff;letter-spacing:0.01em;">
                  St. Nicholas Hospital
                </p>
                <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.45);letter-spacing:0.14em;text-transform:uppercase;">
                  Lagos, Nigeria
                </p>
              </td>
            </tr>

            <!-- Gold rule -->
            <tr>
              <td style="background:linear-gradient(90deg,#B8953A,#D4AF5A);height:3px;"></td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="background:#fff;padding:36px;border-radius:0 0 12px 12px;">
                ${bodyHtml}
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:20px 36px;text-align:center;">
                <p style="margin:0;font-size:11px;color:#7A8BAA;line-height:1.6;">
                  St. Nicholas Hospital · 57 Campbell Street, Lagos Island, Lagos<br>
                  Emergency: 08022908484 &nbsp;|&nbsp; info@saintnicholashospital.com
                </p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}


// ─────────────────────────────────────────────────────────────
// BOOKING EMAILS
// ─────────────────────────────────────────────────────────────

// 1. Confirmation email sent to the patient
async function sendBookingConfirmationToPatient(booking) {
  const html = emailWrapper('Booking Request Received', `
    <h2 style="margin:0 0 6px;font-family:Georgia,serif;font-size:26px;font-weight:500;color:#002B5C;">
      We've received your request, ${booking.name.split(' ')[0]}.
    </h2>
    <p style="margin:0 0 24px;font-size:13px;color:#7A8BAA;letter-spacing:0.10em;text-transform:uppercase;">
      Appointment Booking Confirmation
    </p>

    <p style="margin:0 0 20px;font-size:15px;color:#4A5568;line-height:1.7;">
      Thank you for reaching out to St. Nicholas Hospital. Our team has received your booking request and will contact you shortly to confirm your appointment.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;border-radius:10px;padding:20px;margin-bottom:24px;">
      <tr><td style="padding:6px 0;">
        <span style="font-size:11px;font-weight:600;color:#7A8BAA;text-transform:uppercase;letter-spacing:0.10em;">Branch</span><br>
        <span style="font-size:15px;color:#002B5C;font-weight:500;">${booking.branch}</span>
      </td></tr>
      <tr><td style="padding:6px 0;border-top:1px solid #E2E8F0;">
        <span style="font-size:11px;font-weight:600;color:#7A8BAA;text-transform:uppercase;letter-spacing:0.10em;">Specialty</span><br>
        <span style="font-size:15px;color:#002B5C;font-weight:500;">${booking.specialty}</span>
      </td></tr>
      ${booking.preferred_date ? `
      <tr><td style="padding:6px 0;border-top:1px solid #E2E8F0;">
        <span style="font-size:11px;font-weight:600;color:#7A8BAA;text-transform:uppercase;letter-spacing:0.10em;">Preferred Date</span><br>
        <span style="font-size:15px;color:#002B5C;font-weight:500;">${new Date(booking.preferred_date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </td></tr>` : ''}
    </table>

    <p style="margin:0 0 16px;font-size:14px;color:#4A5568;line-height:1.7;">
      If you need to speak with someone urgently, please call our emergency line:
    </p>
    <p style="margin:0;font-size:18px;font-weight:600;color:#002B5C;">
      📞 08022908484
    </p>
  `);

  await transporter.sendMail({
    from: `"St. Nicholas Hospital" <${process.env.EMAIL_USER}>`,
    to:   booking.email,
    subject: 'Booking Request Received — St. Nicholas Hospital',
    html
  });
}

// 2. Notification email sent to the hospital team
async function sendBookingNotificationToHospital(booking) {
  const html = emailWrapper('New Booking Request', `
    <h2 style="margin:0 0 20px;font-family:Georgia,serif;font-size:24px;color:#002B5C;">
      New Appointment Request
    </h2>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${tableRow('Patient Name', booking.name)}
      ${tableRow('Phone', booking.phone)}
      ${tableRow('Email', booking.email || 'Not provided')}
      ${tableRow('Branch', booking.branch)}
      ${tableRow('Specialty', booking.specialty)}
      ${tableRow('Preferred Date', booking.preferred_date ? new Date(booking.preferred_date).toLocaleDateString('en-GB') : 'Not specified')}
      ${tableRow('Source Page', booking.source_page || 'Unknown')}
      ${booking.message ? tableRow('Message', booking.message) : ''}
    </table>

    <p style="margin:24px 0 0;font-size:13px;color:#7A8BAA;">
      Submitted: ${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' })} (Lagos time)
    </p>
  `);

  await transporter.sendMail({
    from:    `"St. Nicholas Website" <${process.env.EMAIL_USER}>`,
    to:      process.env.HOSPITAL_EMAIL_BOOKINGS || process.env.HOSPITAL_EMAIL,
    subject: `New Booking: ${booking.name} — ${booking.specialty} (${booking.branch})`,
    html
  });
}


// ─────────────────────────────────────────────────────────────
// UK TB SCREENING EMAILS
// ─────────────────────────────────────────────────────────────

async function sendUKTBPaymentConfirmation(screening) {
  const amountNGN = (screening.amount_kobo / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' });

  const html = emailWrapper('UK TB Screening — Payment Confirmed', `
    <h2 style="margin:0 0 6px;font-family:Georgia,serif;font-size:26px;font-weight:500;color:#002B5C;">
      Payment Confirmed, ${screening.name.split(' ')[0]}.
    </h2>
    <p style="margin:0 0 24px;font-size:13px;color:#7A8BAA;letter-spacing:0.10em;text-transform:uppercase;">
      UK Visa TB Screening
    </p>

    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;font-weight:600;color:#166534;">
        ✅ Payment of ${amountNGN} received successfully
      </p>
      <p style="margin:4px 0 0;font-size:12px;color:#166534;">
        Reference: ${screening.paystack_reference}
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;border-radius:10px;padding:20px;margin-bottom:24px;">
      <tr><td style="padding:6px 0;">
        <span style="font-size:11px;font-weight:600;color:#7A8BAA;text-transform:uppercase;letter-spacing:0.10em;">Number of Applicants</span><br>
        <span style="font-size:15px;color:#002B5C;font-weight:500;">${screening.num_applicants}</span>
      </td></tr>
      <tr><td style="padding:6px 0;border-top:1px solid #E2E8F0;">
        <span style="font-size:11px;font-weight:600;color:#7A8BAA;text-transform:uppercase;letter-spacing:0.10em;">Amount Paid</span><br>
        <span style="font-size:15px;color:#002B5C;font-weight:500;">${amountNGN}</span>
      </td></tr>
      ${screening.preferred_date ? `
      <tr><td style="padding:6px 0;border-top:1px solid #E2E8F0;">
        <span style="font-size:11px;font-weight:600;color:#7A8BAA;text-transform:uppercase;letter-spacing:0.10em;">Preferred Date</span><br>
        <span style="font-size:15px;color:#002B5C;font-weight:500;">${new Date(screening.preferred_date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </td></tr>` : ''}
    </table>

    <p style="font-size:14px;color:#4A5568;line-height:1.7;">
      Our team will contact you to confirm your screening appointment. Please bring valid identification and your payment reference on the day.
    </p>
    <p style="font-size:14px;color:#4A5568;margin-top:8px;">
      Questions? Call us: <strong style="color:#002B5C;">08022908484</strong>
    </p>
  `);

  await transporter.sendMail({
    from:    `"St. Nicholas Hospital" <${process.env.EMAIL_USER}>`,
    to:      screening.email,
    subject: `UK TB Screening — Payment Confirmed (Ref: ${screening.paystack_reference})`,
    html
  });
}

async function sendUKTBNotificationToHospital(screening) {
  const amountNGN = (screening.amount_kobo / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' });

  const html = emailWrapper('New UK TB Screening Booking (PAID)', `
    <h2 style="margin:0 0 20px;font-family:Georgia,serif;font-size:24px;color:#002B5C;">
      New UK TB Screening — Payment Received
    </h2>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${tableRow('Name', screening.name)}
      ${tableRow('Phone', screening.phone)}
      ${tableRow('Email', screening.email)}
      ${tableRow('Applicants', screening.num_applicants)}
      ${tableRow('Amount Paid', amountNGN)}
      ${tableRow('Paystack Reference', screening.paystack_reference)}
      ${tableRow('Preferred Date', screening.preferred_date ? new Date(screening.preferred_date).toLocaleDateString('en-GB') : 'Not specified')}
    </table>
  `);

  await transporter.sendMail({
    from:    `"St. Nicholas Website" <${process.env.EMAIL_USER}>`,
    to:      process.env.HOSPITAL_EMAIL,
    subject: `UK TB Screening PAID — ${screening.name} (${screening.num_applicants} applicant${screening.num_applicants > 1 ? 's' : ''})`,
    html
  });
}


// ─────────────────────────────────────────────────────────────
// ELDERLY PREPAID EMAILS
// ─────────────────────────────────────────────────────────────

async function sendElderlyEnquiryConfirmation(enquiry) {
  const html = emailWrapper('Elderly Pre-Paid Scheme — Enquiry Received', `
    <h2 style="margin:0 0 6px;font-family:Georgia,serif;font-size:26px;font-weight:500;color:#002B5C;">
      Thank you, ${enquiry.name.split(' ')[0]}.
    </h2>
    <p style="margin:0 0 24px;font-size:13px;color:#7A8BAA;letter-spacing:0.10em;text-transform:uppercase;">
      Elderly Pre-Paid Medical Scheme
    </p>

    <p style="font-size:15px;color:#4A5568;line-height:1.7;margin-bottom:20px;">
      We've received your enquiry about our Elderly Pre-Paid Medical Scheme. Our patient care team will review your details and reach out within <strong>24 hours</strong> to discuss the plan options best suited for your parent.
    </p>

    <p style="font-size:14px;color:#4A5568;line-height:1.7;">
      In the meantime, if you have any urgent questions, please don't hesitate to call:
    </p>
    <p style="font-size:18px;font-weight:600;color:#002B5C;margin-top:8px;">
      📞 08022908484
    </p>
  `);

  await transporter.sendMail({
    from:    `"St. Nicholas Hospital" <${process.env.EMAIL_USER}>`,
    to:      enquiry.email,
    subject: 'Elderly Pre-Paid Scheme — Enquiry Received',
    html
  });
}

async function sendElderlyEnquiryNotificationToHospital(enquiry) {
  const html = emailWrapper('New Elderly Prepaid Enquiry', `
    <h2 style="margin:0 0 20px;font-family:Georgia,serif;font-size:24px;color:#002B5C;">
      New Elderly Pre-Paid Scheme Enquiry
    </h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${tableRow('Name', enquiry.name)}
      ${tableRow('Phone', enquiry.phone)}
      ${tableRow('Email', enquiry.email)}
      ${tableRow("Parent's Age", enquiry.parent_age)}
      ${enquiry.message ? tableRow('Message', enquiry.message) : ''}
    </table>
  `);

  await transporter.sendMail({
    from:    `"St. Nicholas Website" <${process.env.EMAIL_USER}>`,
    to:      process.env.HOSPITAL_EMAIL_ELDERLY || process.env.HOSPITAL_EMAIL,
    subject: `Elderly Prepaid Enquiry — ${enquiry.name} (Parent age: ${enquiry.parent_age})`,
    html
  });
}


// ─────────────────────────────────────────────────────────────
// CAREERS EMAILS
// ─────────────────────────────────────────────────────────────

async function sendCareerApplicationConfirmation(application) {
  const html = emailWrapper('Application Received — St. Nicholas Hospital', `
    <h2 style="margin:0 0 6px;font-family:Georgia,serif;font-size:26px;font-weight:500;color:#002B5C;">
      Application received, ${application.full_name.split(' ')[0]}.
    </h2>
    <p style="margin:0 0 24px;font-size:13px;color:#7A8BAA;letter-spacing:0.10em;text-transform:uppercase;">
      Careers at St. Nicholas Hospital
    </p>

    <p style="font-size:15px;color:#4A5568;line-height:1.7;margin-bottom:20px;">
      Thank you for your interest in joining the St. Nicholas Hospital team. We have received your application for the role of <strong style="color:#002B5C;">${application.role_applied}</strong>.
    </p>

    <p style="font-size:14px;color:#4A5568;line-height:1.7;">
      Our HR team reviews all applications carefully. If your profile matches what we are looking for, we will be in touch to discuss next steps. Due to the volume of applications we receive, we are only able to respond to shortlisted candidates.
    </p>

    <p style="font-size:14px;color:#4A5568;line-height:1.7;margin-top:16px;">
      We appreciate your interest in St. Nicholas Hospital and wish you the very best.
    </p>
  `);

  await transporter.sendMail({
    from:    `"St. Nicholas Hospital Careers" <${process.env.EMAIL_USER}>`,
    to:      application.email,
    subject: `Application Received — ${application.role_applied}`,
    html
  });
}

async function sendCareerApplicationNotificationToHospital(application, cvAttachmentPath) {
  const html = emailWrapper('New Job Application', `
    <h2 style="margin:0 0 20px;font-family:Georgia,serif;font-size:24px;color:#002B5C;">
      New Career Application
    </h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${tableRow('Name', application.full_name)}
      ${tableRow('Email', application.email)}
      ${tableRow('Phone', application.phone)}
      ${tableRow('Role Applied', application.role_applied)}
      ${tableRow('Department', application.department || 'Not specified')}
      ${application.cover_letter ? tableRow('Cover Letter', application.cover_letter) : ''}
    </table>
    <p style="margin:20px 0 0;font-size:13px;color:#7A8BAA;">CV attached below.</p>
  `);

  const mailOptions = {
    from:    `"St. Nicholas Website" <${process.env.EMAIL_USER}>`,
    to:      process.env.HOSPITAL_EMAIL_CAREERS || process.env.HOSPITAL_EMAIL,
    subject: `New Application: ${application.full_name} — ${application.role_applied}`,
    html
  };

  // Attach the CV file if it was uploaded
  if (cvAttachmentPath) {
    mailOptions.attachments = [{
      filename: application.cv_filename,
      path:     cvAttachmentPath
    }];
  }

  await transporter.sendMail(mailOptions);
}


// ─────────────────────────────────────────────────────────────
// HELPER FUNCTION
// Renders a single row in the notification email data tables
// ─────────────────────────────────────────────────────────────
function tableRow(label, value) {
  return `
    <tr>
      <td style="padding:10px 12px;background:#F7F8FA;border-radius:6px;border-bottom:4px solid #fff;">
        <span style="font-size:10px;font-weight:600;color:#7A8BAA;text-transform:uppercase;letter-spacing:0.10em;display:block;margin-bottom:3px;">${label}</span>
        <span style="font-size:14px;color:#002B5C;font-weight:500;">${value}</span>
      </td>
    </tr>
  `;
}


// ─────────────────────────────────────────────────────────────
// NEWSLETTER WELCOME EMAIL
// Fires when someone subscribes via the footer newsletter form
// ─────────────────────────────────────────────────────────────

async function sendNewsletterWelcome(email) {
  const html = emailWrapper('Welcome to St. Nicholas Hospital Updates', `
    <h2 style="margin:0 0 6px;font-family:Georgia,serif;font-size:26px;font-weight:500;color:#002B5C;">
      You're subscribed. Welcome.
    </h2>
    <p style="margin:0 0 28px;font-size:13px;color:#7A8BAA;letter-spacing:0.10em;text-transform:uppercase;">
      St. Nicholas Hospital Newsletter
    </p>

    <p style="font-size:15px;color:#4A5568;line-height:1.8;margin-bottom:20px;">
      Thank you for subscribing to updates from St. Nicholas Hospital Lagos. You'll be among the first to hear about:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #F0F4F8;">
          <span style="font-size:18px;margin-right:10px;">🏥</span>
          <span style="font-size:14px;color:#002B5C;font-weight:500;">New services and specialist clinics</span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #F0F4F8;">
          <span style="font-size:18px;margin-right:10px;">💊</span>
          <span style="font-size:14px;color:#002B5C;font-weight:500;">Health tips and medical advice from our consultants</span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #F0F4F8;">
          <span style="font-size:18px;margin-right:10px;">📣</span>
          <span style="font-size:14px;color:#002B5C;font-weight:500;">Hospital news, events and announcements</span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;">
          <span style="font-size:18px;margin-right:10px;">🎯</span>
          <span style="font-size:14px;color:#002B5C;font-weight:500;">Special programmes and health screening offers</span>
        </td>
      </tr>
    </table>

    <div style="background:#F7F8FA;border-radius:10px;padding:20px 24px;margin-bottom:24px;border-left:3px solid #B8953A;">
      <p style="margin:0;font-family:Georgia,serif;font-size:17px;font-style:italic;color:#002B5C;line-height:1.6;">
        "Because your parents gave you everything — and your family deserves world-class care."
      </p>
      <p style="margin:10px 0 0;font-size:12px;color:#7A8BAA;">— St. Nicholas Hospital, Est. 1952</p>
    </div>

    <p style="font-size:14px;color:#4A5568;line-height:1.7;margin-bottom:8px;">
      Need to book an appointment or speak with a doctor?
    </p>

    <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="padding:4px 0;">
          <span style="font-size:14px;color:#4A5568;">📞 Emergency:</span>
          <span style="font-size:14px;font-weight:600;color:#002B5C;margin-left:8px;">08022908484</span>
        </td>
      </tr>
      <tr>
        <td style="padding:4px 0;">
          <span style="font-size:14px;color:#4A5568;">💬 WhatsApp:</span>
          <span style="font-size:14px;font-weight:600;color:#002B5C;margin-left:8px;">08084632038</span>
        </td>
      </tr>
      <tr>
        <td style="padding:4px 0;">
          <span style="font-size:14px;color:#4A5568;">📍 Address:</span>
          <span style="font-size:14px;font-weight:600;color:#002B5C;margin-left:8px;">57 Campbell Street, Lagos Island</span>
        </td>
      </tr>
    </table>

    <p style="font-size:11px;color:#B0BAC8;line-height:1.6;border-top:1px solid #F0F4F8;padding-top:16px;margin-top:8px;">
      You received this email because you subscribed at saintnicholashospital.com.
      If you did not subscribe or wish to unsubscribe, simply reply to this email with "Unsubscribe"
      and we will remove you immediately.
    </p>
  `);

  await transporter.sendMail({
    from:    `"St. Nicholas Hospital" <${process.env.EMAIL_USER}>`,
    to:      email,
    subject: 'Welcome to St. Nicholas Hospital — You\'re Subscribed ✓',
    html
  });
}


module.exports = {
  sendBookingConfirmationToPatient,
  sendBookingNotificationToHospital,
  sendUKTBPaymentConfirmation,
  sendUKTBNotificationToHospital,
  sendElderlyEnquiryConfirmation,
  sendElderlyEnquiryNotificationToHospital,
  sendCareerApplicationConfirmation,
  sendCareerApplicationNotificationToHospital,
  sendNewsletterWelcome,
  sendAppointmentConfirmationToPatient,
  sendAppointmentNotificationToDoctor,
  sendUKTBScheduledToPatient,
  sendUKTBScheduledToDoctor
};


// ─────────────────────────────────────────────────────────────
// APPOINTMENT CONFIRMATION EMAILS
// Fires when receptionist confirms a booking
// ─────────────────────────────────────────────────────────────

async function sendAppointmentConfirmationToPatient({ booking, doctor, formattedDate, formattedTime }) {
  const html = emailWrapper('Your Appointment is Confirmed', `
    <h2 style="margin:0 0 6px;font-family:Georgia,serif;font-size:26px;font-weight:500;color:#002B5C;">
      Your appointment is confirmed, ${booking.name.split(' ')[0]}.
    </h2>
    <p style="margin:0 0 24px;font-size:13px;color:#7A8BAA;letter-spacing:0.10em;text-transform:uppercase;">
      Appointment Confirmation — St. Nicholas Hospital
    </p>

    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;
                padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;font-weight:600;color:#166534;">
        ✅ Your appointment has been scheduled
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#F7F8FA;border-radius:10px;padding:20px;margin-bottom:24px;">
      <tr><td style="padding:8px 0;">
        <span style="font-size:11px;font-weight:600;color:#7A8BAA;
                     text-transform:uppercase;letter-spacing:0.10em;">Doctor</span><br>
        <span style="font-size:16px;color:#002B5C;font-weight:600;">
          ${doctor.full_name}
        </span>
        ${doctor.specialty ? `<br><span style="font-size:13px;color:#7A8BAA;">${doctor.specialty}</span>` : ''}
      </td></tr>
      <tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;">
        <span style="font-size:11px;font-weight:600;color:#7A8BAA;
                     text-transform:uppercase;letter-spacing:0.10em;">Date</span><br>
        <span style="font-size:15px;color:#002B5C;font-weight:500;">${formattedDate}</span>
      </td></tr>
      <tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;">
        <span style="font-size:11px;font-weight:600;color:#7A8BAA;
                     text-transform:uppercase;letter-spacing:0.10em;">Time</span><br>
        <span style="font-size:22px;color:#1E9FD4;font-weight:700;">${formattedTime}</span>
      </td></tr>
      <tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;">
        <span style="font-size:11px;font-weight:600;color:#7A8BAA;
                     text-transform:uppercase;letter-spacing:0.10em;">Branch</span><br>
        <span style="font-size:15px;color:#002B5C;font-weight:500;">${booking.branch}</span>
      </td></tr>
      <tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;">
        <span style="font-size:11px;font-weight:600;color:#7A8BAA;
                     text-transform:uppercase;letter-spacing:0.10em;">Specialty</span><br>
        <span style="font-size:15px;color:#002B5C;font-weight:500;">${booking.specialty}</span>
      </td></tr>
    </table>

    <div style="background:#FFF7ED;border-left:3px solid #F59E0B;
                border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#92400E;font-weight:500;">
        📌 Please arrive <strong>15 minutes early</strong> with a valid ID.
        If you need to reschedule, please call us at least 24 hours in advance.
      </p>
    </div>

    <p style="font-size:14px;color:#4A5568;margin-bottom:6px;">Need to reach us?</p>
    <p style="font-size:16px;font-weight:600;color:#002B5C;margin-bottom:4px;">
      📞 08022908484 &nbsp;|&nbsp; 08035251295
    </p>
    <p style="font-size:13px;color:#7A8BAA;">
      Emergency lines available 24/7
    </p>
  `);

  await transporter.sendMail({
    from:    `"St. Nicholas Hospital" <${process.env.EMAIL_USER}>`,
    to:      booking.email,
    subject: `Appointment Confirmed — ${formattedDate} at ${formattedTime}`,
    html
  });
}


async function sendAppointmentNotificationToDoctor({ booking, doctor, formattedDate, formattedTime }) {
  // Only send if the doctor has an email address
  if (!doctor.email) return;

  const html = emailWrapper('New Patient Assigned to You', `
    <h2 style="margin:0 0 6px;font-family:Georgia,serif;font-size:24px;font-weight:500;color:#002B5C;">
      New appointment assigned, ${doctor.full_name.split(' ').pop()}.
    </h2>
    <p style="margin:0 0 24px;font-size:13px;color:#7A8BAA;letter-spacing:0.10em;text-transform:uppercase;">
      Patient Assignment — St. Nicholas Hospital
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${tableRow('Patient Name',  booking.name)}
      ${tableRow('Phone',         booking.phone)}
      ${tableRow('Email',         booking.email || 'Not provided')}
      ${tableRow('Branch',        booking.branch)}
      ${tableRow('Specialty',     booking.specialty)}
      ${tableRow('Date',          formattedDate)}
      ${tableRow('Time',          formattedTime)}
      ${booking.message ? tableRow('Patient Note', booking.message) : ''}
    </table>

    <p style="margin:20px 0 0;font-size:13px;color:#7A8BAA;">
      This appointment was scheduled by the reception team.
      Log into your dashboard to view the full patient list.
    </p>
  `);

  await transporter.sendMail({
    from:    `"St. Nicholas Reception" <${process.env.EMAIL_USER}>`,
    to:      doctor.email,
    subject: `New Patient: ${booking.name} — ${formattedDate} at ${formattedTime}`,
    html
  });
}


// ─────────────────────────────────────────────────────────────
// UK TB SCHEDULED EMAILS
// Fires when receptionist schedules a paid TB screening
// ─────────────────────────────────────────────────────────────

async function sendUKTBScheduledToPatient({ screening, doctor, formattedDate, formattedTime }) {
  const html = emailWrapper('UK TB Screening — Appointment Scheduled', `
    <h2 style="margin:0 0 6px;font-family:Georgia,serif;font-size:26px;font-weight:500;color:#002B5C;">
      Your screening is scheduled, ${screening.name.split(' ')[0]}.
    </h2>
    <p style="margin:0 0 24px;font-size:13px;color:#7A8BAA;letter-spacing:0.10em;text-transform:uppercase;">
      UK Visa TB Screening Appointment
    </p>

    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;
                padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;font-weight:600;color:#166534;">
        ✅ Your TB screening appointment has been confirmed
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#F7F8FA;border-radius:10px;padding:20px;margin-bottom:24px;">
      <tr><td style="padding:8px 0;">
        <span style="font-size:11px;font-weight:600;color:#7A8BAA;
                     text-transform:uppercase;letter-spacing:0.10em;">Doctor</span><br>
        <span style="font-size:15px;color:#002B5C;font-weight:600;">${doctor.full_name}</span>
      </td></tr>
      <tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;">
        <span style="font-size:11px;font-weight:600;color:#7A8BAA;
                     text-transform:uppercase;letter-spacing:0.10em;">Date</span><br>
        <span style="font-size:15px;color:#002B5C;font-weight:500;">${formattedDate}</span>
      </td></tr>
      <tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;">
        <span style="font-size:11px;font-weight:600;color:#7A8BAA;
                     text-transform:uppercase;letter-spacing:0.10em;">Time</span><br>
        <span style="font-size:22px;color:#1E9FD4;font-weight:700;">${formattedTime}</span>
      </td></tr>
      <tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;">
        <span style="font-size:11px;font-weight:600;color:#7A8BAA;
                     text-transform:uppercase;letter-spacing:0.10em;">Number of Applicants</span><br>
       <span style="font-size:15px;color:#002B5C;font-weight:500;">${screening.service || 'UK Visa TB Screening'}</span>
      </td></tr>
      <tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;">
        <span style="font-size:11px;font-weight:600;color:#7A8BAA;
                     text-transform:uppercase;letter-spacing:0.10em;">Payment Reference</span><br>
        <span style="font-size:13px;color:#002B5C;font-weight:500;font-family:monospace;">
          ${screening.paystack_reference}
        </span>
      </td></tr>
    </table>

    <div style="background:#FFF7ED;border-left:3px solid #F59E0B;
                border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#92400E;font-weight:500;">
        📌 Please bring <strong>valid ID</strong> and your <strong>payment reference</strong> for all applicants.
        Arrive 15 minutes early.
      </p>
    </div>

    <p style="font-size:14px;font-weight:600;color:#002B5C;">
      📞 08022908484
    </p>
  `);

  await transporter.sendMail({
    from:    `"St. Nicholas Hospital" <${process.env.EMAIL_USER}>`,
    to:      screening.email,
    subject: `TB Screening Scheduled — ${formattedDate} at ${formattedTime}`,
    html
  });
}


async function sendUKTBScheduledToDoctor({ screening, doctor, formattedDate, formattedTime }) {
  if (!doctor.email) return;

  const html = emailWrapper('UK TB Screening Assigned to You', `
    <h2 style="margin:0 0 20px;font-family:Georgia,serif;font-size:24px;color:#002B5C;">
      New TB Screening Assignment
    </h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${tableRow('Patient Name',    screening.name)}
      ${tableRow('Phone',           screening.phone)}
      ${tableRow('Email',           screening.email)}
      ${tableRow('Applicants',      screening.num_applicants)}
      ${tableRow('Date',            formattedDate)}
      ${tableRow('Time',            formattedTime)}
      ${tableRow('Payment Ref',     screening.paystack_reference)}
    </table>
  `);

  await transporter.sendMail({
    from:    `"St. Nicholas Reception" <${process.env.EMAIL_USER}>`,
    to:      doctor.email,
    subject: `TB Screening: ${screening.name} — ${formattedDate} at ${formattedTime}`,
    html
  });
}

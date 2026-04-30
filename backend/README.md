# St. Nicholas Hospital — Backend

Node.js + Express backend with PostgreSQL (Supabase), email notifications, Paystack payments, and an admin dashboard.

---

## SETUP GUIDE (do these in order)

---

### STEP 1 — Install Node.js
Download and install Node.js from https://nodejs.org (choose the LTS version).
Verify it installed by opening your terminal and running:
```
node --version
npm --version
```

---

### STEP 2 — Create your Supabase project

1. Go to https://supabase.com and create a free account
2. Click "New Project" — choose a name like "st-nicholas-hospital"
3. Set a strong database password and save it somewhere
4. Wait for the project to finish setting up (about 1 minute)
5. Go to **Settings → Database** and copy the **Connection String (URI)**
   It looks like: `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres`

---

### STEP 3 — Create the database tables

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open the file `db/schema.sql` from this project
4. Paste the entire contents into the SQL Editor
5. Click **Run**
6. You should see "Success. No rows returned" — that means all tables were created

---

### STEP 4 — Set up your environment variables

1. Copy the example file:
   ```
   cp .env.example .env
   ```
2. Open `.env` in VS Code and fill in:
   - `DATABASE_URL` — the Supabase connection string from Step 2
   - `EMAIL_USER` — your Gmail address
   - `EMAIL_PASS` — your Gmail App Password (see below)
   - `PAYSTACK_SECRET_KEY` — from your Paystack dashboard
   - `SESSION_SECRET` — any long random string (e.g. mash your keyboard)
   - `ADMIN_PASSWORD` — choose something strong

**Getting a Gmail App Password:**
1. Go to your Google Account → Security
2. Enable 2-Step Verification if not already on
3. Search for "App Passwords"
4. Create one for "Mail" on "Other device" — name it "St Nicholas"
5. Copy the 16-character password into EMAIL_PASS

---

### STEP 5 — Install dependencies and start the server

Open your terminal in VS Code (Terminal → New Terminal), then run:
```bash
cd backend
npm install
npm run dev
```

You should see the server start message with the St. Nicholas header.

Open http://localhost:3000/admin in your browser.
Log in with the username and password you set in `.env`.

---

### STEP 6 — Connect your frontend forms

In each HTML page, update the fetch calls to point to your backend.

**Example — booking form (in index.js or your components.js):**
```javascript
const response = await fetch('http://localhost:3000/api/bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name:           document.getElementById('name').value,
    phone:          document.getElementById('phone').value,
    email:          document.getElementById('email').value,
    branch:         document.getElementById('branch').value,
    specialty:      document.getElementById('specialty').value,
    preferred_date: document.getElementById('date').value,
    source_page:    'homepage'
  })
});

const data = await response.json();

if (data.success) {
  // Show success message
} else {
  // Show error: data.errors or data.message
}
```

**Example — newsletter form:**
```javascript
const response = await fetch('http://localhost:3000/api/newsletter/subscribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: document.getElementById('nl-email').value })
});
```

**Example — elderly prepaid form:**
```javascript
const response = await fetch('http://localhost:3000/api/elderly', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name:       document.getElementById('ep-name').value,
    phone:      document.getElementById('ep-phone').value,
    email:      document.getElementById('ep-email').value,
    parent_age: document.getElementById('ep-age').value,
    consent:    'true'
  })
});
```

**Example — UK TB screening (Paystack flow):**
```javascript
const response = await fetch('http://localhost:3000/api/uktb/initiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name:           name,
    phone:          phone,
    email:          email,
    num_applicants: numApplicants,
    preferred_date: preferredDate
  })
});

const data = await response.json();

if (data.success) {
  // Redirect user to Paystack payment page
  window.location.href = data.paymentUrl;
}
```

**Careers form (multipart/form-data because of file upload):**
```javascript
const formData = new FormData();
formData.append('full_name',   fullName);
formData.append('email',       email);
formData.append('phone',       phone);
formData.append('role_applied', role);
formData.append('department',  department);
formData.append('cover_letter', coverLetter);
formData.append('cv',          fileInput.files[0]);  // the actual file

const response = await fetch('http://localhost:3000/api/careers', {
  method: 'POST',
  body: formData  // DO NOT set Content-Type — browser sets it automatically with boundary
});
```

---

### STEP 7 — Set up Paystack webhook (for UK TB payments)

1. Go to https://dashboard.paystack.com
2. Settings → Webhooks
3. Add your webhook URL: `https://yoursite.com/api/uktb/webhook`
4. (During development you can use https://ngrok.com to expose localhost)

---

## API REFERENCE

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /api/bookings | Submit appointment booking |
| POST | /api/uktb/initiate | Start UK TB screening payment |
| POST | /api/uktb/webhook | Paystack payment confirmation (Paystack calls this) |
| GET  | /api/uktb/verify/:ref | Verify payment status by reference |
| POST | /api/elderly | Submit elderly prepaid enquiry |
| POST | /api/careers | Submit job application with CV |
| POST | /api/newsletter/subscribe | Subscribe to newsletter |
| POST | /api/newsletter/unsubscribe | Unsubscribe |
| GET  | /admin | Admin dashboard |
| GET  | /health | Server health check |

---

## PROJECT STRUCTURE

```
backend/
├── server.js              Main entry point
├── .env                   Your credentials (never commit this to git)
├── .env.example           Template showing what variables are needed
├── package.json
├── db/
│   ├── index.js           PostgreSQL connection pool
│   └── schema.sql         All database tables (run this in Supabase)
├── routes/
│   ├── bookings.js        Appointment booking API
│   ├── uktb.js            UK TB screening + Paystack payment
│   ├── elderly.js         Elderly prepaid enquiry API
│   ├── careers.js         Career application + CV upload
│   ├── newsletter.js      Newsletter subscription
│   └── admin.js           Admin dashboard (login + all data views)
├── middleware/
│   └── auth.js            Admin session authentication
├── utils/
│   └── mailer.js          All email templates and sending logic
└── uploads/               CV files are stored here
```

---

## IMPORTANT SECURITY NOTES

- Never commit your `.env` file to Git. Add it to `.gitignore`
- Change `ADMIN_PASSWORD` and `SESSION_SECRET` before going live
- Use HTTPS in production (required for Paystack webhooks)
- The `uploads/` folder contains patient CVs — back it up regularly

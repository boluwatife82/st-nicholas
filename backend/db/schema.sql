

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  full_name       VARCHAR(200)  NOT NULL,
  email           VARCHAR(200)  NOT NULL UNIQUE,
  password_hash   VARCHAR(300)  NOT NULL,
  role            VARCHAR(20)   NOT NULL DEFAULT 'doctor',
  -- superadmin | receptionist | doctor
  specialty       VARCHAR(100),
  -- only for doctors e.g. "Cardiology", "Obstetrics"
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  last_login      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ── BOOKINGS ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bookings (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(200)  NOT NULL,
  phone               VARCHAR(30)   NOT NULL,
  email               VARCHAR(200),
  branch              VARCHAR(100)  NOT NULL,
  specialty           VARCHAR(100)  NOT NULL,
  preferred_date      DATE,
  message             TEXT,
  source_page         VARCHAR(100),
  status              VARCHAR(20)   NOT NULL DEFAULT 'pending',
  -- pending | confirmed | seen | cancelled
  assigned_doctor_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  confirmed_date      DATE,
  confirmed_time      TIME,
  receptionist_notes  TEXT,
  confirmed_at        TIMESTAMPTZ,
  seen_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ── UK TB SCREENING ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS uktb_screenings (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(200)  NOT NULL,
  phone               VARCHAR(30)   NOT NULL,
  email               VARCHAR(200)  NOT NULL,
  num_applicants      INTEGER       NOT NULL DEFAULT 1,
  amount_kobo         INTEGER       NOT NULL,
  preferred_date      DATE,
  paystack_reference  VARCHAR(100)  UNIQUE,
  paystack_status     VARCHAR(30)   NOT NULL DEFAULT 'pending',
  booking_status      VARCHAR(20)   NOT NULL DEFAULT 'unpaid',
  -- unpaid | paid | scheduled | completed | cancelled
  confirmed_date      DATE,
  confirmed_time      TIME,
  assigned_doctor_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ── ELDERLY PREPAID ENQUIRIES ───────────────────────────────

CREATE TABLE IF NOT EXISTS elderly_enquiries (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(200)  NOT NULL,
  phone           VARCHAR(30)   NOT NULL,
  email           VARCHAR(200)  NOT NULL,
  parent_age      VARCHAR(20)   NOT NULL,
  message         TEXT,
  consent_given   BOOLEAN       NOT NULL DEFAULT FALSE,
  status          VARCHAR(20)   NOT NULL DEFAULT 'new',
  -- new | contacted | enrolled | not-interested
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ── CAREER APPLICATIONS ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS career_applications (
  id              SERIAL PRIMARY KEY,
  full_name       VARCHAR(200)  NOT NULL,
  email           VARCHAR(200)  NOT NULL,
  phone           VARCHAR(30)   NOT NULL,
  role_applied    VARCHAR(200)  NOT NULL,
  department      VARCHAR(100),
  cover_letter    TEXT,
  cv_filename     VARCHAR(300),
  cv_filepath     VARCHAR(500),
  cv_mimetype     VARCHAR(100),
  status          VARCHAR(30)   NOT NULL DEFAULT 'received',
  -- received | reviewing | shortlisted | interviewed | offered | rejected
  notes           TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ── NEWSLETTER SUBSCRIBERS ──────────────────────────────────

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id              SERIAL PRIMARY KEY,
  email           VARCHAR(200)  NOT NULL UNIQUE,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  subscribed_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);


-- ── INDEXES ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_role            ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email           ON users(email);
CREATE INDEX IF NOT EXISTS idx_bookings_status       ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created      ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_doctor       ON bookings(assigned_doctor_id);
CREATE INDEX IF NOT EXISTS idx_uktb_paystack_ref     ON uktb_screenings(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_uktb_status           ON uktb_screenings(paystack_status);
CREATE INDEX IF NOT EXISTS idx_elderly_status        ON elderly_enquiries(status);
CREATE INDEX IF NOT EXISTS idx_careers_status        ON career_applications(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_email      ON newsletter_subscribers(email);


-- ── AUTO-UPDATE updated_at TRIGGER ──────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_uktb_updated_at
  BEFORE UPDATE ON uktb_screenings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_elderly_updated_at
  BEFORE UPDATE ON elderly_enquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_careers_updated_at
  BEFORE UPDATE ON career_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();




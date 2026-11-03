CREATE TABLE IF NOT EXISTS entities (
 id VARCHAR(80) PRIMARY KEY,
 kind VARCHAR(20) NOT NULL,
 document TEXT NOT NULL
);
ALTER TABLE entities ADD COLUMN IF NOT EXISTS sample_data BOOLEAN DEFAULT FALSE NOT NULL;
CREATE TABLE IF NOT EXISTS patients (
 id VARCHAR(80) PRIMARY KEY,
 name VARCHAR(40) NOT NULL,
 village VARCHAR(40) NOT NULL,
 language VARCHAR(10) NOT NULL
);
CREATE TABLE IF NOT EXISTS bookings (
 id VARCHAR(80) PRIMARY KEY,
 pid VARCHAR(80) NOT NULL REFERENCES entities(id),
 booking_date VARCHAR(10) NOT NULL,
 booking_time VARCHAR(5) NOT NULL,
 status VARCHAR(20) NOT NULL,
 document TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS booking_slot ON bookings(pid, booking_date, booking_time, status);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS expires_at BIGINT DEFAULT 0 NOT NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT '' NOT NULL;

CREATE TABLE IF NOT EXISTS accounts (
 id VARCHAR(80) PRIMARY KEY,
 username VARCHAR(80) NOT NULL UNIQUE,
 email VARCHAR(254) NOT NULL UNIQUE,
 password_hash VARCHAR(255),
 role VARCHAR(20) NOT NULL,
 subject_id VARCHAR(80) NOT NULL,
 display_name VARCHAR(100) NOT NULL,
 active BOOLEAN DEFAULT FALSE NOT NULL,
 created_at BIGINT NOT NULL
);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS credential_version INTEGER DEFAULT 0 NOT NULL;
CREATE TABLE IF NOT EXISTS provider_applications (
 id VARCHAR(80) PRIMARY KEY,
 username VARCHAR(80) NOT NULL UNIQUE,
 email VARCHAR(254) NOT NULL UNIQUE,
 status VARCHAR(30) NOT NULL,
 document TEXT NOT NULL,
 submitted_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS activation_tokens (
 token_hash VARCHAR(64) PRIMARY KEY,
 account_id VARCHAR(80) NOT NULL REFERENCES accounts(id),
 expires_at BIGINT NOT NULL,
 used BOOLEAN DEFAULT FALSE NOT NULL
);
CREATE TABLE IF NOT EXISTS email_outbox (
 id VARCHAR(80) PRIMARY KEY,
 recipient VARCHAR(254) NOT NULL,
 subject VARCHAR(255) NOT NULL,
 body TEXT NOT NULL,
 status VARCHAR(20) NOT NULL,
 attempts INTEGER DEFAULT 0 NOT NULL,
 next_attempt BIGINT NOT NULL,
 updated_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_events (
 id VARCHAR(80) PRIMARY KEY,
 actor_id VARCHAR(80) NOT NULL,
 action VARCHAR(80) NOT NULL,
 resource_id VARCHAR(80) NOT NULL,
 detail TEXT NOT NULL,
 created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS service_requests (
 id VARCHAR(80) PRIMARY KEY,
 patient_id VARCHAR(80) NOT NULL REFERENCES patients(id),
 pharmacy_id VARCHAR(80) NOT NULL REFERENCES entities(id),
 medicine_id VARCHAR(80) NOT NULL,
 message VARCHAR(500) NOT NULL,
 status VARCHAR(20) NOT NULL,
 created_at BIGINT NOT NULL
);
-- Additive upgrade; legacy catalog and booking records are retained.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS suspended BOOLEAN DEFAULT FALSE NOT NULL;
CREATE TABLE IF NOT EXISTS application_documents (
 id VARCHAR(80) PRIMARY KEY, application_id VARCHAR(80) NOT NULL,
 filename VARCHAR(120) NOT NULL, media_type VARCHAR(40) NOT NULL,
 content_base64 TEXT NOT NULL, created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS application_document_owner ON application_documents(application_id);
CREATE TABLE IF NOT EXISTS care_services (
 id VARCHAR(80) PRIMARY KEY, provider_id VARCHAR(80) NOT NULL,
 approval VARCHAR(20) NOT NULL, active BOOLEAN DEFAULT TRUE NOT NULL, document TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS care_service_owner ON care_services(provider_id);
CREATE TABLE IF NOT EXISTS care_requests (
 id VARCHAR(80) PRIMARY KEY, service_id VARCHAR(80) NOT NULL, provider_id VARCHAR(80) NOT NULL,
 patient_id VARCHAR(80) NOT NULL, request_date VARCHAR(10) NOT NULL, request_time VARCHAR(5) NOT NULL,
 status VARCHAR(30) NOT NULL, expires_at BIGINT NOT NULL, created_at BIGINT NOT NULL, document TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS care_request_capacity ON care_requests(provider_id,request_date,request_time,status);
                        
CREATE TABLE IF NOT EXISTS reference_catalog (
 category VARCHAR(40) NOT NULL,
 ref_id VARCHAR(80) NOT NULL,
 document TEXT NOT NULL,
 display_order INTEGER DEFAULT 0 NOT NULL,
 active BOOLEAN DEFAULT TRUE NOT NULL,
 PRIMARY KEY(category,ref_id)
);
-- Existing providers remain approved through the absence of an onboarding row.
-- New accounts receive a draft row before their activation email is issued.
CREATE TABLE IF NOT EXISTS provider_business_profiles (
 provider_id VARCHAR(80) PRIMARY KEY,
 status VARCHAR(20) NOT NULL,
 active BOOLEAN DEFAULT TRUE NOT NULL,
 document TEXT NOT NULL,
 updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS provider_business_review ON provider_business_profiles(status);
-- Preserve existing accounts; only new reviewed registrations use the new gate.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS registration_status VARCHAR(20) DEFAULT 'approved' NOT NULL;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE NOT NULL;
-- Earlier contact-only signups had no application queue. Keep active users and
-- invited staff unchanged; unverified initial owners must now be reviewed.
UPDATE accounts SET registration_status='pending'
 WHERE role='provider' AND active=FALSE
 AND EXISTS (SELECT 1 FROM provider_business_profiles b WHERE b.provider_id=accounts.subject_id AND b.status='draft')
 AND NOT EXISTS (SELECT 1 FROM provider_applications p WHERE p.email=accounts.email)
 AND NOT EXISTS (SELECT 1 FROM accounts owner_account WHERE owner_account.subject_id=accounts.subject_id AND owner_account.active=TRUE);
UPDATE activation_tokens SET used=TRUE
 WHERE account_id IN (SELECT id FROM accounts WHERE registration_status='pending');

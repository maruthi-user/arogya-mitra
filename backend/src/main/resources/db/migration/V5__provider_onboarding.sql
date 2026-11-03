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

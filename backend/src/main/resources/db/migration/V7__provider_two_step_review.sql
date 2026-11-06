-- Two-step provider onboarding, mirroring the HRMS Team Lead -> HR flow:
--   pending_verification -> (verifier) -> pending_admin -> (admin) -> approved -> (provider sets password) -> activated
--   A rejection at either step ends the request: verification_rejected / rejected.
-- account_id is copied out of the JSON document (by ProviderApplicationService on startup)
-- so activation can mark the request without parsing JSON in SQL.
ALTER TABLE provider_applications ADD COLUMN IF NOT EXISTS account_id VARCHAR(80);
UPDATE provider_applications SET status='pending_verification' WHERE status='pending';
CREATE INDEX IF NOT EXISTS provider_applications_status ON provider_applications(status);
CREATE INDEX IF NOT EXISTS provider_applications_account ON provider_applications(account_id);

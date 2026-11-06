-- Every status change of a provider application, oldest first. Replaces overwriting reviewReason in the JSON document.
CREATE TABLE IF NOT EXISTS application_events (
 id VARCHAR(80) PRIMARY KEY,
 application_id VARCHAR(80) NOT NULL,
 actor_id VARCHAR(80),
 from_status VARCHAR(30),
 to_status VARCHAR(30) NOT NULL,
 note VARCHAR(1000),
 created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS application_events_application ON application_events(application_id, created_at);

-- Queryable columns for the fields the review screens list and search. The JSON document stays for the
-- full submission; ProviderApplicationService keeps both in step and backfills these on startup.
ALTER TABLE provider_applications ADD COLUMN IF NOT EXISTS name VARCHAR(80);
ALTER TABLE provider_applications ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE provider_applications ADD COLUMN IF NOT EXISTS organization VARCHAR(100);
ALTER TABLE provider_applications ADD COLUMN IF NOT EXISTS business_type VARCHAR(30);
ALTER TABLE provider_applications ADD COLUMN IF NOT EXISTS verified_by VARCHAR(80);
ALTER TABLE provider_applications ADD COLUMN IF NOT EXISTS verified_at BIGINT;
ALTER TABLE provider_applications ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(80);
ALTER TABLE provider_applications ADD COLUMN IF NOT EXISTS reviewed_at BIGINT;

-- New documents go to the configured file storage (local disk, S3 or Spaces); older rows keep their base64 copy.
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS storage_key VARCHAR(300);
ALTER TABLE application_documents ALTER COLUMN content_base64 DROP NOT NULL;

-- Shared attempt log so throttling survives restarts and is shared between app instances.
CREATE TABLE IF NOT EXISTS rate_limit_attempts (
 id VARCHAR(80) PRIMARY KEY,
 limit_key VARCHAR(200) NOT NULL,
 attempted_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limit_attempts_key ON rate_limit_attempts(limit_key, attempted_at);

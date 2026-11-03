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

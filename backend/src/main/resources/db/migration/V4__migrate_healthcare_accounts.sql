-- Preserve existing account IDs in domain tables and retain their BCrypt hashes.
INSERT INTO APP_USERS(USERNAME,EMAIL,PASSWORD,ROLE,STATUS,FAILED_ATTEMPTS,CREATED_AT,UPDATED_AT)
SELECT a.username,a.email,COALESCE(a.password_hash,''),UPPER(a.role),
 CASE WHEN a.active=TRUE AND a.suspended=FALSE THEN 'ACTIVE' ELSE 'INACTIVE' END,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
FROM accounts a WHERE NOT EXISTS (SELECT 1 FROM APP_USERS u WHERE u.username=a.username);

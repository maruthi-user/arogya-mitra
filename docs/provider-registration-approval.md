# Provider registration and admin approval

This workflow replaces immediate email activation for new provider registrations. Business and service reviews still control public listings after account approval.

## Flow

1. Registration collects full name, email, mobile and consent. The backend derives and reserves a username from the name, adding a unique suffix when needed. Non-Latin-only names use a name-derived fallback identifier. A submitted username is ignored.
2. The provider account is inactive and a `provider_applications` record is saved as `pending` (displayed as **Pending Approval**). No activation/password setup token is issued. An acknowledgement email is queued.
3. Admin opens **Pending Provider Approvals**, views the submitted details and chooses Approve or Reject. The Applications screen retains all three statuses.
4. Approval generates a cryptographically random temporary password, stores its BCrypt hash in the linked account/identity stores, activates the account, and sets `must_change_password=true`. An approval email includes the username, temporary password and sign-in URL. Temporary passwords are never returned by registration/review APIs or placed in the application JSON.
5. Temporary-password sign-in returns `mustChangePassword=true`. The browser shows only the required password-change screen. A backend filter denies other healthcare and platform API access with `403 PASSWORD_CHANGE_REQUIRED`; changing the URL or using platform login does not bypass the restriction.
6. The provider supplies the temporary password and a different permanent password. The permanent password must have at least 12 characters, a letter and a digit, and fit BCrypt's 72-byte limit. Successful change synchronises both password stores, clears the flag and revokes all temporary sessions. The provider signs in again with the permanent password.
7. Rejection requires a 5–1000 character reason, keeps the account inactive, records `rejected` and queues a rejection email containing the reason. A reviewed application cannot be reviewed again.

Public business/service visibility additionally requires approval and active status. Registration approval alone does not publish services. Existing full-business registration payloads remain accepted with consent and receive the same temporary-password/first-login restriction; their supplied business details are included in admin review.

## Relevant APIs

| API | Purpose |
|---|---|
| `POST /api/auth/register` | Submit registration; returns application ID, generated username and `status: pending`. |
| `GET /api/admin/applications` | Admin reads applications and submitted details. |
| `POST /api/admin/applications/{id}/review` | Admin sends `decision: approved` or `rejected`; rejection requires `reason`. |
| `POST /api/auth/login` | Sign in; returns `mustChangePassword` in the healthcare session response. |
| `GET /api/auth/session` | Recover the required-password-change state after browser refresh. |
| `POST /api/auth/change-initial-password` | Restricted authenticated provider submits `currentPassword` and `newPassword`. Successful response clears authentication cookies. |
| `POST /api/auth/logout` | Exit a restricted or normal session. |

The existing CSRF token/cookie handshake remains required for mutations. Password recovery and activation links cannot activate pending/rejected registrations or clear the first-login requirement.

## Migration and existing records

Flyway **V6__provider_registration_approval.sql** adds `accounts.registration_status` and `accounts.must_change_password`. No tables or existing records are removed.

Existing active accounts default to approved with no forced password change. Earlier inactive contact-only owners with a draft business, no application and no active organisation member become pending; their old activation tokens are invalidated. An idempotent startup backfill places them in the admin approval queue without changing their existing account IDs or usernames. Existing invitations and already-approved applications retain their existing treatment. Earlier pending full applications also receive temporary credentials when approved.

Restart the backend to apply V6 and load the new API/filter. PostgreSQL execution and live email delivery were not performed during implementation; backend regression tests use isolated H2 databases and mocked mail.

## Email delivery

Approval/rejection emails use the existing transactional `email_outbox` and delivery worker. The default local SMTP address is `127.0.0.1:1025`; configure `SMTP_HOST`, `SMTP_PORT` and the existing mail credentials for your environment. The admin Email notifications screen shows queued/failed delivery and supports retrying failed messages. Approval email delivery is verified in tests through the outbox and mocked sender; a queued email is not proof of delivery to an external inbox.

# Backend and API testing

Spring Boot / Java 17+ / Maven. Default port: 9090. Default database: persistent H2 at ./data/arogya relative to the backend working directory. Optional PostgreSQL uses the postgres profile and DB_URL / DB_USERNAME / DB_PASSWORD.

## Start

Follow the root README to start the frontend, Mailpit and configure ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD for first-time administrator provisioning. Set FRONTEND_URL to the actual frontend URL so emailed activation links open the correct app. There is no admin self-registration or default password.

```powershell
cd backend
mvn spring-boot:run
```

The normal application does not seed sample accounts or providers. Old demo catalog rows are retained but hidden. Test seed data resides under src/test/resources and is enabled only in domain tests.

### Local startup and IDE dependency errors

No cloud account, SSH keys, or PostgreSQL installation is required for the default H2 configuration. Leave the `postgres` profile inactive to use it. Mailpit runs locally for email capture.

From the repository root, use the Windows launcher:

```powershell
.\start-backend.cmd
```

In Git Bash, run `./start-backend.cmd`, or `cd backend` then `mvn spring-boot:run`.

If VS Code reports `ClassNotFoundException` / `NoClassDefFoundError` for `org.springframework.security.web.context.SecurityContextRepository`, its Java launch classpath is stale. The security starter is already declared in `pom.xml`; keep it enabled. In the Command Palette, run **Java: Clean Java Language Server Workspace**, allow the reload, and wait for the Maven project import/build to finish before using Run Java again. Use `backend` as the launch working directory so the same local database is opened. Maven startup above resolves the classpath directly and avoids the stale IDE launch configuration.

## Session and CSRF contract

1. GET /api/auth/csrf; retain the session cookie and the returned token/headerName.
2. Include that header and the cookie on POST/PATCH requests.
3. Login, guest entry and logout rotate authentication/CSRF state; fetch a fresh token afterward.
4. Browsers use credentials: include. Local frontend requests go through the development proxy, avoiding cross-site cookies.

Provider/admin identity comes from the server session. Submitted providerId, patientId or actor identity cannot grant access to another account's records. Roles and ownership are enforced on the backend. Passwords are BCrypt hashes; activation/reset tokens are stored as SHA-256 hashes, expire in 24 hours and are single-use. Resetting a password invalidates existing provider sessions.

## APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /auth/csrf | Security token |
| GET | /auth/session | Current server-owned role/profile |
| POST | /auth/guest | Patient access without registration |
| POST | /auth/login | Username/email, password, role: provider/admin |
| POST | /auth/logout | End session |
| POST | /auth/register | Submit provider application |
| POST | /auth/activate | Token + new password |
| POST | /auth/request-setup | Request a new setup/reset email |
| GET | /state | Public catalogs + only authorized appointment records |
| GET | /providers | Activated providers; admin can inspect all operational profiles |
| GET | /providers/{id}/slots?date=YYYY-MM-DD | Public slot availability, without patient data |
| GET | /providers/{id}/bookings | Assigned provider/admin only |
| PATCH | /providers/{id}/profile | Own slots/services/fee |
| PATCH | /providers/{id}/schedule | Own daily slots |
| PATCH | /providers/{id}/open | Own current availability |
| GET/PATCH | /patients/{id} | Own guest profile/admin |
| POST | /bookings | Create pending request as current patient |
| GET | /bookings/{id} | Owner/assigned provider/admin |
| POST | /bookings/{id}/accept or /reject | Assigned provider only |
| POST | /bookings/{id}/cancel | Owner/assigned provider |
| POST | /bookings/{id}/complete or /no-show | Assigned provider, after appointment start |
| GET | /admin/applications | Review queue |
| POST | /admin/applications/{id}/review | decision: approved/rejected; reason required |
| GET | /admin/notifications | Delivery status, without email bodies/tokens |
| POST | /admin/notifications/{id}/retry | Retry failed notification |
| GET | /admin/audit | Administrative decision history |
| GET/POST | /admin/pharmacies | Directory management |
| PATCH | /pharmacies/{id}/stock | Admin stock updates |
| GET/POST | /medicine-requests | Own inquiries / create assigned pharmacy inquiry |
| PATCH | /medicine-requests/{id} | Admin marks contacted/resolved |

All paths above start with /api. Public provider fields do not expose application emails, registration IDs or account credentials. API errors contain message. Status codes include 400 validation, 401 session required, 403 access/CSRF failure, 409 workflow/uniqueness conflict and 429 rate limiting.

Registration requires name, username, email, phone, organization, designation (mbbs/rmp/ayush), village; registrationId is optional. Supported villages remain rama, krishna, gopala, venkata. Approval instructions and rejection reasons must be 5-1000 characters. Account approval does not constitute verified professional credentials.

Booking needs pid, date, time and optional reason (send an empty string if omitted). Save guest name/phone first through the patient profile API. The server derives patient identity, name and village from the session/profile. Pending reservations expire in 30 minutes or at the appointment start. Creation and acceptance retain transactional provider-row locking.

## Mailpit and email delivery

```powershell
cd backend
docker compose up -d mailpit
```

Alternatively use a native Mailpit binary. SMTP: 127.0.0.1:1025. Inbox: http://localhost:8025. Defaults are configured for local capture, not real-world delivery. No external email account is needed for local testing.

Application acknowledgment, approval/setup, rejection and new appointment-request emails are queued transactionally. A worker claims queued messages, sends through JavaMailSender, retries failures with backoff and recovers stale worker claims. Delivery is at-least-once; duplicate delivery remains possible after a transport acknowledgment failure. Sent email bodies are cleared from the outbox; admin APIs expose only delivery metadata. After six automatic failures, an admin can reset the retry cycle.

## Automated tests

```powershell
cd backend
mvn clean verify
```

Tests use in-memory H2 and mock SMTP. They cover booking races, expiry, server identity, CSRF, approval, activation-token reuse/expiry, password-reset session invalidation, pharmacy inquiries and delivery retries. Existing saved local H2 records are not touched.

## Live HTTP + real local SMTP verification

The read-only connection check is available from the root:

```powershell
npm.cmd run test:api
```

For the write workflow, use an isolated in-memory backend with an explicitly configured admin, plus Mailpit. In the client terminal set API_TEST_ADMIN_USERNAME and API_TEST_ADMIN_PASSWORD to that test admin (do not put passwords in source). Then run:

```powershell
npm.cmd run test:api -- http://127.0.0.1:19090/api --workflow
```

The workflow creates test applications/accounts, approves/activates a provider using its real captured email, configures slots, creates a guest booking, checks conflict/ownership, accepts/cancels/rebooks/rejects, verifies a rejection email and tests logout. It deliberately leaves records for inspection; use an isolated database. SMTP receipt is verified through the local Mailpit API, not a simulated send result.

## Postman and HTTP examples

Import api/Arogya-Mitra.postman_collection.json or open api/requests.http. Supply your own admin/provider credentials and activation token from Mailpit. The Postman pre-request hook fetches CSRF tokens and uses its cookie jar. It represents one session at a time: changing role changes that session. Run requests individually; accept and reject are alternative actions, so the collection is not a sequential runner. For a complete multi-actor ownership test, the CLI client maintains separate cookie jars automatically.

## Production release requirements

This is a locally implemented and tested application, not a production certification. Before release configure HTTPS, secure cookies, trusted CORS/origins, frontend activation-link URL, real SMTP, persistent production database, schema migration strategy, backups, monitoring, admin recovery, abuse controls and an independent security/accessibility/load review. Prefer a same-origin /api reverse proxy. Existing JVM-local sessions/rate limits need shared infrastructure or deliberate single-instance deployment.

Official credential-registry APIs, real ambulance dispatch, guest-account recovery and external inventory synchronization are not connected. No confirmation in the UI should be interpreted as a dispatched ambulance or independently verified medical registration.

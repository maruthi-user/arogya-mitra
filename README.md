# Arogya Mitra

Telugu/English healthcare access for villages and nearby towns, using the FPCS template foundation with Arogya Mitra's existing healthcare modules and PostgreSQL records.

## Run locally

Prerequisites: JDK 17+, Maven, PostgreSQL, Node 20.19+ (or a supported Node 22+ release).

The configured database is `arighya_db` on localhost:5432. Override `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` as needed. No records or passwords are reset on ordinary startup.

From the repository root, open two terminals:

```powershell
.\start-postgres.cmd
```

```powershell
.\start-postgres-frontend.cmd
```

Open http://127.0.0.1:3012. Backend: http://127.0.0.1:9092. The Vite server forwards `/api` to the backend. These ports avoid the other applications already using 3000/9090. If launching manually, match `FRONTEND_URL`, `APP_CORS_ORIGINS` and `BACKEND_URL` to your ports.

JWT signing requires a persistent, private base64 `JWT_SECRET_KEY` of at least 32 decoded bytes. On this workspace it is in the ignored `backend/config/local-jwt.properties`, generated during migration. Do not commit, print or replace it casually; rotating it signs out existing JWT sessions. A new checkout must supply its own key. `SESSION_COOKIE_SECURE=true` is required behind production HTTPS. Nothing has been deployed.

## Interfaces

- **Patient:** passwordless guest access, Telugu/English and voice/text navigation, provider/service discovery, appointments, home visits, medicines/delivery, lab tests, home check-ups, operator assistance, request history and cancellation. Emergency calling is separate from dispatch.
- **Provider:** registration and supporting documents, admin approval and one-use password setup, organisation-owned services, coverage, pricing, recurring slots, duration/capacity, availability and explicit request transitions.
- **Admin:** applications/documents, service review, organisation suspension/reactivation, staff invitations, pharmacy stock, operational requests, notification retries and combined healthcare/security audit history.
- **Account:** the template's account screen, password change and device-session management for providers/admins.

Use the current account usernames/passwords in your database. Historical sample usernames or passwords may have been changed by the project owner; migration retains current values and never resets them. Provider approval is not professional credential verification.

## Architecture

Frontend: React 19, Vite, Tailwind, Redux Toolkit/RTK Query, Wouter and the FPCS reusable shell/components. Existing healthcare page factories and actions run inside a scoped React host so their workflows/translations/voice are preserved; they have not all been rewritten as JSX. The template supplies navigation, branding, theme, command palette, provider/admin login and account/devices screens. Operational records and lookup catalogs come from backend APIs; no frontend demo adapter is used.

Backend: Java 17, Spring Boot 3.5.16, FPCS JWT access/rotating refresh cookies, device sessions, permission infrastructure, JPA/Hibernate and Flyway. Patient/provider catalog/booking repositories use JPA. Specialized healthcare service, capacity, outbox and audit queries retain parameterized SQL within the same transaction manager. Guest identities remain server-owned sessions; provider/admin production authentication uses JWT cookies, not a stored server authentication session. A CSRF session and readable XSRF cookie protect mutations for both clients.

Existing UUID healthcare account/organisation IDs remain intact; the template's `APP_USERS` table holds numeric authentication IDs. The bridge maps these identities and synchronizes approval, activation, reset and suspension. Template Tickets/demo modules were not imported. Existing transactional email delivery and private application documents remain the healthcare implementations.

Flyway migrations are under `backend/src/main/resources/db/migration`. Existing databases baseline at version 0; V1 retains/creates healthcare tables, V2 adds the template core, V3 adds JWT device sessions, V4 copies current BCrypt hashes/roles/status into template identities. Hibernate validates; it does not rewrite the schema. The old startup SQL initializer is disabled. Existing H2 files were not migrated into PostgreSQL or deleted.

## Verification

```powershell
npm.cmd test
npm.cmd run build
cd backend
mvn test
```

Tests cover role/ownership restrictions, existing bookings, registration/approval/activation, private documents, notification failures/retries, service request transitions, duplicate/overlapping capacity, additive schema preservation, database-owned catalogs and production-mode JWT login/refresh/password/device/guest behavior. The React shell/login also have automated render coverage. Browser/device/microphone and screen-reader checks still require manual verification; automated render tests are not a visual audit.

Documentation: [template migration](docs/fpcs-template-migration.md), [healthcare workflows](docs/service-platform.md), [PostgreSQL setup](docs/postgres-local-data.md).

For local-only startup and the optional cloud profile boundary, see [local-first startup](docs/local-startup.md). Standard IDE/Maven startup uses backend 9090 with Vite 3000; the paired launchers explicitly use 9092/3012.

Stage 1 improvements (role-aware routes, account-page restoration, session cleanup, network recovery and logout feedback) are tracked in [the staged improvement plan](docs/improvement-plan.md).

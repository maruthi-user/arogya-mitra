# FPCS template migration

Source: `C:/Users/Maruthi Yenumula/Desktop/fpcs-app-template`, version 2.3.0. The source template was read and copied; it was not modified. This integration uses its React layout and backend identity infrastructure, with healthcare-specific adapters. It does not include the template's example Tickets module.

## What changed

- React/Vite is the application entry point (`frontend/src/react-app/main.jsx`). `frontend/src/layout` contains the FPCS reusable shell, auth presentation, account/devices UI, controls and state utilities. Application-specific role navigation, branding and adapters are in `src/react-app`.
- Patient/provider/admin workflow factories remain active in `src/pages`, `src/features` and `src/app/bootstrap.js`. A single React host owns their DOM, isolates their CSS, routes their navigation into Wouter and reflects server-owned session state into Redux. This is a compatibility bridge, not a claim that every existing page has been converted to React components. It preserves registration, appointment and service-request behavior while adopting the template foundation.
- Existing healthcare pages no longer render a second header/sidebar inside the React shell. Page headings/back actions are retained. Provider/admin sign-in uses the template LoginScreen; existing registration and activation forms retain their workflows. Account/device/password screens use the template components. Navigation is role-filtered and nonclinical businesses do not receive legacy practitioner schedule links.
- The template's backend modules are under `in.arogyamitra.platform`: JPA identity, JWT, rotating refresh tokens, device sessions, rate limits, permissions, users, audit, optional files/help/email/reset SPI. The template email/password-reset modules are disabled because the healthcare outbox and one-use provider activation/reset flow remain authoritative. File SPI is available but application evidence remains private in its existing module.
- Patient, provider/pharmacy catalog and appointment records use JPA entities/repositories against the existing tables. Specialized service/capacity/outbox SQL is retained and parameterized. Existing transactions and pessimistic locking remain; overlapping service requests and legacy appointments continue to reserve shared capacity.
- Production `/api/auth/login` verifies the submitted password against the canonical BCrypt hash and uses FPCS authentication to issue HttpOnly JWT access/refresh cookies. It checks the requested healthcare role and active/suspended state as well. The template `/api/v1/auth` APIs provide refresh, profile, password change and devices. Generic template identities without a corresponding healthcare account cannot acquire organisation/patient access.
- Passwordless patients keep scoped server guest sessions. Entering guest mode clears/revokes current account cookies. CSRF protection remains for all state changes; the readable `XSRF-TOKEN` cookie and `X-XSRF-TOKEN` header allow both frontend clients to use the same CSRF session. No access/refresh token is stored in localStorage.
- `app.auth.legacy-session-enabled=false` is the production default. Existing tests opt into legacy authentication sessions where their MockMvc fixtures require them; a separate JWT-only test explicitly turns that compatibility off and checks the production behavior.
- Healthcare admin audit now includes template authentication/session/password security events. Role mapping requires agreement between healthcare and platform roles, preventing a template profile/role edit from silently granting another healthcare identity.

## Data migration and local secrets

Before migration, `.tools/arighya-before-fpcs.dump` was created with pg_dump. This is an ignored local database backup and may contain sensitive records. Restrict access; do not commit or share it.

Flyway history on the local PostgreSQL database now includes baseline 0, V1 healthcare schema, V2 FPCS core, V3 device sessions and V4 account migration. Existing account IDs, usernames, BCrypt hashes and organisation IDs were preserved; no existing password was changed. Before/after checks verified equality of domain record counts, aggregated account hashes and service documents.

The project owner's current accounts were already renamed (for example `pharmacy` and `maruthi`) before this migration. The historical sample credential handoff no longer authenticated them. The migration did not reset them. A separate, temporary verification identity was used to test the live PostgreSQL JWT login/profile/own-organisation/device/refresh/logout flow, and then removed along with its sessions. Its audit trail can remain as verification evidence.

JWT signing is configured through `JWT_SECRET_KEY` or the ignored `backend/config/local-jwt.properties`. The generated local key is not in source control. Keep it stable across local restarts. Production must supply its own protected key and HTTPS secure-cookie configuration. Never use a repository-shipped placeholder signing key.

## Operating the migrated application

`start-postgres.cmd` starts the backend on 9092. `start-postgres-frontend.cmd` starts Vite on 3012 with its `/api` proxy pointing at 9092. Restart previously running processes to use the new entry point. Default `npm start` also uses Vite; it no longer uses the old dependency-free server. The old server/build scripts are retained only for compatibility tests and `build:legacy`, not as the production React build.

The JWT refresh cookie is scoped to `/api` so both the healthcare compatibility auth and template auth endpoints can clear or rotate it. The backend keeps a server CSRF session even for JWT clients; only authentication is JWT-based. Generic bearer-token clients also need this application's CSRF contract for unsafe methods, except explicitly public login/reset endpoints.

The local running verification session keeps SMTP scheduling disabled. Existing queued notifications were retained; no real email delivery, ambulance dispatch, inventory-feed, payment or clinical registry integration was added.

## Verification and boundaries

Backend regression tests include existing healthcare workflows plus JWT-only authentication, HttpOnly cookie issuance, device listing, refresh, password change, old-password rejection, guest isolation and logout. React tests render the template shell and provider/admin login in both languages; existing native workflow tests remain. The Vite production build uses split vendor/login/account chunks and disables source maps.

Desktop/browser access was unavailable in this session; no manual visual, accessibility or real-microphone audit is claimed. The healthcare pages are intentionally preserved behind a React compatibility host; further JSX rewrites can be done page-by-page without changing the API or database. Some template account/navigation utility labels remain in English; healthcare content, navigation and login labels retain Telugu/English support.

Final verification: 18 frontend tests passed, 15 backend tests passed, and the split Vite production build succeeded without chunk-size warnings. Live PostgreSQL JWT verification passed using a temporary identity that was removed afterward. Before/after database checks confirmed unchanged domain counts, existing BCrypt hashes and service documents across migration. The React compatibility host also has a teardown regression test for development reloads.

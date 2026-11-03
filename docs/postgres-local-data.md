# PostgreSQL local data and accounts

The application now defaults to the `postgres` profile and the configured database `arighya_db` at localhost:5432. The existing PostgreSQL profile uses username `postgres` and the supplied development password through `DB_PASSWORD` (the existing default is `admin`). `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` remain overridable. H2 files were not deleted or migrated; use `SPRING_PROFILES_ACTIVE=h2` to select the base H2 configuration explicitly.

## Local URLs and restart

Existing applications were already listening on ports 3000 and 9090, so this PostgreSQL session uses:

- Frontend: http://localhost:3012
- Backend: http://127.0.0.1:9092
- Database: `arighya_db`

To restart after stopping these sessions, open two terminals at the repository root:

```powershell
.\start-postgres.cmd
```

```powershell
.\start-postgres-frontend.cmd
```

The sample accounts are persistent. Normal restarts do not require the sample-data profile or bootstrap passwords. The launchers do not reset accounts or insert example data again. Free ports 3012/9092 before restarting; do not stop unrelated processes. The original `npm start` / default backend ports remain configurable.

## Backend-owned reference catalogs

`GET /api/reference-data` reads active rows from PostgreSQL's `reference_catalog` table. Categories include villages/towns, medicines, symptom navigation, emergency keywords, service kinds and business types with their allowed services. The frontend's `services/reference-catalog.js` is only an initially empty API-response cache. There is no embedded village/medicine/service catalog or invented distance table, and no offline example-data fallback.

`backend/src/main/resources/reference-catalog.json` supplies initial lookup values for new databases. Missing IDs are inserted once; existing database documents, ordering and active flags are preserved. Backend validation uses the same database catalog. Editing a database label is visible on frontend refresh; a disabled location/medicine cannot be newly selected through the corresponding validated API. These are reference categories, not clinical diagnoses or prescribing rules. Static UI translations and request-state labels remain application code.

Example query (edit only the intended lookup record):

```sql
SELECT category, ref_id, document, active
FROM reference_catalog
ORDER BY category, display_order;
```

There is no general-purpose lookup administration screen yet. Existing records can retain an old location ID even if it is later disabled; migrate affected records deliberately before removing coverage locations.

## Explicit example-data setup

The user-requested local setup created:

- One admin: `local.admin`.
- Six active providers: `sample.doctor`, `sample.hospital`, `sample.clinic`, `sample.pharmacy`, `sample.laboratory`, `sample.ambulance`.
- Six example approved provider applications and 16 example approved services.
- Two example patient records and one example pharmacy stock directory.
- One local workflow-verification guest/request, subsequently cancelled. The patient phone in this verification record is placeholder test input, not a contact for real care.

These are labelled example records persisted in the database, not real verified healthcare listings. Provider phone numbers are intentionally empty. Patient browsing remains passwordless; example patient rows are not login accounts.

Passwords were randomly generated, stored only as BCrypt hashes in PostgreSQL, and supplied to the user in chat. The ignored local file `.tools/local-db-credentials.json` is the development credential handoff copy; do not commit or share it. The database contains password hashes, not recoverable plaintext passwords.

`LocalSampleData` runs only with the explicit `sample-data` profile and requires `SAMPLE_PROVIDER_PASSWORD`. It creates only missing example records, does not reset existing passwords and rejects username collisions with a different subject. Default startup does not insert sample accounts. Admin initialization uses the existing one-time `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` mechanism. Sample seeding does not send registration/activation emails or verify professional documents.

For this local verification session, notification scheduling was disabled, so SMTP delivery was not tested and queued notifications remain visible to the admin. Set `APP_NOTIFICATIONS_SCHEDULING=true` with Mailpit or configured SMTP if email delivery is needed.

## Verification

Live checks against PostgreSQL, through the frontend API proxy, verified the admin and all six provider logins, 16 public services, own-organisation provider views, and patient pending → provider accepted → patient cancelled with admin audit history. Automated tests additionally verify that database-added villages and medicines appear in the API and pass server validation; disabling a location removes it from reference responses and rejects new profile updates to it.

Desktop/browser access approval timed out, so a visual inspection of the live interface could not be completed. The interface has automated render/workflow coverage and a successful frontend build, but this is not a manual browser-layout verification.

Final regression results: 16 frontend tests passed; 14 backend tests passed; frontend build succeeded. The backend was restarted with the normal `postgres` profile (without sample-data seeding), and the persisted service catalog and admin login were verified again through the frontend proxy.

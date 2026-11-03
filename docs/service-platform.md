# Village and town service platform

This extension keeps the native JavaScript / Spring Boot / JDBC stack, session and CSRF authentication, guest patients, existing appointments, password activation, email outbox and operational records. Nothing has been deployed.

## Working interfaces

- Public landing → **Browse services without registration**: approved, enabled services from activated, unsuspended organisations. Search by English/Telugu title, organisation, description, location and service kind. Availability and listed fees come from the backend. Requesting creates a guest session if necessary; save name/phone in Profile before submission.
- Patient → **All services** and **Service requests**: home visits, hospital/clinic OP, medicine requests, medicine delivery, lab tests, home check-ups and ambulance assistance. Forms collect coverage location, start slot, callback/service preference, address where needed, and medicine/test/transport details. Request history includes status, reference and timeline. Emergency calling remains separate.
- Provider registration: practitioner, hospital, clinic, pharmacy, laboratory or ambulance operator; business address and 1–3 supporting documents. Legacy API applications without the new businessType field remain compatible. Admin approval queues the existing activation email.
- Provider → **My services**: business-specific service types, bilingual names, description, price, coverage, daily slots, duration, shared resource, capacity and availability. New services and material edits return to admin review. Existing open requests prevent material edits; availability can be paused without changing their reservations. Pharmacy, laboratory and ambulance sign-in opens this workspace rather than the legacy practitioner dashboard.
- Provider → **Service requests**: own organisation only; accept/decline, start at the scheduled time, complete, cancel, call the customer and inspect the timeline. Staff share the organisation subject ID and cannot access another organisation's records.
- Admin → **Applications**: inspect/download private supporting documents, approve/reject with instructions/reasons. **Services**: review/edit service submissions. **Organisations**: suspend/reactivate an organisation and its accounts, invite staff through one-use setup emails. **Service requests**: inspect operations and cancel with a reason; admins cannot accept on an operator's behalf. Existing notifications/retry/audit interfaces include platform events.

## Request rules

`pending → accepted → in_progress → completed`

`pending → rejected | cancelled | expired`

`accepted → cancelled`; `in_progress → cancelled` by the provider/admin.

Only the assigned provider/staff may accept. Patients may cancel their own pending/accepted requests. Admin may cancel open requests but cannot mark a service accepted, started or completed. Decline/cancellation requires a reason. Terminal requests cannot reopen. Acceptance is the first confirmation; ambulance acceptance records an operator decision, not GPS dispatch or a dispatch-system integration.

New requests reserve capacity while pending, for at most 30 minutes or until their scheduled start, whichever comes first. Dates are India time, today through 30 days ahead. Starts must be in the service schedule and future. A resource is a team, vehicle, counter or room identifier within one organisation. Services using the same identifier must share capacity. Duration is 15–480 minutes (default 30), and slots must finish by midnight. Overlapping reservations count against resource capacity. Counting all overlapping reservations is deliberately conservative and may reject a long slot even if shorter reservations do not overlap each other. Different resources can operate independently.

Provider-row locks serialize creation and transitions across application instances. Duplicate open requests for the same patient/service/date/start are rejected. Legacy appointments reserve 30 minutes and conservatively conflict with all resources in the organisation; both old booking creation and old availability account for the new requests. No other patient's details are exposed in availability responses.

Fees are listed amounts captured when requested. There is no payment, quote-negotiation or billing integration. Callback requests also reserve a slot and must be accepted; they are not a guarantee of immediate contact.

## Additive database upgrade and configuration

`backend/src/main/resources/schema.sql` adds:

- `accounts.suspended` (default false).
- `application_documents`: private base64 document content and metadata.
- `care_services`: organisation, review state, enabled flag and service document.
- `care_requests`: ownership, date/start, state, expiry and request snapshot/timeline.
- Indexes for document ownership, organisation services and request capacity.

The existing startup SQL initializer applies these idempotent statements to the configured H2 or PostgreSQL database. Existing provider, pharmacy, patient and appointment records are retained; no operational records are seeded, deleted or automatically republished. Existing organisations default to practitioner for the new service editor. An integration test reapplies the schema over populated tables and verifies stored requests remain unchanged. H2 is tested; PostgreSQL execution has not been verified in this environment. Back up persistent databases before upgrading. For production, adopt a versioned migration process and test the restore procedure.

No new runtime dependency or secret is needed. Use existing `FRONTEND_URL`, admin bootstrap, SMTP and optional DB settings. Start from the documented backend working directory so H2 continues to use the same data file. The location reference list now includes `town` (Nearby town); replace its display name with the actual local town before rollout. It is a configured location, not geocoding.

Uploads are optional for legacy clients and required for new business applications, with at most three PDF/PNG/JPEG files of 1 MiB each. Name, size, base64 encoding and basic file signatures are validated. Download is admin-only, attachment-only and `no-store`, and content is excluded from public APIs. This is not malware scanning or official credential verification. The existing DB/backups contain patient and document data and require restricted filesystem access, retention policies and backup protection.

Suspension invalidates current sessions and unused setup tokens for all organisation accounts, hides public services and blocks password-reset reactivation while suspended. Reactivation restores eligibility; it does not set passwords or activate previously unactivated accounts. Staff invitation is admin-controlled; there is no self-service staff privilege escalation.

## API additions (all under /api)

| Method | Route | Access / purpose |
|---|---|---|
| GET | `/care/services` | Public approved catalog; optional village/kind/query |
| GET | `/care/services?managed=true` | Own organisation / admin review list |
| POST / PATCH | `/care/services`, `/care/services/{id}` | Own organisation/admin service submission |
| POST | `/care/services/{id}/review` | Admin decision and reason |
| GET | `/care/services/{id}/availability?date=YYYY-MM-DD` | Public remaining capacity, no patient data |
| PATCH | `/care/services/{id}/availability` | Own organisation/admin enabled and available flags |
| GET / POST | `/care/requests` | Scoped history / guest patient request |
| PATCH | `/care/requests/{id}` | Allowed status + optional/required note |
| GET | `/care/organisations` | Admin accounts and organisation identities |
| PATCH | `/care/organisations/{providerId}` | Admin suspension/reactivation with reason |
| POST | `/care/staff` | Admin invitation into an active organisation |
| GET | `/admin/applications/{id}/documents` | Admin private document metadata |
| GET | `/admin/documents/{id}` | Admin private attachment download |

Mutations use the existing session CSRF contract. Provider and patient IDs are derived from the authenticated session. Service/request edits whitelist fields; submitted ownership/status/approval cannot override server decisions. Email notifications use the existing transactional outbox, including service review, new requests, staff invitations and request-state updates. Patients currently track status in-app; SMS, WhatsApp and patient email delivery are not connected.

## Verification and remaining boundaries

Run `npm.cmd test`, `npm.cmd run build` and `mvn test` from backend (JDK 17+). Frontend tests cover public discovery, guest submission, bilingual rendering, business-specific controls, permission navigation and changing organisation sessions. Backend tests exercise every business type and service kind, private documents, approval/activation, acceptance, fulfilment, forged ownership, staff restrictions, suspension, pending expiry, duplicate submissions, simultaneous capacity competition, overlapping durations, legacy booking conflicts and schema preservation. Existing booking/auth/email tests remain in the suite.

The application implements service coordination, not clinical diagnosis or prescribing. Medicine availability, prescriptions, lab preparation/results, sample transport, delivery fulfilment and ambulance operations require provider handling. No official licensing registry, external inventory feed, courier/GPS dispatch, payment gateway, lab-results integration or conversational AI is connected. Document scanning/encryption infrastructure, guest cross-device recovery, arbitrary location administration, calendar exceptions/holidays and travel-time routing are not implemented. Schedules are recurring daily start slots; the system does not calculate travel time between visits. Business-specific requests share an explicit common lifecycle rather than claiming physical delivery or dispatch telemetry.

Browser automation was unavailable during implementation. Automated rendering/interaction tests and the frontend build pass, but manual mobile/desktop layout, keyboard/screen-reader and real microphone checks still need to be performed. No independent security/load/accessibility audit or production deployment was performed.

Latest verification: 15 frontend tests passed; 13 backend tests passed (4 platform integration tests, 7 existing domain tests, 2 existing security workflow tests); frontend production build succeeded; `git diff --check` passed. Backend tests used isolated in-memory H2 databases and mocked SMTP, not the user's persistent database or real delivery inboxes.

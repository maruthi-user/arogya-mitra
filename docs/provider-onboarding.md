# Provider onboarding update

> Registration now requires admin approval and a temporary-password change. See [Provider registration and admin approval](provider-registration-approval.md). This supersedes the earlier signup/activation steps below.

Implemented locally; no deployment or live database migration was performed.

## Provider journey

1. Register with full name, email, mobile and Terms/Privacy acceptance.
2. Verify email and set a password using the existing 24-hour, one-use link. Password limits and token hashing are unchanged. Login presents an email field; existing username credentials remain accepted for compatibility.
3. Open Overview → Business Profile. Save a draft containing business type, name, address, village/town, clinical qualification where relevant, license/registration ID and private supporting evidence.
4. Add Services. The editor has Service details, Coverage & schedule and Review steps, a patient preview, draft saving and an explicit review confirmation. Records include service kind, English/Telugu titles, description, optional fee, travel/delivery fee, resource identifier, capacity, duration, delivery mode, available days, slots and coverage. Test/medicine/vehicle notes are shown for relevant kinds.
5. Submit the saved business profile for review after creating at least one service. Submit each service for its own review. Admins use Business reviews and Services. Decisions require a reason; rejected records can be corrected and resubmitted.

Provider navigation includes Overview, Business Profile, Services, Requests, Availability, Notifications and Settings. Existing hospital appointments and team management remain available where supported. Availability pauses are immediate; content/schedule edits require renewed service review.

## API and persistence

- `POST /api/auth/register`: the contact-only payload creates an inactive provider account and a private draft business, then queues verification/password setup email. No business document is required at signup. The earlier application payload remains supported for existing integrations and retains its original admin approval flow.
- `GET /api/onboarding/businesses/{providerId}`: organisation-scoped private profile.
- `PUT /api/onboarding/businesses/{providerId}`: save profile/evidence as draft.
- `POST /api/onboarding/businesses/{providerId}/submit`: validate and submit saved details.
- `GET /api/onboarding/businesses`: admin review queue.
- `POST /api/onboarding/businesses/{providerId}/review`: admin approval/rejection with reason.
- `GET /api/onboarding/businesses/{providerId}/documents/{documentId}`: admin or owning organisation only; verifies the document belongs to that organisation.
- `GET /api/onboarding/notifications`: organisation-scoped activity/review updates.
- Existing `/api/care/services` endpoints accept `draft`, `travelFee`, `deliveryMode`, `availableDays` and `serviceNotes`. Drafts can omit coverage and slots; submission validates them. Only pending services can be reviewed.

Flyway V5 adds `provider_business_profiles`; the fallback schema includes the same additive table. Existing accounts, applications, services, requests and evidence are retained. Existing providers without an onboarding row retain their previous approval treatment. New businesses require an approved, active business AND at least one approved, active service for public provider visibility. Each service/request also checks that service's approval and active status. Editing an approved business returns it to draft and immediately hides its listings until reviewed again. Business edits are blocked while open service requests exist. Changing business type is blocked once services exist.

Availability uses India dates and the selected weekdays. Request snapshots include the base fee plus travel/delivery charges. Business/service edits and review decisions use the existing audit log and mail outbox. All mutations use existing CSRF/session security and ownership checks.

## Verification

- Frontend: 40 tests passed, including bilingual onboarding, wizard state preservation, charge preview and HTML escaping.
- Backend: 18 tests passed across the full existing suite plus the new end-to-end onboarding test. Coverage includes verification, replayed activation rejection, private documents, cross-owner access denial, self-approval denial, drafts, rejection/resubmission, independent business/service approval, fee snapshots and hiding inactive businesses.
- Production frontend build passed.
- The backend tests use isolated H2 databases. PostgreSQL execution and browser screenshot/device verification were not performed here.

## Current boundaries

- The current account model supports one business per provider organisation. Team members share that organisation; there is no new multi-business switcher.
- Qualification/license details and documents are reviewed manually. No official credential registry is connected.
- Email uses the existing outbox/SMTP configuration; delivery requires configured SMTP.
- The signup includes concise Terms/Privacy text and records acceptance time/version. Replace the text with the application's final published policies when available.
- Supporting documents append to existing evidence, preserving earlier submissions. There is no document replacement/removal workflow in this update.
- Advanced shared team/vehicle identifiers remain available. Practitioners can be assigned from active organisation accounts; no separate clinical or fleet directory is introduced.

## Add service reference refinement

The Add service screen now places service type, business, name, description, practitioner, fees, village chips, duration, days and time window together in a compact two-column layout with the patient preview beside it. The form becomes a single column on phones. Additional options retain Telugu title, capacity, delivery mode, exact start times and shared resource controls. Leaving the optional Telugu title blank uses the service name as a fallback.

Practitioner choices come from active provider accounts within the selected organisation. The backend validates ownership and active status, records the server-side display name, and assigns a stable practitioner resource for capacity checks. This is an operational account assignment, not a separate credential-verified practitioner directory.

`timeWindow: {start: "09:00", end: "18:00"}` uses 24-hour India-local times. The backend generates canonical start slots at `durationMinutes` intervals, allowing only visits that finish by the end time. It rejects reversed/invalid/too-short windows and more than 48 generated slots. Client-supplied slots are ignored when a window is supplied. Existing records with irregular exact slots retain that schedule mode when edited. The JSON document storage holds these additive fields; no additional SQL migration is needed.

New request snapshots include the assigned practitioner and total fee. Deactivating an assigned provider prevents the service from receiving new requests. Existing pending/approval and ownership rules continue to apply.

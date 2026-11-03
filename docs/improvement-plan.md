# Improvement plan — staged delivery

## Stage 1: local workflow stability (implemented)

Scope: stabilise the existing feature set for every role before adding new service operations. No production deployment, user credential reset or data migration is part of this stage.

Completed:

- One shared screen-access policy for the React shell and healthcare host. Public pages remain accessible; patient/provider/admin-only screens enforce the correct role. Authenticated users see an explicit access-denied page instead of being sent to another role's login. Backend permissions remain authoritative.
- Pharmacy/laboratory/ambulance operators are routed to service management rather than legacy practitioner appointment/schedule pages, including direct URLs.
- Explicit role-aware login, registration, password-setup, account and not-found routes. Authenticated account pages restore after a browser refresh; expired or unauthorised sessions cannot keep the account panel visible.
- URL query parameters allow only navigation IDs/categories. Passwords, contact details, addresses and request-form text are not serialised into URLs.
- Logout waits for server confirmation; failures produce an accessible error instead of silently doing nothing. A successful logout clears local healthcare and template caches without depending on a second successful network request.
- Session expiry clears patient/provider/admin records, private document panels and role identifiers, invalidates in-flight refreshes, and returns to role selection with a sign-in notice.
- Authenticated session responses include the healthcare account ID. Frontend caches distinguish staff accounts within the same organisation as well as different organisations. Anonymous access exposes no account ID.
- Bounded CSRF and API timeouts, friendly connectivity/routing errors, JSON and 204 handling, a single shared refresh for concurrent expired requests and at most one retry. A retried request's real validation/permission/capacity error is preserved. Refresh outages are treated as connectivity/server errors rather than falsely expiring the session. Permission-denied mutations are not automatically replayed.
- Persistent connection feedback/retry, accessible loading states, a React load-error boundary and corrected Telugu login text.
- Automated policy, HTTP-client, private-cache and mounted React tests. DOM tests verify actual account-page restoration, patient access denial with the guest session retained, and removal of the account view after expiry. These tests use simulated APIs and do not modify the PostgreSQL application database.

Role outcomes:

| Role | Stage 1 outcome |
|---|---|
| Patient | Public browsing remains available; privileged links explain denial; guest data is cleared on expiry; booking conflicts and outages show their correct errors. |
| Practitioner | Practitioner routes remain available; account/device pages survive reload; session recovery is bounded and permission-safe. |
| Hospital/clinic | Existing organisation workflows and booking APIs remain intact; route and network behaviour is consistent. |
| Pharmacy/laboratory/ambulance | Direct and sidebar routes use the business service workspace; practitioner-only screens redirect appropriately. |
| Organisation staff | Same-organisation account changes invalidate person-specific template caches; server ownership checks remain unchanged. |
| Admin | Admin routes remain role-restricted; account pages restore; administrative records and document panels are cleared on session changes/expiry. |

Manual device, screen-reader, microphone and visual-layout testing remains outstanding. DOM tests establish behavior, not pixel layout or real-browser compatibility. Restart the backend to pick up the additive session-response field; no SQL migration is required.

## Stage 2: patient and core UX (next)

- Improve home/service discovery, location preference, filters and provider details.
- Tailor each service-request form; improve patient-facing timelines and instructions.
- Convert preserved healthcare pages to reusable React components progressively.
- Complete remaining English-only template utility labels and validate real mobile layouts.

## Stage 3: administration and staff permissions

- Reference-data management screens for villages/towns, medicines and service categories.
- Application correction requests and review history.
- Job-specific staff permissions and individual staff-account controls.
- Unified operational follow-up for unresolved/expired requests.

## Stage 4: business-specific operations

- Practitioner calendar exceptions and travel buffers.
- Hospital/clinic departments, practitioners, rooms and reception queues.
- Pharmacy stock quantities, review, quotes and collection/delivery states.
- Laboratory collection assignments and secure report workflows.
- Ambulance vehicle assignment and explicit transport states; no simulated dispatch/GPS.

## Stage 5: recovery and communication

- Secure guest request recovery and identity checks for private reports.
- Notification preferences and delivery reliability.
- Additional communication channels only when a real integration is configured.

## Stage 6: cloud readiness

- Environment configuration, HTTPS and secret management.
- Backups/restore tests, monitoring and deployment procedures.
- Staging workflow, security, accessibility and operational checks before deployment.

Stages 2–6 are not claimed as implemented by this delivery. The existing functional boundaries (no automatic diagnosis/prescribing, no external inventory or dispatch integration, no guest recovery) remain explicit.

Stage 1 verification: **33 frontend tests passed**, including mounted React account/expiry tests; **16 backend tests passed**; production frontend build and `git diff --check` passed. Backend tests used isolated test databases. No application database records or credentials were changed, and no SQL migration or deployment was performed. `jsdom` was added as a development-only dependency for lifecycle coverage.

### Stage 2 progress: patient discovery and request clarity

Implemented in this increment:

- Public service discovery combines backend service/location/category data with text, coverage, category and accepting-requests filters, fee/name sorting, result counts and a clear-filters recovery action.
- Service cards show configured duration and daily start times. These are explicitly distinguished from date-specific remaining capacity; the request API remains authoritative.
- Request forms preserve location, callback choice, address and notes in memory when checking a different date. They require an explicit time selection after each availability check. Drafts are cleared on account/session changes and are not written to URLs or local storage.
- Request histories explain pending, accepted callback, accepted service, ambulance, expired, declined, cancelled and completed states in Telugu/English. Operator acceptance is not presented as dispatch tracking or vehicle assignment.
- Missing provider phone numbers no longer produce empty telephone links.

Verification: all **37 frontend tests passed**, including four new tests covering combined discovery filters, immutable sorting, empty-state recovery, date-change draft preservation and status guidance. The Vite production build passed. Existing frontend patient/provider/admin and session tests passed. Tests use simulated API responses; this increment did not modify backend code, database records, credentials or migrations. No production deployment occurred.

Stage 2 remains in progress: React conversion of healthcare pages, fuller service-specific structured forms and pre-submit review, dedicated provider detail pages, home-page redesign, remaining template translations and real-device/accessibility validation are still outstanding. The earlier 16 backend test results apply to Stage 1; backend tests were not rerun for this frontend-only increment.

### Role workspace increment

Implemented:

- Provider/admin service dashboard with real scoped service and request counts; pending requests have a dedicated module.
- Services use a responsive table with organisation initials, approval-status tabs, search and eight-row pagination. Add/Edit opens the existing validated bilingual service form; Close hides it. Provider submissions and edits still require admin approval before public visibility.
- Fee may be omitted: backend persists `feeOnRequest` separately from its numeric fee snapshot and the service/request UI shows “Fee on request”. Existing fees remain unchanged. No SQL migration is needed (additive JSON fields).
- Patient sidebar includes hospitals, clinics, laboratories and medical shops, filtered by the backend business type. Booking forms include patient name/phone; these are validated and saved to the authenticated guest's own profile before a request is created. Contact details are retained when changing the date.
- Provider user management lists organisation accounts and sends activation invitations through the existing outbox. Backend ignores no ownership checks: cross-organisation invitations are rejected and list responses are scoped, without credentials. Current provider staff share organisation permissions; job-specific invitation restrictions/account controls are still pending.
- Admin provider applications have Pending/All tabs and Add Provider opens the existing registration/document workflow. It does not bypass review or activation. Existing document review and suspension screens remain available.
- Hospital-only legacy appointment link is hidden for other business types in the React sidebar. Existing clinic/practitioner APIs are preserved. Generic service requests remain available to each permitted business.
- Shared dashboard cards, table spacing, avatars, status tabs, focus outlines and 44px button targets; layout uses the existing template shell. This is an incremental UI update, not a claim of a fully redesigned application.
- Guest history explains session scope and loss of recovery after expiry/cookie deletion. Verified cross-device recovery is not implemented; telephone numbers alone do not grant access.

Validation: **38 frontend tests, 17 backend tests passed**, production Vite build passed. Backend tests use isolated test databases. No production deployment or application credential reset. Restart the local backend for the optional-fee and staff-list/invitation changes.

Outstanding from the requested design: verified patient recovery; custom-name automatic translation (category labels already bilingual); richer provider registration with 24/7/daytime presets and conditional home-care capabilities; dedicated staff roles and account controls; provider-directory pagination; full patient dashboard redesign and real mobile/visual/accessibility checks. Provider registration retains the existing required contact, documents and review requirements. No external translation, OTP, dispatch, diagnosis or prescribing integration is simulated.

### Desktop layout and data-source cleanup

- Reworked hosted desktop pages with a consistent content width, page headings, compact table rows, approval tabs, filter toolbar, form grid, coverage checkboxes, metric cards and responsive service cards. Added dark-mode and reduced-motion overrides; the React shell still owns navigation.
- Removed the hardcoded example daily start times and village fallback. New services require entered schedules and explicitly selected coverage from backend reference data.
- Removed the optional `LocalSampleData` startup generator and its password configuration. Existing database records and account credentials were not deleted or changed. Previously seeded examples can still exist in PostgreSQL; this change prevents generating more, rather than silently deleting stored records.
- Production operational lists continue to use API data; reference labels come from `/api/reference-data`. Translations, field labels, icons, validation limits and UI defaults are presentation/configuration, not fabricated records. Test fixtures remain isolated to tests.
- Browser access host was unavailable, so no live desktop screenshot or pixel-layout verification was possible. Automated rendering/workflow tests and the Vite build passed; real-device/visual review remains outstanding.

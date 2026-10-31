# Frontend

Run npm.cmd start, npm.cmd test and npm.cmd run build from this folder or the root. Native JavaScript modules require no runtime npm dependencies.

## Product interfaces

- Landing: three branded role cards, language selection and emergency-call access.
- Patient: no login, server-owned guest session, provider discovery, real slot availability, appointments, pharmacy inquiries, profile/contact details and voice/text search.
- Provider: branded split login/registration pages, application review, activation/password recovery, dashboard, appointment table/cards, schedule and profile.
- Admin: authenticated dashboard, application review dialogs, notification delivery/retry, pharmacy inventory management, medicine inquiries and audit history.

Layouts expand across desktops/large monitors, use side navigation on larger screens, and collapse to touch-friendly controls and cards on small screens. The supplied PNG logo is reused unchanged. No invented clinical statistics, doctors, portraits or inventory are displayed.

## Modules

src/app handles startup, routing, session state and event dispatch. src/pages contains render factories grouped by role. src/components contains generic controls; domain components and actions live under src/features. All operational data uses src/services/api; no demo adapter remains.

The HTTP client includes session cookies, obtains a CSRF token before mutations, rotates its token cache after authentication changes, and surfaces backend errors. The development server proxies /api to the configured local backend. Requests from unrelated origins are rejected by that proxy.

API_BASE_URL is public build-time routing configuration; it must never contain credentials. Builds default to /api, not a simulated data source. Static deployments need an actual backend/reverse proxy.

## Components and safety

Button, Input, Select, Avatar and ordinary table cells escape text. Card body slots, layout body slots and custom table renderers accept trusted application-generated HTML only. Escape user-controlled strings in custom renderers. ReviewDialog displays submitted details, supports Edit/Cancel, native focus handling and mandatory review reasons.

Search/filter/pagination components are presentational. Pages own querying state. Appointment availability comes from the server and does not rely on visibility of other patients' private records. Voice command routing currently matches keywords; it does not diagnose conditions.

## Verification

Frontend tests run the real ESM modules with a minimal DOM and API fixture. Node supplies an experimental VM-module warning for this test harness. These tests cover role entry, login forms, backend-backed booking actions, CSRF headers, authorization navigation, offline retry, multilingual page rendering, safe text and packaging. They do not establish real-device layout, screen-reader quality, native-dialog focus or microphone compatibility; those require manual browser checks.

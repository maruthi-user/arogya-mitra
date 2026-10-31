# Current architecture

The application uses one responsive native-module frontend and one Spring Boot backend. Operational records always use APIs; localStorage holds preferences only. Test fixtures are excluded from the normal directory and public frontend build.

```text
Page -> feature actions -> session/CSRF HTTP client -> Spring controllers
Controllers -> access checks -> transactional services -> JDBC repositories -> database
Provider review / booking -> transactional email outbox -> SMTP worker -> Mailpit or configured SMTP
```

Backend modules: security (sessions, roles, CSRF, credential-version invalidation), auth (login, guest, bootstrap admin, setup/reset), registration (applications and review), admin (review/inventory/notification/audit endpoints), notification (outbox/delivery), patient, provider, booking, pharmacy, shared persistence and configuration.

Providers are separate from accounts and application submissions. Public listings require an activated provider account. Applicant contact/registration fields remain in admin-only application records. Account approval is distinct from professional credential verification.

Patients have no login but receive server-owned guest sessions. Appointment/inquiry reads and actions are scoped to the current principal. Booking form identity claims are ignored. Availability endpoints return reserved/free times without disclosing patient information. Guest session expiry/cookie loss removes access until a future recovery mechanism is implemented.

Frontend pages include landing, patient, provider, auth and admin. Shared UI includes brand/logo, icons, navigation, tables/cards, search, filters, pagination, forms and native review dialogs. Layouts adapt from bottom navigation/cards on phones to side navigation/tables and wider workspaces on desktops.

The supplied image is stored at frontend/public/assets/images/arogya-mitra-logo.png unchanged. Public styles are under frontend/src/styles/application.css. Build output is frontend/dist with API routing configuration; static hosting alone cannot supply server functionality.

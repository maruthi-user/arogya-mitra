# Backend API inventory

> Registration update: see [Provider registration and admin approval](provider-registration-approval.md). New registrations stay inactive until approval and must change their emailed temporary password.

Inspected controller mappings, service authorization and checked-in configuration on 2026-11-03. This is a source-code inventory, not a live-server probe. There are 91 explicit controller method/path definitions: 68 healthcare and compatibility routes, plus 23 platform routes. Two platform password-reset definitions are disabled by default, leaving 89 registered controller routes under the checked-in module defaults. Environment overrides can change module availability. Framework-provided endpoints such as Actuator are not included in these counts.

The default application port is 9090. Paths below are relative to the backend origin. `{id}` always means the relevant resource ID; onboarding `{id}` means the provider/organisation subject ID, while `/api/v1/users/{id}` uses the platform numeric user ID. “Owner” includes the owning organisation or patient, as applicable. Role checks are also performed inside domain services; a permissive URL matcher does not make those APIs public.

## Authentication and account onboarding — 8 routes

Source: `backend/src/main/java/in/arogyamitra/auth/AuthController.java`.

| Method | Path | Use | Access |
|---|---|---|---|
| GET | `/api/auth/csrf` | Obtain the CSRF token and header name for mutations. | Public |
| GET | `/api/auth/session` | Return current healthcare identity, role and patient profile; otherwise `anonymous`. | Public, scoped response |
| POST | `/api/auth/guest` | Start a patient guest session without creating a provider account. | Public, throttled |
| POST | `/api/auth/login` | Sign in as provider/admin using identifier, password and requested role. Delegates credential/token handling to platform authentication. | Public, throttled |
| POST | `/api/auth/logout` | Revoke session/refresh access and clear authentication cookies. | Current credentials if present |
| POST | `/api/auth/register` | Register provider contact details and consent, create inactive account/business draft and queue verification/password setup. Earlier full business application payloads still use the legacy approval flow. | Public, throttled |
| POST | `/api/auth/change-initial-password` | Replace the temporary password, clear the first-login requirement and revoke temporary sessions. | Restricted provider session |
| POST | `/api/auth/activate` | Consume the emailed one-use token and set the password, enabling the account. | Valid token, throttled |
| POST | `/api/auth/request-setup` | Request a provider password setup/recovery email. Response does not disclose whether the email exists. | Public, throttled |

Current UI login uses `/api/auth/login`. Provider registration uses the email-link flow, not an initial password field. There is no public admin registration endpoint.

## Business onboarding and review — 7 routes

Source: `provider/BusinessOnboardingService.java` contains both service and controller.

| Method | Path | Use | Access |
|---|---|---|---|
| GET | `/api/onboarding/businesses/{id}` | Load private business details, status, review reason and document metadata. | Owning provider or admin |
| PUT | `/api/onboarding/businesses/{id}` | Save business details/documents as draft. | Owning provider or admin |
| POST | `/api/onboarding/businesses/{id}/submit` | Validate saved business and submit for review; at least one service must exist. | Owning provider or admin |
| GET | `/api/onboarding/businesses` | List onboarding records for admin review, including statuses beyond pending. | Admin |
| POST | `/api/onboarding/businesses/{id}/review` | Approve/reject a pending business with a reason. | Admin |
| GET | `/api/onboarding/businesses/{id}/documents/{document}` | Download evidence after checking organisation and document ownership. | Owning provider or admin |
| GET | `/api/onboarding/notifications` | Show the organisation's audit/activity updates, including business/service review decisions. | Provider |

Business submission is separate from service submission. Editing an approved business returns it to draft and hides its public listings until approved again. Private documents are included in draft saves as base64 PDF/PNG/JPEG payloads; there is no separate onboarding upload route.

## Services, requests, organisations and staff — 13 routes

Source: `care/CareController.java` and `care/CareService.java`.

| Method | Path | Use | Access |
|---|---|---|---|
| GET | `/api/care/services` | Browse approved active services. Filters: `village`, `kind`, `query`. `managed=true` returns private management records. | Public catalog; managed mode requires provider/admin |
| POST | `/api/care/services` | Create a draft or submit a new service. | Provider for own organisation; admin can specify provider |
| PATCH | `/api/care/services/{id}` | Edit/resubmit a service; editing is blocked while it has open requests. | Owning provider or admin |
| POST | `/api/care/services/{id}/review` | Approve/reject a pending service with a reason. | Admin |
| PATCH | `/api/care/services/{id}/availability` | Toggle `available` and `active` without changing service content. | Owning provider or admin |
| GET | `/api/care/services/{id}/availability?date=YYYY-MM-DD` | Return slots and remaining capacity for an approved public service. | Public |
| GET | `/api/care/requests` | List requests: patient's own, provider organisation's own, or all for admin. | Authenticated healthcare user |
| POST | `/api/care/requests` | Send a visit/callback request with date, time, village and relevant address/details. | Patient with saved contact profile |
| PATCH | `/api/care/requests/{id}` | Change request status according to role and current state. | Owning patient/provider or admin, with different allowed transitions |
| GET | `/api/care/organisations` | List provider accounts and organisation identifiers/status. | Admin |
| PATCH | `/api/care/organisations/{id}` | Suspend/reactivate an organisation, with reason; revoke affected credentials/sessions. | Admin |
| GET | `/api/care/staff` | List organisation provider accounts; used for team management and practitioner selection. | Provider sees own organisation; admin sees all |
| POST | `/api/care/staff` | Invite an organisation team member through emailed password setup. | Owning provider or admin; organisation must satisfy activation/public-approval checks |

The Add Service payload supports `kind`, `title`, optional `titleTe`, `description`, `fee`, `travelFee`, `practitionerId`, `resource`, `capacity`, `durationMinutes`, `coverage`, `availableDays`, `deliveryMode`, `active`, `available`, `draft`, optional `serviceNotes`, and either `timeWindow` or exact `slots`. The server checks practitioner ownership, calculates total fee and generates canonical slots when a time window is supplied.

Service approval states are `draft`, `pending`, `approved`, `rejected`. Requests begin as `pending`; providers may accept/reject and progress accepted requests to in-progress/completed. Patients may cancel eligible requests. Admins may cancel eligible requests, but cannot accept on a provider's behalf. Pending requests expire at the earlier of 30 minutes and their scheduled start time. Slot dates are checked within the next 30 days using India time.

Only an approved, active service belonging to an eligible business appears in the public catalog or receives new requests. Assigned practitioners must remain active. Existing providers without a business-onboarding row retain the earlier approval treatment.

## Existing provider/practice APIs — 8 routes

Source: `provider/ProviderController.java`.

| Method | Path | Use | Access |
|---|---|---|---|
| POST | `/api/providers` | Create a clinical provider/practice record directly. | Admin |
| GET | `/api/providers` | Search clinical providers using `village`, `type`, `open`. | Public eligible listings; admin can see private records |
| GET | `/api/providers/{id}` | Read provider/practice profile. | Public eligible provider, owner, or admin |
| GET | `/api/providers/{id}/bookings` | List this practice's older appointment records; optional `status`. | Owning provider or admin |
| GET | `/api/providers/{id}/slots?date=YYYY-MM-DD` | Check older appointment-slot availability. | Same readability rules as provider profile |
| PATCH | `/api/providers/{id}/profile` | Update practice fee, service summary and slots. | Owning provider or admin |
| PATCH | `/api/providers/{id}/schedule` | Update practice appointment slots. | Owning provider or admin |
| PATCH | `/api/providers/{id}/open` | Toggle the practice's open status. | Owning provider or admin |

These practice-level APIs remain alongside the newer per-service catalog. New service-specific work uses `/api/care/services`.

## Patients — 5 routes

Source: `patient/PatientController.java`.

| Method | Path | Use | Access |
|---|---|---|---|
| GET | `/api/patients` | List patient records. | Admin |
| POST | `/api/patients` | Create a patient directly. Normal guest entry uses `/api/auth/guest`. | Admin |
| GET | `/api/patients/{id}` | Read patient profile. | That patient or admin |
| PATCH | `/api/patients/{id}` | Update contact information, village and language/profile fields. | That patient or admin |
| GET | `/api/patients/{id}/bookings` | List patient's older appointments; optional `status`. | That patient or admin |

## Older appointment bookings — 10 routes

Source: `booking/BookingController.java` and `booking/BookingService.java`.

| Method | Path | Use | Access |
|---|---|---|---|
| GET | `/api/bookings` | List appointments with optional `patientId`, `providerId`, `status`; patient/provider scope is forced to their identity. | Authenticated healthcare user |
| POST | `/api/bookings` | Request a provider appointment using the patient's saved identity/contact profile. | Patient |
| GET | `/api/bookings/{id}` | Read appointment details. | Owning patient/provider or admin |
| GET | `/api/bookings/{id}/history` | Read appointment status history. | Owning patient/provider or admin |
| PATCH | `/api/bookings/{id}` | Apply a valid status transition. | Owner/admin, subject to service transition rules |
| POST | `/api/bookings/{id}/accept` | Confirm a pending appointment. | Owning provider |
| POST | `/api/bookings/{id}/reject` | Decline a pending appointment. | Owning provider |
| POST | `/api/bookings/{id}/complete` | Mark a confirmed appointment done. | Owning provider |
| POST | `/api/bookings/{id}/no-show` | Mark an eligible appointment as no-show. | Owning provider |
| POST | `/api/bookings/{id}/cancel` | Cancel an eligible appointment. | Owning patient/provider or admin, subject to transition rules |

These appointments use statuses such as `confirmed`, `declined`, `done`, `no_show`. New care requests use `accepted`, `rejected`, `in_progress`, `completed`. They are separate workflows and their status names should not be mixed.

## Medicine inquiries — 3 routes

Source: `pharmacy/MedicineRequestController.java`.

| Method | Path | Use | Access |
|---|---|---|---|
| POST | `/api/medicine-requests` | Ask about a catalog medicine at a pharmacy; creates status `requested`. | Patient |
| GET | `/api/medicine-requests` | List own inquiries; admin sees all. Providers do not receive organisation-scoped inquiries through this older API. | Authenticated; result scoped to patient ID or admin |
| PATCH | `/api/medicine-requests/{id}` | Mark inquiry `contacted` or `resolved`. | Admin |

This is an inquiry workflow, separate from pharmacy medicine/delivery services under `/api/care`.

## Admin applications, evidence, mail outbox and audit — 9 routes

Sources: `admin/AdminController.java`, `registration/ApplicationDocuments.java`.

| Method | Path | Use | Access |
|---|---|---|---|
| GET | `/api/admin/applications` | List earlier provider application records. | Admin |
| POST | `/api/admin/applications/{id}/review` | Approve/reject an earlier application; approval creates provider account and queues setup email. | Admin |
| GET | `/api/admin/applications/{id}/documents` | List earlier application's evidence metadata. | Admin |
| GET | `/api/admin/documents/{id}` | Download earlier application evidence. | Admin |
| GET | `/api/admin/notifications` | Inspect email outbox delivery status/attempts. | Admin |
| POST | `/api/admin/notifications/{id}/retry` | Requeue a failed email. | Admin |
| GET | `/api/admin/audit` | Read the latest combined healthcare and platform security audit events. | Admin |
| GET | `/api/admin/pharmacies` | List pharmacy catalog/stock records. | Admin |
| POST | `/api/admin/pharmacies` | Create a pharmacy catalog record. | Admin |

The earlier application review queue is not the same as the new Business reviews queue. The admin notification API is an email outbox, not push or SMS notification delivery.

## Reference catalog and compatibility routes — 4 routes

| Method | Path | Use | Access |
|---|---|---|---|
| GET | `/api/reference-data` | Load villages, medicines, business types, service kinds and other UI reference data. | Public |
| GET | `/api/state` | Load the existing frontend's combined provider/pharmacy/appointment state; records are filtered according to identity. | Public, scoped response |
| PATCH | `/api/entities/{id}/open` | Compatibility route for toggling an organisation/entity open state. | Owning provider or admin |
| PATCH | `/api/pharmacies/{id}/stock` | Update medicine availability in a pharmacy's stock. | Admin |

## Platform authentication and device sessions — 8 routes

Source: `platform/controller/auth/AuthController.java`.

| Method | Path | Use | Access |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Platform login; issue cookies and return user/permissions. | Public |
| POST | `/api/v1/auth/refresh` | Rotate refresh/access tokens for a valid session. | Valid refresh credentials |
| POST | `/api/v1/auth/logout` | Revoke current device session and clear cookies; returns 204. | Current credentials if present |
| GET | `/api/v1/auth/me` | Read current platform user and permissions. | Authenticated platform user |
| POST | `/api/v1/auth/change-password` | Change own password using current password; revoke other devices. | Authenticated platform user |
| GET | `/api/v1/auth/sessions` | List own active devices/sessions. | Authenticated platform user |
| DELETE | `/api/v1/auth/sessions/{id}` | Revoke one of own sessions. | Session owner |
| POST | `/api/v1/auth/sessions/revoke-others` | Sign out all other devices. | Authenticated platform user |

Healthcare login delegates to these underlying platform services. The frontend uses healthcare login plus platform refresh, profile and account/session APIs; the two URL families have different response shapes and should not be treated as interchangeable.

## Platform users — 6 routes

Source: `platform/controller/users/UsersController.java`. With the checked-in role permissions, these are admin operations.

| Method | Path | Use | Permission |
|---|---|---|---|
| GET | `/api/v1/users` | Search users with `q`, `page`, `size`. | `users.view` |
| GET | `/api/v1/users/{id}` | Read one platform user. | `users.view` |
| POST | `/api/v1/users` | Create a platform user with username, email, role and password. | `users.manage` |
| PATCH | `/api/v1/users/{id}` | Update email, role or account status. | `users.manage` |
| POST | `/api/v1/users/{id}/unlock` | Unlock a login-locked account. | `users.manage` |
| POST | `/api/v1/users/{id}/sessions/revoke` | Force sign-out on every device for this user. | `users.manage` |

These are generic account-management APIs, not the provider business-onboarding APIs.

## Platform files, audit and public content — 7 routes

| Method | Path | Use | Access/configuration |
|---|---|---|---|
| POST | `/api/v1/files` | Multipart upload with `ownerType`, `ownerId`, `file`. | `files` module; `files.use` plus record-access checks |
| GET | `/api/v1/files` | List attachments for `ownerType` and `ownerId`. | Same module/permission/ownership checks |
| GET | `/api/v1/files/{id}/download` | Download an attachment. | Same module/permission/ownership checks |
| DELETE | `/api/v1/files/{id}` | Delete an attachment. | `files.use`; uploader or file-manager permission |
| GET | `/api/v1/audit` | Search paginated platform audit by entity, actor, action and time range. | `audit` module and `audit.view` |
| GET | `/api/v1/help-center` | Return static help content. | Public; `help` module |
| GET | `/api/v1/app/config` | Return UI branding, enabled modules, labels, dropdowns and role names. | Public |

The checked-in configuration enables files/audit/help. Generic platform attachments are separate from business/application evidence storage. Owner-specific attachment access checkers determine which records users can attach files to.

## Optional platform password reset — 2 defined routes, disabled by default

Source: `platform/controller/auth/PasswordResetController.java`.

| Method | Path | Intended use |
|---|---|---|
| POST | `/api/v1/auth/forgot-password` | Queue a platform password reset email for an email address. |
| POST | `/api/v1/auth/reset-password` | Consume a platform reset token and save the new password. |

`passwordreset` is false in checked-in `app-config.json`, so this controller is not registered by default. Configuration can be overridden at startup.

A configuration mismatch exists if this module is enabled: SecurityConfiguration excludes these two paths from CSRF checks but does not include them in its public authorization allowlist. They therefore fall under the authenticated `/api/v1/**` rule. Anonymous password recovery through these routes would need that authorization rule corrected. The currently used provider recovery route is `/api/auth/request-setup`, so it is a separate flow.

## Security and calling conventions

- Healthcare mutations use the current session/token identity; patient/provider ownership is enforced server-side.
- CSRF protection applies to most mutations, including healthcare registration/login. Fetch `/api/auth/csrf`, use its returned header name and token, and retain cookies. Do not hardcode a header from a test fixture.
- The three platform routes excluded from CSRF are login, forgot-password and reset-password; exclusion from CSRF does not itself grant anonymous access.
- Browser authentication uses cookies. Token fields in response bodies depend on configuration.
- Most healthcare errors use 400 for validation, 401 for missing/invalid authentication, 403 for role/ownership denial, 404 for missing or nonpublic records and 409 for state/capacity conflicts.
- Platform and healthcare resource IDs are different. Use the `subjectId` for provider business endpoints, not the numeric platform user ID.

No backend code or runtime data was changed for this inspection, and no API mutations were executed.

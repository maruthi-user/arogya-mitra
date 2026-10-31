# Arogya Mitra

Responsive Telugu/English care application with a JavaScript frontend and a Spring Boot backend. Patient guest access, provider registration/review/activation, provider/admin login, appointment workflows, pharmacy inquiries and email notifications use the backend and database. Demo mode and sample-profile selection have been removed from the application.

## Start locally

Prerequisites: Node 18+, JDK 17+, Maven. Use npm instead of npm.cmd outside Windows.

**1. Start the frontend from the repository root:**

```powershell
npm.cmd start
```

Open its printed URL. If port 3000 is occupied, the server chooses another port. The development server proxies /api to http://127.0.0.1:9090. Set BACKEND_URL if your local backend uses another address.

**2. Start local email capture:**

```powershell
cd backend
docker compose up -d mailpit
```

Alternatively run a native Mailpit binary with SMTP bound to 127.0.0.1:1025 and its UI to 127.0.0.1:8025. During this implementation, the official native release was downloaded under .tools/mailpit/ (ignored by Git). Its startup command from the project root is:

```powershell
.\.tools\mailpit\mailpit.exe --smtp 127.0.0.1:1025 --listen 127.0.0.1:8025 --disable-version-check
```

Mailpit captures mail locally; it does not deliver to real inboxes. Open http://localhost:8025 to read acknowledgment, approval/password-setup, rejection and appointment-request emails. Delivery failures remain visible in the admin notification queue.

**3. Create the first admin and start the backend:**

In a new PowerShell terminal, from the root:

```powershell
$env:ADMIN_USERNAME='your-admin-username'
$env:ADMIN_EMAIL='your-admin-email@example.test'
$adminSecret=Read-Host 'Admin password (12-72 characters)' -AsSecureString
$env:ADMIN_PASSWORD=[System.Net.NetworkCredential]::new('', $adminSecret).Password
$env:FRONTEND_URL='http://localhost:3000' # use the actual printed frontend URL
cd backend
mvn spring-boot:run
```

There is no default administrator password. The initial administrator is created once and stored with a BCrypt hash. On subsequent starts, existing administrator credentials remain unchanged; remove ADMIN_PASSWORD from the runtime environment after initial setup. Do not commit passwords or SMTP credentials.

The backend listens on http://127.0.0.1:9090 and stores local H2 data under backend/data/. Always start it from backend/ to retain that path. Existing legacy demo records are preserved but excluded from the operational directory; test fixtures exist only under backend/src/test/resources/.

On Windows, you can also run `.\start-backend.cmd` from the repository root after setting these environment variables. It selects the backend working directory and launches through Maven. Local development needs no cloud account or SSH keys. For stale VS Code dependency errors, see [IDE troubleshooting](backend/README.md#local-startup-and-ide-dependency-errors).

## Use the application

- **Patient:** enter directly without an account. A server-owned guest session scopes appointments and inquiries. Provide name/contact phone when booking. Cookie clearing, session expiry, or switching away from a guest session may remove access; guest recovery is not yet implemented.
- **Provider:** apply with personal/practice/contact details; review before submission. An admin approves or rejects the application. Approved applicants receive a one-use password link, set a password, then sign in and configure schedule/services/fee. Approval is not professional credential verification.
- **Admin:** sign in with the bootstrapped account. Review applications in a confirmation dialog, enter activation instructions or a rejection reason, manage pharmacies/stock, follow inquiries, inspect audit history and retry failed emails.

The directory starts empty. No fabricated providers, inventory, appointments or dashboard metrics are supplied. Village proximity is labelled as such; it is not a calculated road distance. Ambulance assistance is a direct emergency-call action; no dispatch integration is claimed.

## Verify

```powershell
npm.cmd test
npm.cmd run build
cd backend
mvn test
```

Tests use in-memory databases. Security tests cover CSRF, role restrictions, forged IDs, approval/activation, token reuse, password-reset session invalidation, guest booking ownership and notification failure/retry. The live API client supports a full isolated workflow with real SMTP delivery to Mailpit; see [backend testing](backend/README.md).

## Structure

```text
frontend/src/
  app/                 routing, server session state and action wiring
  pages/               landing, patient, provider, auth and admin interfaces
  components/          shared UI, forms, tables, navigation and review dialogs
  features/            account workflows, appointments, provider search and voice
  services/api/        session-aware HTTP client and operational API methods
  styles/              base/component styles and responsive product design
frontend/public/assets/images/arogya-mitra-logo.png
backend/src/main/java/in/arogyamitra/
  security/, auth/, registration/, admin/, notification/
  patient/, provider/, booking/, pharmacy/, shared/, config/
backend/api/           Postman and HTTP examples
backend/scripts/       API verification client
```

## Deployment readiness

The implementation runs locally and has not been deployed or independently security/load/accessibility audited. Publish frontend/dist only after deploying the backend and configuring API routing (prefer a same-origin /api reverse proxy). Set FRONTEND_URL to the public HTTPS URL, configure real SMTP, secure cookies, a production database, backups, monitoring and admin recovery. Static hosting alone cannot run these workflows.

Official professional-registration verification, real ambulance dispatch, guest recovery, external inventory feeds and a conversational AI model are not implemented integrations. See [release requirements](docs/implementation-roadmap.md), [architecture](docs/architecture.md), [frontend](frontend/README.md) and [backend](backend/README.md).

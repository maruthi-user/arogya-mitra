# Local-first startup

The reported `NoClassDefFoundError: software/amazon/awssdk/auth/credentials/AwsCredentials` happened while Spring inspected cloud storage factory methods during local startup. Local and cloud factories are now separate classes. `FileStorageConfiguration` imports only local storage; `CloudFileStorageConfiguration` is gated by the explicit `cloud` profile and SDK class availability. Local runtime starts without AWS jars or credentials.

## Standard local run

Start PostgreSQL locally (`arighya_db`; database settings remain in the postgres profile). Restart `Application.java` from the IDE, or run from the repository root:

```powershell
.\start-backend.cmd
```

This uses port 9090. In another terminal:

```powershell
npm.cmd start
```

Vite uses port 3000 and proxies `/api` to `http://127.0.0.1:9090`. Browser clients keep API requests on the same origin. Vite fails clearly if the requested frontend port is occupied rather than silently choosing a port outside the configured CORS origins. If VS Code still reports old Java dependencies, use **Java: Clean Java Language Server Workspace**, reload and allow Maven import to finish; the imported S3 dependency is already declared in the POM.

## Existing alternate local ports

If other projects use 3000/9090, the existing paired launchers remain supported:

```powershell
.\start-postgres.cmd
```

```powershell
.\start-postgres-frontend.cmd
```

These use backend 9092 and frontend 3012, with matching proxy/CORS settings. Stop the corresponding running instance before starting a second one on the same port. Do not stop unrelated projects.

`BACKEND_URL` can override Vite's proxy target through the shell or `frontend/.env` (see `.env.example`). The React application aliases and Tailwind processing are configured for this project's `src/react-app` entry, not the source template's example app. The production build is `frontend/dist`; source maps stay disabled.

## Storage and later cloud configuration

Current settings: `storage.provider=local`, files under `./data/uploads` relative to the backend process working directory; existing application documents remain in their private database module. No AWS account or access key is required to run locally. No records, password hashes, schema history or JWT signing keys were reset by this fix.

Cloud deployment is not enabled or performed. `application-cloud.properties.example` contains environment-variable placeholders only. Later, copy it to `application-cloud.properties`, configure secrets/HTTPS/database/frontend origins/storage, and explicitly enable `postgres,cloud`. Selecting AWS or DigitalOcean storage without the cloud profile is not a local configuration. Keep cloud credentials outside source control. The current optional SDK dependencies remain declared for compiling the cloud implementation, but local runtime does not load them.

## Verification

All 16 backend tests passed, including a filtered-classloader regression test with AWS SDK classes removed. The complete application was also launched against local PostgreSQL on a temporary port with **every AWS SDK jar excluded**; startup succeeded and `/api/reference-data` returned the database-backed locations. That temporary verification process was stopped. Frontend regression tests and production build were rerun after aligning the local proxy.

# Local development

See the root README for exact startup commands. Start the frontend first and note its printed port. Set FRONTEND_URL in the backend terminal to that URL so activation links open the right app. Start Mailpit, provision the first admin through environment variables, then start Spring Boot from backend/.

The frontend development proxy routes /api to BACKEND_URL (default http://127.0.0.1:9090), preserves cookies and validates browser origins. It works even when the frontend selects a free port other than 3000. Direct cross-origin deployments need explicit CORS/cookie configuration.

Tests: npm.cmd test, then cd backend and mvn clean verify. Run npm.cmd run build for frontend/dist. API_BASE_URL is public build routing configuration; do not store secrets there.

For live verification use backend/scripts/test-api.cjs with --workflow, an isolated test backend/admin and local Mailpit. The implementation was exercised against an isolated in-memory backend and a real local Mailpit SMTP listener.

Manually check 360, 768, 1024, 1440 and 1920 pixel layouts; registration and review dialogs; keyboard focus; browser zoom; and microphone/text fallback. Automated DOM fixtures do not prove visual accessibility or device speech support. The available browser preview service could not connect during this implementation, so real-browser layout verification remains a release check.

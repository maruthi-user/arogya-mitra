// Routes that render outside the app chrome (no TopNav / Sidebar) and are
// reachable without a valid session — login, registration, and the
// account-activation / password-reset links sent by email. Auth-expiry
// handling must never fire on these: someone opening an activation link in a
// browser that still has a stale/expiring token from an unrelated earlier
// session shouldn't get bounced mid-flow. Kept in one place so App.jsx (route
// chrome), AuthExpiryWatcher (session-expiry modal + redirect) and apiSlice
// (401 handling) can't drift out of sync.
export const PUBLIC_PATHS = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/patient-register",
  "/auth/activate-account",
  "/auth/forgot-password",
  "/auth/restore-password",
];

export function isPublicPath(pathname) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

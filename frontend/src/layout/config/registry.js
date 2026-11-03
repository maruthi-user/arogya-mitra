/**
 * Single place where the host application hands its configuration to the
 * layout. Call `configureLayout(...)` once, before rendering (see
 * src/app/configure.js). Every layout component reads from here, so the
 * layout never imports anything from `src/app`.
 *
 * Shape:
 *  brand      { name, shortName, logoSrc?, version? }
 *  paths      { login, home, profile, afterLogin }
 *  apps       launcher catalogue: [{ id, name, shortName, icon, modules: [...] }]
 *  login      content of loginApps.json (per-app login-screen copy + branding)
 *  api        { baseUrl }
 *  auth       { mapUser(profileResponse) -> user, profileUrl, loginUrl, ... }
 *  access     { canAccessApp(user, app) -> bool, canAccessModule(user, module) -> bool }
 *  navbar     { renderActions?: (user) => node, helpPath?: string }   extra navbar items; helpPath shows a (?) button
 *  profileMenu [{ label, path, icon? }]            extra user-menu items
 *  account    Manage Account page: { fields, notice, showApplications, showSessions, allowPasswordChange, minPasswordLength, extraTabs }
 */
const defaults = {
  brand: { name: "My App", shortName: "APP", logoSrc: null, version: "1.0.0" },
  paths: {
    login: "/auth/login",
    home: "/app",
    profile: "/app/profile",
    afterLogin: "/app",
  },
  apps: [],
  login: {},
  api: { baseUrl: "", appConfigUrl: "/api/v1/app/config" },
  auth: {
    identifierField: "username", // request-body key for the login ID
    demo: false, // true = sign in without a backend (any credentials)
    loginUrl: "/api/auth/login",
    forgotPasswordUrl: "/api/auth/forgot-password",
    resetPasswordUrl: "/api/auth/reset-password",
    changePasswordUrl: "/api/auth/change-password",
    profileUrl: "/api/auth/me",
    refreshUrl: "/api/auth/refresh",
    logoutUrl: "/api/auth/logout",
    sessionsUrl: "/api/auth/sessions",
    mapUser: (profile) => profile,
  },
  access: {
    canAccessApp: () => true,
    canAccessModule: () => true,
  },
  navbar: { renderActions: null, helpPath: null },
  profileMenu: [],
  account: {
    // Read-only rows shown on the Manage Account page. `key` is read from the
    // user object in the store (see auth.mapUser); `icon` is a lucide name.
    fields: [
      { label: "Full name", key: "fullName", icon: "User" },
      { label: "Email", key: "email", icon: "Mail" },
      { label: "User ID", key: "id", icon: "Hash" },
      { label: "Role", key: "role", icon: "ShieldCheck" },
    ],
    notice: "", // e.g. "Contact HR to change these details."
    showApplications: true,
    showSessions: true, // "Devices" tab: signed-in sessions, sign out one or all others
    allowPasswordChange: true,
    minPasswordLength: 8,
    extraTabs: [], // [{ key, label, render: (user) => node }]
  },
};

let current = defaults;

const merge = (base, extra = {}) => {
  const out = { ...base };
  for (const key of Object.keys(extra)) {
    const v = extra[key];
    out[key] =
      v && typeof v === "object" && !Array.isArray(v) && typeof v !== "function" &&
      base[key] && typeof base[key] === "object" && !Array.isArray(base[key])
        ? { ...base[key], ...v }
        : v;
  }
  return out;
};

export function configureLayout(config) {
  current = merge(defaults, config);
  return current;
}

export const getLayoutConfig = () => current;

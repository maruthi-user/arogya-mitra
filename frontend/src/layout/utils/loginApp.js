import { getLayoutConfig } from "@layout/config/registry";

/**
 * Resolves which application's login screen to render.
 *
 * Contract: the login route reads `?app=<appId>` (e.g.
 * `/auth/login?app=crm`) and the id is matched against the SAME catalog the
 * app launcher renders from (`src/config/apps.json`) — so the login screen and
 * the launcher can never disagree on an app's name. Everything else the screen
 * shows (subtitle, description, feature list, post-login destination, brand
 * gradient, social-login toggle) comes from `src/config/loginApps.json`, which
 * is the only file another application has to change to reuse this UI.
 *
 * Pure helpers only (no React, no DOM) — safe to unit test and safe to import
 * from anywhere, including a any front end.
 */

const loginData = () => getLayoutConfig().login || {};
const loginApps = () => loginData().applications || {};
const sharedDefaults = () => loginData().defaults || {};

export const LOGIN_PATH = "/auth/login";

export const getDefaultLoginAppId = () =>
  normalizeAppId(loginData().defaultAppId) ||
  normalizeAppId((getLayoutConfig().apps[0] || {}).id) ||
  "app";

/** Ids are matched case-insensitively and without surrounding whitespace. */
export function normalizeAppId(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

/**
 * Reads the app id out of a query string. Accepts either the raw search
 * string from wouter's `useSearch()` ("?app=crm") or a leading "?"-less
 * variant ("app=crm"); anything unparseable resolves to "" (= default app).
 */
export function getAppIdFromSearch(search) {
  if (typeof search !== "string" || !search.trim()) return "";

  const query = search.startsWith("?") ? search.slice(1) : search;

  try {
    return normalizeAppId(new URLSearchParams(query).get("app"));
  } catch {
    return "";
  }
}

/** Catalog metadata (name/icon) for an id, from the launcher's app list. */
function findCatalogApp(appId) {
  const applications = getLayoutConfig().apps || [];
  return (
    applications.find((app) => normalizeAppId(app.id) === appId) || null
  );
}

function mergeTheme(entryTheme) {
  return {
    gradientFrom: "#1a6ff0",
    gradientTo: "#3fa9ff",
    ...(sharedDefaults().theme || {}),
    ...(entryTheme || {}),
  };
}

function mergeSocialLogin(entrySocialLogin) {
  return {
    provider: "google",
    label: "Continue with Google",
    enabled: false,
    ...(sharedDefaults().socialLogin || {}),
    ...(entrySocialLogin || {}),
  };
}

/**
 * Builds the complete, render-ready description of one login screen: catalog
 * defaults merged with that app's entry, plus derived values (page title,
 * `{app}` token in the welcome line, safe fallbacks).
 *
 * An unknown or missing id (typo in the URL, no `?app=` at all, a removed
 * entry) falls back to the default app rather than rendering a half-empty
 * page. Known ids never inherit another app's copy: subtitle/description/
 * features are taken from that app's own entry only.
 */
export function resolveLoginApp(appId) {
  const requestedId = normalizeAppId(appId);
  const isKnown = Boolean(loginApps()[requestedId]);
  const resolvedId = isKnown ? requestedId : getDefaultLoginAppId();

  const entry = loginApps()[resolvedId] || {};
  const catalogApp = findCatalogApp(resolvedId);
  const merged = { ...sharedDefaults(), ...entry };

  // Display name: the entry may override it (e.g. "HR" instead of the
  // catalog's "Human Resources"), otherwise the sidebar/launcher catalogue's
  // name wins so the two surfaces stay in sync.
  const name = merged.name || catalogApp?.name || getLayoutConfig().brand.name;

  // Any copy below may reference the resolved name with a literal "{app}".
  const withAppToken = (value) => String(value || "").replace(/\{app\}/g, name);

  return {
    id: resolvedId,
    name,
    // Icon name from the launcher catalog, rendered as the app's mark on the
    // gradient tile of the compact (phone/tablet) login header.
    icon: catalogApp?.icon || "Boxes",
    title: `${name} Sign In`,
    // Short name shown above the product title ("HR"), when the app has one.
    shortName: merged.shortName || "",
    // Launcher short name ("WS"), used by the phone header as its big title.
    catalogShortName: catalogApp?.shortName || "",
    // Both may reference the project name with a literal "{app}" token.
    subtitle: withAppToken(merged.subtitle),
    description: withAppToken(merged.description),
    features: Array.isArray(merged.features) ? merged.features : [],
    // NEW: the cards drawn in the login illustration (label, icon name,
    // chart type: bars | donut | status | progress, optional status text).
    // Empty -> LoginBrandPanel builds them from `features` instead.
    illustrationCards: Array.isArray(merged.illustrationCards)
      ? merged.illustrationCards
      : [],
    showDescription: merged.showDescription !== false,
    showFeatureTiles: Boolean(merged.showFeatureTiles),
    // Both default to off so the screen matches the reference design exactly;
    // flip them in config/loginApps.json to bring the footer rows back.
    showRegisterLink: Boolean(merged.showRegisterLink),
    showCopyright: Boolean(merged.showCopyright),

    welcomeTitle: merged.welcomeTitle || "Welcome Back",
    welcomeSubtitle: withAppToken(merged.welcomeSubtitle),

    credentialsLabel: merged.credentialsLabel || "Username",
    credentialsPlaceholder: merged.credentialsPlaceholder || "Enter your username",
    credentialsAutoComplete: merged.credentialsAutoComplete || "username",
    passwordLabel: merged.passwordLabel || "Password",
    passwordPlaceholder: merged.passwordPlaceholder || "Enter your password",

    rememberMeLabel: merged.rememberMeLabel || "Remember me",
    forgotPasswordLabel: merged.forgotPasswordLabel || "Forgot Password?",
    forgotPasswordPath: merged.forgotPasswordPath || "/auth/forgot-password",
    submitLabel: merged.submitLabel || "Login",
    submitLabelBusy: merged.submitLabelBusy || "Signing in",
    dividerLabel: merged.dividerLabel || "or",
    registerPrompt: merged.registerPrompt || "New here?",
    registerLabel: merged.registerLabel || "Register",
    registerPath: merged.registerPath || "/auth/register",

    redirectTo: merged.redirectTo || "/app",
    companyName: loginData().companyName || "",
    socialLinksLabel: loginData().socialLinksLabel || "",
    companyLinks: Array.isArray(loginData().companyLinks)
      ? loginData().companyLinks
      : [],
    socialLogin: mergeSocialLogin(entry.socialLogin),
    theme: mergeTheme(entry.theme),
  };
}

/**
 * Reverse direction: the login URL to send a user to when they log out or
 * their session expires, carrying the app they were in so the branded screen
 * comes back ("/auth/login?app=crm"). No app known yet → plain login URL,
 * which renders the default app.
 */
export function buildLoginPath(appId) {
  const id = normalizeAppId(appId);
  if (!id) return LOGIN_PATH;
  return `${LOGIN_PATH}?app=${encodeURIComponent(id)}`;
}

/**
 * `path` carrying the app's `?app=` param, so moving between the auth screens
 * (login -> forgot password -> back to login) keeps the same branding. The
 * default app needs no param and gets the bare path.
 */
export function withLoginAppParam(path, appId) {
  const id = normalizeAppId(appId);
  if (!id || id === getDefaultLoginAppId()) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}app=${encodeURIComponent(id)}`;
}

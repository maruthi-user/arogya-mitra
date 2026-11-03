/**
 * Persistence for per-table column layout (order, hidden, pinned, widths).
 *
 * The key is derived rather than configured, so no call site has to pass a
 * table id:
 *
 *   app:table-layout:v1:<userId>:<route>#<column signature>
 *
 * The route separates tables on different pages; the signature separates the
 * tables that share a route (the Advance page's My / Approval / All tabs, for
 * instance) and, deliberately, resets a saved layout whenever the underlying
 * column set changes in a future release - a stored order referring to columns
 * that no longer exist is worse than starting fresh.
 */

const PREFIX = "app:table-layout";
const VERSION = "v1";

/**
 * Who the layout belongs to.
 *
 * Read from the same localStorage entry authSlice initialises itself from,
 * rather than through useSelector: this keeps a generic table primitive free
 * of a redux Provider, and the id is only needed once per mount anyway - it
 * cannot change without a login, which remounts the app.
 */
export function getCurrentUserId() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem("user");
    if (!raw) return null;

    const user = JSON.parse(raw);

    return user?.id ?? user?.email ?? null;
  } catch {
    return null;
  }
}

/** djb2 - short, stable, and good enough to tell column sets apart. */
const signature = (ids) => {
  let hash = 5381;
  const source = ids.join("|");

  for (let i = 0; i < source.length; i += 1) {
    hash = ((hash << 5) + hash + source.charCodeAt(i)) | 0;
  }

  return (hash >>> 0).toString(36);
};

/**
 * Storage key for one table, or null when there is nothing stable to key on
 * (no columns yet) - callers then skip persistence entirely.
 */
export function buildLayoutKey(ids, userId) {
  if (!ids?.length) return null;

  const route =
    typeof window === "undefined" ? "" : window.location.pathname || "";

  return `${PREFIX}:${VERSION}:${userId || "anon"}:${route}#${signature(ids)}`;
}

/**
 * Read a saved layout. Anything unparseable or shaped wrong is treated as
 * absent rather than thrown - a corrupt entry must never break a page.
 */
export function readLayout(key) {
  if (!key || typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    return {
      order: Array.isArray(parsed.order) ? parsed.order : null,
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden : null,
      pinned:
        parsed.pinned && typeof parsed.pinned === "object"
          ? parsed.pinned
          : null,
      sizes:
        parsed.sizes && typeof parsed.sizes === "object" ? parsed.sizes : null,
    };
  } catch {
    // Private mode, disabled storage, or a bad entry.
    return null;
  }
}

export function writeLayout(key, layout) {
  if (!key || typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(layout));
  } catch {
    // Quota or disabled storage - the table still works, it just won't
    // remember. Nothing to tell the user about.
  }
}

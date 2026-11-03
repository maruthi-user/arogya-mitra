import { Fragment } from "react";
import { Link, useLocation } from "wouter";
import { ChevronRight, Home } from "lucide-react";
import { getLayoutConfig } from "@layout/config/registry";

/**
 * Builds the trail Home > Application > Module > Submodule for a URL from
 * the apps catalogue. Falls back to the profile page label.
 */
export function useBreadcrumbs() {
  const [location] = useLocation();
  const { apps, paths } = getLayoutConfig();
  const crumbs = [{ label: "Home", href: paths.home, icon: true }];

  if (location === paths.profile) {
    crumbs.push({ label: "Manage account" });
    return crumbs;
  }

  const starts = (p) => p && (location === p || location.startsWith(p + "/"));
  for (const app of apps) {
    for (const m of app.modules || []) {
      const sub = (m.submodules || []).find((s) => starts(s.path));
      if (sub || starts(m.path)) {
        crumbs.push({ label: app.name, href: (app.modules.find((x) => x.path) || {}).path });
        crumbs.push(sub ? { label: m.name } : { label: m.name });
        if (sub) crumbs.push({ label: sub.name });
        return crumbs;
      }
    }
  }
  return crumbs;
}

/** Breadcrumb trail; the last item is the current page. */
export default function Breadcrumbs() {
  const crumbs = useBreadcrumbs();
  if (crumbs.length < 2) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-1 px-4 pt-4 sm:px-6">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <Fragment key={`${c.label}-${i}`}>
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />}
              <li className="flex items-center">
                {last || !c.href ? (
                  <span aria-current={last ? "page" : undefined} className={last ? "font-medium text-foreground" : ""}>
                    {c.label}
                  </span>
                ) : (
                  <Link href={c.href} className="flex items-center gap-1 hover:text-foreground">
                    {c.icon && <Home className="h-3 w-3" aria-hidden="true" />}
                    {c.label}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

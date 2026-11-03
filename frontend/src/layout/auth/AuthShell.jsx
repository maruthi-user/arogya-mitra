import { useEffect } from "react";
import { cn } from "@layout/lib/utils";
import LoginBrandPanel from "./LoginBrandPanel";
import CompanyLinks from "./CompanyLinks";
import { buildLoginPath } from "@layout/utils/loginApp";

/**
 * The shared frame of every pre-login screen (login, forgot password, restore
 * password, account activation): plain white page, brand poster with the
 * glass illustration on the left, and the form on the right. Pages only supply
 * their own form as `children`; the shell adds the company links and the
 * copyright line under it.
 *
 * Layout is pure CSS - nothing is measured in JS:
 *  - wide landscape screens (`auth-split:` variant, index.css) -> brand poster
 *    on the left, form vertically centred on the right.
 *  - phones/tablets -> compact brand row, form, links, in one column.
 * Text keeps its real size everywhere: when the content is taller than the
 * screen (small phones, landscape phones, browser zoom) the page scrolls
 * instead of being shrunk. `.auth-form-scale` / `.auth-poster-scale` (in
 * index.css) set one font-size each, and every size inside is in `em`, so
 * the form and the poster grow together on large monitors.
 *
 * @param {object} app  resolved app config from `resolveLoginApp()`
 */
export default function AuthShell({
  app,
  children,
  showCompanyLinks = true,
  className = "",
}) {
  // The tab shows the organisation name (companyName in config/loginApps.json) on every auth screen. The previous
  // title is restored on unmount.
  useEffect(() => {
    const pageTitle = app?.companyName || app?.title;
    if (!pageTitle) return undefined;
    const previousTitle = document.title;
    document.title = pageTitle;
    return () => {
      document.title = previousTitle;
    };
  }, [app?.companyName, app?.title]);

  const showFooter = showCompanyLinks || Boolean(app?.companyName);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[50] overflow-hidden bg-white font-['Plus_Jakarta_Sans',Inter,system-ui,sans-serif] text-[#0f1a3d]",
        className
      )}
    >
      <SoftGlows />

      {/* Scroll layer: the glows above stay put while this scrolls. */}
      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="relative grid min-h-full auth-split:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {/* Brand poster + illustration. Sticky, so it never scrolls away
              when the form column is taller than the screen. */}
          <aside className="auth-poster-scale relative hidden auth-split:sticky auth-split:top-0 auth-split:block auth-split:h-screen">
            <LoginBrandPanel app={app} variant="panel" />
          </aside>

          <main className="auth-form-scale relative z-10 flex flex-col px-5 pb-6 pt-8 sm:px-10 sm:py-10 md:justify-center auth-split:px-[clamp(2rem,5vw,6rem)] auth-split:py-8">
            {/* Phones: brand row on top, links pinned to the bottom (mt-auto).
                Tablets and up: the whole stack is centred. */}
            <div className="mx-auto flex w-full max-w-[25em] flex-1 flex-col md:flex-none">
              <LoginBrandPanel
                app={app}
                variant="compact"
                className="auth-rise mb-[2.5em] auth-split:hidden md:mb-[3em]"
              />

              <div>{children}</div>

              {showFooter && (
                <footer
                  className="auth-rise mt-auto pt-[2.5em] md:mt-[3em] md:pt-0"
                  style={{ "--rise": 6 }}
                >
                  {showCompanyLinks && (
                    <CompanyLinks
                      links={app?.companyLinks}
                      label={app?.socialLinksLabel}
                      fallbackHref={buildLoginPath(app?.id)}
                    />
                  )}

                  {app?.companyName && (
                    <p
                      className={cn(
                        "text-center text-[0.8125em] text-[#6b7894]",
                        showCompanyLinks && "mt-[1.75em]"
                      )}
                    >
                      © {new Date().getFullYear()} {app.companyName}
                    </p>
                  )}
                </footer>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

/**
 * Phones/tablets only (the wide layout has the brand panel's wash instead):
 * two soft blue glows, top-right and along the bottom. Radial fades with no
 * edge, so they never draw a line through the content.
 *
 * The layer clips its children itself: overflowing shapes would otherwise
 * make the fixed page frame sideways-scrollable, and focusing a field could
 * shift the whole page left.
 */
function SoftGlows() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden auth-split:hidden"
    >
      <span className="absolute -right-[30vw] -top-[26vw] h-[80vw] w-[80vw] rounded-full bg-[radial-gradient(circle,rgba(147,197,253,0.45)_0%,rgba(191,219,254,0.28)_38%,rgba(255,255,255,0)_70%)] md:-right-[20vw] md:-top-[20vw] md:h-[60vw] md:w-[60vw]" />
      <span className="absolute -bottom-[34vw] -left-[20vw] h-[70vw] w-[110vw] rounded-full bg-[radial-gradient(ellipse,rgba(147,197,253,0.4)_0%,rgba(191,219,254,0.24)_40%,rgba(255,255,255,0)_70%)] md:-bottom-[26vw] md:h-[52vw]" />
    </div>
  );
}

/** Heading + subtitle at the top of every auth form. */
export function AuthHeading({ title, subtitle, className = "" }) {
  return (
    <div className={className}>
      <h2 className="text-[1.75em] font-bold leading-[1.15] tracking-[-0.025em] text-[#0b1437] md:text-[2em] auth-split:text-[2.25em]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-[0.5em] text-[0.9375em] leading-relaxed text-[#5a6482] auth-split:text-[1.0625em]">
          {subtitle}
        </p>
      )}
    </div>
  );
}

// Shared control styles, identical on the login form and the account pages.
// Sizes are in `em` so they follow the form's font-size (16px on phones and
// laptops - 16px inputs also stop iOS zooming in on focus).
export const authInputClass = (hasError, withToggle = false) =>
  cn(
    "h-[3.25em] w-full rounded-[0.875em] border border-[#d3e0f7] bg-white pl-[3em] text-[1em] font-medium text-[#0b1437] shadow-[0_0.25em_0.9em_rgba(0,85,254,0.05)] outline-none transition placeholder:font-normal placeholder:text-[#8a97b5] hover:border-[#b9c9f5] focus:border-[#3b82f6] focus:bg-white focus:ring-4 focus:ring-[#3b82f6]/15",
    withToggle ? "pr-[3.25em]" : "pr-[1em]",
    // Browser autofill paints inputs grey/yellow; keep them white.
    "[&:-webkit-autofill]:shadow-[inset_0_0_0_100px_#fff] [&:-webkit-autofill]:[-webkit-text-fill-color:#0f1a3d]",
    // Edge/IE draw their own "reveal password" eye inside password inputs;
    // with our own show/hide button that showed two eyes, so hide the native one.
    "[&::-ms-reveal]:hidden [&::-ms-clear]:hidden",
    hasError &&
      "border-[#f04438] bg-[#fff6f5] hover:border-[#f04438] focus:border-[#f04438] focus:ring-[#f04438]/15"
  );

// Grey at rest, blue only while its field is focused. The wrapper around the
// icon + input needs the `group` class for the blue state. Icons inside are
// sized with `authFieldIconSize`.
export const authIconClass =
  "pointer-events-none absolute left-[1.0625em] top-1/2 -translate-y-1/2 text-[#6b7894] transition-colors group-focus-within:text-[#2563eb]";

export const authFieldIconSize = "h-[1.25em] w-[1.25em]";

// Show/hide password button inside the right end of a field.
export const authToggleClass =
  "absolute right-[0.5em] top-1/2 flex h-[2.5em] w-[2.5em] -translate-y-1/2 items-center justify-center rounded-full text-[#6b7894] transition hover:bg-[#eaf1ff] hover:text-[#2563eb] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3b82f6]/15";

// Small label shown above each field.
export const authLabelClass =
  "mb-[0.5em] block text-[0.9375em] font-medium text-[#1f2a4a]";

// Validation message under a field.
export const authFieldErrorClass =
  "auth-fade-in mt-[0.5em] pl-[0.25em] text-[0.8125em] font-medium text-[#b42318]";

// Request error shown above the submit button (re-mounts, and so shakes
// again, on every failed attempt).
export const authAlertClass =
  "auth-shake flex items-start gap-[0.75em] rounded-[0.875em] border border-[#fecdca] bg-[#fff6f5] px-[1em] py-[0.875em] text-[0.875em] font-medium text-[#b42318]";

// Blue-to-indigo gradient pill with a soft coloured shadow, the same height
// as the fields.
export const authButtonClass =
  "group flex h-[3.25em] w-full items-center justify-center gap-[0.5em] rounded-full bg-[linear-gradient(90deg,#3b8bff_0%,#2f6df5_55%,#3a46e8_100%)] text-[1.0625em] font-semibold text-white shadow-[0_0.7em_1.5em_-0.6em_rgba(47,96,240,0.7)] transition hover:-translate-y-px hover:brightness-[1.06] hover:shadow-[0_0.9em_1.8em_-0.6em_rgba(47,96,240,0.75)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3b82f6]/25 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:brightness-100";

export const authLinkClass =
  "group inline-flex items-center justify-center gap-[0.5em] rounded-md text-[0.9375em] font-semibold text-[#2563eb] transition-colors hover:text-[#1d4ed8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3b82f6]/20";

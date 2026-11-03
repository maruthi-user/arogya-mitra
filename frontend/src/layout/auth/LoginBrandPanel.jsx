const LoginLogo='/assets/images/arogya-mitra-logo.png';
import { cn } from "@layout/lib/utils";
import LoginIllustration from "./LoginIllustration";

// The FP mark on its own (the favicon), for the phone lockup - it sets the
// app name beside the mark, so the full wordmark isn't needed there.
const BRAND_MARK = `${import.meta.env.BASE_URL}favicon.png`;

/**
 * Brand half of the login screen, rendered in two variants from the same
 * config so the two can never disagree:
 *
 *  - "panel":   the left-hand poster on wide screens - a soft blue curved
 *               wash, the stacked brand block (full logo, two-line product
 *               title, accent line) in the top-left corner and the glass
 *               dashboard illustration. Every size is in `em`, so the parent
 *               (AuthShell) scales the whole poster by setting one font-size.
 *  - "compact": above the form in the single-column layout - the same
 *               stacked brand block on tablets (`auth-tablet:` variant in
 *               index.css), the one-row "mark | APP" lockup on phones.
 *
 * Everything it displays comes from `app`, the object returned by
 * `resolveLoginApp()` in utils/loginApp.js.
 */
export default function LoginBrandPanel({
  app,
  variant = "panel",
  className = "",
}) {
  if (variant !== "panel") {
    return (
      <div className={className}>
        <BrandLockup app={app} className="auth-tablet:hidden" />
        <BrandStack app={app} className="hidden text-[1.75em] auth-tablet:block" />
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <WashBackdrop />

      <BrandStack
        app={app}
        className="auth-rise absolute left-[1.8em] top-[1.2em] z-10 text-[2.5em]"
      />

      {/* Dashboard illustration, bottom-centre, bleeding off the bottom */}
      <div className="absolute bottom-0 left-[4%] z-0 h-[68%] w-[92%]">
        <LoginIllustration />
      </div>
    </div>
  );
}

// A subtitle that only repeats the product name ("Sign in to Acme Portal"
// under "Acme Portal") is dropped, so the name shows once.
const extraLine = (app, line) =>
  line && !(app?.name && line.toLowerCase().includes(app.name.toLowerCase())) ? line : null;

/**
 * Full company logo, the two-line product title ("Human Resources" in blue
 * over "Management System" in navy) and a short accent line that draws
 * itself in. Sized in `em` of the title: set the title's font-size on it
 * (via className) and the logo, gaps and line follow.
 */
function BrandStack({ app, className = "" }) {
  const logoAlt = app?.companyName ? `${app.companyName} logo` : "Logo";
  const subtitle = extraLine(app, app?.subtitle);

  return (
    <div className={className}>
      <img
        src={LoginLogo}
        alt={logoAlt}
        className="h-[1.9em] w-auto object-contain"
      />
      <h1 className="mt-[0.75em] font-semibold leading-[1.1] tracking-[-0.02em]">
        <span className="block text-[#3b82f6]">{app?.name}</span>
        {subtitle && <span className="block text-[#0f1a3d]">{subtitle}</span>}
      </h1>
      <span
        aria-hidden="true"
        className="auth-line-draw mt-[0.55em] block h-[0.11em] w-[1.4em] rounded-full bg-[#3b82f6]"
      />
    </div>
  );
}

// The wash: a circle 1.5x the panel's width, centred 20% in from its left
// edge, so only one gentle curve shows - from the top edge, past the
// illustration, down to the bottom.
const WASH_CIRCLE =
  "absolute left-[-55%] top-1/2 aspect-square w-[150%] -translate-y-1/2 rounded-full";

// Dotted texture patches (positions/sizes in % of the panel), each fading
// out towards its edges so it has no visible border.
// Dotted texture patches (positions/sizes in % of the panel), each fading
// out towards its edges so it has no visible border. They stay out of the
// brand block (top-left, to ~52% across and ~28% down).
const DOT_PATCHES = [
  // top-right, beside the brand block
  "left-[54%] top-[5%] h-[24%] w-[34%]",
  // under the brand block, around the team chip
  "left-[1%] top-[31%] h-[16%] w-[30%]",
  // between the team chip and the dashboard
  "left-[1%] top-[46%] h-[16%] w-[24%]",
];

// Small dots drifting up through the wash (.auth-particle). Positions are
// percentages of the panel, sizes in em, so they scale with the poster.
// Like the dot patches, they start clear of the brand block.
const PARTICLES = [
  { left: "14%", top: "48%", size: "0.5em", tone: "bg-white", duration: "10s", delay: "0s" },
  { left: "34%", top: "52%", size: "0.35em", tone: "bg-[#8db8f7]", duration: "8s", delay: "2.5s" },
  { left: "58%", top: "30%", size: "0.6em", tone: "bg-white/90", duration: "11s", delay: "1s" },
  { left: "63%", top: "40%", size: "0.35em", tone: "bg-[#8db8f7]", duration: "9s", delay: "4s" },
  { left: "8%", top: "70%", size: "0.4em", tone: "bg-[#a9c8f8]", duration: "12s", delay: "6s" },
  { left: "76%", top: "62%", size: "0.45em", tone: "bg-white", duration: "10s", delay: "3s" },
  { left: "70%", top: "24%", size: "0.4em", tone: "bg-white", duration: "9s", delay: "5s" },
  { left: "56%", top: "48%", size: "0.5em", tone: "bg-[#a9c8f8]", duration: "13s", delay: "1.5s" },
  { left: "40%", top: "60%", size: "0.3em", tone: "bg-white", duration: "8s", delay: "7s" },
  { left: "84%", top: "36%", size: "0.35em", tone: "bg-[#8db8f7]", duration: "11s", delay: "3.5s" },
];

/**
 * Everything behind the lockup and the illustration: the curved wash (with
 * a highlight, a white rim and a soft glow along its edge), dotted texture
 * patches in the open spaces, a depth haze under the dashboard and small
 * particles drifting up.
 */
function WashBackdrop() {
  return (
    <div aria-hidden="true" className="auth-fade-in absolute inset-0">
      {/* The wash: deeper blue towards its edge so the curve reads, a
          white rim along the curve and a soft glow outside it */}
      <div
        className={`${WASH_CIRCLE} bg-[radial-gradient(circle_at_46%_44%,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0)_18%),radial-gradient(circle_at_38%_52%,#c3dafc_0%,#d5e6fe_32%,#e1edfe_62%,#d9e8fd_100%)] shadow-[0_0_70px_4px_rgba(147,197,253,0.3)]`}
      >
        <span className="absolute inset-0 rounded-full border-2 border-white/90" />
      </div>

      {DOT_PATCHES.map((position) => (
        <div
          key={position}
          className={`absolute ${position} bg-[radial-gradient(circle,#93b9f3_1.2px,transparent_1.8px)] bg-[length:1.4em_1.4em] opacity-80 [mask-image:radial-gradient(ellipse_at_center,#000_20%,transparent_70%)] [-webkit-mask-image:radial-gradient(ellipse_at_center,#000_20%,transparent_70%)]`}
        />
      ))}

      {/* Depth: a deeper blue haze under the dashboard, light from above */}
      <div className="absolute bottom-[4%] left-[10%] h-[42%] w-[60%] rounded-full bg-[#8fb8f8]/40 blur-[70px]" />
      <div className="absolute left-[24%] top-[22%] h-[26%] w-[34%] rounded-full bg-white/60 blur-[60px]" />

      {PARTICLES.map((particle) => (
        <span
          key={`${particle.left}-${particle.top}`}
          className={`auth-particle absolute rounded-full shadow-[0_0_0.6em_rgba(255,255,255,0.9)] ${particle.tone}`}
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
            "--particle-duration": particle.duration,
            "--particle-delay": particle.delay,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Phones: logo mark | short name ("WS", brand blue) over the full product
 * name ("Human Resources" / "Management System"), in one row.
 */
function BrandLockup({ app, className = "" }) {
  const shortTitle = app?.shortName || app?.catalogShortName || app?.name;
  const lines = [app?.name !== shortTitle && app?.name, extraLine(app, app?.subtitle)].filter(
    Boolean
  );
  const logoAlt = app?.companyName ? `${app.companyName} logo` : "Logo";

  return (
    <div className={cn("flex items-center", className)}>
      <img
        src={BRAND_MARK}
        alt={logoAlt}
        className="h-[3em] w-[3em] shrink-0 object-contain"
      />
      <span
        aria-hidden="true"
        className="mx-[0.875em] h-[2.75em] w-px shrink-0 bg-[#c9d6ee]"
      />
      <h1 className="min-w-0">
        <span className="block text-[1.375em] font-bold leading-none tracking-tight text-[#2563eb]">
          {shortTitle}
        </span>
        {lines.length > 0 && (
          <span className="mt-[0.3em] block text-[0.8125em] leading-[1.3] text-[#4b5878]">
            {lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </span>
        )}
      </h1>
    </div>
  );
}

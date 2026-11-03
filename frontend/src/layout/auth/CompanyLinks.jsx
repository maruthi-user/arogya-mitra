import { Globe } from "lucide-react";
import { Link } from "wouter";

// Brand glyphs are inlined (lucide-react dropped brand icons) so the row needs
// no extra network request and always matches the button colour.
const GLYPH = "h-[1.2em] w-[1.2em]";

const GLYPHS = {
  linkedin: (
    <svg viewBox="0 0 24 24" className={GLYPH} fill="currentColor">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  ),
  instagram: (
    <svg
      viewBox="0 0 24 24"
      className={GLYPH}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" className="h-[1.05em] w-[1.05em]" fill="currentColor">
      <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.66l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64z" />
    </svg>
  ),
  website: <Globe className={GLYPH} strokeWidth={1.75} />,
};

// Each chip rests in its own brand colour (like the reference). On hover EVERY
// chip does the same thing: it fills with the company logo's navy blue (#2F4696,
// sampled from the login logo) and the icon turns white, so the row feels like one control.
const HOVER =
  "hover:bg-[#2F4696] hover:text-white hover:shadow-[0_0.7em_1.4em_-0.6em_rgba(47,70,150,0.75)]";
const TONES = {
  linkedin: "text-[#0a66c2]",
  instagram: "text-[#e1306c]",
  x: "text-[#0f1419]",
  website: "text-[#2563eb]",
};

// One chip: an external profile opens in a new tab; an entry without a `url`
// yet goes to `fallbackHref` (the login screen) in the same tab, so every icon
// can be shown before the company's profiles are filled in.
function LinkChip({ link, fallbackHref, className, children }) {
  const common = { "aria-label": link.label, title: link.label, className };
  if (link.url) {
    return (
      <a href={link.url} target="_blank" rel="noopener noreferrer" {...common}>
        {children}
      </a>
    );
  }
  return (
    <Link href={fallbackHref} {...common}>
      {children}
    </Link>
  );
}

/**
 * "or connect with us" divider plus round icon buttons linking to the
 * company's public profiles. Driven by `companyLinks` in
 * config/loginApps.json - each entry is `{ id, label, url }` where `id` picks
 * the glyph above (website | linkedin | instagram | x). Every entry is shown;
 * one with an empty `url` links to `fallbackHref` (the login screen) instead.
 * Sizes are in `em`, so the row follows the card's font-size.
 */
export default function CompanyLinks({
  links = [],
  label = "",
  variant = "chips",
  className = "",
  fallbackHref = "/auth/login",
}) {
  const items = links.filter((link) => link && GLYPHS[link.id]);
  if (!items.length) return null;

  // "plain": small grey icons in a row, no chips and no divider - the quiet
  // footer links of the phone layout.
  if (variant === "plain") {
    return (
      <nav
        aria-label="Company links"
        className={`flex items-center justify-center gap-6 ${className}`}
      >
        {items.map((link) => (
          <LinkChip
            key={link.id}
            link={link}
            fallbackHref={fallbackHref}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#5e5e5e] transition-colors hover:bg-[#0b57d0]/[0.08] hover:text-[#0b57d0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b57d0]/40 [&_svg]:h-5 [&_svg]:w-5"
          >
            {GLYPHS[link.id]}
          </LinkChip>
        ))}
      </nav>
    );
  }

  return (
    <div className={className}>
      {label && (
        <div className="flex items-center gap-[1em]">
          <span className="h-px flex-1 bg-[#c9d6ee]/70" />
          <span className="text-[0.8125em] text-[#6b7894]">{label}</span>
          <span className="h-px flex-1 bg-[#c9d6ee]/70" />
        </div>
      )}

      {/* 44px chips on phones (the minimum touch target), 52px from sm up;
          the gap tightens on phones so all four fit on a 320px screen. */}
      <nav
        aria-label="Company links"
        className={`flex items-center justify-center gap-[1.25em] sm:gap-[2em] ${
          label ? "mt-[1.25em]" : ""
        }`}
      >
        {items.map((link) => (
          <LinkChip
            key={link.id}
            link={link}
            fallbackHref={fallbackHref}
            className={`relative flex h-[2.75em] w-[2.75em] items-center justify-center rounded-full border border-[#eef3fc] bg-white shadow-[0_0.6em_1.4em_-0.6em_rgba(51,110,214,0.45)] sm:h-[3.25em] sm:w-[3.25em] transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3b82f6]/20 ${
              TONES[link.id] || TONES.website
            } ${HOVER}`}
          >
            {GLYPHS[link.id]}
          </LinkChip>
        ))}
      </nav>
    </div>
  );
}

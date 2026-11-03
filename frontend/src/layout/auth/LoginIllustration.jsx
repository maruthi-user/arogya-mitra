// Left-hand artwork of the login screen: a tilted glass dashboard (profile,
// activity bars, task list, donut) with generic modules - people, calendar,
// documents, reports - floating above it on a dashed arc, and a
// "team online" chip beside them. The charts build themselves once on load
// and everything drifts slowly afterwards (.auth-* classes in index.css; all
// off for "reduce motion").
import { useLayoutEffect, useRef, useState } from "react";

/**
 * Decorative artwork for the login brand panel, drawn on a fixed 720x640
 * canvas and scaled as one piece to the space it is given (anchored
 * bottom-centre), so every card, tile and arc stays in proportion from a
 * small laptop to a 4K display. CSS and inline SVG only - no bitmaps - and
 * purely decorative, so it is `aria-hidden` throughout.
 */

const CANVAS_W = 720;
const CANVAS_H = 640;

// The dashboard lies back at an angle, like a tablet on a desk.
const TABLET_TILT =
  "perspective(1800px) rotateX(46deg) rotateZ(-26deg) scale(1.08)";

// Dashed arc the module tiles sit on (canvas coordinates; angles in degrees,
// clockwise from 3 o'clock).
const ARC = { cx: 415, cy: 305, r: 225 };
const onArc = (deg) => ({
  x: ARC.cx + ARC.r * Math.cos((deg * Math.PI) / 180),
  y: ARC.cy + ARC.r * Math.sin((deg * Math.PI) / 180),
});
const ARC_FROM = onArc(-118);
const ARC_TO = onArc(14);
const ARC_PATH = `M ${ARC_FROM.x} ${ARC_FROM.y} A ${ARC.r} ${ARC.r} 0 0 1 ${ARC_TO.x} ${ARC_TO.y}`;

const MODULE_TILES = [
  { key: "people", angle: -101, size: 106, Icon: PeopleIcon },
  { key: "calendar", angle: -67, size: 96, Icon: CalendarIcon },
  { key: "documents", angle: -34, size: 96, Icon: DocumentIcon },
  { key: "reports", angle: -1, size: 96, Icon: ReportIcon },
];

// Weekly activity, rising one bar after another.
const ACTIVITY_BARS = [34, 54, 72, 92, 112];

// Task list: coloured status square + title/meta bars per row.
const TASK_ROWS = [
  { top: 26, tone: "bg-[linear-gradient(140deg,#6ee7b7,#10b981)]" },
  { top: 88, tone: "bg-[linear-gradient(140deg,#c4b5fd,#8b5cf6)]" },
  { top: 150, tone: "bg-[linear-gradient(140deg,#fde68a,#f59e0b)]" },
];

// Donut on a 100-unit ring: done / remaining, 2-unit gaps.
const DONUT_SEGMENTS = [
  { start: 0, length: 70, color: "url(#auth-donut-grad)" },
  { start: 72, length: 26, color: "#c7dcfb" },
];

const PANEL =
  "absolute rounded-[22px] border border-white bg-white/80 shadow-[0_12px_26px_-16px_rgba(37,99,235,0.4)]";

function Bar({ className }) {
  return <span className={`absolute block rounded-full ${className}`} />;
}

/** Wraps one floating layer; each layer gets its own period and phase. */
function Float({ delay = "0s", duration = "8s", children }) {
  return (
    <div
      className="auth-float absolute inset-0"
      style={{ "--float-delay": delay, "--float-duration": duration }}
    >
      {children}
    </div>
  );
}

function Avatar({ className }) {
  return (
    <span
      className={`absolute block overflow-hidden rounded-full bg-[linear-gradient(150deg,#93c5fd,#3b82f6)] shadow-[0_8px_14px_-6px_rgba(37,99,235,0.5)] ${className}`}
    >
      <svg viewBox="0 0 52 52" className="h-full w-full">
        <circle cx="26" cy="20" r="8.5" fill="#fff" fillOpacity="0.95" />
        <path
          d="M10 46c2.2-9.5 8.6-14.5 16-14.5S39.8 36.5 42 46z"
          fill="#fff"
          fillOpacity="0.9"
        />
      </svg>
    </span>
  );
}

function Donut({ className }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <defs>
        <linearGradient id="auth-donut-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
        {/* One ring drawn clockwise from 12 o'clock reveals every segment.
            The explicit region matters: the default one is sized from the
            circles' geometry without their stroke and would clip the ring. */}
        <mask
          id="auth-donut-mask"
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="100"
          height="100"
        >
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="#fff"
            strokeWidth="24"
            pathLength="100"
            className="auth-sweep"
          />
        </mask>
      </defs>
      <circle cx="50" cy="50" r="38" fill="none" stroke="#e8f0fc" strokeWidth="20" />
      <g transform="rotate(-90 50 50)" mask="url(#auth-donut-mask)">
        {DONUT_SEGMENTS.map((segment) => (
          <circle
            key={segment.start}
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke={segment.color}
            strokeWidth="20"
            pathLength="100"
            strokeDasharray={`${segment.length} ${100 - segment.length}`}
            strokeDashoffset={-segment.start}
          />
        ))}
      </g>
    </svg>
  );
}

// "Team online" chip: overlapping avatars + a pulsing status dot.
const TEAM_AVATARS = [
  "bg-[linear-gradient(150deg,#93c5fd,#3b82f6)]",
  "bg-[linear-gradient(150deg,#6ee7b7,#10b981)]",
  "bg-[linear-gradient(150deg,#c4b5fd,#8b5cf6)]",
];

function TeamChip({ className }) {
  return (
    <div
      className={`flex items-center gap-[14px] rounded-full border border-white bg-white/85 py-[10px] pl-[12px] pr-[20px] shadow-[inset_0_1px_0_#fff,0_22px_38px_-20px_rgba(37,99,235,0.5)] backdrop-blur-[10px] ${className}`}
    >
      <span className="flex">
        {TEAM_AVATARS.map((tone, index) => (
          <span
            key={tone}
            className={`relative block h-[40px] w-[40px] overflow-hidden rounded-full border-[3px] border-white ${tone} ${index ? "-ml-[12px]" : ""}`}
          >
            <svg viewBox="0 0 52 52" className="h-full w-full">
              <circle cx="26" cy="21" r="8.5" fill="#fff" fillOpacity="0.95" />
              <path d="M10 48c2.2-9.5 8.6-14.5 16-14.5S39.8 38.5 42 48z" fill="#fff" fillOpacity="0.9" />
            </svg>
          </span>
        ))}
      </span>
      <span className="flex flex-col gap-[7px]">
        <span className="block h-[8px] w-[66px] rounded-full bg-[#c7dbf7]" />
        <span className="block h-[7px] w-[42px] rounded-full bg-[#e0eaf8]" />
      </span>
      <span className="relative flex h-[12px] w-[12px]">
        <span className="auth-pulse absolute inset-0 rounded-full bg-[#22c55e]" />
        <span className="relative h-full w-full rounded-full border-2 border-white bg-[#22c55e]" />
      </span>
    </div>
  );
}

/* Module icons: small filled glyphs, one brand-adjacent colour each. */

function PeopleIcon({ className }) {
  return (
    <svg viewBox="0 0 48 48" className={className}>
      <defs>
        <linearGradient id="auth-ic-people" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <g fill="#93c5fd">
        <circle cx="11.5" cy="18" r="5" />
        <circle cx="36.5" cy="18" r="5" />
        <path d="M2.5 35c0-5.6 4-9.5 9-9.5s9 3.9 9 9.5z" />
        <path d="M27.5 35c0-5.6 4-9.5 9-9.5s9 3.9 9 9.5z" />
      </g>
      <g fill="url(#auth-ic-people)">
        <circle cx="24" cy="15" r="6.5" />
        <path d="M12 38c0-7.2 5.4-12 12-12s12 4.8 12 12z" />
      </g>
    </svg>
  );
}

function CalendarIcon({ className }) {
  return (
    <svg viewBox="0 0 48 48" className={className}>
      <defs>
        <linearGradient id="auth-ic-calendar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect x="6" y="10" width="36" height="32" rx="7" fill="url(#auth-ic-calendar)" />
      <rect x="14" y="5" width="4" height="10" rx="2" fill="#047857" />
      <rect x="30" y="5" width="4" height="10" rx="2" fill="#047857" />
      <g fill="#fff" fillOpacity="0.92">
        {[13, 21.5, 30].map((x) =>
          [21, 30].map((y) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="6" height="6" rx="1.5" />
          ))
        )}
      </g>
    </svg>
  );
}

function DocumentIcon({ className }) {
  return (
    <svg viewBox="0 0 48 48" className={className}>
      <defs>
        <linearGradient id="auth-ic-doc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <path
        d="M13 4h15l12 12v24a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z"
        fill="url(#auth-ic-doc)"
      />
      <path d="M28 4v9a3 3 0 0 0 3 3h9z" fill="#c4b5fd" />
      <g stroke="#fff" strokeWidth="2.8" strokeLinecap="round">
        <path d="M16 24h16" />
        <path d="M16 31h16" />
        <path d="M16 38h9" />
      </g>
    </svg>
  );
}

function ReportIcon({ className }) {
  return (
    <svg viewBox="0 0 48 48" className={className}>
      <defs>
        <linearGradient id="auth-ic-report" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fcd34d" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <g fill="url(#auth-ic-report)">
        <rect x="7" y="26" width="9" height="16" rx="3" />
        <rect x="19.5" y="17" width="9" height="25" rx="3" />
        <rect x="32" y="7" width="9" height="35" rx="3" />
      </g>
    </svg>
  );
}

export default function LoginIllustration() {
  const hostRef = useRef(null);
  const [scale, setScale] = useState(0.8);

  // Fit the canvas to the host: never wider or taller than it.
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const update = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      setScale(Math.min(width / CANVAS_W, height / CANVAS_H));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="auth-fade-in pointer-events-none absolute inset-0"
    >
      {/* Scaled around its bottom-centre, then centred in the host. */}
      <div
        className="absolute bottom-0 left-1/2 origin-bottom"
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `translateX(-50%) scale(${scale})`,
        }}
      >
        {/* Glass dashboard */}
        <Float duration="10s">
          <div className="auth-rise absolute inset-0" style={{ "--rise": 1 }}>
            <div
              className="absolute left-[70px] top-[235px] h-[380px] w-[500px] rounded-[34px] border border-white bg-[linear-gradient(150deg,rgba(255,255,255,0.95),rgba(234,243,255,0.78))] shadow-[10px_16px_0_-2px_rgba(200,219,247,0.95),0_50px_70px_-20px_rgba(37,99,235,0.35)]"
              style={{ transform: TABLET_TILT }}
            >
              {/* profile */}
              <div className={`${PANEL} left-[20px] top-[20px] h-[118px] w-[220px]`}>
                <Avatar className="left-[20px] top-[32px] h-[54px] w-[54px]" />
                <Bar className="left-[90px] top-[42px] h-[11px] w-[108px] bg-[linear-gradient(90deg,#93c5fd,#bfdbfe)]" />
                <Bar className="left-[90px] top-[66px] h-[9px] w-[72px] bg-[#dbe7f8]" />
              </div>

              {/* weekly activity */}
              <div className={`${PANEL} left-[256px] top-[20px] h-[160px] w-[224px]`}>
                {ACTIVITY_BARS.map((height, index) => (
                  <span
                    key={index}
                    className="auth-bar absolute bottom-[24px] w-[22px] rounded-full bg-[linear-gradient(#60a5fa,#2563eb)]"
                    style={{
                      left: 30 + index * 36,
                      height,
                      animationDelay: `${450 + index * 90}ms`,
                    }}
                  />
                ))}
              </div>

              {/* task list */}
              <div className={`${PANEL} left-[20px] top-[154px] h-[206px] w-[220px]`}>
                {TASK_ROWS.map((row, index) => (
                  <div
                    key={row.top}
                    className="auth-row absolute inset-x-0"
                    style={{ top: row.top, animationDelay: `${600 + index * 130}ms` }}
                  >
                    <span
                      className={`absolute left-[20px] top-0 h-[32px] w-[32px] rounded-[10px] shadow-[0_6px_12px_-6px_rgba(15,23,42,0.35)] ${row.tone}`}
                    />
                    <Bar className="left-[66px] top-[5px] h-[9px] w-[96px] bg-[#c7dbf7]" />
                    <Bar className="left-[66px] top-[21px] h-[7px] w-[64px] bg-[#e0eaf8]" />
                    <span className="absolute left-[180px] top-[6px] h-[7px] w-[7px] rounded-full bg-[#d3e0f3]" />
                    <span className="absolute left-[180px] top-[20px] h-[7px] w-[7px] rounded-full bg-[#d3e0f3]" />
                  </div>
                ))}
              </div>

              {/* progress donut */}
              <div className={`${PANEL} left-[256px] top-[196px] h-[164px] w-[224px]`}>
                <Donut className="absolute left-[54px] top-[24px] h-[116px] w-[116px]" />
              </div>
            </div>
          </div>
        </Float>

        {/* Dashed arc linking the modules - draws itself in (.auth-sweep
            on a mask, because the dashes use the path's own dash array) */}
        <svg
          className="absolute inset-0"
          width={CANVAS_W}
          height={CANVAS_H}
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        >
          <defs>
            <mask
              id="auth-arc-mask"
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width={CANVAS_W}
              height={CANVAS_H}
            >
              <path
                d={ARC_PATH}
                fill="none"
                stroke="#fff"
                strokeWidth="10"
                pathLength="100"
                className="auth-sweep"
                style={{ animationDelay: "0.5s" }}
              />
            </mask>
          </defs>
          <path
            d={ARC_PATH}
            fill="none"
            stroke="#8db8f7"
            strokeWidth="2"
            strokeDasharray="5 8"
            strokeLinecap="round"
            mask="url(#auth-arc-mask)"
          />
        </svg>

        {/* Team online - fills the open space left of the module arc */}
        <Float delay="-3s" duration="9s">
          <div
            className="auth-pop absolute left-[28px] top-[52px]"
            style={{ "--pop-delay": "1.4s" }}
          >
            <TeamChip />
          </div>
        </Float>

        {/* Module tiles on the arc - pop in one after another, then float */}
        {MODULE_TILES.map((tile, index) => {
          const { x, y } = onArc(tile.angle);
          const TileIcon = tile.Icon;
          return (
            <Float
              key={tile.key}
              delay={`${-index * 1.7}s`}
              duration={`${7 + index}s`}
            >
              <div
                className="auth-pop absolute"
                style={{
                  left: x - tile.size / 2,
                  top: y - tile.size / 2,
                  width: tile.size,
                  height: tile.size,
                  "--pop-delay": `${0.8 + index * 0.12}s`,
                }}
              >
                <div className="flex h-full w-full items-center justify-center rounded-[28px] border border-white bg-white/85 shadow-[inset_0_1px_0_#fff,0_24px_40px_-18px_rgba(37,99,235,0.55)] backdrop-blur-[10px]">
                  <TileIcon className="h-[54%] w-[54%]" />
                </div>
              </div>
            </Float>
          );
        })}
      </div>
    </div>
  );
}

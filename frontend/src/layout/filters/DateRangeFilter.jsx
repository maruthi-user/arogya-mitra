import { useState } from "react";
import { CalendarRange, ChevronDown } from "lucide-react";

// "2026-08-26" -> "26 Aug"
const formatShort = (isoDate) => {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
};

/* ============================================================
   Visual parity with the app-wide SearchableSelect control
   (GenericFilter.css `.searchable-select-control` / `.filter-input`):
   36px height, 1px gray-300 border, 6px radius, 11px text, white
   background (dark: --input bg / --border border), blue focus
   border + 2px ring (dark: --ring). The dark values intentionally
   use the shadcn theme tokens so both components follow the same
   theme variables.
   ============================================================ */

// Bordered field used for the From/To date inputs in both layouts.
// Dark mode: --input fill sits on the shell's darker --card surface, so
// the field's --border outline stays visible (border and input token are
// the same color, so the fill must differ from the surrounding surface).
const INPUT =
  "h-7 w-[90px] min-w-0 rounded-md bg-transparent px-1 text-xs text-foreground outline-none transition-colors cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30 focus:bg-blue-50/50 dark:focus:bg-blue-950/20";
// Bordered shell shared by the mobile collapsed chip and the md+ row
// (Period label + both date fields). Dark mode uses --card, the theme's
// dark surface, so the shell's --border outline is clearly visible and
// the whole filter aligns with the dark theme.
const PILL =
  "rounded-md border border-gray-300 bg-white transition-colors dark:border-border dark:bg-card";

export default function DateRangeFilter({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  className = "",
}) {
  const [expanded, setExpanded] = useState(false);

  const openDatePicker = (e) => {
    const input = e.currentTarget;

    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
      } catch {
        // Browser may block showPicker in some cases
      }
    }
  };

  // Bordered inputs for the mobile expanded panel.
  const mobileInputs = (
    <>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">From</span>
        <input
          type="date"
          value={fromDate}
          max={toDate}
          onChange={onFromDateChange}
          onClick={openDatePicker}
          className={INPUT}
        />
      </label>

      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">To</span>
        <input
          type="date"
          value={toDate}
          min={fromDate}
          onChange={onToDateChange}
          onClick={openDatePicker}
          className={INPUT}
        />
      </label>
    </>
  );

  return (
    <div className={className}>
      {/* Phones/small tablets only: tap to reveal the From/To inputs */}
      <div className={`${PILL} md:hidden`}>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-muted-foreground"
        >
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            <CalendarRange className="h-4 w-4 shrink-0 text-primary" />
            {formatShort(fromDate)} – {formatShort(toDate)}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
        {expanded && (
          <div className="grid grid-cols-2 gap-2 border-t border-gray-300 px-3 py-2 dark:border-border">
            {mobileInputs}
          </div>
        )}
      </div>

      {/* Tablet/laptop/desktop: one bordered shell enclosing the Period
          label and both individually bordered From/To fields - the outer
          (shell) and inner (field) borders are both visible, and the dark
          colors follow the dark theme (--card shell / --input fields). */}
      <div
        className={`${PILL} hidden h-9 items-center gap-1 px-1.5 md:flex`}
      >
        <div className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
          <CalendarRange className="h-4 w-4 text-primary" />
          Period
        </div>

        <label className="flex min-w-0 items-center gap-1">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">
            From
          </span>

          <input
            type="date"
            value={fromDate}
            max={toDate}
            onChange={onFromDateChange}
            onClick={openDatePicker}
            className={INPUT}
          />
        </label>


        <label className="flex min-w-0 items-center gap-1">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">
            To
          </span>

          <input
            type="date"
            value={toDate}
            min={fromDate}
            onChange={onToDateChange}
            onClick={openDatePicker}
            className={INPUT}
          />
        </label>
      </div>
    </div>
  );
}

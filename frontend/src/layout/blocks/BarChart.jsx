import { cn } from "@layout/lib/utils";

/**
 * Dependency-free bar chart.
 *   <BarChart data={[{ label: "Mon", value: 12 }, …]} height={160} />
 * Swap in a charting library (e.g. recharts) when you need axes or tooltips.
 */
export default function BarChart({ data = [], height = 160, className }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className={cn("flex items-end gap-2 sm:gap-3", className)} style={{ height }} role="img" aria-label="Bar chart">
      {data.map((d) => (
        <div key={d.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">{d.value}</span>
          <div
            className="w-full max-w-10 rounded-t-md bg-primary/80 transition-[height] duration-500 hover:bg-primary"
            style={{ height: `${Math.max(4, (d.value / max) * 100)}%` }}
          />
          <span className="text-xs text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

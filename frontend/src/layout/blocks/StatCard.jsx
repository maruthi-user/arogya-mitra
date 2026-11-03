import * as Icons from "@layout/ui/icons";
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { cn } from "@layout/lib/utils";
import Skeleton from "./Skeleton";

// Icon-chip gradients, same palette as the HRMS dashboard KPI cards.
const TONES = {
  primary: "from-blue-500 to-indigo-600",
  success: "from-emerald-500 to-teal-600",
  warning: "from-orange-500 to-amber-600",
  danger: "from-rose-500 to-red-600",
  info: "from-violet-500 to-purple-600",
};

/**
 * KPI card (HRMS dashboard style): label, big value, gradient icon chip,
 * optional trend / hint. Pass `onClick` to make it a lifting, clickable card
 * with a "View details" footer.
 *   <StatCard label="Revenue" value="4.2L" icon="IndianRupee" trend={12.5} hint="vs last month" />
 */
export default function StatCard({ label, value, icon, tone = "primary", trend, hint, loading, onClick, className }) {
  const Icon = icon ? Icons[icon] : null;
  const accent = TONES[tone] || TONES.primary;
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-3.5 transition-all duration-300 dark:border-gray-800 dark:bg-gray-900 md:p-4",
        onClick && "cursor-pointer hover:-translate-y-1.5 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5 dark:hover:shadow-none",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-3 h-8 w-24" />
          ) : (
            <p className="mt-1.5 text-3xl font-bold tracking-tight tabular-nums text-foreground">{value}</p>
          )}
          {(trend !== undefined || hint) && (
            <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              {trend !== undefined && (
                <span className={cn("inline-flex items-center font-medium", trend >= 0 ? "text-success" : "text-destructive")}>
                  {trend >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {Math.abs(trend)}%
                </span>
              )}
              {hint}
            </p>
          )}
        </div>
        {Icon && (
          <div className="relative shrink-0">
            <div className={cn("absolute inset-0 rounded-2xl bg-gradient-to-br opacity-25 blur-lg transition-all duration-300 group-hover:opacity-50", accent)} />
            <div className={cn("relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white transition-transform duration-300 group-hover:scale-105", accent)}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        )}
      </div>
      {onClick && (
        <div className="mt-3 flex items-center justify-end gap-1 text-xs font-semibold text-primary/70 transition-colors group-hover:text-primary">
          View details
          <ChevronRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
        </div>
      )}
    </div>
  );
}

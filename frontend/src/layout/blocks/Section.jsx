import * as Icons from "@layout/ui/icons";
import { cn } from "@layout/lib/utils";

/**
 * Titled card used to group content on a page (HRMS section-card style:
 * bordered header row, optional tinted icon chip, right-hand slot).
 *   <Section title="Recent activity" icon="Activity" action={<a>View all</a>}>...</Section>
 * `iconColor` tints the chip (default blue). Pass `flush` to remove the body
 * padding (for tables and lists).
 */
export default function Section({
  title,
  description,
  icon,
  iconColor = "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  action,
  flush,
  children,
  className,
}) {
  const Icon = icon ? Icons[icon] : null;
  return (
    <section className={cn("rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900", className)}>
      {(title || action) && (
        <header className="flex items-center gap-2.5 border-b border-gray-100 p-4 dark:border-gray-800 sm:p-5">
          {Icon && (
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-9 sm:w-9", iconColor)}>
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            {title && <h2 className="truncate text-base font-semibold text-gray-900 dark:text-white">{title}</h2>}
            {description && <p className="truncate text-sm text-muted-foreground">{description}</p>}
          </div>
          {action && <div className="ml-auto flex shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={flush ? "" : "p-4 sm:p-5"}>{children}</div>
    </section>
  );
}

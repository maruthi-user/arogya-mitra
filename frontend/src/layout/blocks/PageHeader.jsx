import * as Icons from "@layout/ui/icons";
import { cn } from "@layout/lib/utils";

/**
 * Page title row (HRMS style): light-blue icon chip (blue icon) + title on the left, action
 * buttons on the right (they wrap under the title on phones).
 *   <PageHeader icon="Users" title="Items" description="..." actions={<Button>Add</Button>} />
 * `icon` is a lucide icon name; leave it out for a plain title.
 */
export default function PageHeader({ title, description, icon, actions, className }) {
  const Icon = icon ? Icons[icon] : null;
  return (
    <div className={cn("mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">{actions}</div>}
    </div>
  );
}

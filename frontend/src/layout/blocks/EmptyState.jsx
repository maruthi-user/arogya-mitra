import * as Icons from "@layout/ui/icons";
import { cn } from "@layout/lib/utils";

/**
 * Friendly "nothing here" panel for empty lists, searches and errors.
 *   <EmptyState icon="Inbox" title="No items yet" description="..." action={<Button>Add item</Button>} />
 */
export default function EmptyState({ icon = "Inbox", title, description, action, className }) {
  const Icon = Icons[icon] || Icons.Inbox;
  return (
    <div className={cn("flex flex-col items-center justify-center px-4 py-12 text-center", className)}>
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

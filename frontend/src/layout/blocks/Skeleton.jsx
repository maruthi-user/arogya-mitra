import { cn } from "@layout/lib/utils";

/** Pulsing placeholder block. Size it with className: <Skeleton className="h-4 w-32" /> */
export default function Skeleton({ className }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

/** A few lines of text placeholder. */
export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn("space-y-2", className)} role="status" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

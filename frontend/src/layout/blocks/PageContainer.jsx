import { cn } from "@layout/lib/utils";

/**
 * Standard page wrapper (HRMS look): tight padding like the HRMS pages,
 * vertical rhythm and a gentle fade-in. Wrap every page in it.
 */
export default function PageContainer({ children, className }) {
  return (
    <div
      className={cn(
        "min-h-full w-full space-y-2 px-2 pb-3 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500 sm:px-3 md:space-y-3 dark:bg-transparent",
        className
      )}
    >
      {children}
    </div>
  );
}

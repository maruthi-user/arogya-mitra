import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@layout/lib/utils";

const VARIANTS = {
  info: { icon: Info, cls: "border-info/30 bg-info/10 text-foreground", ic: "text-info" },
  success: { icon: CheckCircle2, cls: "border-success/30 bg-success/10 text-foreground", ic: "text-success" },
  warning: { icon: AlertTriangle, cls: "border-warning/40 bg-warning/10 text-foreground", ic: "text-warning" },
  danger: { icon: AlertCircle, cls: "border-destructive/30 bg-destructive/10 text-foreground", ic: "text-destructive" },
};

/** Inline message banner: <Alert variant="warning" title="Heads up">Details…</Alert> */
export default function Alert({ variant = "info", title, children, className }) {
  const v = VARIANTS[variant] || VARIANTS.info;
  const Icon = v.icon;
  return (
    <div role={variant === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm", v.cls, className)}>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", v.ic)} aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn("text-muted-foreground", title && "mt-0.5")}>{children}</div>}
      </div>
    </div>
  );
}

import { useToast } from "@layout/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@layout/ui/toast";

import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
} from "lucide-react";

export function Toaster() {
  const { toasts } = useToast();

  const icons = {
    default: CheckCircle2,
    success: CheckCircle2,
    destructive: XCircle,
    warning: AlertTriangle,
    update: Info,
  };

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, variant, ...props }) => {
        const Icon = icons[variant] || icons.default;

        return (
          <Toast key={id} variant={variant} {...props}>
            {/* ICON */}
            <div className="mt-0.5">
              <Icon className="h-5 w-5" />
            </div>

            {/* CONTENT */}
            <div className="flex-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>

            <ToastClose />
          </Toast>
        );
      })}

      <ToastViewport />
    </ToastProvider>
  );
}
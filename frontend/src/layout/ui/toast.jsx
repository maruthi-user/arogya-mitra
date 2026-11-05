import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@layout/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

// ✅ UPDATED VIEWPORT (top-right like NotificationToast)
const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-17 right-4 z-[10000] flex w-86 max-w-[calc(100vw-2rem)] flex-col gap-3",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

// ✅ UPDATED VARIANTS (match NotificationToast design)
const toastVariants = cva(
  "group relative flex w-full items-start gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all",
  {
    variants: {
      variant: {
        default: "bg-green-50 border-green-500 text-green-800",
        success: "bg-green-50 border-green-500 text-green-800",
        destructive: "bg-red-50 border-red-500 text-red-700",
        warning: "bg-yellow-50 border-yellow-500 text-yellow-800",
        update: "bg-blue-50 border-blue-500 text-blue-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Toast = React.forwardRef(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

// Close button (visible like NotificationToast)
const ToastClose = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    aria-label="Dismiss notification"
    className={cn(
      "absolute top-2 right-2 p-1 rounded hover:bg-black/10",
      className
    )}
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
};

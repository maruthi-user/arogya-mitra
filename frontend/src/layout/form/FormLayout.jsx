import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@layout/ui/button";
import { useFocusTrap } from "@layout/hooks/useFocusTrap";

const SIZES = {
  sm: "sm:max-w-md",
  md: "sm:max-w-xl md:max-w-2xl",
  lg: "sm:max-w-xl md:max-w-2xl lg:max-w-[820px]",
  xl: "sm:max-w-2xl md:max-w-4xl lg:max-w-6xl",
};

// Radix selects/popovers render in a portal; Esc should close those first.
const hasOpenPopup = () =>
  !!document.querySelector("[data-radix-popper-content-wrapper], [role='listbox']");

/**
 * The one form container for every application: a modal that is always
 * centred on screen.
 *
 *  - Esc closes it (unless a dropdown inside is open - that closes first).
 *  - Double-clicking the dimmed backdrop closes it. A single click does not,
 *    so a stray click never throws away typed data.
 *  - Pass `closeOnEscape={false}` / `closeOnBackdropDoubleClick={false}` to
 *    lock a form while it is saving.
 *
 * Use `variant="inline"` to render the form in the page instead of a modal.
 */
export default function FormLayout({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "lg",
  variant = "center",
  closeOnEscape = true,
  closeOnBackdropDoubleClick = true,
}) {
  const modalRef = useRef(null);
  const titleId = useId();
  const inline = variant === "inline";
  useFocusTrap(modalRef, isOpen && !inline);

  useEffect(() => {
    if (!isOpen || inline || !closeOnEscape) return undefined;
    const onKeyDown = (e) => {
      if (e.key !== "Escape" || e.defaultPrevented || hasOpenPopup()) return;
      e.stopPropagation();
      onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, inline, closeOnEscape, onClose]);

  useEffect(() => {
    if (!isOpen || inline) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen, inline]);

  if (!isOpen) return null;

  const panel = (
    <div
      ref={modalRef}
      role={inline ? undefined : "dialog"}
      aria-modal={inline ? undefined : "true"}
      aria-labelledby={titleId}
      className={
        inline
          ? "flex h-full w-full flex-col rounded-xl border border-border bg-card text-card-foreground"
          : `relative z-[110] flex max-h-[90dvh] w-[calc(100vw-2rem)] ${SIZES[size] || SIZES.lg} animate-in fade-in zoom-in-95 flex-col rounded-2xl border border-border bg-card text-card-foreground shadow-[var(--shadow-pop)] duration-150`
      }
    >
      <div className="sticky top-0 z-20 flex shrink-0 items-center justify-between rounded-t-2xl border-b border-border bg-card px-4 py-2.5">
        <h2 id={titleId} className="text-base font-semibold md:text-lg">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {footer}
          {onClose && (
            <Button variant="ghost" onClick={onClose} aria-label="Close form" className="h-9 w-9 shrink-0 rounded-full p-0">
              <X size={20} />
            </Button>
          )}
        </div>
      </div>

      <div className="thin-scrollbar flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
    </div>
  );

  if (inline) return panel;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
        onDoubleClick={closeOnBackdropDoubleClick ? onClose : undefined}
        aria-hidden="true"
      />
      {panel}
    </div>
  );
}

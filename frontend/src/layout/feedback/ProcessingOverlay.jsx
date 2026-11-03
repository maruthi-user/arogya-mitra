import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { Loader2 } from "lucide-react";
import {
  resetProcessing,
  selectIsProcessing,
  selectProcessingLabel,
  selectProcessingSince,
} from "@layout/store/processingSlice";
import { PROCESSING_LOCK_TIMEOUT_MS } from "@layout/utils/processingLock";

/**
 * The visible half of the global processing lock (see processingSlice /
 * runWithProcessingLock). Mounted once, at the app root.
 *
 * While the app is processing it blocks interaction with the PAGE only -
 * never the browser: tabs, the address bar, reload, devtools and every
 * browser shortcut keep working. Three layers, from most to least robust:
 *
 *   1. `inert` on the app root (#root). One attribute makes the whole app
 *      unclickable, unfocusable and invisible to assistive tech, exactly
 *      like a modal backdrop does for what's behind it. The overlay itself
 *      is portalled to <body>, outside #root, so it stays live.
 *   2. A full-viewport backdrop that swallows pointer events, for browsers
 *      without `inert` (very old Safari/Firefox) and for the gap before the
 *      attribute applies.
 *   3. A capture-phase key filter on the document that drops the keys that
 *      would act on the page (Enter, Space, Tab, arrows, typing) but lets
 *      every modifier / function-key combination through, so Ctrl+R, F5,
 *      Ctrl+T, Ctrl+W, Alt+Tab etc. still reach the browser.
 *
 * The lock is instant (a second click during a save never lands) but the
 * spinner card fades in after a short delay, so a fast request never
 * flashes an overlay. A watchdog force-releases a lock that outlives
 * PROCESSING_LOCK_TIMEOUT_MS in case a caller bypassed the helper's finally.
 */
export default function ProcessingOverlay() {
  const dispatch = useDispatch();
  const isProcessing = useSelector(selectIsProcessing);
  const label = useSelector(selectProcessingLabel);
  const since = useSelector(selectProcessingSince);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!isProcessing) return undefined;

    const root = document.getElementById("root");
    const previouslyFocused = document.activeElement;
    root?.setAttribute("inert", "");
    root?.setAttribute("aria-busy", "true");
    // Park focus on the overlay so Tab/Enter have nothing behind it to act on.
    overlayRef.current?.focus({ preventScroll: true });

    const swallowKeys = (event) => {
      // Anything with a modifier or an F-key is (potentially) a browser
      // shortcut - never interfere with those.
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (/^F\d{1,2}$/.test(event.key)) return;
      if (event.key === "Escape") return; // lets the browser stop loads, exit fullscreen
      event.preventDefault();
      event.stopPropagation();
    };
    const warnBeforeUnload = (event) => {
      // The write is still in flight - leaving now may lose it.
      event.preventDefault();
      event.returnValue = "";
    };
    document.addEventListener("keydown", swallowKeys, true);
    document.addEventListener("keypress", swallowKeys, true);
    window.addEventListener("beforeunload", warnBeforeUnload);

    return () => {
      document.removeEventListener("keydown", swallowKeys, true);
      document.removeEventListener("keypress", swallowKeys, true);
      window.removeEventListener("beforeunload", warnBeforeUnload);
      root?.removeAttribute("inert");
      root?.removeAttribute("aria-busy");
      // Give focus back to whatever had it (the Save button, usually).
      if (previouslyFocused && typeof previouslyFocused.focus === "function" && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [isProcessing]);

  // Watchdog: runWithProcessingLock releases on its own, but if the page has
  // been locked longer than any single operation is allowed to hold it,
  // something bypassed the helper - unlock rather than strand the user.
  useEffect(() => {
    if (!isProcessing || since == null) return undefined;
    const remaining = Math.max(0, since + PROCESSING_LOCK_TIMEOUT_MS + 1000 - Date.now());
    const timer = setTimeout(() => {
      console.warn("[processingLock] page lock outlived its timeout - force releasing.");
      dispatch(resetProcessing());
    }, remaining);
    return () => clearTimeout(timer);
  }, [isProcessing, since, dispatch]);

  if (!isProcessing) return null;

  const stop = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return createPortal(
    <div
      ref={overlayRef}
      tabIndex={-1}
      role="alertdialog"
      aria-modal="true"
      aria-live="polite"
      aria-label={label || "Processing"}
      onMouseDown={stop}
      onClick={stop}
      onContextMenu={stop}
      className="processing-overlay fixed inset-0 z-[9999] flex select-none items-center justify-center bg-black/10 outline-none backdrop-blur-[1px] dark:bg-black/30"
      style={{ cursor: "progress" }}
    >
      <div className="processing-overlay__card flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-700 shadow-xl dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-blue-600" />
        <div className="flex flex-col">
          <span className="font-medium">{label || "Processing…"}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Please wait, don't close this page.</span>
        </div>
      </div>
    </div>,
    document.body
  );
}

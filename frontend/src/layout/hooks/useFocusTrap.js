import { useEffect } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

const isFieldLike = (el) =>
  ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName) ||
  el.getAttribute("role") === "combobox";

export function useFocusTrap(ref, active = true, initialFocusRef = null) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const container = ref.current;

    const getFocusable = () =>
      Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );

    const id = requestAnimationFrame(() => {
      const els = getFocusable();
      let target = initialFocusRef?.current || null;

      if (!target) {
        target = els.find(isFieldLike) || els[0] || container;
      }

      if (target && typeof target.focus === "function") {
        target.focus();
      }
    });

    const handleKeyDown = (e) => {
      if (e.key !== "Tab") return;

      const list = getFocusable();
      if (list.length === 0) {
        e.preventDefault();
        return;
      }

      const first = list[0];
      const last = list[list.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (activeEl === last || !container.contains(activeEl)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      cancelAnimationFrame(id);
    };
  }, [active, ref, initialFocusRef]);
}

export default useFocusTrap;

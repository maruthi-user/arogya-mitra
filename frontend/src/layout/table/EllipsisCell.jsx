import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const POPUP_MAX_WIDTH = 240;

export default function EllipsisCell({
  value,
  className = "",
  align = "left",
  pill = false,
  startOnMobile = true,
  onClick,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const popupRef = useRef(null);
  const pressRef = useRef(null);

  // Popup renders through a portal (position: fixed, anchored to the trigger's
  // live screen position) instead of being absolutely positioned inside the
  // cell. That way it can never be clipped by a table/card wrapper's
  // overflow-hidden/overflow-x-auto.
  //
  // Positioning is two-pass: the popup sizes to its own content (capped by
  // maxWidth), so we can't know its real width until it's actually in the
  // DOM. The clamp-to-viewport check has to use that real width - using the
  // maxWidth cap as a stand-in would treat every popup as if it were the
  // longest possible value and shift even short ones (e.g. a short name)
  // away from sitting exactly under the trigger, when they'd never actually
  // overflow the viewport at their real size.
  const computePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const popupEl = popupRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 8;

    const maxWidth = Math.min(POPUP_MAX_WIDTH, viewportWidth - margin * 2);
    const actualWidth = popupEl
      ? Math.min(popupEl.getBoundingClientRect().width, maxWidth)
      : maxWidth;

    let left = rect.left;
    if (left + actualWidth > viewportWidth - margin) left = viewportWidth - actualWidth - margin;
    if (left < margin) left = margin;

    const actualHeight = popupEl ? popupEl.getBoundingClientRect().height : 0;
    let top = rect.bottom + 4;
    if (top + actualHeight > viewportHeight && rect.top > actualHeight) {
      top = rect.top - actualHeight - 4;
    }

    setPosition({ top, left, maxWidth });
  }, []);

  // Runs synchronously after the (initially off-screen/hidden) popup mounts,
  // so it can measure its real width before ever being shown - no flicker.
  useLayoutEffect(() => {
    if (!isOpen) return;
    computePosition();
  }, [isOpen, computePosition]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handle = () => computePosition();
    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, true);

    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle, true);
    };
  }, [isOpen, computePosition]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOnOutside = (e) => {
      if (containerRef.current && containerRef.current.contains(e.target)) return;
      if (popupRef.current && popupRef.current.contains(e.target)) return;
      setIsOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("touchstart", closeOnOutside);

    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("touchstart", closeOnOutside);
    };
  }, [isOpen]);

  const displayValue = value === undefined || value === null || value === ""
    ? "-"
    : Array.isArray(value)
      ? value.join(", ")
      : String(value);

  const alignClass = startOnMobile
    ? align === "center"
      ? "text-left sm:text-center"
      : "text-left sm:text-left"
    : align === "center"
      ? "text-right sm:text-center"
      : "text-right sm:text-left";

  /**
   * The trigger used to be a <button>, which browsers make unselectable, so
   * the text could not be copied. It is a plain span now - a drag that selects
   * text must not be mistaken for a click on the trigger.
   */
  const isTextSelection = (e) => {
    const start = pressRef.current;
    const moved =
      start &&
      (Math.abs(e.clientX - start.x) > 4 || Math.abs(e.clientY - start.y) > 4);

    const selection = window.getSelection?.();
    const hasSelection = !!selection && !selection.isCollapsed;

    return moved || hasSelection;
  };

  const toggle = (e) => {
    e.stopPropagation();
    if (isTextSelection(e)) return;
    // When the consumer owns the click (e.g. an inline editor/dropdown in the
    // cell), run that instead of the internal full-value popover - the hover
    // `title` tooltip and truncation still work exactly the same.
    if (onClick) {
      onClick(e);
      return;
    }
    setPosition(null);
    setIsOpen((prev) => !prev);
  };

  return (
    <div
      ref={containerRef}
      // Follows the column width when the column has one (resized or defined),
      // otherwise falls back to the fixed cap so auto-sized columns keep their
      // current widths instead of stretching to the longest value.
      style={{ maxWidth: `var(--ellipsis-max-w, ${pill ? "130px" : "180px"})` }}
      className={`relative ${startOnMobile ? "ml-0 sm:ml-0" : "ml-auto sm:ml-0"} ${pill ? "w-max" : ""}`}
    >
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        title={displayValue}
        onMouseDown={(e) => {
          pressRef.current = { x: e.clientX, y: e.clientY };
        }}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            if (onClick) {
              onClick(e);
              return;
            }
            setPosition(null);
            setIsOpen((prev) => !prev);
          }
        }}
        className={`${
          pill
            ? "inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-sm sm:text-xs font-semibold"
            : "block w-full"
        } ${alignClass} truncate whitespace-nowrap overflow-hidden cursor-pointer select-text ${className}`}
      >
        {displayValue}
      </span>

      {isOpen &&
        createPortal(
          <div
            ref={popupRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              top: position ? position.top : -9999,
              left: position ? position.left : -9999,
              maxWidth: position ? position.maxWidth : POPUP_MAX_WIDTH,
              visibility: position ? "visible" : "hidden",
            }}
            className="fixed z-[999999] w-max rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 shadow-lg text-xs font-medium text-foreground text-left whitespace-normal break-words select-text"
          >
            {displayValue}
          </div>,
          document.body
        )}
    </div>
  );
}

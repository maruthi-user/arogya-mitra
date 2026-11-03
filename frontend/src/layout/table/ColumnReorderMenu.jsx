import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  ChevronDown,
  ChevronUp,
  Columns3,
  GripVertical,
  Pin,
  RotateCcw,
  X,
} from "lucide-react";
import { columnLabel } from "./useColumnLayout";

const DROPDOWN_WIDTH = 320;

/**
 * Column popover shown next to the pagination controls.
 *
 * The list is built from whatever columns the table was given - nothing about
 * the column set is hardcoded here. From one row you can show/hide a column,
 * pin it to either edge, and drag it to reorder; the table updates live and
 * the result is remembered per user.
 *
 * `columns` must include hidden ones, otherwise a column could be hidden and
 * never brought back.
 */
const ColumnReorderMenu = ({
  columns = [],
  onMoveColumn,
  onToggleColumn,
  onPinColumn,
  onShowAll,
  onReset,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [draggingId, setDraggingId] = useState(null);

  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;

    const rect = btnRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const width = Math.min(DROPDOWN_WIDTH, viewportWidth - 32);

    let left = rect.right - width;
    if (left + width > viewportWidth - 16) left = viewportWidth - width - 16;
    if (left < 16) left = 16;

    const estimatedHeight = Math.min(420, 96 + columns.length * 34);
    let top = rect.bottom + 6;

    if (
      rect.bottom + estimatedHeight > viewportHeight &&
      rect.top > estimatedHeight
    ) {
      top = rect.top - estimatedHeight - 6;
    }

    setPosition({ top, left, width });
  }, [columns.length]);

  useEffect(() => {
    if (!open) return undefined;

    updatePosition();

    const handle = () => updatePosition();
    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, true);

    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return undefined;

    const handler = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        btnRef.current &&
        !btnRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const onEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const handleDragOver = (event, targetId) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    if (draggingId && draggingId !== targetId) {
      // Reorder while dragging so the table updates immediately.
      onMoveColumn?.(draggingId, targetId);
    }
  };

  /** Keyboard/tap fallback so the list is usable without dragging. */
  const nudge = (id, direction) => {
    const index = columns.findIndex((col) => col.__id === id);

    // Step past hidden columns: they are absent from the table, so
    // swapping with one would look like nothing happened.
    for (
      let next = index + direction;
      next >= 0 && next < columns.length;
      next += direction
    ) {
      if (!columns[next].__hidden) {
        onMoveColumn?.(id, columns[next].__id);
        return;
      }
    }
  };

  const hiddenCount = columns.filter((col) => col.__hidden).length;
  const visibleCount = columns.length - hiddenCount;

  if (!columns.length) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        title="Columns"
        aria-label="Show, hide, pin and reorder columns"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="
       hidden md:flex
    items-center justify-center
    h-8 w-8
    border border-gray-300 dark:border-gray-700
    rounded-md
     dark:bg-gray-900
    hover:bg-gray-100 dark:hover:bg-gray-700
    disabled:opacity-40
    transition-colors
        "
      >
        <Columns3 size={15} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
            }}
            className="
              fixed
              z-[999999]
              bg-white dark:bg-gray-900
              border border-gray-200 dark:border-gray-700
              rounded-xl
              shadow-xl
              flex flex-col
              max-h-[70vh]
            "
          >
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                Columns
                {hiddenCount > 0 && (
                  <span className="ml-1 font-normal text-gray-500">
                    ({visibleCount} of {columns.length})
                  </span>
                )}
              </h3>

              <div className="flex items-center gap-1">
                {hiddenCount > 0 && onShowAll && (
                  <button
                    type="button"
                    title="Show all columns"
                    onClick={onShowAll}
                    className="rounded px-1.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                  >
                    Show all
                  </button>
                )}
                {onReset && (
                  <button
                    type="button"
                    title="Reset columns to default"
                    onClick={onReset}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <ul
              className="flex-1 overflow-y-auto p-1.5"
              onDragOver={(event) => event.preventDefault()}
            >
              {columns.map((col) => {
                const isDragging = draggingId === col.__id;
                const isHidden = !!col.__hidden;
                const pin = col.__pinned ?? null;

                return (
                  <li
                    key={col.__id}
                    draggable={!isHidden}
                    onDragStart={(event) => {
                      setDraggingId(col.__id);
                      event.dataTransfer.effectAllowed = "move";
                      // Firefox needs payload for dragging to start at all.
                      event.dataTransfer.setData("text/plain", col.__id);
                    }}
                    onDragOver={(event) => handleDragOver(event, col.__id)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDraggingId(null);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        nudge(col.__id, -1);
                      }
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        nudge(col.__id, 1);
                      }
                    }}
                    className={`
                      flex items-center gap-2
                      px-2 py-1.5
                      rounded-md
                      cursor-grab active:cursor-grabbing
                      select-none
                      text-xs
                      text-gray-700 dark:text-gray-200
                      hover:bg-gray-100 dark:hover:bg-gray-800
                      focus:outline-none focus:ring-1 focus:ring-blue-500
                      ${isDragging ? "opacity-50 bg-blue-50 dark:bg-blue-900/30" : ""}
                    `}
                  >
                    {/* Show / hide */}
                    <input
                      type="checkbox"
                      checked={!isHidden}
                      disabled={!isHidden && visibleCount <= 1}
                      title={
                        !isHidden && visibleCount <= 1
                          ? "At least one column must stay visible"
                          : isHidden
                            ? "Show this column"
                            : "Hide this column"
                      }
                      onClick={(event) => event.stopPropagation()}
                      onMouseDown={(event) => event.stopPropagation()}
                      onTouchStart={(event) => event.stopPropagation()}
                      onChange={() => onToggleColumn?.(col.__id)}
                      className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                    />

                    <GripVertical
                      size={14}
                      className={`shrink-0 ${isHidden ? "text-gray-200 dark:text-gray-700" : "text-gray-400"}`}
                    />

                    <span
                      className={`truncate flex-1 ${isHidden ? "text-gray-400 line-through dark:text-gray-500" : ""}`}
                      title={columnLabel(col)}
                    >
                      {columnLabel(col)}
                    </span>

                    {/* Pin to either edge. Clicking the active side unpins. */}
                    <div className="flex shrink-0 items-center gap-0.5">
                      {/* Left */}
                      <button
                        type="button"
                        disabled={isHidden}
                        title={pin === "left" ? "Unpin" : "Pin to left"}
                        aria-label={pin === "left" ? "Unpin column" : "Pin column left"}
                        aria-pressed={pin === "left"}
                        onClick={(event) => {
                          event.stopPropagation();
                          onPinColumn?.(
                            col.__id,
                            pin === "left" ? null : "left"
                          );
                        }}
                        className={`rounded p-1 disabled:opacity-30 ${pin === "left"
                            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"
                            : "text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                          }`}
                      >
                        {pin === "left" ? (
                          <Pin size={13} fill="currentColor" />
                        ) : (
                          <ArrowLeftToLine size={13} />
                        )}
                      </button>

                      {/* Right */}
                      <button
                        type="button"
                        disabled={isHidden}
                        title={pin === "right" ? "Unpin" : "Pin to right"}
                        aria-label={pin === "right" ? "Unpin column" : "Pin column right"}
                        aria-pressed={pin === "right"}
                        onClick={(event) => {
                          event.stopPropagation();
                          onPinColumn?.(
                            col.__id,
                            pin === "right" ? null : "right"
                          );
                        }}
                        className={`rounded p-1 disabled:opacity-30 ${pin === "right"
                            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"
                            : "text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                          }`}
                      >
                        {pin === "right" ? (
                          <Pin size={13} fill="currentColor" />
                        ) : (
                          <ArrowRightToLine size={13} />
                        )}
                      </button>
                    </div>

                    {/* Tap-friendly reorder controls - HTML5 drag does not
                        fire on touch devices (iPad/tablets), so these buttons
                        give every device a way to move columns. */}
                    <div className="hidden md:flex lg:hidden shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        disabled={isHidden}
                        title="Move up"
                        aria-label="Move column up"
                        onClick={(event) => {
                          event.stopPropagation();
                          nudge(col.__id, -1);
                        }}
                        className="rounded p-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={isHidden}
                        title="Move down"
                        aria-label="Move column down"
                        onClick={(event) => {
                          event.stopPropagation();
                          nudge(col.__id, 1);
                        }}
                        className="rounded p-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <p className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
              Drag to reorder, tick to show or hide, pin a column to an edge,
              or freeze it in place. Your layout is saved for next time.
            </p>
          </div>,
          document.body
        )}
    </>
  );
};

export default ColumnReorderMenu;

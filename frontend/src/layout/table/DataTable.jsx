import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore, memo } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, Loader } from "lucide-react";
import EllipsisCell from "./EllipsisCell";
import useColumnLayout from "./useColumnLayout";

const TABLE_LAYOUT_QUERY = "(min-width: 640px)";

const subscribeToTableLayout = (onChange) => {
  const mql = window.matchMedia(TABLE_LAYOUT_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
};

const getTableLayoutSnapshot = () =>
  window.matchMedia(TABLE_LAYOUT_QUERY).matches;

/** Sticky columns only make sense once the mobile card layout is gone (sm+). */
const useTableLayoutActive = (disableMobile) => {
  const isWide = useSyncExternalStore(
    subscribeToTableLayout,
    getTableLayoutSnapshot,
    () => true
  );

  return disableMobile || isWide;
};

/** Only paint the sticky separation shadow when there is something to scroll. */
const useHorizontalOverflow = (ref) => {
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const check = () =>
      setOverflowing(node.scrollWidth - node.clientWidth > 1);

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(check)
        : null;

    observer?.observe(node);

    // The table itself grows when a column is resized while the scroll
    // container keeps the same width, so watch both.
    const table = node.querySelector("table");
    if (table) observer?.observe(table);

    const initial = setTimeout(check, 0);
    node.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);

    return () => {
      clearTimeout(initial);
      observer?.disconnect();
      node.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [ref]);

  return overflowing;
};

const toCssSize = (value) =>
  value == null || value === "" ? null : typeof value === "number" ? `${value}px` : value;

const DataTable = ({
  columns = [],
  data = [],
  onSort,
  sortKey,
  sortDirection,
  loading = false,
  disableMobile = false,
  expandedRowId,
  renderExpandedRow,
  // Optional row id: when it changes to a non-null value, that row's full
  // record is revealed on mobile (used e.g. so the "edit" action shows the
  // recovery inputs, which live in non-mobile columns).
  forceExpandRowId,
  enableStickyColumns = true,
  enableColumnResize = true,
  autoFreezeOnScroll = false,
  columnLayout: externalLayout,
  getRowId = (row, index) => row.id ?? row.ID ?? index,
  dense = false,
  // Row virtualisation (see below): on by default, kicks in above the threshold.
  virtualize = true,
  virtualThreshold = 50,
  overscan = 8,
}) => {
  const [expandedRow, setExpandedRow] = useState(null);

  const scrollRef = useRef(null);

  // Used when DataTable is rendered on its own (without the Table wrapper),
  // so resizing and sticky columns work everywhere.
  const internalLayout = useColumnLayout(columns);
  const layout = externalLayout || internalLayout;

  const tableLayoutActive = useTableLayoutActive(disableMobile);
  const isOverflowing = useHorizontalOverflow(scrollRef);

  // The table body lives in an inner scroll container (max-height ~70vh), so
  // when a new page's rows are fetched the old scroll offset persists and the
  // fresh records appear scrolled mid-way. Reset the container to the top on
  // every data change so the first record is visible after a page change.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [data]);

  const stickyActive = enableStickyColumns && tableLayoutActive;
  const layoutColumns = layout.layoutColumns;
  const { measuredSizes } = layout;

  // Scroll-driven freeze (opt-in via autoFreezeOnScroll): tracks the horizontal
  // scroll offset so the leading unpinned column can freeze into a rail while
  // the table is scrolled. rAF-throttled - at most one state update per frame.
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    if (!autoFreezeOnScroll) return undefined;

    // The scroll container mounts once `loading` flips false.
    const node = scrollRef.current;
    if (!node) return undefined;

    let raf = 0;
    const handle = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setScrollLeft(node.scrollLeft);
      });
    };

    node.addEventListener("scroll", handle, { passive: true });
    return () => {
      node.removeEventListener("scroll", handle);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [autoFreezeOnScroll, loading]);

  // With the feature on, the table overflowing, and the user scrolled away
  // from the start, the first column carrying no pin freezes at the left edge
  // (just past whatever columns already hold it) - a freeze-pane rail. Columns
  // with explicit pins or freezes always win and keep their own treatment.
  const renderColumns = useMemo(() => {
    if (!autoFreezeOnScroll || !stickyActive || !isOverflowing || scrollLeft <= 0) {
      return layoutColumns;
    }

    const anchorIndex = layoutColumns.findIndex((col) => !col.__pinned);
    if (anchorIndex === -1) return layoutColumns;

    let offset = 0;
    for (let index = 0; index < anchorIndex; index += 1) {
      const col = layoutColumns[index];
      offset += col.__size ?? measuredSizes[col.__id] ?? 0;
    }

    return layoutColumns.map((col, index) =>
      index === anchorIndex
        ? {
            ...col,
            __sticky: "left",
            __stickyOffset: offset,
            __stickyEdge: true,
            __autoFrozen: true,
          }
        : col
    );
  }, [
    autoFreezeOnScroll,
    stickyActive,
    isOverflowing,
    scrollLeft,
    layoutColumns,
    measuredSizes,
  ]);

  // ---- Row virtualisation -------------------------------------------------
  // Only the rows near the viewport are mounted; the rest are two spacer rows
  // (top and bottom) with the height of the skipped rows, so the scrollbar and
  // sticky header keep working. Active for the desktop table layout once there
  // are more than `virtualThreshold` rows and no row is expanded (expanded
  // rows have a different height). Mobile card view renders every row.
  const virtualActive =
    virtualize &&
    tableLayoutActive &&
    !loading &&
    expandedRowId == null &&
    data.length > virtualThreshold;

  const bodyRef = useRef(null);
  const [rowHeight, setRowHeight] = useState(dense ? 33 : 41);
  const [viewport, setViewport] = useState({ top: 0, height: 600 });

  useEffect(() => {
    if (!virtualActive) return undefined;
    const node = scrollRef.current;
    if (!node) return undefined;

    let raf = 0;
    const read = () => {
      raf = 0;
      setViewport((prev) =>
        prev.top === node.scrollTop && prev.height === node.clientHeight
          ? prev
          : { top: node.scrollTop, height: node.clientHeight }
      );
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };

    read();
    node.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      node.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [virtualActive]);

  // Use the real average height of the rendered rows (rows can wrap).
  useEffect(() => {
    if (!virtualActive) return;
    const rows = bodyRef.current?.querySelectorAll("tr[data-vrow]");
    if (!rows || rows.length === 0) return;
    let sum = 0;
    rows.forEach((r) => {
      sum += r.getBoundingClientRect().height;
    });
    const avg = sum / rows.length;
    if (avg > 0 && Math.abs(avg - rowHeight) > 1) setRowHeight(avg);
  });

  const totalRows = data.length;
  let startIndex = 0;
  let endIndex = totalRows;
  if (virtualActive) {
    startIndex = Math.max(0, Math.floor(viewport.top / rowHeight) - overscan);
    endIndex = Math.min(totalRows, Math.ceil((viewport.top + viewport.height) / rowHeight) + overscan);
  }
  const visibleRows = virtualActive ? data.slice(startIndex, endIndex) : data;

  const toggleExpand = (index) => {
    if (disableMobile) return;
    setExpandedRow((prev) => (prev === index ? null : index));
  };

  // Reveal the full record (mobile) for forceExpandRowId when it changes,
  // so actions like "edit recovery" make their inputs visible on phones.
  const lastForcedRef = useRef(null);
  useEffect(() => {
    if (
      disableMobile ||
      forceExpandRowId == null ||
      lastForcedRef.current === forceExpandRowId
    )
      return;
    lastForcedRef.current = forceExpandRowId;
    const idx = data.findIndex(
      (row, i) => getRowId(row, i) === forceExpandRowId
    );
    if (idx !== -1) setExpandedRow(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceExpandRowId]);

  /* Width comes from a live resize first, then the column definition. */
  const sizeStyle = (col) => {
    // Below sm the rows collapse into stacked cards, where a column's table
    // width would squeeze every field into its desktop size (a 100px "Hours"
    // column becomes a 100px-wide card row) instead of spanning the card.
    // Widths belong to the real table layout only.
    if (!tableLayoutActive) return {};

    const size = toCssSize(col.__size) ?? toCssSize(col.width);
    if (!size) return {};

    return {
      width: size,
      minWidth: size,
      maxWidth: size,
      // Once a column has a definite width, truncating cells follow it instead
      // of their own fallback cap - widen the column, see more of the value.
      // Inherited through CSS, so it reaches EllipsisCell inside col.render too.
      "--ellipsis-max-w": "100%",
    };
  };

  const stickyStyle = (col, zIndex) => {
    if (!stickyActive || !col.__sticky) return {};

    // Left-edge and frozen ("freeze here") columns both measure their offset
    // from the left edge; right-edge columns measure from the right edge so
    // any number of right pins can stack without overlapping.
    return col.__sticky === "right"
      ? { position: "sticky", right: col.__stickyOffset, zIndex }
      : { position: "sticky", left: col.__stickyOffset, zIndex };
  };

  const stickyClass = (col) => {
    if (!stickyActive || !col.__sticky) return "";

    // Frozen columns are passed by content scrolling past their right edge,
    // so they inherit the right-edge shadow (mirrored from the left-pin look).
    const isLeftEdge = col.__sticky === "left";
    const edge =
      col.__stickyEdge && isOverflowing
        ? isLeftEdge
          ? "border-gray-200 dark:border-gray-700 shadow-[2px_0_5px_-3px_rgba(0,0,0,0.35)]"
          : "border-gray-200 dark:border-gray-700 shadow-[-2px_0_5px_-3px_rgba(0,0,0,0.35)]"
        : "";

    return `${edge}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="w-full overflow-x-auto overflow-y-auto rounded-lg bg-white dark:bg-gray-900"
      style={{
        maxHeight: "70vh",
      }}
    >
      <table
        className="w-full table-auto border-collapse"
        aria-rowcount={totalRows + 1}
      >

        {/* HEADER */}
        <thead
          className={`
          sticky top-0 z-50
          bg-white dark:bg-gray-900 
          border border-gray-200 dark:border-gray-700
          ${disableMobile
              ? "table-header-group"
              : "hidden sm:table-header-group"
            }
        `}
        >

          <tr>
            {renderColumns.map((col) => {
              const isSorted = sortKey === col.accessor;
              const isResizing = layout.resizingId === col.__id;

              return (
                <th
                  key={col.__id}
                  ref={layout.measureRef(col.__id)}
                  onClick={() => col.sortable && onSort?.(col.accessor)}
                  className={`
  relative
  px-3 ${dense ? "py-2" : "py-3"}
  text-sm
  font-semibold
  whitespace-nowrap
  bg-white dark:bg-gray-900
  ${col.headerClass || "text-left"}
  ${stickyClass(col)}
`}
                  style={{
                    ...sizeStyle(col),
                    ...stickyStyle(col, col.__sticky ? 60 : undefined),
                  }}
                >
                  <div
                    className={`flex items-center gap-1 overflow-hidden ${col.headerClass?.includes("text-center")
                      ? "justify-center"
                      : ""
                      }`}
                  >
                    <span className="truncate">{col.header}</span>

                    {col.sortable && (
                      <span className="ml-1 inline-flex shrink-0 items-center">
                        {isSorted ? (
                          sortDirection === "asc" ? (
                            <ChevronUp
                              size={14}
                              strokeWidth={3}
                              className="text-blue-600 dark:text-blue-400"
                            />
                          ) : (
                            <ChevronDown
                              size={14}
                              strokeWidth={3}
                              className="text-blue-600 dark:text-blue-400"
                            />
                          )
                        ) : (
                          <ChevronsUpDown
                            size={14}
                            strokeWidth={2}
                            className="text-gray-300 dark:text-gray-600"
                          />
                        )}
                      </span>
                    )}
                  </div>

                  {/* RESIZE HANDLE */}
                  {enableColumnResize && (
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      aria-label="Resize column"
                      onMouseDown={(e) => layout.startResize(e, col.__id)}
                      onTouchStart={(e) => layout.startResize(e, col.__id)}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        layout.resizeColumn(col.__id, layout.minColumnWidth);
                      }}
                      className={`
                        absolute top-0 right-0
                        h-full w-[6px]
                        flex items-center justify-center
                        cursor-col-resize select-none touch-none
                        group
                        ${isResizing ? "bg-blue-500/20" : ""}
                      `}
                    >
                      <span
                        className={`
                          block h-1/2 w-px
                          ${isResizing
                            ? "bg-blue-500"
                            : "bg-gray-200 dark:bg-gray-700 group-hover:bg-blue-500"
                          }
                        `}
                      />
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        {/* BODY */}
        <tbody ref={bodyRef} className="divide-y divide-gray-100 dark:divide-gray-800">
          {data.length === 0 && (
            <tr>
              <td
                colSpan={renderColumns.length}
                className="py-10 text-center text-sm text-gray-500"
              >
                No records available
              </td>
            </tr>
          )}

          {virtualActive && startIndex > 0 && (
            <tr aria-hidden="true" style={{ height: startIndex * rowHeight, borderTopWidth: 0 }}>
              <td colSpan={renderColumns.length} className="p-0" />
            </tr>
          )}

          {visibleRows.map((row, visibleIndex) => {
            const rowIndex = startIndex + visibleIndex;
            const rowId = getRowId(row, rowIndex);
            const isExpanded = expandedRowId === rowId;

            // The background class goes on the <tr>; sticky cells pick it up
            // with `bg-inherit` so a pinned column is opaque AND follows the
            // row. Giving the sticky <td> the same class instead made its
            // `hover:` variant fire on the CELL, so hovering lit up one column
            // at a time rather than the whole row. In mobile card view the
            // tapped/expanded row gets a blue highlight; otherwise custom row
            // colours or the default win.
            const isMobileExpanded =
              !tableLayoutActive && expandedRow === rowIndex;

            const rowBackground = isMobileExpanded
              ? "bg-blue-50 dark:bg-blue-950/40"
              : row.__rowClass || "bg-white dark:bg-gray-900";

            return (
              <React.Fragment key={rowId}>
                <tr
                  data-vrow=""
                  aria-rowindex={rowIndex + 2}
                  onClick={(e) => {
                    // Clicks on interactive elements inside a row (action
                    // buttons, edit inputs, links) must not toggle the
                    // mobile record expansion - only the row background does.
                    if (
                      e.target.closest(
                        "button, a, input, textarea, select, label"
                      )
                    )
                      return;
                    toggleExpand(rowIndex);
                  }}
                  className={`
      ${disableMobile
                      ? "table-row"
                      : "flex flex-col sm:table-row"
                    }

      border border-gray-200 dark:border-gray-700

      ${disableMobile
                      ? "border-x-0 border-t-0 border-b"
                      : "sm:border-x-0 sm:border-t-0 sm:border-b rounded-md sm:rounded-none"
                    }

      ${rowBackground}
      ${isMobileExpanded
                      ? "ring-1 ring-inset ring-blue-300 dark:ring-blue-700"
                      : ""}

      transition-colors
  `}
                >
                  {renderColumns.map((col) => {
                    const value = row[col.accessor];

                    const isPrimary = col.mobile === true;

                    const isCellCentered =
                      col.cellClass?.includes("text-center");

                    const isVisibleMobile = disableMobile
                      ? true
                      : col.hideOnMobile
                        ? false
                        : isPrimary || expandedRow === rowIndex;

                    const isSticky = stickyActive && !!col.__sticky;

                    return (
                      <td
                        key={col.__id}
                        className={`
    ${!isVisibleMobile ? "hidden sm:table-cell" : ""}
    ${disableMobile ? "table-cell" : "sm:table-cell"}
     px-3 ${dense ? "py-1.5 sm:py-1" : "py-1.5 sm:py-2"}
  text-sm
  text-gray-700 dark:text-gray-200
  ${col.__size ? "overflow-hidden" : ""}
  ${isSticky ? `bg-inherit ${stickyClass(col)}` : ""}
  ${col.cellClass || ""}
  `}
                        style={{
                          ...sizeStyle(col),
                          ...stickyStyle(col, 20),
                        }}
                      >
                        <div
                          className={
                            disableMobile
                              ? "block"
                              : "grid w-full grid-cols-[40%_60%] items-center sm:block"
                          }
                        >
                          {!disableMobile && (
                            <span className="text-gray-500 sm:hidden font-medium text-left min-w-0 break-words whitespace-normal">
                              {/* A column's header can be an interactive
                                  element (e.g. a "select all" checkbox) meant
                                  only for the desktop <thead>, which is
                                  already hidden below sm. Rendering that same
                                  element again here would repeat a live
                                  "select all" control as every row's label. */}
                              {typeof col.header === "string" || typeof col.header === "number"
                                ? col.header
                                : null}
                            </span>
                          )}

                          <span
  className={`
    min-w-0 break-words whitespace-normal
    ${disableMobile
      ? isCellCentered
        ? "text-center"
        : "text-left"
      : isCellCentered
        ? "text-left sm:text-center"
        : "text-left sm:text-left"
    }
    ${disableMobile
      ? ""
      : "[&>div]:flex-wrap sm:[&>div]:flex-nowrap"
    }
  `}
>
                            {col.render
                              ? col.render(value, row)
                              : <EllipsisCell
                                value={value}
                                align={isCellCentered ? "center" : "left"}
                                startOnMobile={!disableMobile}
                              />}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {isExpanded && renderExpandedRow && (
                  <tr className="dark:bg-gray-900">
                    <td colSpan={renderColumns.length} className="p-4">
                      {renderExpandedRow(row)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}

          {virtualActive && endIndex < totalRows && (
            <tr aria-hidden="true" style={{ height: (totalRows - endIndex) * rowHeight, borderTopWidth: 0 }}>
              <td colSpan={renderColumns.length} className="p-0" />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default memo(DataTable);

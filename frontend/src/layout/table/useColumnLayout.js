import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildLayoutKey,
  getCurrentUserId,
  readLayout,
  writeLayout,
} from "./tableLayoutStorage";

export const MIN_COLUMN_WIDTH = 60;
export const STICKY_LEFT_COUNT = 2;

const slugify = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Stable id for every column, derived from the column definition itself.
 * Priority: col.id -> col.accessor -> col.accessorKey -> slug(header).
 * Duplicate labels/accessors get a deterministic suffix so two columns
 * called "Actions" never share state. Never an array index.
 */
export function getColumnIds(columns = []) {
  const seen = new Map();

  return columns.map((col, index) => {
    const base =
      col?.id ??
      col?.accessor ??
      col?.accessorKey ??
      (typeof col?.header === "string" ? slugify(col.header) : "");

    const key = base === "" || base == null ? `column-${index}` : String(base);
    const used = seen.get(key) ?? 0;
    seen.set(key, used + 1);

    return used === 0 ? key : `${key}__${used + 1}`;
  });
}

/**
 * Sticky only renders correctly for columns sitting together at an edge, so
 * the order always keeps pinned-left first and pinned-right last. Relative
 * order inside each group is preserved, which is what makes "pin" feel like
 * "move to the edge and keep it there".
 */
function normalizeByPins(order, pinned) {
  const left = [];
  const middle = [];
  const right = [];

  order.forEach((id) => {
    if (pinned[id] === "left") left.push(id);
    else if (pinned[id] === "right") right.push(id);
    else middle.push(id);
  });

  return [...left, ...middle, ...right];
}

export function columnLabel(col) {
  if (!col) return "";
  if (typeof col.headerLabel === "string") return col.headerLabel;
  if (typeof col.header === "string") return col.header;
  return String(col.accessor ?? col.accessorKey ?? col.__id ?? "");
}

/**
 * Owns the whole column layout as maps keyed by stable id, plus the measured
 * widths used to derive sticky offsets:
 *
 *   columnOrder   = ["id", "name", "email"]
 *   columnSizes   = { id: 90, name: 220, email: 260 }
 *   hiddenColumns = ["email"]
 *   pinnedColumns = { id: "left", actions: "right", notes: "sticky" }
 *
 * Sticky is per column, not positional: a column sticks because the user (or
 * the seeded default) pinned it, and `normalizeByPins` keeps the pinned groups
 * at their edges so the offsets stay contiguous. Offsets are summed from live
 * measurements, so they follow resizing, reordering and hiding with nothing
 * hardcoded. The whole layout is persisted per user - see tableLayoutStorage.
 *
 * Pin values:
 *   "left"   slide the column to the left edge and hold it there.
 *   "right"  slide the column to the right edge and hold it there. Any number
 *            of right pins can stack - the offset for each is measured from
 *            the right edge, mirroring the left side.
 *   "sticky" freeze the column in place at its current position in the flow
 *            ("freeze here"). It never moves when the table scrolls.
 *   null     remove any pin and let the column scroll normally.
 */
export function useColumnLayout(columns = [], options = {}) {
  const {
    minColumnWidth = MIN_COLUMN_WIDTH,
    stickyLeftCount = STICKY_LEFT_COUNT,
    // Set to 0 to opt a table out of auto-pinning its last column right -
    // e.g. DSR, where the trailing "Task" column should scroll normally.
    defaultRightPinCount = 1,
    // Column ids that must never be pinned, even if an earlier visit to
    // this table saved a pin for them before the table opted out (saved
    // layouts otherwise win over defaultRightPinCount on every later load).
    forceUnpinnedIds = [],
  } = options;

  const stripForcedPins = (pins) => {
    if (!forceUnpinnedIds.length) return pins;
    const next = { ...pins };
    forceUnpinnedIds.forEach((id) => {
      delete next[id];
    });
    return next;
  };

  const ids = useMemo(() => getColumnIds(columns), [columns]);

  const columnsById = useMemo(() => {
    const map = new Map();
    ids.forEach((id, index) => map.set(id, { ...columns[index], __id: id }));
    return map;
  }, [columns, ids]);

  /* ---------------------------------------------------------------- */
  /* Persistence                                                       */
  /* ---------------------------------------------------------------- */

  // Layouts are saved per user, so two people sharing a browser keep their
  // own, and a layout survives logout to be restored on the next login.
  //
  // Key and stored layout are both resolved once, in a lazy initialiser, so
  // nothing is read or written during render. `ids` can be a new array every
  // render (several pages build their columns inline) but its contents drive
  // the key, so the string itself is stable for the life of the table.
  //
  // A table rendered before its columns exist gets a null key and simply does
  // not persist - every table in the app defines them statically.
  const [{ storageKey, saved }] = useState(() => {
    const key = buildLayoutKey(ids, getCurrentUserId());
    return { storageKey: key, saved: readLayout(key) };
  });

  /**
   * Default pins reproduce what the table did before pinning was a choice:
   * the first `stickyLeftCount` columns pin left and the last pins right.
   * Users can change any of it; this is only the starting point.
   */
  const defaultPinned = useMemo(() => {
    const pins = {};
    if (!ids.length) return pins;

    ids.slice(0, stickyLeftCount).forEach((id) => {
      pins[id] = "left";
    });

    if (defaultRightPinCount > 0 && ids.length > stickyLeftCount) {
      pins[ids[ids.length - 1]] = "right";
    }

    return pins;
    // Only the initial column set seeds the defaults.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [columnOrder, setColumnOrder] = useState(
    () => saved?.order ?? ids
  );
  const [columnSizes, setColumnSizes] = useState(() => saved?.sizes ?? {});
  const [hiddenColumns, setHiddenColumns] = useState(
    () => saved?.hidden ?? []
  );
  const [pinnedColumns, setPinnedColumns] = useState(
    () => stripForcedPins(saved?.pinned ?? defaultPinned)
  );
  const [measuredSizes, setMeasuredSizes] = useState({});
  const [resizingId, setResizingId] = useState(null);

  /**
   * Order actually rendered this frame: dropped columns removed, newly added
   * columns spliced in at their source position. Computed during render so a
   * changing column set never flashes a stale table.
   */
  const safeOrder = useMemo(() => {
    const kept = columnOrder.filter((id) => columnsById.has(id));

    let next = kept;

    if (kept.length !== ids.length) {
      next = [...kept];
      ids.forEach((id, sourceIndex) => {
        if (!next.includes(id)) {
          next.splice(Math.min(sourceIndex, next.length), 0, id);
        }
      });
    }

    return normalizeByPins(next, pinnedColumns);
  }, [columnOrder, columnsById, ids, pinnedColumns]);

  /* ---------------------------------------------------------------- */
  /* Measurement - one ResizeObserver for every header cell            */
  /* ---------------------------------------------------------------- */

  const observerRef = useRef(null);
  const nodesRef = useRef(new Map()); // id -> node
  const nodeIdRef = useRef(new WeakMap()); // node -> id
  const pendingRef = useRef({});
  const flushHandleRef = useRef(0);

  const flushMeasurements = useCallback(() => {
    flushHandleRef.current = 0;
    const pending = pendingRef.current;
    pendingRef.current = {};

    setMeasuredSizes((prev) => {
      let changed = false;
      const next = { ...prev };

      Object.entries(pending).forEach(([id, width]) => {
        if (Math.abs((prev[id] ?? -1) - width) > 0.5) {
          next[id] = width;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, []);

  const queueMeasurement = useCallback(
    (id, width) => {
      pendingRef.current[id] = width;
      if (!flushHandleRef.current) {
        // A timer rather than rAF: a table in a background tab still needs
        // correct sticky offsets, and rAF does not run while hidden.
        flushHandleRef.current = setTimeout(flushMeasurements, 0);
      }
    },
    [flushMeasurements]
  );

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const id = nodeIdRef.current.get(entry.target);
        if (id) {
          queueMeasurement(id, entry.target.getBoundingClientRect().width);
        }
      });
    });

    observerRef.current = observer;

    // Header cells register their ref before effects run, and stay mounted
    // across re-subscribes, so pick up everything already known.
    nodesRef.current.forEach((node, id) => {
      observer.observe(node);
      queueMeasurement(id, node.getBoundingClientRect().width);
    });

    return () => {
      observer.disconnect();
      observerRef.current = null;
      if (flushHandleRef.current) clearTimeout(flushHandleRef.current);
      flushHandleRef.current = 0;
    };
  }, [queueMeasurement]);

  const refCacheRef = useRef(new Map());

  /** Ref callback for a header cell - registers it for width measurement. */
  const measureRef = useCallback(
    (id) => {
      let callback = refCacheRef.current.get(id);

      if (!callback) {
        callback = (node) => {
          const previous = nodesRef.current.get(id);

          if (previous && previous !== node) {
            observerRef.current?.unobserve(previous);
            nodeIdRef.current.delete(previous);
            nodesRef.current.delete(id);
          }

          if (node) {
            nodesRef.current.set(id, node);
            nodeIdRef.current.set(node, id);
            observerRef.current?.observe(node);
            queueMeasurement(id, node.getBoundingClientRect().width);
          }
        };

        refCacheRef.current.set(id, callback);
      }

      return callback;
    },
    [queueMeasurement]
  );

  /**
   * Reordering reflows every column, so re-read the headers straight away
   * instead of waiting for the observer. Keeps sticky offsets exact even when
   * the tab is not painting frames.
   */
  useEffect(() => {
    nodesRef.current.forEach((node, id) => {
      queueMeasurement(id, node.getBoundingClientRect().width);
    });
  }, [safeOrder, columnSizes, queueMeasurement]);

  /* ---------------------------------------------------------------- */
  /* Derived layout                                                    */
  /* ---------------------------------------------------------------- */

  const orderedColumns = useMemo(
    () => safeOrder.map((id) => columnsById.get(id)).filter(Boolean),
    [safeOrder, columnsById]
  );

  const hiddenSet = useMemo(
    () => new Set(hiddenColumns),
    [hiddenColumns]
  );

  /** Every column in order, hidden ones included - used for exports. */
  const allColumns = useMemo(
    () =>
      orderedColumns.map((col) => ({
        ...col,
        __hidden: hiddenSet.has(col.__id),
        __pinned: pinnedColumns[col.__id] ?? null,
      })),
    [orderedColumns, hiddenSet, pinnedColumns]
  );

  const layoutColumns = useMemo(() => {
    // Hidden columns leave the table entirely, so sticky offsets are measured
    // across what is actually painted.
    const visible = orderedColumns.filter((col) => !hiddenSet.has(col.__id));
    const total = visible.length;

    // A pin is only honoured while some column is left unpinned - pinning
    // everything would freeze the whole table and scroll nothing.
    const unpinnedCount = visible.filter(
      (col) => !pinnedColumns[col.__id]
    ).length;
    const pinsActive = unpinnedCount > 0;

    const pinOf = (col) => (pinsActive ? pinnedColumns[col.__id] ?? null : null);
    const widthOf = (col) =>
      measuredSizes[col.__id] ?? columnSizes[col.__id] ?? 0;

    // Right pins are measured from the right edge, so any number of them can
    // stack: a column's offset is the combined width of every right-pinned
    // column standing further right, summed outward-in.
    const rightOffsets = new Map();
    {
      let running = 0;
      for (let index = total - 1; index >= 0; index -= 1) {
        if (pinOf(visible[index]) === "right") {
          rightOffsets.set(index, running);
          running += widthOf(visible[index]);
        }
      }
    }

    // A frozen ("sticky") column stays in the flow, never moving, so its stick
    // offset is wherever the columns before it ended - its natural position.
    const frozenOffsets = new Map();
    {
      let running = 0;
      for (let index = 0; index < total; index += 1) {
        if (pinOf(visible[index]) === "sticky") {
          frozenOffsets.set(index, running);
        }
        running += widthOf(visible[index]);
      }
    }

    const result = [];
    let runningLeft = 0;

    const lastLeftIndex = pinsActive
      ? visible.reduce(
        (last, col, index) =>
          pinnedColumns[col.__id] === "left" ? index : last,
        -1
      )
      : -1;

    // The first right-pinned column (closest to the middle) is the one the
    // scrolling content runs up against, so it owns the edge shadow.
    let firstRightIndex = -1;

    for (let index = 0; index < total; index += 1) {
      const col = visible[index];
      const id = col.__id;
      const pin = pinOf(col);
      const isLeft = pin === "left";
      const isRight = pin === "right";
      const isFrozen = pin === "sticky";

      if (isRight && firstRightIndex === -1) firstRightIndex = index;

      result.push({
        ...col,
        __index: index,
        __size: columnSizes[id] ?? null,
        __hidden: false,
        __pinned: pin,
        __sticky: isLeft
          ? "left"
          : isRight
            ? "right"
            : isFrozen
              ? "frozen"
              : null,
        __stickyOffset: isLeft
          ? runningLeft
          : isRight
            ? rightOffsets.get(index)
            : isFrozen
              ? frozenOffsets.get(index)
              : null,
        __stickyEdge:
          (isLeft && index === lastLeftIndex) ||
          (isRight && index === firstRightIndex) ||
          isFrozen,
      });

      if (isLeft) {
        // Measured width wins: auto table layout can stretch a column past the
        // width we asked for, and the offset has to match what is painted.
        runningLeft += widthOf(col);
      }
    }

    return result;
  }, [orderedColumns, hiddenSet, pinnedColumns, columnSizes, measuredSizes]);

  /* ---------------------------------------------------------------- */
  /* Mutations                                                         */
  /* ---------------------------------------------------------------- */

  const resizeColumn = useCallback(
    (id, width) => {
      const next = Math.max(minColumnWidth, Math.round(width));

      // Feed the new width straight into the measurements so sticky offsets
      // move with the drag; the observer corrects it if the browser paints
      // something else (unbreakable content, for instance).
      queueMeasurement(id, next);

      setColumnSizes((prev) => (prev[id] === next ? prev : { ...prev, [id]: next }));
    },
    [minColumnWidth, queueMeasurement]
  );

  const startResize = useCallback(
    (event, id) => {
      const point = event.type === "touchstart" ? event.touches?.[0] : event;
      if (!point) return;

      event.preventDefault();
      event.stopPropagation();

      const node = nodesRef.current.get(id);
      const startWidth = node
        ? node.getBoundingClientRect().width
        : columnSizes[id] ?? minColumnWidth;
      const startX = point.clientX;

      setResizingId(id);

      const previousUserSelect = document.body.style.userSelect;
      const previousCursor = document.body.style.cursor;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";

      const handleMove = (moveEvent) => {
        const movePoint = moveEvent.touches?.[0] ?? moveEvent;
        if (movePoint?.clientX == null) return;
        if (moveEvent.cancelable) moveEvent.preventDefault();
        resizeColumn(id, startWidth + (movePoint.clientX - startX));
      };

      const handleEnd = () => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleEnd);
        window.removeEventListener("touchmove", handleMove);
        window.removeEventListener("touchend", handleEnd);
        window.removeEventListener("touchcancel", handleEnd);
        document.body.style.userSelect = previousUserSelect;
        document.body.style.cursor = previousCursor;
        setResizingId(null);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleEnd);
      window.addEventListener("touchmove", handleMove, { passive: false });
      window.addEventListener("touchend", handleEnd);
      window.addEventListener("touchcancel", handleEnd);
    },
    [columnSizes, minColumnWidth, resizeColumn]
  );

  /** Move a column to a new position. Sizes are keyed by id, so widths follow. */
  const moveColumn = useCallback(
    (fromId, toId) => {
      if (!fromId || !toId || fromId === toId) return;

      const from = safeOrder.indexOf(fromId);
      const to = safeOrder.indexOf(toId);
      if (from === -1 || to === -1) return;

      const next = [...safeOrder];
      next.splice(to, 0, next.splice(from, 1)[0]);
      setColumnOrder(next);
    },
    [safeOrder]
  );

  /** Show / hide a column. The last visible column cannot be hidden. */
  const toggleColumn = useCallback(
    (id) => {
      if (!id) return;

      setHiddenColumns((prev) => {
        if (prev.includes(id)) return prev.filter((item) => item !== id);
        if (safeOrder.length - prev.length <= 1) return prev;
        return [...prev, id];
      });
    },
    [safeOrder.length]
  );

  const showAllColumns = useCallback(() => setHiddenColumns([]), []);

  /**
   * Pin a column left/right, freeze it in place with "sticky", or unpin it
   * with null. Pinning/de-freezing moves it into the matching edge group when
   * pinned; unpinning drops it at the inner edge of that group, so a column
   * never jumps across the table when it is released. "sticky" keeps the
   * column exactly where it is in the flow.
   */
  const setColumnPin = useCallback(
    (id, side) => {
      if (!id) return;

      const valid = side === "left" || side === "right" || side === "sticky";

      setPinnedColumns((prev) => {
        const next = { ...prev };

        if (valid) next[id] = side;
        else delete next[id];

        return next;
      });

      // Re-run the grouping with the new pin so the order matches what the
      // header will paint.
      setColumnOrder((prev) => {
        const pins = { ...pinnedColumns };
        if (valid) pins[id] = side;
        else delete pins[id];

        const base = prev.includes(id) ? prev : safeOrder;
        return normalizeByPins(base, pins);
      });
    },
    [pinnedColumns, safeOrder]
  );

  // Restoring the defaults is enough: the save effect below immediately
  // persists them, so the stored entry ends up holding the default layout
  // rather than being deleted. Same result on the next load.
  const resetColumnLayout = useCallback(() => {
    setColumnOrder(ids);
    setColumnSizes({});
    setHiddenColumns([]);
    setPinnedColumns(defaultPinned);
  }, [ids, defaultPinned]);

  /* Save whenever any part of the layout settles. */
  useEffect(() => {
    if (!storageKey) return;

    writeLayout(storageKey, {
      order: safeOrder,
      hidden: hiddenColumns,
      pinned: pinnedColumns,
      sizes: columnSizes,
    });
  }, [storageKey, safeOrder, hiddenColumns, pinnedColumns, columnSizes]);

  return {
    columnOrder: safeOrder,
    columnSizes,
    layoutColumns,
    allColumns,
    hiddenColumns,
    pinnedColumns,
    minColumnWidth,
    resizingId,
    measureRef,
    startResize,
    resizeColumn,
    moveColumn,
    toggleColumn,
    showAllColumns,
    setColumnPin,
    setColumnOrder,
    resetColumnLayout,
    measuredSizes,
  };
}

export default useColumnLayout;

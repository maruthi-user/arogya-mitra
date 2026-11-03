// GenericFilter.jsx
// Lean filter bar: simple filters + async SearchableSelect with cache & dedup

import React, {
    useState,
    useReducer,
    useCallback,
    useMemo,
    useRef,
    useEffect,
    useLayoutEffect,
    memo,
} from 'react';
import './GenericFilter.css';
import {
    useFloating,
    autoUpdate,
    offset,
    flip,
    shift,
    size,
} from "@floating-ui/react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { List, useListRef } from "react-window";
import { Tooltip, TooltipTrigger, TooltipContent } from "@layout/ui/tooltip";
/* ============================================================
   UTILITIES
   ============================================================ */

const debounce = (fn, delay = 300) => {
    let timer;
    const debounced = (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
    debounced.cancel = () => clearTimeout(timer);
    return debounced;
};

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightText = (text, query) => {
    if (!query || !text) return text;
    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    return text.split(regex).map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
            ? React.createElement('mark', { key: i, className: 'search-highlight' }, part)
            : part
    );
};

const isTypingTarget = (el) =>
    el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

/* Focusable-element selector used for Tab emulation around portaled dropdowns */
const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

// Minimum dropdown height we try to guarantee below a field before
// SearchableSelect prefers to open upward instead (see computePlacement).
const MIN_DROPDOWN_HEIGHT = 200;

/**
 * Moves focus to the next/previous focusable element relative to `fromEl`
 * (Tab / Shift+Tab emulation). Needed because portaled dropdowns live at the
 * end of <body>, which breaks the natural DOM tab order. `scopeEl` (e.g. a
 * modal or filter container) constrains navigation to a subtree and wraps
 * around; defaults to document (no wrap - stays put at the edges).
 */
const focusTabTarget = (fromEl, shiftKey, excludeEl, scopeEl = document) => {
    const root = scopeEl || document;
    const scoped = root !== document;
    const focusables = Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR))
        .filter(el =>
            el.tabIndex >= 0 &&
            el.getClientRects().length > 0 &&
            !(excludeEl && excludeEl.contains(el))
        );
    if (!focusables.length) { fromEl.focus(); return; }

    const idx = focusables.indexOf(fromEl);
    const step = shiftKey ? -1 : 1;
    let target;

    if (idx === -1) {
        target = scoped
            ? (shiftKey ? focusables[focusables.length - 1] : focusables[0])
            : fromEl;
    } else {
        const next = idx + step;
        target = scoped
            ? focusables[(next + focusables.length) % focusables.length]
            : (focusables[next] || fromEl);
    }

    (target || fromEl).focus();
};

/* ============================================================
   VALIDATORS
   ============================================================ */

const validators = {
    text: (v, r) => {
        if (!r) return null;
        if (r.required && !v?.trim()) return r.message || 'Required';
        if (r.minLength && v.length < r.minLength) return `Min ${r.minLength} chars`;
        if (r.maxLength && v.length > r.maxLength) return `Max ${r.maxLength} chars`;
        if (r.pattern && !r.pattern.test(v)) return r.message || 'Invalid format';
        return null;
    },
    number: (v, r) => {
        if (!r) return null;
        if (r.required && (v === null || v === '')) return r.message || 'Required';
        if (v === '' || v === null) return null;
        const n = +v;
        if (isNaN(n)) return null;
        if (r.min !== undefined && n < r.min) return `Min ${r.min}`;
        if (r.max !== undefined && n > r.max) return `Max ${r.max}`;
        return null;
    },
    date: (v, r) => {
        if (!r) return null;
        if (r.required && !v) return r.message || 'Required';
        return null;
    },
    month: (v, r) => {
        if (!r) return null;
        if (r.required && !v) return r.message || 'Required';
        return null;
    },
    select: (v, r) => {
        if (!r) return null;
        const empty = v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length);
        if (r.required && empty) return r.message || 'Required';
        return null;
    },
};

/* ============================================================
   HOOK: useFilter
   ============================================================ */

function useFilter(config, initialValues, resetKey) {
    const defaults = useMemo(() => {
        const obj = {};
        config.forEach(c => obj[c.key] = c.defaultValue ?? null);
        return obj;
    }, [config]);

    const [filters, dispatch] = useReducer(
        (s, a) => a.type === 'SET' ? { ...s, [a.key]: a.value } : a.type === 'RESET' ? a.defaults : s,
        initialValues || defaults
    );

    useEffect(() => {
        if (resetKey !== undefined) {
            dispatch({
                type: "RESET",
                defaults: initialValues || defaults
            });
        }
    }, [resetKey]);

    const [dirty, setDirty] = useState(false);

    const set = useCallback((k, v) => { dispatch({ type: 'SET', key: k, value: v }); setDirty(true); }, []);
    const reset = useCallback(() => { dispatch({ type: 'RESET', defaults }); setDirty(false); }, [defaults]);
    const apply = useCallback(() => {
        const out = {};
        const errs = {};
        config.forEach(c => {
            const v = filters[c.key];
            const validator = validators[c.type] || validators.text;
            const err = validator(v, c.validation);
            out[c.key] = err ? null : v;
            if (err) errs[c.key] = err;
        });
        setDirty(false);
        return { filters: out, errors: errs };
    }, [filters, config]);

    return { filters, setFilter: set, resetFilters: reset, applyFilters: apply, isDirty: dirty };
}

/* ============================================================
   HOOK: useAsyncOptions
   ============================================================ */

function useAsyncOptions(asyncFn, { pageSize = 20, minTermLength = 2 } = {}) {
    const [state, dispatch] = useReducer((s, a) => {
        switch (a.type) {
            case 'LOAD': return { ...s, loading: true, error: null };
            case 'DATA': return { ...s, options: a.options, total: a.total, hasMore: a.hasMore, page: a.page, loading: false };
            case 'APPEND': {
                const merged = [...s.options, ...a.options];
                const seen = new Set();
                const deduped = merged.filter(o => {
                    const key = o?.value ?? o;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
                return { ...s, options: deduped, total: a.total, hasMore: a.hasMore, page: a.page, loading: false };
            }
            case 'ERROR': return { ...s, loading: false, error: a.error };
            default: return s;
        }
    }, { options: [], loading: false, hasMore: true, page: 1, total: 0, error: null });

    const abortRef = useRef(null);
    const sidRef = useRef(0); // session id to prevent race
    const termRef = useRef('');

    const fetchPage = useCallback(async (term = '', page = 1, append = false) => {
        if (!asyncFn) return;
        // Skip too-short search terms (default: 2). Empty term = initial load.
        if (term !== '' && term.length < minTermLength) return;

        const sid = ++sidRef.current;

        if (!append) dispatch({ type: 'LOAD' });

        try {
            abortRef.current?.abort();
            abortRef.current = new AbortController();

            const result = await asyncFn(
                term,
                page,
                pageSize,
                abortRef.current.signal
            );
            if (sid !== sidRef.current) return;

            const items = result.items || result.data || result || [];
            const total = result.total ?? result.totalCount ?? items.length;
            const hasMore = page * pageSize < total;

            dispatch({ type: append ? 'APPEND' : 'DATA', options: items, total, hasMore, page });
        } catch (err) {
            if (err.name === 'AbortError') return;
            if (sid === sidRef.current) dispatch({ type: 'ERROR', error: err.message });
        }
    }, [asyncFn, pageSize, minTermLength]);

    const debouncedSearch = useMemo(
        () => debounce(t => { termRef.current = t; fetchPage(t, 1); }, 300),
        [fetchPage]
    );

    useEffect(() => () => { debouncedSearch.cancel(); abortRef.current?.abort(); }, [debouncedSearch]);

    const search = useCallback(t => debouncedSearch(t), [debouncedSearch]);
    const loadMore = useCallback(() => {
        if (!state.loading && state.hasMore) fetchPage(termRef.current, state.page + 1, true);
    }, [state.loading, state.hasMore, state.page, fetchPage]);
    const retry = useCallback(() => fetchPage(termRef.current, state.page, state.page > 1), [fetchPage, state.page]);
    const initialLoad = useCallback(() => search(''), [search]);

    return { ...state, search, loadMore, retry, initialLoad };
}

/* ============================================================
   SELECT SUBCOMPONENTS
   ============================================================ */

const SearchInput = memo(({ value, onChange, inputRef }) => (
    <div className="searchable-select-search">
        <input ref={inputRef} type="text" className="searchable-select-search-input"
            placeholder="Search..." value={value} onChange={onChange}
            onClick={e => e.stopPropagation()} aria-label="Search options" />
    </div>
));

const OptionRow = memo(({ option, style, isSelected, isActive, multiple, searchTerm, onSelect, renderOption }) => {
    const labelRef = useRef(null);
    // The label is clipped to a single line by the ellipsis class, so the
    // full value in the project tooltip is only worthwhile when the text
    // actually overflows. The virtualized List recycles rows while scrolling,
    // so measure the live DOM on every render instead of a one-time check.
    const [isTruncated, setIsTruncated] = useState(false);

    // Layout-timed so the measurement happens after the recycled row's DOM
    // has been updated with the new option but before paint. `option` is the
    // dependency: the virtualized List reuses row cells across options, so
    // each different option re-measures its own single-line clipping.
    useLayoutEffect(() => {
        const el = labelRef.current;
        setIsTruncated(!!el && el.scrollWidth > el.clientWidth);
    }, [option]);

    // Project's existing ellipsis class (`.searchable-select-value`,
    // reused - no duplicated ellipsis CSS) + existing Radix tooltip
    // (components/ui/tooltip.jsx, provider already mounted in App.jsx).
    // Reuses highlightText/renderOption output, unlike the table's
    // string-only EllipsisCell.
    const label = (
        <span ref={labelRef} className="searchable-select-option-label searchable-select-value">
            {renderOption
                ? renderOption(option, searchTerm)
                : highlightText(option.label, searchTerm)}
        </span>
    );

    return (
        <div id={`opt-${option.value}`} style={style}
            className={`searchable-select-option ${isSelected ? 'is-selected' : ''} ${isActive ? 'is-active' : ''} ${option.disabled ? 'is-disabled' : ''}`}
            onClick={() => !option.disabled && onSelect(option)}
            role="option" aria-selected={isSelected}>

            {/* Show the full label in the existing tooltip only when the
                one-line row actually truncates it. The extra-high z-index
                lifts the tooltip above the portaled dropdown (z-index 999999).

                Sizing: a very long label (comma-joined sub tasks) must wrap
                inside a readable bubble, not stretch into a one-line bar
                across the whole viewport. The width is capped at 28rem or
                whatever room Radix reports is actually free on that side
                (--radix-tooltip-content-available-width), whichever is
                smaller, and words are allowed to break. "top" rather than
                "right": dropdowns usually sit near the right edge, where a
                right-side bubble has no room and flips to the far left. */}
            {isTruncated ? (
                <Tooltip>
                    <TooltipTrigger asChild>{label}</TooltipTrigger>
                    <TooltipContent
                        side="top"
                        align="start"
                        collisionPadding={8}
                        className="searchable-select-option-tooltip z-[9999999] whitespace-normal break-words text-left leading-snug"
                    >
                        {option.label}
                    </TooltipContent>
                </Tooltip>
            ) : label}

            {multiple ? (
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                        e.stopPropagation();
                        onSelect(option);
                    }}
                    tabIndex={-1}
                />
            ) : (
                isSelected && (
                    <span className="searchable-select-check">✓</span>
                )
            )}
        </div>
    );
});

function OptionList({ listboxId, options, value, multiple, activeIndex, onSelect, loading, error, retry, hasMore, loadMore, searchTerm, itemSize = 36, maxHeight = 280 }) {
    const listRef = useListRef();

    const Row = useCallback(({ index, style, options, value, multiple, activeIndex, searchTerm, onSelect }) => {
        const o = options[index];
        if (!o) return null;
        return React.createElement(OptionRow, {
            option: o, style, isSelected: multiple ? value?.includes(o.value) : value === o.value,
            isActive: index === activeIndex, multiple, searchTerm, onSelect
        });
    }, []);

    const rowProps = useMemo(
        () => ({ options, value, multiple, activeIndex, searchTerm, onSelect }),
        [options, value, multiple, activeIndex, searchTerm, onSelect]
    );

    // Trigger loadMore when the virtualized window nears the end of the list
    const handleRowsRendered = useCallback(({ stopIndex }) => {
        if (hasMore && !loading && stopIndex >= options.length - 3) {
            loadMore();
        }
    }, [hasMore, loading, loadMore, options.length]);

    useEffect(() => {
        if (activeIndex >= 0) listRef.current?.scrollToRow({ index: activeIndex, align: 'smart' });
    }, [activeIndex, listRef]);

    if (loading && !options.length) return <div className="searchable-select-loading">Loading...</div>;
    if (error && !options.length) return <div className="searchable-select-error"><span>{error}</span><button onClick={retry}>Retry</button></div>;
    if (!options.length) return <div className="searchable-select-no-results">No results</div>;

    const h = Math.min(maxHeight, Math.max(100, options.length * itemSize));

    return (
        <div className="virtualized-options-container" role="listbox" id={listboxId} style={{ height: h }}>
            <List
                listRef={listRef}
                rowComponent={Row}
                rowCount={options.length}
                rowHeight={itemSize}
                rowProps={rowProps}
                style={{ height: h, width: "100%" }}
                onScroll={(e) => {
                    const scrollTop = e.currentTarget.scrollTop;
                    const clientHeight = e.currentTarget.clientHeight;
                    const scrollHeight = e.currentTarget.scrollHeight;

                    if (
                        hasMore &&
                        !loading &&
                        scrollTop + clientHeight >= scrollHeight - 50
                    ) {
                        loadMore();
                    }
                }}
            />
        </div>
    );
}

const TagList = memo(({ values, optionsMap, onRemove }) => (
    <div className="searchable-select-tags">
        {values.map(v => {
            const o = optionsMap.get(v);
            return o ? <span key={v} className="searchable-select-tag">{o.label}<button onClick={e => { e.stopPropagation(); onRemove(v); }}>×</button></span> : null;
        })}
    </div>
));

const optionLabelCache = new Map();

function getFieldCache(id) {
    let cache = optionLabelCache.get(id);

    if (!cache) {
        cache = new Map();
        optionLabelCache.set(id, cache);
    }

    return cache;
}

export function cacheOption(id, option) {
    if (option?.value == null) return;

    getFieldCache(id).set(option.value, option);
}

function cacheOptions(id, options) {
    if (!options?.length) return;

    const cache = getFieldCache(id);

    options.forEach(option => {
        if (option?.value != null) {
            cache.set(option.value, option);
        }
    });
}

export function clearOptionLabelCache(id) {
    if (id) {
        optionLabelCache.delete(id);
    } else {
        optionLabelCache.clear();
    }
}

/* ============================================================
   SearchableSelect
   ============================================================ */

const SearchableSelect = memo(({
    id, value, onChange, options = [], placeholder = 'Select...',
    onFocus, onBlur, tabIndex, asyncOptions, pageSize = 20, minSearchLength = 2,
    multiple = false,
    disabled = false,
    scopeRef,
    actionsRef,
    // Where the dropdown is portaled. Defaults to <body>, which is right for
    // the filter bar and page-level usage. Inside a focus-trapping modal
    // (e.g. Radix Dialog) a body-level portal sits OUTSIDE the trap, so the
    // search box never receives keystrokes and the list cannot be scrolled -
    // such callers pass the modal's own content element instead.
    portalContainer,
}) => {
    const [open, setOpen] = useState(false);
    const [placement, setPlacement] = useState("bottom-start");
    const [searchTerm, setSearchTerm] = useState('');
    const [activeIndex, setActiveIndex] = useState(-1);
    const containerRef = useRef(null);
    const searchRef = useRef(null);

    const [labelCache, setLabelCache] = useState(
        () => new Map(getFieldCache(id))
    );

    // Minimum dropdown height we try to guarantee. If the space between the
    // field's bottom edge and the filter's Apply/Reset actions (which sit right
    // below the grid) is smaller than this, we open upward instead so the
    // portaled dropdown never covers the action buttons while the user is
    // picking multi-select options. actionsRef is optional - without it (e.g.
    // SearchableSelect used standalone) the behavior is unchanged.
    const { refs, floatingStyles } = useFloating({
        placement,

        whileElementsMounted: autoUpdate,

        middleware: [
            offset(4),

            flip({
                fallbackPlacements: placement === "top-start"
                    ? ["bottom-start", "right-start", "left-start"]
                    : ["top-start", "right-start", "left-start"],
            }),

            shift({
                padding: 8,
            }),

            size({
                apply({ availableHeight, rects, elements }) {
                    Object.assign(elements.floating.style, {
                        maxHeight: `${availableHeight}px`,
                        width: `${rects.reference.width}px`,
                    });
                },
            }),
        ],
    });

    // controlEl is passed in by the caller (which reads refs.reference.current
    // itself) so this memoized callback never touches a ref - that keeps the
    // React Compiler's inferred deps ([actionsRef]) aligned with the manual
    // deps and avoids a "Compilation Skipped" memoization warning.
    const computePlacement = useCallback((controlEl) => {
        let preferred = "bottom-start";

        const actionsEl = actionsRef?.current;

        if (actionsEl && controlEl) {
            const fieldRect = controlEl.getBoundingClientRect();
            const actionsRect = actionsEl.getBoundingClientRect();
            const spaceBelow = actionsRect.top - fieldRect.bottom;
            const spaceAbove = fieldRect.top;

            // Only flip upward when the actions row is actually below the field
            // and the gap is too tight, and only when there is more room above.
            if (
                spaceBelow >= 0 &&
                spaceBelow < MIN_DROPDOWN_HEIGHT &&
                spaceAbove > spaceBelow
            ) {
                preferred = "top-start";
            }
        }

        return preferred;
    }, [actionsRef]);

    const openDropdown = useCallback((controlEl) => {
        setPlacement(computePlacement(controlEl));
        setOpen(true);
        onFocus?.();
    }, [computePlacement, onFocus]);

    const { options: asyncData, loading, hasMore, search, loadMore, error, retry, initialLoad } =
        useAsyncOptions(asyncOptions, { pageSize, minTermLength: minSearchLength });

    const displayOptions = asyncOptions ? asyncData : options;

    useEffect(() => {
        if (!displayOptions.length) return;

        cacheOptions(id, displayOptions);

        setLabelCache(prev => {
            const next = new Map(prev);

            displayOptions.forEach(option => {
                if (option?.value != null) {
                    next.set(option.value, option);
                }
            });

            return next;
        });
    }, [displayOptions, id]);

    const optionsMap = useMemo(() => {
        const map = new Map(labelCache);

        displayOptions.forEach(option => {
            map.set(option.value, option);
        });

        return map;
    }, [labelCache, displayOptions]);

    useEffect(() => {
        const handler = (e) => {
            const reference = refs.reference.current;
            const floating = refs.floating.current;

            if (
                reference &&
                !reference.contains(e.target) &&
                floating &&
                !floating.contains(e.target)
            ) {
                setOpen(false);
                onBlur?.();
            }
        };

        // pointerdown, in the CAPTURE phase - not mousedown. Radix Select (the
        // form's "Select Report" etc.) cancels its trigger's pointerdown so it
        // can focus its list, and a cancelled pointerdown means the browser
        // never sends the mousedown at all: this dropdown then stayed open
        // while the Select opened beside it, leaving two open at once.
        // pointerdown still fires, and capture runs before anything can stop it.
        document.addEventListener("pointerdown", handler, true);

        return () =>
            document.removeEventListener("pointerdown", handler, true);
    }, [onBlur, refs]);

    useEffect(() => { if (open) { searchRef.current?.focus(); initialLoad(); } }, [open, initialLoad]);

    const select = useCallback(opt => {
        if (opt.disabled) return;
        cacheOption(id, opt);

        setLabelCache(prev => {
            const next = new Map(prev);
            next.set(opt.value, opt);
            return next;
        });
        if (multiple) {
            const cur = Array.isArray(value) ? value : [];
            onChange(cur.includes(opt.value) ? cur.filter(v => v !== opt.value) : [...cur, opt.value]);
        } else {
            onChange(opt.value);
            setOpen(false);
            onBlur?.();
            // Return focus to the control so Tab flow continues from the field
            // (the portaled search input is about to unmount)
            refs.reference.current?.focus();
        }
    }, [multiple, value, onChange, onBlur, refs]);

    const handleKeyDown = useCallback(e => {
        // Tab/Shift+Tab while open: the dropdown is portaled to <body>, so the
        // browser's default Tab would jump past the end of the document. Close
        // the dropdown and move focus to the next/prev focusable element.
        if (open && e.key === 'Tab') {
            e.preventDefault();
            setOpen(false);
            onBlur?.();
            const control = refs.reference.current;
            if (control) focusTabTarget(control, e.shiftKey, refs.floating.current, scopeRef?.current);
            return;
        }
        if (!open) { if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); openDropdown(refs.reference.current); } return; }
        if (isTypingTarget(e.target) && !['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) return;
        const len = displayOptions.length;
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => (i + 1) % len); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => i <= 0 ? len - 1 : i - 1); }
        else if (e.key === 'Enter') { e.preventDefault(); const o = displayOptions[activeIndex]; if (o) select(o); }
        else if (e.key === 'Escape') { setOpen(false); onBlur?.(); refs.reference.current?.focus(); }
    }, [open, displayOptions, activeIndex, select, onBlur, refs, scopeRef, openDropdown]);

    const selVals = multiple && Array.isArray(value) ? value : [];

    return (
        <div ref={containerRef} className="searchable-select" onKeyDown={handleKeyDown}>
            <div ref={refs.setReference}
                className={`searchable-select-control ${open ? "is-open" : ""} ${disabled ? "is-disabled" : ""
                    }`}
                onClick={() => { if (!disabled) { if (open) { setOpen(false); } else { openDropdown(refs.reference.current); } } }}
                role="combobox" aria-expanded={open} tabIndex={disabled ? -1 : (tabIndex ?? 0)}>
                <div className="searchable-select-value">
                    {multiple ? (
                        <span className="searchable-select-selected">
                            {selVals.length === 0
                                ? placeholder
                                : selVals.length <= 2
                                    ? selVals
                                        .map(v => optionsMap.get(v)?.label ?? v)
                                        .filter(Boolean)
                                        .join(", ")
                                    : `${selVals.length} selected`}
                        </span>
                    ) : (
                        <span className="searchable-select-placeholder">
                            {optionsMap.get(value)?.label || placeholder}
                        </span>
                    )}
                </div>
                <span className="searchable-select-arrow">
                    <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${open ? "rotate-180" : ""
                            }`}
                    />
                </span>
            </div>
            {open &&
                !disabled &&
                createPortal(
                    <div
                        ref={refs.setFloating}
                        style={floatingStyles}
                        className="searchable-select-dropdown"
                        data-floating-dropdown="true"
                    >
                        <SearchInput
                            inputRef={searchRef}
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setActiveIndex(-1);
                                search(e.target.value);
                            }}
                        />

                        <OptionList
                            listboxId={`${id}-list`}
                            options={displayOptions}
                            value={value}
                            multiple={multiple}
                            activeIndex={activeIndex}
                            onSelect={select}
                            loading={loading}
                            error={error}
                            retry={retry}
                            hasMore={hasMore}
                            loadMore={loadMore}
                            searchTerm={searchTerm}
                        />
                    </div>,
                    portalContainer || document.body
                )}
        </div>
    );
});
SearchableSelect.displayName = 'SearchableSelect';

/* ============================================================
   RTK Query adapter
   ============================================================ */

function useRTKQueryOptions(lazyQuery, { searchField = 'search', pageField = 'page', limitField = 'limit' } = {}) {
    return useCallback(async (term, page, size) => {
        const r = await lazyQuery({ [searchField]: term, [pageField]: page, [limitField]: size }).unwrap();
        return { items: r.items || r.data || r, total: r.total || r.totalCount || r.length };
    }, [lazyQuery, searchField, pageField, limitField]);
}

/* ============================================================
   SIMPLE FILTERS
   ============================================================ */

const FieldError = memo(({ id, error }) => error ? <div id={`${id}-err`} className="filter-error" role="alert">{error}</div> : null);

const TextFilter = memo(({ id, value, onChange, placeholder, validation, onFocus, onBlur, tabIndex }) => {
    const [v, setV] = useState(value || '');
    const [err, setErr] = useState(null);
    const db = useRef(debounce(onChange)).current;
    useEffect(() => setV(value || ''), [value]);
    useEffect(() => () => db.cancel(), [db]);
    return (
        <div className="filter-text">
            <input id={id} type="text" className={`filter-input ${err ? 'filter-input-error' : ''}`} value={v}
                onChange={e => { setV(e.target.value); setErr(validators.text(e.target.value, validation)); db(e.target.value); }}
                onFocus={onFocus} onBlur={() => { setErr(validators.text(v, validation)); onBlur?.(); }}
                placeholder={placeholder} tabIndex={tabIndex} aria-invalid={!!err} />
            <FieldError id={id} error={err} />
        </div>
    );
});

const NumberFilter = memo(({ id, value, onChange, placeholder, validation, onFocus, onBlur, tabIndex }) => {
    const [err, setErr] = useState(null);
    return (
        <div className="filter-number">
            <input id={id} type="number" className={`filter-input ${err ? 'filter-input-error' : ''}`} value={value ?? ''}
                onChange={e => { const v = e.target.value === '' ? null : +e.target.value; setErr(validators.number(v, validation)); onChange(v); }}
                onFocus={onFocus} onBlur={onBlur} placeholder={placeholder} tabIndex={tabIndex}
                min={validation?.min} max={validation?.max} step={validation?.step || 1} />
            <FieldError id={id} error={err} />
        </div>
    );
});

const DateFilter = memo(({
    id,
    value,
    onChange,
    validation,
    onFocus,
    onBlur,
    tabIndex,
    min,
    max,
}) => {
    const [err, setErr] = useState(null);

    return (
        <div className="filter-date">
            <input
                id={id}
                type="date"
                className={`filter-input ${err ? 'filter-input-error' : ''}`}
                value={value || ''}
                min={min || undefined}
                max={max || undefined}
                onChange={e => {
                    const newValue = e.target.value || null;

                    setErr(
                        validators.date(newValue, validation)
                    );

                    onChange(newValue);
                }}
                onFocus={onFocus}
                onBlur={onBlur}
                tabIndex={tabIndex}
            />

            <FieldError id={id} error={err} />
        </div>
    );
});

const MonthFilter = memo(({ id, value, onChange, validation, onFocus, onBlur, tabIndex }) => {
    const [err, setErr] = useState(null);
    return (
        <div className="filter-month">
            <input id={id} type="month" className={`filter-input ${err ? "filter-input-error" : ""}`}
                value={value || ""}
                onChange={(e) => {
                    const newValue = e.target.value;
                    setErr(validators.month(newValue, validation));
                    onChange(newValue || null);
                }}
                onFocus={onFocus}
                onBlur={onBlur}
                tabIndex={tabIndex}
            />
            <FieldError id={id} error={err} />
        </div>
    );
}
);

const SelectFilter = memo(({ id, value, onChange, validation, onFocus, onBlur, ...rest }) => {
    const [err, setErr] = useState(null);
    return (
        <div className="filter-select">
            <SearchableSelect id={id} value={value} onChange={v => { setErr(validators.select(v, validation)); onChange(v); }}
                onFocus={onFocus} onBlur={onBlur} {...rest} />
            <FieldError id={id} error={err} />
        </div>
    );
});

const MultiSelectFilter = memo(props => <SelectFilter {...props} multiple />);

const FILTER_MAP = {
    text: TextFilter, number: NumberFilter, date: DateFilter, month: MonthFilter,
    select: SelectFilter, 'multi-select': MultiSelectFilter,
};

/* ============================================================
   FilterRenderer
   ============================================================ */

const FilterRenderer = memo(({
    cfg,
    value,
    filters,
    onChange,
    onFocus,
    onBlur,
    scopeRef,
    actionsRef,
}) => {
    const Comp = FILTER_MAP[cfg.type] || TextFilter;

    const min =
        cfg.key === "toDate"
            ? filters?.fromDate
            : undefined;

    const max =
        cfg.key === "fromDate"
            ? filters?.toDate
            : undefined;

    return (
        <div
            className={`filter-wrapper ${cfg.fullWidth ? "filter-full-width" : ""
                }`}
            role="group"
            aria-label={cfg.label}
        >
            <label
                htmlFor={`f-${cfg.key}`}
                className="filter-label"
            >
                {cfg.label}

                {cfg.validation?.required && (
                    <span className="filter-required">*</span>
                )}
            </label>

            {React.createElement(Comp, {
                id: `f-${cfg.key}`,
                value,
                onChange: v => onChange(cfg.key, v),

                options: cfg.options,
                placeholder: cfg.placeholder,
                validation: cfg.validation,

                onFocus: () => onFocus(cfg.key),
                onBlur: () => onBlur(null),

                scopeRef,
                actionsRef,

                asyncOptions: cfg.asyncOptions,
                pageSize: cfg.pageSize,
                multiple: cfg.type === "multi-select",

                min,
                max,
            })}
        </div>
    );
});

/* ============================================================
   MAIN: GenericFilter
   ============================================================ */

const GRID = { 1: 'grid-cols-1', 2: 'grid-cols-1 md:grid-cols-2', 3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3', 4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' };

function GenericFilter({ config, onApply, onReset, resetKey, initialValues, className = '', columns = 2 }) {
    const { filters, setFilter, resetFilters, applyFilters, isDirty } = useFilter(config, initialValues, resetKey);
    const [focusKey, setFocusKey] = useState(null);
    const containerRef = useRef(null);
    const actionsRef = useRef(null);
    const keys = useMemo(() => config.filter(c => !c.hidden).map(c => c.key), [config]);

    const handleKeyDown = useCallback(e => {
        if (isTypingTarget(e.target) && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
        const i = focusKey ? keys.indexOf(focusKey) : -1;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); setFocusKey(keys[(i + 1) % keys.length]); }
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); setFocusKey(keys[i <= 0 ? keys.length - 1 : i - 1]); }
        else if (e.key === 'Enter' && !isTypingTarget(e.target)) { e.preventDefault(); onApply?.(applyFilters()); }
        else if (e.key === 'Escape') { e.preventDefault(); resetFilters(); onReset?.(); }
    }, [focusKey, keys, applyFilters, onApply, resetFilters, onReset]);

    const visible = useMemo(() => config.filter(c => !c.hidden), [config]);

    return (
        <div ref={containerRef} className={`generic-filter ${className}`} role="search" onKeyDown={handleKeyDown}>
            <div className={`filter-container grid ${GRID[columns] || GRID[2]} gap-3`}>
                {visible.map(cfg =>
                    React.createElement(FilterRenderer, {
                        key: cfg.key, cfg,
                        value: filters[cfg.key],
                        filters,
                        onChange: (k, v) => setFilter(k, v),
                        onFocus: k => setFocusKey(k),
                        onBlur: () => setFocusKey(null),
                        scopeRef: containerRef,
                        actionsRef,
                    })
                )}
            </div>
            <div className="filter-actions" ref={actionsRef}>
                <button className="filter-apply-btn" onClick={() => onApply?.(applyFilters())} disabled={!isDirty}>
                    Apply {isDirty && <span className="filter-badge">●</span>}
                </button>
                <button className="filter-reset-btn" onClick={() => { if (onReset) { onReset(); } resetFilters(); }}>Reset</button>
            </div>
        </div>
    );
}

export {
    GenericFilter,
    SearchableSelect,
    useAsyncOptions,
    useRTKQueryOptions,
    useFilter,
    TextFilter,
    SelectFilter,
    MultiSelectFilter,
    DateFilter,
    NumberFilter,
};

export default GenericFilter;

// import React from "react";
import React, { useEffect, useRef, useState, useCallback, } from "react";
import { Search, Filter, X } from "lucide-react";
import { ChevronDown } from 'lucide-react';
import ExportButton from "@layout/filters/ExportButton";
import { Button } from "@layout/ui/button";
import { createPortal } from "react-dom";
import ColumnReorderMenu from "./ColumnReorderMenu";
import { useFocusTrap } from "@layout/hooks/useFocusTrap";
import ConfigFilter, { countActiveFilters } from "@layout/filters/ConfigFilter";


const TableToolbar = ({
  search,
  setSearch,
  showSearch = true,
  filterContent,
  filterCount = 0,
  totalRecords = 0,
  rowsPerPage,
  setRowsPerPage,
  page = 0,
  totalPages = 0,
  onPrev,
  onNext,
  enableExport = false,
  exportData = [],
  exportColumns = [],
  exportFileName = "Export",
  exportSheetName = "Data",
  onExport,
  exportLoading,
  showApprovalActions = false,
  onApprove,
  onReject,
  approveDisabled,
  rejectDisabled,
  showPaidActions = false,
  onPaid,
  paidDisabled,

  showColumnReorder = false,
  reorderColumns = [],
  onMoveColumn,
  onToggleColumn,
  onPinColumn,
  onShowAllColumns,
  onResetColumnLayout,

  // Config-driven filter pop-up (see filters/ConfigFilter.jsx)
  filterConfig,
  filterValues,
  filterOptionSources,
  onFilterApply,
  rowsPerPageOptions = [10, 20, 50, 100],
}) => {
  const [isConfigFilterOpen, setIsConfigFilterOpen] = useState(false);
  const configFilterCount = countActiveFilters(filterValues);


  // const [showFilterDropdown, setShowFilterDropdown] = React.useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const btnRef = React.useRef(null);
  const filterRef = useRef(null);
  useFocusTrap(filterRef, showFilterDropdown);
  const startRecord =
    totalRecords === 0
      ? 0
      : page * rowsPerPage + 1;
  const endRecord = Math.min(
    (page + 1) * rowsPerPage,
    totalRecords
  );

  const handleToggle = () => {
    if (showFilterDropdown) {
      setShowFilterDropdown(false);
      return;
    }

    updatePosition();
    setShowFilterDropdown(true);
  };

  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;

    const rect = btnRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Dropdown width
    let dropdownWidth = 540;

    if (viewportWidth < 640) {
      dropdownWidth = viewportWidth - 32;
    } else if (viewportWidth < 900) {
      dropdownWidth = 480;
    }

    // Default: open directly below the button
    let left = rect.left;

    // If dropdown goes outside right edge,
    // align its right edge with the button.
    if (left + dropdownWidth > viewportWidth - 16) {
      left = rect.right - dropdownWidth;
    }

    // Keep inside left edge
    if (left < 16) {
      left = 16;
    }

    // Vertical position
    let top = rect.bottom + window.scrollY + 6;

    const estimatedHeight = 520;

    // Flip above if not enough space below
    if (
      rect.bottom + estimatedHeight > viewportHeight &&
      rect.top > estimatedHeight
    ) {
      top = rect.top + window.scrollY - estimatedHeight - 6;
    }

    setPosition({
      top,
      left,
    });
  }, []);



  // const updatePosition = useCallback(() => {
  //   if (!btnRef.current) return;

  //   const rect = btnRef.current.getBoundingClientRect();
  //   const viewportWidth = window.innerWidth;
  //   const viewportHeight = window.innerHeight;

  //   // Determine dropdown width based on screen size
  //   let dropdownWidth;
  //   if (viewportWidth < 640) {
  //     dropdownWidth = viewportWidth - 32; // mobile: full width minus padding
  //   } else if (viewportWidth < 768) {
  //     dropdownWidth = 480; // tablet
  //   } else {
  //     dropdownWidth = 540; // desktop
  //   }

  //   // Calculate left position (prefer right-aligned to button)
  //   let left = rect.right - dropdownWidth;

  //   // Keep within viewport bounds
  //   if (left < 16) {
  //     left = 16;
  //   }
  //   if (left + dropdownWidth > viewportWidth - 16) {
  //     left = viewportWidth - dropdownWidth - 16;
  //   }

  //   // Calculate top position
  //   let top = rect.bottom + window.scrollY + 4;
  //   const dropdownHeight = Math.min(viewportHeight * 0.85, 600); // estimate

  //   // Flip to top if not enough space below
  //   if (rect.bottom + dropdownHeight > viewportHeight && rect.top > dropdownHeight) {
  //     top = rect.top + window.scrollY - dropdownHeight - 4;
  //   }

  //   setPosition({ top, left });
  // }, []);


  // Update position when dropdown opens
  useEffect(() => {
    if (showFilterDropdown && btnRef.current) {
      updatePosition();
    }
  }, [showFilterDropdown, updatePosition]);

  // Recalculate position on window resize and scroll
  useEffect(() => {
    if (!showFilterDropdown) return;

    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true); // capture phase for all scrolls

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [showFilterDropdown, updatePosition]);

  // Esc closes the filter dropdown / mobile drawer
  useEffect(() => {
    if (!showFilterDropdown && !isMobileFilterOpen) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setShowFilterDropdown(false);
      setIsMobileFilterOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showFilterDropdown, isMobileFilterOpen]);

  // Handle outside click
  useEffect(() => {
    if (!showFilterDropdown) return;

    const handler = (e) => {
      if (e.target.closest("[data-floating-dropdown='true']")) return;
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      // Keep the filter open on outside clicks (e.g. while selecting table
      // rows) so its Apply/Reset buttons stay visible. It is closed via the
      // filter toggle button or the Apply/Reset actions.
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFilterDropdown]);





  return (

    <div className="
    flex
    flex-col md:flex-row
    gap-3
    p-2
    md:items-center
    md:justify-between
    min-h-[40px]
    bg-gray-70/50
    ">

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">

          {/* SEARCH */}
          {showSearch && (
            <div
              className="
      flex items-center
      border border-gray-300 dark:border-gray-700
      rounded-md
      px-2
      w-full sm:w-auto
      dark:bg-gray-900
    "
            >
              {/* Search Icon */}
              <Search size={16} className="text-gray-500 shrink-0" />

              {/* Input */}
              <input
                type="text"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && search) {
                    e.stopPropagation();
                    setSearch("");
                  }
                }}
                aria-label="Search"
                className="
        px-2 py-1
        outline-none
        w-full sm:w-[200px]
        bg-transparent
        text-gray-800 dark:text-gray-200
        text-sm 
      "
              />

              {/* Clear Button */}
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  title="Clear search"
                  className="
          shrink-0 rounded p-0.5
          text-gray-500 hover:bg-gray-100 hover:text-gray-800
          dark:hover:bg-gray-800 dark:hover:text-gray-200
          transition
        "
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}
          {/* FILTER */}

          {/* GENERIC (CONFIG-DRIVEN) FILTER */}
          {filterConfig && (
            <>
              <button
                type="button"
                onClick={() => setIsConfigFilterOpen(true)}
                aria-label="Filters"
                className="relative flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700"
              >
                <Filter size={16} />
                <span className="hidden min-[1025px]:inline">Filters</span>
                {configFilterCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-semibold leading-none text-white">
                    {configFilterCount}
                  </span>
                )}
              </button>
              <ConfigFilter
                config={filterConfig}
                values={filterValues}
                optionSources={filterOptionSources}
                isOpen={isConfigFilterOpen}
                onClose={() => setIsConfigFilterOpen(false)}
                onApply={onFilterApply}
              />
            </>
          )}

          {/* FILTER BUTTON */}
          <div className="relative">
            {filterContent && (
              <button
                ref={btnRef}
                type="button"
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setIsMobileFilterOpen(true);
                  } else {
                    handleToggle();
                  }
                }}
                className="
        relative
        flex items-center gap-2
        px-3 py-1.5
        border border-gray-300 dark:border-gray-700
        rounded-md
        dark:bg-gray-900
        text-sm
        hover:bg-gray-100 dark:hover:bg-gray-700
        transition-colors
      "
              >
                <Filter size={16} />
                  <span className="hidden min-[1025px]:inline">
                    Filters
                  </span>

                  {filterCount > 0 && (
                    <span
                      className="
                        absolute
                        -top-2
                        -right-2
                        flex
                        items-center
                        justify-center
                        min-w-[20px]
                        h-5
                        px-1
                        rounded-full
                        bg-blue-600
                        text-white
                        text-xs
                        font-semibold
                        leading-none
                      "
                    >
                      {filterCount}
                    </span>
                  )}
              </button>
            )}

            {showFilterDropdown &&
              createPortal(
                <div
                  ref={filterRef}
                  style={{
                    top: position.top,
                    left: position.left,
                  }}
                  className="
                  fixed
                  z-[999999]
                  bg-white dark:bg-gray-900
                  border border-gray-200 dark:border-gray-700
                  rounded-xl
                  shadow-xl
                  p-4
                  w-[calc(100vw-2rem)]
                  max-w-[420px]
                  max-h-[80vh]
                  overflow-y-auto
                  "
                >
                  {/* Header with close button */}
                  <div className="flex items-center justify-between mb-2 md:justify-end">
                    <h3 className="md:hidden font-semibold text-sm text-gray-900 dark:text-gray-100">
                      Filters
                    </h3>

                    <button
                      onClick={() => setShowFilterDropdown(false)}
                      className="md:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Filter content */}
                  <div className="[&_.filter-container]:!grid-cols-1 [&_.filter-container]:sm:!grid-cols-2 [&_.filter-container]:gap-2.5">                    {typeof filterContent === "function"
                    ? filterContent(() => setShowFilterDropdown(false))
                    : filterContent}
                  </div>
                </div>,
                document.body
              )
            }

            {/* MOBILE FILTER DRAWER */}
            {isMobileFilterOpen &&
              createPortal(
                <div className="fixed inset-0 z-[999999] flex">
                  {/* overlay */}
                  <div
                    className="absolute inset-0 bg-black/40"
                    onClick={() => setIsMobileFilterOpen(false)}
                  />

                  {/* drawer */}
                  <div className="relative ml-auto h-full w-[85%] max-w-sm bg-white dark:bg-gray-900 shadow-xl flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                      <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                        Filters
                      </h2>
                      <button
                        onClick={() => setIsMobileFilterOpen(false)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* Filter Content */}
                    <div className="flex-1 overflow-y-auto p-4 [&_.filter-container]:!grid-cols-1">
                      {typeof filterContent === "function"
                        ? filterContent(() => setIsMobileFilterOpen(false))
                        : filterContent}
                    </div>
                  </div>
                </div>,
                document.body
              )}
          </div>
        </div>

      </div>
      {/* RIGHT SECTION */}
      <div
        className="flex flex-wrap items-center gap-2" >
        {/* EXPORT */}
        {
          enableExport && (
            <ExportButton
              data={exportData}
              columns={exportColumns}
              fileName={exportFileName}
              sheetName={exportSheetName}
              onExport={onExport}
              loading={exportLoading}
            />
          )
        }
        {/* APPROVAL */}
        {
          showApprovalActions && (
            <>
              <Button
                size="sm"
                onClick={onApprove}
                disabled={approveDisabled}
                className="bg-green-600"
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={onReject}
                disabled={rejectDisabled}
              >
                Reject
              </Button>
            </>
          )
        }
        {/* PAID */}
        {
          showPaidActions && (
            <Button
              size="sm"
              onClick={onPaid}
              disabled={paidDisabled}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Paid
            </Button>
          )
        }
        {/* ROWS */}
        <div
          className="
flex items-center gap-1 px-1 py-1 rounded-md " >
          <span
            className=" text-xs text-gray-600 dark:text-gray-200 " >
            Rows
          </span>
          <div
            className="relative ">
            <select
              value={rowsPerPage}
              onChange={(e) =>
                setRowsPerPage(
                  Number(e.target.value)
                )
              }
              className=" appearance-none w-16 h-8 border rounded-md dark:bg-gray-900 text-xs pl-2 " >
              {rowsPerPageOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            />
          </div>
        </div>
        {/* PAGINATION */}
        <div
          className=" flex items-center gap-1 shrink-0 " >
          <button
            onClick={onPrev}
            disabled={
              page === 0 ||
              totalPages === 0
            }
            className=" h-8 w-8 border rounded-md text-sm disabled:opacity-40 " >
            ‹
          </button>

          <span className="
                        px-2 
                        py-1 
                        text-gray-700 
                        dark:text-gray-200 
                        text-xs
                        whitespace-nowrap
                        ">
            {startRecord}-{endRecord} of {totalRecords}
          </span>
          <button
            onClick={onNext}
            disabled={
              totalPages === 0 ||
              page === totalPages - 1
            }
            className=" h-8 w-8 border rounded-md text-sm disabled:opacity-40 ">
            ›
          </button>
        </div>

        {/* COLUMN REORDER */}
        {showColumnReorder && (
          <ColumnReorderMenu
            columns={reorderColumns}
            onMoveColumn={onMoveColumn}
            onToggleColumn={onToggleColumn}
            onPinColumn={onPinColumn}
            onShowAll={onShowAllColumns}
            onReset={onResetColumnLayout}
          />
        )}
      </div>
    </div>
  );
};
export default TableToolbar;




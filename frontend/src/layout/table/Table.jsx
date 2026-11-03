import React, { useState, useRef,useEffect } from "react";
import TableToolbar from "./TableToolbar";
import DataTable from "./DataTable";
import useColumnLayout from "./useColumnLayout";

const Table = ({
  columns,
  data = [],
  loading = false,

  enableColumnReorder = true,
  enableColumnResize = true,
  enableStickyColumns = true,
  autoFreezeOnScroll = false,
  minColumnWidth,
  stickyLeftCount,
  defaultRightPinCount,
  forceUnpinnedIds,

  showApprovalActions = false,
  onApprove = () => { },
  onReject = () => { },
  approveDisabled = false,
  rejectDisabled = false,

  enableExport = false,
  exportFileName = "Export",
  exportSheetName = "Data",
  onExport,

  onFilterClick,
  filterContent,
  showToolbar = true,
  showPagination = true,
  disableMobile = false,
  search,
  showSearch = true,
  showFilter = true,
  onSearchChange,
  serverPagination = false,
  totalRecords,
  totalPages: serverTotalPages,
  page,
  onPageChange,
  rowsPerPage,
  onRowsPerPageChange,
  onSortChange,
  expandedRowId,
  renderExpandedRow,
  forceExpandRowId,
  getRowId,
  exportLoading = false,
  filterCount = 0,
  showPaidActions = false,
  onPaid = () => { },
  paidDisabled = false,
  filterConfig,
  filterValues,
  filterOptionSources,
  onFilterApply,
  rowsPerPageOptions,
  virtualize = true,
  virtualThreshold = 50,
}) => {
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");

  // When server-side pagination moves to another page, jump back to the
  // top of the page so the freshly loaded records are visible immediately
  // instead of leaving the user scrolled down at the old position.
  const prevPageRef = useRef(page);
  useEffect(() => {
    if (
      serverPagination &&
      prevPageRef.current !== page &&
      typeof window !== "undefined"
    ) {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
    prevPageRef.current = page;
  }, [page, serverPagination]);

  // Column order + sizes live here so the toolbar (reorder menu) and the
  // table body always render from exactly the same layout.
  const columnLayout = useColumnLayout(columns, {
    ...(minColumnWidth != null ? { minColumnWidth } : {}),
    ...(stickyLeftCount != null ? { stickyLeftCount } : {}),
    ...(defaultRightPinCount != null ? { defaultRightPinCount } : {}),
    ...(forceUnpinnedIds != null ? { forceUnpinnedIds } : {}),
  });

  const filterColumn = columns.find((col) => col.filterOptions);

  const currentPage = serverPagination ? page : 0;

  const handleSort = (key) => {
    let direction = "asc";

    if (sortKey === key) {
      direction = sortDirection === "asc" ? "desc" : "asc";
    }

    setSortKey(key);
    setSortDirection(direction);

    if (serverPagination) {
      onSortChange?.(key, direction);
    }
  };

  const safeData = Array.isArray(data) ? data : [];

  let filteredData = serverPagination
    ? safeData
    : safeData.filter((row) => {
      const matchesSearch =
        !search ||
        Object.values(row)
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesFilter =
        !filterColumn || !filter
          ? true
          : row[filterColumn.accessor] === filter;

      return matchesSearch && matchesFilter;
    });

  if (!serverPagination && sortKey) {
    filteredData = [...filteredData].sort((a, b) => {
      if (a[sortKey] < b[sortKey]) return sortDirection === "asc" ? -1 : 1;
      if (a[sortKey] > b[sortKey]) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }

  const totalPageCount = serverPagination
    ? serverTotalPages || 1
    : Math.ceil(filteredData.length / rowsPerPage || 1);

  const start = currentPage * rowsPerPage;

  const tableData =
    showPagination === false || serverPagination
      ? filteredData
      : filteredData.slice(start, start + rowsPerPage);

  const handlePrev = () => {
    if (serverPagination) {
      onPageChange?.(Math.max(page - 1, 0));
    }
  };

  const handleNext = () => {
    if (serverPagination) {
      onPageChange?.(Math.min(page + 1, totalPageCount - 1));
    }
  };

  const handleRowsChange = (value) => {
    onRowsPerPageChange?.(value);
    onPageChange?.(0);
  };

  // return (
  //   <div className="bg-white dark:bg-gray-900 rounded-lg p-4 w-full">
  // return (
  //   <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-0 w-full">
  //     {showToolbar && (
  //       <TableToolbar
  //         // className="min-w-full border border-gray-200 dark:border-gray-700"
  //         search={search}
  //         setSearch={onSearchChange}
  //         showSearch={showSearch}
  //         showFilter={showFilter}
  //         filter={filter}
  //         setFilter={setFilter}
  //         onFilterClick={onFilterClick}
  //         filterContent={filterContent}
  //         totalRecords={serverPagination ? totalRecords : filteredData.length}
  //         rowsPerPage={rowsPerPage}
  //         setRowsPerPage={handleRowsChange}
  //         page={page}
  //         totalPages={totalPageCount}
  //         onPrev={handlePrev}
  //         onNext={handleNext}
  //       />
  //     )}

  //     <div className="overflow-x-auto relative">
  //       <DataTable
  //         columns={columns}
  //         data={tableData}
  //         expandedRowId={expandedRowId}
  //         renderExpandedRow={renderExpandedRow}
  //         getRowId={getRowId}
  //         onSort={handleSort}
  //         sortKey={sortKey}
  //         sortDirection={sortDirection}
  //         disableMobile={disableMobile}
  //         enableStickyColumns={columns.some(col => col.sticky)}
  //       />
  //     </div>
  //   </div>
  // );
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col h-full">

      {showToolbar && (
        <TableToolbar
          search={search}
          setSearch={onSearchChange}
          showSearch={showSearch}

          showApprovalActions={showApprovalActions}
          onApprove={onApprove}
          onReject={onReject}
          approveDisabled={approveDisabled}
          rejectDisabled={rejectDisabled}


          enableExport={enableExport}
          exportData={tableData}
          /* Export the full record: hiding a column tidies the screen,
             it is not a request to drop the data from the sheet. */
          exportColumns={columnLayout.allColumns}
          exportFileName={exportFileName}
          exportSheetName={exportSheetName}
          onExport={onExport}
          exportLoading={exportLoading}

          showFilter={showFilter}
          filter={filter}
          setFilter={setFilter}
          onFilterClick={onFilterClick}
          filterContent={filterContent}
          totalRecords={serverPagination ? totalRecords : filteredData.length}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={handleRowsChange}
          page={page}
          totalPages={totalPageCount}
          onPrev={handlePrev}
          onNext={handleNext}
          filterCount={filterCount}
          showPaidActions={showPaidActions}
          onPaid={onPaid}
          paidDisabled={paidDisabled}

          showColumnReorder={enableColumnReorder}
          /* Hidden columns stay in the menu so they can be brought back. */
          reorderColumns={columnLayout.allColumns}
          onMoveColumn={columnLayout.moveColumn}
          onToggleColumn={columnLayout.toggleColumn}
          onPinColumn={columnLayout.setColumnPin}
          onShowAllColumns={columnLayout.showAllColumns}
          onResetColumnLayout={columnLayout.resetColumnLayout}
          filterConfig={filterConfig}
          filterValues={filterValues}
          filterOptionSources={filterOptionSources}
          onFilterApply={onFilterApply}
          rowsPerPageOptions={rowsPerPageOptions}
        />
      )}

      <div className="flex-1 overflow-y-auto overflow-x-auto">
        <DataTable
          columns={columns}
          columnLayout={columnLayout}
          data={tableData}
          loading={loading}
          expandedRowId={expandedRowId}
          renderExpandedRow={renderExpandedRow}
          forceExpandRowId={forceExpandRowId}
          getRowId={getRowId}
          onSort={handleSort}
          sortKey={sortKey}
          sortDirection={sortDirection}
          disableMobile={disableMobile}
          enableStickyColumns={enableStickyColumns}
          enableColumnResize={enableColumnResize}
          autoFreezeOnScroll={autoFreezeOnScroll}
          virtualize={virtualize}
          virtualThreshold={virtualThreshold}
        />
      </div>

    </div>
  );
};

export default Table;
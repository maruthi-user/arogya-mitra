import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const TablePagination = ({
  page,
  totalPages,
  onPrev,
  onNext,
}) => {
  return (
    <div className="flex justify-end mt-4">

      <div
        className="
    flex items-center
    gap-2
    text-sm
  "
      >

        {/* PREV */}
        <button
          onClick={onPrev}
          disabled={page === 0}
          
          className="
  w-10
  h-10
  flex items-center justify-center
  border
  border-gray-300
  dark:border-gray-700
  rounded-md
  hover:bg-gray-100
  dark:hover:bg-gray-700
  disabled:opacity-40
  disabled:cursor-not-allowed
"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* PAGE INFO */}
        <span className="h-10 w-10flex items-center px-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">
          {totalPages === 0 ? 0 : page + 1} of {totalPages}
        </span>

        {/* NEXT */}
        <button
          onClick={onNext}
          disabled={page >= totalPages - 1}
          className="
  w-10
  h-10
  flex items-center justify-center
  border
  border-gray-300
  dark:border-gray-700
  rounded-md
  hover:bg-gray-100
  dark:hover:bg-gray-700
  disabled:opacity-40
  disabled:cursor-not-allowed
"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TablePagination;
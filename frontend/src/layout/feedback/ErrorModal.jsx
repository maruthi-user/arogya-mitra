import { AlertTriangle, X } from "lucide-react";
import { Button } from "@layout/ui/button";

export default function ErrorModal({
  isOpen,
  onClose,
  title = "Something went wrong",
  message = "An unexpected error occurred.",
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl">
        <div className="flex items-start justify-between border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 dark:bg-red-900/40 p-2">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{message}</p>
        </div>

        <div className="flex justify-end border-t px-5 py-4">
          <Button type="button" onClick={onClose}>
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}
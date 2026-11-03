import { Button } from "@layout/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import { useState } from 'react';
import { createPortal } from "react-dom";
import { runWithProcessingLock } from "@layout/utils/processingLock";


export default function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  // Extra fields for actions that need more than a comment (e.g. the advance
  // approval's decision + revised amount). Rendered above the comment box;
  // callers that pass nothing keep the plain confirm dialog they had.
  children,
  showRequiredAsterisk = false,

  // Comment
  comment = "",
  setComment = () => { },
  showComment = true,
  commentLabel = "Comment",
  commentPlaceholder = "Enter comment...",
  commentRequired = false,

  // Buttons
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
  confirmVariant = "default",

  // Date
  showDateInput = false,
  selectedDate = "",
  setSelectedDate = () => { },
  dateDisabled = false,

  // Time
  showTimeInput = false,
  selectedTime = "",
  setSelectedTime = () => { },

  showTimeDropdown = false,
  timeOptions = [],

  // Modal
  disableClose = false,
  hideIcon = false,
  compact = false,
  hideCancelButton = false,
}) {

  const [timeError, setTimeError] = useState(false);

  const [commentError, setCommentError] = useState(false);
  
  if (!isOpen) return null;

  const icon =
    confirmVariant === "danger" ? (
      <XCircle className="h-9 w-9 text-red-600" />
    ) : (
      <CheckCircle className="h-9 w-9 text-green-600" />
    );

  const hasFormContent =
    showComment ||
    showDateInput ||
    showTimeInput ||
    showTimeDropdown ||
    !!children;

  // const handleConfirm = () => {
  //   if (commentRequired && !comment.trim()) {
  //     setCommentError(true);
  //     return;
  //   }

  //   setCommentError(false);
  //   onConfirm();
  // };
  const handleConfirm = () => {
    let hasError = false;

    if (commentRequired && !comment.trim()) {
      setCommentError(true);
      hasError = true;
    }

    if (showTimeInput && !selectedTime) {
      setTimeError(true);
      hasError = true;
    }

    if (hasError) return;

    setCommentError(false);
    setTimeError(false);

    // Under the global processing lock: if onConfirm returns a promise the
    // page stays blocked until the approve/reject request settles.
    runWithProcessingLock(() => onConfirm(), "Updating…");
  };
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div
          className={`px-6 pt-6 ${hasFormContent ? "pb-4" : "pb-2"
            }`}
        >
          <div className={`${hideIcon ? "block" : "flex items-start gap-3"}`}>
            {!hideIcon && <div className="mt-1">{icon}</div>}

            <div className={`w-full ${hideIcon ? "text-center" : ""}`}>
              {title && (
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {title}
                </h3>
              )}

              {description && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {description}
                </p>
              )}
            </div>
          </div>

          {hasFormContent && (
            <div className="mt-5 space-y-4">
              {children}

              {showDateInput && (
                <div className="flex flex-col items-start gap-1">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-200">
                    Checkout Date
                  </label>

                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      if (!dateDisabled) {
                        setSelectedDate(e.target.value);
                      }
                    }}
                    disabled={dateDisabled}
                    readOnly={dateDisabled}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 dark:bg-gray-800 dark:text-white disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-700"
                  />
                </div>
              )}

              {showTimeInput && (
                <div className="flex flex-col items-start gap-1">
                  <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                    <span className="text-red-500">*</span>
                    <span>Checkout Time</span>
                  </label>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => {
                      setSelectedTime(e.target.value);

                      if (e.target.value) {
                        setTimeError(false);
                      }
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />

                  {timeError && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                      {/* <span className="font-bold">*</span> */}
                      <span>This field is required.</span>
                    </p>
                  )}
                </div>
              )}

              {showTimeDropdown && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Select Checkout Time
                  </label>

                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Comment Section */}
              {showComment && (
                <div className="flex flex-col items-start gap-1">
                  <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                    {showRequiredAsterisk && (
                      <span className="text-red-500">*</span>
                    )}
                    <span>{commentLabel}</span>
                  </label>

                  <textarea
                    value={comment}
                    onChange={(e) => {
                      setComment(e.target.value);

                      if (e.target.value.trim()) {
                        setCommentError(false);
                      }
                    }}
                    placeholder={commentPlaceholder}
                    className="min-h-[56px] w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  />

                  {commentError && (
                    <p className="mt-1 text-xs text-red-500">
                      This field is required.
                    </p>
                  )}
                </div>
              )}
            </div>)}
        </div>

        <div
          className={`flex justify-center gap-3 px-6 ${hasFormContent ? "pb-6 pt-2" : "py-6"
            }`}
        >
          {!hideCancelButton && (
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading || disableClose}
              className="min-w-[120px]"
            >
              {cancelText}
            </Button>
          )}

          <Button
            onClick={handleConfirm}
            // disabled={
            //   isLoading ||
            //   (showComment && commentRequired && !comment.trim()) ||
            //   (showDateInput && !selectedDate) ||
            //   ((showTimeInput || showTimeDropdown) && !selectedTime)
            // }
            className={`min-w-[140px] ${confirmVariant === "danger"
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-orange-500 text-white hover:bg-orange-600"
              }`}
          >
            {isLoading ? "Updating..." : confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
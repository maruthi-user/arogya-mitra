import { Button } from "@layout/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { runWithProcessingLock } from "@layout/utils/processingLock";

export default function SummaryConfirmActionModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
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
    // Opt-in roomier shell for dialogs whose body is tabular - two record
    // tables side by side need more than the default reading width. Every
    // existing caller keeps the narrow shell.
    wide = false,
    // Puts Cancel/Confirm in a header bar beside the title instead of in the
    // footer, with the title and description left-aligned. For dialogs whose
    // body is long enough that a footer sits far from what it acts on - the
    // buttons stay in the same place while the body scrolls. Every existing
    // caller keeps the centred title and the footer.
    actionsInHeader = false,
    hideCancelButton = false,
}) {
    const [timeError, setTimeError] = useState(false);
    const [commentError, setCommentError] = useState(false);

    if (!isOpen) return null;

    const icon =
        confirmVariant === "danger" ? (
            <XCircle className="h-8 w-8 shrink-0 text-red-600 sm:h-9 sm:w-9" />
        ) : (
            <CheckCircle className="h-8 w-8 shrink-0 text-green-600 sm:h-9 sm:w-9" />
        );

    const hasFormContent =
        showComment ||
        showDateInput ||
        showTimeInput ||
        showTimeDropdown;

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

    const actionButtons = (inHeader) => (
        <>
            {!hideCancelButton && (
                <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading || disableClose}
                    className={
                        inHeader
                            ? "h-9 min-w-0 px-4"
                            : "h-10 w-full min-w-0 sm:w-auto sm:min-w-[120px]"
                    }
                >
                    {cancelText}
                </Button>
            )}

            <Button
                onClick={handleConfirm}
                disabled={isLoading}
                className={`
                    ${inHeader
                        ? "h-9 min-w-0 px-5"
                        : "h-10 w-full min-w-0 sm:w-auto sm:min-w-[140px]"
                    }
                    ${confirmVariant === "danger"
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-orange-500 text-white hover:bg-orange-600"
                    }
                `}
            >
                {isLoading ? "Updating..." : confirmText}
            </Button>
        </>
    );

    return createPortal(
        <div
            className="
                fixed inset-0 z-[9999]
                flex items-center justify-center
                bg-black/40
                p-3
                sm:p-4
                md:p-6
            "
        >
            {/* Modal */}
            <div
                className={`
                    flex w-full flex-col
                    overflow-hidden
                    rounded-xl
                    bg-white
                    shadow-2xl
                    dark:bg-gray-900

                    ${compact
                        ? "max-w-sm"
                        : wide
                            ? "max-w-[calc(100vw-1.5rem)] sm:max-w-2xl lg:max-w-5xl"
                            : "max-w-[calc(100vw-1.5rem)] sm:max-w-md md:max-w-lg"
                    }

                    max-h-[calc(100vh-1.5rem)]
                    sm:max-h-[calc(100vh-2rem)]
                    md:max-h-[calc(100vh-3rem)]
                `}
            >
                {/* Header bar: title and description on the left, the actions
                    on the right, both pinned while the body scrolls. */}
                {actionsInHeader && (
                    <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-6 dark:border-gray-800">
                        <div className="min-w-0 flex-1">
                            {title && (
                                <h3 className="break-words text-base font-bold leading-6 text-gray-900 sm:text-lg dark:text-white">
                                    {title}
                                </h3>
                            )}

                            {description && (
                                <p className="mt-1 break-words text-xs leading-5 text-gray-600 sm:text-sm dark:text-gray-300">
                                    {description}
                                </p>
                            )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                            {actionButtons(true)}
                        </div>
                    </div>
                )}

                {/* Scrollable Content */}
                <div className="min-h-0 flex-1 overflow-y-auto">
                    {/* Header / Main Content */}
                    <div
                        className={`
                            px-4
                            pt-4
                            sm:px-6
                            sm:pt-6
                            ${hasFormContent
                                ? "pb-3 sm:pb-4"
                                : "pb-4 sm:pb-2"
                            }
                        `}
                    >
                        {/* Title + Icon */}
                        <div
                            className={
                                hideIcon
                                    ? "block"
                                    : "flex items-start gap-3 sm:gap-4"
                            }
                        >
                            {!hideIcon && (
                                <div className="mt-0.5 sm:mt-1">
                                    {icon}
                                </div>
                            )}

                            <div
                                className={`min-w-0 flex-1 ${hideIcon && !actionsInHeader ? "text-center" : ""
                                    }`}
                            >
                                {/* Title - the header bar shows it instead
                                    when the actions live up there. */}
                                {title && !actionsInHeader && (
                                    <h3
                                        className="
                                            break-words
                                            text-lg
                                            font-bold
                                            leading-6
                                            text-gray-900
                                            sm:text-xl
                                            sm:leading-7
                                            dark:text-white
                                        "
                                    >
                                        {title}
                                    </h3>
                                )}

                                {/* Description */}
                                {description && !actionsInHeader && (
                                    <p
                                        className="
                                            mt-2
                                            break-words
                                            text-sm
                                            leading-5
                                            text-gray-600
                                            sm:leading-6
                                            dark:text-gray-300
                                        "
                                    >
                                        {description}
                                    </p>
                                )}

                                {/* Custom Children */}
                                {children && (
                                    <div className="mt-3 sm:mt-4">
                                        {children}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Form */}
                        {hasFormContent && (
                            <div className="mt-4 space-y-4 sm:mt-5 sm:space-y-4">
                                {/* Date */}
                                {showDateInput && (
                                    <div className="flex flex-col items-start gap-1">
                                        <label
                                            className="
                                                text-sm
                                                font-medium
                                                text-gray-900
                                                dark:text-gray-200
                                            "
                                        >
                                            Checkout Date
                                        </label>

                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => {
                                                if (!dateDisabled) {
                                                    setSelectedDate(
                                                        e.target.value
                                                    );
                                                }
                                            }}
                                            disabled={dateDisabled}
                                            readOnly={dateDisabled}
                                            className="
                                                h-10
                                                w-full
                                                min-w-0
                                                rounded-lg
                                                border
                                                border-gray-300
                                                px-3
                                                text-sm
                                                outline-none
                                                transition
                                                focus:border-blue-500
                                                focus:ring-2
                                                focus:ring-blue-100
                                                dark:border-gray-700
                                                dark:bg-gray-800
                                                dark:text-white
                                                dark:focus:border-blue-500
                                                disabled:cursor-not-allowed
                                                disabled:bg-gray-100
                                                dark:disabled:bg-gray-700
                                            "
                                        />
                                    </div>
                                )}

                                {/* Time Input */}
                                {showTimeInput && (
                                    <div className="flex flex-col items-start gap-1">
                                        <label
                                            className="
                                                flex
                                                items-center
                                                gap-1
                                                text-sm
                                                font-medium
                                                text-gray-700
                                                dark:text-gray-200
                                            "
                                        >
                                            <span className="text-red-500">
                                                *
                                            </span>
                                            <span>Checkout Time</span>
                                        </label>

                                        <input
                                            type="time"
                                            value={selectedTime}
                                            onChange={(e) => {
                                                setSelectedTime(
                                                    e.target.value
                                                );

                                                if (e.target.value) {
                                                    setTimeError(false);
                                                }
                                            }}
                                            className="
                                                h-10
                                                w-full
                                                min-w-0
                                                rounded-lg
                                                border
                                                border-gray-300
                                                px-3
                                                text-sm
                                                outline-none
                                                transition
                                                focus:border-blue-500
                                                focus:ring-2
                                                focus:ring-blue-100
                                                dark:border-gray-700
                                                dark:bg-gray-800
                                                dark:text-white
                                            "
                                        />

                                        {timeError && (
                                            <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                                                <span>
                                                    This field is required.
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Time Dropdown */}
                                {showTimeDropdown && (
                                    <div className="flex flex-col">
                                        <label
                                            className="
                                                mb-1
                                                block
                                                text-sm
                                                font-medium
                                                text-gray-700
                                                dark:text-gray-200
                                            "
                                        >
                                            Select Checkout Time
                                        </label>

                                        <select
                                            value={selectedTime}
                                            onChange={(e) =>
                                                setSelectedTime(
                                                    e.target.value
                                                )
                                            }
                                            className="
                                                h-10
                                                w-full
                                                min-w-0
                                                rounded-lg
                                                border
                                                border-gray-300
                                                bg-white
                                                px-3
                                                text-sm
                                                outline-none
                                                transition
                                                focus:border-blue-500
                                                focus:ring-2
                                                focus:ring-blue-200
                                                dark:border-gray-700
                                                dark:bg-gray-800
                                                dark:text-white
                                            "
                                        >
                                            {timeOptions.map((time) => (
                                                <option
                                                    key={time}
                                                    value={time}
                                                >
                                                    {time}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Comment */}
                                {showComment && (
                                    <div className="flex flex-col items-start gap-1">
                                        <label
                                            className="
                                                flex
                                                items-center
                                                gap-1
                                                text-sm
                                                font-medium
                                                text-gray-700
                                                dark:text-gray-200
                                            "
                                        >
                                            {showRequiredAsterisk && (
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                            )}

                                            <span>{commentLabel}</span>
                                        </label>

                                        <textarea
                                            value={comment}
                                            onChange={(e) => {
                                                setComment(e.target.value);

                                                if (
                                                    e.target.value.trim()
                                                ) {
                                                    setCommentError(false);
                                                }
                                            }}
                                            placeholder={commentPlaceholder}
                                            className="
                                                min-h-[80px]
                                                w-full
                                                min-w-0
                                                resize-y
                                                rounded-lg
                                                border
                                                border-gray-300
                                                px-3
                                                py-2
                                                text-sm
                                                leading-5
                                                outline-none
                                                transition
                                                focus:border-blue-500
                                                focus:ring-2
                                                focus:ring-blue-100
                                                dark:border-gray-700
                                                dark:bg-gray-800
                                                dark:text-white
                                                dark:placeholder:text-gray-500
                                            "
                                        />

                                        {commentError && (
                                            <p className="mt-1 text-xs text-red-500">
                                                This field is required.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer / Buttons */}
                {!actionsInHeader && (
                <div
                    className={`
                        shrink-0
                        border-t
                        border-gray-100
                        bg-white
                        px-4
                        py-4
                        dark:border-gray-800
                        dark:bg-gray-900
                        sm:px-6
                        ${hasFormContent
                            ? "sm:pt-3 sm:pb-6"
                            : "sm:py-6"
                        }
                    `}
                >
                    <div
                        className="
                            flex
                            w-full
                            flex-col-reverse
                            gap-2
                            sm:flex-row
                            sm:justify-center
                            sm:gap-3
                        "
                    >
                        {actionButtons(false)}
                    </div>
                </div>
                )}
            </div>
        </div>,
        document.body
    );
}

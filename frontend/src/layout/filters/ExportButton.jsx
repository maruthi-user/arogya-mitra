import React from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@layout/ui/button";
import { exportToExcel } from "@layout/utils/exportToExcel";
import { runWithProcessingLock } from "@layout/utils/processingLock";

const getValue = (obj, path) => {
    if (!path) return "";
    return path.split(".").reduce((acc, key) => acc?.[key], obj);
};

export default function ExportButton({
    data = [],
    columns = [],
    fileName = "Export",
    sheetName = "Data",
    buttonText = "Export",
    variant = "outline",
    size = "sm",
    disabled,
    loading = false,
    onExport,
    className = "",
}) {

    // The whole export - a caller-supplied onExport (usually a paged fetch of
    // every row) or the local sheet build - runs under the global processing
    // lock, so the page is blocked and a second click cannot start a second
    // export while one is in flight.
    const handleExport = () => runWithProcessingLock(doExport, "Exporting…");

    const doExport = async () => {

        if (onExport) {
            await onExport();
            return;
        }

        const exportRows = data.map((row) => {
            const result = {};

            columns.forEach((col) => {
                if (!col.header || !col.accessor) return;

                let value;

                if (typeof col.exportValue === "function") {
                    value = col.exportValue(row);
                } else {
                    value = getValue(row, col.accessor);
                }

                result[col.header] =
                    value === undefined || value === null ? "" : value;
            });

            return result;
        });

        await exportToExcel({
            data: exportRows,
            fileName,
            sheetName,
        });
    };

    return (
        <Button
            variant="default"
            size={size}
            onClick={handleExport}
            disabled={loading || (disabled ?? data.length === 0)}
            className={`
        inline-flex
        items-center
        justify-center
        gap-1.5
        h-8
        px-3
        text-xs
        leading-none
        whitespace-nowrap
        ${className}
    `}
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : (
                <Upload className="h-4 w-4 shrink-0" />
            )}

            <span className="hidden min-[1025px]:inline ">
                {loading ? "Exporting..." : buttonText}
            </span>
        </Button>
    );
}
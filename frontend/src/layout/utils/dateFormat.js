/** YYYY-MM-DD in the browser's local timezone (matches backend LocalDate semantics). */
export const toLocalDateString = (date = new Date()) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const MONTH_NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Parse any date-ish value into a Date object (display only).
 * Supports Date instances, timestamps, [y, m, d] arrays,
 * "yyyy-mm-dd", ISO datetimes and "dd.MM.yyyy" strings.
 * Returns null for empty/unparseable values.
 */
export const parseDateValue = (value) => {
    if (!value) return null;

    if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : value;
    }

    if (Array.isArray(value)) {
        const [y, m = 1, d = 1, hh = 0, mm = 0, ss = 0] = value;
        const fromArray = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
        return isNaN(fromArray.getTime()) ? null : fromArray;
    }

    if (typeof value === "number") {
        const fromNumber = new Date(value);
        return isNaN(fromNumber.getTime()) ? null : fromNumber;
    }

    const str = String(value).trim();
    if (!str) return null;

    // dd.MM.yyyy (e.g., holiday dates from the backend)
    const ddmmyyyy = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (ddmmyyyy) {
        const parsed = new Date(Number(ddmmyyyy[3]), Number(ddmmyyyy[2]) - 1, Number(ddmmyyyy[1]));
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    // yyyy-mm-dd (avoid UTC shift for plain calendar dates)
    const yyyymmdd = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (yyyymmdd) {
        const parsed = new Date(Number(yyyymmdd[1]), Number(yyyymmdd[2]) - 1, Number(yyyymmdd[3]));
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? null : parsed;
};

/** UI display format: DD/MMM/YYYY (e.g., 14/Aug/2026). */
export const formatDate = (value) => {
    const date = parseDateValue(value);
    if (!date) return "-";

    const day = String(date.getDate()).padStart(2, "0");
    const month = MONTH_NAMES[date.getMonth()];
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
};

export const formatTime = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (isNaN(date.getTime())) return "-";

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
};

/**
 * Date + time: DD/MMM/YYYY with the existing time portion appended.
 * Time is displayed as HH:mm AM/PM (pass { seconds: true } where the
 * view already showed seconds).
 */
export const formatDateTime = (value, { seconds = false } = {}) => {
    const date = parseDateValue(value);
    if (!date) return "-";

    let hours = date.getHours();
    const meridiem = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    const hh = String(hours).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const secs = String(date.getSeconds()).padStart(2, "0");

    return `${formatDate(date)} ${hh}:${minutes}${seconds ? `:${secs}` : ""} ${meridiem}`;
};

/**
 * Date + time with seconds in the standard UI format:
 * DD/MMM/YYYY, h:mm:ss am/pm (e.g., 18/Aug/2026, 4:52:09 pm).
 */
export const formatDateTimeAmPm = (value) => {
    const date = parseDateValue(value);
    if (!date) return "-";

    let hours = date.getHours();
    const meridiem = hours >= 12 ? "pm" : "am";
    hours = hours % 12 || 12;

    const minutes = String(date.getMinutes()).padStart(2, "0");
    const secs = String(date.getSeconds()).padStart(2, "0");

    return `${formatDate(date)}, ${hours}:${minutes}:${secs} ${meridiem}`;
};

/**
 * Worked time for a DSR row.
 *
 * The backend sends totalHours as an "HH:mm" string (DsrReportService
 * .calculateTotalHours), so Number("08:35") is NaN - the source of the
 * "NaNh" that used to show in the Hours column. Decimal values are still
 * accepted in case a caller passes plain hours.
 */
export const formatWorkHours = (value) => {
    if (value == null || value === "") return "-";

    const str = String(value).trim();
    if (!str) return "-";

    // "HH:mm" / "HH:mm:ss" from the DSR report
    const clock = str.match(/^(\d{1,3}):([0-5]\d)(?::([0-5]\d))?$/);
    if (clock) {
        const hours = Number(clock[1]);
        const minutes = Number(clock[2]);
        return minutes ? `${hours}h ${String(minutes).padStart(2, "0")}m` : `${hours}h`;
    }

    // Plain decimal hours (e.g. 8.5)
    const decimal = Number(str);
    if (!Number.isNaN(decimal)) {
        const hours = Math.floor(Math.abs(decimal));
        const minutes = Math.round((Math.abs(decimal) - hours) * 60);
        return minutes ? `${hours}h ${String(minutes).padStart(2, "0")}m` : `${hours}h`;
    }

    return "-";
};

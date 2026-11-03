/**
 * Formats raw enum/status values for display by replacing
 * underscores with spaces.
 *
 * Examples:
 *   "COMP_OFF"          -> "COMP OFF"
 *   "PENDING_APPROVAL"  -> "PENDING APPROVAL"
 *   "FULL_DAY"          -> "FULL DAY"
 *
 * NOTE: This is display-only. Never use it for comparisons,
 * filters or API payloads — always compare against the raw value.
 *
 * @param {string|number|null|undefined} value raw status/enum value
 * @returns {string} value with underscores replaced by spaces
 */
export const formatStatus = (value) => {
  if (value === null || value === undefined || value === "") return value ?? "";
  return String(value).replace(/_/g, " ");
};

export default formatStatus;

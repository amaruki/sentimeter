/**
 * WIB (Western Indonesia Time, UTC+7) Utilities
 *
 * Centralized helpers to ensure all date/time logic uses WIB timezone.
 * This is critical because the app targets the Indonesian stock market (IDX).
 */

const WIB_TIMEZONE = "Asia/Jakarta";

/**
 * Get current date string in WIB as "YYYY-MM-DD"
 */
export function getWibDateString(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: WIB_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  // en-CA locale formats as YYYY-MM-DD
  return parts;
}

/**
 * Get current hour (0-23) in WIB
 */
export function getWibHour(): number {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: WIB_TIMEZONE,
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  return parseInt(parts.find((p) => p.type === "hour")?.value || "0");
}

/**
 * Get formatted WIB time string "HH:MM"
 */
export function getWibTimeString(): string {
  return new Date().toLocaleTimeString("id-ID", {
    timeZone: WIB_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a Date to a WIB locale string for display
 */
export function toWibLocaleString(date: Date): string {
  return date.toLocaleString("id-ID", {
    timeZone: WIB_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }) + " WIB";
}

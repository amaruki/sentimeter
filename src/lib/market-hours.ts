/**
 * Market Hours Utility
 *
 * Checks if the Indonesia Stock Exchange (IDX) is currently open.
 * Handle Jakarta timezone (WIB, UTC+7).
 */

/**
 * Check if today is a weekend
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
}

/**
 * Get current time in Jakarta (WIB)
 */
export function getJakartaTime(): Date {
  const now = new Date();
  
  // Use Intl.DateTimeFormat to get components in Jakarta timezone
  const options = { timeZone: "Asia/Jakarta", hour12: false };
  const parts = new Intl.DateTimeFormat('en-US', {
    ...options,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric'
  }).formatToParts(now);
  
  const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || "0");
  
  const year = getPart('year');
  const month = getPart('month') - 1; // 0-indexed
  const day = getPart('day');
  const hour = getPart('hour');
  const minute = getPart('minute');
  const second = getPart('second');

  // Create a new Date object representing the SAME time but in local system timezone for comparison
  // Actually, it's easier to just work with the parts for checking hours.
  return new Date(year, month, day, hour, minute, second);
}

/**
 * Check if IDX market is currently open
 */
export function isMarketOpen(mockDate?: Date): boolean {
  const now = mockDate || getJakartaTime();
  
  if (isWeekend(now)) return false;

  const hour = now.getHours();
  const minute = now.getMinutes();
  const day = now.getDay(); // 1 (Mon) to 5 (Fri)

  // IDX Trading Hours (WIB):
  // Mon-Thu:
  // Session I: 09:00 - 12:00
  // Session II: 13:30 - 16:00
  // Fri:
  // Session I: 09:00 - 11:30
  // Session II: 13:30 - 16:00

  const timeInMinutes = hour * 60 + minute;

  // Session I Start
  if (timeInMinutes < 9 * 60) return false;

  // Friday Session I End
  if (day === 5) {
    if (timeInMinutes > 11 * 60 + 30 && timeInMinutes < 13 * 60 + 30) return false;
  } else {
    // Mon-Thu Session I End
    if (timeInMinutes > 12 * 60 && timeInMinutes < 13 * 60 + 30) return false;
  }

  // Session II End
  if (timeInMinutes > 16 * 60) return false;

  return true;
}

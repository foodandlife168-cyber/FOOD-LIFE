/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Sri Lanka Business Timezone Utility (Asia/Colombo UTC+05:30)
 */

export interface SLDateComponents {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hours: number;
  minutes: number;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:MM
  formatted: string; // "YYYY-MM-DD HH:MM"
  displayDate: string; // "07 Nov 2026"
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function getSriLankaMonthName(monthNumber: number): string {
  if (monthNumber >= 1 && monthNumber <= 12) {
    return FULL_MONTH_NAMES[monthNumber - 1];
  }
  return '';
}

/**
 * Returns the date components for any ISO timestamp in Sri Lanka Time (UTC+05:30)
 */
export function toSriLankaDate(isoOrDate: string | number | Date = new Date()): SLDateComponents {
  const d = new Date(isoOrDate);
  const time = isNaN(d.getTime()) ? new Date() : d;

  // Add 5 hours and 30 minutes to UTC epoch
  const slOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const slEpoch = new Date(time.getTime() + slOffsetMs);

  const year = slEpoch.getUTCFullYear();
  const month = slEpoch.getUTCMonth() + 1;
  const day = slEpoch.getUTCDate();
  const hours = slEpoch.getUTCHours();
  const minutes = slEpoch.getUTCMinutes();

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${year}-${pad(month)}-${pad(day)}`;
  const timeStr = `${pad(hours)}:${pad(minutes)}`;
  const displayDate = `${pad(day)} ${MONTH_NAMES[month - 1]} ${year}`;

  return {
    year,
    month,
    day,
    hours,
    minutes,
    dateStr,
    timeStr,
    formatted: `${displayDate} at ${timeStr} (SLT)`,
    displayDate,
  };
}

/**
 * Formats a currency value in Sri Lankan Rupees (LKR)
 */
export function formatLKR(amount: number): string {
  const val = isNaN(amount) ? 0 : amount;
  return `LKR ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formats an amount with standard comma separation
 */
export function formatLKRShort(amount: number): string {
  const val = isNaN(amount) ? 0 : amount;
  return `Rs. ${Math.round(val).toLocaleString('en-US')}`;
}

/**
 * Determines whether a transaction's ISO date falls inside a given period in Sri Lanka Time.
 */
export function isWithinSLTPeriod(
  isoDate: string,
  periodType: 'daily' | 'monthly' | 'annual' | 'custom',
  target: {
    dailyDate?: string; // 'YYYY-MM-DD'
    monthlyMonth?: number; // 1-12
    monthlyYear?: number; // 2026
    annualYear?: number; // 2026
    fromDate?: string; // 'YYYY-MM-DD'
    toDate?: string; // 'YYYY-MM-DD'
  }
): boolean {
  if (!isoDate) return false;
  const sl = toSriLankaDate(isoDate);

  if (periodType === 'daily') {
    if (!target.dailyDate) return true;
    return sl.dateStr === target.dailyDate;
  }

  if (periodType === 'monthly') {
    const y = target.monthlyYear || sl.year;
    const m = target.monthlyMonth || sl.month;
    return sl.year === y && sl.month === m;
  }

  if (periodType === 'annual') {
    const y = target.annualYear || sl.year;
    return sl.year === y;
  }

  if (periodType === 'custom') {
    if (target.fromDate && sl.dateStr < target.fromDate) return false;
    if (target.toDate && sl.dateStr > target.toDate) return false;
    return true;
  }

  return true;
}

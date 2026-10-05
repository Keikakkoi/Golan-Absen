export interface ReportMonthRange {
  start: string;
  end: string;
}

/** Date-only helpers. Do not construct Date from an ISO date-only string. */
export function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateOnly(value: string | Date): string {
  if (typeof value === 'string') return value.slice(0, 10);
  return localDateString(value);
}

/** Returns a date-only value using the application's authoritative WIB zone. */
export function jakartaDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values['year']}-${values['month']}-${values['day']}`;
}

/** Revision uses the report's date, never a request/review timestamp. */
export function isSameJakartaDate(reportDate: string | Date, now = new Date()): boolean {
  const reportDateText = typeof reportDate === 'string'
    ? reportDate.slice(0, 10)
    : jakartaDateString(reportDate);
  return reportDateText === jakartaDateString(now);
}

export function monthRange(month: string): ReportMonthRange {
  const [year, monthNumber] = month.split('-').map(Number);
  // Use UTC only for month arithmetic. The values returned by this helper
  // are date-only strings, so they must not depend on the browser's local
  // timezone (or on a DST transition).
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return {
    start: `${year}-${String(monthNumber).padStart(2, '0')}-01`,
    end: `${year}-${String(monthNumber).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  };
}

export function reportDayStatus(date: string, hasReport: boolean, today = jakartaDateString()): 'reported' | 'missing' | 'future' {
  if (hasReport) return 'reported';
  return date > today ? 'future' : 'missing';
}

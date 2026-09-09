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

export function monthRange(month: string): ReportMonthRange {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return {
    start: `${year}-${String(monthNumber).padStart(2, '0')}-01`,
    end: `${year}-${String(monthNumber).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  };
}

export function reportDayStatus(date: string, hasReport: boolean, today = localDateString()): 'reported' | 'missing' | 'future' {
  if (hasReport) return 'reported';
  return date > today ? 'future' : 'missing';
}

import { dateOnly, isSameJakartaDate, jakartaDateString, localDateString, monthRange, reportDayStatus } from './work-report-date.utils';

describe('work report date helpers', () => {
  it('returns the exact number of days, including leap-year February', () => {
    expect(monthRange('2024-02').start).toBe('2024-02-01');
    expect(monthRange('2024-02').end).toBe('2024-02-29');
    expect(monthRange('2025-02').end).toBe('2025-02-28');
    expect(monthRange('2025-04').end).toBe('2025-04-30');
    expect(monthRange('2025-01').end).toBe('2025-01-31');
  });

  it('formats local dates without UTC conversion', () => {
    expect(localDateString(new Date(2025, 0, 5))).toBe('2025-01-05');
    expect(dateOnly('2025-01-05T00:00:00Z')).toBe('2025-01-05');
  });

  it('uses report existence first, then date relative to today', () => {
    expect(reportDayStatus('2025-01-05', true, '2025-01-10')).toBe('reported');
    expect(reportDayStatus('2025-01-05', false, '2025-01-10')).toBe('missing');
    expect(reportDayStatus('2025-01-11', false, '2025-01-10')).toBe('future');
  });

  it('compares revision dates in Asia/Jakarta', () => {
    const justBeforeJakartaMidnight = new Date('2026-10-02T16:59:59.000Z');
    const justAfterJakartaMidnight = new Date('2026-10-02T17:00:01.000Z');
    expect(jakartaDateString(justBeforeJakartaMidnight)).toBe('2026-10-02');
    expect(jakartaDateString(justAfterJakartaMidnight)).toBe('2026-10-03');
    expect(isSameJakartaDate('2026-10-03T00:00:00Z', justAfterJakartaMidnight)).toBeTrue();
    expect(isSameJakartaDate('2026-10-02', justAfterJakartaMidnight)).toBeFalse();
  });
});

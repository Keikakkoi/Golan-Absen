import { dateOnly, localDateString, monthRange, reportDayStatus } from './work-report-date.utils';

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
});

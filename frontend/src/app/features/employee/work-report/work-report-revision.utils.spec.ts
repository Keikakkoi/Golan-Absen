import {
  formatWorkReportRevisionDeadline,
  isWorkReportRevisionWithinDeadline,
  workReportRevisionDeadline
} from './work-report-revision.utils';

describe('work report revision deadline', () => {
  const rejectedAt = '2026-10-03T23:59:59.123+07:00';

  it('uses the rejection timestamp, not the report date', () => {
    const deadline = workReportRevisionDeadline(rejectedAt);
    expect(deadline?.toISOString()).toBe('2026-10-04T16:59:59.123Z');
  });

  it('allows the exact 24-hour boundary and rejects after it', () => {
    const deadline = workReportRevisionDeadline(rejectedAt)!;
    expect(isWorkReportRevisionWithinDeadline(rejectedAt, deadline)).toBeTrue();
    expect(isWorkReportRevisionWithinDeadline(rejectedAt, new Date(deadline.getTime() + 1))).toBeFalse();
  });

  it('formats the last revision time in Asia/Jakarta with seconds', () => {
    const label = formatWorkReportRevisionDeadline(rejectedAt);
    expect(label).toContain('04 Oktober 2026');
    expect(label).toContain('23.59.59');
    expect(label).toContain('WIB');
  });
});

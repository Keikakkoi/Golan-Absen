const REVISION_WINDOW_MS = 24 * 60 * 60 * 1000;

export function workReportRevisionDeadline(rejectedAt?: string | Date | null): Date | null {
  if (!rejectedAt) return null;
  const parsed = rejectedAt instanceof Date ? new Date(rejectedAt.getTime()) : new Date(rejectedAt);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getTime() + REVISION_WINDOW_MS);
}

/** Inclusive comparison: rejected_at + 24 hours is still valid. */
export function isWorkReportRevisionWithinDeadline(rejectedAt: string | Date | null | undefined, now = new Date()): boolean {
  const deadline = workReportRevisionDeadline(rejectedAt);
  return deadline !== null && now.getTime() <= deadline.getTime();
}

export function formatWorkReportRevisionDeadline(rejectedAt: string | Date | null | undefined): string {
  const deadline = workReportRevisionDeadline(rejectedAt);
  if (!deadline) return 'Batas revisi tidak tersedia karena waktu penolakan tidak tercatat.';
  const label = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(deadline);
  return `${label} WIB`;
}

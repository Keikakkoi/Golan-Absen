/**
 * Canonical display adapter for the historical `judul` and `tugas` fields.
 * When both values exist they are joined as `<judul> — <tugas>`.
 * The raw legacy fields are never rewritten by this adapter.
 */
export const WORK_REPORT_TITLE_TASK_SEPARATOR = ' — ';

export function combineWorkReportTitleTask(judul: unknown, tugas: unknown): string {
  const title = String(judul ?? '').trim();
  const task = String(tugas ?? '').trim();
  if (!title) return task;
  if (!task) return title;
  return `${title}${WORK_REPORT_TITLE_TASK_SEPARATOR}${task}`;
}

export function canonicalWorkReportTitle(report: any): string {
  const canonical = String(report?.judul_tugas ?? report?.JudulTugas ?? '').trim();
  return canonical || combineWorkReportTitleTask(
    report?.judul ?? report?.Judul,
    report?.tugas ?? report?.Tugas
  );
}

export function canonicalWorkReportTitlePayload(value: unknown): { judul_tugas: string } {
  return { judul_tugas: String(value ?? '').trim() };
}

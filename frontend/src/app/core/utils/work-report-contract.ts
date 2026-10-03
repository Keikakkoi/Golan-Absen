// `legacy_logbook` remains compatibility metadata. Only an owner MAGANG Draft
// may be repaired to `work_report` through the canonical write endpoint.
export type WorkReportKind = 'work_report' | 'legacy_logbook';
export type WorkReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'no_report';
export type WorkReportFillingStatus = 'draft' | 'submitted' | 'no_report';
export type WorkReportReviewStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'no_report';
export type WorkReportSubmissionTiming = 'on_time' | 'late';

export const WORK_REPORT_NO_REPORT_STATUS: WorkReportStatus = 'no_report';
export const WORK_REPORT_NO_REPORT_LABEL = 'Belum Membuat Laporan Kerja';

export interface WorkReportContract {
  report_kind: WorkReportKind;
  status: WorkReportStatus;
  filling_status: WorkReportFillingStatus;
  review_status: WorkReportReviewStatus;
  submission_timing: WorkReportSubmissionTiming;
  // Raw legacy status is preserved only so historical rows remain readable.
  legacy_status_logbook?: string;
}

function normalized(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function hasNonEmptyJSON(value: unknown): boolean {
  if (value === null || value === undefined || String(value).trim() === '') return false;
  if (typeof value !== 'string') {
    if (Array.isArray(value)) return value.some(item => hasNonEmptyJSON(item));
    if (typeof value === 'object') return Object.values(value).some(item => hasNonEmptyJSON(item));
    return true;
  }
  try {
    const parsed = JSON.parse(value);
    if (parsed === null) return false;
    if (Array.isArray(parsed)) return parsed.some(item => hasNonEmptyJSON(item));
    if (typeof parsed === 'object') return Object.values(parsed).some(item => hasNonEmptyJSON(item));
    return String(parsed).trim() !== '';
  } catch {
    return true;
  }
}

export function hasWorkReportContent(row: any): boolean {
  if (!row) return false;
  const values = [
    row.judul_tugas, row.JudulTugas, row.judul, row.Judul, row.tugas, row.Tugas,
    row.deskripsi_kegiatan, row.DeskripsiKegiatan,
    row.realisasi_kegiatan, row.RealisasiKegiatan,
    row.kendala, row.Kendala,
    row.rencana_minggu_depan, row.RencanaMingguDepan,
    row.link_artikel, row.LinkArtikel,
    row.catatan_tambahan, row.CatatanTambahan
  ];
  if (values.some(value => String(value ?? '').trim() !== '')) return true;
  const attachments = row.attachments || row.Attachments;
  return (Array.isArray(attachments) && attachments.length > 0) || hasNonEmptyJSON(row.custom_fields ?? row.CustomFields);
}

function isNoReportSource(row: any): boolean {
  const state = normalized(row?.status ?? row?.state ?? row?.completion_state ?? row?.completionState);
  const marker = normalized(row?.status_sesuai ?? row?.StatusSesuai);
  const hasReport = row?.has_report ?? row?.hasReport;
  const explicitlyMissing = hasReport === false || hasReport === 0 || normalized(hasReport) === 'false';
  const legacyStatus = normalized(row?.status_logbook ?? row?.StatusLogbook);
  const explicitLegacyWorkflow = row?.report_kind === 'legacy_logbook'
    || (!!legacyStatus && row?.status_laporan == null && row?.status == null && row?.state == null);
  return state === 'no_report' || state === 'missing' || state === 'not_filled'
    || marker === 'tidak membuat laporan kerja' || explicitlyMissing
    || (!explicitLegacyWorkflow && !hasWorkReportContent(row));
}

export function normalizeWorkReportContract(row: any): WorkReportContract {
  const hasLegacyStatusField = row?.status_logbook != null || row?.StatusLogbook != null;
  const kind: WorkReportKind = row?.report_kind === 'legacy_logbook'
    || (!row?.report_kind && hasLegacyStatusField)
    ? 'legacy_logbook'
    : 'work_report';
  const lateValue = row?.is_late_submission;
  const late = lateValue === true || lateValue === 1
    || String(lateValue ?? '').trim().toLowerCase() === 'true'
    || String(lateValue ?? '').trim() === '1';

  if (isNoReportSource(row)) {
    return {
      report_kind: kind,
      status: WORK_REPORT_NO_REPORT_STATUS,
      filling_status: 'no_report',
      review_status: 'no_report',
      submission_timing: late ? 'late' : 'on_time',
      ...(kind === 'legacy_logbook' ? {
        legacy_status_logbook: row?.legacy_status_logbook ?? row?.status_logbook ?? row?.StatusLogbook,
      } : {}),
    };
  }

  if (kind === 'legacy_logbook') {
    const raw = String(row?.status_logbook ?? row?.StatusLogbook ?? '').trim().toLowerCase();
    const fillingStatus: WorkReportFillingStatus = raw === 'draft' ? 'draft' : 'submitted';
    let status: WorkReportStatus = fillingStatus === 'draft' ? 'draft' : 'submitted';
    let reviewStatus: WorkReportReviewStatus = fillingStatus === 'draft' ? 'draft' : 'pending';

    if (raw === 'approved') {
      status = 'approved';
      reviewStatus = 'approved';
    } else if (raw === 'rejected') {
      status = 'rejected';
      reviewStatus = 'rejected';
    }

    return {
      report_kind: kind,
      status,
      filling_status: fillingStatus,
      review_status: reviewStatus,
      submission_timing: late ? 'late' : 'on_time',
      legacy_status_logbook: row?.legacy_status_logbook ?? row?.status_logbook ?? row?.StatusLogbook,
    };
  }

  const fillingStatus: WorkReportFillingStatus = String(row?.status_laporan ?? '').trim().toLowerCase() === 'draft'
    ? 'draft'
    : 'submitted';
  let status: WorkReportStatus = fillingStatus === 'draft' ? 'draft' : 'submitted';
  let reviewStatus: WorkReportReviewStatus = fillingStatus === 'draft' ? 'draft' : 'pending';
  const validation = String(row?.status_sesuai ?? '').trim().toLowerCase();
  if (fillingStatus === 'submitted' && validation === 'sesuai') {
    status = 'approved';
    reviewStatus = 'approved';
  } else if (fillingStatus === 'submitted' && ['tidak sesuai', 'minta perbaikan', 'minta_perbaikan'].includes(validation)) {
    status = 'rejected';
    reviewStatus = 'rejected';
  }

  return {
    report_kind: kind,
    status,
    filling_status: fillingStatus,
    review_status: reviewStatus,
    submission_timing: late ? 'late' : 'on_time',
  };
}

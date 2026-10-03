import { normalizeWorkReportContract } from './work-report-contract';
import { canonicalWorkReportTitle } from './work-report-title';

export interface CanonicalWorkReportExportFields {
  judul_tugas?: string;
  status_pengisian?: string;
  status_validasi?: string;
  [key: string]: unknown;
}

export interface CanonicalWorkReportExportRecord {
  judul_tugas: string;
  report_kind: string;
  status: string;
  status_canonical: string;
  filling_status_canonical: string;
  review_status_canonical: string;
  submission_timing: string;
  status_pengisian?: string;
  status_validasi?: string;
  [key: string]: unknown;
}

/**
 * Builds the JSON representation used by every active work-report exporter.
 * Raw workflow fields stay available under explicit legacy_* names so a
 * historical value cannot be mistaken for the canonical display status.
 */
export function canonicalWorkReportExportRecord(row: any, fields: CanonicalWorkReportExportFields = {}): CanonicalWorkReportExportRecord {
  const contract = normalizeWorkReportContract(row);
  const {
    status_laporan,
    status_sesuai,
    status_logbook,
    StatusLogbook,
    status: rawStatus,
    state: rawState,
    completion_state: rawCompletionState,
    ...rest
  } = row || {};

  return {
    ...rest,
    judul_tugas: fields.judul_tugas ?? canonicalWorkReportTitle(row),
    report_kind: contract.report_kind,
    status: contract.status,
    status_canonical: contract.status,
    filling_status_canonical: contract.filling_status,
    review_status_canonical: contract.review_status,
    submission_timing: contract.submission_timing,
    ...(fields.status_pengisian !== undefined ? { status_pengisian: fields.status_pengisian } : {}),
    ...(fields.status_validasi !== undefined ? { status_validasi: fields.status_validasi } : {}),
    ...(status_laporan !== undefined ? { legacy_status_laporan: status_laporan } : {}),
    ...(status_sesuai !== undefined ? { legacy_status_sesuai: status_sesuai } : {}),
    ...(status_logbook !== undefined ? { legacy_status_logbook: status_logbook } : {}),
    ...(StatusLogbook !== undefined ? { legacy_status_logbook_pascal: StatusLogbook } : {}),
    ...(rawStatus !== undefined ? { legacy_status: rawStatus } : {}),
    ...(rawState !== undefined ? { legacy_state: rawState } : {}),
    ...(rawCompletionState !== undefined ? { legacy_completion_state: rawCompletionState } : {}),
  };
}

import { canonicalWorkReportTitle } from './work-report-title';
import { hasWorkReportContent, normalizeWorkReportContract } from './work-report-contract';

const TITLE_REQUIRED_DIVISIONS = new Set([
  'golan nusantara',
  'golan education'
]);

export type ReportCompletenessStatus = 'draft' | 'no_report' | 'incomplete' | 'complete';

export function normalizeDivisionName(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function divisionNameFromReport(report: any, fallbackDivision = ''): string {
  const candidates = [
    report?.Employee?.Division?.NamaDivisi,
    report?.Employee?.Division?.nama_divisi,
    report?.Employee?.division?.NamaDivisi,
    report?.Employee?.division?.nama_divisi,
    report?.employee?.Division?.NamaDivisi,
    report?.employee?.Division?.nama_divisi,
    report?.employee?.division?.NamaDivisi,
    report?.employee?.division?.nama_divisi,
    report?.division?.NamaDivisi,
    report?.division?.nama_divisi,
    report?.Divisi,
    report?.divisi,
    fallbackDivision
  ];
  return String(candidates.find(value => String(value ?? '').trim() !== '') ?? '').trim();
}

export function requiresReportTitle(reportOrDivision: any, fallbackDivision = ''): boolean {
  const division = typeof reportOrDivision === 'string'
    ? reportOrDivision
    : divisionNameFromReport(reportOrDivision, fallbackDivision);
  return TITLE_REQUIRED_DIVISIONS.has(normalizeDivisionName(division));
}

export function hasReportContent(report: any): boolean {
  return hasWorkReportContent(report);
}

export function hasRequiredReportFields(report: any, fallbackDivision = ''): boolean {
  const deskripsi = String(report?.deskripsi_kegiatan ?? report?.DeskripsiKegiatan ?? '').trim();
  return Boolean(canonicalWorkReportTitle(report) && deskripsi);
}

export function reportStatus(report: any, fallbackDivision = ''): ReportCompletenessStatus {
  const canonicalStatus = normalizeWorkReportContract(report).status;
  if (canonicalStatus === 'no_report') return 'no_report';
  const fillingStatus = String(report?.status_laporan ?? report?.StatusLaporan ?? '').trim().toLowerCase();
  if (fillingStatus === 'draft') return 'draft';

  return hasRequiredReportFields(report, fallbackDivision) ? 'complete' : 'incomplete';
}

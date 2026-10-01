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
  if (!report) return false;
  const values = [
    report.tugas,
    report.judul,
    report.deskripsi_kegiatan,
    report.realisasi_kegiatan,
    report.kendala,
    report.rencana_minggu_depan,
    report.link_artikel,
    report.catatan_tambahan,
    report.Tugas,
    report.Judul,
    report.DeskripsiKegiatan,
    report.RealisasiKegiatan,
    report.Kendala,
    report.RencanaMingguDepan,
    report.LinkArtikel,
    report.CatatanTambahan
  ];
  if (values.some(value => String(value ?? '').trim() !== '')) return true;

  const attachments = report.attachments || report.Attachments;
  if (Array.isArray(attachments) && attachments.length > 0) return true;

  const rawCustomFields = report.custom_fields || report.CustomFields;
  if (!rawCustomFields) return false;
  try {
    const customFields = typeof rawCustomFields === 'string' ? JSON.parse(rawCustomFields) : rawCustomFields;
    return Object.values(customFields || {}).some(value => String(value ?? '').trim() !== '');
  } catch {
    return false;
  }
}

export function hasRequiredReportFields(report: any, fallbackDivision = ''): boolean {
  const tugas = String(report?.tugas ?? report?.Tugas ?? '').trim();
  const deskripsi = String(report?.deskripsi_kegiatan ?? report?.DeskripsiKegiatan ?? '').trim();
  const judul = String(report?.judul ?? report?.Judul ?? '').trim();
  return Boolean(tugas && deskripsi && (!requiresReportTitle(report, fallbackDivision) || judul));
}

export function reportStatus(report: any, fallbackDivision = ''): ReportCompletenessStatus {
  const fillingStatus = String(report?.status_laporan ?? report?.StatusLaporan ?? '').trim().toLowerCase();
  if (fillingStatus === 'draft') return 'draft';

  const validationStatus = String(report?.status_sesuai ?? report?.StatusSesuai ?? '').trim().toLowerCase();
  if (validationStatus === 'tidak membuat laporan kerja' || !hasReportContent(report)) return 'no_report';
  return hasRequiredReportFields(report, fallbackDivision) ? 'complete' : 'incomplete';
}

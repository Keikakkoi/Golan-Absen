import { normalizeWorkReportContract } from './work-report-contract';

describe('normalizeWorkReportContract', () => {
  it('maps legacy approved logbooks and preserves their raw status', () => {
    expect(normalizeWorkReportContract({
      report_kind: 'legacy_logbook',
      status_logbook: 'approved',
      deskripsi_kegiatan: 'Isi historis',
      is_late_submission: true,
    })).toEqual({
      report_kind: 'legacy_logbook',
      status: 'approved',
      filling_status: 'submitted',
      review_status: 'approved',
      submission_timing: 'late',
      legacy_status_logbook: 'approved',
    });
  });

  it('maps the retired improvement label to rejected', () => {
    expect(normalizeWorkReportContract({
      report_kind: 'work_report',
      status_laporan: 'submitted',
      status_sesuai: 'Minta Perbaikan',
      deskripsi_kegiatan: 'Isi laporan',
    }).status).toBe('rejected');
  });

  it('maps blank historical canonical rows to no_report', () => {
    const contract = normalizeWorkReportContract({
      report_kind: 'work_report',
    });
    expect(contract.status).toBe('no_report');
    expect(contract.filling_status).toBe('no_report');
    expect(contract.review_status).toBe('no_report');
  });

  it('maps the legacy missing marker to no_report', () => {
    const contract = normalizeWorkReportContract({
      report_kind: 'work_report',
      status_laporan: 'submitted',
      status_sesuai: 'tidak membuat laporan kerja',
      deskripsi_kegiatan: ''
    });
    expect(contract.status).toBe('no_report');
    expect(contract.review_status).toBe('no_report');
  });

  it('maps missing completion responses to no_report', () => {
    expect(normalizeWorkReportContract({
      state: 'missing',
      has_report: false
    })).toEqual({
      report_kind: 'work_report',
      status: 'no_report',
      filling_status: 'no_report',
      review_status: 'no_report',
      submission_timing: 'on_time'
    });
  });

  it('keeps non-empty submitted reports submitted', () => {
    expect(normalizeWorkReportContract({
      report_kind: 'work_report',
      status_laporan: 'submitted',
      deskripsi_kegiatan: 'Isi laporan'
    }).status).toBe('submitted');
  });
});

import { WorkReportComponent } from './work-report.component';
import { WorkReport } from '../../../core/services/work-report.service';
import { jakartaDateString } from './work-report-date.utils';

describe('WorkReportComponent canonical contract', () => {
  function createComponent(): WorkReportComponent {
    return Object.create(WorkReportComponent.prototype) as WorkReportComponent;
  }

  function report(overrides: Partial<WorkReport> = {}): WorkReport {
    return {
      ID: 1,
      tanggal: '2026-10-01',
      tugas: 'Menyusun laporan',
      judul: 'Pekerjaan magang',
      deskripsi_kegiatan: 'Menyelesaikan pekerjaan',
      realisasi_kegiatan: '100%',
      kendala: '',
      rencana_minggu_depan: '',
      link_artikel: '',
      catatan_tambahan: '',
      custom_fields: '{}',
      ...overrides
    };
  }

  it('uses canonical review status for labels and edit permission', () => {
    const component = createComponent();

    expect(component.validationStatusLabel(report({ status_laporan: 'submitted' }))).toBe('Menunggu Review');
    expect(component.validationStatusLabel(report({ status_laporan: 'submitted', status_sesuai: 'Sesuai' }))).toBe('Disetujui');
    expect(component.validationStatusLabel(report({ status_laporan: 'submitted', status_sesuai: 'Tidak Sesuai' }))).toBe('Ditolak');
    expect(component.canModifyReport(report({ status_laporan: 'submitted', status_sesuai: 'Sesuai' }))).toBeFalse();
    expect(component.canModifyReport(report({ tanggal: jakartaDateString(), status_laporan: 'submitted', status_sesuai: 'Tidak Sesuai' }))).toBeTrue();
    expect(component.canModifyReport(report({ tanggal: '2000-01-01', status_laporan: 'submitted', status_sesuai: 'Tidak Sesuai' }))).toBeFalse();
  });

  it('allows only legacy Draft records to use canonical edit/delete actions', () => {
    const component = createComponent();

    expect(component.canModifyReport(report({ report_kind: 'legacy_logbook', status_logbook: 'draft' }))).toBeTrue();
    expect(component.canModifyReport(report({ report_kind: 'legacy_logbook', status_logbook: 'submitted' }))).toBeFalse();
    expect(component.canModifyReport(report({ report_kind: 'legacy_logbook', status_logbook: 'approved' }))).toBeFalse();
    expect(component.canModifyReport(report({ report_kind: 'legacy_logbook', status_logbook: 'rejected' }))).toBeFalse();
    expect(component.validationStatusLabel(report({ report_kind: 'legacy_logbook', status_logbook: 'approved' }))).toBe('Disetujui');
  });

  it('shows rejection reasons from the canonical rejected state', () => {
    const component = createComponent();
    const rejected = report({
      status_laporan: 'submitted',
      status_sesuai: 'Tidak Sesuai',
      rejection_reason: 'Deskripsi perlu dilengkapi'
    });

    expect(component.rejectionReason(rejected)).toBe('Deskripsi perlu dilengkapi');
    expect(component.reviewOrRejectionNote(rejected)).toContain('Alasan Penolakan: Deskripsi perlu dilengkapi');
  });

  it('shows the two-stage approval status and review notes', () => {
    const component = createComponent();
    const pending = report({
      status_laporan: 'submitted',
      manager_review_status: 'pending',
      admin_validation_status: 'not_required'
    });
    expect(component.validationStatusLabel(pending)).toBe('Menunggu Persetujuan Manajer');

    const managerApproved = report({
      status_laporan: 'submitted',
      manager_review_status: 'approved',
      admin_validation_status: 'pending',
      manager_review_notes: 'Target sudah sesuai.'
    });
    expect(component.validationStatusLabel(managerApproved)).toBe('Disetujui Manajer / Menunggu Validasi HRD');
    expect(component.reviewOrRejectionNote(managerApproved)).toContain('Catatan Manager: Target sudah sesuai.');

    const final = report({
      status_laporan: 'submitted',
      manager_review_status: 'approved',
      admin_validation_status: 'approved'
    });
    expect(component.validationStatusLabel(final)).toBe('Tervalidasi HRD/Admin');
  });

  it('treats no_report as a neutral state without workflow actions', () => {
    const component = createComponent();
    const missing = report({ status_laporan: 'submitted', status_sesuai: 'tidak membuat laporan kerja', judul: '', tugas: '', deskripsi_kegiatan: '' });

    expect(component.validationStatusLabel(missing)).toBe('Belum Membuat Laporan Kerja');
    expect(component.reportFillingLabel(missing)).toBe('Belum Membuat Laporan Kerja');
    expect(component.canModifyReport(missing)).toBeFalse();
  });

  it('keeps future calendar dates neutral even when the API marks them no_report', () => {
    const component = createComponent();

    expect(component.getDayStatus({ employee_id: 0, tanggal: '2026-10-06', has_report: false, status: 'no_report' }, '2026-10-05')).toBe('future');
    expect(component.getDayStatus({ employee_id: 0, tanggal: '2026-10-05', has_report: false, status: 'no_report' }, '2026-10-05')).toBe('no_report');
    expect(component.getDayStatus({ employee_id: 0, tanggal: '2026-10-04', has_report: false, status: 'no_report' }, '2026-10-05')).toBe('no_report');
    expect(component.getDayStatus({ employee_id: 0, tanggal: '2026-10-06', has_report: true, status: 'submitted' }, '2026-10-05')).toBe('reported');
  });
});

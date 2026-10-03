import { WorkReportAdminComponent } from './work-report-admin.component';

describe('WorkReportAdminComponent validation status colors', () => {
  function createComponent(): WorkReportAdminComponent {
    return new WorkReportAdminComponent({} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { snapshot: { queryParamMap: { get: () => null } } } as any, {} as any);
  }

  function report(status: string, fillingStatus = 'submitted'): any {
    return { status_sesuai: status, status_laporan: fillingStatus, tugas: 'Tugas', deskripsi_kegiatan: 'Deskripsi' };
  }

  function emptyReport(): any {
    return { status_laporan: 'submitted', tugas: '', judul: '', deskripsi_kegiatan: '' };
  }

  it('maps each validation status to its dedicated badge class', () => {
    const component = createComponent();

    expect(component.validationStatusClass(report(''))).toBe('validation-status-pending');
    expect(component.validationStatusClass(report('Sesuai'))).toBe('validation-status-approved');
    expect(component.validationStatusClass(report('Validasi laporan'))).toBe('validation-status-approved');
    expect(component.validationStatusClass(report('Tidak Sesuai'))).toBe('validation-status-rejected');
    expect(component.validationStatusClass(report('Tolak laporan'))).toBe('validation-status-rejected');
    expect(component.validationStatusClass(report('Minta Perbaikan'))).toBe('validation-status-rejected');
    expect(component.validationLabel(report('Minta Perbaikan'))).toBe('Tolak laporan');
    expect(component.validationStatusClass(report('tidak perlu validasi'))).toBe('validation-status-none');
  });

  it('uses the neutral class for automatic no-report rows', () => {
    const component = createComponent();

    expect(component.validationStatusClass(emptyReport())).toBe('validation-status-none');
    expect(component.validationLabel(emptyReport())).toBe('Tidak perlu validasi');
    expect(component.reportStatusLabel(emptyReport())).toBe('Belum Membuat Laporan Kerja');
    expect(component.reportFillingLabel(emptyReport())).toBe('Belum Membuat Laporan Kerja');
    expect(component.reportFillingLabel(report(''))).toBe('Submitted');
  });

  it('keeps Manager and Admin notes separate and labeled', () => {
    const component = createComponent();
    const row: any = {
      ID: 7,
      status_laporan: 'submitted',
      tugas: 'Tugas',
      deskripsi_kegiatan: 'Deskripsi',
      review_notes: 'Perjelas bukti kegiatan',
      admin_notes: 'Sudah diperiksa HRD'
    };

    component['initializeAdminNotes']([row]);

    expect(component.managerAdminNote(row)).toBe(
      'Catatan Manager: Perjelas bukti kegiatan\nCatatan Admin: Sudah diperiksa HRD'
    );
  });

  it('identifies and filters Karyawan, MANAJER, and MAGANG in one inbox', () => {
    const component = createComponent();
    const makeReport = (id: number, role: string, team: string): any => ({
      ID: id,
      EmployeeID: id,
      Employee: {
        UserID: id,
        User: { ID: id, Nama: `${role} User`, Role: role, TeamID: team },
        Division: { NamaDivisi: 'Operasional' },
        Position: { NamaJabatan: 'Staff' }
      },
      tanggal: '2026-10-01',
      tugas: 'Tugas',
      judul: 'Judul',
      deskripsi_kegiatan: 'Deskripsi',
      realisasi_kegiatan: '100%',
      status_laporan: 'submitted',
      status_sesuai: ''
    });

    component.allReports = [
      makeReport(1, 'Karyawan', 'Tim A'),
      makeReport(2, 'MANAJER', 'Tim B'),
      makeReport(3, 'MAGANG', 'Tim Magang')
    ];
    component['buildReportFilterOptions']();
    expect(component.reporterRoles).toEqual(['Karyawan', 'MANAJER', 'MAGANG']);
    expect(component.reporterRole(component.allReports[2])).toBe('MAGANG');
    expect(component.uniqueTeams).toContain('Tim Magang');

    component.filterOptions.role = 'MAGANG';
    component.applyFilters();
    expect(component.reports.length).toBe(1);
    expect(component.getEmployeeName(component.reports[0])).toBe('MAGANG User');
  });

  it('uses the shared status contract for legacy internship rows', () => {
    const component = createComponent();
    const legacy: any = {
      ID: 9,
      report_kind: 'legacy_logbook',
      status_logbook: 'rejected',
      status_laporan: 'submitted',
      tugas: 'Tugas lama',
      deskripsi_kegiatan: 'Deskripsi lama'
    };

    expect(component.validationSelection(legacy)).toBe('Tidak Sesuai');
    expect(component.validationLabel(legacy)).toBe('Tolak laporan');
    expect(component.validationStatusClass(legacy)).toBe('validation-status-rejected');
  });

  it('opens one shared detail model for an intern report and preserves attachments', () => {
    const component = createComponent();
    const report: any = {
      ID: 7,
      Employee: { User: { Nama: 'Peserta Magang', Role: 'MAGANG' } },
      tanggal: '2026-10-02',
      status_laporan: 'submitted',
      status_sesuai: 'Tidak Sesuai',
      rejection_reason: 'Bukti perlu diperjelas',
      attachments: [{ file_url: '/uploads/bukti.png', file_name: 'bukti.png' }]
    };

    component.viewReportDetail(report);
    expect(component.selectedReportDetail).toBe(report);
    expect(component.rejectionReason(report)).toContain('Bukti perlu diperjelas');
    expect(report.attachments.length).toBe(1);
    component.closeReportDetail();
    expect(component.selectedReportDetail).toBeNull();
  });
});

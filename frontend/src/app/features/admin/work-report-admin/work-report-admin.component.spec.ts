import { WorkReportAdminComponent } from './work-report-admin.component';

describe('WorkReportAdminComponent validation status colors', () => {
  function createComponent(): WorkReportAdminComponent {
    return new WorkReportAdminComponent({} as any, {} as any, {} as any, {} as any, {} as any);
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
});

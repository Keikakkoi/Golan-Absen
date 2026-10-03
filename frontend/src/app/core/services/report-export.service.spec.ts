import { ReportExportService } from './report-export.service';

describe('ReportExportService canonical work-report statuses', () => {
  function createService(): ReportExportService {
    return new ReportExportService();
  }

  it('keeps no-report export status neutral instead of pending', () => {
    const service = createService();
    const workStatusClass = (service as any).workStatusClass.bind(service);

    expect(workStatusClass('Belum Membuat Laporan Kerja')).toBe('neutral');
    expect(workStatusClass('no_report')).toBe('neutral');
    expect(workStatusClass('Menunggu validasi')).toBe('pending');
    expect(workStatusClass('Disetujui')).toBe('success');
    expect(workStatusClass('Ditolak')).toBe('danger');
  });

  it('styles a no-report cell with the neutral canonical palette', () => {
    const service = createService();
    const cell: any = { styles: {} };

    (service as any).styleWorkReportStatus(cell, 'Belum Membuat Laporan Kerja');

    expect(cell.styles.textColor).toBe('#475569');
    expect(cell.styles.fillColor).toBe('#F1F5F9');
  });
});

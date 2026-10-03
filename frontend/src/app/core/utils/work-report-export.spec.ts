import { canonicalWorkReportExportRecord } from './work-report-export';

describe('canonicalWorkReportExportRecord', () => {
  const fixtures = [
    { status_laporan: 'draft', deskripsi_kegiatan: 'Draft' },
    { status_laporan: 'submitted', deskripsi_kegiatan: 'Submitted' },
    { status_laporan: 'submitted', status_sesuai: 'Sesuai', deskripsi_kegiatan: 'Approved' },
    { status_laporan: 'submitted', status_sesuai: 'Tidak Sesuai', deskripsi_kegiatan: 'Rejected' },
    { status_laporan: 'submitted', status_sesuai: 'tidak membuat laporan kerja' },
    { report_kind: 'legacy_logbook', status_logbook: 'approved', tugas: 'Legacy' }
  ];

  it('emits canonical status fields for every workflow fixture', () => {
    const statuses = fixtures.map(row => canonicalWorkReportExportRecord(row)['status_canonical']);

    expect(statuses).toEqual(['draft', 'submitted', 'approved', 'rejected', 'no_report', 'approved']);
  });

  it('uses Judul Tugas and names raw compatibility fields explicitly', () => {
    const record = canonicalWorkReportExportRecord({
      judul: 'Judul lama',
      tugas: 'Tugas lama',
      status_laporan: 'submitted',
      status_sesuai: 'tidak membuat laporan kerja'
    }, { status_pengisian: 'Belum Membuat Laporan Kerja', status_validasi: 'Belum Membuat Laporan Kerja' });

    expect(record['judul_tugas']).toContain('Judul lama');
    expect(record['judul_tugas']).toContain('Tugas lama');
    expect(record['status']).toBe('no_report');
    expect(record['status_pengisian']).toBe('Belum Membuat Laporan Kerja');
    expect(record['status_validasi']).toBe('Belum Membuat Laporan Kerja');
    expect(record['status_laporan']).toBeUndefined();
    expect(record['status_sesuai']).toBeUndefined();
    expect(record['legacy_status_laporan']).toBe('submitted');
    expect(record['legacy_status_sesuai']).toBe('tidak membuat laporan kerja');
  });
});

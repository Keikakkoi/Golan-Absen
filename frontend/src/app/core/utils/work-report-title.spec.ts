import {
  WORK_REPORT_TITLE_TASK_SEPARATOR,
  canonicalWorkReportTitle,
  combineWorkReportTitleTask,
  canonicalWorkReportTitlePayload
} from './work-report-title';

describe('work report title adapter', () => {
  it('combines both legacy values deterministically', () => {
    expect(combineWorkReportTitleTask('Judul lama', 'Tugas lama'))
      .toBe(`Judul lama${WORK_REPORT_TITLE_TASK_SEPARATOR}Tugas lama`);
  });

  it('uses the only populated legacy value', () => {
    expect(canonicalWorkReportTitle({ judul: 'Judul saja', tugas: '' })).toBe('Judul saja');
    expect(canonicalWorkReportTitle({ judul: '', tugas: 'Tugas saja' })).toBe('Tugas saja');
  });

  it('prefers the additive canonical field and keeps payload canonical', () => {
    expect(canonicalWorkReportTitle({ judul_tugas: 'Judul Tugas baru', judul: 'Lama', tugas: 'Lama' }))
      .toBe('Judul Tugas baru');
    expect(canonicalWorkReportTitlePayload('  Judul Tugas baru  ')).toEqual({ judul_tugas: 'Judul Tugas baru' });
  });
});

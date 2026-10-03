import { of, Subject } from 'rxjs';
import { TeamReportsComponent } from './team-reports.component';

describe('TeamReportsComponent work report review', () => {
  function createComponent(response: any = { status: 'approved', status_sesuai: 'Sesuai' }) {
    const http = {
      put: jasmine.createSpy('put').and.returnValue(of(response))
    } as any;
    const auth = { getToken: () => 'token' } as any;
    const reportExport = {} as any;
    const alert = {
      confirm: jasmine.createSpy('confirm').and.resolveTo(true),
      textarea: jasmine.createSpy('textarea').and.resolveTo('Alasan penolakan test'),
      success: jasmine.createSpy('success').and.resolveTo(),
      error: jasmine.createSpy('error').and.resolveTo()
    } as any;
    const component = new TeamReportsComponent(http, auth, reportExport, alert);
    return { component, http, alert };
  }

  it('only allows actions for submitted work reports', () => {
    const { component } = createComponent();
    const base = { Employee: { User: { Role: 'MAGANG' } }, report_kind: 'work_report', status_laporan: 'submitted', status_sesuai: '', deskripsi_kegiatan: 'Isi laporan' };

    expect(component.canReview({ ...base, ID: 1 })).toBeTrue();
    expect(component.canReview({ ...base, ID: 2, status_sesuai: 'Sesuai' })).toBeFalse();
    expect(component.canReview({ ...base, ID: 3, status_sesuai: 'Tidak Sesuai' })).toBeFalse();
  });

  it('keeps no_report outside the manager review workflow', () => {
    const { component } = createComponent();
    const row = {
      ID: 9,
      Employee: { User: { Role: 'MAGANG' } },
      report_kind: 'work_report',
      status_laporan: 'submitted',
      status_sesuai: 'tidak membuat laporan kerja'
    };

    expect(component.canReview(row)).toBeFalse();
    expect(component.statusLabel(row)).toBe('Belum Membuat Laporan Kerja');
  });

  it('uses the filtered non-draft, de-duplicated dataset for exports', () => {
    const { component, http } = createComponent();
    http.get = jasmine.createSpy('get').and.returnValue(of([
      { ID: 1, status_laporan: 'draft', deskripsi_kegiatan: 'Draft' },
      { ID: 2, status_laporan: 'submitted', status_sesuai: 'tidak membuat laporan kerja' },
      { ID: 2, status_laporan: 'submitted', status_sesuai: 'tidak membuat laporan kerja' },
      { ID: 3, status_laporan: 'submitted', deskripsi_kegiatan: 'Submitted' }
    ]));

    let exported: any[] = [];
    component['loadAllFilteredReports'](rows => exported = rows);

    expect(exported.map(row => row.ID)).toEqual([2, 3]);
    expect(component.fillingStatus(exported[0])).toBe('Belum Membuat Laporan Kerja');
  });

  it('uses the approved status returned by the backend and removes actions', async () => {
    const { component, http } = createComponent({ status: 'approved', status_sesuai: 'Sesuai' });
    const row = { ID: 1, Employee: { User: { Role: 'MAGANG' } }, report_kind: 'work_report', status_laporan: 'submitted', status_sesuai: '', deskripsi_kegiatan: 'Isi laporan' };
    component.reports = [row];

    await component.reviewReport(1, 'approved');

    expect(http.put).toHaveBeenCalledTimes(1);
    expect(http.put.calls.mostRecent().args[0]).toContain('/manager/team/reports/1/review');
    expect(row.status_sesuai).toBe('Sesuai');
    expect(component.canReview(row)).toBeFalse();
  });

  it('uses the rejected status returned by the backend and removes actions', async () => {
    const { component } = createComponent({ status: 'rejected', status_sesuai: 'Tidak Sesuai' });
    const row = { ID: 2, Employee: { User: { Role: 'MAGANG' } }, report_kind: 'work_report', status_laporan: 'submitted', status_sesuai: '', deskripsi_kegiatan: 'Isi laporan' };
    component.reports = [row];

    await component.reviewReport(2, 'rejected');

    expect(row.status_sesuai).toBe('Tidak Sesuai');
    expect(component.canReview(row)).toBeFalse();
  });

  it('prevents duplicate requests while a review is in progress', async () => {
    const { component, http } = createComponent();
    const response$ = new Subject<any>();
    http.put.and.returnValue(response$.asObservable());
    const row = { ID: 3, Employee: { User: { Role: 'MAGANG' } }, report_kind: 'work_report', status_laporan: 'submitted', status_sesuai: '', deskripsi_kegiatan: 'Isi laporan' };
    component.reports = [row];

    const firstReview = component.reviewReport(3, 'approved');
    const secondReview = component.reviewReport(3, 'rejected');

    await Promise.all([firstReview, secondReview]);
    expect(http.put).toHaveBeenCalledTimes(1);
    response$.error(new Error('request failed'));
  });

  it('does not send a request when the review confirmation is cancelled', async () => {
    const { component, http, alert } = createComponent();
    alert.confirm.and.resolveTo(false);
    component.reports = [{ ID: 4, Employee: { User: { Role: 'MAGANG' } }, report_kind: 'work_report', status_laporan: 'submitted', status_sesuai: '', deskripsi_kegiatan: 'Isi laporan' }];

    await component.reviewReport(4, 'approved');

    expect(http.put).not.toHaveBeenCalled();
    expect(component.canReview(component.reports[0])).toBeTrue();
  });

  it('keeps the action visible while the confirmation is open', async () => {
    const { component, alert } = createComponent();
    let resolveConfirmation!: (confirmed: boolean) => void;
    const confirmation = new Promise<boolean>(resolve => resolveConfirmation = resolve);
    alert.confirm.and.returnValue(confirmation);
    component.reports = [{ ID: 5, Employee: { User: { Role: 'MAGANG' } }, report_kind: 'work_report', status_laporan: 'submitted', status_sesuai: '', deskripsi_kegiatan: 'Isi laporan' }];

    const review = component.reviewReport(5, 'rejected');

    expect(component.canReview(component.reports[0])).toBeTrue();
    resolveConfirmation(true);
    await review;
  });

  it('rejects an invalid date range before making a request', () => {
    const { component, http } = createComponent();
    component.start = '2026-08-31';
    component.end = '2026-08-01';

    component.applyFilters();

    expect(http.get).toBeUndefined();
    expect(component.error).toContain('Rentang tanggal tidak valid');
  });

  it('clears date and search filters when refreshed', () => {
    const { component, http } = createComponent();
    http.get = jasmine.createSpy('get').and.returnValue(of([]));
    component.start = '2026-08-01';
    component.end = '2026-08-31';
    component.search = 'Budi';

    component.refreshReports();

    expect(component.start).toBe('');
    expect(component.end).toBe('');
    expect(component.search).toBe('');
    expect(http.get).toHaveBeenCalled();
  });

  it('renders the shared Admin-style time status labels without changing their value', () => {
    const { component } = createComponent();

    expect(component.statusTimeLabel({ tugas: 'Tugas', is_late_submission: false })).toBe('Tepat waktu');
    expect(component.statusTimeLabel({ tugas: 'Tugas', is_late_submission: true })).toBe('Terlambat');
    expect(component.statusTimeLabel({ is_late_submission: false })).toBe('-');
  });
});

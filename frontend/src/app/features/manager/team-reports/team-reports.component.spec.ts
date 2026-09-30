import { of, Subject } from 'rxjs';
import { TeamReportsComponent } from './team-reports.component';

describe('TeamReportsComponent logbook review', () => {
  function createComponent(response: any = { status: 'approved', status_logbook: 'approved' }) {
    const http = {
      put: jasmine.createSpy('put').and.returnValue(of(response))
    } as any;
    const auth = { getToken: () => 'token' } as any;
    const reportExport = {} as any;
    const alert = {
      confirm: jasmine.createSpy('confirm').and.resolveTo(true),
      success: jasmine.createSpy('success').and.resolveTo(),
      error: jasmine.createSpy('error').and.resolveTo()
    } as any;
    const component = new TeamReportsComponent(http, auth, reportExport, alert);
    return { component, http, alert };
  }

  it('only allows actions for submitted logbooks', () => {
    const { component } = createComponent();

    expect(component.canReview({ ID: 1, status_logbook: 'submitted' })).toBeTrue();
    expect(component.canReview({ ID: 2, status_logbook: 'approved' })).toBeFalse();
    expect(component.canReview({ ID: 3, status_logbook: 'rejected' })).toBeFalse();
  });

  it('uses the approved status returned by the backend and removes actions', async () => {
    const { component, http } = createComponent({ status: 'approved', status_logbook: 'approved' });
    const row = { ID: 1, status_logbook: 'submitted' };
    component.reports = [row];

    await component.reviewLogbook(1, 'approved');

    expect(http.put).toHaveBeenCalledTimes(1);
    expect(row.status_logbook).toBe('approved');
    expect(component.canReview(row)).toBeFalse();
  });

  it('uses the rejected status returned by the backend and removes actions', async () => {
    const { component } = createComponent({ status: 'rejected', status_logbook: 'rejected' });
    const row = { ID: 2, status_logbook: 'submitted' };
    component.reports = [row];

    await component.reviewLogbook(2, 'rejected');

    expect(row.status_logbook).toBe('rejected');
    expect(component.canReview(row)).toBeFalse();
  });

  it('prevents duplicate requests while a review is in progress', async () => {
    const { component, http } = createComponent();
    const response$ = new Subject<any>();
    http.put.and.returnValue(response$.asObservable());
    const row = { ID: 3, status_logbook: 'submitted' };
    component.reports = [row];

    const firstReview = component.reviewLogbook(3, 'approved');
    const secondReview = component.reviewLogbook(3, 'rejected');

    await Promise.all([firstReview, secondReview]);
    expect(http.put).toHaveBeenCalledTimes(1);
    response$.error(new Error('request failed'));
  });

  it('does not send a request when the review confirmation is cancelled', async () => {
    const { component, http, alert } = createComponent();
    alert.confirm.and.resolveTo(false);
    component.reports = [{ ID: 4, status_logbook: 'submitted' }];

    await component.reviewLogbook(4, 'approved');

    expect(http.put).not.toHaveBeenCalled();
    expect(component.canReview(component.reports[0])).toBeTrue();
  });

  it('keeps the action visible while the confirmation is open', async () => {
    const { component, alert } = createComponent();
    let resolveConfirmation!: (confirmed: boolean) => void;
    const confirmation = new Promise<boolean>(resolve => resolveConfirmation = resolve);
    alert.confirm.and.returnValue(confirmation);
    component.reports = [{ ID: 5, status_logbook: 'submitted' }];

    const review = component.reviewLogbook(5, 'rejected');

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
});

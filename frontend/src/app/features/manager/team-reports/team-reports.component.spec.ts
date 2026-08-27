import { of, Subject } from 'rxjs';
import { TeamReportsComponent } from './team-reports.component';

describe('TeamReportsComponent logbook review', () => {
  function createComponent(response: any = { status: 'approved', status_logbook: 'approved' }) {
    const http = {
      put: jasmine.createSpy('put').and.returnValue(of(response))
    } as any;
    const auth = { getToken: () => 'token' } as any;
    const reportExport = {} as any;
    const component = new TeamReportsComponent(http, auth, reportExport);
    return { component, http };
  }

  it('only allows actions for submitted logbooks', () => {
    const { component } = createComponent();

    expect(component.canReview({ ID: 1, status_logbook: 'submitted' })).toBeTrue();
    expect(component.canReview({ ID: 2, status_logbook: 'approved' })).toBeFalse();
    expect(component.canReview({ ID: 3, status_logbook: 'rejected' })).toBeFalse();
  });

  it('uses the approved status returned by the backend and removes actions', () => {
    const { component, http } = createComponent({ status: 'approved', status_logbook: 'approved' });
    const row = { ID: 1, status_logbook: 'submitted' };
    component.reports = [row];

    component.reviewLogbook(1, 'approved');

    expect(http.put).toHaveBeenCalledTimes(1);
    expect(row.status_logbook).toBe('approved');
    expect(component.canReview(row)).toBeFalse();
  });

  it('uses the rejected status returned by the backend and removes actions', () => {
    const { component } = createComponent({ status: 'rejected', status_logbook: 'rejected' });
    const row = { ID: 2, status_logbook: 'submitted' };
    component.reports = [row];

    component.reviewLogbook(2, 'rejected');

    expect(row.status_logbook).toBe('rejected');
    expect(component.canReview(row)).toBeFalse();
  });

  it('prevents duplicate requests while a review is in progress', () => {
    const { component, http } = createComponent();
    const response$ = new Subject<any>();
    http.put.and.returnValue(response$.asObservable());
    const row = { ID: 3, status_logbook: 'submitted' };
    component.reports = [row];

    component.reviewLogbook(3, 'approved');
    component.reviewLogbook(3, 'rejected');

    expect(http.put).toHaveBeenCalledTimes(1);
    response$.error(new Error('request failed'));
  });
});

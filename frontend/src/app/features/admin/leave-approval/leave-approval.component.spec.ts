import { of } from 'rxjs';
import { LeaveApprovalComponent } from './leave-approval.component';

describe('LeaveApprovalComponent', () => {
  function createComponent(response: any[] = []) {
    const http = { get: jasmine.createSpy('get').and.returnValue(of(response)) } as any;
    const auth = { getToken: () => 'token' } as any;
    const alert = {} as any;
    return { component: new LeaveApprovalComponent(http, auth, alert), http };
  }

  it('shows employee and intern requests, including requests waiting for a manager', () => {
    const { component } = createComponent([
      { ID: 1, Status: 'pending_manager_approval', Employee: { User: { Role: 'Karyawan' } } },
      { ID: 2, Status: 'pending_manager_approval', Employee: { User: { Role: 'MAGANG' } } }
    ]);

    component.loadLeaveRequests();

    expect(component.leaveRequests.map(request => request.ID)).toEqual([1, 2]);
    expect(component.statusLabel(component.leaveRequests[0].Status)).toBe('Menunggu Persetujuan Manajer');
  });

  it('keeps each request only once and maps final workflow statuses', () => {
    const { component } = createComponent([
      { ID: 7, Status: 'manager_approved' },
      { ID: 7, Status: 'manager_approved' },
      { ID: 8, Status: 'hrd_approved' },
      { ID: 9, Status: 'hrd_rejected' },
      { ID: 10, Status: 'Cancelled' }
    ]);

    component.loadLeaveRequests();

    expect(component.leaveRequests.map(request => request.ID)).toEqual([7, 8, 9, 10]);
    expect(component.statusLabel('manager_approved')).toBe('Disetujui Manajer');
    expect(component.statusLabel('pending_hrd_approval')).toBe('Menunggu Persetujuan Admin');
    expect(component.statusLabel('hrd_approved')).toBe('Disetujui');
    expect(component.statusLabel('hrd_rejected')).toBe('Ditolak');
    expect(component.statusLabel('Cancelled')).toBe('Dibatalkan');
  });
});

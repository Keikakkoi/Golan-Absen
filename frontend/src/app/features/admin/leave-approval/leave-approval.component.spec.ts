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

  it('only enables admin notes while approval is pending and keeps manager notes separate', () => {
    const { component } = createComponent();
    expect(component.canAddAdminNote({ Status: 'pending_hrd_approval' })).toBeTrue();
    expect(component.canAddAdminNote({ Status: 'pending_manager_approval' })).toBeFalse();
    expect(component.canAddAdminNote({ Status: 'hrd_approved' })).toBeFalse();
    expect(component.managerNote({ ManagerNotes: 'Catatan manager', AdminNotes: 'Catatan admin' })).toBe('Catatan manager');
    expect(component.adminNote({ ManagerNotes: 'Catatan manager', AdminNotes: 'Catatan admin' })).toBe('Catatan admin');
    expect(component.adminNote({ ManagerNotes: 'Catatan manager', Catatan: 'Catatan manager' })).toBe('-');
  });

  it('sends the admin note with an approval decision', async () => {
    const http = {
      get: jasmine.createSpy('get').and.returnValue(of([])),
      put: jasmine.createSpy('put').and.returnValue(of({}))
    } as any;
    const alert = {
      confirm: jasmine.createSpy('confirm').and.resolveTo(true),
      success: jasmine.createSpy('success'),
      error: jasmine.createSpy('error')
    } as any;
    const component = new LeaveApprovalComponent(http, { getToken: () => 'token' } as any, alert);
    component.adminNotes[12] = 'Keputusan Admin';

    await component.updateStatus(12, 'Approved');

    expect(http.put).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/admin/leave/12/approve',
      jasmine.objectContaining({ status: 'Approved', catatan: 'Keputusan Admin', notes: 'Keputusan Admin' }),
      jasmine.anything()
    );
  });
});

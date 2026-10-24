import { BehaviorSubject, of } from 'rxjs';
import { PayrollComponent } from './payroll.component';

describe('PayrollComponent employee details', () => {
  let component: PayrollComponent;
  let currentUser$: BehaviorSubject<any>;
  const payroll = {
    attendanceDays: jasmine.createSpy('attendanceDays').and.returnValue(of({ total_hari_kerja: 12 })),
    list: jasmine.createSpy('list'),
  };
  let auth: any;
  const http = { get: jasmine.createSpy('get').and.returnValue(of([])) };
  const alert = {};

  beforeEach(() => {
    currentUser$ = new BehaviorSubject<any>({ name: 'Nama Lama', jabatan: 'HRD' });
    auth = { currentUser$: currentUser$.asObservable(), getToken: () => 'token' };
    payroll.list.and.returnValue(of({ data: [], total: 0, page: 1, limit: 10, total_pages: 0 }));
    component = new PayrollComponent(payroll as any, http as any, auth as any, alert as any);
    component.employees = [
      {
        employee_id: 7,
        Nama: 'Ayu',
        Role: 'MANAJER',
        Status: 'aktif',
        Employee: {
          employee_code: 'GDK-007',
          Position: { NamaJabatan: 'Manajer Operasional' },
          Division: { NamaDivisi: 'Operasional' }
        }
      },
      {
        employee_id: 8,
        Nama: 'Bima',
        Role: 'Karyawan',
        Status: 'aktif',
        Employee: {
          employee_code: 'GDK-008',
          Position: { NamaJabatan: 'Staf' }
        }
      }
    ];
    component.form = component.emptyForm();
  });

  it('maps position, role, and employee code from the selected directory object', () => {
    component.form.employee_id = 7;
    component.onEmployeeSelected(7);

    expect(component.employeeDetails).toEqual({
      position: 'Manajer Operasional',
      role: 'MANAJER',
      code: 'GDK-007'
    });
    expect(component.form.received_by_name).toBe('Ayu');
    expect(component.form.received_by_position).toBe('Manajer Operasional');
  });

  it('updates all details when the selected employee changes', () => {
    component.onEmployeeSelected(7);
    component.onEmployeeSelected(8);

    expect(component.employeeDetails).toEqual({
      position: 'Staf',
      role: 'Karyawan',
      code: 'GDK-008'
    });
  });

  it('clears stale details when the selection is empty', () => {
    component.onEmployeeSelected(7);
    component.form.employee_id = '';
    component.onEmployeeSelected('');

    expect(component.employeeDetails).toEqual({ position: '-', role: '-', code: '-' });
    expect(component.form.received_by_name).toBe('');
    expect(component.form.received_by_position).toBe('');
  });

  it('keeps payroll payload based on employee_id and excludes display details', () => {
    component.form.employee_id = 7;
    component.onEmployeeSelected(7);

    const payload = (component as any).payload();
    expect(payload.employee_id).toBe(7);
    expect(payload.position).toBeUndefined();
    expect(payload.role).toBeUndefined();
    expect(payload.employee_code).toBeUndefined();
  });

  it('synchronizes edit details after the stored employee is loaded', () => {
    const row = {
      employee_id: 8,
      periode_bulan: '2026-10-01',
      payroll_cutoff_start: '2026-10-01',
      payroll_cutoff_end: '2026-10-31',
      payment_date: '2026-10-31',
      total_hari_kerja: 5,
      items: []
    } as any;

    component.form = component.formFromPayroll(row);
    component.onEmployeeSelected(component.form.employee_id);

    expect(component.employeeDetails.code).toBe('GDK-008');
    expect(component.employeeDetails.position).toBe('Staf');
    expect(component.employeeDetails.role).toBe('Karyawan');
  });

  it('uses the selected employee snapshot in editor preview', () => {
    component.form.employee_id = 7;
    component.onEmployeeSelected(7);
    component.previewEditor();

    expect(component.selected?.employee_name_snapshot).toBe('Ayu');
    expect(component.selected?.employee_code_snapshot).toBe('GDK-007');
    expect(component.selected?.position_snapshot).toBe('Manajer Operasional');
  });

  it('loads the active page and updates rows and pagination metadata', () => {
    payroll.list.and.returnValue(of({ data: [{ ID: 11 }], total: 35, page: 2, limit: 10, per_page: 10, total_pages: 4 }));
    component.page = 2;

    component.load();

    expect(payroll.list).toHaveBeenCalledWith(jasmine.objectContaining({ page: 2, limit: 10 }));
    expect(component.rows.length).toBe(1);
    expect(component.totalRows).toBe(35);
    expect(component.totalPages).toBe(4);
    expect(component.page).toBe(2);
  });

  it('resets to page one when the page size changes', () => {
    payroll.list.and.returnValue(of({ data: [], total: 0, page: 1, limit: 25, per_page: 25, total_pages: 0 }));
    component.page = 3;
    component.isLoading = false;

    component.pageSizeChanged(25);

    expect(component.page).toBe(1);
    expect(payroll.list).toHaveBeenCalledWith(jasmine.objectContaining({ page: 1, limit: 25 }));
  });

  it('uses the refreshed current user name in payroll approver fields', () => {
    component.ngOnInit();
    expect(component.form.approved_by_name).toBe('Nama Lama');

    currentUser$.next({ name: 'Nama Terbaru', jabatan: 'HRD' });
    expect(component.form.approved_by_name).toBe('Nama Terbaru');
    component.ngOnDestroy();
  });
});

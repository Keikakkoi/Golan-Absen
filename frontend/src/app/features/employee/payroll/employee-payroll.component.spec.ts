import { of } from 'rxjs';
import { EmployeePayrollComponent } from './employee-payroll.component';

describe('EmployeePayrollComponent pagination', () => {
  let component: EmployeePayrollComponent;
  let payroll: { mine: jasmine.Spy; pdf: jasmine.Spy };
  const alert = { error: jasmine.createSpy('error') };

  beforeEach(() => {
    payroll = {
      mine: jasmine.createSpy('mine').and.returnValue(of({ data: [], total: 0, page: 1, limit: 10, per_page: 10, total_pages: 0 })),
      pdf: jasmine.createSpy('pdf')
    };
    component = new EmployeePayrollComponent(payroll as any, alert as any);
  });

  it('requests the selected page and reads the paginated envelope', () => {
    payroll.mine.and.returnValue(of({ data: [{ ID: 5 }], total: 21, page: 2, limit: 10, per_page: 10, total_pages: 3 }));
    component.loading = false;
    component.totalPages = 3;

    component.pageChanged(2);

    expect(payroll.mine).toHaveBeenCalledWith(2, 10);
    expect(component.rows.length).toBe(1);
    expect(component.total).toBe(21);
    expect(component.totalPages).toBe(3);
  });

  it('resets to page one when the page size changes', () => {
    payroll.mine.and.returnValue(of({ data: [], total: 0, page: 1, limit: 25, per_page: 25, total_pages: 0 }));
    component.page = 3;
    component.loading = false;

    component.pageSizeChanged(25);

    expect(payroll.mine).toHaveBeenCalledWith(1, 25);
    expect(component.page).toBe(1);
  });

  it('previews the selected row without reloading every payroll record', () => {
    const row = { ID: 9, items: [] } as any;

    component.preview(row);

    expect(component.selected).toBe(row);
    expect(payroll.mine).not.toHaveBeenCalled();
  });
});

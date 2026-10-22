import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { EmployeeListComponent } from './employee-list.component';
import { EMPLOYEE_CSV_HEADERS } from './employee-csv.schema';

describe('EmployeeListComponent', () => {
  let component: EmployeeListComponent;
  let fixture: ComponentFixture<EmployeeListComponent>;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmployeeListComponent);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpTesting.match(() => true).forEach(request => request.flush([]));
  });

  afterEach(() => httpTesting.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose the canonical CSV header order used by export', () => {
    expect(EMPLOYEE_CSV_HEADERS.slice(0, 6)).toEqual(['employee_code', 'nik', 'nama', 'email', 'role', 'status']);
    expect(EMPLOYEE_CSV_HEADERS).toContain('division_id');
    expect(EMPLOYEE_CSV_HEADERS).toContain('position_id');
    expect(EMPLOYEE_CSV_HEADERS.at(-1)).toBe('password');
  });

  it('should map employee access roles to readable labels and badge classes', () => {
    expect(component.getRoleLabel({ Role: 'MAGANG' })).toBe('Magang');
    expect(component.getRoleClass({ Role: 'MAGANG' })).toBe('role-magang');
    expect(component.getRoleLabel({ Role: 'Karyawan' })).toBe('Karyawan');
    expect(component.getRoleClass({ Role: 'Karyawan' })).toBe('role-karyawan');
    expect(component.getRoleLabel({ Role: 'MANAJER' })).toBe('Manajer');
    expect(component.getRoleClass({ Role: 'MANAJER' })).toBe('role-manajer');
    expect(component.getRoleLabel({ Role: 'HRD' })).toBe('Admin');
    expect(component.getRoleClass({ Role: 'HRD' })).toBe('role-admin');
  });

  it('should render the role access heading beside the full name heading', () => {
    component.filteredEmployees = [{ ID: 1, Nama: 'Karyawan', Role: 'Karyawan' }];
    component.isLoading = false;
    fixture.detectChanges();
    const headers = Array.from(fixture.nativeElement.querySelectorAll('thead th') as NodeListOf<HTMLElement>)
      .map(header => header.textContent?.trim());
    expect(headers.indexOf('ROLE AKSES')).toBe(headers.indexOf('Nama lengkap') + 1);
  });

  it('should keep CSV selection without rendering the removed import button', () => {
    expect(fixture.nativeElement.textContent).toContain('Pilih CSV');
    expect(fixture.nativeElement.textContent).not.toContain('Import CSV');
    expect(fixture.nativeElement.querySelector('.employee-import-button')).toBeNull();
  });

  it('should provide all employee sorting options with the Urutan label', () => {
    const select = fixture.nativeElement.querySelector('select[name="sort_order"]') as HTMLSelectElement;
    expect(fixture.nativeElement.textContent).toContain('Urutan');
    expect(Array.from(select.options).map(option => option.value)).toEqual([
      'name_asc', 'name_desc', 'employee_id_asc', 'employee_id_desc', 'join_date_asc', 'join_date_desc'
    ]);
  });

  it('should sort employees by numeric ID and actual join date', () => {
    component.employees = [
      { ID: 10, Nama: 'Budi', Employee: { TanggalBergabung: '2024-10-01' } },
      { ID: 2, Nama: 'Citra', Employee: { TanggalBergabung: '2025-01-15' } },
      { ID: 100, Nama: 'Andi', Employee: { TanggalBergabung: '2023-12-20' } }
    ];

    component.filters.sort_order = 'employee_id_asc';
    component.applyFilters();
    expect(component.filteredEmployees.map(employee => employee.ID)).toEqual([2, 10, 100]);

    component.filters.sort_order = 'employee_id_desc';
    component.applyFilters();
    expect(component.filteredEmployees.map(employee => employee.ID)).toEqual([100, 10, 2]);

    component.filters.sort_order = 'join_date_asc';
    component.applyFilters();
    expect(component.filteredEmployees.map(employee => employee.ID)).toEqual([100, 10, 2]);

    component.filters.sort_order = 'join_date_desc';
    component.applyFilters();
    expect(component.filteredEmployees.map(employee => employee.ID)).toEqual([2, 10, 100]);
  });

  it('should sort names in both directions', () => {
    component.employees = [
      { ID: 1, Nama: 'Citra' }, { ID: 2, Nama: 'Andi' }, { ID: 3, Nama: 'Budi' }
    ];

    component.filters.sort_order = 'name_asc';
    component.applyFilters();
    expect(component.filteredEmployees.map(employee => employee.Nama)).toEqual(['Andi', 'Budi', 'Citra']);

    component.filters.sort_order = 'name_desc';
    component.applyFilters();
    expect(component.filteredEmployees.map(employee => employee.Nama)).toEqual(['Citra', 'Budi', 'Andi']);
  });

  it('should delete by User.ID and show the backend error detail', async () => {
    const alert = (component as any).alert;
    spyOn(alert, 'confirm').and.resolveTo(true);
    spyOn(alert, 'success');
    spyOn(alert, 'error');

    const deletePromise = component.deleteEmployee(42);
    await Promise.resolve();
    const request = httpTesting.expectOne('http://localhost:8080/api/v1/admin/employees/42');
    expect(request.request.method).toBe('DELETE');
    request.flush({ error: 'Gagal memutus referensi work_reports', details: 'foreign key masih digunakan' }, { status: 500, statusText: 'Server Error' });
    await deletePromise;

    expect(alert.error).toHaveBeenCalledWith('Gagal menghapus data', 'Gagal memutus referensi work_reports\nforeign key masih digunakan');
    expect(alert.success).not.toHaveBeenCalled();
  });

  it('should load active managers from the canonical organization endpoint', () => {
    component.loadManagers();
    const request = httpTesting.expectOne('http://localhost:8080/api/v1/organization/managers');
    expect(request.request.method).toBe('GET');

    request.flush([{ ID: '7', Nama: 'Manager Aktif', Role: 'MANAJER', Status: 'aktif' }]);

    expect(component.managers).toEqual([{ ID: 7, Nama: 'Manager Aktif' }]);
    expect(component.managerLoadError).toBe('');
  });

  it('should render manager ID and name while keeping the no-manager option', () => {
    component.managers = [{ ID: 7, Nama: 'Manager Aktif' }];
    component.openAddModal();
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('select[name="manager_id"]') as HTMLSelectElement;
    expect(select.textContent).toContain('7 - Manager Aktif');
    expect(Array.from(select.options).some(option => option.textContent?.includes('Tidak ada manager'))).toBeTrue();
  });

  it('should keep the saved manager selected when editing an employee', () => {
    component.managers = [{ ID: 7, Nama: 'Manager Aktif' }];
    component.openEditModal({ ID: 12, Nama: 'Karyawan', Email: 'karyawan@example.com', Role: 'Karyawan', ManagerID: '7' });

    expect(component.formData.manager_id).toBe(7);
  });

  it('should expose a manager loading error instead of showing no managers', () => {
    component.loadManagers();
    const request = httpTesting.expectOne('http://localhost:8080/api/v1/organization/managers');
    request.flush({ error: 'Access denied' }, { status: 403, statusText: 'Forbidden' });

    expect(component.managers).toEqual([]);
    expect(component.managerLoadError).toContain('Gagal memuat daftar manajer');
    expect(component.managerLoadError).toContain('Access denied');
  });

  it('should not call DELETE when confirmation is cancelled', async () => {
    const alert = (component as any).alert;
    spyOn(alert, 'confirm').and.resolveTo(false);

    await component.deleteEmployee(99);

    httpTesting.expectNone(req => req.method === 'DELETE');
    expect(alert.confirm).toHaveBeenCalled();
  });

  it('should show an alert and stop saving a MAGANG employee with an incomplete period', async () => {
    const alert = (component as any).alert;
    spyOn(alert, 'error').and.resolveTo();
    component.formData = { ...component.formData, role: 'MAGANG', internship_start_date: '', internship_end_date: '2027-02-15' };

    await component.saveEmployee();

    expect(alert.error).toHaveBeenCalledWith(
      'Periode magang wajib diisi',
      'Silakan lengkapi tanggal mulai dan tanggal selesai magang.'
    );
    httpTesting.expectNone(req => req.method === 'POST' || req.method === 'PUT');
  });

  it('should reject an internship period whose end date is earlier than its start date', async () => {
    const alert = (component as any).alert;
    spyOn(alert, 'error').and.resolveTo();
    component.formData = { ...component.formData, role: 'MAGANG', internship_start_date: '2027-02-15', internship_end_date: '2027-01-15' };

    await component.saveEmployee();

    expect(alert.error).toHaveBeenCalledWith(
      'Tanggal periode magang tidak valid',
      'Tanggal selesai magang tidak boleh lebih awal dari tanggal mulai magang.'
    );
    httpTesting.expectNone(req => req.method === 'POST' || req.method === 'PUT');
  });

  it('should leave the internship period optional for non-MAGANG roles', () => {
    component.formData = { ...component.formData, role: 'Karyawan', internship_start_date: '', internship_end_date: '' };

    expect((component as any).getInternshipPeriodValidationError()).toBeNull();
  });

  it('should preserve the saved internship period when opening the edit form', () => {
    component.openEditModal({
      ID: 12,
      Nama: 'Peserta Magang',
      Email: 'magang@example.com',
      Role: 'MAGANG',
      Status: 'aktif',
      InternshipStartDate: '2027-01-15T00:00:00Z',
      InternshipEndDate: '2027-02-15T00:00:00Z'
    });

    expect(component.formData.internship_start_date).toBe('2027-01-15');
    expect(component.formData.internship_end_date).toBe('2027-02-15');
  });
});

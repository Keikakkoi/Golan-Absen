import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { EmployeeListComponent } from './employee-list.component';

describe('EmployeeListComponent', () => {
  let component: EmployeeListComponent;
  let fixture: ComponentFixture<EmployeeListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmployeeListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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
});

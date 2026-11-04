import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { WorktypeListComponent } from './worktype-list.component';

describe('WorktypeListComponent', () => {
  let component: WorktypeListComponent;
  let fixture: ComponentFixture<WorktypeListComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorktypeListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorktypeListComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne('http://localhost:8080/api/v1/admin/worktypes').flush([]);
    httpMock.expectOne('http://localhost:8080/api/v1/admin/locations/field?status=active&limit=100&sort=name&order=asc').flush({ data: [] });
  });

  afterEach(() => httpMock.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('normalizes legacy and canonical location modes for the table and edit form', () => {
    expect(component.validationLabel({ Nama: 'WFO', IsHomeBase: false, RadiusYangBerlaku: 'kantor' })).toBe('Kantor');
    expect(component.validationLabel({ Nama: 'WFH', IsHomeBase: true, RadiusYangBerlaku: 'kantor' })).toBe('Rumah');
    expect(component.validationLabel({ Nama: 'Dinas Luar', RadiusYangBerlaku: 'tanpa_validasi' })).toBe('Tidak ada');
    expect(component.validationLabel({ canonical_type: 'alternative_location' })).toBe('Lokasi Alternatif');
    expect(component.validationLabel({ canonical_type: 'field_location' })).toBe('Lokasi Lapangan');
  });

  it('prepares canonical field-location payloads without accepting free-form location data', () => {
    component.openAddModal();
    component.formData.CanonicalType = 'field_location';
    component.formData.FieldLocationID = 12;
    expect(component.radiusModeForCanonical(component.formData.CanonicalType)).toBe('lapangan');
    expect(component.selectableFieldLocations()[0].archived).toBeTrue();
  });

  it('filters canonical sources and loads detail through the admin endpoint', () => {
    component.workTypes = [
      { ID: 1, Nama: 'WFO', canonical_type: 'wfo' },
      { ID: 2, Nama: 'Lokasi Lapangan', canonical_type: 'field_location', field_location_id: 9 }
    ];
    component.modeFilter = 'field_location';
    expect(component.filteredWorkTypes().map(item => item.ID)).toEqual([2]);

    component.openDetailModal(component.workTypes[1]);
    httpMock.expectOne('http://localhost:8080/api/v1/admin/worktypes/2').flush(component.workTypes[1]);
    expect(component.selectedWorkType.ID).toBe(2);
    expect(component.isDetailOpen).toBeTrue();
  });

  it('orders the table by canonical work type instead of database ID', () => {
    component.workTypes = [
      { ID: 7, Nama: 'Lokasi Alternatif', canonical_type: 'alternative_location' },
      { ID: 6, Nama: 'Dinas Luar', RadiusYangBerlaku: 'tanpa_validasi' },
      { ID: 2, Nama: 'WFH', canonical_type: 'wfh' },
      { ID: 1, Nama: 'WFO', canonical_type: 'wfo' }
    ];

    expect(component.filteredWorkTypes().map(item => item.Nama)).toEqual([
      'WFO', 'WFH', 'Dinas Luar', 'Lokasi Alternatif'
    ]);
    expect(component.workTypeSortRank({ ID: 7, Nama: 'Lokasi Alternatif', canonical_type: 'alternative_location' })).toBe(3);
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LocationManagementComponent } from './location-management.component';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';

describe('LocationManagementComponent', () => {
  let component: LocationManagementComponent;
  let fixture: ComponentFixture<LocationManagementComponent>;
  let http: HttpTestingController;
  let alert: jasmine.SpyObj<AlertService>;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    alert = jasmine.createSpyObj('AlertService', ['confirm', 'textarea', 'success', 'error']);
    alert.confirm.and.returnValue(Promise.resolve(true));
    alert.textarea.and.returnValue(Promise.resolve('Koordinat tidak sesuai area kerja'));
    alert.success.and.returnValue(Promise.resolve(undefined));
    alert.error.and.returnValue(Promise.resolve(undefined));
    auth = jasmine.createSpyObj('AuthService', ['getToken', 'getRole']);
    auth.getToken.and.returnValue('admin-token');
    auth.getRole.and.returnValue('HRD');
    (auth as any).currentUser$ = of(null);

    await TestBed.configureTestingModule({
      imports: [LocationManagementComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), { provide: AlertService, useValue: alert }, { provide: AuthService, useValue: auth }]
    }).compileComponents();

    fixture = TestBed.createComponent(LocationManagementComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    expectRequest('/alternative-requests').flush({ data: [], total: 0, page: 1, limit: 20, total_pages: 0 });
    expectRequest('/field').flush({ data: [], total: 0, page: 1, limit: 20, total_pages: 0 });
  });

  afterEach(() => http.verify());

  function expectRequest(path: string) {
    return http.expectOne(request => request.url.includes(path));
  }

  it('creates the admin page with both resources loaded', () => {
    expect(component).toBeTruthy();
    expect(component.alternativeLoading).toBeFalse();
    expect(component.fieldLoading).toBeFalse();
  });

  it('applies alternative filters immediately with pagination metadata', () => {
    component.alternativePage = 3;
    component.alternativeSearch = 'Sari';
    component.alternativeStatusFilter = 'pending';
    component.alternativeFiltersChanged();
    const request = expectRequest('/alternative-requests');
    expect(request.request.params.get('search')).toBe('Sari');
    expect(request.request.params.get('status')).toBe('pending');
    expect(request.request.params.get('page')).toBe('1');
    request.flush({ data: [{ id: 4, status: 'pending' }], total: 1, page: 1, limit: 20, total_pages: 1 });
    expect(component.alternativeTotal).toBe(1);
    expect(component.isPending(component.alternativeRequests[0])).toBeTrue();
  });

  it('applies field filters immediately and resets the page', () => {
    component.fieldPage = 2;
    component.fieldSearch = 'kantor';
    component.fieldStatus = 'active';
    component.fieldFiltersChanged();
    const request = expectRequest('/field');
    expect(request.request.params.get('search')).toBe('kantor');
    expect(request.request.params.get('status')).toBe('active');
    expect(request.request.params.get('page')).toBe('1');
    request.flush({ data: [], total: 0, page: 1, limit: 20, total_pages: 0 });
  });

  it('approves a pending request and reloads the list', async () => {
    const row = { id: 7, status: 'pending' };
    component.approveAlternative(row);
    await Promise.resolve();
    const request = expectRequest('/alternative-requests/7/approve');
    expect(request.request.method).toBe('POST');
    request.flush({ id: 7, status: 'approved' });
    await Promise.resolve();
    expectRequest('/alternative-requests').flush({ data: [], total: 0, page: 1, limit: 20, total_pages: 0 });
    expect(alert.success).toHaveBeenCalledWith('Pengajuan disetujui');
  });

  it('rejects a pending request with a reason and reloads the list', async () => {
    component.rejectAlternative({ id: 8, status: 'pending' });
    await Promise.resolve();
    await Promise.resolve();
    const request = expectRequest('/alternative-requests/8/reject');
    expect(request.request.body).toEqual({ rejection_reason: 'Koordinat tidak sesuai area kerja' });
    request.flush({ id: 8, status: 'rejected', rejection_reason: 'Koordinat tidak sesuai area kerja' });
    await Promise.resolve();
    expectRequest('/alternative-requests').flush({ data: [], total: 0, page: 1, limit: 20, total_pages: 0 });
  });

  it('only displays a rejection reason for rejected requests', () => {
    expect(component.rejectionReason({ status: 'rejected', rejection_reason: 'Koordinat tidak sesuai' })).toBe('Koordinat tidak sesuai');
    expect(component.rejectionReason({ status: 'approved', rejection_reason: 'stale' })).toBe('');
    expect(component.rejectionReason({ status: 'pending' })).toBe('');
  });

  it('creates a field location with numeric coordinates and refreshes the list', async () => {
    component.openFieldModal();
    component.fieldForm = { nama_lokasi: 'Lokasi Klien', deskripsi: 'Alamat klien', latitude: -6.2, longitude: 106.8, radius_meter: 200, metode_validasi: 'radius', status_aktif: 'active' };
    component.saveFieldLocation();
    await Promise.resolve();
    const request = expectRequest('/field');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(jasmine.objectContaining({ nama_lokasi: 'Lokasi Klien', latitude: -6.2, longitude: 106.8, radius_meter: 200, status_aktif: 'active' }));
    request.flush({ id: 9, nama_lokasi: 'Lokasi Klien', status_aktif: 'active' });
    await Promise.resolve();
    expectRequest('/field').flush({ data: [], total: 0, page: 1, limit: 20, total_pages: 0 });
  });

  it('surfaces forbidden responses instead of trusting hidden admin actions', () => {
    component.loadFieldLocations();
    expectRequest('/field').flush({ error: 'forbidden' }, { status: 403, statusText: 'Forbidden' });
    expect(component.fieldError).toBe('forbidden');
  });
});

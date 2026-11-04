import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AttendanceService } from './attendance.service';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AttendanceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('sends optional date range parameters for personal history', () => {
    service.getHistory('2026-10-01', '2026-10-19').subscribe();

    const request = httpMock.expectOne(req => req.url.endsWith('/attendance/history'));
    expect(request.request.params.get('start_date')).toBe('2026-10-01');
    expect(request.request.params.get('end_date')).toBe('2026-10-19');
    request.flush([]);
  });

  it('does not add date parameters when no filter is selected', () => {
    service.getHistory().subscribe();

    const request = httpMock.expectOne(req => req.url.endsWith('/attendance/history'));
    expect(request.request.params.keys()).toEqual([]);
    request.flush([]);
  });

  it('sends canonical alternative-location selection metadata with check-in', () => {
    service.checkIn(-6.2, 106.8, 12, null, 'Lokasi Alternatif', {
      canonicalType: 'alternative_location',
      alternativeLocationId: 22
    }).subscribe();

    const request = httpMock.expectOne(req => req.url.endsWith('/attendance/checkin'));
    const body = request.request.body as FormData;
    expect(body.get('tipe_kerja')).toBe('Lokasi Alternatif');
    expect(body.get('tipe_kerja_canonical')).toBe('alternative_location');
    expect(body.get('alternative_location_id')).toBe('22');
    expect(body.get('field_location_id')).toBeNull();
    request.flush({ message: 'ok', status: 'success', time: '2026-11-03T08:00:00Z' });
  });

  it('sends canonical field-location selection metadata with check-out', () => {
    service.checkOut(-6.2, 106.8, 8, null, 'Lokasi Lapangan', {
      canonicalType: 'field_location',
      fieldLocationId: 33
    }).subscribe();

    const request = httpMock.expectOne(req => req.url.endsWith('/attendance/checkout'));
    const body = request.request.body as FormData;
    expect(body.get('tipe_kerja_canonical')).toBe('field_location');
    expect(body.get('field_location_id')).toBe('33');
    expect(body.get('alternative_location_id')).toBeNull();
    request.flush({ message: 'ok' });
  });
});

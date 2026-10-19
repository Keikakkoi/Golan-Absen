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
});

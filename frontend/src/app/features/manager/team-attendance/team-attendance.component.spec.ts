import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TeamAttendanceComponent } from './team-attendance.component';

describe('TeamAttendanceComponent pagination', () => {
  let httpMock: HttpTestingController;
  let component: TeamAttendanceComponent;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: Router, useValue: router },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    component = new TeamAttendanceComponent(
      TestBed.inject(HttpClient),
      { getToken: () => 'token' } as never,
      {} as never,
      TestBed.inject(ActivatedRoute),
      router,
    );
  });

  afterEach(() => httpMock.verify());

  it('keeps pagination on the attendance endpoint and preserves active filters', () => {
    component.search = 'Rina';
    component.status = 'Hadir';
    component.pageChanged(2);

    const request = httpMock.expectOne(req => req.url.endsWith('/manager/team/attendance'));
    expect(request.request.url).not.toContain('/manager/team/reports');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('search')).toBe('Rina');
    expect(request.request.params.get('status')).toBe('Hadir');
    request.flush({ data: [{ nama: 'Rina', tanggal: '2026-09-18' }], total: 26, page: 2, limit: 25, total_pages: 2 });

    expect(component.page).toBe(2);
    expect(component.displayedRows[0].nama).toBe('Rina');
    expect(router.navigate).toHaveBeenCalled();
  });

  it('resets only the attendance page when page size changes', () => {
    component.page = 3;
    component.pageSizeChanged(50);

    const request = httpMock.expectOne(req => req.url.endsWith('/manager/team/attendance'));
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('limit')).toBe('50');
    request.flush({ data: [], total: 0, page: 1, limit: 50, total_pages: 0 });
    expect(component.page).toBe(1);
  });
});

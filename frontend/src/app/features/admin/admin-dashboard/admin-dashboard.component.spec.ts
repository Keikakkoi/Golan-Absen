import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { AdminDashboardComponent } from './admin-dashboard.component';

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [provideHttpClient(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('updates the dashboard greeting when the authenticated profile is refreshed', () => {
    const user$ = new BehaviorSubject<any>({ role: 'HRD', name: 'Nama Lama' });
    const auth = {
      currentUser$: user$.asObservable(),
      getRole: () => 'HRD',
      getToken: () => 'token'
    };
    const http = { get: jasmine.createSpy('get').and.returnValue(of({})) };
    const notifications = {
      notifications$: of([]),
      getAll: jasmine.createSpy('getAll').and.returnValue(of([])),
      connectRealtime: jasmine.createSpy('connectRealtime').and.returnValue(() => undefined),
      enablePush: jasmine.createSpy('enablePush').and.returnValue(Promise.resolve())
    };
    const dashboard = new AdminDashboardComponent(http as any, auth as any, notifications as any, { navigate: () => undefined } as any);

    dashboard.ngOnInit();
    expect(dashboard.adminName).toBe('Nama Lama');

    user$.next({ role: 'HRD', name: 'Nama Terbaru' });
    expect(dashboard.adminName).toBe('Nama Terbaru');
    dashboard.ngOnDestroy();
  });
});

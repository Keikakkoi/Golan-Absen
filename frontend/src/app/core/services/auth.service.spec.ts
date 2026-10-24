import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('refreshes the stored and reactive user name from the profile endpoint', () => {
    localStorage.setItem('token', 'valid-token');
    localStorage.setItem('user_id', '7');
    localStorage.setItem('role', 'HRD');
    localStorage.setItem('name', 'Nama Lama');
    const users: any[] = [];
    service.currentUser$.subscribe(user => { if (user) users.push(user); });

    service.refreshProfile().subscribe();
    const request = http.expectOne(request => request.url.endsWith('/api/v1/employee/profile'));
    expect(request.request.headers.get('Authorization')).toBe('Bearer valid-token');
    request.flush({
      ID: 7,
      Nama: 'Nama Terbaru',
      Email: 'admin@example.com',
      Role: 'HRD',
      Employee: {
        Division: { NamaDivisi: 'Operasional' },
        Position: { NamaJabatan: 'HRD' }
      }
    });

    expect(localStorage.getItem('name')).toBe('Nama Terbaru');
    expect(users.at(-1)).toEqual(jasmine.objectContaining({ user_id: 7, name: 'Nama Terbaru' }));
  });

  it('synchronizes an edited employee only when it is the logged-in user', () => {
    localStorage.setItem('token', 'valid-token');
    localStorage.setItem('user_id', '7');
    localStorage.setItem('name', 'Nama Lama');
    const users: any[] = [];
    service.currentUser$.subscribe(user => { if (user) users.push(user); });

    service.syncCurrentUser({ ID: 8, Nama: 'User Lain' });
    expect(localStorage.getItem('name')).toBe('Nama Lama');

    service.syncCurrentUser({ ID: 7, Nama: 'Nama Edit' });
    expect(localStorage.getItem('name')).toBe('Nama Edit');
    expect(users.at(-1)?.name).toBe('Nama Edit');
  });
});

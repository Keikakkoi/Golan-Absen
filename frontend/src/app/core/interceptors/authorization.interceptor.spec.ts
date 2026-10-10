import { HttpClient, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { authorizationInterceptor } from './authorization.interceptor';

describe('authorizationInterceptor', () => {
  let http: HttpClient;
  let testingController: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authorizationInterceptor])),
        provideHttpClientTesting()
      ]
    });
    http = TestBed.inject(HttpClient);
    testingController = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => testingController.verify());

  it('does not redirect when the API reports an invalid current password', () => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    http.get('/api/v1/employee/email', { headers: new HttpHeaders({ Authorization: 'Bearer token' }) }).subscribe({ error: () => undefined });
    testingController.expectOne('/api/v1/employee/email').flush(
      { code: 'invalid_current_password', error: 'Password lama tidak sesuai' },
      { status: 422, statusText: 'Unprocessable Entity' }
    );

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('redirects only when an authenticated API request returns an auth 401', () => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    http.get('/api/v1/employee/profile', { headers: new HttpHeaders({ Authorization: 'Bearer token' }) }).subscribe({ error: () => undefined });
    testingController.expectOne('/api/v1/employee/profile').flush(
      { error: 'Invalid token' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(navigateSpy).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: router.url } });
  });
});

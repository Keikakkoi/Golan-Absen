import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { authGuard, roleGuard } from './auth.guard';

describe('roleGuard', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  function check(role: string, allowedRoles: string[]): boolean | UrlTree {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('role', role);
    return TestBed.runInInjectionContext(() => roleGuard(
      { data: { roles: allowedRoles } } as unknown as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot
    )) as boolean | UrlTree;
  }

  it('redirects every cross-role page attempt to /403', () => {
    const cases = [
      ['MAGANG', ['Karyawan']],
      ['MAGANG', ['MANAJER']],
      ['Karyawan', ['MAGANG']],
      ['Karyawan', ['MANAJER']],
      ['MANAJER', ['MAGANG']],
      ['MANAJER', ['Karyawan']],
      ['HRD', ['MAGANG']],
    ] as const;
    const router = TestBed.inject(Router);

    for (const [role, allowedRoles] of cases) {
      const result = check(role, [...allowedRoles]);
      expect(result).not.toBeTrue();
      expect(router.serializeUrl(result as UrlTree)).toBe('/403');
    }
  });

  it('allows the page owned by each role and preserves the HRD admin role', () => {
    expect(check('MAGANG', ['MAGANG'])).toBeTrue();
    expect(check('Karyawan', ['Karyawan'])).toBeTrue();
    expect(check('MANAJER', ['MANAJER'])).toBeTrue();
    expect(check('admin', ['HRD'])).toBeTrue();
  });

  it('redirects a missing role to /403 even when a token exists', () => {
    localStorage.setItem('token', 'test-token');
    const result = TestBed.runInInjectionContext(() => roleGuard(
      { data: { roles: ['MAGANG'] } } as unknown as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot
    )) as boolean | UrlTree;

    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/403');
  });

  it('redirects an unauthenticated page request to /login', () => {
    const result = TestBed.runInInjectionContext(() => authGuard(
      {} as ActivatedRouteSnapshot,
      { url: '/admin/dashboard' } as RouterStateSnapshot
    ));

    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fadmin%2Fdashboard');
  });
});

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';

/**
 * Route guards cover browser navigation. This interceptor covers direct API
 * calls made by a page, so a backend role denial cannot remain as a silent
 * component error or be mistaken for an empty data set.
 */
export const authorizationInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && req.url.includes('/api/')) {
        const roleDenied = error.error?.code === 'forbidden_role' || error.headers.get('X-Authorization-Error') === 'role';
        const credentialValidationFailed = error.error?.code === 'invalid_current_password';
        if (error.status === 403 && roleDenied) {
          void router.navigateByUrl('/403');
        } else if (error.status === 401 && !credentialValidationFailed && req.headers.has('Authorization') && !req.url.includes('/auth/')) {
          void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
        }
      }
      return throwError(() => error);
    })
  );
};

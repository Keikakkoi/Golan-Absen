import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { isProtectedRoute } from '../auth/route-access';
import { PROFILE_VALIDATION } from './authorization-context';

let authRedirectInProgress = false;

/**
 * Route guards cover browser navigation. This interceptor covers direct API
 * calls made by a page, so a backend role denial cannot remain as a silent
 * component error or be mistaken for an empty data set.
 */
export const authorizationInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const document = inject(DOCUMENT);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && req.url.includes('/api/')) {
        const roleDenied = error.error?.code === 'forbidden_role' || error.headers.get('X-Authorization-Error') === 'role';
        const credentialValidationFailed = error.error?.code === 'invalid_current_password';
        if (error.status === 403 && roleDenied) {
          void router.navigateByUrl('/403');
        } else if (error.status === 401 && !credentialValidationFailed && req.headers.has('Authorization') && !req.url.includes('/auth/')) {
          const isProfileValidation = req.context.get(PROFILE_VALIDATION);
          const browserUrl = `${document.location.pathname}${document.location.search}${document.location.hash}`;
          const currentRoute = router.url === '/' && browserUrl !== '/'
            ? browserUrl
            : router.url;
          // A stale token found during the bootstrap profile check is harmless
          // on a public page. All other authenticated API failures remain
          // protected, including while Router is still completing a deep link.
          const canRedirect = !isProfileValidation || isProtectedRoute(currentRoute);
          if (canRedirect && !authRedirectInProgress) {
            authRedirectInProgress = true;
            const returnUrl = isProtectedRoute(currentRoute) ? currentRoute : router.url;
            void router.navigate(['/login'], { queryParams: { returnUrl } })
              .finally(() => { authRedirectInProgress = false; });
          }
        }
      }
      return throwError(() => error);
    })
  );
};

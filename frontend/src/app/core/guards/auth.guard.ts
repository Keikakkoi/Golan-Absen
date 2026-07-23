import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/** Keeps authenticated application pages out of the public auth flow. */
export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  if (localStorage.getItem('token')) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};

/** Sends authenticated users to the dedicated 403 page when their role is not allowed. */
export const roleGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const allowedRoles = route.data?.['roles'] as string[] | undefined;
  const currentRole = localStorage.getItem('role');

  if (!allowedRoles || (currentRole && allowedRoles.includes(currentRole))) {
    return true;
  }

  return router.createUrlTree(['/403']);
};

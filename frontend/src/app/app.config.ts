import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { pageLoadingInterceptor } from './core/interceptors/page-loading.interceptor';
import { authorizationInterceptor } from './core/interceptors/authorization.interceptor';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { SeoService } from './core/services/seo.service';
import { AuthService } from './core/services/auth.service';
import { catchError, firstValueFrom, of } from 'rxjs';

export function initializeAuthenticatedUser(authService: AuthService): () => Promise<unknown> {
  return () => authService.isAuthenticated()
    ? firstValueFrom(authService.refreshProfile().pipe(catchError(() => of(null))))
    : Promise.resolve(null);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes), 
    provideHttpClient(withInterceptors([pageLoadingInterceptor, authorizationInterceptor])),
    provideAnimationsAsync(),
    SeoService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuthenticatedUser,
      deps: [AuthService],
      multi: true
    }
  ]
};

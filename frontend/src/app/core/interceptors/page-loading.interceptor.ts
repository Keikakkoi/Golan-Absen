import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { inject } from '@angular/core';
import { PageLoadingService } from '../services/page-loading.service';

/** Tracks server reads globally, including pages introduced after this audit. */
export const pageLoadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET' || !/\/api\//.test(req.url)) return next(req);
  const loading = inject(PageLoadingService);
  loading.begin();
  return next(req).pipe(finalize(() => loading.end()));
};

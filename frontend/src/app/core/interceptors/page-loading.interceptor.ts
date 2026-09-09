import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { inject } from '@angular/core';
import { PageLoadingService } from '../services/page-loading.service';
import { SKIP_PAGE_LOADING } from './page-loading-context';

/** Tracks server reads globally, including pages introduced after this audit. */
export const pageLoadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET' || !/\/api\//.test(req.url) || req.context.get(SKIP_PAGE_LOADING)) return next(req);
  const loading = inject(PageLoadingService);
  loading.begin();
  return next(req).pipe(finalize(() => loading.end()));
};

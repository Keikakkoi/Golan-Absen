import { HttpContextToken } from '@angular/common/http';

/** Marks polling/realtime reads that must not cover the current page. */
export const SKIP_PAGE_LOADING = new HttpContextToken<boolean>(() => false);

import { HttpContextToken } from '@angular/common/http';

/** Marks the bootstrap profile check, which is allowed on public pages. */
export const PROFILE_VALIDATION = new HttpContextToken<boolean>(() => false);

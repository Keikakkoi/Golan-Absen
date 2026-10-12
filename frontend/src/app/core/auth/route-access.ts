const protectedRouteRoots = new Set(['employee', 'intern', 'manager', 'admin', 'help', 'about']);

/** Returns the path without query parameters, fragments, or leading slashes. */
export function routePath(url: string): string {
  return url.split(/[?#]/, 1)[0].replace(/^\/+/, '').replace(/\/+$/, '');
}

/** Identifies routes whose pages and API calls require an authenticated user. */
export function isProtectedRoute(url: string): boolean {
  const path = routePath(url);
  return protectedRouteRoots.has(path.split('/')[0] || '');
}

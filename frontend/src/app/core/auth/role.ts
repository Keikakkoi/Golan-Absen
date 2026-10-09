export type AppRole = 'Karyawan' | 'MAGANG' | 'MANAJER' | 'HRD';

/**
 * The database stores the legacy role values above. Accept the lowercase
 * business names as input too, but always return one canonical value so route
 * guards and UI visibility cannot disagree about the current role.
 */
export function normalizeRole(value: string | null | undefined): AppRole | null {
  const role = String(value || '').trim().toUpperCase();
  switch (role) {
    case 'KARYAWAN':
      return 'Karyawan';
    case 'MAGANG':
      return 'MAGANG';
    case 'MANAJER':
    case 'MANAGER':
      return 'MANAJER';
    case 'ADMIN':
    case 'HRD':
      return 'HRD';
    default:
      return null;
  }
}

export function roleHome(role: string | null | undefined): string {
  switch (normalizeRole(role)) {
    case 'HRD':
      return '/admin/dashboard';
    case 'MAGANG':
      return '/intern/dashboard';
    case 'MANAJER':
      return '/manager/dashboard';
    case 'Karyawan':
      return '/employee/dashboard';
    default:
      return '/login';
  }
}

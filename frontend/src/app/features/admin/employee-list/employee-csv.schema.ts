/** Canonical employee CSV contract. Keep this ordered list in sync with the API importer. */
export const EMPLOYEE_CSV_HEADERS = [
  'employee_code', 'nik', 'nama', 'email', 'role', 'status', 'jenis_kelamin',
  'tempat_lahir', 'tanggal_lahir', 'nomor_telepon', 'alamat', 'shift_kerja',
  'division_id', 'position_id', 'tanggal_bergabung', 'home_latitude',
  'home_longitude', 'home_google_maps_url', 'manager_id', 'project_id', 'team_id',
  'internship_start_date', 'internship_end_date', 'mentor_name', 'institution_name',
  'password'
] as const;

export type EmployeeCsvHeader = typeof EMPLOYEE_CSV_HEADERS[number];

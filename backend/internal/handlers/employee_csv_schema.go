package handlers

// EmployeeCSVHeaders is the canonical ordered data contract used by the
// employee directory export and import. The frontend mirrors this list so a
// downloaded file can be uploaded without manual column changes.
var EmployeeCSVHeaders = []string{
	"employee_code", "nik", "nama", "email", "role", "status", "jenis_kelamin",
	"tempat_lahir", "tanggal_lahir", "nomor_telepon", "alamat", "shift_kerja",
	"division_id", "position_id", "tanggal_bergabung", "home_latitude",
	"home_longitude", "home_google_maps_url", "manager_id", "project_id", "team_id",
	"internship_start_date", "internship_end_date", "mentor_name", "institution_name",
	"password",
}

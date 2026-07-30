package models

import (
	"time"

	"gorm.io/gorm"
)

type Role string

const (
	RoleKaryawan Role = "Karyawan"
	RoleHRD      Role = "HRD"
	RolePimpinan Role = "Pimpinan"
	RoleMagang   Role = "MAGANG"
	RoleManajer  Role = "MANAJER"
)

func IsValidRole(role Role) bool {
	return role == RoleKaryawan || role == RoleHRD || role == RolePimpinan || role == RoleMagang || role == RoleManajer
}

// Permission stores a capability that can be assigned to one or more roles.
// Keeping permissions as data makes the HRD permission screen extensible
// without requiring a new database column for every capability.
type Permission struct {
	gorm.Model
	Kode      string `gorm:"size:80;uniqueIndex;not null"`
	Nama      string `gorm:"size:120;not null"`
	Deskripsi string `gorm:"type:text"`
}

type RolePermission struct {
	gorm.Model
	Role         Role `gorm:"type:varchar(20);uniqueIndex:idx_role_permission;not null"`
	PermissionID uint `gorm:"uniqueIndex:idx_role_permission;not null"`
	Permission   Permission
	Diizinkan    bool `gorm:"default:true"`
}

type User struct {
	gorm.Model
	Nama                string     `gorm:"size:100;not null"`
	Email               string     `gorm:"size:100;uniqueIndex;not null"`
	PasswordHash        string     `gorm:"not null"`
	ResetPasswordToken  string     `gorm:"size:100;index"`
	ResetPasswordExpiry time.Time  `gorm:"type:timestamp"`
	Role                Role       `gorm:"type:varchar(20);not null"`
	Status              string     `gorm:"size:20;default:'aktif'"`
	ManagerID           *uint      `gorm:"index"`
	Manager             *User      `gorm:"foreignKey:ManagerID"`
	TeamID              string     `gorm:"size:80;index"`
	InternshipStartDate *time.Time `gorm:"type:date"`
	InternshipEndDate   *time.Time `gorm:"type:date"`
	MentorName          string     `gorm:"size:100"`
	MentorContact       string     `gorm:"size:100"`
	InstitutionName     string     `gorm:"size:150"`
	Employee            Employee
}

// InternshipCertificate records generated or manually uploaded certificate metadata.
type InternshipCertificate struct {
	gorm.Model
	UserID        uint `gorm:"uniqueIndex;not null"`
	User          User
	IssuedAt      time.Time  `gorm:"type:date;not null"`
	CertificateNo string     `gorm:"size:80;uniqueIndex;not null"`
	FileURL       string     `gorm:"type:text"`
	StorageKey    string     `gorm:"type:text"`
	FileName      string     `gorm:"size:255"`
	MimeType      string     `gorm:"size:80"`
	FileSize      int64      `gorm:"default:0"`
	UploadedBy    *uint      `gorm:"index"`
	UploadedAt    *time.Time `gorm:"type:timestamp"`
}

type Division struct {
	gorm.Model
	NamaDivisi string `gorm:"size:100;not null"`
	Deskripsi  string `gorm:"type:text"`
	Employees  []Employee
}

type Position struct {
	gorm.Model
	NamaJabatan string `gorm:"size:100;not null"`
	Deskripsi   string `gorm:"type:text"`
	Employees   []Employee
}

type Employee struct {
	gorm.Model
	UserID           uint                  `gorm:"uniqueIndex;not null"`
	User             *User                 `gorm:"foreignKey:UserID"`
	NIK              string                `gorm:"size:50;uniqueIndex;not null"`
	DivisionID       uint                  `gorm:"not null"`
	Division         Division              `gorm:"foreignKey:DivisionID"`
	PositionID       uint                  `gorm:"not null"`
	Position         Position              `gorm:"foreignKey:PositionID"`
	TanggalBergabung time.Time             `gorm:"type:date"`
	FotoProfilURL    string                `gorm:"type:text"`
	HomeLatitude     float64               `gorm:"default:0"`
	HomeLongitude    float64               `gorm:"default:0"`
	HomeLocation     *EmployeeHomeLocation `gorm:"foreignKey:EmployeeID"`
}

type AttendanceStatus string

const (
	StatusHadir     AttendanceStatus = "Hadir"
	StatusTerlambat AttendanceStatus = "Terlambat"
	StatusAlpha     AttendanceStatus = "Alpha"
	StatusIzin      AttendanceStatus = "Izin"
	StatusCuti      AttendanceStatus = "Cuti"
)

type AttendanceRecord struct {
	gorm.Model
	EmployeeID          uint `gorm:"not null;index"`
	Employee            Employee
	Tanggal             time.Time        `gorm:"type:date;not null"`
	TipeKerjaID         *uint            `gorm:"index"`
	TipeKerja           string           `gorm:"size:20;default:'WFO'"`
	JamMasuk            *time.Time       `gorm:"type:time"`
	JamPulang           *time.Time       `gorm:"type:time"`
	CheckOutOtomatis    bool             `gorm:"default:false"`
	IsLate              bool             `gorm:"default:false;index"`
	LateDurationMinutes int              `gorm:"default:0"`
	IsCheckoutMissing   bool             `gorm:"default:false;index"`
	Status              AttendanceStatus `gorm:"type:varchar(20);not null"`
	Latitude            float64          // General / Masuk Latitude
	Longitude           float64          // General / Masuk Longitude
	AkurasiGPS          float64          // General / Masuk GPS Accuracy (meter)
	DalamRadius         bool             // General / Masuk within radius boolean
	RadiusTervalidasi   string           `gorm:"size:50;default:'kantor'"` // kantor/rumah/tidak_tervalidasi
	LatitudeMasuk       float64
	LongitudeMasuk      float64
	AkurasiGPSMasuk     float64
	DalamRadiusMasuk    bool
	FotoSelfieMasukURL  string `gorm:"type:text"`
	LatitudePulang      float64
	LongitudePulang     float64
	AkurasiGPSPulang    float64
	DalamRadiusPulang   bool
	FotoSelfiePulangURL string `gorm:"type:text"`
}

type WorkType struct {
	gorm.Model
	Nama                  string `gorm:"size:50;not null;unique"` // Nama / NamaTipe
	Deskripsi             string `gorm:"type:text"`
	IsDefault             bool   `gorm:"default:false"`
	IsHomeBase            bool   `gorm:"default:false"`
	ButuhValidasiGeofence bool   `gorm:"default:true"`
	RadiusYangBerlaku     string `gorm:"size:50;default:'kantor'"` // kantor/rumah/kombinasi
	WajibSelfie           bool   `gorm:"default:true"`
	WarnaLabel            string `gorm:"size:20;default:'#3B82F6'"`
	StatusAktif           bool   `gorm:"default:true"`
}

type EmployeeHomeLocation struct {
	gorm.Model
	EmployeeID     uint     `gorm:"uniqueIndex;not null"`
	Employee       Employee `gorm:"foreignKey:EmployeeID"`
	LatitudeRumah  float64  `gorm:"not null"`
	LongitudeRumah float64  `gorm:"not null"`
	RadiusMeter    float64  `gorm:"default:100"`
	AlamatRumah    string   `gorm:"type:text"`
	GoogleMapsURL  string   `gorm:"type:text"`
}

type AuditLog struct {
	gorm.Model
	UserID        uint `gorm:"not null;index"`
	User          User
	Action        string `gorm:"size:50;not null"` // CREATE, UPDATE, DELETE, LOGIN
	TableName     string `gorm:"size:50;not null"`
	RecordID      uint   `gorm:"index"`
	ChangesDetail string `gorm:"type:text"`
}

type OfficeLocation struct {
	gorm.Model
	NamaLokasi    string  `gorm:"size:100;not null"`
	GoogleMapsURL string  `gorm:"type:text"`
	Latitude      float64 `gorm:"not null"`
	Longitude     float64 `gorm:"not null"`
	RadiusMeter   float64 `gorm:"not null"`
	Alamat        string  `gorm:"type:text"`
}

type WorkSchedule struct {
	gorm.Model
	EmployeeID              *uint      `gorm:"index"`
	Employee                Employee
	Tanggal                 *time.Time `gorm:"type:date;index"`
	NamaShift               string     `gorm:"size:100;not null"`
	JamMulai                string     `gorm:"type:varchar(10);not null"` // e.g., 09:00:00
	JamSelesai              string     `gorm:"type:varchar(10);not null"` // e.g., 17:00:00
	ToleransiTerlambatMenit int        `gorm:"not null;default:10"`
}

type LeaveStatus string

const (
	LeaveStatusPending  LeaveStatus = "Pending"
	LeaveStatusApproved LeaveStatus = "Approved"
	LeaveStatusRejected LeaveStatus = "Rejected"
)

type LeaveRequest struct {
	gorm.Model
	EmployeeID     uint `gorm:"not null;index"`
	Employee       Employee
	JenisIzin      string      `gorm:"size:50;not null"` // Cuti, Sakit, Lainnya
	TanggalMulai   time.Time   `gorm:"type:date;not null"`
	TanggalSelesai time.Time   `gorm:"type:date;not null"`
	Alasan         string      `gorm:"type:text;not null"`
	LampiranURL    string      `gorm:"type:text"`
	Status         LeaveStatus `gorm:"type:varchar(20);default:'Pending'"`
	ApprovedBy     *uint       // UserID of HRD/Admin/Manager who approved
	ApprovedAt     *time.Time  `gorm:"type:timestamp"`
	Notes          string      `gorm:"type:text"`
}

const (
	LeaveTypeCuti    = "Cuti"
	LeaveTypeSakit   = "Sakit"
	LeaveTypeLainnya = "Lainnya"
)

// GeneralSetting stores configurable rules that apply across the application.
// A single row is used so the settings screen can update the rules atomically.
type GeneralSetting struct {
	gorm.Model
	MinimumMasaKerjaCutiBulan      int `gorm:"not null;default:3"`
	BatasLaporanSetelahCheckoutJam int `gorm:"not null;default:1"`
}

type LeaveQuota struct {
	gorm.Model
	EmployeeID uint `gorm:"not null;index"`
	Employee   Employee
	Tahun      int    `gorm:"not null"`
	JenisCuti  string `gorm:"size:50;not null"`
	SisaKuota  int    `gorm:"not null;default:12"`
}

// TableName keeps compatibility with the existing database table created by
// the first version of the application.
func (LeaveQuota) TableName() string {
	return "leave_quota"
}

type Notification struct {
	gorm.Model
	UserID     uint `gorm:"not null;index"`
	User       User
	Judul      string `gorm:"size:100;not null"`
	Pesan      string `gorm:"type:text;not null"`
	StatusBaca bool   `gorm:"default:false"`
	Waktu      time.Time
}

// PushSubscription stores a browser Push API subscription for one user.
// A user may have multiple subscriptions because they can use multiple
// browsers/devices at the same time.
type PushSubscription struct {
	gorm.Model
	UserID   uint `gorm:"not null;index"`
	User     User
	Endpoint string `gorm:"type:text;not null;uniqueIndex"`
	P256dh   string `gorm:"type:text;not null"`
	Auth     string `gorm:"type:text;not null"`
}

type Holiday struct {
	gorm.Model
	Tanggal    time.Time `gorm:"type:date;not null;uniqueIndex"`
	Keterangan string    `gorm:"size:255;not null"`
}

// CompanyEvent stores company activities that are shown on employee and HRD calendars.
type CompanyEvent struct {
	gorm.Model
	Tanggal     time.Time `gorm:"type:date;not null;index"`
	JamMulai    string    `gorm:"size:5;not null"`
	JamSelesai  string    `gorm:"size:5"`
	Judul       string    `gorm:"size:150;not null"`
	Tipe        string    `gorm:"size:30;not null;default:'info'"`
	Deskripsi   string    `gorm:"type:text"`
	Lokasi      string    `gorm:"size:150"`
	StatusAktif bool      `gorm:"default:true;index"`
	DibuatOleh  uint      `gorm:"index"`
}

type NotificationSetting struct {
	gorm.Model
	TipeNotifikasi string `gorm:"size:50;not null;uniqueIndex:idx_notif_role"`
	Role           Role   `gorm:"type:varchar(20);not null;uniqueIndex:idx_notif_role"`
	IsEmailEnabled bool   `gorm:"default:true"`
	IsInAppEnabled bool   `gorm:"default:true"`
}

type HelpdeskContact struct {
	gorm.Model
	EmailHelpdesk string `gorm:"size:100;not null;default:'hrd@golan.co.id'"`
	EmailIT       string `gorm:"size:100;not null;default:'support@golan.co.id'"`
	WhatsAppHRD   string `gorm:"size:50;not null;default:'+62 813-2493-7038'"`
	WhatsAppIT    string `gorm:"size:50;not null;default:'+62 895-3414-40181'"`
	JamLayanan    string `gorm:"size:100;not null;default:'Senin - Jumat: 08:00 - 17:00 WIB'"`
}

type WorkReport struct {
	gorm.Model
	EmployeeID         uint                   `gorm:"not null;index" json:"EmployeeID"`
	Employee           Employee               `json:"Employee"`
	Tanggal            time.Time              `gorm:"type:date;not null" json:"tanggal"`
	Tugas              string                 `gorm:"size:255" json:"tugas"`
	Judul              string                 `gorm:"size:255" json:"judul"` // Judul Golan Nusantara/ Golan Education
	DeskripsiKegiatan  string                 `gorm:"type:text" json:"deskripsi_kegiatan"`
	RealisasiKegiatan  string                 `gorm:"type:text" json:"realisasi_kegiatan"` // Capaian Target, %
	Kendala            string                 `gorm:"type:text" json:"kendala"`
	RencanaMingguDepan string                 `gorm:"type:text" json:"rencana_minggu_depan"`
	LinkArtikel        string                 `gorm:"type:text" json:"link_artikel"` // Draft/ Pending/ Publish
	CatatanTambahan    string                 `gorm:"type:text" json:"catatan_tambahan"`
	StatusSesuai       string                 `gorm:"size:50" json:"status_sesuai"` // Sesuai/Tidak Sesuai
	ValidasiOlehHR     bool                   `gorm:"default:false" json:"validasi_oleh_hr"`
	StatusLogbook      string                 `gorm:"size:20;default:'draft'" json:"status_logbook"` // draft/submitted/approved
	ReviewedBy         *uint                  `gorm:"index" json:"reviewed_by"`
	ReviewedAt         *time.Time             `gorm:"type:timestamp" json:"reviewed_at"`
	ReviewNotes        string                 `gorm:"type:text" json:"review_notes"`
	CustomFields       string                 `gorm:"type:text" json:"custom_fields"` // JSON representation of custom headers
	IsLateSubmission   bool                   `gorm:"default:false;index" json:"is_late_submission"`
	Attachments        []WorkReportAttachment `gorm:"foreignKey:WorkReportID" json:"attachments,omitempty"`
}

type WorkReportAttachment struct {
	gorm.Model
	WorkReportID uint       `gorm:"not null;index" json:"work_report_id"`
	WorkReport   WorkReport `gorm:"foreignKey:WorkReportID" json:"-"`
	FileURL      string     `gorm:"type:text;not null" json:"file_url"`
	StorageKey   string     `gorm:"type:text;not null" json:"storage_key"`
	FileName     string     `gorm:"size:255;not null" json:"file_name"`
	MimeType     string     `gorm:"size:80;not null" json:"mime_type"`
	FileSize     int64      `gorm:"not null" json:"file_size"`
}

type WorkReportColumn struct {
	gorm.Model
	NamaKolom  string `gorm:"size:100;not null"`
	TipeInput  string `gorm:"size:50;not null;default:'text'"` // text, textarea, dropdown
	Opsi       string `gorm:"type:text"`                       // JSON array for dropdown options
	Aktif      bool   `gorm:"default:true"`
	WajibDiisi bool   `gorm:"default:false"`
	Urutan     int    `gorm:"default:0"`
}

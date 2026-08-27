package models

import (
	"time"

	"gorm.io/gorm"
)

type Role string

const (
	RoleKaryawan Role = "Karyawan"
	RoleHRD      Role = "HRD"
	RoleMagang   Role = "MAGANG"
	RoleManajer  Role = "MANAJER"
)

func IsValidRole(role Role) bool {
	return role == RoleKaryawan || role == RoleHRD || role == RoleMagang || role == RoleManajer
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
	ProjectID           *uint      `gorm:"index"`
	Project             *Project   `gorm:"foreignKey:ProjectID"`
	TeamID              string     `gorm:"size:80;index"`
	InternshipStartDate *time.Time `gorm:"type:date"`
	InternshipEndDate   *time.Time `gorm:"type:date"`
	MentorName          string     `gorm:"size:100"`
	InstitutionName     string     `gorm:"size:150"`
	Employee            Employee
}

// Project is the source of valid project IDs used when assigning employees.
// Soft deletion keeps historical employee assignments referentially readable.
type Project struct {
	gorm.Model
	NamaProject string `gorm:"size:150;not null;uniqueIndex"`
	Deskripsi   string `gorm:"type:text"`
	StatusAktif bool   `gorm:"default:true;index"`
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

// InternshipDocument stores supporting documents issued to an intern.
// DocumentType is either nilai_magang or keterangan_lulus.
type InternshipDocument struct {
	gorm.Model
	UserID       uint `gorm:"uniqueIndex:idx_internship_document_user_type;not null"`
	User         User
	DocumentType string     `gorm:"size:40;uniqueIndex:idx_internship_document_user_type;not null"`
	FileURL      string     `gorm:"type:text"`
	StorageKey   string     `gorm:"type:text"`
	FileName     string     `gorm:"size:255"`
	MimeType     string     `gorm:"size:80"`
	FileSize     int64      `gorm:"default:0"`
	UploadedBy   *uint      `gorm:"index"`
	UploadedAt   *time.Time `gorm:"type:timestamp"`
}

// CertificateIssuanceLog keeps a cumulative lifetime record of every intern who has ever been issued a certificate.
// This ensures total issued certificates count never decreases when individual files/metadata are deleted.
type CertificateIssuanceLog struct {
	gorm.Model
	UserID        uint      `gorm:"index;not null"`
	CertificateNo string    `gorm:"size:80;not null"`
	IssuedAt      time.Time `gorm:"type:timestamp;not null"`
	Action        string    `gorm:"size:50;not null"`
}

type Division struct {
	gorm.Model
	NamaDivisi   string `gorm:"size:100;not null"`
	DivisionCode string `gorm:"size:20;uniqueIndex" json:"division_code"`
	Deskripsi    string `gorm:"type:text"`
	Employees    []Employee
}

type Position struct {
	gorm.Model
	NamaJabatan  string `gorm:"size:100;not null"`
	PositionCode string `gorm:"size:20;uniqueIndex" json:"position_code"`
	Deskripsi    string `gorm:"type:text"`
	Employees    []Employee
}

type Employee struct {
	gorm.Model
	UserID           uint       `gorm:"uniqueIndex;not null"`
	User             *User      `gorm:"foreignKey:UserID"`
	NIK              string     `gorm:"size:50;uniqueIndex;not null"`
	EmployeeCode     string     `gorm:"size:40;uniqueIndex" json:"employee_code"`
	JenisKelamin     string     `gorm:"size:20"`
	TempatLahir      string     `gorm:"size:100"`
	TanggalLahir     *time.Time `gorm:"type:date"`
	NomorTelepon     string     `gorm:"size:30"`
	Alamat           string     `gorm:"type:text"`
	DivisionID       uint       `gorm:"not null"`
	Division         Division   `gorm:"foreignKey:DivisionID"`
	PositionID       uint       `gorm:"not null"`
	Position         Position   `gorm:"foreignKey:PositionID"`
	TanggalBergabung time.Time  `gorm:"type:date"`
	FotoProfilURL    string     `gorm:"type:text"`
	ShiftKerja       string     `gorm:"size:100;not null;default:'Reguler'"`
	// Effective shift fields are response-only. The source of truth is WorkSchedule;
	// these fields let directory APIs expose the resolved assignment without writing
	// it back to the legacy employees.shift_kerja column.
	ShiftID         uint                  `gorm:"-" json:"shift_id,omitempty"`
	ShiftName       string                `gorm:"-" json:"shift_name,omitempty"`
	ShiftTanggal    *time.Time            `gorm:"-" json:"tanggal_berlaku,omitempty"`
	ShiftJamMulai   string                `gorm:"-" json:"jam_masuk,omitempty"`
	ShiftJamSelesai string                `gorm:"-" json:"jam_pulang,omitempty"`
	HomeLatitude    float64               `gorm:"default:0"`
	HomeLongitude   float64               `gorm:"default:0"`
	HomeLocation    *EmployeeHomeLocation `gorm:"foreignKey:EmployeeID"`
}

// CodeGenerator is deliberately retained after employees are deleted so codes
// are never reused. One row is advanced under a PostgreSQL row lock per
// role/division combination.
type CodeGenerator struct {
	gorm.Model
	RoleCode     string `gorm:"size:2;not null;uniqueIndex:idx_code_generator_scope"`
	DivisionCode string `gorm:"size:20;not null;uniqueIndex:idx_code_generator_scope"`
	NextNumber   int    `gorm:"not null;default:1"`
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
	Employee       Employee `gorm:"foreignKey:EmployeeID" json:"-"`
	LatitudeRumah  float64  `gorm:"not null"`
	LongitudeRumah float64  `gorm:"not null"`
	RadiusMeter    float64  `gorm:"default:100"`
	AlamatRumah    string   `gorm:"type:text"`
	GoogleMapsURL  string   `gorm:"type:text"`
}

type HomeLocationChangeStatus string

const (
	HomeLocationPending   HomeLocationChangeStatus = "Menunggu Persetujuan"
	HomeLocationApproved  HomeLocationChangeStatus = "Disetujui"
	HomeLocationRejected  HomeLocationChangeStatus = "Ditolak"
	HomeLocationCancelled HomeLocationChangeStatus = "Dibatalkan"
)

// HomeLocationChangeRequest keeps the proposed location immutable so the
// approval decision can be audited independently from the active location.
type HomeLocationChangeRequest struct {
	gorm.Model
	EmployeeID       uint     `gorm:"not null;index"`
	Employee         Employee `gorm:"foreignKey:EmployeeID" json:"-"`
	OldAddress       string   `gorm:"type:text"`
	OldLatitude      float64
	OldLongitude     float64
	OldRadiusMeter   float64
	OldGoogleMapsURL string                   `gorm:"type:text"`
	NewAddress       string                   `gorm:"type:text;not null"`
	NewLatitude      float64                  `gorm:"not null"`
	NewLongitude     float64                  `gorm:"not null"`
	NewRadiusMeter   float64                  `gorm:"not null"`
	NewGoogleMapsURL string                   `gorm:"type:text"`
	EffectiveDate    time.Time                `gorm:"type:date;not null;index"`
	Reason           string                   `gorm:"type:text;not null"`
	AttachmentURL    string                   `gorm:"type:text"`
	AttachmentName   string                   `gorm:"size:255"`
	Status           HomeLocationChangeStatus `gorm:"type:varchar(30);not null;index"`
	ReviewedBy       *uint                    `gorm:"index"`
	Reviewer         *User                    `gorm:"foreignKey:ReviewedBy" json:"-"`
	ReviewedAt       *time.Time               `gorm:"type:timestamp"`
	RejectionReason  string                   `gorm:"type:text"`
}

type EmployeeHomeLocationHistory struct {
	gorm.Model
	EmployeeID       uint                     `gorm:"not null;index"`
	RequestID        *uint                    `gorm:"index"`
	ChangedBy        uint                     `gorm:"not null;index"`
	Status           HomeLocationChangeStatus `gorm:"type:varchar(30);not null"`
	EffectiveDate    time.Time                `gorm:"type:date;not null;index"`
	OldAddress       string                   `gorm:"type:text"`
	NewAddress       string                   `gorm:"type:text"`
	OldLatitude      float64
	OldLongitude     float64
	NewLatitude      float64
	NewLongitude     float64
	NewGoogleMapsURL string `gorm:"type:text"`
	OldRadiusMeter   float64
	NewRadiusMeter   float64
	Notes            string `gorm:"type:text"`
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
	EmployeeID              *uint `gorm:"index"`
	Employee                Employee
	Tanggal                 *time.Time `gorm:"type:date;index"`
	NamaShift               string     `gorm:"size:100;not null"`
	JamMulai                string     `gorm:"type:varchar(10);not null"` // e.g., 09:00:00
	JamSelesai              string     `gorm:"type:varchar(10);not null"` // e.g., 17:00:00
	ToleransiTerlambatMenit int        `gorm:"not null;default:10"`
	// HariKerja stores ISO-like weekday numbers as JSON: 1=Senin ... 7=Minggu.
	// An empty value is treated as the legacy default Senin-Sabtu.
	HariKerja string `gorm:"type:text;not null;default:'[1,2,3,4,5,6]'" json:"hari_kerja"`
}

// RegularWorkSchedule is the single source of truth for the default weekly
// schedule. WorkSchedule remains reserved for dated employee/custom shifts.
type RegularWorkSchedule struct {
	gorm.Model
	DayOfWeek            int    `gorm:"not null;uniqueIndex:idx_regular_schedule_day" json:"day_of_week"`
	DayName              string `gorm:"size:20;not null" json:"day_name"`
	IsWorkingDay         bool   `gorm:"not null;default:true" json:"is_working_day"`
	StartTime            string `gorm:"size:8" json:"start_time"`
	EndTime              string `gorm:"size:8" json:"end_time"`
	LateToleranceMinutes int    `gorm:"not null;default:10" json:"late_tolerance_minutes"`
}

type LeaveStatus string

const (
	LeaveStatusPending         LeaveStatus = "Pending"
	LeaveStatusApproved        LeaveStatus = "Approved"
	LeaveStatusRejected        LeaveStatus = "Rejected"
	LeaveStatusCancelled       LeaveStatus = "Cancelled"
	LeaveStatusPendingManager  LeaveStatus = "pending_manager_approval"
	LeaveStatusManagerApproved LeaveStatus = "manager_approved"
	LeaveStatusManagerRejected LeaveStatus = "manager_rejected"
	LeaveStatusPendingHRD      LeaveStatus = "pending_hrd_approval"
	LeaveStatusHRDApproved     LeaveStatus = "hrd_approved"
	LeaveStatusHRDRejected     LeaveStatus = "hrd_rejected"
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
	Status         LeaveStatus `gorm:"type:varchar(40);default:'pending_manager_approval'"`
	// Immutable routing snapshot captured when the request is created.
	AssignedApproverID   *uint                  `gorm:"index" json:"assigned_approver_id"`
	AssignedApproverRole Role                   `gorm:"type:varchar(20)" json:"assigned_approver_role"`
	AssignedApprover     *User                  `gorm:"foreignKey:AssignedApproverID" json:"assigned_approver,omitempty"`
	ApprovedBy           *uint                  // UserID of HRD/Admin/Manager who approved
	ApprovedAt           *time.Time             `gorm:"type:timestamp"`
	Notes                string                 `gorm:"type:text"`
	ManagerApprovedBy    *uint                  `gorm:"index"`
	ManagerApprovedAt    *time.Time             `gorm:"type:timestamp"`
	ManagerNotes         string                 `gorm:"type:text"`
	RejectionReason      string                 `gorm:"type:text" json:"rejection_reason"`
	RejectedBy           *uint                  `gorm:"index" json:"rejected_by"`
	RejectedAt           *time.Time             `gorm:"type:timestamp" json:"rejected_at"`
	ApprovalHistory      []LeaveApprovalHistory `gorm:"foreignKey:LeaveRequestID"`
	// QuotaDays/QuotaReserved make quota accounting idempotent across the
	// pending -> approved/rejected/cancelled lifecycle.
	QuotaDays     int  `gorm:"not null;default:0"`
	QuotaReserved bool `gorm:"not null;default:false"`
}

// ApprovalDelegation stores a manager's approved temporary replacement.
type ApprovalDelegation struct {
	gorm.Model
	ManagerID  uint      `gorm:"not null;index"`
	DelegateID uint      `gorm:"not null;index"`
	StartDate  time.Time `gorm:"type:date;not null"`
	EndDate    time.Time `gorm:"type:date;not null"`
	Reason     string    `gorm:"type:text"`
	Status     string    `gorm:"size:20;not null;default:'scheduled';index"`
}

// LeaveApprovalHistory keeps every workflow decision auditable.
type LeaveApprovalHistory struct {
	gorm.Model
	LeaveRequestID uint `gorm:"not null;index"`
	LeaveRequest   LeaveRequest
	DecidedBy      uint        `gorm:"not null;index"`
	DecidedByUser  User        `gorm:"foreignKey:DecidedBy"`
	Role           Role        `gorm:"type:varchar(20);not null"`
	Status         LeaveStatus `gorm:"type:varchar(40);not null"`
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
	MinimumMasaKerjaCutiBulan        int `gorm:"not null;default:3"`
	BatasLaporanSetelahCheckoutMenit int `gorm:"not null;default:60"`
	// Deprecated: retained while existing installations are migrated to minutes.
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
	Tanggal    time.Time `gorm:"type:date;not null;index:idx_holiday_date_type,priority:1"`
	Keterangan string    `gorm:"size:255;not null"`
	// Type is national, joint_leave, or company. Legacy rows are preserved as company holidays.
	Type       string     `gorm:"size:20;not null;default:'company';index:idx_holiday_date_type,priority:2" json:"type"`
	Source     string     `gorm:"size:255" json:"source,omitempty"`
	ExternalID string     `gorm:"size:120;uniqueIndex" json:"external_id,omitempty"`
	SyncedAt   *time.Time `gorm:"type:timestamp" json:"synced_at,omitempty"`
}

// CompanyEvent stores company activities that are shown on employee and HRD calendars.
type CompanyEvent struct {
	gorm.Model
	Tanggal            time.Time `gorm:"type:date;not null;index"`
	JamMulai           string    `gorm:"size:5;not null"`
	JamSelesai         string    `gorm:"size:5"`
	Judul              string    `gorm:"size:150;not null"`
	Tipe               string    `gorm:"size:30;not null;default:'info'"`
	Deskripsi          string    `gorm:"type:text"`
	Lokasi             string    `gorm:"size:150"`
	FileAttachmentURL  string    `gorm:"type:text"`
	FileAttachmentName string    `gorm:"size:255"`
	StatusAktif        bool      `gorm:"default:true;index"`
	DibuatOleh         uint      `gorm:"index"`
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
	StatusLogbook      string                 `gorm:"size:20;default:'draft'" json:"status_logbook"` // draft/submitted/approved/rejected
	ReviewedBy         *uint                  `gorm:"index" json:"reviewed_by"`
	ReviewedAt         *time.Time             `gorm:"type:timestamp" json:"reviewed_at"`
	ReviewNotes        string                 `gorm:"type:text" json:"review_notes"`
	ManagerReviewNote  string                 `gorm:"-" json:"manager_review_note,omitempty"`
	ManagerReviewedAt  *time.Time             `gorm:"-" json:"manager_reviewed_at,omitempty"`
	ManagerReviewedBy  *uint                  `gorm:"-" json:"manager_reviewed_by,omitempty"`
	CustomFields       string                 `gorm:"type:text" json:"custom_fields"` // JSON representation of custom headers
	IsLateSubmission   bool                   `gorm:"default:false;index" json:"is_late_submission"`
	Attachments        []WorkReportAttachment `gorm:"foreignKey:WorkReportID" json:"attachments,omitempty"`
}

func (w *WorkReport) AfterFind(tx *gorm.DB) error {
	w.ManagerReviewNote = w.ReviewNotes
	w.ManagerReviewedAt = w.ReviewedAt
	w.ManagerReviewedBy = w.ReviewedBy
	return nil
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

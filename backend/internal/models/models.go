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
)

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
	Nama                string    `gorm:"size:100;not null"`
	Email               string    `gorm:"size:100;uniqueIndex;not null"`
	PasswordHash        string    `gorm:"not null"`
	ResetPasswordToken  string    `gorm:"size:100;index"`
	ResetPasswordExpiry time.Time `gorm:"type:timestamp"`
	Role                Role      `gorm:"type:varchar(20);not null"`
	Status              string    `gorm:"size:20;default:'aktif'"`
	Employee            Employee
}

type Department struct {
	gorm.Model
	NamaDepartemen string `gorm:"size:100;not null"`
	Employees      []Employee
}

type Position struct {
	gorm.Model
	NamaJabatan string `gorm:"size:100;not null"`
	Employees   []Employee
}

type Employee struct {
	gorm.Model
	UserID           uint                  `gorm:"uniqueIndex;not null"`
	User             *User                 `gorm:"foreignKey:UserID"`
	NIK              string                `gorm:"size:50;uniqueIndex;not null"`
	DepartmentID     uint                  `gorm:"not null"`
	Department       Department            `gorm:"foreignKey:DepartmentID"`
	PositionID       uint                  `gorm:"not null"`
	Position         Position              `gorm:"foreignKey:PositionID"`
	TanggalBergabung time.Time             `gorm:"type:date"`
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
	NamaLokasi  string  `gorm:"size:100;not null"`
	Latitude    float64 `gorm:"not null"`
	Longitude   float64 `gorm:"not null"`
	RadiusMeter float64 `gorm:"not null"`
	Alamat      string  `gorm:"type:text"`
}

type WorkSchedule struct {
	gorm.Model
	NamaShift               string `gorm:"size:100;not null"`
	JamMulai                string `gorm:"type:varchar(10);not null"` // e.g., 09:00:00
	JamSelesai              string `gorm:"type:varchar(10);not null"` // e.g., 17:00:00
	ToleransiTerlambatMenit int    `gorm:"not null;default:10"`
	HariKerja               string `gorm:"size:100;default:'1,2,3,4,5'"` // 1=Monday, 7=Sunday
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
	JenisIzin      string      `gorm:"size:50;not null"` // e.g., Sakit, Cuti Tahunan, Izin
	TanggalMulai   time.Time   `gorm:"type:date;not null"`
	TanggalSelesai time.Time   `gorm:"type:date;not null"`
	Alasan         string      `gorm:"type:text;not null"`
	LampiranURL    string      `gorm:"type:text"`
	Status         LeaveStatus `gorm:"type:varchar(20);default:'Pending'"`
	ApprovedBy     *uint       // UserID of HRD/Admin who approved
}

type LeaveQuota struct {
	gorm.Model
	EmployeeID uint `gorm:"not null;index"`
	Employee   Employee
	Tahun      int    `gorm:"not null"`
	JenisCuti  string `gorm:"size:50;not null"`
	SisaKuota  int    `gorm:"not null;default:12"`
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

type Holiday struct {
	gorm.Model
	Tanggal    time.Time `gorm:"type:date;not null;uniqueIndex"`
	Keterangan string    `gorm:"size:255;not null"`
}

type NotificationSetting struct {
	gorm.Model
	TipeNotifikasi string `gorm:"size:50;not null;uniqueIndex:idx_notif_role"`
	Role           Role   `gorm:"type:varchar(20);not null;uniqueIndex:idx_notif_role"`
	IsEmailEnabled bool   `gorm:"default:true"`
	IsInAppEnabled bool   `gorm:"default:true"`
}

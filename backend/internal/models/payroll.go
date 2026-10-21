package models

import "time"

// Payroll is an immutable snapshot of the employee and company information
// used when a payslip is issued. Money is stored as whole Rupiah integers.
type Payroll struct {
	Model
	EmployeeID           uint          `gorm:"not null;uniqueIndex:idx_payroll_employee_period" json:"employee_id"`
	UserID               uint          `gorm:"not null;index" json:"user_id"`
	PeriodeBulan         time.Time     `gorm:"type:date;not null;uniqueIndex:idx_payroll_employee_period" json:"periode_bulan"`
	PayrollCutoffStart   time.Time     `gorm:"type:date;not null" json:"payroll_cutoff_start"`
	PayrollCutoffEnd     time.Time     `gorm:"type:date;not null" json:"payroll_cutoff_end"`
	PaymentDate          time.Time     `gorm:"type:date;not null" json:"payment_date"`
	EmployeeNameSnapshot string        `gorm:"size:100;not null" json:"employee_name_snapshot"`
	EmployeeCodeSnapshot string        `gorm:"size:40;not null" json:"employee_code_snapshot"`
	NIKSnapshot          string        `gorm:"size:50" json:"nik_snapshot"`
	PositionSnapshot     string        `gorm:"size:100" json:"position_snapshot"`
	DivisionSnapshot     string        `gorm:"size:100" json:"division_snapshot"`
	TotalHariKerja       int           `gorm:"not null" json:"total_hari_kerja"`
	CompanyNameSnapshot  string        `gorm:"size:150;not null" json:"company_name_snapshot"`
	CompanyPhoneSnapshot string        `gorm:"size:40" json:"company_phone_snapshot"`
	TotalIncome          int64         `gorm:"type:bigint;not null;default:0" json:"total_income"`
	TotalDeduction       int64         `gorm:"type:bigint;not null;default:0" json:"total_deduction"`
	TakeHomePay          int64         `gorm:"type:bigint;not null;default:0" json:"take_home_pay"`
	Notes                string        `gorm:"type:text" json:"notes"`
	ApprovedByName       string        `gorm:"size:100" json:"approved_by_name"`
	ApprovedByPosition   string        `gorm:"size:100" json:"approved_by_position"`
	ReceivedByName       string        `gorm:"size:100" json:"received_by_name"`
	ReceivedByPosition   string        `gorm:"size:100" json:"received_by_position"`
	Status               string        `gorm:"size:20;not null;default:'Draft';index" json:"status"`
	PublishedAt          *time.Time    `gorm:"type:timestamp" json:"published_at,omitempty"`
	CreatedBy            uint          `gorm:"not null;index" json:"created_by"`
	UpdatedBy            uint          `gorm:"not null;index" json:"updated_by"`
	Items                []PayrollItem `gorm:"foreignKey:PayrollID;constraint:OnDelete:CASCADE" json:"items"`
}

type PayrollItem struct {
	Model
	PayrollID uint   `gorm:"not null;index" json:"payroll_id"`
	Type      string `gorm:"size:20;not null;index" json:"type"`
	Name      string `gorm:"size:100;not null" json:"name"`
	Amount    int64  `gorm:"type:bigint;not null" json:"amount"`
	SortOrder int    `gorm:"not null;default:0" json:"sort_order"`
}

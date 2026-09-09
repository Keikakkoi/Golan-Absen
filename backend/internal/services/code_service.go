package services

import (
	"fmt"
	"strconv"
	"strings"

	"absensi-golan-backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func RoleCode(role models.Role) string {
	switch role {
	case models.RoleMagang:
		return "01"
	case models.RoleKaryawan:
		return "02"
	case models.RoleManajer:
		return "03"
	case models.RoleHRD:
		return "04"
	default:
		return "00"
	}
}

func nextEmployeeCode(tx *gorm.DB, role models.Role, divisionCode string, year int) (string, error) {
	roleCode := RoleCode(role)
	var generator models.CodeGenerator
	if err := tx.Where("role_code = ? AND division_code = ?", roleCode, divisionCode).First(&generator).Error; err != nil {
		if err != gorm.ErrRecordNotFound {
			return "", err
		}
		generator = models.CodeGenerator{RoleCode: roleCode, DivisionCode: divisionCode, NextNumber: 1}
		if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&generator).Error; err != nil {
			return "", err
		}
	}
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("role_code = ? AND division_code = ?", roleCode, divisionCode).First(&generator).Error; err != nil {
		return "", err
	}
	// Scan from 1 so the existing numeric suffix format is retained. The year
	// prefix is included in the lookup because codes are globally unique.
	number := 1
	for {
		code := fmt.Sprintf("%02d%s%s%03d", year%100, roleCode, divisionCode, number)
		var used models.Employee
		err := tx.Where("employee_code = ?", code).First(&used).Error
		if err == gorm.ErrRecordNotFound {
			if number >= generator.NextNumber {
				generator.NextNumber = number + 1
				if err := tx.Save(&generator).Error; err != nil {
					return "", err
				}
			}
			return code, nil
		}
		if err != nil {
			return "", err
		}
		number++
	}
}

func AssignEmployeeCode(tx *gorm.DB, employee *models.Employee, role models.Role) error {
	if employee.TanggalBergabung.IsZero() {
		return fmt.Errorf("tanggal masuk wajib diisi untuk membuat kode karyawan")
	}
	var division models.Division
	if err := tx.First(&division, employee.DivisionID).Error; err != nil {
		return err
	}
	code, err := nextEmployeeCode(tx, role, division.DivisionCode, employee.TanggalBergabung.Year())
	if err != nil {
		return err
	}
	employee.EmployeeCode = code
	return tx.Model(employee).Update("employee_code", code).Error
}

func RebuildEmployeeCodes(tx *gorm.DB, employeeIDs ...uint) error {
	query := tx.Preload("User").Preload("Division")
	if len(employeeIDs) > 0 {
		query = query.Where("id IN ?", employeeIDs)
	}
	var employees []models.Employee
	if err := query.Find(&employees).Error; err != nil {
		return err
	}
	for i := range employees {
		if strings.TrimSpace(employees[i].EmployeeCode) != "" || employees[i].TanggalBergabung.IsZero() {
			continue
		}
		code, err := nextEmployeeCode(tx, employees[i].User.Role, employees[i].Division.DivisionCode, employees[i].TanggalBergabung.Year())
		if err != nil {
			return err
		}
		if err := tx.Model(&employees[i]).Update("employee_code", code).Error; err != nil {
			return err
		}
	}
	return nil
}

// BackfillCodes is safe to run repeatedly. Legacy generated codes receive the
// year prefix once; other existing codes are preserved.
func BackfillCodes(db *gorm.DB) error {
	var divisions []models.Division
	if err := db.Order("id asc").Find(&divisions).Error; err != nil {
		return err
	}
	for i := range divisions {
		if strings.TrimSpace(divisions[i].DivisionCode) == "" {
			if err := db.Model(&divisions[i]).Update("division_code", strconv.FormatUint(uint64(divisions[i].ID), 10)).Error; err != nil {
				return err
			}
		}
	}
	var positions []models.Position
	if err := db.Order("id asc").Find(&positions).Error; err != nil {
		return err
	}
	for i := range positions {
		if strings.TrimSpace(positions[i].PositionCode) == "" {
			if err := db.Model(&positions[i]).Update("position_code", fmt.Sprintf("%03d", positions[i].ID)).Error; err != nil {
				return err
			}
		}
	}
	var employees []models.Employee
	if err := db.Preload("User").Preload("Division").Order("id asc").Find(&employees).Error; err != nil {
		return err
	}
	for i := range employees {
		legacyCode := strings.TrimSpace(employees[i].EmployeeCode)
		if legacyCode != "" {
			// Existing generated codes used ROLE+DIVISION+SEQUENCE (for
			// example 0211001). Upgrade that
			// legacy shape once by prepending the join year. Other codes,
			// including manually assigned codes, remain untouched.
			if employees[i].TanggalBergabung.IsZero() || !isLegacyEmployeeCode(legacyCode, employees[i].User.Role, employees[i].Division.DivisionCode) {
				continue
			}
			upgradedCode := fmt.Sprintf("%02d%s", employees[i].TanggalBergabung.Year()%100, legacyCode)
			var owner models.Employee
			if err := db.Where("employee_code = ? AND id <> ?", upgradedCode, employees[i].ID).First(&owner).Error; err == nil {
				return fmt.Errorf("kode karyawan hasil backfill %s sudah digunakan", upgradedCode)
			} else if err != gorm.ErrRecordNotFound {
				return err
			}
			if err := db.Model(&employees[i]).Update("employee_code", upgradedCode).Error; err != nil {
				return err
			}
			continue
		}
		if employees[i].TanggalBergabung.IsZero() {
			continue
		}
		if err := AssignEmployeeCode(db, &employees[i], employees[i].User.Role); err != nil {
			return err
		}
	}
	return nil
}

func isLegacyEmployeeCode(code string, role models.Role, divisionCode string) bool {
	prefix := RoleCode(role) + strings.TrimSpace(divisionCode)
	if prefix == "" || len(code) != len(prefix)+3 || !strings.HasPrefix(code, prefix) {
		return false
	}
	for _, character := range code[len(prefix):] {
		if character < '0' || character > '9' {
			return false
		}
	}
	return true
}

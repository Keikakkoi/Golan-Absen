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

func nextEmployeeCode(tx *gorm.DB, role models.Role, divisionCode string) (string, error) {
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
	// Always scan from 1 so a number released by a deletion or reassignment
	// is reused before allocating a new number.
	number := 1
	for {
		code := fmt.Sprintf("%s%s%03d", roleCode, divisionCode, number)
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
	var division models.Division
	if err := tx.First(&division, employee.DivisionID).Error; err != nil {
		return err
	}
	code, err := nextEmployeeCode(tx, role, division.DivisionCode)
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
		code, err := nextEmployeeCode(tx, employees[i].User.Role, employees[i].Division.DivisionCode)
		if err != nil {
			return err
		}
		if err := tx.Model(&employees[i]).Update("employee_code", code).Error; err != nil {
			return err
		}
	}
	return nil
}

// BackfillCodes is safe to run repeatedly. Existing codes are preserved while
// legacy hyphenated employee codes are normalized to the compact format.
func BackfillCodes(db *gorm.DB) error {
	// Soft-deleted employees must not reserve reusable display codes.
	if err := db.Unscoped().Model(&models.Employee{}).Where("deleted_at IS NOT NULL").Update("employee_code", nil).Error; err != nil {
		return err
	}
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
	if err := db.Preload("User").Order("id asc").Find(&employees).Error; err != nil {
		return err
	}
	for i := range employees {
		if employees[i].EmployeeCode != "" {
			normalized := strings.ReplaceAll(employees[i].EmployeeCode, "-", "")
			if normalized != employees[i].EmployeeCode {
				if err := db.Model(&employees[i]).Update("employee_code", normalized).Error; err != nil {
					return err
				}
			}
			continue
		}
		if err := AssignEmployeeCode(db, &employees[i], employees[i].User.Role); err != nil {
			return err
		}
	}
	return nil
}

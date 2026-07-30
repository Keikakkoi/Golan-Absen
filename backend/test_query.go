package main

import (
	"fmt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	dsn := "host=localhost user=postgres password=postgres dbname=absensi_golan port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		fmt.Println("Error opening db:", err)
		return
	}
	type WorkSchedule struct {
		ID         int
		EmployeeID *int
		Tanggal    *string
		NamaShift  string
		JamMulai   string
		JamSelesai string
	}
	
	// Test normal Where
	var s1 []WorkSchedule
	err = db.Where("employee_id = ? AND tanggal = ?", 6, "2026-07-30").Find(&s1).Error
	fmt.Printf("1. Normal Error: %v, count: %d\n", err, len(s1))

	// Test DATE(tanggal)
	var s2 []WorkSchedule
	err = db.Where("employee_id = ? AND DATE(tanggal) = ?", 6, "2026-07-30").Find(&s2).Error
	fmt.Printf("2. DATE() Error: %v, count: %d\n", err, len(s2))
    
    // Test tanggal::date
	var s3 []WorkSchedule
	err = db.Where("employee_id = ? AND tanggal::date = ?", 6, "2026-07-30").Find(&s3).Error
	fmt.Printf("3. ::date Error: %v, count: %d\n", err, len(s3))
}

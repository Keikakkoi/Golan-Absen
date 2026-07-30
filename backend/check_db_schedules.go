package main

import (
	"fmt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func main() {
	db, err := gorm.Open(sqlite.Open(`c:\laragon\www\Absensi Golan\backend\absensi.db`), &gorm.Config{})
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
	var schedules []WorkSchedule
	db.Find(&schedules)
	for _, s := range schedules {
		var t string
		if s.Tanggal != nil {
			t = *s.Tanggal
		}
		var e int
		if s.EmployeeID != nil {
			e = *s.EmployeeID
		}
		fmt.Printf("ID: %d, EmpID: %d, Tanggal: %s, Nama: %s, Jam: %s - %s\n", s.ID, e, t, s.NamaShift, s.JamMulai, s.JamSelesai)
	}
}

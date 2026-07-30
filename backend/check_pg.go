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

    type Employee struct {
		ID int
		UserID int
		NIK string
	}
	var emps []Employee
	db.Find(&emps)
	fmt.Println("Employees:")
	for _, e := range emps {
		fmt.Printf("ID: %d, UserID: %d, NIK: %s\n", e.ID, e.UserID, e.NIK)
	}

    type User struct {
		ID int
		Nama string
		Email string
	}
	var users []User
	db.Find(&users)
	fmt.Println("Users:")
	for _, u := range users {
		fmt.Printf("ID: %d, Nama: %s, Email: %s\n", u.ID, u.Nama, u.Email)
	}
}

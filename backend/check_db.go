package main

import (
	"log"
	"fmt"
	"absensi-golan-backend/config"
)

func main() {
	cfg := config.LoadConfig()
	config.ConnectDB(cfg)
	db := config.DB

	// Drop constraint
	err := db.Exec("ALTER TABLE employees DROP CONSTRAINT IF EXISTS fk_departments_employees").Error
	if err != nil {
		log.Printf("Error dropping constraint: %v", err)
	} else {
		log.Println("Constraint fk_departments_employees dropped (or did not exist).")
	}

	// List constraints on employees
	var constraints []string
	db.Raw(`SELECT conname FROM pg_constraint WHERE conrelid = 'employees'::regclass`).Scan(&constraints)
	fmt.Printf("Constraints on employees table: %v\n", constraints)
}

package handlers

import (
	"absensi-golan-backend/internal/models"
	"time"
)

const (
	delegationScheduled = "scheduled"
	delegationActive    = "active"
	delegationCancelled = "cancelled"
)

func dateOnly(value time.Time) time.Time {
	return time.Date(value.Year(), value.Month(), value.Day(), 0, 0, 0, 0, value.Location())
}

func periodsOverlap(aStart, aEnd, bStart, bEnd time.Time) bool {
	return !dateOnly(aEnd).Before(dateOnly(bStart)) && !dateOnly(bEnd).Before(dateOnly(aStart))
}

func validDirectManagerCandidate(user models.User, managerID, requesterID uint) bool {
	return user.ID != 0 && user.ID != managerID && user.ID != requesterID && user.Status == "aktif" && (user.Role == models.RoleManajer || user.Role == models.RoleHRD)
}

func validDelegationCandidate(managerID, originalManagerID, delegateID, requesterID uint, delegate models.User) bool {
	return managerID == originalManagerID && delegateID != 0 && delegateID != managerID && delegateID != requesterID && delegate.ID == delegateID && delegate.Status == "aktif" && delegate.Role == models.RoleManajer
}

func delegationIsActiveOn(delegation models.ApprovalDelegation, date time.Time) bool {
	day := dateOnly(date)
	return delegation.Status == delegationActive && !day.Before(dateOnly(delegation.StartDate)) && !day.After(dateOnly(delegation.EndDate))
}

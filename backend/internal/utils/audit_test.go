package utils

import "testing"

func TestLogActionRejectsZeroUserIDBeforeDatabaseWrite(t *testing.T) {
	if err := LogActionWithDB(nil, 0, "CREATE", "LeaveRequest", 1, "test"); err == nil {
		t.Fatal("user_id=0 must be rejected before an audit row can be written")
	}
}

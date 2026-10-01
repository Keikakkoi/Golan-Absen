package handlers

import "testing"

func TestNormalizeRejectionReasonRequiresContent(t *testing.T) {
	if _, err := normalizeRejectionReason(" \t\n"); err == nil {
		t.Fatal("expected whitespace-only rejection reason to be rejected")
	}
}

func TestNormalizeRejectionReasonTrimsAndLimitsLength(t *testing.T) {
	reason, err := normalizeRejectionReason("  Tidak sesuai target.  ")
	if err != nil || reason != "Tidak sesuai target." {
		t.Fatalf("unexpected normalized reason: %q, %v", reason, err)
	}
	if _, err := normalizeRejectionReason(string(make([]rune, maxRejectionReasonLength+1))); err == nil {
		t.Fatal("expected overlong rejection reason to be rejected")
	}
}

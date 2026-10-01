package handlers

import (
	"fmt"
	"strings"
	"unicode/utf8"
)

const maxRejectionReasonLength = 2000

func normalizeRejectionReason(value string) (string, error) {
	reason := strings.TrimSpace(value)
	if reason == "" {
		return "", fmt.Errorf("Alasan penolakan wajib diisi")
	}
	if utf8.RuneCountInString(reason) > maxRejectionReasonLength {
		return "", fmt.Errorf("Alasan penolakan maksimal %d karakter", maxRejectionReasonLength)
	}
	return reason, nil
}

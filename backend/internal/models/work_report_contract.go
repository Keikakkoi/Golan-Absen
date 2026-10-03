package models

import (
	"encoding/json"
	"strings"
)

// WorkReportTitleTaskSeparator is the stable, human-readable separator used
// when the legacy title and task columns are exposed as one canonical field.
// The legacy columns remain untouched; this value is derived or stored in the
// additive judul_tugas column.
const WorkReportTitleTaskSeparator = " — "

// CombineWorkReportTitleTask converts the two legacy text fields into the
// canonical Judul Tugas value without losing either source value.
func CombineWorkReportTitleTask(judul, tugas string) string {
	title := strings.TrimSpace(judul)
	task := strings.TrimSpace(tugas)
	switch {
	case title == "":
		return task
	case task == "":
		return title
	default:
		return title + WorkReportTitleTaskSeparator + task
	}
}

// WorkReportKind identifies the persisted workflow that owns a report. The
// legacy value is intentionally retained so old internship logbooks remain
// readable while the canonical work-report workflow is rolled out.
type WorkReportKind string

const (
	WorkReportKindCanonical     WorkReportKind = "work_report"
	WorkReportKindLegacyLogbook WorkReportKind = "legacy_logbook"
)

type WorkReportWorkflowStatus string

const (
	WorkReportStatusDraft     WorkReportWorkflowStatus = "draft"
	WorkReportStatusSubmitted WorkReportWorkflowStatus = "submitted"
	WorkReportStatusApproved  WorkReportWorkflowStatus = "approved"
	WorkReportStatusRejected  WorkReportWorkflowStatus = "rejected"
	WorkReportStatusNoReport  WorkReportWorkflowStatus = "no_report"
)

const (
	WorkReportNoReportLabel  = "Belum Membuat Laporan Kerja"
	WorkReportNoReportMarker = "tidak membuat laporan kerja"
)

type WorkReportFillingStatus string

const (
	WorkReportFillingDraft     WorkReportFillingStatus = "draft"
	WorkReportFillingSubmitted WorkReportFillingStatus = "submitted"
	WorkReportFillingNoReport  WorkReportFillingStatus = "no_report"
)

type WorkReportReviewStatus string

const (
	WorkReportReviewDraft    WorkReportReviewStatus = "draft"
	WorkReportReviewPending  WorkReportReviewStatus = "pending"
	WorkReportReviewApproved WorkReportReviewStatus = "approved"
	WorkReportReviewRejected WorkReportReviewStatus = "rejected"
	WorkReportReviewNoReport WorkReportReviewStatus = "no_report"
)

type WorkReportSubmissionTiming string

const (
	WorkReportSubmittedOnTime WorkReportSubmissionTiming = "on_time"
	WorkReportSubmittedLate   WorkReportSubmissionTiming = "late"
)

// NormalizeWorkReportFillingStatus keeps the existing API contract: an empty
// value is historical submitted data, while only draft is an editable draft.
func NormalizeWorkReportFillingStatus(value string) WorkReportFillingStatus {
	if strings.EqualFold(strings.TrimSpace(value), string(WorkReportFillingDraft)) {
		return WorkReportFillingDraft
	}
	return WorkReportFillingSubmitted
}

// NormalizeLegacyValidationStatus translates the old manager/admin labels to
// the canonical validation vocabulary without changing the stored value.
func NormalizeLegacyValidationStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "minta perbaikan", "minta_perbaikan", "minta-perbaikan":
		return "Tidak Sesuai"
	default:
		return value
	}
}

func workReportEffectiveKind(w WorkReport) WorkReportKind {
	if w.ReportKind != "" {
		return w.ReportKind
	}
	if w.Employee.User != nil && w.Employee.User.Role == RoleMagang && strings.TrimSpace(w.StatusLogbook) != "" {
		return WorkReportKindLegacyLogbook
	}
	return WorkReportKindCanonical
}

func nonEmptyJSON(value string) bool {
	if strings.TrimSpace(value) == "" {
		return false
	}
	var parsed interface{}
	if json.Unmarshal([]byte(value), &parsed) != nil {
		return true
	}
	switch typed := parsed.(type) {
	case map[string]interface{}:
		for _, value := range typed {
			if nonEmptyJSONValue(value) {
				return true
			}
		}
		return false
	case []interface{}:
		for _, value := range typed {
			if nonEmptyJSONValue(value) {
				return true
			}
		}
		return false
	default:
		return strings.TrimSpace(value) != "null"
	}
}

func nonEmptyJSONValue(value interface{}) bool {
	switch typed := value.(type) {
	case nil:
		return false
	case string:
		return strings.TrimSpace(typed) != ""
	case map[string]interface{}:
		for _, nested := range typed {
			if nonEmptyJSONValue(nested) {
				return true
			}
		}
		return false
	case []interface{}:
		for _, nested := range typed {
			if nonEmptyJSONValue(nested) {
				return true
			}
		}
		return false
	default:
		return true
	}
}

// IsWorkReportNoReport is the single backend predicate for the canonical
// no-report state. It only derives a response state; it never changes legacy
// columns or persisted report data.
func IsWorkReportNoReport(w WorkReport) bool {
	if w.Status == WorkReportStatusNoReport || w.FillingStatus == WorkReportFillingNoReport || w.ReviewStatus == WorkReportReviewNoReport {
		return true
	}
	if strings.EqualFold(strings.TrimSpace(w.StatusSesuai), WorkReportNoReportMarker) {
		return true
	}
	return strings.TrimSpace(w.JudulTugas) == "" &&
		strings.TrimSpace(w.Judul) == "" &&
		strings.TrimSpace(w.Tugas) == "" &&
		strings.TrimSpace(w.DeskripsiKegiatan) == "" &&
		strings.TrimSpace(w.RealisasiKegiatan) == "" &&
		strings.TrimSpace(w.Kendala) == "" &&
		strings.TrimSpace(w.RencanaMingguDepan) == "" &&
		strings.TrimSpace(w.LinkArtikel) == "" &&
		strings.TrimSpace(w.CatatanTambahan) == "" &&
		!nonEmptyJSON(w.CustomFields) &&
		len(w.Attachments) == 0
}

// CanonicalWorkReportStatus maps persisted and compatibility representations
// to one workflow status. no_report always wins over draft/submitted/review.
func CanonicalWorkReportStatus(w WorkReport) WorkReportWorkflowStatus {
	if IsWorkReportNoReport(w) {
		return WorkReportStatusNoReport
	}

	if workReportEffectiveKind(w) == WorkReportKindLegacyLogbook {
		switch strings.ToLower(strings.TrimSpace(w.StatusLogbook)) {
		case "draft":
			return WorkReportStatusDraft
		case "approved":
			return WorkReportStatusApproved
		case "rejected":
			return WorkReportStatusRejected
		default:
			return WorkReportStatusSubmitted
		}
	}

	if strings.EqualFold(strings.TrimSpace(w.StatusLaporan), string(WorkReportStatusDraft)) {
		return WorkReportStatusDraft
	}
	switch strings.ToLower(strings.TrimSpace(NormalizeLegacyValidationStatus(w.StatusSesuai))) {
	case "sesuai":
		return WorkReportStatusApproved
	case "tidak sesuai", "ditolak", "minta perbaikan", "minta_perbaikan":
		return WorkReportStatusRejected
	default:
		return WorkReportStatusSubmitted
	}
}

// NormalizeContract adds the canonical response contract. It is deliberately
// additive: legacy columns and their raw values remain available for history
// and for clients that still use the old internship endpoint.
func (w *WorkReport) NormalizeContract() {
	if strings.TrimSpace(w.JudulTugas) == "" {
		w.JudulTugas = CombineWorkReportTitleTask(w.Judul, w.Tugas)
	}
	kind := workReportEffectiveKind(*w)
	w.ReportKind = kind
	canonicalStatus := CanonicalWorkReportStatus(*w)
	if canonicalStatus == WorkReportStatusNoReport {
		w.Status = WorkReportStatusNoReport
		w.FillingStatus = WorkReportFillingNoReport
		w.ReviewStatus = WorkReportReviewNoReport
		if kind == WorkReportKindLegacyLogbook {
			w.LegacyStatusLogbook = w.StatusLogbook
		}
		if w.IsLateSubmission {
			w.SubmissionTiming = WorkReportSubmittedLate
		} else {
			w.SubmissionTiming = WorkReportSubmittedOnTime
		}
		return
	}

	if kind == WorkReportKindLegacyLogbook {
		raw := strings.ToLower(strings.TrimSpace(w.StatusLogbook))
		w.LegacyStatusLogbook = w.StatusLogbook
		w.FillingStatus = NormalizeWorkReportFillingStatus(w.StatusLogbook)
		switch raw {
		case "approved":
			w.Status = WorkReportStatusApproved
			w.ReviewStatus = WorkReportReviewApproved
		case "rejected":
			w.Status = WorkReportStatusRejected
			w.ReviewStatus = WorkReportReviewRejected
		case "draft":
			w.Status = WorkReportStatusDraft
			w.ReviewStatus = WorkReportReviewDraft
		default:
			w.Status = WorkReportStatusSubmitted
			w.ReviewStatus = WorkReportReviewPending
		}
	} else {
		w.FillingStatus = NormalizeWorkReportFillingStatus(w.StatusLaporan)
		if w.FillingStatus == WorkReportFillingDraft {
			w.Status = WorkReportStatusDraft
			w.ReviewStatus = WorkReportReviewDraft
		} else {
			w.Status = WorkReportStatusSubmitted
			validation := strings.ToLower(strings.TrimSpace(NormalizeLegacyValidationStatus(w.StatusSesuai)))
			switch validation {
			case "sesuai":
				w.Status = WorkReportStatusApproved
				w.ReviewStatus = WorkReportReviewApproved
			case "tidak sesuai":
				w.Status = WorkReportStatusRejected
				w.ReviewStatus = WorkReportReviewRejected
			default:
				w.ReviewStatus = WorkReportReviewPending
			}
		}
	}

	if w.IsLateSubmission {
		w.SubmissionTiming = WorkReportSubmittedLate
	} else {
		w.SubmissionTiming = WorkReportSubmittedOnTime
	}
}

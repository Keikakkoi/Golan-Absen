package handlers

import (
	"fmt"
	"log"
	"math"
	"os"
	"strconv"
	"strings"

	"absensi-golan-backend/pkg/utils"
)

const (
	// Accuracy is advisory. A device can report a large uncertainty while its
	// best-known coordinate is still inside the configured geofence. Keep only
	// an upper sanity limit for malformed/unusable readings.
	maxAcceptedGPSAccuracyMeters = 1000.0
	maxAccuracyAllowanceMeters   = 50.0
)

func parseAttendanceLocation(latText, lonText, accuracyText string) (float64, float64, float64, error) {
	lat, latErr := strconv.ParseFloat(strings.TrimSpace(latText), 64)
	lon, lonErr := strconv.ParseFloat(strings.TrimSpace(lonText), 64)
	accuracy, accuracyErr := strconv.ParseFloat(strings.TrimSpace(accuracyText), 64)
	if latErr != nil || lonErr != nil || accuracyErr != nil || math.IsNaN(lat) || math.IsNaN(lon) || math.IsNaN(accuracy) {
		return 0, 0, 0, fmt.Errorf("koordinat dan akurasi GPS wajib berupa angka yang valid")
	}
	if lat < -90 || lat > 90 || lon < -180 || lon > 180 || (lat == 0 && lon == 0) {
		return 0, 0, 0, fmt.Errorf("koordinat GPS berada di luar rentang yang valid")
	}
	if accuracy < 0 || accuracy > maxAcceptedGPSAccuracyMeters {
		return 0, 0, 0, fmt.Errorf("akurasi GPS terlalu rendah (%.0f m). Aktifkan GPS perangkat dan coba lagi", accuracy)
	}
	return lat, lon, accuracy, nil
}

// GPS accuracy is an uncertainty radius, not a reason to accept an unlimited
// distance. A small capped allowance avoids rejecting users at a geofence edge
// while keeping a hard upper bound for the server-side decision.
func locationWithinRadius(distance, radius, accuracy float64) bool {
	allowance := math.Min(math.Max(accuracy, 0), maxAccuracyAllowanceMeters)
	return distance <= radius+allowance
}

func logLocationValidation(kind string, lat, lon, accuracy, refLat, refLon, distance, radius float64) {
	if os.Getenv("DEBUG_GEOLOCATION") != "1" {
		return
	}
	log.Printf("geolocation validation kind=%s lat=%.6f lon=%.6f accuracy_m=%.1f ref_lat=%.6f ref_lon=%.6f distance_m=%.1f radius_m=%.1f", kind, lat, lon, accuracy, refLat, refLon, distance, radius)
}

func logLocationMetadata(timestamp, source string) {
	if os.Getenv("DEBUG_GEOLOCATION") != "1" {
		return
	}
	log.Printf("geolocation metadata timestamp=%q source=%q", timestamp, source)
}

func validateCoordinatesAgainstRadius(kind string, lat, lon, accuracy, refLat, refLon, radius float64) bool {
	distance := utils.HaversineDistance(lat, lon, refLat, refLon)
	logLocationValidation(kind, lat, lon, accuracy, refLat, refLon, distance, radius)
	return locationWithinRadius(distance, radius, accuracy)
}

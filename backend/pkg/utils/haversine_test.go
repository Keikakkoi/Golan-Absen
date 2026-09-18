package utils

import "testing"

func TestHaversineDistanceUsesLatitudeLongitudeOrderAndMeters(t *testing.T) {
	if got := HaversineDistance(-6.200000, 106.800000, -6.200000, 106.800000); got != 0 {
		t.Fatalf("same point distance = %v, want 0", got)
	}
	got := HaversineDistance(-6.200000, 106.800000, -6.201000, 106.800000)
	if got < 100 || got > 120 {
		t.Fatalf("one thousandth latitude distance = %.1f m, want about 111 m", got)
	}
	// Swapping the axes produces a very different point; this guards against
	// accidentally changing the public (lat, lon) contract.
	swapped := HaversineDistance(106.800000, -6.200000, 106.800000, -6.201000)
	if swapped >= got {
		t.Fatalf("swapped coordinates were not treated differently: normal=%.1f swapped=%.1f", got, swapped)
	}
}

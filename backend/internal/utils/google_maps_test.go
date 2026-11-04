package utils

import "testing"

func TestResolveGoogleMapsLocationURLExtractsFullURL(t *testing.T) {
	latitude, longitude, err := ResolveGoogleMapsLocationURL("https://www.google.com/maps/@-6.2,106.8,17z")
	if err != nil || latitude != -6.2 || longitude != 106.8 {
		t.Fatalf("expected full Google Maps coordinates, got latitude=%v longitude=%v err=%v", latitude, longitude, err)
	}
}

func TestResolveGoogleMapsLocationURLRejectsNonGoogleHost(t *testing.T) {
	if _, _, err := ResolveGoogleMapsLocationURL("https://example.com/maps/@-6.2,106.8,17z"); err == nil {
		t.Fatal("expected non-Google host to be rejected")
	}
}

package utils

import "testing"

func TestCoordinatesFromText(t *testing.T) {
	tests := []struct {
		name string
		text string
		lat  float64
		lng  float64
	}{
		{"whatsapp query", "https://www.google.com/maps?q=-6.123165,106.8068848&z=17", -6.123165, 106.8068848},
		{"maps at URL", "https://www.google.com/maps/@-6.136949,106.699001,17z", -6.136949, 106.699001},
		{"maps data URL", "https://www.google.com/maps/data=!3m1!4b1!3d-6.136949!4d106.699001", -6.136949, 106.699001},
		{"encoded query", "https://www.google.com/maps?q=-6.123165%2C106.8068848", -6.123165, 106.8068848},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lat, lng, ok := coordinatesFromText(tt.text)
			if !ok || lat != tt.lat || lng != tt.lng {
				t.Fatalf("coordinatesFromText() = %v, %v, %v; want %v, %v, true", lat, lng, ok, tt.lat, tt.lng)
			}
		})
	}
}

package handlers

import (
	"testing"

	"image"
)

func TestValidateProfilePhotoDimensions(t *testing.T) {
	tests := []struct {
		name  string
		value interface{}
		valid bool
	}{
		{name: "portrait 3x4", value: image.Config{Width: 300, Height: 400}, valid: true},
		{name: "portrait non 3x4", value: image.Config{Width: 301, Height: 400}, valid: false},
		{name: "landscape", value: image.Config{Width: 400, Height: 300}, valid: false},
		{name: "not an image", value: []byte("not an image"), valid: false},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := validateProfilePhotoDimensions(test.value)
			if (err == nil) != test.valid {
				t.Fatalf("valid=%v, got error %v", test.valid, err)
			}
			if test.name == "portrait non 3x4" && (err == nil || err.Error() != "Pas foto harus memiliki ukuran 3x4.") {
				t.Fatalf("unexpected validation message: %v", err)
			}
		})
	}
}

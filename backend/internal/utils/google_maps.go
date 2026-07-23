package utils

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"
)

var (
	googleMapsAtPattern    = regexp.MustCompile(`@(-?[0-9]+(?:\.[0-9]+)?),(-?[0-9]+(?:\.[0-9]+)?)`)
	googleMapsBangPattern  = regexp.MustCompile(`!3d(-?[0-9]+(?:\.[0-9]+)?)!4d(-?[0-9]+(?:\.[0-9]+)?)`)
	googleMapsQueryPattern = regexp.MustCompile(`(?:^|[?&])(q|query|ll|destination)=(-?[0-9]+(?:\.[0-9]+)?)[,%20]+(-?[0-9]+(?:\.[0-9]+)?)`)
)

// ResolveGoogleMapsLocationURL extracts the pin coordinates from a Google Maps
// URL. It also follows maps.app.goo.gl short links, which do not contain the
// coordinates until Google redirects them to the full Maps URL.
func ResolveGoogleMapsLocationURL(rawURL string) (float64, float64, error) {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return 0, 0, fmt.Errorf("link Google Maps wajib diisi")
	}

	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Scheme != "https" && parsed.Scheme != "http" || !isAllowedGoogleMapsHost(parsed.Hostname()) {
		return 0, 0, fmt.Errorf("gunakan link Google Maps yang valid")
	}

	if lat, lng, ok := coordinatesFromText(rawURL); ok {
		return lat, lng, nil
	}

	client := &http.Client{
		Timeout: 12 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 6 || !isAllowedGoogleMapsHost(req.URL.Hostname()) {
				return http.ErrUseLastResponse
			}
			return nil
		},
	}
	response, err := client.Get(rawURL)
	if err != nil {
		return 0, 0, fmt.Errorf("link Google Maps tidak dapat dibuka; pastikan link dapat diakses server")
	}
	defer response.Body.Close()

	if lat, lng, ok := coordinatesFromText(response.Request.URL.String()); ok {
		return lat, lng, nil
	}

	// Google sometimes leaves the coordinates in the redirect page rather than
	// in the final URL. Read a bounded amount so a large page cannot be stored.
	body, _ := io.ReadAll(io.LimitReader(response.Body, 2*1024*1024))
	if lat, lng, ok := coordinatesFromText(string(body)); ok {
		return lat, lng, nil
	}

	return 0, 0, fmt.Errorf("link Google Maps tidak berisi titik lokasi; salin link setelah memilih pin rumah")
}

func isAllowedGoogleMapsHost(host string) bool {
	host = strings.ToLower(strings.TrimPrefix(host, "www."))
	return host == "maps.app.goo.gl" || host == "goo.gl" || host == "google.com" ||
		host == "google.co.id" || host == "maps.google.com" || strings.HasSuffix(host, ".google.com") || strings.HasSuffix(host, ".google.co.id")
}

func coordinatesFromText(text string) (float64, float64, bool) {
	text = strings.ReplaceAll(text, `\u0026`, "&")
	text = strings.ReplaceAll(text, `&amp;`, "&")
	patterns := []*regexp.Regexp{googleMapsAtPattern, googleMapsBangPattern, googleMapsQueryPattern}
	for _, pattern := range patterns {
		match := pattern.FindStringSubmatch(text)
		if len(match) < 3 {
			continue
		}
		lat, latErr := strconv.ParseFloat(match[len(match)-2], 64)
		lng, lngErr := strconv.ParseFloat(match[len(match)-1], 64)
		if latErr == nil && lngErr == nil && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat != 0 || lng != 0) {
			return lat, lng, true
		}
	}

	if decoded, err := url.QueryUnescape(text); err == nil && decoded != text {
		return coordinatesFromText(decoded)
	}
	return 0, 0, false
}

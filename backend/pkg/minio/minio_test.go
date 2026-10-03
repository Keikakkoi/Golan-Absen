package minio

import "testing"

func TestObjectURLUsesPublicStorageURL(t *testing.T) {
	oldPublicURL, oldBucket, oldEndpoint := PublicURL, BucketName, currentEndpoint
	defer func() { PublicURL, BucketName, currentEndpoint = oldPublicURL, oldBucket, oldEndpoint }()

	PublicURL = "https://absen-golan.skyxserver.online/storage"
	BucketName = "golan-attendance"
	currentEndpoint = "minio:9000"

	got := ObjectURL("NIK-checkin-123.jpg")
	want := "https://absen-golan.skyxserver.online/storage/golan-attendance/NIK-checkin-123.jpg"
	if got != want {
		t.Fatalf("ObjectURL() = %q, want %q", got, want)
	}
}

func TestRewriteObjectURLConvertsLegacyInternalEndpoints(t *testing.T) {
	oldPublicURL, oldEndpoint := PublicURL, currentEndpoint
	defer func() { PublicURL, currentEndpoint = oldPublicURL, oldEndpoint }()

	PublicURL = "https://absen-golan.skyxserver.online/storage"
	currentEndpoint = "minio:9000"
	want := "https://absen-golan.skyxserver.online/storage/golan-attendance/legacy.jpg"

	for _, raw := range []string{
		"http://minio:9000/golan-attendance/legacy.jpg",
		"http://localhost:9000/golan-attendance/legacy.jpg",
		"http://127.0.0.1:9000/golan-attendance/legacy.jpg",
	} {
		if got := RewriteObjectURL(raw); got != want {
			t.Errorf("RewriteObjectURL(%q) = %q, want %q", raw, got, want)
		}
	}
}

func TestRewriteObjectURLLeavesExternalURLUnchanged(t *testing.T) {
	oldPublicURL, oldEndpoint := PublicURL, currentEndpoint
	defer func() { PublicURL, currentEndpoint = oldPublicURL, oldEndpoint }()

	PublicURL = "https://absen-golan.skyxserver.online/storage"
	currentEndpoint = "minio:9000"
	raw := "https://cdn.example.com/golan-attendance/photo.jpg"
	if got := RewriteObjectURL(raw); got != raw {
		t.Fatalf("RewriteObjectURL(%q) = %q, want unchanged", raw, got)
	}
}

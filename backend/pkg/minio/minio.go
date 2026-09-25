package minio

import (
	"context"
	"log"
	"strings"

	"absensi-golan-backend/config"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

var Client *minio.Client
var BucketName string
var PublicURL string

func SetupMinIO(cfg *config.Config) {
	var err error
	Client, err = minio.New(cfg.MinIOEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinIORootUser, cfg.MinIORootPassword, ""),
		Secure: cfg.MinIOUseSSL,
	})
	if err != nil {
		log.Fatalf("Failed to initialize MinIO client: %v", err)
	}

	BucketName = cfg.MinIOBucketName
	PublicURL = strings.TrimRight(cfg.MinIOPublicURL, "/")
	currentEndpoint = cfg.MinIOEndpoint
	ctx := context.Background()
	err = Client.MakeBucket(ctx, BucketName, minio.MakeBucketOptions{Region: "us-east-1"})
	if err != nil {
		// Check to see if we already own this bucket
		exists, errBucketExists := Client.BucketExists(ctx, BucketName)
		if errBucketExists == nil && exists {
			log.Printf("MinIO bucket %s already exists\n", BucketName)
		} else {
			log.Fatalf("Failed to create MinIO bucket: %v", err)
		}
	} else {
		log.Printf("Successfully created MinIO bucket %s\n", BucketName)
	}

	// Make bucket public (read-only) for serving images directly
	policy := `{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:GetObject"],"Resource":["arn:aws:s3:::` + BucketName + `/*"]}]}`
	err = Client.SetBucketPolicy(ctx, BucketName, policy)
	if err != nil {
		log.Printf("Warning: Failed to set public policy on bucket: %v", err)
	}
}

// ObjectURL returns a browser-facing URL when MINIO_PUBLIC_URL is configured.
// It falls back to the internal endpoint for local development.
func ObjectURL(key string) string {
	base := PublicURL
	if base == "" {
		base = "http://" + currentEndpoint
	}
	return strings.TrimRight(base, "/") + "/" + BucketName + "/" + strings.TrimLeft(key, "/")
}

var currentEndpoint string

// RewriteObjectURL makes URLs stored before MINIO_PUBLIC_URL was configured
// usable by browsers without requiring a database rewrite.
func RewriteObjectURL(raw string) string {
	if raw == "" || PublicURL == "" || currentEndpoint == "" {
		return raw
	}
	for _, scheme := range []string{"http://", "https://"} {
		prefix := scheme + currentEndpoint
		if strings.HasPrefix(raw, prefix) {
			return PublicURL + strings.TrimPrefix(raw, prefix)
		}
	}
	return raw
}

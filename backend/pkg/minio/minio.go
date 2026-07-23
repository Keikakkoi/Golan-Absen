package minio

import (
	"context"
	"log"

	"absensi-golan-backend/config"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

var Client *minio.Client
var BucketName string

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

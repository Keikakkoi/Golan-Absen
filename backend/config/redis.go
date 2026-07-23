package config

import (
	"context"
	"fmt"
	"log"

	"github.com/redis/go-redis/v9"
)

var RedisClient *redis.Client
var Ctx = context.Background()

func ConnectRedis() {
	cfg := LoadConfig()
	
	addr := cfg.RedisHost
	if cfg.RedisPort != "" && addr == "localhost" {
		addr = fmt.Sprintf("%s:%s", cfg.RedisHost, cfg.RedisPort)
	}

	RedisClient = redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: cfg.RedisPassword,
		DB:       0,
	})

	_, err := RedisClient.Ping(Ctx).Result()
	if err != nil {
		log.Printf("Warning: Failed to connect to Redis at %s: %v", addr, err)
	} else {
		log.Println("Redis connection established")
	}
}

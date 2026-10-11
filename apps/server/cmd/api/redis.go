package main

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// connectRedis opens the Redis named by a URL such as
// redis://user:password@host:6379/0 (rediss:// for TLS) and checks that it
// answers, so a wrong address stops the boot instead of failing each request.
func connectRedis(url string) (*redis.Client, error) {
	options, err := redis.ParseURL(url)
	if err != nil {
		return nil, err
	}
	client := redis.NewClient(options)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		_ = client.Close()
		return nil, err
	}
	return client, nil
}

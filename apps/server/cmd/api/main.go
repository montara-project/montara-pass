package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"log/slog"
	"os"
	"time"

	"montara-pass/server/internal/app"
	"montara-pass/server/internal/config"
	"montara-pass/server/internal/lib/midtrans"
	"montara-pass/server/internal/repositories"
	"montara-pass/server/internal/seeders"

	"github.com/redis/go-redis/v9"
)

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	var cfg config.Config
	parseFlag(&cfg)

	level := slog.LevelInfo
	if cfg.App.Debug {
		level = slog.LevelDebug
	}
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: level}))
	// The repositories log their queries through the default logger.
	slog.SetDefault(logger)

	// Optional: without it the rate limiter and the idempotency keys live in
	// this process's memory, which is right for a single instance. Checked
	// first, so a wrong address stops the boot before anything is changed.
	var cache redis.UniversalClient
	if cfg.Redis.URL != "" {
		client, err := connectRedis(cfg.Redis.URL)
		if err != nil {
			return fmt.Errorf("connect redis: %w", err)
		}
		defer client.Close()
		cache = client
	}

	if cfg.App.MigrateOnBoot {
		if err := migrateUp(&cfg.DB, logger); err != nil {
			return err
		}
	}

	db, err := connectDB(&cfg.DB)
	if err != nil {
		return fmt.Errorf("connect database: %w", err)
	}
	defer db.Close()

	repos := repositories.New(db)
	mirror := mirrorUser(&repos.User)

	// Creating the instance runs Authula's own migrations.
	auth := newAuth(cfg, mirror, logger)
	defer auth.CloseSystems()
	defer auth.ClosePlugins()

	// Repairs mirror rows a failed hook left missing or stale.
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	err = repos.User.Reconcile(ctx)
	cancel()
	if err != nil {
		return fmt.Errorf("reconcile users mirror: %w", err)
	}

	// The Community Edition's only account is the super user. A database that
	// holds others (one the Enterprise Edition ran on) would still let them
	// sign in and see what was shared with them, so it is refused, and before
	// seeding, which would otherwise reset that database's super user password.
	if config.Community() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		others, err := repos.User.HasOtherThan(ctx, cfg.App.SuperUserEmail)
		cancel()
		if err != nil {
			return fmt.Errorf("check community edition accounts: %w", err)
		}
		if others {
			return errors.New("community edition allows only the super user, but the database holds other accounts: run the enterprise edition on it, or start from an empty database")
		}
	}

	// Seeding follows Authula because the super user is created through it.
	if cfg.App.SeedOnBoot {
		superUser := seeders.SuperUserSeeder{
			DB:       db,
			Auth:     auth.CoreServices(),
			Promote:  promoteSuperUser(&repos.User, mirror),
			Email:    cfg.App.SuperUserEmail,
			Password: cfg.App.SuperUserPassword,
		}
		if err := seedAll(db, superUser, logger); err != nil {
			return err
		}
	}

	var payments *midtrans.Client
	switch {
	case config.Community():
	case cfg.Billing.MidtransServerKey == "":
		logger.Warn("billing checkout disabled: midtrans-server-key is not set")
	default:
		payments = midtrans.New(cfg.Billing.MidtransServerKey, cfg.Billing.MidtransProduction)
	}

	return serve(&app.Application{
		Config:       cfg,
		Logger:       logger,
		DB:           db,
		Repositories: repos,
		Auth:         auth,
		Redis:        cache,
		Midtrans:     payments,
	})
}

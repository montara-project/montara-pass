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
	"montara-pass/server/internal/emails"
	"montara-pass/server/internal/handlers"
	"montara-pass/server/internal/lib/lemonsqueezy"
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

	var payments *lemonsqueezy.Client
	switch {
	case config.Community():
	case cfg.Billing.LemonSqueezyAPIKey == "":
		logger.Warn("billing checkout disabled: lemonsqueezy-api-key is not set")
	default:
		// Reading the store checks the key and the store id now, and gives
		// the currency every plan must be priced in.
		payments = lemonsqueezy.New(cfg.Billing.LemonSqueezyAPIKey, cfg.Billing.LemonSqueezyStoreID, cfg.Billing.LemonSqueezyWebhookSecret)
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		err := payments.Load(ctx)
		cancel()
		if err != nil {
			return fmt.Errorf("load lemon squeezy store: %w", err)
		}
		logger.Info("billing through lemon squeezy", "store", cfg.Billing.LemonSqueezyStoreID, "currency", payments.Currency)
	}

	application := &app.Application{
		Config:       cfg,
		Logger:       logger,
		DB:           db,
		Repositories: repos,
		Redis:        cache,
		Payments:     payments,
	}

	// Authula reads its email templates when it is built.
	if err := emails.Install(); err != nil {
		return fmt.Errorf("install email templates: %w", err)
	}

	// Creating the instance runs Authula's own migrations.
	auth := newAuth(cfg, mirror, saveCustomer(application), logger)
	application.Auth = auth
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
	// holds others (one the Cloud Edition ran on) would still let them
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
			return errors.New("community edition allows only the super user, but the database holds other accounts: run the cloud edition on it, or start from an empty database")
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
		logger.Info("seeding the super user")
		if err := superUser.Seed(); err != nil {
			return fmt.Errorf("seed super user: %w", err)
		}
	}

	// Lemon Squeezy's catalog is read before serving, so the plans on offer
	// are the store's from the first request, then again every
	// catalogSyncInterval: the store sends nothing when it changes.
	if application.Payments != nil {
		ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
		err := handlers.SyncCatalog(ctx, application)
		cancel()
		if err != nil {
			return fmt.Errorf("sync lemon squeezy catalog: %w", err)
		}
		go syncCatalogEvery(application, catalogSyncInterval)
	}

	return serve(application)
}

// catalogSyncInterval is how often the plans follow the Lemon Squeezy
// catalog; a super user who just changed it syncs at once (POST /plans/sync).
const catalogSyncInterval = 15 * time.Minute

// syncCatalogEvery syncs the catalog every interval, for as long as the
// process runs.
// ponytail: every replica syncs on its own clock; the sync is idempotent, so
// only the Lemon Squeezy requests repeat.
func syncCatalogEvery(application *app.Application, interval time.Duration) {
	for range time.Tick(interval) {
		ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
		if err := handlers.SyncCatalog(ctx, application); err != nil {
			application.Logger.Warn("sync lemon squeezy catalog", "error", err)
		}
		cancel()
	}
}

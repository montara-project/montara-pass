package main

import (
	"database/sql"
	"errors"
	"fmt"
	"log/slog"

	"github.com/golang-migrate/migrate/v4"

	"montara-pass/server/internal/config"
	"montara-pass/server/internal/lib"
	"montara-pass/server/internal/seeders"
)

func connectDB(cfg *config.ConfigDB) (*sql.DB, error) {
	db, err := lib.OpenDB(cfg.DSN)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(cfg.MaxOpenConns)
	db.SetMaxIdleConns(cfg.MaxIdleConns)
	db.SetConnMaxIdleTime(cfg.MaxIdleTime)
	return db, nil
}

// repairHint explains how to clear a dirty schema. golang-migrate marks the
// version it was attempting dirty before it runs, so that number is the failed
// migration and the last one that fully applied is one below it; forcing to the
// failed number itself would skip that migration. Below the first migration
// nothing has been applied yet, which golang-migrate writes as -1. flag picks
// the track to force: empty for the main one, "--ee " for the Cloud
// Edition's.
func repairHint(failed uint, flag string) string {
	repair := int(failed) - 1
	if repair < 1 {
		repair = -1
	}
	return fmt.Sprintf(
		"migration %d failed and left the schema dirty; fix the cause, then run "+
			"`go run ./cmd/migrate %sforce %d` and start again",
		failed, flag, repair)
}

// migrateUp applies the pending migrations, then, unless this is the
// Community Edition, the Cloud Edition's own.
func migrateUp(cfg *config.ConfigDB, logger *slog.Logger) error {
	if err := migrateTrack(cfg, logger, lib.NewMigrator, ""); err != nil {
		return err
	}
	if config.Community() {
		return nil
	}
	return migrateTrack(cfg, logger, lib.NewEEMigrator, "--ee ")
}

// migrateTrack applies one track's pending migrations on a dedicated
// connection, because closing the migrator also closes the *sql.DB it was
// given. flag is the track's repairHint flag.
func migrateTrack(cfg *config.ConfigDB, logger *slog.Logger, newMigrator func(*sql.DB) (*migrate.Migrate, error), flag string) error {
	db, err := connectDB(&config.ConfigDB{DSN: cfg.DSN, MaxOpenConns: 1, MaxIdleConns: 1})
	if err != nil {
		return fmt.Errorf("connect for migrations: %w", err)
	}

	m, err := newMigrator(db)
	if err != nil {
		_ = db.Close()
		return err
	}
	defer m.Close()

	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		// A failed migration leaves the row dirty, so report the repair
		// alongside the original cause instead of the bare driver error.
		if version, dirty, verr := m.Version(); verr == nil && dirty {
			return fmt.Errorf("%s: %w", repairHint(version, flag), err)
		}
		var dirty migrate.ErrDirty
		if errors.As(err, &dirty) {
			return fmt.Errorf("%s: %w", repairHint(uint(dirty.Version), flag), err)
		}
		return fmt.Errorf("apply migrations: %w", err)
	}

	version, dirty, err := m.Version()
	if err != nil && !errors.Is(err, migrate.ErrNilVersion) {
		return fmt.Errorf("read schema version: %w", err)
	}
	if dirty {
		return errors.New(repairHint(version, flag))
	}

	logger.Info("database schema up to date", "version", version, "ee", flag != "")
	return nil
}

// seedAll runs every seeder on the application pool, the super user last.
// Seeders are idempotent.
func seedAll(db *sql.DB, superUser seeders.SuperUserSeeder, logger *slog.Logger) error {
	for _, s := range append(seeders.All(db), superUser) {
		logger.Info("running seeder", "name", s.Name())
		if err := s.Seed(); err != nil {
			return fmt.Errorf("%s seeder: %w", s.Name(), err)
		}
	}
	return nil
}

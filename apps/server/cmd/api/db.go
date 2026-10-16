package main

import (
	"database/sql"
	"errors"
	"fmt"
	"log/slog"

	"github.com/golang-migrate/migrate/v4"

	"montara-pass/server/internal/config"
	"montara-pass/server/internal/lib"
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
// nothing has been applied yet, which golang-migrate writes as -1. track picks
// the one to force: "--cloud " for the Cloud Edition's.
func repairHint(failed uint, track string) string {
	repair := int(failed) - 1
	if repair < 1 {
		repair = -1
	}
	flag := ""
	if track == "cloud" {
		flag = "--cloud "
	}
	return fmt.Sprintf(
		"migration %d failed and left the schema dirty; fix the cause, then run "+
			"`go run ./cmd/migrate %sforce %d` and start again",
		failed, flag, repair)
}

// migrateUp applies the edition's tracks in order.
func migrateUp(cfg *config.ConfigDB, logger *slog.Logger) error {
	for _, track := range lib.Tracks() {
		if err := migrateTrack(cfg, logger, track); err != nil {
			return err
		}
	}
	return nil
}

// migrateTrack applies one track's pending migrations on a dedicated
// connection, because closing the migrator also closes the *sql.DB it was
// given.
func migrateTrack(cfg *config.ConfigDB, logger *slog.Logger, track lib.Track) error {
	db, err := connectDB(&config.ConfigDB{DSN: cfg.DSN, MaxOpenConns: 1, MaxIdleConns: 1})
	if err != nil {
		return fmt.Errorf("connect for migrations: %w", err)
	}

	m, err := track.New(db)
	if err != nil {
		_ = db.Close()
		return err
	}
	defer m.Close()

	// A failed migration leaves the row dirty, as does one that failed before
	// this boot (Up then answers ErrDirty), so report the repair alongside the
	// original cause instead of the bare driver error.
	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		if version, dirty, verr := m.Version(); verr == nil && dirty {
			return fmt.Errorf("%s: %w", repairHint(version, track.Name), err)
		}
		return fmt.Errorf("apply migrations: %w", err)
	}

	version, _, err := m.Version()
	if err != nil && !errors.Is(err, migrate.ErrNilVersion) {
		return fmt.Errorf("read schema version: %w", err)
	}

	logger.Info("database schema up to date", "track", track.Name, "version", version)
	return nil
}

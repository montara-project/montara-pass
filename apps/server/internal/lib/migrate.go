package lib

import (
	"context"
	"database/sql"
	"fmt"
	"io/fs"

	"github.com/golang-migrate/migrate/v4"
	migratepgx "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"

	"montara-pass/server/internal/config"
	"montara-pass/server/migrations"
)

// NewMigrator builds a golang-migrate instance over the embedded SQL files.
//
// Closing the returned migrator also closes db, so callers must pass a
// connection dedicated to migrations rather than the application pool.
func NewMigrator(db *sql.DB) (*migrate.Migrate, error) {
	return newMigrator(db, migrations.FS, ".", "")
}

// NewEEMigrator is NewMigrator over the Cloud Edition's migrations, which
// keep their version in their own table. Run it after NewMigrator's, and roll
// it back before.
func NewEEMigrator(db *sql.DB) (*migrate.Migrate, error) {
	return newMigrator(db, migrations.EE, "ee", eeTable)
}

const eeTable = "schema_migrations_ee"

// Track is one sequence of migrations with its own version table.
type Track struct {
	// Name is "main" or "ee"; cmd/migrate takes --ee for the latter.
	Name string
	New  func(*sql.DB) (*migrate.Migrate, error)
}

var (
	mainTrack = Track{"main", NewMigrator}
	eeTrack   = Track{"ee", NewEEMigrator}
)

// Tracks lists the edition's tracks in the order they apply: the main one,
// then, unless this is the Community Edition, the Cloud Edition's, whose
// tables lean on the main ones.
func Tracks() []Track {
	if config.Community() {
		return []Track{mainTrack}
	}
	return []Track{mainTrack, eeTrack}
}

// CloudLeftover reports the Cloud Edition's track when a Community Edition
// runs on a database the Cloud Edition migrated: its tables lean on the main
// ones, so rolling the main track back has to roll it back first. ok is false
// otherwise. Its version table is looked for rather than opened, since opening
// a migrator creates the table.
func CloudLeftover(ctx context.Context, db *sql.DB) (track Track, ok bool, err error) {
	if !config.Community() {
		return Track{}, false, nil
	}
	err = db.QueryRowContext(ctx, `SELECT to_regclass($1) IS NOT NULL`, eeTable).Scan(&ok)
	return eeTrack, ok, err
}

// newMigrator reads the migrations in dir of fsys. An empty table keeps
// golang-migrate's default, schema_migrations.
func newMigrator(db *sql.DB, fsys fs.FS, dir, table string) (*migrate.Migrate, error) {
	src, err := iofs.New(fsys, dir)
	if err != nil {
		return nil, fmt.Errorf("load embedded migrations: %w", err)
	}

	driver, err := migratepgx.WithInstance(db, &migratepgx.Config{MigrationsTable: table})
	if err != nil {
		return nil, fmt.Errorf("build migration driver: %w", err)
	}

	m, err := migrate.NewWithInstance("iofs", src, "pgx5", driver)
	if err != nil {
		return nil, fmt.Errorf("init migrator: %w", err)
	}

	return m, nil
}

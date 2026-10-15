package main

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strconv"

	"github.com/golang-migrate/migrate/v4"

	appconfig "montara-pass/server/internal/config"
	"montara-pass/server/internal/lib"
	"montara-pass/server/internal/seeders"
)

func main() {
	var cfg config
	parseFlag(&cfg)

	if cfg.mode == modeCreate {
		dir := "migrations"
		if cfg.ee {
			dir = "migrations/ee"
		}
		if err := create(dir, cfg.name); err != nil {
			log.Fatal(err)
		}
		return
	}

	// One migrator per track: the main one, then, unless this is the
	// Community Edition, the Enterprise Edition's, whose tables lean on the
	// main ones. Each owns and closes its own connection.
	tracks := []func(*sql.DB) (*migrate.Migrate, error){lib.NewMigrator}
	if !appconfig.Community() {
		tracks = append(tracks, lib.NewEEMigrator)
	}
	ms := make([]*migrate.Migrate, len(tracks))
	for i, newMigrator := range tracks {
		migrateDB, err := lib.OpenDB(cfg.dbDSN)
		if err != nil {
			log.Fatal(err)
		}
		if ms[i], err = newMigrator(migrateDB); err != nil {
			log.Fatal(err)
		}
		defer ms[i].Close()
	}

	switch cfg.mode {
	case modeUp:
		migrateUp(ms...)
	case modeDown:
		migrateDown(ms...)
	case modeRefresh:
		migrateDown(ms...)
		migrateUp(ms...)
	case modeForce:
		// --ee picks the Enterprise Edition's track; validateFlag refuses it
		// in the Community Edition, which has only the main one.
		target := ms[0]
		if cfg.ee {
			target = ms[1]
		}
		forceVersion(target, cfg.version)
	case modeVersion:
		for i, m := range ms {
			printVersion([]string{"main", "ee"}[i], m)
		}
		return
	}

	if cfg.seed {
		seedDB, err := lib.OpenDB(cfg.dbDSN)
		if err != nil {
			log.Fatal(err)
		}
		defer seedDB.Close()

		// The super user is seeded by the API on boot: it needs Authula.
		execSeeders(seeders.All(seedDB)...)
	}

	fmt.Println("Completed")
}

// migrateUp applies the tracks in order.
func migrateUp(ms ...*migrate.Migrate) {
	fmt.Println("Running up migrations...")
	for _, m := range ms {
		if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
			log.Fatalf("failed to run up migrations: %v", err)
		}
	}
}

// migrateDown rolls the tracks back in reverse order.
func migrateDown(ms ...*migrate.Migrate) {
	fmt.Println("Running down migrations...")
	for i := len(ms) - 1; i >= 0; i-- {
		if err := ms[i].Down(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
			log.Fatalf("failed to run down migrations: %v", err)
		}
	}
}

// forceVersion clears a dirty schema_migrations row. A failed migration leaves
// the version marked dirty and every later run refuses to start, so the flag
// has to be reset by hand once the schema is known to be at that version.
func forceVersion(m *migrate.Migrate, version int) {
	fmt.Printf("Forcing schema version to %d...\n", version)
	if err := m.Force(version); err != nil {
		log.Fatalf("failed to force schema version: %v", err)
	}
}

func printVersion(track string, m *migrate.Migrate) {
	version, dirty, err := m.Version()
	if errors.Is(err, migrate.ErrNilVersion) {
		fmt.Printf("%s: no migrations applied\n", track)
		return
	}
	if err != nil {
		log.Fatalf("failed to read %s schema version: %v", track, err)
	}
	fmt.Printf("%s: version %d (dirty: %t)\n", track, version, dirty)
}

var (
	validName = regexp.MustCompile(`^[a-z0-9_]+$`)
	versionRe = regexp.MustCompile(`^(\d+)_`)
)

// create writes the next sequential NNNNNN_name.{up,down}.sql pair.
func create(dir, name string) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	next := 1
	for _, e := range entries {
		if m := versionRe.FindStringSubmatch(e.Name()); m != nil {
			if v, _ := strconv.Atoi(m[1]); v >= next {
				next = v + 1
			}
		}
	}
	for _, direction := range []string{"up", "down"} {
		p := filepath.Join(dir, fmt.Sprintf("%06d_%s.%s.sql", next, name, direction))
		f, err := os.OpenFile(p, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
		if err != nil {
			return err
		}
		f.Close()
		fmt.Println("created", p)
	}
	return nil
}

func execSeeders(seeders ...seeders.Seeder) {
	for _, seeder := range seeders {
		fmt.Printf("Running %s seeder...\n", seeder.Name())
		if err := seeder.Seed(); err != nil {
			log.Fatalf("%s seeder failed: %v", seeder.Name(), err)
		}
	}
}

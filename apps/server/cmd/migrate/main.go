package main

import (
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strconv"

	"github.com/golang-migrate/migrate/v4"

	"montara-pass/server/internal/lib"
	"montara-pass/server/internal/seeders"
)

func main() {
	var cfg config
	parseFlag(&cfg)

	if cfg.mode == modeCreate {
		if err := create("migrations", cfg.name); err != nil {
			log.Fatal(err)
		}
		return
	}

	// The migrator owns and closes this connection.
	migrateDB, err := lib.OpenDB(cfg.dbDSN)
	if err != nil {
		log.Fatal(err)
	}

	m, err := lib.NewMigrator(migrateDB)
	if err != nil {
		log.Fatal(err)
	}
	defer m.Close()

	switch cfg.mode {
	case modeUp:
		migrateUp(m)
	case modeDown:
		migrateDown(m)
	case modeRefresh:
		migrateDown(m)
		migrateUp(m)
	case modeForce:
		forceVersion(m, cfg.version)
	case modeVersion:
		printVersion(m)
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

func migrateUp(m *migrate.Migrate) {
	fmt.Println("Running up migrations...")
	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		log.Fatalf("failed to run up migrations: %v", err)
	}
}

func migrateDown(m *migrate.Migrate) {
	fmt.Println("Running down migrations...")
	if err := m.Down(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		log.Fatalf("failed to run down migrations: %v", err)
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

func printVersion(m *migrate.Migrate) {
	version, dirty, err := m.Version()
	if errors.Is(err, migrate.ErrNilVersion) {
		fmt.Println("no migrations applied")
		return
	}
	if err != nil {
		log.Fatalf("failed to read schema version: %v", err)
	}
	fmt.Printf("version %d (dirty: %t)\n", version, dirty)
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

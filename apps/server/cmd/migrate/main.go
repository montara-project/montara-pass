package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"time"

	"github.com/golang-migrate/migrate/v4"

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

	// One migrator per track, each on its own connection, which closing it
	// closes too.
	tracks := lib.Tracks()
	if cfg.mode == modeDown || cfg.mode == modeRefresh {
		// A Community Edition database the Cloud Edition once migrated still
		// holds the Cloud tables, which would stop the main track's down
		// midway: roll them back too. refresh brings back only the main one.
		if leftover, ok := cloudLeftover(cfg.dbDSN); ok {
			tracks = append(tracks, leftover)
		}
	}
	ms := make([]*migrate.Migrate, len(tracks))
	for i, track := range tracks {
		migrateDB, err := lib.OpenDB(cfg.dbDSN)
		if err != nil {
			log.Fatal(err)
		}
		if ms[i], err = track.New(migrateDB); err != nil {
			log.Fatal(err)
		}
		defer ms[i].Close()
	}
	up := ms[:len(lib.Tracks())]

	switch cfg.mode {
	case modeUp:
		migrateUp(up...)
	case modeDown:
		migrateDown(ms...)
	case modeRefresh:
		migrateDown(ms...)
		migrateUp(up...)
	case modeForce:
		// validateFlag refuses --ee in the Community Edition, which has only
		// the main track.
		target := ms[0]
		if cfg.ee {
			target = ms[1]
		}
		forceVersion(target, cfg.version)
	case modeVersion:
		for i, m := range ms {
			printVersion(tracks[i].Name, m)
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

// cloudLeftover is lib.CloudLeftover on its own connection.
func cloudLeftover(dsn string) (lib.Track, bool) {
	db, err := lib.OpenDB(dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	track, ok, err := lib.CloudLeftover(ctx, db)
	if err != nil {
		log.Fatalf("look for cloud edition migrations: %v", err)
	}
	return track, ok
}

func execSeeders(seeders ...seeders.Seeder) {
	for _, seeder := range seeders {
		fmt.Printf("Running %s seeder...\n", seeder.Name())
		if err := seeder.Seed(); err != nil {
			log.Fatalf("%s seeder failed: %v", seeder.Name(), err)
		}
	}
}

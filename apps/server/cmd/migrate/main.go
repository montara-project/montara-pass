// Command migrate applies the embedded SQL migrations using golang-migrate.
//
//	go run ./cmd/migrate up          # apply all pending migrations
//	go run ./cmd/migrate down [N]    # roll back N migrations (default 1)
//	go run ./cmd/migrate version     # print current version
//	go run ./cmd/migrate force V     # set version V without running migrations (fix dirty state)
//	go run ./cmd/migrate create NAME # create a new up/down migration pair in ./migrations
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
	pgxmigrate "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	_ "github.com/jackc/pgx/v5/stdlib"

	"github.com/montara-projects/montara-pass/apps/server/internal/config"
	"github.com/montara-projects/montara-pass/apps/server/migrations"
)

const usage = "usage: migrate <up|down [N]|version|force V|create NAME>"

func main() {
	log.SetFlags(0)
	if len(os.Args) < 2 {
		log.Fatal(usage)
	}
	cmd, args := os.Args[1], os.Args[2:]

	// create only touches the filesystem; no database needed.
	if cmd == "create" {
		if len(args) != 1 {
			log.Fatal("usage: migrate create NAME")
		}
		if err := create("migrations", args[0]); err != nil {
			log.Fatal(err)
		}
		return
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	m, closeFn, err := newMigrator(cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer closeFn()

	switch cmd {
	case "up":
		err = m.Up()
	case "down":
		n := 1
		if len(args) > 0 {
			if n, err = strconv.Atoi(args[0]); err != nil || n < 1 {
				log.Fatal("down: N must be a positive integer")
			}
		}
		err = m.Steps(-n)
	case "version":
		v, dirty, verr := m.Version()
		if errors.Is(verr, migrate.ErrNilVersion) {
			fmt.Println("no migrations applied")
			return
		}
		if verr != nil {
			log.Fatal(verr)
		}
		fmt.Printf("version %d (dirty: %t)\n", v, dirty)
		return
	case "force":
		if len(args) != 1 {
			log.Fatal("usage: migrate force V")
		}
		v, perr := strconv.Atoi(args[0])
		if perr != nil {
			log.Fatal("force: V must be an integer")
		}
		err = m.Force(v)
	default:
		log.Fatal(usage)
	}

	if errors.Is(err, migrate.ErrNoChange) {
		fmt.Println("no change")
		return
	}
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(cmd, "ok")
}

func newMigrator(databaseURL string) (*migrate.Migrate, func(), error) {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, nil, err
	}
	driver, err := pgxmigrate.WithInstance(db, &pgxmigrate.Config{})
	if err != nil {
		db.Close()
		return nil, nil, err
	}
	src, err := iofs.New(migrations.FS, ".")
	if err != nil {
		db.Close()
		return nil, nil, err
	}
	m, err := migrate.NewWithInstance("iofs", src, "pgx5", driver)
	if err != nil {
		db.Close()
		return nil, nil, err
	}
	return m, func() { m.Close() }, nil
}

var (
	validName = regexp.MustCompile(`^[a-z0-9_]+$`)
	versionRe = regexp.MustCompile(`^(\d+)_`)
)

// create writes the next sequential NNNNNN_name.{up,down}.sql pair.
func create(dir, name string) error {
	if !validName.MatchString(name) {
		return errors.New("create: NAME must match [a-z0-9_]+")
	}
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
	for _, dirn := range []string{"up", "down"} {
		p := filepath.Join(dir, fmt.Sprintf("%06d_%s.%s.sql", next, name, dirn))
		f, err := os.OpenFile(p, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
		if err != nil {
			return err
		}
		f.Close()
		fmt.Println("created", p)
	}
	return nil
}

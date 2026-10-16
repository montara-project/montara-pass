package main

import (
	"flag"
	"log"
	"net/url"
	"os"
	"slices"
	"strconv"
	"strings"

	"github.com/joho/godotenv"

	appconfig "montara-pass/server/internal/config"
)

const (
	modeUp      = "up"
	modeDown    = "down"
	modeRefresh = "refresh"
	modeForce   = "force"
	modeVersion = "version"
	modeCreate  = "create"
)

type config struct {
	mode        string
	dbDSN       string
	allowRemote bool
	version     int
	name        string
	cloud       bool
}

func parseFlag(cfg *config) {
	// A local .env is loaded if present; real environment variables win.
	_ = godotenv.Load()

	// Defaults to the environment so the DSN, which carries the database
	// password, stays out of the process arguments.
	flag.StringVar(&cfg.dbDSN, "db-dsn", os.Getenv("DB_DSN"), "PostgreSQL DSN (default $DB_DSN)")
	flag.BoolVar(&cfg.allowRemote, "allow-remote", false, "allow down and refresh on a database that is not on localhost")
	flag.BoolVar(&cfg.cloud, "cloud", false, "force and create act on the Cloud Edition's migrations (migrations/cloud)")

	flag.Parse()
	validateFlag(cfg)
}

// isLocalDSN reports whether a URL-style DSN points at this machine. Anything
// it cannot parse counts as remote.
func isLocalDSN(dsn string) bool {
	u, err := url.Parse(dsn)
	if err != nil {
		return false
	}
	return slices.Contains([]string{"localhost", "127.0.0.1", "::1"}, u.Hostname())
}

func validateFlag(cfg *config) {
	cfg.mode = flag.Arg(0)
	availableModes := []string{modeUp, modeDown, modeRefresh, modeForce, modeVersion, modeCreate}

	if !slices.Contains(availableModes, cfg.mode) {
		log.Fatalf("command must be provided: %s", strings.Join(availableModes, ", "))
	}

	// up, down, refresh and version always take every track.
	if cfg.cloud && cfg.mode != modeForce && cfg.mode != modeCreate {
		log.Fatalf("flag --cloud must not be provided when mode is %s", cfg.mode)
	}
	if cfg.cloud && cfg.mode == modeForce && appconfig.Community() {
		log.Fatal("flag --cloud: the community edition has no cloud migrations")
	}

	// create only writes files, so it needs no database.
	if cfg.mode == modeCreate {
		cfg.name = flag.Arg(1)
		if !validName.MatchString(cfg.name) {
			log.Fatal("create needs a migration name matching [a-z0-9_]+, e.g. `create add_something`")
		}
		return
	}

	if cfg.dbDSN == "" {
		log.Fatal("flag --db-dsn or env DB_DSN must be provided")
	}

	// down rolls back every migration, dropping the authula schema with all
	// users and sessions, so it takes an explicit flag off localhost.
	if (cfg.mode == modeDown || cfg.mode == modeRefresh) && !cfg.allowRemote && !isLocalDSN(cfg.dbDSN) {
		log.Fatalf("%s deletes all data and the database is not on localhost; pass --allow-remote to proceed", cfg.mode)
	}

	if cfg.mode == modeForce {
		version, err := strconv.Atoi(flag.Arg(1))
		if err != nil {
			log.Fatal("force needs the schema version to set, e.g. `force 2` (-1 for none)")
		}
		cfg.version = version
	}
}

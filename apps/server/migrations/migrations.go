// Package migrations embeds the golang-migrate SQL files so both cmd/api
// (migrate on boot) and cmd/migrate run them without a filesystem path.
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS

// Cloud holds the Cloud Edition's own tables (billing). They run after FS
// and keep their version apart, in schema_migrations_ee (named before the
// directory was), so a Community Edition database never gets them and one
// that moves to the Cloud Edition gets them on its next migration.
//
//go:embed cloud/*.sql
var Cloud embed.FS

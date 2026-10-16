package seeders

import (
	"context"
	"database/sql"
	"montara-pass/server/internal/lib"
	"time"
)

// runSeed executes fn in one transaction, so a seeder either applies
// completely or not at all.
func runSeed(db *sql.DB, fn func(ctx context.Context, tx *sql.Tx) error) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	return lib.WithTransaction(ctx, db, func(tx *sql.Tx) error {
		// Serializes seeders across processes: replicas seeding on boot at the
		// same time would otherwise both pass the assignment NOT EXISTS check.
		if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtext('montara-pass:seed'))`); err != nil {
			return err
		}
		return fn(ctx, tx)
	})
}

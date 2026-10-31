package repositories

import (
	"context"
	"fmt"
	"time"

	"montara-pass/server/internal/models"

	"github.com/google/uuid"
)

// IPBlockRepository keeps the record of the API's blocked IPs (see
// migrations/000008): what the auto-block did, and what a super user asked
// for by hand. The check itself is the key-value store's; at boot the active
// manual blocks are restored from here into it.
type IPBlockRepository struct {
	BaseRepository
}

const ipBlockColumns = `
	id, created_at, updated_at, ip, source, reason, status, blocked_until, lifted_at`

func ipBlockDest(b *models.IPBlock) []any {
	return []any{&b.ID, &b.CreatedAt, &b.UpdatedAt, &b.IP, &b.Source, &b.Reason, &b.Status, &b.BlockedUntil, &b.LiftedAt}
}

func scanIPBlock(row rowScanner) (models.IPBlock, error) {
	var b models.IPBlock
	err := row.Scan(ipBlockDest(&b)...)
	return b, translateNotFound("ip_blocks", err)
}

var ipBlockSortColumns = map[string]string{"created_at": "created_at", "ip": "ip", "blocked_until": "blocked_until"}

// ExpireStale marks the active blocks whose time is over as expired. A
// block's key runs out in the store by itself; this catches the record up,
// lazily, before the list is read.
func (r *IPBlockRepository) ExpireStale(ctx context.Context) error {
	_, err := r.execContext(ctx, `
		UPDATE ip_blocks SET status = 'expired', updated_at = now()
		WHERE status = 'active' AND blocked_until IS NOT NULL AND blocked_until <= now()`)
	return err
}

// ipBlockWhere narrows a list by one status — every one when status is
// empty — and by a search over the IP and the reason.
func ipBlockWhere(p ListParams, status string) *whereBuilder {
	w := newWhere(`TRUE`)
	if status != "" {
		w.add("status = $%d", status)
	}
	w.search(p.Search, "ip", "reason")
	return w
}

// List returns one page of the blocks, newest first unless p.Sorted says
// otherwise.
func (r *IPBlockRepository) List(ctx context.Context, p ListParams, status string) ([]models.IPBlock, error) {
	w := ipBlockWhere(p, status)
	where, args, limit, offset := w.page(p)
	query := fmt.Sprintf(`SELECT %s FROM ip_blocks WHERE %s ORDER BY %s LIMIT $%d OFFSET $%d`,
		ipBlockColumns, where, resolveOrder(p.Sorted, ipBlockSortColumns, "created_at DESC"), limit, offset)
	rows, err := r.queryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	return collectRows(rows, scanIPBlock)
}

// Count counts what List pages through.
func (r *IPBlockRepository) Count(ctx context.Context, p ListParams, status string) (int64, error) {
	return r.countRows(ctx, "ip_blocks", ipBlockWhere(p, status))
}

// Get returns one block, whoever wrote it.
func (r *IPBlockRepository) Get(ctx context.Context, id uuid.UUID) (models.IPBlock, error) {
	query := fmt.Sprintf(`SELECT %s FROM ip_blocks WHERE id = $1`, ipBlockColumns)
	return scanIPBlock(r.queryRowContext(ctx, query, id))
}

// Create records a block of ip and answers it. An IP already actively
// blocked keeps its one live row: whichever end is later wins, and a block
// that never ends never gains one.
func (r *IPBlockRepository) Create(ctx context.Context, ip, source, reason string, blockedUntil *time.Time) (models.IPBlock, error) {
	var b models.IPBlock
	err := r.queryRowContext(ctx, `
		INSERT INTO ip_blocks (ip, source, reason, status, blocked_until)
		VALUES ($1, $2, NULLIF($3, ''), 'active', $4)
		ON CONFLICT (ip) WHERE status = 'active' DO UPDATE
		SET source = EXCLUDED.source, reason = coalesce(EXCLUDED.reason, ip_blocks.reason),
		    blocked_until = CASE
		        WHEN ip_blocks.blocked_until IS NULL OR EXCLUDED.blocked_until IS NULL THEN NULL
		        ELSE GREATEST(ip_blocks.blocked_until, EXCLUDED.blocked_until) END,
		    updated_at = now()
		RETURNING `+ipBlockColumns,
		ip, source, reason, blockedUntil,
	).Scan(ipBlockDest(&b)...)
	return b, err
}

// Lift takes a super user's hand to an active block: it is marked lifted,
// and answered with whether it was still active — a repeated lift is a
// no-op.
func (r *IPBlockRepository) Lift(ctx context.Context, id uuid.UUID) (models.IPBlock, bool, error) {
	b, err := r.Get(ctx, id)
	if err != nil {
		return b, false, err
	}
	if b.Status != models.IPBlockActive {
		return b, false, nil
	}
	res, err := r.execContext(ctx, `
		UPDATE ip_blocks SET status = 'lifted', lifted_at = now(), updated_at = now()
		WHERE id = $1 AND status = 'active'`, id)
	if err != nil {
		return b, false, err
	}
	changed, err := affected(res, err)
	if err != nil {
		return b, false, err
	}
	if changed {
		now := time.Now()
		b.Status, b.LiftedAt = models.IPBlockLifted, &now
	}
	return b, changed, nil
}

// ActiveManual returns the manual blocks still shutting their IP out, for the
// boot that restores them into the key-value store.
func (r *IPBlockRepository) ActiveManual(ctx context.Context) ([]models.IPBlock, error) {
	query := fmt.Sprintf(`SELECT %s FROM ip_blocks
		WHERE status = $1 AND source = $2 AND (blocked_until IS NULL OR blocked_until > now())
		ORDER BY created_at`, ipBlockColumns)
	rows, err := r.queryContext(ctx, query, models.IPBlockActive, models.IPBlockManual)
	if err != nil {
		return nil, err
	}
	return collectRows(rows, scanIPBlock)
}

package repositories

import (
	"context"

	"github.com/google/uuid"

	"montara-pass/server/internal/models"
)

// SessionRepository reads and ends a user's live sessions: the devices
// signed in to the account. The table is Authula's (authula.sessions).
// Ending a session takes its refresh tokens with it (their foreign key
// cascades), and its access tokens stop working at once, since the
// Authorization middleware looks the session up on every request.
type SessionRepository struct {
	BaseRepository
}

// Authula stores its times as UTC in timestamp columns without a zone.
const sessionLive = `expires_at > (now() AT TIME ZONE 'UTC')`

// List returns userID's live sessions, the most recently active first;
// current marks the one the request was made with.
func (r *SessionRepository) List(ctx context.Context, userID uuid.UUID, current string) ([]models.Session, error) {
	rows, err := r.queryContext(ctx, `
		SELECT id, created_at, updated_at, expires_at, ip_address, user_agent, id::text = $2
		FROM authula.sessions
		WHERE user_id = $1 AND `+sessionLive+`
		ORDER BY updated_at DESC, id`, userID, current)
	if err != nil {
		return nil, err
	}
	return collectRows(rows, func(row rowScanner) (models.Session, error) {
		var s models.Session
		err := row.Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt, &s.ExpiresAt, &s.IP, &s.UserAgent, &s.Current)
		return s, err
	})
}

// Delete ends one of userID's sessions; apperr.ErrNotFound when they have
// no such session.
func (r *SessionRepository) Delete(ctx context.Context, userID, id uuid.UUID) error {
	res, err := r.execContext(ctx, `DELETE FROM authula.sessions WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	return requireAffected(res, "session")
}

// DeleteOthers ends every session of userID but keep, and says how many.
func (r *SessionRepository) DeleteOthers(ctx context.Context, userID uuid.UUID, keep string) (int64, error) {
	res, err := r.execContext(ctx, `DELETE FROM authula.sessions WHERE user_id = $1 AND id::text <> $2`, userID, keep)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

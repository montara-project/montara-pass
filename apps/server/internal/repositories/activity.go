package repositories

import (
	"context"

	"github.com/google/uuid"

	"montara-pass/server/internal/models"
)

// ActivityRepository keeps the activity log (see migrations/000009).
type ActivityRepository struct {
	BaseRepository
}

// ActivityEntry is one thing to note in the log. Empty strings are stored
// as NULL.
type ActivityEntry struct {
	ActorID   uuid.UUID
	Action    string
	ItemID    *uuid.UUID
	ItemType  string
	SubjectID *uuid.UUID
	Role      string
	IP        string
	UserAgent string
}

// maxUserAgent bounds what a client's User-Agent may take up in a row.
const maxUserAgent = 500

// Record adds e to the log.
func (r *ActivityRepository) Record(ctx context.Context, e ActivityEntry) error {
	ua := []rune(e.UserAgent)
	if len(ua) > maxUserAgent {
		ua = ua[:maxUserAgent]
	}
	_, err := r.execContext(ctx, `
		INSERT INTO activity_logs (actor_id, action, item_id, item_type, subject_id, role, ip, user_agent)
		VALUES ($1, $2, $3, NULLIF($4, ''), $5, NULLIF($6, ''), NULLIF($7, ''), NULLIF($8, ''))`,
		e.ActorID, e.Action, e.ItemID, e.ItemType, e.SubjectID, e.Role, e.IP, string(ua))
	return err
}

// Prune deletes the rows older than the log keeps: 90 days.
func (r *ActivityRepository) Prune(ctx context.Context) error {
	_, err := r.execContext(ctx, `DELETE FROM activity_logs WHERE created_at < now() - interval '90 days'`)
	return err
}

// activityVisible is what a user ($1) may see of the log: what they did,
// what was done to them, and what was done to an item while they were one
// of its members. A sign-in has no item and no subject, so only its own user
// sees it, with its IP.
//
// ponytail: the OR keeps Postgres from a single index; fine while 90 days of
// a team's rows are small. Split it into a UNION of three indexed reads if
// listing slows down.
const activityVisible = `(
	a.actor_id = $1 OR a.subject_id = $1 OR EXISTS (
		SELECT 1 FROM item_members m
		WHERE m.item_id = a.item_id AND m.user_id = $1 AND m.created_at <= a.created_at))`

// List returns one page of what userID may see of the log, newest first.
func (r *ActivityRepository) List(ctx context.Context, userID uuid.UUID, offset, limit int) ([]models.Activity, error) {
	rows, err := r.queryContext(ctx, `
		SELECT a.id, a.created_at, a.action, a.item_id, a.item_type, a.role, a.ip, a.user_agent,
		       actor.id, actor.name, actor.email, subject.id, subject.name, subject.email
		FROM activity_logs a
		JOIN users actor ON actor.id = a.actor_id
		LEFT JOIN users subject ON subject.id = a.subject_id
		WHERE `+activityVisible+`
		ORDER BY a.created_at DESC, a.id DESC
		LIMIT $2 OFFSET $3`, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	return collectRows(rows, scanActivity)
}

// Count counts what List pages through.
func (r *ActivityRepository) Count(ctx context.Context, userID uuid.UUID) (int64, error) {
	var total int64
	err := r.queryRowContext(ctx, `SELECT COUNT(*) FROM activity_logs a WHERE `+activityVisible, userID).Scan(&total)
	return total, err
}

func scanActivity(row rowScanner) (models.Activity, error) {
	var a models.Activity
	var subjectID uuid.NullUUID
	var subjectName, subjectEmail *string
	err := row.Scan(&a.ID, &a.CreatedAt, &a.Action, &a.ItemID, &a.ItemType, &a.Role, &a.IP, &a.UserAgent,
		&a.Actor.ID, &a.Actor.Name, &a.Actor.Email, &subjectID, &subjectName, &subjectEmail)
	if err == nil && subjectID.Valid {
		a.Subject = &models.ActivityUser{ID: subjectID.UUID, Name: deref(subjectName), Email: deref(subjectEmail)}
	}
	return a, err
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

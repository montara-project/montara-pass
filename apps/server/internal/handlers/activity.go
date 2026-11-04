package handlers

import (
	"github.com/gofiber/fiber/v3"

	"montara-pass/server/internal/app"
	"montara-pass/server/internal/dtos"
	"montara-pass/server/internal/lib"
)

// activityHandler serves the signed-in user's activity log: their sign-ins,
// what they did to items, and what others did to the items they share.
type activityHandler struct {
	app *app.Application
}

// List answers one page of the log, newest first. Rows past the 90 days the
// log keeps are pruned first; a prune that fails only leaves them a while.
func (h *activityHandler) List(c fiber.Ctx) error {
	uid, err := currentUser(c)
	if err != nil {
		return err
	}

	var q dtos.ActivityListQuery
	if err := lib.ValidateRequestQuery(c, &q); err != nil {
		return err
	}
	q.Clamp()

	repo := &h.app.Repositories.Activity
	if err := repo.Prune(c.Context()); err != nil {
		h.app.Logger.Warn("prune activity log", "error", err)
	}
	rows, err := repo.List(c.Context(), uid, q.Offset, q.Limit)
	if err != nil {
		return err
	}
	total, err := repo.Count(c.Context(), uid)
	if err != nil {
		return err
	}
	return dtos.List(c, rows, dtos.ListMeta(int(total), q.Offset, q.Limit))
}

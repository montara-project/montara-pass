package handlers

import (
	"github.com/gofiber/fiber/v3"

	"montara-pass/server/internal/app"
	"montara-pass/server/internal/dtos"
	"montara-pass/server/internal/lib"
	"montara-pass/server/internal/lib/apperr"
)

// sessionHandler serves the devices signed in to the account, and signs
// them out: a lost laptop, or a sign-in the user does not recognise.
type sessionHandler struct {
	app *app.Application
}

// List answers the signed-in user's live sessions, the current one marked.
func (h *sessionHandler) List(c fiber.Ctx) error {
	uid, err := currentUser(c)
	if err != nil {
		return err
	}
	sessions, err := h.app.Repositories.Session.List(c.Context(), uid, lib.ContextGetSessionID(c))
	if err != nil {
		return err
	}
	return dtos.OK(c, sessions)
}

// Revoke signs one of the user's sessions out. Their own current one is
// refused: that is signing out, which also clears the client.
func (h *sessionHandler) Revoke(c fiber.Ctx) error {
	uid, err := currentUser(c)
	if err != nil {
		return err
	}
	id, err := pathID(c, "session")
	if err != nil {
		return err
	}
	if id.String() == lib.ContextGetSessionID(c) {
		return apperr.New(apperr.KindBadRequest, "this is the session you are using: sign out instead")
	}
	if err := h.app.Repositories.Session.Delete(c.Context(), uid, id); err != nil {
		return err
	}
	h.app.Logger.Info("session revoked", "user", uid, "session", id)
	return dtos.OK(c, fiber.Map{"revoked": 1})
}

// RevokeOthers signs out every session of the user but the current one.
func (h *sessionHandler) RevokeOthers(c fiber.Ctx) error {
	uid, err := currentUser(c)
	if err != nil {
		return err
	}
	current := lib.ContextGetSessionID(c)
	if current == "" {
		return apperr.ErrUnauthorized
	}
	n, err := h.app.Repositories.Session.DeleteOthers(c.Context(), uid, current)
	if err != nil {
		return err
	}
	h.app.Logger.Info("other sessions revoked", "user", uid, "count", n)
	return dtos.OK(c, fiber.Map{"revoked": n})
}

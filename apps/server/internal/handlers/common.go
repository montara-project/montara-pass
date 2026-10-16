package handlers

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"montara-pass/server/internal/lib"
	"montara-pass/server/internal/lib/apperr"
)

// pathID parses the :id path parameter, naming the resource in the error so a
// malformed id reads as "invalid item id".
func pathID(c fiber.Ctx, resource string) (uuid.UUID, error) {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return uuid.Nil, apperr.New(apperr.KindBadRequest, "invalid %s id", resource)
	}
	return id, nil
}

// currentUser returns the signed-in user's id, set by the Authorization
// middleware.
func currentUser(c fiber.Ctx) (uuid.UUID, error) {
	uid, err := lib.ContextGetUID(c)
	if err != nil {
		return uuid.Nil, apperr.ErrUnauthorized
	}
	return uid, nil
}

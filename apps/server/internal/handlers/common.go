package handlers

import (
	"context"

	authula "github.com/Authula/authula"
	authulamodels "github.com/Authula/authula/models"
	authulaservices "github.com/Authula/authula/services"
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

// AccountPasswordMatches reports whether password is the user's account
// (email) password. A user without one, signed up with Google, never matches.
// It guards what an access token alone must not be enough for.
func AccountPasswordMatches(ctx context.Context, auth *authula.Auth, userID, password string) (bool, error) {
	accounts := auth.ServiceRegistry.Get(authulamodels.ServiceAccount.String()).(authulaservices.AccountService)
	passwords := auth.ServiceRegistry.Get(authulamodels.ServicePassword.String()).(authulaservices.PasswordService)

	account, err := accounts.GetByUserIDAndProvider(ctx, userID, authulamodels.AuthProviderEmail.String())
	if err != nil {
		return false, err
	}
	return account != nil && account.Password != nil && passwords.Verify(password, *account.Password), nil
}

package handlers

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"montara-pass/server/internal/app"
	"montara-pass/server/internal/dtos"
	"montara-pass/server/internal/lib"
	"montara-pass/server/internal/models"
	"montara-pass/server/internal/repositories"
)

// keyHandler serves the key sets of the end-to-end encrypted vault. The
// server stores them as the client sent them and can open none of them.
type keyHandler struct {
	app *app.Application
}

func (h *keyHandler) repo() *repositories.UserKeyRepository {
	return &h.app.Repositories.UserKey
}

// Get returns the caller's key set; 404 means the vault is not set up yet.
func (h *keyHandler) Get(c fiber.Ctx) error {
	uid, err := currentUser(c)
	if err != nil {
		return err
	}

	keys, err := h.repo().Get(c.Context(), uid)
	if err != nil {
		return err
	}
	return dtos.Get(c, keys)
}

// Create sets up the caller's vault, once.
func (h *keyHandler) Create(c fiber.Ctx) error {
	uid, err := currentUser(c)
	if err != nil {
		return err
	}

	var body dtos.UserKeysBody
	if err := lib.ValidateRequestBody(c, &body); err != nil {
		return err
	}

	keys := kdfKeys(uid, body.KDFBody)
	keys.PublicKey = body.PublicKey
	keys.EncryptedPrivateKey = body.EncryptedPrivateKey
	if err := h.repo().Insert(c.Context(), keys); err != nil {
		return err
	}

	keys, err = h.repo().Get(c.Context(), uid)
	if err != nil {
		return err
	}
	return dtos.Created(c, keys, "vault keys created")
}

// UpdateKDF stores the vault key re-wrapped after a master password change.
func (h *keyHandler) UpdateKDF(c fiber.Ctx) error {
	uid, err := currentUser(c)
	if err != nil {
		return err
	}

	var body dtos.KDFBody
	if err := lib.ValidateRequestBody(c, &body); err != nil {
		return err
	}

	if err := h.repo().UpdateKDF(c.Context(), kdfKeys(uid, body)); err != nil {
		return err
	}

	keys, err := h.repo().Get(c.Context(), uid)
	if err != nil {
		return err
	}
	return dtos.OK(c, keys)
}

// PublicKey returns the public key of the user with the given email, which
// the caller needs to share an item with them.
func (h *keyHandler) PublicKey(c fiber.Ctx) error {
	var q dtos.PublicKeyQuery
	if err := lib.ValidateRequestQuery(c, &q); err != nil {
		return err
	}

	key, err := h.repo().PublicKeyByEmail(c.Context(), q.Email)
	if err != nil {
		return err
	}
	return dtos.Get(c, key)
}

func kdfKeys(uid uuid.UUID, body dtos.KDFBody) models.UserKeys {
	return models.UserKeys{
		UserID:            uid,
		KDFSalt:           body.KDFSalt,
		KDFMemoryKiB:      body.KDFMemoryKiB,
		KDFIterations:     body.KDFIterations,
		KDFParallelism:    body.KDFParallelism,
		EncryptedVaultKey: body.EncryptedVaultKey,
	}
}

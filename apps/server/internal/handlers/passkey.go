package handlers

import (
	"bytes"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"montara-pass/server/internal/app"
	"montara-pass/server/internal/dtos"
	"montara-pass/server/internal/lib"
	"montara-pass/server/internal/lib/apperr"
	"montara-pass/server/internal/lib/passkey"
)

// maxPasskeys bounds how many passkeys one account keeps.
const maxPasskeys = 10

var errPasskeyInvalid = apperr.New(apperr.KindBadRequest, "the passkey could not be verified")

// passkeyHandler manages the passkeys a user signs in with, and with which
// the vault can be unlocked. Signing in with one is an Authula route
// (cmd/api/passkey.go), so it gets a session the way every sign-in does.
type passkeyHandler struct {
	app *app.Application
}

// List answers the user's passkeys, with the vault key each one seals: the
// client needs it to unlock with the passkey, and it is useless without the
// authenticator.
func (h *passkeyHandler) List(c fiber.Ctx) error {
	uid, err := currentUser(c)
	if err != nil {
		return err
	}
	passkeys, err := h.app.Repositories.Passkey.ListByUser(c.Context(), uid)
	if err != nil {
		return err
	}
	return dtos.OK(c, passkeys)
}

// user is the signed-in user as go-webauthn sees them, with their passkeys.
func (h *passkeyHandler) user(c fiber.Ctx, uid uuid.UUID) (passkey.User, error) {
	u, err := h.app.Repositories.User.Get(c.Context(), uid)
	if err != nil {
		return passkey.User{}, err
	}
	existing, err := h.app.Repositories.Passkey.ListByUser(c.Context(), uid)
	if err != nil {
		return passkey.User{}, err
	}
	user := passkey.User{ID: uid, Email: u.Email, Name: u.Name}
	for _, p := range existing {
		user.Credentials = append(user.Credentials, p.Credential)
	}
	return user, nil
}

// RegisterBegin starts registering a passkey, once the account password
// checks out: an access token alone must not be enough to add a way in.
// The options ask for a discoverable passkey that verifies the user, and
// leave out the authenticators that hold one of the user's passkeys already.
func (h *passkeyHandler) RegisterBegin(c fiber.Ctx) error {
	uid, err := currentUser(c)
	if err != nil {
		return err
	}
	var body dtos.PasskeyRegisterBeginBody
	if err := lib.ValidateRequestBody(c, &body); err != nil {
		return err
	}
	ok, err := AccountPasswordMatches(c.Context(), h.app.Auth, uid.String(), body.Password)
	if err != nil {
		return err
	}
	if !ok {
		return apperr.New(apperr.KindForbidden, "incorrect password")
	}

	user, err := h.user(c, uid)
	if err != nil {
		return err
	}
	if len(user.Credentials) >= maxPasskeys {
		return apperr.New(apperr.KindBadRequest, "an account keeps at most %d passkeys: remove one first", maxPasskeys)
	}

	opts := []webauthn.RegistrationOption{
		webauthn.WithAuthenticatorSelection(protocol.AuthenticatorSelection{
			ResidentKey:        protocol.ResidentKeyRequirementRequired,
			RequireResidentKey: protocol.ResidentKeyRequired(),
			UserVerification:   protocol.VerificationRequired,
		}),
		webauthn.WithExclusions(passkey.Descriptors(user.Credentials)),
	}
	origin := c.Get(fiber.HeaderOrigin)
	rp, err := h.app.Passkeys.RelyingParty(origin)
	if err != nil {
		return err
	}
	creation, session, err := rp.BeginRegistration(user, opts...)
	if err != nil {
		return err
	}
	ceremony, err := h.app.Passkeys.Hold(session, origin)
	if err != nil {
		return err
	}
	return dtos.OK(c, fiber.Map{"ceremony": ceremony, "options": creation})
}

// RegisterFinish checks the browser's answer to RegisterBegin and keeps the
// passkey, with the vault key it seals when the authenticator has PRF.
func (h *passkeyHandler) RegisterFinish(c fiber.Ctx) error {
	uid, err := currentUser(c)
	if err != nil {
		return err
	}
	var body dtos.PasskeyRegisterFinishBody
	if err := lib.ValidateRequestBody(c, &body); err != nil {
		return err
	}
	session, origin, err := h.app.Passkeys.Take(body.Ceremony)
	if err != nil {
		return err
	}
	rp, err := h.app.Passkeys.RelyingParty(origin)
	if err != nil {
		return err
	}
	// A ceremony another user began is not this one's to finish.
	if !bytes.Equal(session.UserID, uid[:]) {
		return passkey.ErrCeremony
	}
	user, err := h.user(c, uid)
	if err != nil {
		return err
	}
	parsed, err := protocol.ParseCredentialCreationResponseBytes(body.Credential)
	if err != nil {
		return errPasskeyInvalid
	}
	cred, err := rp.CreateCredential(user, session, parsed)
	if err != nil {
		h.app.Logger.Info("passkey registration refused", "user", uid, "error", err)
		return errPasskeyInvalid
	}

	p, err := h.app.Repositories.Passkey.Create(c.Context(), uid, body.Name, *cred, body.EncryptedVaultKey)
	if err != nil {
		return err
	}
	h.app.Logger.Info("passkey registered", "user", uid, "passkey", p.ID, "unlocks_vault", p.EncryptedVaultKey != nil)
	return dtos.Created(c, p, "passkey added")
}

// Delete removes one of the user's passkeys. It no longer signs in, and what
// it sealed of the vault is gone with it.
func (h *passkeyHandler) Delete(c fiber.Ctx) error {
	uid, err := currentUser(c)
	if err != nil {
		return err
	}
	id, err := pathID(c, "passkey")
	if err != nil {
		return err
	}
	if err := h.app.Repositories.Passkey.Delete(c.Context(), uid, id); err != nil {
		return err
	}
	return dtos.OK(c, fiber.Map{"deleted": 1})
}

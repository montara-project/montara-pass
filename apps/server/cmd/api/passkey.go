package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"

	authula "github.com/Authula/authula"
	authulamodels "github.com/Authula/authula/models"
	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"

	"montara-pass/server/internal/app"
	"montara-pass/server/internal/dtos"
	"montara-pass/server/internal/lib/passkey"
	"montara-pass/server/internal/models"
)

// sessionTTL is how long a session lasts, however it began.
const sessionTTL = 7 * 24 * time.Hour

// maxPasskeyBody bounds a passkey sign-in body: an assertion is a few KB.
const maxPasskeyBody = 64 << 10

// registerPasskeyRoutes adds signing in with a passkey to Authula's routes,
// so it ends the way every sign-in does: a session cookie, and the access
// and refresh tokens the jwt plugin mints for a successful sign-in.
//
//	POST /passkey/options  begins: a challenge any of the user's passkeys can sign
//	POST /passkey/sign-in  finishes with the browser's answer
//
// The passkey is discoverable, so the user names no account: the passkey's
// user handle does. It verifies the user, which makes it two factors, so a
// user with TOTP on is not asked for a code as well.
func registerPasskeyRoutes(auth *authula.Auth, application *app.Application) {
	svc := application.Passkeys
	fail := func(reqCtx *authulamodels.RequestContext, status int, message string) {
		reqCtx.SetJSONResponse(status, map[string]any{"message": message})
		reqCtx.Handled = true
	}

	auth.RegisterRoute(authulamodels.Route{
		Method: http.MethodPost,
		Path:   "/passkey/options",
		Handler: http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
			reqCtx, _ := authulamodels.GetRequestContext(r.Context())
			origin := r.Header.Get("Origin")
			rp, err := svc.RelyingParty(origin)
			if err != nil {
				fail(reqCtx, http.StatusInternalServerError, "could not start a passkey sign-in")
				return
			}
			assertion, session, err := rp.BeginDiscoverableLogin(webauthn.WithUserVerification(protocol.VerificationRequired))
			if err != nil {
				fail(reqCtx, http.StatusInternalServerError, "could not start a passkey sign-in")
				return
			}
			ceremony, err := svc.Hold(session, origin)
			if err != nil {
				fail(reqCtx, http.StatusInternalServerError, "could not start a passkey sign-in")
				return
			}
			reqCtx.SetJSONResponse(http.StatusOK, map[string]any{"ceremony": ceremony, "options": assertion})
		}),
	})

	auth.RegisterRoute(authulamodels.Route{
		Method: http.MethodPost,
		Path:   "/passkey/sign-in",
		Handler: http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
			reqCtx, _ := authulamodels.GetRequestContext(r.Context())
			ctx := r.Context()

			var body dtos.PasskeySignInBody
			if err := json.NewDecoder(io.LimitReader(r.Body, maxPasskeyBody)).Decode(&body); err != nil {
				fail(reqCtx, http.StatusUnprocessableEntity, "invalid request body")
				return
			}
			session, origin, err := svc.Take(body.Ceremony)
			if err != nil {
				fail(reqCtx, http.StatusBadRequest, err.Error())
				return
			}
			rp, err := svc.RelyingParty(origin)
			if err != nil {
				fail(reqCtx, http.StatusInternalServerError, "failed to sign in")
				return
			}
			parsed, err := protocol.ParseCredentialRequestResponseBytes(body.Credential)
			if err != nil {
				fail(reqCtx, http.StatusBadRequest, "the passkey could not be verified")
				return
			}

			// The passkey the authenticator named, if its user handle is the
			// account the passkey was registered to.
			var found models.Passkey
			lookup := func(rawID, userHandle []byte) (webauthn.User, error) {
				p, err := application.Repositories.Passkey.ByCredentialID(ctx, rawID)
				if err != nil {
					return nil, err
				}
				if !bytes.Equal(userHandle, p.UserID[:]) {
					return nil, errors.New("user handle does not match the passkey")
				}
				found = p
				return passkey.User{ID: p.UserID, Credentials: []webauthn.Credential{p.Credential}}, nil
			}
			cred, err := rp.ValidateDiscoverableLogin(lookup, session, parsed)
			if err != nil || cred.Authenticator.CloneWarning {
				application.Logger.Info("passkey sign-in refused", "error", err, "clone_warning", cred != nil && cred.Authenticator.CloneWarning)
				fail(reqCtx, http.StatusUnauthorized, "the passkey could not be verified")
				return
			}
			if err := application.Repositories.Passkey.Used(ctx, found.ID, *cred); err != nil {
				fail(reqCtx, http.StatusInternalServerError, "failed to sign in")
				return
			}

			services := auth.CoreServices()
			user, err := services.UserService.GetByID(ctx, found.UserID.String())
			if err != nil || user == nil || !user.EmailVerified {
				fail(reqCtx, http.StatusUnauthorized, "the passkey could not be verified")
				return
			}
			token, err := services.TokenService.Generate()
			if err != nil {
				fail(reqCtx, http.StatusInternalServerError, "failed to sign in")
				return
			}
			userAgent := r.UserAgent()
			s, err := services.SessionService.Create(ctx, user.ID, services.TokenService.Hash(token), &reqCtx.ClientIP, &userAgent, sessionTTL)
			if err != nil {
				fail(reqCtx, http.StatusInternalServerError, "failed to sign in")
				return
			}

			// What the session and jwt plugins issue a sign-in's cookie and
			// tokens from, as the magic-link exchange leaves them.
			reqCtx.SetActorInContext(&authulamodels.Actor{ID: user.ID, Type: authulamodels.ActorUser})
			reqCtx.Values[authulamodels.ContextSessionID.String()] = s.ID
			reqCtx.Values[authulamodels.ContextSessionToken.String()] = token
			reqCtx.Values[authulamodels.ContextAuthSuccess.String()] = true
			reqCtx.SetJSONResponse(http.StatusOK, map[string]any{
				"user":    user,
				"session": s,
				// The vault key the passkey seals, for the client to open with
				// the PRF output only the authenticator can give it.
				"passkey": map[string]any{"id": found.ID, "encrypted_vault_key": found.EncryptedVaultKey},
			})
		}),
	})
}

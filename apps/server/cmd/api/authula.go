package main

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	authula "github.com/Authula/authula"
	authulaconfig "github.com/Authula/authula/config"
	authulamodels "github.com/Authula/authula/models"
	bearerplugin "github.com/Authula/authula/plugins/bearer"
	emailplugin "github.com/Authula/authula/plugins/email"
	emailpasswordplugin "github.com/Authula/authula/plugins/email-password"
	emailpasswordplugintypes "github.com/Authula/authula/plugins/email-password/types"
	emailplugintypes "github.com/Authula/authula/plugins/email/types"
	jwtplugin "github.com/Authula/authula/plugins/jwt"
	jwtrepositories "github.com/Authula/authula/plugins/jwt/repositories"
	jwtservices "github.com/Authula/authula/plugins/jwt/services"
	jwtplugintypes "github.com/Authula/authula/plugins/jwt/types"
	magiclinkplugin "github.com/Authula/authula/plugins/magic-link"
	magiclinkplugintypes "github.com/Authula/authula/plugins/magic-link/types"
	oauth2plugin "github.com/Authula/authula/plugins/oauth2"
	oauth2plugintypes "github.com/Authula/authula/plugins/oauth2/types"
	sessionplugin "github.com/Authula/authula/plugins/session"
	totpplugin "github.com/Authula/authula/plugins/totp"
	totpconstants "github.com/Authula/authula/plugins/totp/constants"
	totprepository "github.com/Authula/authula/plugins/totp/repository"
	totpplugintypes "github.com/Authula/authula/plugins/totp/types"
	authulaservices "github.com/Authula/authula/services"

	"montara-pass/server/internal/app"
	"montara-pass/server/internal/config"
	"montara-pass/server/internal/handlers"
	"montara-pass/server/internal/lib/constant"
	"montara-pass/server/internal/middlewares"
	"montara-pass/server/internal/models"
	"montara-pass/server/internal/repositories"
)

// authBasePath is where the Authula handler is mounted on the Fiber app;
// every Authula route (and route mapping below) lives under it.
const authBasePath = apiPrefix + "/v1/auth"

var (
	sessionAuth         = sessionplugin.HookIDSessionAuth.String()
	sessionAuthOptional = sessionplugin.HookIDSessionAuthOptional.String()
	bearerAuthOptional  = bearerplugin.HookIDBearerAuthOptional.String()
	totpIntercept       = totpplugin.HookIDTOTPIntercept.String()
)

// authRouteMappings attaches auth capabilities to Authula's routes. Paths
// are relative to authBasePath. Sign-in style routes take an optional session
// so an already signed-in user is recognised, and stop at the TOTP step for a
// user who turned it on; account routes require either a bearer access token
// or a session: the optional bearer check runs first and the session check
// stands down once it has identified the caller. The TOTP verify routes have
// no mapping: they are answered with the pending token, by a signed-out caller.
var authRouteMappings = []authulamodels.RouteMapping{
	{
		Paths:   []string{"GET:/me", "POST:/sign-out", "POST:/token"},
		Plugins: []string{bearerAuthOptional, sessionAuth},
	},
	{
		Paths: []string{
			"POST:/email-password/sign-up",
			"POST:/email-password/sign-in",
			"GET:/email-password/verify-email",
			"POST:/email-password/request-password-reset",
			"POST:/email-password/change-password",
			"/magic-link/*",
			"/oauth2/*",
		},
		Plugins: []string{sessionAuthOptional, totpIntercept},
	},
	{
		Paths: []string{
			"POST:/email-password/send-email-verification",
			"POST:/email-password/request-email-change",
			"POST:/totp/enable",
			"POST:/totp/disable",
		},
		Plugins: []string{bearerAuthOptional, sessionAuth},
	},
}

// authSchema is the PostgreSQL schema holding Authula's tables. It keeps them
// apart from the application's own, which include a "users" mirror of the
// same name (see migration 000002, which also creates the schema).
const authSchema = "authula"

// authDSN points Authula's connections at authSchema. Its driver (lib/pq)
// passes search_path to the server as a session default.
func authDSN(dsn string) string {
	u, err := url.Parse(dsn)
	if err != nil || u.Scheme == "" {
		// Not a URL, so a key/value DSN.
		return dsn + " search_path=" + authSchema
	}
	q := u.Query()
	q.Set("search_path", authSchema)
	u.RawQuery = q.Encode()
	return u.String()
}

// mirrorUser returns the function that copies an Authula user into the public
// users table. It is an Authula service hook, which carries no context.
func mirrorUser(repo *repositories.UserRepository) func(*authulamodels.User) error {
	return func(u *authulamodels.User) error {
		id, err := uuid.Parse(u.ID)
		if err != nil {
			return err
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		return repo.Upsert(ctx, models.User{
			Base:  models.Base{ID: id},
			Name:  u.Name,
			Email: u.Email,
			Image: u.Image,
		})
	}
}

// addTokensToResponse adds the token pair the jwt plugin minted for a
// successful sign-in to the JSON body the sign-in handler already wrote,
// with the access token's expiry. A sign-in that answers with a redirect
// (Google with redirect_to) has no JSON body and is left alone.
func addTokensToResponse(reqCtx *authulamodels.RequestContext) error {
	access, _ := reqCtx.Values[jwtplugintypes.JWTTokenTypeAccess.String()].(string)
	if access == "" {
		return nil
	}

	// The token was minted just now, so it expires accessTokenTTL from now,
	// give or take the second it took.
	return addToResponse(reqCtx, map[string]any{
		"access_token":  access,
		"refresh_token": reqCtx.Values[jwtplugintypes.JWTTokenTypeRefresh.String()],
		"expires_at":    time.Now().Add(accessTokenTTL).UTC().Truncate(time.Second),
		"expires_in":    int64(accessTokenTTL.Seconds()),
	})
}

// addToResponse sets fields of the JSON object a handler already wrote. A
// response that is not one is left alone.
func addToResponse(reqCtx *authulamodels.RequestContext, fields map[string]any) error {
	var body map[string]json.RawMessage
	if err := json.Unmarshal(reqCtx.ResponseBody, &body); err != nil || body == nil {
		return nil
	}

	var err error
	for key, value := range fields {
		if body[key], err = json.Marshal(value); err != nil {
			return err
		}
	}

	reqCtx.ResponseBody, err = json.Marshal(body)
	return err
}

// totpTokenHeader carries the TOTP pending token back to /totp/verify and
// /totp/verify-backup-code. The totp plugin keeps that token in a cookie, which
// neither the extension (it omits credentials) nor the web app on another
// origin sends.
const totpTokenHeader = "X-TOTP-Token"

// addTOTPTokenToResponse copies the pending token the totp plugin set as a
// cookie, when a sign-in stopped at the TOTP step or /totp/enable began, into
// the body as totp_token. Verifying deletes the cookie with an empty value,
// which is skipped.
func addTOTPTokenToResponse(reqCtx *authulamodels.RequestContext) error {
	for _, line := range reqCtx.ResponseWriter.Header().Values("Set-Cookie") {
		c, err := http.ParseSetCookie(line)
		if err == nil && c.Name == totpconstants.CookieTOTPPending && c.Value != "" {
			return addToResponse(reqCtx, map[string]any{"totp_token": c.Value})
		}
	}
	return nil
}

// isTOTPVerify reports whether a request answers the TOTP step, with a code
// or with a backup code.
func isTOTPVerify(reqCtx *authulamodels.RequestContext) bool {
	return reqCtx.Method == http.MethodPost &&
		(reqCtx.Path == authBasePath+"/totp/verify" || reqCtx.Path == authBasePath+"/totp/verify-backup-code")
}

// totpTokenToCookie hands a pending token sent in totpTokenHeader to the totp
// plugin as the cookie it reads. A cookie the browser sent itself comes first.
func totpTokenToCookie(reqCtx *authulamodels.RequestContext) error {
	if token := reqCtx.Request.Header.Get(totpTokenHeader); token != "" {
		reqCtx.Request.AddCookie(&http.Cookie{Name: totpconstants.CookieTOTPPending, Value: token})
	}
	return nil
}

// totpVerifyUser returns, for a request answering the TOTP step, the user its
// pending token was issued to, so attempts are counted per account however
// many tokens and IPs they come from; "" for any other request.
func totpVerifyUser(auth *authula.Auth) func(fiber.Ctx) string {
	tokens := auth.ServiceRegistry.Get(authulamodels.ServiceToken.String()).(authulaservices.TokenService)
	verifications := auth.ServiceRegistry.Get(authulamodels.ServiceVerification.String()).(authulaservices.VerificationService)

	return func(c fiber.Ctx) string {
		if c.Method() != fiber.MethodPost || !strings.HasPrefix(c.Path(), authBasePath+"/totp/verify") {
			return ""
		}
		token := c.Get(totpTokenHeader)
		if token == "" {
			token = c.Cookies(totpconstants.CookieTOTPPending)
		}
		if token == "" {
			return ""
		}
		v, err := verifications.GetByToken(c.Context(), tokens.Hash(token))
		if err != nil || v == nil || v.UserID == nil {
			return ""
		}
		return *v.UserID
	}
}

// isTOTPToggle reports whether a request turns TOTP on or off.
func isTOTPToggle(reqCtx *authulamodels.RequestContext) bool {
	return reqCtx.Method == http.MethodPost &&
		(reqCtx.Path == authBasePath+"/totp/enable" || reqCtx.Path == authBasePath+"/totp/disable")
}

// requirePassword returns the hook that asks for the account password, as
// {"password"} in the body, before TOTP is turned on or off: an access token
// alone must not be enough to lock the owner out or to drop the second step.
// It answers 403, not 401, which the clients would take for a dead session.
func requirePassword(auth *authula.Auth) func(*authulamodels.RequestContext) error {
	return func(reqCtx *authulamodels.RequestContext) error {
		// The route itself refuses a caller nobody identified.
		if reqCtx.Actor == nil {
			return nil
		}

		var body struct {
			Password string `json:"password"`
		}
		_ = json.NewDecoder(reqCtx.Request.Body).Decode(&body)

		ok, err := handlers.AccountPasswordMatches(reqCtx.Request.Context(), auth, reqCtx.Actor.ID, body.Password)
		if err != nil {
			return err
		}
		if !ok {
			reqCtx.SetJSONResponse(http.StatusForbidden, map[string]any{"message": "incorrect password"})
			reqCtx.Handled = true
		}
		return nil
	}
}

// addTOTPStatusToMe returns the hook that tells GET /me whether the user
// turned TOTP on, as totp_enabled, for the settings that turn it on and off.
func addTOTPStatusToMe(repo *totprepository.TOTPRepository) func(*authulamodels.RequestContext) error {
	return func(reqCtx *authulamodels.RequestContext) error {
		if reqCtx.Actor == nil {
			return nil
		}
		enabled, err := repo.IsEnabled(reqCtx.Request.Context(), reqCtx.Actor.ID)
		if err != nil {
			return err
		}
		return addToResponse(reqCtx, map[string]any{"totp_enabled": enabled})
	}
}

// saveCustomer returns the hook that saves a new account as a Lemon Squeezy
// customer, or nil where billing takes no payments. It works in the
// background, so a sign-up does not wait on Lemon Squeezy; an account it
// misses is saved at its first checkout. The seeded super user, who buys
// nothing, is left out.
func saveCustomer(application *app.Application) func(*authulamodels.User) error {
	if application.Payments == nil {
		return nil
	}
	return func(u *authulamodels.User) error {
		if strings.EqualFold(u.Email, application.Config.App.SuperUserEmail) {
			return nil
		}
		id, err := uuid.Parse(u.ID)
		if err != nil {
			return err
		}
		user := models.User{Base: models.Base{ID: id}, Name: u.Name, Email: u.Email}
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			if err := handlers.EnsureCustomer(ctx, application, user); err != nil {
				application.Logger.Warn("save lemon squeezy customer on sign-up", "user", u.ID, "error", err)
			}
		}()
		return nil
	}
}

// promoteSuperUser returns the seeder's callback: mirror the user here too,
// because Authula only logs a failed after-create hook, then give it the
// super user role.
func promoteSuperUser(repo *repositories.UserRepository, mirror func(*authulamodels.User) error) func(*authulamodels.User) error {
	return func(u *authulamodels.User) error {
		if err := mirror(u); err != nil {
			return err
		}
		id, err := uuid.Parse(u.ID)
		if err != nil {
			return err
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		return repo.SetRole(ctx, id, constant.RoleSuperUser)
	}
}

// accessTokenTTL is how long an access token lasts.
const accessTokenTTL = 15 * time.Minute

// refreshTokenTTL is short because the refresh token is returned in a JSON
// body, where a script on the client's page can read it; the session itself
// lasts longer and can always be exchanged for a new pair at POST /token.
const refreshTokenTTL = 24 * time.Hour

// tokenIssuer mints a token pair for a request's own session, the way the jwt
// plugin does after a sign-in. It covers the callers the plugin leaves
// without tokens: a sign-in repeated while a session is active, and a session
// that began with a redirect (Google).
type tokenIssuer struct {
	tokens        jwtservices.TokenService
	refreshTokens jwtservices.RefreshTokenRepository
}

func newTokenIssuer(auth *authula.Auth) (tokenIssuer, error) {
	tokens, ok := auth.ServiceRegistry.Get(authulamodels.ServiceJWT.String()).(jwtservices.TokenService)
	if !ok {
		return tokenIssuer{}, errors.New("jwt plugin is not enabled")
	}
	return tokenIssuer{tokens: tokens, refreshTokens: jwtrepositories.NewRefreshTokenRepository(auth.DB())}, nil
}

// issue stores the pair in the request values, where addTokensToResponse
// picks it up. It does nothing for a request without a user session.
func (i tokenIssuer) issue(reqCtx *authulamodels.RequestContext) error {
	sessionID, _ := reqCtx.Values[authulamodels.ContextSessionID.String()].(string)
	if reqCtx.Actor == nil || reqCtx.Actor.Type != authulamodels.ActorUser || sessionID == "" {
		return nil
	}

	ctx := reqCtx.Request.Context()
	pair, err := i.tokens.GenerateUserToken(ctx, reqCtx.Actor.ID, sessionID, nil)
	if err != nil {
		return err
	}
	if err := i.refreshTokens.StoreRefreshToken(ctx, &jwtplugintypes.RefreshToken{
		ID:        uuid.NewString(),
		SessionID: sessionID,
		TokenHash: jwtservices.HashRefreshToken(pair.RefreshToken),
		ExpiresAt: time.Now().Add(refreshTokenTTL),
		CreatedAt: time.Now(),
	}); err != nil {
		return err
	}

	reqCtx.Values[jwtplugintypes.JWTTokenTypeAccess.String()] = pair.AccessToken
	reqCtx.Values[jwtplugintypes.JWTTokenTypeRefresh.String()] = pair.RefreshToken
	return nil
}

// route is POST /token: a token pair for the caller's current session.
func (i tokenIssuer) route() authulamodels.Route {
	return authulamodels.Route{
		Method: http.MethodPost,
		Path:   "/token",
		Handler: http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
			reqCtx, _ := authulamodels.GetRequestContext(r.Context())
			if err := i.issue(reqCtx); err != nil {
				reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": "failed to issue tokens"})
				return
			}
			// addTokensToResponse fills the body in.
			reqCtx.SetJSONResponse(http.StatusOK, map[string]any{})
		}),
	}
}

// newAuth builds the embedded Authula instance: email & password, Google
// OAuth2 and email magic links on top of cookie sessions, with emails sent
// through Resend, and an optional TOTP step at sign-in. Authula migrates its own tables (users, accounts, sessions,
// verifications) into authSchema of the app database when it starts, and
// mirror runs after every user it creates or updates. customer, when set,
// runs after mirror on every user it creates.
func newAuth(cfg config.Config, mirror, customer func(*authulamodels.User) error, logger *slog.Logger) *authula.Auth {
	userHooks := &authulamodels.ServiceHooks[authulamodels.User]{}
	userHooks.RegisterAfterCreate(mirror)
	userHooks.RegisterAfterUpdate(mirror)
	if customer != nil {
		userHooks.RegisterAfterCreate(customer)
	}

	// Sign-up, magic links and Google all create users through this service,
	// so in the Community Edition only the seeded super user gets made. The
	// email-password plugin also turns sign-up off there (DisableSignUp), so
	// it answers every address alike, before looking it up.
	if config.Community() {
		userHooks.RegisterBeforeCreate(func(u *authulamodels.User) error {
			if !strings.EqualFold(u.Email, cfg.App.SuperUserEmail) {
				return errors.New("sign-up is not available in the community edition")
			}
			return nil
		})
	}

	origins := splitCSV(cfg.App.CORSAllowedOrigins)

	logLevel := "info"
	if cfg.App.Debug {
		logLevel = "debug"
	}

	authConfig := authulaconfig.NewConfig(
		authulaconfig.WithAppName(cfg.App.Name),
		authulaconfig.WithBaseURL(cfg.Auth.BaseURL),
		authulaconfig.WithBasePath(authBasePath),
		authulaconfig.WithSecret(cfg.App.Secret),
		authulaconfig.WithDatabase(authulamodels.DatabaseConfig{
			Provider:     "postgres",
			URL:          authDSN(cfg.DB.DSN),
			MaxOpenConns: cfg.DB.MaxOpenConns,
			MaxIdleConns: cfg.DB.MaxIdleConns,
		}),
		authulaconfig.WithLogger(authulamodels.LoggerConfig{Level: logLevel, Logger: logger}),
		authulaconfig.WithSession(authulamodels.SessionConfig{
			CookieName:         config.SessionCookieName,
			ExpiresIn:          7 * 24 * time.Hour,
			UpdateAge:          24 * time.Hour,
			Secure:             cfg.App.Env != config.EnvDevelopment,
			HttpOnly:           true,
			SameSite:           "lax",
			AutoCleanup:        true,
			MaxSessionsPerUser: 5,
		}),
		authulaconfig.WithVerification(authulamodels.VerificationConfig{AutoCleanup: true}),
		// Empty origins leave Authula's CORS at its "*" default, which it never
		// answers with credentials: same-origin only, like the rest of the API.
		authulaconfig.WithSecurity(authulamodels.SecurityConfig{
			TrustedOrigins: origins,
			TrustedProxies: splitCSV(cfg.App.TrustedProxies),
			CORS: authulamodels.CORSConfig{
				AllowCredentials: true,
				AllowedOrigins:   origins,
				// Authula's defaults, and the headers the clients add.
				AllowedHeaders: []string{
					"Authorization", "Content-Type", "Cookie", "Set-Cookie",
					middlewares.IdempotencyKeyHeader, totpTokenHeader,
				},
			},
		}),
		authulaconfig.WithRouteMappings(authRouteMappings),
		authulaconfig.WithCoreServiceHooks(&authulamodels.CoreServiceHooksConfig{Users: userHooks}),
	)

	googleEnabled := cfg.Auth.GoogleClientID != ""
	if !googleEnabled {
		logger.Warn("google sign-in disabled: google-client-id is not set")
	}

	// Only the Community Edition may run without (see validateFlag). The
	// email-password plugin then sends nothing, and a magic link could not
	// be delivered, so that plugin is off.
	emailEnabled := cfg.Auth.ResendAPIKey != ""
	var plugins []authulamodels.Plugin
	if emailEnabled {
		// Registered first: the email-based plugins look up its mailer.
		plugins = append(plugins, emailplugin.New(emailplugintypes.EmailPluginConfig{
			Enabled:     true,
			Provider:    emailplugintypes.ProviderResend,
			FromAddress: cfg.Auth.EmailFrom,
			Resend:      &emailplugintypes.ResendConfig{ApiKey: cfg.Auth.ResendAPIKey},
		}))
	} else {
		logger.Warn("auth emails disabled: resend-api-key is not set; no password reset or magic-link sign-in, change SUPER_USER to reset the password")
	}

	auth := authula.New(&authula.AuthConfig{
		Config: authConfig,
		Plugins: append(plugins,
			// Mints an access and refresh token on every successful sign-in and
			// serves POST /token/refresh.
			jwtplugin.New(jwtplugintypes.JWTPluginConfig{
				Enabled:          true,
				ExpiresIn:        accessTokenTTL,
				RefreshExpiresIn: refreshTokenTTL,
			}),
			// Accepts that access token as "Authorization: Bearer". Registered
			// before the session plugin: hooks of equal order run in plugin
			// order, and the bearer check has to precede the session one.
			bearerplugin.New(bearerplugin.BearerPluginConfig{Enabled: true}),
			sessionplugin.New(sessionplugin.SessionPluginConfig{Enabled: true}),
			emailpasswordplugin.New(emailpasswordplugintypes.EmailPasswordPluginConfig{
				Enabled:                  true,
				DisableSignUp:            config.Community(),
				MinPasswordLength:        8,
				MaxPasswordLength:        128,
				RequireEmailVerification: true,
				// No session before the email is verified: see Authorization.
				AutoSignIn:             false,
				SendEmailOnSignUp:      true,
				PasswordResetExpiresIn: time.Hour,
			}),
			magiclinkplugin.New(magiclinkplugintypes.MagicLinkPluginConfig{
				Enabled:   emailEnabled,
				ExpiresIn: 15 * time.Minute,
			}),
			// Authenticator-app codes, for users who turn them on in settings.
			// Enabling answers with the secret, and takes effect once a code
			// from it has been verified.
			totpplugin.New(totpplugintypes.TOTPPluginConfig{
				Enabled:      true,
				SecureCookie: cfg.App.Env != config.EnvDevelopment,
			}),
			oauth2plugin.New(oauth2plugintypes.OAuth2PluginConfig{
				Enabled: googleEnabled,
				Providers: map[string]oauth2plugintypes.ProviderConfig{
					"google": {
						Enabled:      googleEnabled,
						ClientID:     cfg.Auth.GoogleClientID,
						ClientSecret: cfg.Auth.GoogleClientSecret,
						RedirectURL:  authConfig.BaseURL + authBasePath + "/oauth2/callback/google",
					},
				},
			}),
		),
	})

	issuer, err := newTokenIssuer(auth)
	if err != nil {
		// Unreachable while the jwt plugin above stays enabled.
		panic(err)
	}
	auth.RegisterRoute(issuer.route())

	// A sign-in repeated while a session is active answers from that session
	// and the jwt plugin skips minting for it, so mint here instead.
	auth.RegisterHook(authulamodels.Hook{
		Stage: authulamodels.HookAfter,
		Matcher: func(reqCtx *authulamodels.RequestContext) bool {
			skipped, _ := reqCtx.Values[authulamodels.ContextAuthIdempotentSkipTokensMint.String()].(bool)
			return skipped
		},
		Handler: issuer.issue,
		Order:   16,
	})

	// Order 20 runs after the jwt plugin's own minting hook (15).
	auth.RegisterHook(authulamodels.Hook{
		Stage:   authulamodels.HookAfter,
		Handler: addTokensToResponse,
		Order:   20,
	})

	auth.RegisterHook(authulamodels.Hook{
		Stage:   authulamodels.HookBefore,
		Matcher: isTOTPVerify,
		Handler: totpTokenToCookie,
	})
	// Order 20 runs after the bearer and session checks (10) found the caller.
	auth.RegisterHook(authulamodels.Hook{
		Stage:   authulamodels.HookBefore,
		Matcher: isTOTPToggle,
		Handler: requirePassword(auth),
		Order:   20,
	})
	auth.RegisterHook(authulamodels.Hook{
		Stage:   authulamodels.HookAfter,
		Handler: addTOTPTokenToResponse,
		Order:   20,
	})
	auth.RegisterHook(authulamodels.Hook{
		Stage: authulamodels.HookAfter,
		Matcher: func(reqCtx *authulamodels.RequestContext) bool {
			return reqCtx.Method == http.MethodGet && reqCtx.Path == authBasePath+"/me"
		},
		Handler: addTOTPStatusToMe(totprepository.NewTOTPRepository(auth.DB())),
		Order:   20,
	})

	return auth
}

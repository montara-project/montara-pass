package main

import (
	"net/http"
	"slices"
	"strings"
	"time"

	fiberadapter "github.com/Authula/authula/adapters/fiber"
	"github.com/gofiber/fiber/v3"

	"montara-pass/server/internal/app"
	"montara-pass/server/internal/config"
	"montara-pass/server/internal/handlers"
	"montara-pass/server/internal/lib/apperr"
	"montara-pass/server/internal/middlewares"
)

// apiPrefix scopes every endpoint, so the web app can own the rest of the
// origin: its pages and static assets never collide with a route.
const apiPrefix = "/api"

// Request budgets per minute. Per IP: tight on the auth routes, loose on the
// rest of the API. Per email address on the auth routes, and per IP on the
// lookup that tells whether an address has an account.
const (
	authRateLimit      = 30
	authEmailRateLimit = 10
	apiRateLimit       = 120
	publicKeyRateLimit = 20
)

// totpRateLimit is how many TOTP codes one account may try in totpRateWindow,
// from any number of pending tokens and IPs.
//
// ponytail: a guess at a 6-digit code (±1 step) wins 3 times in 10^6, so this
// caps a password holder at about 0.26 wins a year; lock the account after
// repeated failures if that is too many.
const (
	totpRateLimit  = 10
	totpRateWindow = time.Hour
)

// An IP that fails ipBlockMaxFailures times, each less than ipBlockWindow
// after the last, is shut out of the API for ipBlockFor.
const (
	ipBlockMaxFailures = 20
	ipBlockWindow      = 15 * time.Minute
	ipBlockFor         = time.Hour
)

// guessPaths are the routes where a 401 or 403 means a wrong password or
// code: what someone guessing them gets.
var guessPaths = []string{
	authBasePath + "/email-password/sign-in",
	authBasePath + "/totp/verify",
	authBasePath + "/totp/verify-backup-code",
	authBasePath + "/totp/enable",
	authBasePath + "/totp/disable",
}

// failedAttempt reports whether a request counts against its IP: a wrong
// password, code or sign-in link, or running into a rate limiter. An expired
// access token's 401 elsewhere is a client refreshing, not guessing.
func failedAttempt(c fiber.Ctx, status int) bool {
	switch status {
	case http.StatusTooManyRequests:
		return true
	case http.StatusUnauthorized, http.StatusForbidden:
		return slices.Contains(guessPaths, c.Path()) || strings.HasPrefix(c.Path(), authBasePath+"/magic-link/") ||
			// A wrong account password on a master password change.
			(c.Method() == fiber.MethodPut && strings.TrimSuffix(c.Path(), "/") == apiPrefix+"/v1/keys")
	}
	return false
}

func routes(r *fiber.App, app *app.Application) {
	h := handlers.New(app)
	m := middlewares.New(app)

	// Counts, blocks, idempotent answers and their locks: in Redis when there
	// is one, so replicas share them, and in memory otherwise.
	store := middlewares.NewStore(app.Redis)

	exemptLoopback := app.Config.App.Env == config.EnvDevelopment
	exemptIPs := splitCSV(app.Config.App.RateLimitExemptIPs)

	// First, so a blocked IP reaches nothing else of the API, and every
	// limiter's 429 below is seen.
	r.Use(apiPrefix, middlewares.IPBlock(middlewares.IPBlockConfig{
		MaxFailures: ipBlockMaxFailures,
		Window:      ipBlockWindow,
		BlockFor:    ipBlockFor,
		Failed:      failedAttempt,
		Exempt: func(ip string) bool {
			return slices.Contains(exemptIPs, ip) || (exemptLoopback && (ip == "127.0.0.1" || ip == "::1"))
		},
	}, store, app.Logger))

	// Everything outside apiPrefix belongs to the web app (see serveWebApp).
	api := r.Group(apiPrefix)
	api.Get("/health", h.Health.Check)

	// Authula: email & password, Google OAuth2 and magic-link sign-in,
	// plus GET /me and POST /sign-out, all under authBasePath. The limiter
	// guards password guessing and sign-in/reset email flooding.

	r.Use(authBasePath,
		middlewares.RateLimit("auth", authRateLimit, exemptLoopback, exemptIPs, store),
		middlewares.RateLimitEmail("auth-email", authEmailRateLimit, store),
		middlewares.RateLimitKey("totp", totpRateLimit, totpRateWindow, totpVerifyUser(app.Auth), store),
		fiberadapter.New(fiberadapter.Config{Handler: app.Auth.Handler()}),
	)

	v1 := api.Group("/v1", middlewares.RateLimit("api", apiRateLimit, exemptLoopback, exemptIPs, store))

	// A write that carries an Idempotency-Key is run once, however often it
	// is sent. It needs the user, so it goes after Authorization.
	once := middlewares.Idempotency(store)

	// The end-to-end encrypted vault: everything below needs a signed-in
	// user, and every payload is ciphertext the server cannot read.
	keys := v1.Group("/keys", m.Authorization, once)
	keys.Get("/", h.Key.Get)
	keys.Post("/", h.Key.Create)
	keys.Put("/", h.Key.UpdateKDF)

	folders := v1.Group("/folders", m.Authorization, once)
	folders.Get("/", h.Folder.List)
	folders.Post("/", h.Folder.Create)
	folders.Put("/:id", h.Folder.Update)
	folders.Delete("/:id", h.Folder.Delete)

	items := v1.Group("/items", m.Authorization, once)
	items.Get("/", h.Item.List)
	items.Post("/", h.Item.Create)
	items.Get("/:id", h.Item.Get)
	items.Put("/:id", h.Item.Update)
	items.Delete("/:id", h.Item.Delete)
	items.Put("/:id/restore", h.Item.Restore)
	items.Delete("/:id/force", h.Item.DeletePermanently)
	items.Put("/:id/placement", h.Item.SetPlacement)
	items.Put("/:id/used", h.Item.MarkUsed)

	// Cloud Edition only. The Community Edition has one user, so nobody to
	// share with, and takes no payments.
	if !config.Community() {
		// Sharing: looking up a recipient's public key, the item's members,
		// and rotating its key once a member is gone.
		keys.Get("/public", middlewares.RateLimit("public-key", publicKeyRateLimit, exemptLoopback, exemptIPs, store), h.Key.PublicKey)
		items.Put("/:id/key", h.Item.RotateKey)
		items.Get("/:id/members", h.Item.Members)
		items.Post("/:id/members", h.Item.Share)
		items.Put("/:id/members/:userId", h.Item.SetMemberRole)
		items.Delete("/:id/members/:userId", h.Item.RemoveMember)

		// Billing. The plans are public, for the website; they are the Lemon
		// Squeezy store's catalog, which a super user syncs at once after
		// changing it, and a super user sees what customers bought. Subscribing and
		// buying need a signed-in user account; Lemon Squeezy reports what
		// was paid, and its customer portal is where a subscription is
		// cancelled.
		plans := v1.Group("/plans")
		plans.Get("/", h.Billing.ListPlans)
		plans.Get("/all", m.Authorization, m.SuperUser, h.Billing.ListAllPlans)
		plans.Post("/sync", m.Authorization, m.SuperUser, h.Billing.SyncPlans)

		// Every customer's subscriptions and purchases, for a super user.
		v1.Get("/subscriptions", m.Authorization, m.SuperUser, h.Billing.ListSubscriptions)
		v1.Get("/purchases", m.Authorization, m.SuperUser, h.Billing.ListPurchases)
		// The counts on the admin's dashboard.
		v1.Get("/stats", m.Authorization, m.SuperUser, h.Billing.Stats)

		billing := v1.Group("/billing")
		billing.Get("/", m.Authorization, h.Billing.Overview)
		billing.Post("/subscriptions", m.Authorization, once, h.Billing.Subscribe)
		billing.Post("/purchases", m.Authorization, once, h.Billing.Buy)
		billing.Get("/portal", m.Authorization, h.Billing.Portal)
		billing.Post("/lemonsqueezy/webhook", h.Billing.LemonSqueezyWebhook)
	}

	// An unknown path under apiPrefix answers JSON. Registered last, and before
	// the web app's catch-all, which would otherwise answer it with index.html.
	r.Use(apiPrefix, func(c fiber.Ctx) error {
		return apperr.ErrNotFound
	})
}

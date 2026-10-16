package main

import (
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

func routes(r *fiber.App, app *app.Application) {
	h := handlers.New(app)
	m := middlewares.New(app)

	// Everything outside apiPrefix belongs to the web app (see serveWebApp).
	api := r.Group(apiPrefix)
	api.Get("/health", h.Health.Check)

	// Authula: email & password, Google OAuth2 and magic-link sign-in,
	// plus GET /me and POST /sign-out, all under authBasePath. The limiter
	// guards password guessing and sign-in/reset email flooding.
	// Counts, idempotent answers and their locks: in Redis when there is one,
	// so replicas share them, and in memory otherwise.
	store := middlewares.NewStore(app.Redis)

	exemptLoopback := app.Config.App.Env == config.EnvDevelopment
	exemptIPs := splitCSV(app.Config.App.RateLimitExemptIPs)

	r.Use(authBasePath,
		middlewares.RateLimit("auth", authRateLimit, exemptLoopback, exemptIPs, store),
		middlewares.RateLimitEmail("auth-email", authEmailRateLimit, store),
		fiberadapter.New(fiberadapter.Config{Handler: app.Auth.Handler()}),
	)

	v1 := api.Group("/v1", middlewares.RateLimit("api", apiRateLimit, exemptLoopback, exemptIPs, store))

	// A write that carries an Idempotency-Key is run once, however often it
	// is sent. It needs the user, so it goes after Authorization.
	once := middlewares.Idempotency(store)

	// Reads are public; writes need a signed-in super user.
	categories := v1.Group("/categories")
	categories.Get("/", h.Category.List)
	categories.Get("/:id", h.Category.Get)
	categories.Post("/", m.Authorization, m.SuperUser, once, h.Category.Create)
	categories.Put("/:id", m.Authorization, m.SuperUser, once, h.Category.Update)
	categories.Delete("/:id", m.Authorization, m.SuperUser, once, h.Category.Delete)
	categories.Put("/:id/restore", m.Authorization, m.SuperUser, once, h.Category.Restore)
	categories.Delete("/:id/force", m.Authorization, m.SuperUser, once, h.Category.DeletePermanently)

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

		// Billing. The plans are public, for the website; a super user
		// manages them and sees what customers bought. Subscribing and
		// buying need a signed-in user account; Midtrans reports the
		// payment's outcome.
		plans := v1.Group("/plans")
		plans.Get("/", h.Billing.ListPlans)
		plans.Get("/all", m.Authorization, m.SuperUser, h.Billing.ListAllPlans)
		plans.Post("/", m.Authorization, m.SuperUser, once, h.Billing.CreatePlan)
		plans.Put("/:id", m.Authorization, m.SuperUser, once, h.Billing.UpdatePlan)

		// Every customer's subscriptions and purchases, for a super user.
		v1.Get("/subscriptions", m.Authorization, m.SuperUser, h.Billing.ListSubscriptions)
		v1.Get("/purchases", m.Authorization, m.SuperUser, h.Billing.ListPurchases)
		// The counts on the admin's dashboard.
		v1.Get("/stats", m.Authorization, m.SuperUser, h.Billing.Stats)

		billing := v1.Group("/billing")
		billing.Get("/", m.Authorization, h.Billing.Overview)
		billing.Post("/subscriptions", m.Authorization, once, h.Billing.Subscribe)
		billing.Post("/purchases", m.Authorization, once, h.Billing.Buy)
		billing.Post("/midtrans/notification", h.Billing.MidtransNotification)
	}

	// An unknown path under apiPrefix answers JSON. Registered last, and before
	// the web app's catch-all, which would otherwise answer it with index.html.
	r.Use(apiPrefix, func(c fiber.Ctx) error {
		return apperr.ErrNotFound
	})
}

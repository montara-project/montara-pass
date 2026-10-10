package main

import (
	fiberadapter "github.com/Authula/authula/adapters/fiber"
	"github.com/gofiber/fiber/v3"

	"montara-pass/server/internal/app"
	"montara-pass/server/internal/config"
	"montara-pass/server/internal/handlers"
	"montara-pass/server/internal/middlewares"
)

// Per-IP request budgets per minute: tight on the auth routes, loose on the
// rest of the API.
const (
	authRateLimit = 30
	apiRateLimit  = 120
)

func routes(r *fiber.App, app *app.Application) {
	h := handlers.New(app)
	m := middlewares.New(app)

	r.Get("/", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "Hello, World!",
		})
	})
	r.Get("/health", h.Health.Check)

	// Authula: email & password, Google OAuth2 and magic-link sign-in,
	// plus GET /me and POST /sign-out, all under authBasePath. The limiter
	// guards password guessing and sign-in/reset email flooding.
	r.Use(authBasePath,
		middlewares.RateLimit(authRateLimit, app.Config.App.Env == config.EnvDevelopment, splitCSV(app.Config.App.RateLimitExemptIPs)),
		fiberadapter.New(fiberadapter.Config{Handler: app.Auth.Handler()}),
	)

	exemptLoopback := app.Config.App.Env == config.EnvDevelopment
	exemptIPs := splitCSV(app.Config.App.RateLimitExemptIPs)

	// ponytail: the limiters count in memory, so each replica has its own
	// budget; give them shared storage once there is more than one instance.
	v1 := r.Group("/v1", middlewares.RateLimit(apiRateLimit, exemptLoopback, exemptIPs))

	// Reads are public; writes need a signed-in super user.
	categories := v1.Group("/categories")
	categories.Get("/", h.Category.List)
	categories.Get("/:id", h.Category.Get)
	categories.Post("/", m.Authorization, m.SuperUser, h.Category.Create)
	categories.Put("/:id", m.Authorization, m.SuperUser, h.Category.Update)
	categories.Delete("/:id", m.Authorization, m.SuperUser, h.Category.Delete)
	categories.Put("/:id/restore", m.Authorization, m.SuperUser, h.Category.Restore)
	categories.Delete("/:id/force", m.Authorization, m.SuperUser, h.Category.DeletePermanently)

	// The end-to-end encrypted vault: everything below needs a signed-in
	// user, and every payload is ciphertext the server cannot read.
	keys := v1.Group("/keys", m.Authorization)
	keys.Get("/", h.Key.Get)
	keys.Post("/", h.Key.Create)
	keys.Put("/", h.Key.UpdateKDF)
	keys.Get("/public", h.Key.PublicKey)

	folders := v1.Group("/folders", m.Authorization)
	folders.Get("/", h.Folder.List)
	folders.Post("/", h.Folder.Create)
	folders.Put("/:id", h.Folder.Update)
	folders.Delete("/:id", h.Folder.Delete)

	items := v1.Group("/items", m.Authorization)
	items.Get("/", h.Item.List)
	items.Post("/", h.Item.Create)
	items.Get("/:id", h.Item.Get)
	items.Put("/:id", h.Item.Update)
	items.Delete("/:id", h.Item.Delete)
	items.Put("/:id/restore", h.Item.Restore)
	items.Delete("/:id/force", h.Item.DeletePermanently)
	items.Put("/:id/placement", h.Item.SetPlacement)
	items.Put("/:id/key", h.Item.RotateKey)
	items.Get("/:id/members", h.Item.Members)
	items.Post("/:id/members", h.Item.Share)
	items.Put("/:id/members/:userId", h.Item.SetMemberRole)
	items.Delete("/:id/members/:userId", h.Item.RemoveMember)
}

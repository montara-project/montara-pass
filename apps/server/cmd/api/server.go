package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"path"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/getsentry/sentry-go"
	sentryfiber "github.com/gofiber/contrib/v3/sentry"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/compress"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/helmet"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/requestid"
	"github.com/gofiber/fiber/v3/middleware/static"

	"montara-pass/server/internal/app"
	"montara-pass/server/internal/middlewares"
)

// serve runs the HTTP server until SIGINT/SIGTERM, then drains in-flight
// requests before returning.
func serve(app *app.Application) error {
	server, err := newServer(app)
	if err != nil {
		return err
	}
	// A no-op unless newServer initialised Sentry.
	defer sentry.Flush(5 * time.Second)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	app.Logger.Info("starting server", "port", app.Config.App.Port, "env", app.Config.App.Env, "auth", authBasePath)
	return server.Listen(fmt.Sprintf(":%d", app.Config.App.Port), fiber.ListenConfig{GracefulContext: ctx})
}

// newServer builds the Fiber app with its middleware and routes.
func newServer(app *app.Application) (*fiber.App, error) {
	proxies := splitCSV(app.Config.App.TrustedProxies)

	server := fiber.New(fiber.Config{
		AppName:          app.Config.App.Name,
		ErrorHandler:     middlewares.ErrorHandler(app.Logger),
		TrustProxy:       len(proxies) > 0,
		TrustProxyConfig: fiber.TrustProxyConfig{Proxies: proxies},
		ProxyHeader:      fiber.HeaderXForwardedFor,
		// Bound how long a slow client can hold a connection.
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	})

	// Middleware
	server.Use(recover.New())
	server.Use(logger.New())
	server.Use(helmet.New())
	server.Use(requestid.New())
	server.Use(compress.New())

	// Sentry reports panics, and only when a DSN is configured.
	if dsn := app.Config.Sentry.Dsn; dsn != "" {
		if err := sentry.Init(sentry.ClientOptions{Dsn: dsn, Environment: app.Config.App.Env}); err != nil {
			return nil, fmt.Errorf("init sentry: %w", err)
		}

		server.Use(sentryfiber.New(sentryfiber.Config{
			Repanic:         true,
			WaitForDelivery: true,
			Timeout:         5 * time.Second,
		}))
	}

	origins := splitCSV(app.Config.App.CORSAllowedOrigins)

	// CSRF: the session cookie is SameSite=Lax, which a sibling subdomain can
	// get around. This covers Authula's routes too, as they are mounted here.
	server.Use(middlewares.CrossOrigin(origins))

	// Authula answers CORS for its own routes from the same origin list, so
	// the Fiber middleware skips them to avoid duplicate headers.
	if len(origins) > 0 {
		server.Use(cors.New(cors.Config{
			Next:             func(c fiber.Ctx) bool { return strings.HasPrefix(c.Path(), authBasePath) },
			AllowOrigins:     origins,
			AllowCredentials: true,
		}))
	}

	routes(server, app)

	serveWebApp(server, app)

	return server, nil
}

// publicDir holds the built web app (apps/app), relative to the working
// directory. The Docker image puts it at /app/public.
const publicDir = "./public"

// serveWebApp serves the single-page web app from publicDir, so one process
// answers both the API and the UI on one origin. Without the directory, as
// under `go run` in development, the API serves only itself and the Vite dev
// server takes the UI.
func serveWebApp(server *fiber.App, app *app.Application) {
	index := filepath.Join(publicDir, "index.html")
	if _, err := os.Stat(index); err != nil {
		app.Logger.Info("web app not found, serving the API only", "dir", publicDir)
		return
	}

	server.Use(static.New(publicDir))

	// The app routes on the client: /vault exists only in the browser, so a
	// reload asks for a file that is not there. A wildcard registered last
	// runs only when no real route matched, and routes() ends with a JSON 404
	// for everything under apiPrefix.
	fallback := func(c fiber.Ctx) error {
		// A path with a file extension is a missing asset, not a client route.
		if strings.Contains(path.Base(c.Path()), ".") {
			return fiber.ErrNotFound
		}
		return c.SendFile(index)
	}
	server.Get("/*", fallback)
	server.Head("/*", fallback)
}

package middlewares

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"

	"montara-pass/server/internal/lib/apperr"
)

// TestIPBlock checks that an IP is blocked after enough failures, whether a
// handler wrote them or returned them as errors, that successes and other
// statuses are not counted, and that an exempt IP is never blocked.
func TestIPBlock(t *testing.T) {
	newApp := func(exempt bool) *fiber.App {
		app := fiber.New(fiber.Config{ErrorHandler: ErrorHandler(slog.New(slog.NewTextHandler(io.Discard, nil)))})
		app.Use(IPBlock(IPBlockConfig{
			MaxFailures: 3,
			Window:      time.Minute,
			BlockFor:    time.Hour,
			Failed: func(c fiber.Ctx, status int) bool {
				return status == http.StatusUnauthorized || status == http.StatusTooManyRequests
			},
			Exempt: func(string) bool { return exempt },
		}, NewStore(nil), slog.New(slog.NewTextHandler(io.Discard, nil))))
		app.Get("/ok", func(c fiber.Ctx) error { return c.SendString("ok") })
		app.Get("/missing", func(c fiber.Ctx) error { return apperr.ErrNotFound })
		app.Get("/wrong", func(c fiber.Ctx) error { return c.SendStatus(http.StatusUnauthorized) })
		app.Get("/limited", func(c fiber.Ctx) error { return apperr.ErrTooManyRequests })
		return app
	}
	get := func(app *fiber.App, path string) *http.Response {
		t.Helper()
		res, err := app.Test(httptest.NewRequest(http.MethodGet, path, nil))
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
		return res
	}

	app := newApp(false)
	for _, path := range []string{"/wrong", "/ok", "/missing", "/missing", "/limited"} {
		if res := get(app, path); res.StatusCode == http.StatusTooManyRequests && path != "/limited" {
			t.Fatalf("%s blocked after two failures", path)
		}
	}
	if res := get(app, "/wrong"); res.StatusCode != http.StatusUnauthorized {
		t.Fatalf("third failure: %d, want its own 401", res.StatusCode)
	}
	res := get(app, "/ok")
	if res.StatusCode != http.StatusTooManyRequests || res.Header.Get(fiber.HeaderRetryAfter) == "" {
		t.Fatalf("after three failures: %d Retry-After=%q, want 429 with Retry-After", res.StatusCode, res.Header.Get(fiber.HeaderRetryAfter))
	}

	exempt := newApp(true)
	for range 5 {
		get(exempt, "/wrong")
	}
	if res := get(exempt, "/ok"); res.StatusCode != http.StatusOK {
		t.Fatalf("exempt ip: %d, want 200", res.StatusCode)
	}
}

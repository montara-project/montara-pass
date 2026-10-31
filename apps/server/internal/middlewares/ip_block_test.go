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
		}, NewIPKV(NewStore(nil)), slog.New(slog.NewTextHandler(io.Discard, nil))))
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

// TestIPBlockOnBlock checks that the block a super user writes with BlockIP
// is the one the middleware answers 429 on, that UnblockIP lets the IP
// through at once, and that OnBlock hears of an automatic block with how
// many failures earned it.
func TestIPBlockOnBlock(t *testing.T) {
	kv := NewIPKV(NewStore(nil))

	var blockedIP string
	var blockedFor time.Duration
	app := fiber.New(fiber.Config{ErrorHandler: ErrorHandler(slog.New(slog.NewTextHandler(io.Discard, nil)))})
	app.Use(IPBlock(IPBlockConfig{
		MaxFailures: 2,
		Window:      time.Minute,
		BlockFor:    time.Hour,
		Failed: func(c fiber.Ctx, status int) bool {
			return status == http.StatusUnauthorized
		},
		Exempt: func(string) bool { return false },
		OnBlock: func(ip string, until time.Time, failures int) {
			blockedIP = ip
			blockedFor = time.Until(until)
			if failures != 2 {
				t.Errorf("OnBlock: failures %d, want 2", failures)
			}
		},
	}, kv, slog.New(slog.NewTextHandler(io.Discard, nil))))
	app.Get("/ok", func(c fiber.Ctx) error { return c.SendString("ok") })
	app.Get("/wrong", func(c fiber.Ctx) error { return c.SendStatus(http.StatusUnauthorized) })

	get := func(path string) *http.Response {
		t.Helper()
		res, err := app.Test(httptest.NewRequest(http.MethodGet, path, nil))
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
		return res
	}

	get("/wrong")
	get("/wrong")
	if res := get("/ok"); res.StatusCode != http.StatusTooManyRequests {
		t.Fatalf("after two failures: %d, want 429", res.StatusCode)
	}
	if blockedIP == "" || blockedFor <= 55*time.Minute {
		t.Fatalf("OnBlock: ip=%q for=%v, want a block for about an hour", blockedIP, blockedFor)
	}

	// A manual block through the same keys, and its lift — in a store of its
	// own, for the IP the middleware saw above.
	kv2 := NewIPKV(NewStore(nil))
	BlockIP(kv2, blockedIP, time.Now().Add(time.Minute))
	manual := fiber.New(fiber.Config{ErrorHandler: ErrorHandler(slog.New(slog.NewTextHandler(io.Discard, nil)))})
	manual.Use(IPBlock(IPBlockConfig{Exempt: func(string) bool { return false }}, kv2, slog.New(slog.NewTextHandler(io.Discard, nil))))
	manual.Get("/ok", func(c fiber.Ctx) error { return c.SendString("ok") })
	res, err := manual.Test(httptest.NewRequest(http.MethodGet, "/ok", nil))
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != http.StatusTooManyRequests {
		t.Fatalf("manually blocked ip: %d, want 429", res.StatusCode)
	}

	UnblockIP(kv2, blockedIP)
	res, err = manual.Test(httptest.NewRequest(http.MethodGet, "/ok", nil))
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("unblocked ip: %d, want 200", res.StatusCode)
	}
}

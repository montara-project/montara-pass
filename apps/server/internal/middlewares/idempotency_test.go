package middlewares

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"montara-pass/server/internal/lib"
	"montara-pass/server/internal/lib/apperr"
)

func TestIdempotency(t *testing.T) {
	alice, bob := uuid.NewString(), uuid.NewString()
	var runs atomic.Int64

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c fiber.Ctx, err error) error {
			status := http.StatusInternalServerError
			if e, ok := err.(*apperr.Error); ok {
				status = int(e.Kind)
			}
			return c.Status(status).SendString(err.Error())
		},
	})
	// Stands in for Authorization: the test names the user in a header.
	app.Use(func(c fiber.Ctx) error {
		if uid, err := uuid.Parse(c.Get("X-User")); err == nil {
			lib.ContextSetUID(c, uid)
		}
		return c.Next()
	})
	app.Use(Idempotency())

	// Answers with how many times it has run, so a repeat can be told apart.
	count := func(c fiber.Ctx) error {
		c.Set("X-Request-Id", "first")
		return c.Status(http.StatusCreated).JSON(fiber.Map{"run": runs.Add(1), "body": string(c.Body())})
	}
	app.Post("/things", count)
	app.Put("/things/:id", count)
	app.Get("/things", count)
	app.Post("/fails", func(c fiber.Ctx) error {
		runs.Add(1)
		return apperr.New(apperr.KindConflict, "no")
	})

	send := func(method, path, user, key, body string) (int, string, http.Header) {
		t.Helper()
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("X-User", user)
		if key != "" {
			req.Header.Set(IdempotencyKeyHeader, key)
		}
		res, err := app.Test(req)
		if err != nil {
			t.Fatalf("%s %s: %v", method, path, err)
		}
		defer res.Body.Close()
		raw, _ := io.ReadAll(res.Body)
		return res.StatusCode, string(raw), res.Header
	}
	key := func() string { return uuid.NewString() }

	// The same request with the same key runs once and is answered alike.
	k := key()
	status, first, header := send(http.MethodPost, "/things", alice, k, `{"a":1}`)
	if status != http.StatusCreated || header.Get(IdempotencyReplayedHeader) != "" {
		t.Fatalf("first: %d %q %v", status, first, header)
	}
	status, again, header := send(http.MethodPost, "/things", alice, k, `{"a":1}`)
	if status != http.StatusCreated || again != first {
		t.Fatalf("repeat: %d %q, want 201 %q", status, again, first)
	}
	if header.Get(IdempotencyReplayedHeader) != "true" || header.Get("Content-Type") == "" || header.Get("X-Request-Id") != "" {
		t.Fatalf("headers of a repeat: %v", header)
	}
	if got := runs.Load(); got != 1 {
		t.Fatalf("ran %d times, want 1", got)
	}

	// A key repeats only the request it came with: not another user's, not
	// another address, method or body, and not without the header.
	for name, other := range map[string][5]string{
		"another user":    {http.MethodPost, "/things", bob, k, `{"a":1}`},
		"another body":    {http.MethodPost, "/things", alice, k, `{"a":2}`},
		"another address": {http.MethodPut, "/things/7", alice, k, `{"a":1}`},
		"another key":     {http.MethodPost, "/things", alice, key(), `{"a":1}`},
		"no key":          {http.MethodPost, "/things", alice, "", `{"a":1}`},
	} {
		before := runs.Load()
		_, body, header := send(other[0], other[1], other[2], other[3], other[4])
		if runs.Load() != before+1 || body == first || header.Get(IdempotencyReplayedHeader) != "" {
			t.Errorf("%s was answered from the first request: %q", name, body)
		}
	}

	// A safe method is never kept, key or not.
	before := runs.Load()
	send(http.MethodGet, "/things", alice, k, "")
	send(http.MethodGet, "/things", alice, k, "")
	if runs.Load() != before+2 {
		t.Errorf("GET was answered from the store")
	}

	// A request that failed is run again when it is sent again.
	k, before = key(), runs.Load()
	for range 2 {
		if status, _, header := send(http.MethodPost, "/fails", alice, k, ""); status != http.StatusConflict || header.Get(IdempotencyReplayedHeader) != "" {
			t.Fatalf("failing request: %d %v", status, header)
		}
	}
	if runs.Load() != before+2 {
		t.Errorf("a failed request was not run again")
	}

	// A key that is not one is refused, and a key needs a user.
	for _, bad := range []string{"short", strings.Repeat("a", 129), "has spaces in it, sixteen"} {
		if status, body, _ := send(http.MethodPost, "/things", alice, bad, ""); status != http.StatusBadRequest {
			t.Errorf("key %q: %d %q, want 400", bad, status, body)
		}
	}
	if status, _, _ := send(http.MethodPost, "/things", "", key(), ""); status != http.StatusUnauthorized {
		t.Errorf("key without a user: %d, want 401", status)
	}

	// Sent at the same moment, the request still runs once.
	k, before = key(), runs.Load()
	var wg sync.WaitGroup
	answers := make([]string, 8)
	for i := range answers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, answers[i], _ = send(http.MethodPost, "/things", alice, k, strconv.Itoa(1))
		}()
	}
	wg.Wait()
	if runs.Load() != before+1 {
		t.Errorf("ran %d times at once, want 1", runs.Load()-before)
	}
	for _, answer := range answers {
		if answer != answers[0] {
			t.Errorf("answers differ: %q and %q", answer, answers[0])
		}
	}
}

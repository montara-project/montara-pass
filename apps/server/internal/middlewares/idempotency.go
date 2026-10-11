package middlewares

import (
	"crypto/sha256"
	"encoding/hex"
	"regexp"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/idempotency"

	"montara-pass/server/internal/lib"
	"montara-pass/server/internal/lib/apperr"
)

const (
	// IdempotencyKeyHeader names the request a client may safely send again
	// (draft-ietf-httpapi-idempotency-key-header).
	IdempotencyKeyHeader = "Idempotency-Key"
	// IdempotencyReplayedHeader marks an answer that was given before and is
	// being repeated, not the result of running the request again.
	IdempotencyReplayedHeader = "Idempotent-Replayed"

	idempotencyLifetime = 30 * time.Minute
)

// A key is whatever the client made up, within reason: a UUID fits.
var idempotencyKey = regexp.MustCompile(`^[A-Za-z0-9_-]{16,128}$`)

// Idempotency lets a client repeat a write without it happening twice. A
// request that carries an Idempotency-Key is run once; sending it again within
// the lifetime gets the first answer back, and two at the same moment are
// taken one after the other. Without the header nothing changes, and so it is
// for safe methods.
//
// Only an answer the handler gave without an error is kept, so a request that
// failed can be sent again and is run again.
//
// It goes after Authorization: Fiber's middleware keys its store by the header
// alone, which would hand one user's answer to another who sent the same key.
// Here the key it sees is a digest of the user, the method, the address, the
// client's key and the body, so a key only ever repeats the request it was
// first sent with.
//
// The answers and the locks are kept in store: in Redis, shared by every
// replica, or in this process's memory without it. In memory a retry that
// reaches another replica is run again.
func Idempotency(store Store) fiber.Handler {
	replay := idempotency.New(idempotency.Config{
		Storage:   store.storage,
		Lock:      store.lock,
		KeyHeader: IdempotencyKeyHeader,
		// The client's key is checked below; what arrives here is the digest.
		KeyHeaderValidate: func(string) error { return nil },
		Lifetime:          idempotencyLifetime,
		// A repeated answer is the body and what it is, not the request id or
		// the rate limit counters of the first time.
		KeepResponseHeaders: []string{fiber.HeaderContentType},
	})

	return func(c fiber.Ctx) error {
		key := c.Get(IdempotencyKeyHeader)
		if key == "" || fiber.IsMethodSafe(c.Method()) {
			return c.Next()
		}
		if !idempotencyKey.MatchString(key) {
			return apperr.New(apperr.KindBadRequest, "%s must be 16 to 128 letters, digits, - or _", IdempotencyKeyHeader)
		}

		uid, err := lib.ContextGetUID(c)
		if err != nil {
			return apperr.ErrUnauthorized
		}

		digest := sha256.New()
		for _, part := range [][]byte{uid[:], []byte(c.Method()), []byte(c.OriginalURL()), []byte(key), c.Body()} {
			digest.Write(part)
			// Kept apart, so two parts cannot be read as one.
			digest.Write([]byte{0})
		}
		c.Request().Header.Set(IdempotencyKeyHeader, "idempotency:"+hex.EncodeToString(digest.Sum(nil)))

		if err := replay(c); err != nil {
			return err
		}
		if idempotency.IsFromCache(c) {
			c.Set(IdempotencyReplayedHeader, "true")
		}
		return nil
	}
}

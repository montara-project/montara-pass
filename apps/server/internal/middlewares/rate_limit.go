package middlewares

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"slices"
	"strings"
	"time"

	"montara-pass/server/internal/lib/apperr"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/limiter"
)

// RateLimit allows each client IP max requests a minute. name keeps this
// limiter's counts apart from another's in a shared store.
func RateLimit(name string, max int, exemptLoopback bool, exemptIPs []string, store Store) fiber.Handler {
	return limiter.New(limiter.Config{
		Storage: store.storage,
		KeyGenerator: func(c fiber.Ctx) string {
			return "ratelimit:" + name + ":" + c.IP()
		},
		Next: func(c fiber.Ctx) bool {
			return slices.Contains(exemptIPs, c.IP()) || (exemptLoopback && (c.IP() == "127.0.0.1" || c.IP() == "::1"))
		},
		Max:        max,
		Expiration: time.Minute,
		LimitReached: func(c fiber.Ctx) error {
			return apperr.ErrTooManyRequests
		},
	})
}

// RateLimitEmail allows max requests a minute for each email address named in
// a JSON body, whatever address they come from: guessing one account's
// password from many IPs is counted as one client. A request that names no
// email passes.
//
// ponytail: someone flooding an address also slows its owner's sign-in while
// the flood lasts. A lockout that tells the two apart needs a second factor.
func RateLimitEmail(name string, max int, store Store) fiber.Handler {
	return limiter.New(limiter.Config{
		Storage: store.storage,
		KeyGenerator: func(c fiber.Ctx) string {
			// Hashed, so a body cannot choose the length of the key.
			sum := sha256.Sum256([]byte(bodyEmail(c)))
			return "ratelimit:" + name + ":" + hex.EncodeToString(sum[:])
		},
		Next: func(c fiber.Ctx) bool {
			return bodyEmail(c) == ""
		},
		Max:        max,
		Expiration: time.Minute,
		LimitReached: func(c fiber.Ctx) error {
			return apperr.ErrTooManyRequests
		},
	})
}

// bodyEmail is the "email" of a JSON body, as one account spells it.
func bodyEmail(c fiber.Ctx) string {
	var body struct {
		Email string `json:"email"`
	}
	_ = json.Unmarshal(c.Body(), &body)
	return strings.ToLower(strings.TrimSpace(body.Email))
}

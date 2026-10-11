package middlewares

import (
	"slices"
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
			return slices.Contains(exemptIPs, c.IP()) || (exemptLoopback && c.IP() == "127.0.0.1")
		},
		Max:        max,
		Expiration: time.Minute,
		LimitReached: func(c fiber.Ctx) error {
			return apperr.ErrTooManyRequests
		},
	})
}

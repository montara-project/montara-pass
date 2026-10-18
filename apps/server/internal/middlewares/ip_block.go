package middlewares

import (
	"errors"
	"log/slog"
	"strconv"
	"sync"
	"time"

	"github.com/gofiber/fiber/v3"

	"montara-pass/server/internal/lib/apperr"
)

// IPBlockConfig says when IPBlock shuts a client IP out.
type IPBlockConfig struct {
	// MaxFailures failed requests, each less than Window after the one before,
	// block the IP for BlockFor.
	MaxFailures int
	Window      time.Duration
	BlockFor    time.Duration
	// Failed reports whether a request that answered status counts against its IP.
	Failed func(c fiber.Ctx, status int) bool
	// Exempt IPs are never counted nor blocked.
	Exempt func(ip string) bool
}

// IPBlock shuts out a client IP that keeps failing: guessing passwords and
// codes, or running into the rate limiter as a bot does. A blocked IP is
// answered 429 with Retry-After on every request until the block runs out,
// before anything else is done for it. The rate limiter slows one client
// down; this stops the one that does not slow down.
//
// ponytail: the count is read and written back, not incremented atomically,
// so failures that arrive together in Redis may be counted as one; a burst
// that size still meets the rate limiter, and its 429s count too.
func IPBlock(cfg IPBlockConfig, store Store, logger *slog.Logger) fiber.Handler {
	var kv keyValue = store.storage
	if store.storage == nil {
		kv = &memoryKV{entries: map[string]memoryEntry{}}
	}

	return func(c fiber.Ctx) error {
		ip := c.IP()
		if cfg.Exempt(ip) {
			return c.Next()
		}

		blockKey, failKey := "ipblock:"+ip, "ipfail:"+ip
		if until, _ := kv.Get(blockKey); until != nil {
			if unix, err := strconv.ParseInt(string(until), 10, 64); err == nil {
				c.Set(fiber.HeaderRetryAfter, strconv.FormatInt(max(unix-time.Now().Unix(), 1), 10))
			}
			return apperr.New(apperr.KindTooManyRequests, "too many failed requests from this address, try again later")
		}

		err := c.Next()
		if !cfg.Failed(c, statusOf(c, err)) {
			return err
		}

		raw, _ := kv.Get(failKey)
		failures, _ := strconv.Atoi(string(raw))
		failures++
		if failures < cfg.MaxFailures {
			_ = kv.Set(failKey, []byte(strconv.Itoa(failures)), cfg.Window)
			return err
		}

		until := time.Now().Add(cfg.BlockFor).Unix()
		_ = kv.Set(blockKey, []byte(strconv.FormatInt(until, 10)), cfg.BlockFor)
		_ = kv.Delete(failKey)
		logger.Warn("blocked client ip", "ip", ip, "failures", failures, "for", cfg.BlockFor, "path", c.Path())
		return err
	}
}

// statusOf is the status a request answers with: the one already written, or
// the one ErrorHandler will give the error the handler returned.
func statusOf(c fiber.Ctx, err error) int {
	if err == nil {
		return c.Response().StatusCode()
	}
	var fe *fiber.Error
	if errors.As(err, &fe) {
		return fe.Code
	}
	status, _ := apperr.From(err)
	return status
}

// keyValue is the part of fiber.Storage IPBlock uses.
type keyValue interface {
	Get(key string) ([]byte, error)
	Set(key string, val []byte, exp time.Duration) error
	Delete(key string) error
}

// memoryKV keeps IPBlock's counts and blocks where there is no Redis, for a
// single instance.
type memoryKV struct {
	mu      sync.Mutex
	entries map[string]memoryEntry
}

type memoryEntry struct {
	val     []byte
	expires time.Time
}

// memorySweepAt is the size at which expired entries are dropped, so IPs
// that fail once and never return do not pile up.
const memorySweepAt = 10_000

func (m *memoryKV) Get(key string) ([]byte, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	e, ok := m.entries[key]
	if !ok || time.Now().After(e.expires) {
		return nil, nil
	}
	return e.val, nil
}

func (m *memoryKV) Set(key string, val []byte, exp time.Duration) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if len(m.entries) >= memorySweepAt {
		now := time.Now()
		for k, e := range m.entries {
			if now.After(e.expires) {
				delete(m.entries, k)
			}
		}
	}
	m.entries[key] = memoryEntry{val: val, expires: time.Now().Add(exp)}
	return nil
}

func (m *memoryKV) Delete(key string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.entries, key)
	return nil
}

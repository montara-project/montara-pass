package middlewares

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sync"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/idempotency"
	redisstorage "github.com/gofiber/storage/redis/v3"
	"github.com/redis/go-redis/v9"
)

// Store is where the rate limiter and the idempotency middleware keep what
// they must remember between requests. With Redis every replica sees the same
// counts, answers and locks; without it each keeps its own, in memory, which
// is right for a single instance.
type Store struct {
	// Both are nil without Redis, which makes Fiber fall back to memory.
	storage fiber.Storage
	lock    idempotency.Locker
}

// NewStore builds the store on a Redis client, or in memory when it is nil.
// The client stays the caller's to close.
func NewStore(client redis.UniversalClient) Store {
	if client == nil {
		return Store{}
	}
	return Store{
		storage: redisstorage.NewFromConnection(client),
		lock:    &redisLock{client: client},
	}
}

const (
	// A lock outlives no request: the server's write timeout is 30 seconds.
	lockLifetime = 30 * time.Second
	lockRetry    = 25 * time.Millisecond
	lockPrefix   = "lock:"
)

var errLockTimeout = errors.New("timed out waiting for the idempotency lock")

// Deletes the lock only if it is still the one this holder took: after
// lockLifetime it may have passed to someone else.
var unlockScript = redis.NewScript(`
if redis.call("get", KEYS[1]) == ARGV[1] then
	return redis.call("del", KEYS[1])
end
return 0`)

// redisLock is the lock of the idempotency middleware across replicas: one
// key in Redis per idempotency key, taken with SET NX and a lifetime.
//
// ponytail: a waiter asks again every lockRetry instead of being woken, and
// the lock is one Redis node's word (no Redlock). Both are enough for
// keeping two copies of one request apart for the length of a handler.
type redisLock struct {
	client redis.UniversalClient

	mu sync.Mutex
	// The tokens each held key was taken with, oldest first, for the unlock.
	// More than one when a lock ran out under its holder and another request
	// took the key: Unlock does not say who is calling, and the one that ran
	// out is the one that started first.
	held map[string][]string
}

func (l *redisLock) Lock(key string) error {
	raw := make([]byte, 16)
	if _, err := rand.Read(raw); err != nil {
		return err
	}
	token := hex.EncodeToString(raw)

	ctx, cancel := context.WithTimeout(context.Background(), lockLifetime)
	defer cancel()

	for {
		ok, err := l.client.SetNX(ctx, lockPrefix+key, token, lockLifetime).Result()
		if err != nil {
			if errors.Is(err, context.DeadlineExceeded) {
				return errLockTimeout
			}
			return err
		}
		if ok {
			l.mu.Lock()
			if l.held == nil {
				l.held = map[string][]string{}
			}
			l.held[key] = append(l.held[key], token)
			l.mu.Unlock()
			return nil
		}

		select {
		case <-ctx.Done():
			return errLockTimeout
		case <-time.After(lockRetry):
		}
	}
}

func (l *redisLock) Unlock(key string) error {
	l.mu.Lock()
	tokens := l.held[key]
	if len(tokens) == 0 {
		l.mu.Unlock()
		return nil
	}
	token := tokens[0]
	if len(tokens) == 1 {
		delete(l.held, key)
	} else {
		l.held[key] = tokens[1:]
	}
	l.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return unlockScript.Run(ctx, l.client, []string{lockPrefix + key}, token).Err()
}

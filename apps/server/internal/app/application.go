package app

import (
	"database/sql"
	"log/slog"

	authula "github.com/Authula/authula"
	"github.com/redis/go-redis/v9"

	"montara-pass/server/internal/config"
	"montara-pass/server/internal/lib"
	"montara-pass/server/internal/lib/borderpay"
	"montara-pass/server/internal/lib/lemonsqueezy"
	"montara-pass/server/internal/repositories"
)

// Version is the release the binary was built from. The Docker build sets it
// with -ldflags from the git tag; anything else reports "dev".
var Version = "dev"

type Application struct {
	Config       config.Config
	Logger       *slog.Logger
	DB           *sql.DB
	Repositories repositories.Repositories
	Auth         *authula.Auth
	// Redis is nil unless REDIS_URL is set; see middlewares.NewStore.
	Redis redis.UniversalClient
	// Payments is nil unless billing can take payments: the Cloud Edition
	// with LEMONSQUEEZY_API_KEY set.
	Payments *lemonsqueezy.Client
	// BorderPay is nil unless the IDR plans can be paid: the Cloud Edition
	// with BORDERPAY_API_KEY set. It sells the plans priced in IDR.
	BorderPay *borderpay.Client
	// IPKV is where the IP blocks live: what IPBlock counts and answers 429
	// on, what a manual block writes and a lift deletes, and what a boot
	// restores the active manual blocks into. In Redis when there is one, so
	// replicas share it, and in memory otherwise.
	IPKV lib.IPKV
}

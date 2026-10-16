package main

import (
	"flag"
	"fmt"
	"log"
	"net/netip"
	"net/url"
	"os"
	"slices"
	"strconv"
	"strings"
	"time"

	authulaenv "github.com/Authula/authula/env"
	"github.com/joho/godotenv"

	"montara-pass/server/internal/config"
	"montara-pass/server/internal/seeders"
)

// Every flag defaults to its environment variable, so `pnpm dev` (which loads
// .env) and the container (which sets ENV) need no argument list; an explicit
// flag still wins over the environment.

func envString(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	v, ok := os.LookupEnv(key)
	if !ok || v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		log.Fatalf("env %s: %q is not a boolean", key, v)
	}
	return b
}

func envInt(key string, fallback int) int {
	v, ok := os.LookupEnv(key)
	if !ok {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		log.Fatalf("env %s: %q is not an integer", key, v)
	}
	return n
}

func envDuration(key string, fallback time.Duration) time.Duration {
	v, ok := os.LookupEnv(key)
	if !ok {
		return fallback
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		log.Fatalf("env %s: %q is not a duration", key, v)
	}
	return d
}

// minSecretLen is the shortest APP_SECRET accepted, 256 bits for HS256.
const minSecretLen = 32

func parseFlag(cfg *config.Config) {
	// A local .env is loaded if present; real environment variables win.
	_ = godotenv.Load()

	// App
	flag.StringVar(&cfg.App.Env, "env", envString("ENV", config.EnvProduction), "Environment: development, staging or production")
	flag.BoolVar(&cfg.App.Debug, "debug", envBool("DEBUG", false), "Debug mode (also enabled by DEBUG=true)")
	flag.IntVar(&cfg.App.Port, "port", envInt("PORT", 8080), "Port")
	flag.StringVar(&cfg.App.Name, "app-name", envString("APP_NAME", "montara-pass"), "App Name")
	flag.StringVar(&cfg.App.Secret, "app-secret", envString("APP_SECRET", ""), "App Secret")

	// CORS
	flag.StringVar(&cfg.App.CORSAllowedOrigins, "cors-allowed-origins", envString("CORS_ALLOWED_ORIGINS", ""), "Comma-separated browser origins allowed by CORS (empty disables CORS)")

	// Rate Limit
	flag.StringVar(&cfg.App.RateLimitExemptIPs, "rate-limit-exempt-ips", envString("RATE_LIMIT_EXEMPT_IPS", ""), "Comma-separated client IPs exempt from the rate limiter")

	// Trusted Proxies
	flag.StringVar(&cfg.App.TrustedProxies, "trusted-proxies", envString("TRUSTED_PROXIES", ""), "Comma-separated IPs/CIDRs trusted to supply X-Forwarded-For (e.g. the reverse proxy's address)")

	// Database
	flag.StringVar(&cfg.DB.DSN, "db-dsn", envString("DB_DSN", ""), "Database DSN")
	flag.IntVar(&cfg.DB.MaxOpenConns, "db-max-open-conns", envInt("DB_MAX_OPEN_CONNS", 25), "Database max open connections")
	flag.IntVar(&cfg.DB.MaxIdleConns, "db-max-idle-conns", envInt("DB_MAX_IDLE_CONNS", 25), "Database max idle connections")
	flag.DurationVar(&cfg.DB.MaxIdleTime, "db-max-idle-time", envDuration("DB_MAX_IDLE_TIME", 15*time.Minute), "Database max idle time")

	// Boot
	flag.BoolVar(&cfg.App.MigrateOnBoot, "migrate-on-boot", envBool("MIGRATE_ON_BOOT", false), "Apply embedded migrations before serving")
	flag.BoolVar(&cfg.App.SeedOnBoot, "seed-on-boot", envBool("SEED_ON_BOOT", false), "Create or update the super user before serving (needs super-user)")
	superUser := flag.String("super-user", envString("SUPER_USER", ""), "Super user seeded on boot, as email:password (required with seed-on-boot)")

	// Auth (Authula). The env names match the ones Authula itself reads.
	flag.StringVar(&cfg.Auth.BaseURL, "auth-base-url", envString("AUTH_BASE_URL", ""), "Public URL of this API, used in auth email links and OAuth callbacks (default http://localhost:<port>)")
	flag.StringVar(&cfg.Auth.EmailFrom, "email-from", envString("FROM_ADDRESS", ""), "Sender address for auth emails")
	flag.StringVar(&cfg.Auth.ResendAPIKey, "resend-api-key", envString("RESEND_API_KEY", ""), "Resend API key for auth emails")
	flag.StringVar(&cfg.Auth.GoogleClientID, "google-client-id", envString("GOOGLE_CLIENT_ID", ""), "Google OAuth client ID (empty disables Google sign-in)")
	flag.StringVar(&cfg.Auth.GoogleClientSecret, "google-client-secret", envString("GOOGLE_CLIENT_SECRET", ""), "Google OAuth client secret")

	// Redis
	flag.StringVar(&cfg.Redis.URL, "redis-url", envString("REDIS_URL", ""), "Redis URL shared by the rate limiter and idempotency keys, e.g. redis://localhost:6379/0 (empty keeps them in memory)")

	// Billing (Cloud Edition)
	flag.StringVar(&cfg.Billing.LemonSqueezyAPIKey, "lemonsqueezy-api-key", envString("LEMONSQUEEZY_API_KEY", ""), "Lemon Squeezy API key for billing (empty disables checkout)")
	flag.StringVar(&cfg.Billing.LemonSqueezyStoreID, "lemonsqueezy-store-id", envString("LEMONSQUEEZY_STORE_ID", ""), "Lemon Squeezy store id that sells the plans")
	flag.StringVar(&cfg.Billing.LemonSqueezyWebhookSecret, "lemonsqueezy-webhook-secret", envString("LEMONSQUEEZY_WEBHOOK_SECRET", ""), "Signing secret of the store's Lemon Squeezy webhook")
	flag.BoolVar(&cfg.Billing.RequirePaidSharing, "require-paid-sharing", envBool("REQUIRE_PAID_SHARING", false), "Sharing an item needs a paid plan (needs lemonsqueezy-api-key)")

	// Sentry
	flag.StringVar(&cfg.Sentry.Dsn, "sentry-dsn", envString("SENTRY_DSN", ""), "Sentry DSN")

	flag.Parse()

	// Cut at the first colon: an email has none, a password may.
	cfg.App.SuperUserEmail, cfg.App.SuperUserPassword, _ = strings.Cut(*superUser, ":")

	if cfg.Auth.BaseURL == "" {
		cfg.Auth.BaseURL = fmt.Sprintf("http://localhost:%d", cfg.App.Port)
	}

	validateFlag(cfg)
}

func validateFlag(cfg *config.Config) {
	if !slices.Contains([]string{config.EnvDevelopment, config.EnvStaging, config.EnvProduction}, cfg.App.Env) {
		log.Fatalf("flag env must be development, staging or production, got %q", cfg.App.Env)
	}

	// Debug logging prints every Authula query with its values, password
	// hashes included.
	if cfg.App.Debug && cfg.App.Env == config.EnvProduction {
		log.Fatal("flag debug must not be enabled in production")
	}

	// Authula prefers this variable over the DSN it is given, which would
	// drop the search_path that keeps its tables in their own schema.
	if os.Getenv(authulaenv.EnvDatabaseURL) != "" {
		log.Fatalf("env %s must not be set: Authula uses db-dsn", authulaenv.EnvDatabaseURL)
	}

	if cfg.App.Port <= 0 || cfg.App.Port > 65535 {
		log.Fatalf("flag port must be between 1 and 65535, got %d", cfg.App.Port)
	}

	// The secret signs HS256 access tokens; a short one can be brute-forced.
	if len(cfg.App.Secret) < minSecretLen {
		log.Fatalf("flag app-secret must be at least %d characters (try: openssl rand -base64 32)", minSecretLen)
	}

	if cfg.DB.DSN == "" {
		log.Fatal("flag db-dsn must be provided")
	}

	// The Community Edition has no sign-up: its only account is the super
	// user, which the seeder creates.
	if config.Community() && !cfg.App.SeedOnBoot {
		log.Fatal("community edition needs seed-on-boot and super-user: the super user is its only account")
	}

	if cfg.App.SeedOnBoot {
		if err := seeders.ValidateSuperUser(cfg.App.SuperUserEmail, cfg.App.SuperUserPassword); err != nil {
			log.Fatalf("flag super-user %v", err)
		}
	}

	// CORS entries feed fiber's origin allowlist, so each must be an origin
	// (scheme + host [+ port], no path) — never "*" alongside credentials.
	for _, origin := range splitCSV(cfg.App.CORSAllowedOrigins) {
		u, err := url.Parse(origin)
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" || (u.Path != "" && u.Path != "/") {
			log.Fatalf("flag cors-allowed-origins: %q must be an origin like https://app.example.com", origin)
		}
	}

	// Authula appends its base path to this URL for email links and OAuth
	// redirects, so it must be a bare origin.
	if u, err := url.Parse(cfg.Auth.BaseURL); err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" || (u.Path != "" && u.Path != "/") {
		log.Fatalf("flag auth-base-url: %q must be an origin like https://api.example.com", cfg.Auth.BaseURL)
	}
	cfg.Auth.BaseURL = strings.TrimSuffix(cfg.Auth.BaseURL, "/")

	// Verification, password reset and magic-link sign-in all send email, so
	// the Cloud Edition needs a sender and a Resend key. The Community
	// Edition's one account is seeded verified and SUPER_USER resets its
	// password, so there both may be left out, but not just one.
	if (cfg.Auth.EmailFrom == "") != (cfg.Auth.ResendAPIKey == "") {
		log.Fatal("flags email-from and resend-api-key must be provided together")
	}
	if cfg.Auth.ResendAPIKey == "" && !config.Community() {
		log.Fatal("flags email-from and resend-api-key must be provided")
	}

	// Payments need all three: the key sells, the store is what it sells
	// from, and the secret is how a webhook is believed.
	b := cfg.Billing
	if (b.LemonSqueezyAPIKey == "") != (b.LemonSqueezyStoreID == "") || (b.LemonSqueezyAPIKey == "") != (b.LemonSqueezyWebhookSecret == "") {
		log.Fatal("flags lemonsqueezy-api-key, lemonsqueezy-store-id and lemonsqueezy-webhook-secret must be provided together")
	}
	if _, err := strconv.ParseUint(b.LemonSqueezyStoreID, 10, 64); b.LemonSqueezyStoreID != "" && err != nil {
		log.Fatalf("flag lemonsqueezy-store-id: %q is not a store id", b.LemonSqueezyStoreID)
	}

	// A gate without payments would be one nobody could get through.
	if b.RequirePaidSharing && config.Community() {
		log.Fatal("flag require-paid-sharing: the community edition has no sharing")
	}
	if b.RequirePaidSharing && b.LemonSqueezyAPIKey == "" {
		log.Fatal("flag require-paid-sharing needs lemonsqueezy-api-key, so the plan can be bought")
	}

	if (cfg.Auth.GoogleClientID == "") != (cfg.Auth.GoogleClientSecret == "") {
		log.Fatal("flags google-client-id and google-client-secret must be provided together")
	}

	// Entries feed fiber.TrustProxyConfig.Proxies — a malformed one panics in
	// fiber.New, so reject it here with a readable flag error.
	for _, p := range splitCSV(cfg.App.TrustedProxies) {
		if _, err := netip.ParseAddr(p); err != nil {
			if _, err := netip.ParsePrefix(p); err != nil {
				log.Fatalf("flag trusted-proxies: %q is not an IP address or CIDR", p)
			}
		}
	}
}

// splitCSV splits a comma-separated list, trimming spaces and dropping empty
// entries so an unset or blank value yields no elements.
func splitCSV(s string) []string {
	var out []string
	for _, part := range strings.Split(s, ",") {
		if part = strings.TrimSpace(part); part != "" {
			out = append(out, part)
		}
	}
	return out
}

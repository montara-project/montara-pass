package config

import (
	"log"
	"time"
)

// Accepted App.Env values. Only EnvDevelopment enables development-only
// behaviour: the loopback rate-limit exemption and session cookies without
// Secure. The default is EnvProduction, so forgetting ENV fails safe.
const (
	EnvDevelopment = "development"
	EnvStaging     = "staging"
	EnvProduction  = "production"
)

// Edition is the build's edition: EditionCloud (sign-up and sharing) or
// EditionCommunity (one self-hosted user, neither). The Docker build sets it
// with -ldflags; the web app inside the image is built for the same one.
var Edition = EditionCloud

const (
	EditionCloud     = "cloud"
	EditionCommunity = "community"
)

// A mistyped -ldflags value stops every binary, cmd/migrate included, before
// it acts as the wrong edition.
func init() {
	if Edition != EditionCloud && Edition != EditionCommunity {
		log.Fatalf("edition must be %s or %s, got %q", EditionCloud, EditionCommunity, Edition)
	}
}

// Community reports whether this is the Community Edition.
func Community() bool {
	return Edition == EditionCommunity
}

// SessionCookieName is the cookie Authula issues on sign-in; the API's
// authorization middleware reads the same cookie.
const SessionCookieName = "authula.session_token"

type Config struct {
	App     ConfigApp
	DB      ConfigDB
	Auth    ConfigAuth
	Sentry  ConfigSentry
	Redis   ConfigRedis
	Billing ConfigBilling
}

// ConfigBilling configures payments through Lemon Squeezy, Cloud Edition
// only. Without an API key the plans are still listed, but nothing can be
// bought.
type ConfigBilling struct {
	LemonSqueezyAPIKey string
	// The store that sells the plans, by its numeric id.
	LemonSqueezyStoreID string
	// Signs the webhooks; set the same one on the store's webhook.
	LemonSqueezyWebhookSecret string
	// RequirePaidSharing gates sharing an item on a paid plan. It needs
	// payments, so that the plan can be bought.
	RequirePaidSharing bool
}

// ConfigAuth configures the embedded Authula server. Without a Resend key,
// which only the Community Edition allows, no auth email is sent.
type ConfigAuth struct {
	BaseURL            string
	EmailFrom          string
	ResendAPIKey       string
	GoogleClientID     string
	GoogleClientSecret string
}

type ConfigApp struct {
	Env                string
	Debug              bool
	Port               int
	Name               string
	Secret             string
	MigrateOnBoot      bool
	SeedOnBoot         bool
	SuperUserEmail     string
	SuperUserPassword  string
	CORSAllowedOrigins string
	RateLimitExemptIPs string
	TrustedProxies     string
}

type ConfigDB struct {
	DSN          string
	MaxOpenConns int
	MaxIdleConns int
	MaxIdleTime  time.Duration
}

// ConfigRedis points at the Redis the rate limiter and the idempotency
// middleware share between replicas. Without a URL they keep their state in
// this process's memory.
type ConfigRedis struct {
	URL string
}

type ConfigSentry struct {
	Dsn string
}

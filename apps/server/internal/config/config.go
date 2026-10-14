package config

import "time"

// Accepted App.Env values. Only EnvDevelopment enables development-only
// behaviour: the loopback rate-limit exemption and session cookies without
// Secure. The default is EnvProduction, so forgetting ENV fails safe.
const (
	EnvDevelopment = "development"
	EnvStaging     = "staging"
	EnvProduction  = "production"
)

// Edition is the build's edition: EditionEnterprise (sign-up and sharing) or
// EditionCommunity (one self-hosted user, neither). The Docker build sets it
// with -ldflags; the web app inside the image is built for the same one.
var Edition = EditionEnterprise

const (
	EditionEnterprise = "ee"
	EditionCommunity  = "ce"
)

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

// ConfigBilling configures payments, Enterprise Edition only. Without a
// Midtrans server key the plans are still listed, but nothing can be bought.
type ConfigBilling struct {
	MidtransServerKey  string
	MidtransProduction bool
}

// ConfigAuth configures the embedded Authula server.
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

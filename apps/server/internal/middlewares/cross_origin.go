package middlewares

import (
	"net/url"
	"slices"
	"strings"

	"github.com/gofiber/fiber/v3"

	"montara-pass/server/internal/lib/apperr"
)

// crossOrigin reports whether a browser sent a state-changing request from an
// origin other than this API's own. Browsers set Sec-Fetch-Site themselves and
// scripts cannot change it; a request without it comes from a non-browser
// client, or an old browser, and is judged by its Origin header instead.
func crossOrigin(method, fetchSite, origin, host string, trusted []string) bool {
	switch method {
	case fiber.MethodGet, fiber.MethodHead, fiber.MethodOptions:
		return false
	}
	if slices.Contains(trusted, origin) || isExtensionOrigin(origin) {
		return false
	}

	switch fetchSite {
	case "same-origin", "none":
		return false
	case "":
		if origin == "" {
			return false
		}
		u, err := url.Parse(origin)
		return err != nil || u.Host != host
	}
	// cross-site, and same-site: a sibling subdomain is not trusted either.
	return true
}

// isExtensionOrigin reports whether a request comes from a browser extension's
// own pages. A website cannot forge the Origin header, so this origin means
// code the user installed and granted access to this host; it is not the
// cross-site web page this check exists to stop. The id after the scheme is
// different for every Firefox installation, so it cannot be listed as trusted.
func isExtensionOrigin(origin string) bool {
	return strings.HasPrefix(origin, "chrome-extension://") || strings.HasPrefix(origin, "moz-extension://")
}

// CrossOrigin refuses state-changing requests that a browser sends from
// another origin, unless that origin is trusted. It is the CSRF defence for
// the cookie session, and needs no token from clients.
func CrossOrigin(trusted []string) fiber.Handler {
	return func(c fiber.Ctx) error {
		if crossOrigin(c.Method(), c.Get("Sec-Fetch-Site"), c.Get(fiber.HeaderOrigin), c.Host(), trusted) {
			return apperr.New(apperr.KindForbidden, "cross-origin request refused")
		}
		return c.Next()
	}
}

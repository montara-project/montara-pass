package handlers

import (
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v3"

	"montara-pass/server/internal/app"
	"montara-pass/server/internal/config"
	"montara-pass/server/internal/models"
)

// TestRegionCurrency checks who buys in which currency: Indonesia in IDR,
// everywhere else in USD, by the country header a trusted proxy sets.
func TestRegionCurrency(t *testing.T) {
	answer := func(header string, trusted []string, country string) string {
		t.Helper()
		h := &billingHandler{app: &app.Application{Config: config.Config{Billing: config.ConfigBilling{CountryHeader: header}}}}
		server := fiber.New(fiber.Config{
			TrustProxy:       len(trusted) > 0,
			TrustProxyConfig: fiber.TrustProxyConfig{Proxies: trusted},
		})
		server.Get("/", func(c fiber.Ctx) error { return c.SendString(h.regionCurrency(c)) })

		req := httptest.NewRequest(fiber.MethodGet, "/", nil)
		if country != "" {
			req.Header.Set("CF-IPCountry", country)
		}
		res, err := server.Test(req)
		if err != nil {
			t.Fatal(err)
		}
		body := make([]byte, 8)
		n, _ := res.Body.Read(body)
		return string(body[:n])
	}

	// The test request comes from 0.0.0.0.
	self := []string{"0.0.0.0"}
	cases := []struct {
		name, header string
		trusted      []string
		country      string
		want         string
	}{
		{"no header configured", "", self, "ID", ""},
		{"Indonesia", "CF-IPCountry", self, "ID", "IDR"},
		{"lower case", "CF-IPCountry", self, " id ", "IDR"},
		{"elsewhere", "CF-IPCountry", self, "SG", "USD"},
		{"unknown to the proxy", "CF-IPCountry", self, "XX", "USD"},
		{"no country sent", "CF-IPCountry", self, "", "USD"},
		// A client that reaches the API past the proxy cannot claim Indonesia.
		{"untrusted sender", "CF-IPCountry", []string{"10.0.0.1"}, "ID", "USD"},
	}
	for _, c := range cases {
		if got := answer(c.header, c.trusted, c.country); got != c.want {
			t.Errorf("%s: %q, want %q", c.name, got, c.want)
		}
	}

	idr, usd := models.Plan{Currency: "IDR"}, models.Plan{Currency: "USD"}
	for _, c := range []struct {
		plan     models.Plan
		currency string
		want     bool
	}{
		{idr, "IDR", true}, {usd, "IDR", false},
		{idr, "USD", false}, {usd, "USD", true},
		{idr, "", true}, {usd, "", true},
	} {
		if got := soldIn(c.plan, c.currency); got != c.want {
			t.Errorf("soldIn(%s plan, %q) = %v, want %v", c.plan.Currency, c.currency, got, c.want)
		}
	}
}

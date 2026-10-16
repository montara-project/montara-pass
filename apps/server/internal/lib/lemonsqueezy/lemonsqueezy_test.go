package lemonsqueezy

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestVerify(t *testing.T) {
	c := New("key", "1", "whsec")
	body := []byte(`{"meta":{"event_name":"order_created"}}`)
	mac := hmac.New(sha256.New, []byte("whsec"))
	mac.Write(body)
	signature := hex.EncodeToString(mac.Sum(nil))

	if !c.Verify(body, signature) {
		t.Error("a correctly signed body was refused")
	}
	if c.Verify([]byte(`{"meta":{"event_name":"order_refunded"}}`), signature) {
		t.Error("a changed body was believed")
	}
	if c.Verify(body, "") || New("key", "1", "other").Verify(body, signature) {
		t.Error("a body without, or with another, signature was believed")
	}
}

func TestSubscriptionPeriod(t *testing.T) {
	renews := time.Date(2026, 11, 16, 0, 0, 0, 0, time.UTC)
	ends := time.Date(2026, 12, 1, 0, 0, 0, 0, time.UTC)
	cases := []struct {
		status string
		endsAt *time.Time
		live   bool
		end    time.Time
	}{
		{"active", nil, true, renews},
		{"on_trial", nil, true, renews},
		{"past_due", nil, true, renews},
		{"cancelled", &ends, true, ends},
		{"paused", nil, false, renews},
		{"unpaid", nil, false, renews},
		{"expired", &ends, false, ends},
	}
	for _, c := range cases {
		a := Attributes{Status: c.status, RenewsAt: renews, EndsAt: c.endsAt}
		if a.Live() != c.live || !a.PeriodEnd().Equal(c.end) {
			t.Errorf("%s: live=%v end=%v, want %v %v", c.status, a.Live(), a.PeriodEnd(), c.live, c.end)
		}
	}
}

func TestEventVariant(t *testing.T) {
	var order, subscription Event
	if err := json.Unmarshal([]byte(`{"meta":{"event_name":"order_created","custom_data":{"order_id":"buy-x"}},
		"data":{"id":"9","attributes":{"status":"paid","first_order_item":{"variant_id":42}}}}`), &order); err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal([]byte(`{"meta":{"event_name":"subscription_created","custom_data":{"order_id":"sub-x"}},
		"data":{"id":"7","attributes":{"status":"active","variant_id":43,"renews_at":"2026-11-16T12:00:00.000000Z","ends_at":null}}}`), &subscription); err != nil {
		t.Fatal(err)
	}
	if order.Meta.CustomData.OrderID != "buy-x" || order.Data.Attributes.VariantID() != "42" {
		t.Errorf("order: %+v", order)
	}
	if subscription.Data.ID != "7" || subscription.Data.Attributes.VariantID() != "43" || subscription.Data.Attributes.RenewsAt.IsZero() {
		t.Errorf("subscription: %+v", subscription)
	}
}

func TestClient(t *testing.T) {
	var checkout map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer key" || r.Header.Get("Accept") != contentType {
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"errors":[{"detail":"Unauthenticated."}]}`))
			return
		}
		switch r.Method + " " + r.URL.Path {
		case "GET /stores/1":
			_, _ = w.Write([]byte(`{"data":{"id":"1","attributes":{"currency":"USD"}}}`))
		case "POST /checkouts":
			_ = json.NewDecoder(r.Body).Decode(&checkout)
			w.WriteHeader(http.StatusCreated)
			_, _ = w.Write([]byte(`{"data":{"id":"c","attributes":{"url":"https://store.example/checkout/custom/c"}}}`))
		case "GET /subscriptions/7":
			_, _ = w.Write([]byte(`{"data":{"id":"7","attributes":{"urls":{"customer_portal":"https://store.example/billing?signature=s"}}}}`))
		default:
			w.WriteHeader(http.StatusNotFound)
			_, _ = w.Write([]byte(`{"errors":[{"detail":"Not found."}]}`))
		}
	}))
	defer srv.Close()

	c := New("key", "1", "whsec")
	c.BaseURL = srv.URL
	ctx := context.Background()

	if err := c.Load(ctx); err != nil || c.Currency != "USD" {
		t.Fatalf("load: %v, currency %q", err, c.Currency)
	}

	url, err := c.Checkout(ctx, Checkout{VariantID: "42", Amount: 300, Email: "a@b.co", Name: "A", OrderID: "sub-x", RedirectURL: "https://app.example/billing"})
	if err != nil || url != "https://store.example/checkout/custom/c" {
		t.Fatalf("checkout: %q %v", url, err)
	}
	data := checkout["data"].(map[string]any)
	attributes := data["attributes"].(map[string]any)
	custom := attributes["checkout_data"].(map[string]any)["custom"].(map[string]any)
	variant := data["relationships"].(map[string]any)["variant"].(map[string]any)["data"].(map[string]any)
	if attributes["custom_price"] != float64(300) || custom["order_id"] != "sub-x" || variant["id"] != "42" {
		t.Errorf("checkout body: %v", checkout)
	}

	if url, err := c.PortalURL(ctx, "7"); err != nil || url != "https://store.example/billing?signature=s" {
		t.Errorf("portal: %q %v", url, err)
	}
	if _, err := c.PortalURL(ctx, "8"); err == nil {
		t.Error("an unknown subscription answered a portal")
	}

	c.apiKey = "wrong"
	if err := c.Load(ctx); err == nil {
		t.Error("a wrong key loaded the store")
	}
}

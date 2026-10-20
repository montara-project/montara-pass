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
	var checkout, customer map[string]any
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
		case "GET /products":
			if r.URL.Query().Get("filter[store_id]") != "1" {
				w.WriteHeader(http.StatusBadRequest)
				return
			}
			_, _ = w.Write([]byte(`{"meta":{"page":{"lastPage":1}},"data":[
				{"id":"10","attributes":{"name":"Pro","description":"<p>All of it</p>","status":"published"}}]}`))
		case "GET /variants":
			// Two pages, to read past the first.
			if r.URL.Query().Get("page[number]") == "1" {
				_, _ = w.Write([]byte(`{"meta":{"page":{"lastPage":2}},"data":[{"id":"42","attributes":{"name":"Monthly","description":"","status":"published"}}]}`))
				return
			}
			_, _ = w.Write([]byte(`{"meta":{"page":{"lastPage":2}},"data":[{"id":"43","attributes":{"name":"Old","description":"<b>gone</b>","status":"draft"}}]}`))
		case "GET /prices":
			if r.URL.Query().Get("filter[variant_id]") == "43" {
				_, _ = w.Write([]byte(`{"data":[]}`))
				return
			}
			_, _ = w.Write([]byte(`{"data":[
				{"attributes":{"category":"subscription","scheme":"standard","unit_price":300,"renewal_interval_unit":"month","renewal_interval_quantity":1}},
				{"attributes":{"category":"subscription","scheme":"standard","unit_price":250,"renewal_interval_unit":"month","renewal_interval_quantity":1}}]}`))
		case "GET /customers":
			if r.URL.Query().Get("filter[email]") == "known@b.co" {
				_, _ = w.Write([]byte(`{"data":[{"id":"501"}]}`))
				return
			}
			_, _ = w.Write([]byte(`{"data":[]}`))
		case "POST /customers":
			_ = json.NewDecoder(r.Body).Decode(&customer)
			w.WriteHeader(http.StatusCreated)
			_, _ = w.Write([]byte(`{"data":{"id":"502"}}`))
		case "GET /subscriptions":
			if r.URL.Query().Get("filter[store_id]") != "1" {
				w.WriteHeader(http.StatusBadRequest)
				return
			}
			_, _ = w.Write([]byte(`{"meta":{"page":{"lastPage":1}},"data":[
				{"id":"7","attributes":{"status":"cancelled","variant_id":42,"cancelled":true,"renews_at":"2026-11-01T00:00:00Z","ends_at":"2026-11-01T00:00:00Z"}}]}`))
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

	url, err := c.Checkout(ctx, Checkout{VariantID: "42", Email: "a@b.co", Name: "A", OrderID: "sub-x", RedirectURL: "https://app.example/billing"})
	if err != nil || url != "https://store.example/checkout/custom/c" {
		t.Fatalf("checkout: %q %v", url, err)
	}
	data := checkout["data"].(map[string]any)
	attributes := data["attributes"].(map[string]any)
	custom := attributes["checkout_data"].(map[string]any)["custom"].(map[string]any)
	variant := data["relationships"].(map[string]any)["variant"].(map[string]any)["data"].(map[string]any)
	// The variant sells at its own price.
	if _, priced := attributes["custom_price"]; priced || custom["order_id"] != "sub-x" || variant["id"] != "42" {
		t.Errorf("checkout body: %v", checkout)
	}

	// The catalog: every page, each variant with its newest price, a variant
	// without a description takes its product's.
	variants, err := c.Catalog(ctx)
	if err != nil || len(variants) != 2 {
		t.Fatalf("catalog: %v %+v", err, variants)
	}
	if v := variants[0]; v.ID != "42" || v.ProductName != "Pro" || v.Name != "Monthly" || !v.Published ||
		v.Description != "<p>All of it</p>" || v.Price == nil || *v.Price.UnitPrice != 300 || *v.Price.RenewalIntervalUnit != "month" {
		t.Errorf("first variant: %+v %+v", v, v.Price)
	}
	if v := variants[1]; v.ID != "43" || v.Published || v.Price != nil || v.Description != "<b>gone</b>" {
		t.Errorf("second variant: %+v", v)
	}

	// A customer is found by email, or else saved in the store.
	if id, err := c.Customer(ctx, "Known", "known@b.co"); err != nil || id != "501" || customer != nil {
		t.Errorf("known customer: %q %v, created %v", id, err, customer)
	}
	if id, err := c.Customer(ctx, "New", "new@b.co"); err != nil || id != "502" {
		t.Errorf("new customer: %q %v", id, err)
	}
	attrs := customer["data"].(map[string]any)["attributes"].(map[string]any)
	store := customer["data"].(map[string]any)["relationships"].(map[string]any)["store"].(map[string]any)["data"].(map[string]any)
	if attrs["name"] != "New" || attrs["email"] != "new@b.co" || store["id"] != "1" {
		t.Errorf("customer body: %v", customer)
	}

	subs, err := c.Subscriptions(ctx)
	if err != nil || len(subs) != 1 {
		t.Fatalf("subscriptions: %v %+v", err, subs)
	}
	if s := subs[0]; s.ID != "7" || s.Attributes.VariantID() != "42" || !s.Attributes.Cancelled || !s.Attributes.Live() {
		t.Errorf("subscription: %+v", s)
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

func TestDiscounts(t *testing.T) {
	var checkout struct {
		Data struct {
			Attributes struct {
				CheckoutData map[string]any `json:"checkout_data"`
			} `json:"attributes"`
		} `json:"data"`
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method + " " + r.URL.Path {
		case "GET /discounts":
			if r.URL.Query().Get("filter[store_id]") != "1" {
				w.WriteHeader(http.StatusBadRequest)
				return
			}
			_, _ = w.Write([]byte(`{"meta":{"page":{"lastPage":1}},"data":[
				{"id":"1","attributes":{"name":"Launch [public]","code":"LAUNCH20","amount":20,"amount_type":"percent","is_limited_to_products":true,"duration":"repeating","duration_in_months":3,"status":"published","expires_at":"2026-12-01T00:00:00Z"}},
				{"id":"2","attributes":{"name":"Draft [public]","code":"DRAFT","amount":50,"amount_type":"percent","status":"draft"}},
				{"id":"3","attributes":{"name":"Friend","code":"FRIEND","amount":90,"amount_type":"percent","status":"published"}},
				{"id":"4","attributes":{"name":"First 10 [public]","code":"FIRST10","amount":500,"amount_type":"fixed","is_limited_redemptions":true,"max_redemptions":10,"status":"published"}},
				{"id":"5","attributes":{"name":"First 99 [public]","code":"FIRST99","amount":100,"amount_type":"fixed","is_limited_redemptions":true,"max_redemptions":99,"duration":"forever","status":"published"}}]}`))
		case "GET /discounts/1/variants":
			_, _ = w.Write([]byte(`{"meta":{"page":{"lastPage":1}},"data":[{"id":"42"},{"id":"43"}]}`))
		case "GET /discount-redemptions":
			total := map[string]string{"4": "10", "5": "3"}[r.URL.Query().Get("filter[discount_id]")]
			_, _ = w.Write([]byte(`{"meta":{"page":{"lastPage":1,"total":` + total + `}},"data":[]}`))
		case "POST /checkouts":
			_ = json.NewDecoder(r.Body).Decode(&checkout)
			_, _ = w.Write([]byte(`{"data":{"attributes":{"url":"https://pay.example/x"}}}`))
		default:
			t.Errorf("unexpected %s %s", r.Method, r.URL)
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer srv.Close()

	c := New("key", "1", "whsec")
	c.BaseURL = srv.URL
	ctx := context.Background()

	// Only the public ones are read in full; FRIEND is never asked about.
	got, err := c.Discounts(ctx, func(d Discount) bool { return d.Code != "FRIEND" })
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 || got[0].Code != "LAUNCH20" || got[1].Code != "FIRST99" {
		t.Fatalf("discounts: %+v", got)
	}
	launch, first := got[0], got[1]
	if launch.AmountType != "percent" || launch.Amount != 20 || launch.Duration != "repeating" || launch.DurationInMonths != 3 ||
		len(launch.Variants) != 2 || launch.Variants[1] != "43" || launch.ExpiresAt == nil {
		t.Errorf("limited to variants: %+v", launch)
	}
	if first.Variants != nil || first.MaxRedemptions != 99 {
		t.Errorf("for every variant: %+v", first)
	}
	day := time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC)
	if !launch.Live(day) || launch.Live(day.AddDate(0, 1, 0)) {
		t.Error("a discount is live until it expires, and not after")
	}

	if _, err := c.Checkout(ctx, Checkout{VariantID: "42", OrderID: "buy-x", DiscountCode: "LAUNCH20"}); err != nil {
		t.Fatal(err)
	}
	if checkout.Data.Attributes.CheckoutData["discount_code"] != "LAUNCH20" {
		t.Errorf("checkout data: %v", checkout.Data.Attributes.CheckoutData)
	}
	checkout.Data.Attributes.CheckoutData = nil
	if _, err := c.Checkout(ctx, Checkout{VariantID: "42", OrderID: "buy-y"}); err != nil {
		t.Fatal(err)
	}
	if _, ok := checkout.Data.Attributes.CheckoutData["discount_code"]; ok {
		t.Errorf("a checkout without a discount sent one: %v", checkout.Data.Attributes.CheckoutData)
	}
}

func TestPaid(t *testing.T) {
	total, tax := int64(30600), int64(600)
	if paid := (Attributes{Total: &total, Tax: &tax}).Paid(); paid == nil || *paid != 30000 {
		t.Errorf("paid less tax: %v", paid)
	}
	if paid := (Attributes{Total: &total}).Paid(); paid == nil || *paid != 30600 {
		t.Errorf("paid without tax: %v", paid)
	}
	if paid := (Attributes{}).Paid(); paid != nil {
		t.Errorf("an event without a total: %v", *paid)
	}
}

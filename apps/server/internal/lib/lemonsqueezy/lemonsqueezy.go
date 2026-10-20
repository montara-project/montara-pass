// Package lemonsqueezy is the small part of the Lemon Squeezy API billing
// needs: the store's currency, catalog and discount codes, its customers, a checkout per
// payment, a subscription's customer portal, and the signed webhook that
// reports what was paid.
// https://docs.lemonsqueezy.com/api
package lemonsqueezy

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

const (
	apiURL = "https://api.lemonsqueezy.com/v1"

	// CheckoutLifetime is how long a checkout can be paid. Lemon Squeezy
	// sends nothing when one lapses, so billing drops pending payments a
	// little after it (see repositories.BillingRepository.ExpireEnded).
	CheckoutLifetime = time.Hour

	contentType = "application/vnd.api+json"

	// The most a list answers at once.
	pageSize = 100
)

type Client struct {
	// BaseURL is the API's; tests point it elsewhere.
	BaseURL string
	// Currency is the store's, which every price is charged in. Load sets it.
	Currency string

	apiKey        string
	storeID       string
	webhookSecret string
	http          *http.Client
}

// New returns a client for the store. A test-mode API key works on the
// store's test mode, a live one on live payments.
func New(apiKey, storeID, webhookSecret string) *Client {
	return &Client{
		BaseURL:       apiURL,
		apiKey:        apiKey,
		storeID:       storeID,
		webhookSecret: webhookSecret,
		http:          &http.Client{Timeout: 15 * time.Second},
	}
}

// document is a JSON:API answer.
type document struct {
	Data json.RawMessage `json:"data"`
	Meta struct {
		Page struct {
			LastPage int `json:"lastPage"`
			Total    int `json:"total"`
		} `json:"page"`
	} `json:"meta"`
	Errors []struct {
		Detail string `json:"detail"`
	} `json:"errors"`
}

// send makes a JSON:API request and returns its answer.
func (c *Client) send(ctx context.Context, method, path string, body any) (document, error) {
	var doc document
	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			return doc, err
		}
		reader = bytes.NewReader(raw)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.BaseURL+path, reader)
	if err != nil {
		return doc, err
	}
	req.Header.Set("Accept", contentType)
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	res, err := c.http.Do(req)
	if err != nil {
		return doc, fmt.Errorf("lemon squeezy: %w", err)
	}
	defer res.Body.Close()

	if err := json.NewDecoder(res.Body).Decode(&doc); err != nil {
		return doc, fmt.Errorf("lemon squeezy: %s %s: status %d: %w", method, path, res.StatusCode, err)
	}
	if res.StatusCode >= 300 {
		detail := ""
		if len(doc.Errors) > 0 {
			detail = doc.Errors[0].Detail
		}
		return doc, fmt.Errorf("lemon squeezy: %s %s: status %d: %s", method, path, res.StatusCode, detail)
	}
	return doc, nil
}

// do sends a request and decodes the answer's data into out.
func (c *Client) do(ctx context.Context, method, path string, body, out any) error {
	doc, err := c.send(ctx, method, path, body)
	if err != nil {
		return err
	}
	return json.Unmarshal(doc.Data, out)
}

// list reads every page of a list, filtered by query, into out.
func list[T any](ctx context.Context, c *Client, path string, query url.Values) ([]T, error) {
	var all []T
	query.Set("page[size]", strconv.Itoa(pageSize))
	for page := 1; ; page++ {
		query.Set("page[number]", strconv.Itoa(page))
		doc, err := c.send(ctx, http.MethodGet, path+"?"+query.Encode(), nil)
		if err != nil {
			return nil, err
		}
		var items []T
		if err := json.Unmarshal(doc.Data, &items); err != nil {
			return nil, err
		}
		all = append(all, items...)
		if page >= doc.Meta.Page.LastPage {
			return all, nil
		}
	}
}

// Load reads the store's currency, which also proves the API key and the
// store id before anything is sold.
func (c *Client) Load(ctx context.Context) error {
	var store struct {
		Attributes struct {
			Currency string `json:"currency"`
		} `json:"attributes"`
	}
	if err := c.do(ctx, http.MethodGet, "/stores/"+c.storeID, nil, &store); err != nil {
		return err
	}
	c.Currency = store.Attributes.Currency
	return nil
}

// Checkout describes one payment.
type Checkout struct {
	// The Lemon Squeezy variant the plan is sold as, at its own price; it
	// decides whether the payment bills once or renews.
	VariantID string
	Email     string
	Name      string
	// Billing's own id for the payment, handed back in every webhook about it.
	OrderID string
	// Where the browser goes once the payment is made.
	RedirectURL string
	// Filled in at checkout; empty for none.
	DiscountCode string
}

// Checkout creates a checkout and returns the page the user pays on.
func (c *Client) Checkout(ctx context.Context, ch Checkout) (string, error) {
	checkoutData := map[string]any{
		"email":  ch.Email,
		"name":   ch.Name,
		"custom": map[string]string{"order_id": ch.OrderID},
	}
	if ch.DiscountCode != "" {
		checkoutData["discount_code"] = ch.DiscountCode
	}
	body := map[string]any{
		"data": map[string]any{
			"type": "checkouts",
			"attributes": map[string]any{
				"product_options": map[string]any{"redirect_url": ch.RedirectURL, "enabled_variants": []string{ch.VariantID}},
				"checkout_data":   checkoutData,
				"expires_at":      time.Now().Add(CheckoutLifetime).UTC().Format(time.RFC3339),
			},
			"relationships": map[string]any{
				"store":   map[string]any{"data": map[string]string{"type": "stores", "id": c.storeID}},
				"variant": map[string]any{"data": map[string]string{"type": "variants", "id": ch.VariantID}},
			},
		},
	}

	var checkout struct {
		Attributes struct {
			URL string `json:"url"`
		} `json:"attributes"`
	}
	if err := c.do(ctx, http.MethodPost, "/checkouts", body, &checkout); err != nil {
		return "", err
	}
	if checkout.Attributes.URL == "" {
		return "", fmt.Errorf("lemon squeezy: checkout without a url")
	}
	return checkout.Attributes.URL, nil
}

// Discount is a published discount code of the store.
type Discount struct {
	ID         string
	Name       string
	Code       string
	AmountType string // percent or fixed
	// A percentage, or cents off, as AmountType says.
	Amount   int64
	StartsAt *time.Time
	// Nil when it never expires.
	ExpiresAt *time.Time
	// once, repeating or forever: which of a subscription's payments it
	// takes off, the first, those of the first DurationInMonths, or all.
	Duration         string
	DurationInMonths int
	// Zero when it can be redeemed any number of times.
	MaxRedemptions int
	// The variants it is limited to; nil when it applies to all of them.
	Variants []string
}

// Live reports whether the code is taken at now.
func (d Discount) Live(now time.Time) bool {
	return (d.StartsAt == nil || !now.Before(*d.StartsAt)) && (d.ExpiresAt == nil || now.Before(*d.ExpiresAt))
}

// Discounts reads the store's published discount codes. keep picks which
// to read in full: those limited to some variants are asked for them, and
// those limited in redemptions are left out once used up.
func (c *Client) Discounts(ctx context.Context, keep func(Discount) bool) ([]Discount, error) {
	type discount struct {
		ID         string `json:"id"`
		Attributes struct {
			Name                 string     `json:"name"`
			Code                 string     `json:"code"`
			Amount               int64      `json:"amount"`
			AmountType           string     `json:"amount_type"`
			IsLimitedToProducts  bool       `json:"is_limited_to_products"`
			IsLimitedRedemptions bool       `json:"is_limited_redemptions"`
			MaxRedemptions       int        `json:"max_redemptions"`
			StartsAt             *time.Time `json:"starts_at"`
			ExpiresAt            *time.Time `json:"expires_at"`
			Duration             string     `json:"duration"`
			DurationInMonths     int        `json:"duration_in_months"`
			Status               string     `json:"status"`
		} `json:"attributes"`
	}
	type variant struct {
		ID string `json:"id"`
	}

	found, err := list[discount](ctx, c, "/discounts", url.Values{"filter[store_id]": {c.storeID}})
	if err != nil {
		return nil, err
	}
	var out []Discount
	for _, f := range found {
		a := f.Attributes
		d := Discount{
			ID: f.ID, Name: a.Name, Code: a.Code, AmountType: a.AmountType, Amount: a.Amount,
			StartsAt: a.StartsAt, ExpiresAt: a.ExpiresAt, Duration: a.Duration, DurationInMonths: a.DurationInMonths,
		}
		if a.IsLimitedRedemptions {
			d.MaxRedemptions = a.MaxRedemptions
		}
		if a.Status != "published" || !keep(d) {
			continue
		}
		if a.IsLimitedToProducts {
			variants, err := list[variant](ctx, c, "/discounts/"+f.ID+"/variants", url.Values{})
			if err != nil {
				return nil, err
			}
			d.Variants = []string{}
			for _, v := range variants {
				d.Variants = append(d.Variants, v.ID)
			}
		}
		if d.MaxRedemptions > 0 {
			doc, err := c.send(ctx, http.MethodGet, "/discount-redemptions?"+url.Values{
				"filter[discount_id]": {f.ID}, "page[size]": {"1"},
			}.Encode(), nil)
			if err != nil {
				return nil, err
			}
			if doc.Meta.Page.Total >= d.MaxRedemptions {
				continue
			}
		}
		out = append(out, d)
	}
	return out, nil
}

// Variant is one thing the store sells, with what billing needs of its
// product and of its current price.
type Variant struct {
	ID          string
	ProductName string
	Name        string
	// HTML: the variant's own, or else its product's.
	Description string
	// Its product is published and it is not a draft. A product's only
	// variant stays pending and is sold all the same.
	Published bool
	// Nil when the variant has no price yet.
	Price *Price
}

// Price is a variant's current price: Lemon Squeezy keeps every one it had
// and lists the newest first.
type Price struct {
	// one_time, subscription, lead_magnet (free) or pwyw.
	Category string `json:"category"`
	// standard, package, graduated or volume.
	Scheme string `json:"scheme"`
	// In cents; nil for usage-based, graduated and volume prices.
	UnitPrice *int64 `json:"unit_price"`
	// Subscriptions: billed every RenewalIntervalQuantity of day, week,
	// month or year.
	RenewalIntervalUnit     *string `json:"renewal_interval_unit"`
	RenewalIntervalQuantity *int    `json:"renewal_interval_quantity"`
}

// Catalog reads the store's products, their variants and each variant's
// current price.
func (c *Client) Catalog(ctx context.Context) ([]Variant, error) {
	type product struct {
		ID         string `json:"id"`
		Attributes struct {
			Name        string `json:"name"`
			Description string `json:"description"`
			Status      string `json:"status"`
		} `json:"attributes"`
	}
	type variant struct {
		ID         string `json:"id"`
		Attributes struct {
			Name        string `json:"name"`
			Description string `json:"description"`
			Status      string `json:"status"`
		} `json:"attributes"`
	}
	type price struct {
		Attributes Price `json:"attributes"`
	}

	products, err := list[product](ctx, c, "/products", url.Values{"filter[store_id]": {c.storeID}})
	if err != nil {
		return nil, err
	}

	// ponytail: one request per product and per variant; a catalog of a few
	// plans reads in well under Lemon Squeezy's 300 a minute.
	var out []Variant
	for _, p := range products {
		variants, err := list[variant](ctx, c, "/variants", url.Values{"filter[product_id]": {p.ID}})
		if err != nil {
			return nil, err
		}
		for _, v := range variants {
			prices, err := list[price](ctx, c, "/prices", url.Values{"filter[variant_id]": {v.ID}})
			if err != nil {
				return nil, err
			}
			item := Variant{
				ID:          v.ID,
				ProductName: p.Attributes.Name,
				Name:        v.Attributes.Name,
				Description: v.Attributes.Description,
				Published:   p.Attributes.Status == "published" && v.Attributes.Status != "draft",
			}
			if item.Description == "" {
				item.Description = p.Attributes.Description
			}
			if len(prices) > 0 {
				item.Price = &prices[0].Attributes
			}
			out = append(out, item)
		}
	}
	return out, nil
}

// Customer returns the id of the store's customer with email, saving one
// with name when there is none, so an account and its orders meet in one.
func (c *Client) Customer(ctx context.Context, name, email string) (string, error) {
	type customer struct {
		ID string `json:"id"`
	}
	found, err := list[customer](ctx, c, "/customers", url.Values{"filter[store_id]": {c.storeID}, "filter[email]": {email}})
	if err != nil {
		return "", err
	}
	if len(found) > 0 {
		return found[0].ID, nil
	}

	var created customer
	if err := c.do(ctx, http.MethodPost, "/customers", map[string]any{
		"data": map[string]any{
			"type":       "customers",
			"attributes": map[string]string{"name": name, "email": email},
			"relationships": map[string]any{
				"store": map[string]any{"data": map[string]string{"type": "stores", "id": c.storeID}},
			},
		},
	}, &created); err != nil {
		return "", err
	}
	if created.ID == "" {
		return "", fmt.Errorf("lemon squeezy: customer without an id")
	}
	return created.ID, nil
}

// PortalURL returns a freshly signed link to the customer portal of a
// subscription, where its owner cancels it or changes the card. The link
// expires, so it is asked for each time.
func (c *Client) PortalURL(ctx context.Context, subscriptionID string) (string, error) {
	var subscription struct {
		Attributes struct {
			URLs struct {
				CustomerPortal string `json:"customer_portal"`
			} `json:"urls"`
		} `json:"attributes"`
	}
	if err := c.do(ctx, http.MethodGet, "/subscriptions/"+subscriptionID, nil, &subscription); err != nil {
		return "", err
	}
	if subscription.Attributes.URLs.CustomerPortal == "" {
		return "", fmt.Errorf("lemon squeezy: subscription %s has no customer portal", subscriptionID)
	}
	return subscription.Attributes.URLs.CustomerPortal, nil
}

// Subscription is one of the store's subscriptions.
type Subscription struct {
	ID         string     `json:"id"`
	Attributes Attributes `json:"attributes"`
}

// Subscriptions reads every subscription of the store. Unlike a webhook, it
// carries no custom data, so it is matched by its id alone.
func (c *Client) Subscriptions(ctx context.Context) ([]Subscription, error) {
	return list[Subscription](ctx, c, "/subscriptions", url.Values{"filter[store_id]": {c.storeID}})
}

// Verify reports whether body was signed with the webhook's secret: the
// X-Signature header is the hex HMAC-SHA256 of the raw body.
func (c *Client) Verify(body []byte, signature string) bool {
	mac := hmac.New(sha256.New, []byte(c.webhookSecret))
	mac.Write(body)
	want := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(want), []byte(signature))
}

// Event is the part of a webhook billing reads. Order and subscription
// events carry the order id the checkout was created with.
type Event struct {
	Meta struct {
		EventName  string `json:"event_name"`
		CustomData struct {
			OrderID string `json:"order_id"`
		} `json:"custom_data"`
	} `json:"meta"`
	Data struct {
		ID         string     `json:"id"`
		Attributes Attributes `json:"attributes"`
	} `json:"data"`
}

// Attributes are an order's or a subscription's, whichever the event is about.
type Attributes struct {
	Status string `json:"status"`

	// Orders.
	Refunded       bool `json:"refunded"`
	FirstOrderItem struct {
		VariantID int64 `json:"variant_id"`
	} `json:"first_order_item"`

	// Subscriptions.
	SubscriptionVariantID int64      `json:"variant_id"`
	Cancelled             bool       `json:"cancelled"`
	RenewsAt              time.Time  `json:"renews_at"`
	EndsAt                *time.Time `json:"ends_at"`
	UpdatedAt             time.Time  `json:"updated_at"`
}

// VariantID is the variant that was paid for, as the plans store it.
func (a Attributes) VariantID() string {
	if a.FirstOrderItem.VariantID != 0 {
		return strconv.FormatInt(a.FirstOrderItem.VariantID, 10)
	}
	return strconv.FormatInt(a.SubscriptionVariantID, 10)
}

// Live reports whether a subscription still grants its plan: paid up, in a
// trial, retrying a failed renewal, or cancelled and running out its period.
// Paused, unpaid and expired ones do not.
func (a Attributes) Live() bool {
	switch a.Status {
	case "active", "on_trial", "past_due", "cancelled":
		return true
	}
	return false
}

// PeriodEnd is when a subscription's paid time runs out: its end once it is
// cancelled or over, else its next renewal. A renewal that failed leaves it
// in the past, so the plan lapses here while Lemon Squeezy retries.
func (a Attributes) PeriodEnd() time.Time {
	if a.EndsAt != nil {
		return *a.EndsAt
	}
	return a.RenewsAt
}

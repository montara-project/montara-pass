// Package lemonsqueezy is the small part of the Lemon Squeezy API billing
// needs: the store's currency, a checkout per payment, a subscription's
// customer portal, and the signed webhook that reports what was paid.
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

// do sends a JSON:API request and decodes the answer's data into out.
func (c *Client) do(ctx context.Context, method, path string, body, out any) error {
	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(raw)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.BaseURL+path, reader)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", contentType)
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	res, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("lemon squeezy: %w", err)
	}
	defer res.Body.Close()

	var doc struct {
		Data   json.RawMessage `json:"data"`
		Errors []struct {
			Detail string `json:"detail"`
		} `json:"errors"`
	}
	if err := json.NewDecoder(res.Body).Decode(&doc); err != nil {
		return fmt.Errorf("lemon squeezy: %s %s: status %d: %w", method, path, res.StatusCode, err)
	}
	if res.StatusCode >= 300 {
		detail := ""
		if len(doc.Errors) > 0 {
			detail = doc.Errors[0].Detail
		}
		return fmt.Errorf("lemon squeezy: %s %s: status %d: %s", method, path, res.StatusCode, detail)
	}
	return json.Unmarshal(doc.Data, out)
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
	// The Lemon Squeezy variant the plan is sold as; it decides whether the
	// payment bills once or renews.
	VariantID string
	// In cents of the store's currency; renewals keep it.
	Amount int64
	Email  string
	Name   string
	// Billing's own id for the payment, handed back in every webhook about it.
	OrderID string
	// Where the browser goes once the payment is made.
	RedirectURL string
}

// Checkout creates a checkout and returns the page the user pays on.
func (c *Client) Checkout(ctx context.Context, ch Checkout) (string, error) {
	body := map[string]any{
		"data": map[string]any{
			"type": "checkouts",
			"attributes": map[string]any{
				"custom_price":    ch.Amount,
				"product_options": map[string]any{"redirect_url": ch.RedirectURL, "enabled_variants": []string{ch.VariantID}},
				"checkout_data": map[string]any{
					"email":  ch.Email,
					"name":   ch.Name,
					"custom": map[string]string{"order_id": ch.OrderID},
				},
				"expires_at": time.Now().Add(CheckoutLifetime).UTC().Format(time.RFC3339),
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

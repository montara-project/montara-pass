// Package midtrans is the small part of the Midtrans API billing needs: a
// Snap checkout per payment, and the HTTP notification that settles it.
// https://docs.midtrans.com/docs/snap-snap-integration-guide
package midtrans

import (
	"bytes"
	"context"
	"crypto/sha512"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	sandboxURL    = "https://app.sandbox.midtrans.com/snap/v1/transactions"
	productionURL = "https://app.midtrans.com/snap/v1/transactions"

	// Snap charges in rupiah.
	Currency = "IDR"

	// How long a checkout can be paid; past it Midtrans sends an expire
	// notification, which frees the user to start again.
	checkoutMinutes = 60
	// Midtrans' limit on an item name.
	maxItemNameLen = 50
)

type Client struct {
	// SnapURL is where transactions are created; tests point it elsewhere.
	SnapURL   string
	serverKey string
	http      *http.Client
}

// New returns a client for the sandbox, or for production when production is
// true. The server key decides which: each environment has its own.
func New(serverKey string, production bool) *Client {
	url := sandboxURL
	if production {
		url = productionURL
	}
	return &Client{SnapURL: url, serverKey: serverKey, http: &http.Client{Timeout: 15 * time.Second}}
}

// Checkout describes one payment.
type Checkout struct {
	// Unique per payment, at most 50 characters.
	OrderID  string
	Amount   int64
	ItemID   string
	ItemName string
	Email    string
	Name     string
	// Where Snap sends the browser once the user is done.
	FinishURL string
}

// Checkout creates a Snap transaction and returns the page the user pays on.
func (c *Client) Checkout(ctx context.Context, ch Checkout) (string, error) {
	name := ch.ItemName
	if utf8.RuneCountInString(name) > maxItemNameLen {
		name = string([]rune(name)[:maxItemNameLen])
	}

	body, err := json.Marshal(map[string]any{
		"transaction_details": map[string]any{"order_id": ch.OrderID, "gross_amount": ch.Amount},
		"item_details":        []map[string]any{{"id": ch.ItemID, "price": ch.Amount, "quantity": 1, "name": name}},
		"customer_details":    map[string]any{"first_name": ch.Name, "email": ch.Email},
		"callbacks":           map[string]any{"finish": ch.FinishURL},
		"expiry":              map[string]any{"unit": "minute", "duration": checkoutMinutes},
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.SnapURL, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	// The server key is the username, with an empty password.
	req.SetBasicAuth(c.serverKey, "")

	res, err := c.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("midtrans: %w", err)
	}
	defer res.Body.Close()

	var out struct {
		RedirectURL   string   `json:"redirect_url"`
		ErrorMessages []string `json:"error_messages"`
	}
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		return "", fmt.Errorf("midtrans: status %d: %w", res.StatusCode, err)
	}
	if res.StatusCode >= 300 || out.RedirectURL == "" {
		return "", fmt.Errorf("midtrans: status %d: %s", res.StatusCode, strings.Join(out.ErrorMessages, "; "))
	}
	return out.RedirectURL, nil
}

// Notification is the part of Midtrans' HTTP notification billing reads.
type Notification struct {
	OrderID           string `json:"order_id"`
	StatusCode        string `json:"status_code"`
	GrossAmount       string `json:"gross_amount"`
	SignatureKey      string `json:"signature_key"`
	TransactionStatus string `json:"transaction_status"`
	FraudStatus       string `json:"fraud_status"`
	Currency          string `json:"currency"`
}

// Verify reports whether n was signed with this client's server key:
// SHA512(order_id + status_code + gross_amount + server key).
func (c *Client) Verify(n Notification) bool {
	sum := sha512.Sum512([]byte(n.OrderID + n.StatusCode + n.GrossAmount + c.serverKey))
	want := hex.EncodeToString(sum[:])
	return subtle.ConstantTimeCompare([]byte(want), []byte(strings.ToLower(n.SignatureKey))) == 1
}

// What a notification means for the payment.
const (
	OutcomePending  = "pending"
	OutcomePaid     = "paid"
	OutcomeFailed   = "failed"
	OutcomeExpired  = "expired"
	OutcomeRefunded = "refunded"
)

// Outcome reads the transaction status. A card capture counts as paid only
// once fraud screening accepts it; one held for review stays pending.
func (n Notification) Outcome() string {
	switch n.TransactionStatus {
	case "settlement":
		return OutcomePaid
	case "capture":
		if n.FraudStatus == "accept" {
			return OutcomePaid
		}
		return OutcomePending
	case "deny", "cancel", "failure":
		return OutcomeFailed
	case "expire":
		return OutcomeExpired
	case "refund", "partial_refund":
		return OutcomeRefunded
	default:
		return OutcomePending
	}
}

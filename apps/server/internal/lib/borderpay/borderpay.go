// Package borderpay is the small part of the BorderPay API billing needs: a
// one-shot payment per checkout, its status, and the token-checked webhook
// that reports what was paid. BorderPay takes Indonesian rupiah through QRIS,
// Virtual Accounts and e-wallets; billing sells the IDR plans through QRIS.
// BorderPay charges once: what it starts, it never renews by itself.
// https://borderpay.id/docs
package borderpay

import (
	"bytes"
	"context"
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const apiURL = "https://borderpay.id/api/v1"

// MethodQRIS is the payment method billing asks for: the customer scans a QR,
// which every Indonesian bank and e-wallet reads.
const MethodQRIS = "qris"

// How long a payment can be paid: QRIS and e-wallet sessions expire in an
// hour, a virtual account in a day. BorderPay reports the expiry itself and
// sends a webhook when a payment lapses; billing drops its pending payments
// after the longer of the two, a little over (see
// repositories.BillingRepository.ExpireEnded).
const VaLifetime = 24 * time.Hour

// The statuses a payment reads, as the API and the webhook name them.
const (
	StatusPending = "pending"
	StatusPaid    = "paid"
	StatusExpired = "expired"
	StatusFailed  = "failed"
)

// The webhook's events, in X-Borderpay-Event and the body's event.
const (
	EventPaid    = "payment.paid"
	EventExpired = "payment.expired"
	EventFailed  = "payment.failed"
)

type Client struct {
	// BaseURL is the API's; tests point it elsewhere.
	BaseURL string

	apiKey       string
	webhookToken string
	http         *http.Client
}

// New returns a client for one BorderPay project: its API key pays, its
// webhook token is how a webhook is believed. An empty base URL is the API's
// own.
func New(apiKey, baseURL, webhookToken string) *Client {
	if baseURL == "" {
		baseURL = apiURL
	}
	return &Client{
		BaseURL:      strings.TrimSuffix(baseURL, "/"),
		apiKey:       apiKey,
		webhookToken: webhookToken,
		http:         &http.Client{Timeout: 15 * time.Second},
	}
}

// Verify reports whether a webhook carries the project's verification token
// in its X-Borderpay-Token header. BorderPay signs nothing: the token is a
// shared secret, so it is compared in constant time.
func (c *Client) Verify(token string) bool {
	if c.webhookToken == "" || token == "" {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(token), []byte(c.webhookToken)) == 1
}

// CreatePayment opens a payment: amount in rupiah, what billing calls it by,
// and where the browser comes back to when it is done.
type CreatePayment struct {
	Amount      int64  `json:"amount"`
	Method      string `json:"method"`
	ReferenceID string `json:"reference_id"`
	ReturnURL   string `json:"return_url,omitempty"`
}

// Payment is what the API answers a payment with, on creating it and on
// reading it back. Only what billing keeps: where the customer pays, the
// status, and when it was paid or runs out.
type Payment struct {
	ReferenceID string     `json:"reference_id"`
	Status      string     `json:"status"`
	Amount      int64      `json:"amount"`
	Method      string     `json:"method"`
	PayURL      string     `json:"pay_url"`
	QRString    string     `json:"qr_string"`
	VANumber    string     `json:"va_number"`
	VABank      string     `json:"va_bank"`
	CheckoutURL string     `json:"checkout_url"`
	PaidAt      *time.Time `json:"paid_at"`
	ExpiresAt   *time.Time `json:"expires_at"`
}

// Create opens a payment and answers it, pending. The customer pays at the
// answered PayURL, a ready-made page that shows the QR and the fee.
func (c *Client) Create(ctx context.Context, p CreatePayment) (Payment, error) {
	var pay Payment
	err := c.send(ctx, http.MethodPost, "/payments", p, &pay)
	return pay, err
}

// Get reads a payment's current status. The webhook token is a shared
// secret, not a signature, so billing reads this before believing a webhook
// that says a payment is paid.
func (c *Client) Get(ctx context.Context, referenceID string) (Payment, error) {
	var pay Payment
	err := c.send(ctx, http.MethodGet, "/payments/"+url.PathEscape(referenceID), nil, &pay)
	return pay, err
}

// Event is a webhook's body: the kind of change, the mode it happened in,
// and the payment it names.
type Event struct {
	Event string `json:"event"`
	Mode  string `json:"mode"`
	Data  struct {
		Slug        string `json:"slug"`
		ReferenceID string `json:"reference_id"`
		OrderID     string `json:"order_id"`
		Status      string `json:"status"`
		Amount      int64  `json:"amount"`
		Fee         int64  `json:"fee"`
		Method      string `json:"method"`
	} `json:"data"`
}

// RequestError is an answer BorderPay gave with an error status: it got the
// request and refused it, unlike a request that never reached it. Its code
// names what it refused ("amount_below_min", "bank_required").
type RequestError struct {
	Method, Path string
	Status       int
	Code, Detail string
}

func (e *RequestError) Error() string {
	return fmt.Sprintf("borderpay: %s %s: status %d: %s", e.Method, e.Path, e.Status, e.Detail)
}

// requestError reads an error answer. The docs show {"error":{"code","message"}}
// for a refused payment; a message alone, or bare text, is read too.
func requestError(method, path string, status int, body []byte) error {
	e := &RequestError{Method: method, Path: path, Status: status, Detail: strings.TrimSpace(string(body))}
	var api struct {
		Error *struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(body, &api); err == nil {
		switch {
		case api.Error != nil:
			e.Code, e.Detail = api.Error.Code, api.Error.Message
		case api.Message != "":
			e.Detail = api.Message
		}
	}
	if e.Code != "" {
		e.Detail = strings.TrimSpace(e.Code + ": " + e.Detail)
	}
	return e
}

// send makes one JSON request and reads its JSON answer.
func (c *Client) send(ctx context.Context, method, path string, in, out any) error {
	var reader io.Reader
	if in != nil {
		raw, err := json.Marshal(in)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(raw)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.BaseURL+path, reader)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	if in != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Accept", "application/json")

	res, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return err
	}
	if res.StatusCode >= 400 {
		return requestError(method, path, res.StatusCode, raw)
	}
	if out == nil {
		return nil
	}
	if err := json.Unmarshal(raw, out); err != nil {
		return fmt.Errorf("borderpay: %s %s: %w", method, path, err)
	}
	return nil
}

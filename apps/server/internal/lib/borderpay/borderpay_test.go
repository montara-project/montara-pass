package borderpay

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestVerify(t *testing.T) {
	c := New("key", "", "bpt_token")

	if !c.Verify("bpt_token") {
		t.Error("the right token was refused")
	}
	if c.Verify("bpt_other") || c.Verify("") {
		t.Error("a wrong, or empty, token was believed")
	}
	if New("key", "", "").Verify("bpt_token") {
		t.Error("a webhook was believed without a token to check against")
	}
}

func TestEvent(t *testing.T) {
	var e Event
	if err := json.Unmarshal([]byte(`{"event":"payment.paid","mode":"test",
		"data":{"slug":"montara-pass","reference_id":"sub-x","order_id":"sub-x",
		"status":"paid","amount":25000,"fee":375,"method":"qris"}}`), &e); err != nil {
		t.Fatal(err)
	}
	if e.Event != EventPaid || e.Data.ReferenceID != "sub-x" || e.Data.Amount != 25000 {
		t.Errorf("event: %+v", e)
	}
}

func TestClient(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer key" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/payments":
			var p CreatePayment
			if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
				t.Error(err)
			}
			if p.ReferenceID == "small" {
				w.WriteHeader(http.StatusUnprocessableEntity)
				w.Write([]byte(`{"error":{"code":"amount_below_min","message":"amount is below the minimum"}}`))
				return
			}
			if p.Amount != 25000 || p.Method != MethodQRIS || p.ReferenceID != "sub-x" {
				t.Errorf("create: %+v", p)
			}
			w.WriteHeader(http.StatusCreated)
			w.Write([]byte(`{"reference_id":"sub-x","status":"pending","amount":25000,
				"pay_url":"https://borderpay.id/pay/sub-x","qr_string":"000201…",
				"expires_at":"2026-10-31T12:00:00Z"}`))
		case r.Method == http.MethodGet && r.URL.Path == "/payments/sub-x":
			w.Write([]byte(`{"reference_id":"sub-x","status":"paid","amount":25000,
				"method":"qris","paid_at":"2026-10-31T11:00:00Z"}`))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer srv.Close()

	c := New("key", srv.URL, "")

	pay, err := c.Create(context.Background(), CreatePayment{Amount: 25000, Method: MethodQRIS, ReferenceID: "sub-x"})
	if err != nil {
		t.Fatal(err)
	}
	if pay.Status != StatusPending || pay.PayURL != "https://borderpay.id/pay/sub-x" {
		t.Errorf("create: %+v", pay)
	}

	pay, err = c.Get(context.Background(), "sub-x")
	if err != nil {
		t.Fatal(err)
	}
	if pay.Status != StatusPaid {
		t.Errorf("get: %+v", pay)
	}

	_, err = c.Create(context.Background(), CreatePayment{Amount: 1, Method: MethodQRIS, ReferenceID: "small"})
	var re *RequestError
	if !errors.As(err, &re) || re.Status != http.StatusUnprocessableEntity || re.Code != "amount_below_min" {
		t.Errorf("refused: %v", err)
	}
}

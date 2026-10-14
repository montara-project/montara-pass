package midtrans

import (
	"context"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestVerify(t *testing.T) {
	c := New("SB-Mid-server-key", false)
	sum := sha512.Sum512([]byte("sub-1" + "200" + "50000.00" + "SB-Mid-server-key"))
	n := Notification{OrderID: "sub-1", StatusCode: "200", GrossAmount: "50000.00", SignatureKey: hex.EncodeToString(sum[:])}

	if !c.Verify(n) {
		t.Fatal("a correctly signed notification was refused")
	}
	n.GrossAmount = "1.00"
	if c.Verify(n) {
		t.Fatal("a notification with a changed amount was accepted")
	}
	if New("another-key", false).Verify(Notification{OrderID: "sub-1", StatusCode: "200", GrossAmount: "50000.00", SignatureKey: hex.EncodeToString(sum[:])}) {
		t.Fatal("a notification signed with another key was accepted")
	}
}

func TestOutcome(t *testing.T) {
	for _, tc := range []struct{ status, fraud, want string }{
		{"settlement", "", OutcomePaid},
		{"capture", "accept", OutcomePaid},
		{"capture", "challenge", OutcomePending},
		{"pending", "", OutcomePending},
		{"deny", "", OutcomeFailed},
		{"cancel", "", OutcomeFailed},
		{"expire", "", OutcomeExpired},
		{"refund", "", OutcomeRefunded},
		{"partial_refund", "", OutcomeRefunded},
	} {
		if got := (Notification{TransactionStatus: tc.status, FraudStatus: tc.fraud}).Outcome(); got != tc.want {
			t.Errorf("%s/%s: got %s, want %s", tc.status, tc.fraud, got, tc.want)
		}
	}
}

func TestCheckout(t *testing.T) {
	var body map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if user, pass, ok := r.BasicAuth(); !ok || user != "key" || pass != "" {
			t.Errorf("basic auth = %q %q %v", user, pass, ok)
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"token":"t","redirect_url":"https://pay.example/t"}`))
	}))
	defer srv.Close()

	c := New("key", false)
	c.SnapURL = srv.URL
	got, err := c.Checkout(context.Background(), Checkout{OrderID: "buy-1", Amount: 99000, ItemID: "pro", ItemName: "Pro", Email: "a@b.c", Name: "A", FinishURL: "https://app/billing"})
	if err != nil || got != "https://pay.example/t" {
		t.Fatalf("checkout = %q, %v", got, err)
	}
	details := body["transaction_details"].(map[string]any)
	if details["order_id"] != "buy-1" || details["gross_amount"] != float64(99000) {
		t.Fatalf("transaction_details = %v", details)
	}

	// An error answer surfaces Midtrans' messages.
	srv.Config.Handler = http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error_messages":["order_id has already been taken"]}`))
	})
	if _, err := c.Checkout(context.Background(), Checkout{OrderID: "buy-1"}); err == nil {
		t.Fatal("an error answer was taken as a checkout")
	}
}

package passkey

import "testing"

func TestAllowedOrigin(t *testing.T) {
	for _, c := range []struct {
		origin, rpID string
		want         kind
	}{
		{"https://montarapass.com", "montarapass.com", originWeb},
		{"https://app.montarapass.com", "montarapass.com", originWeb},
		{"https://evilmontarapass.com", "montarapass.com", originNone},
		{"https://montarapass.com.evil.io", "montarapass.com", originNone},
		{"http://montarapass.com", "montarapass.com", originNone},
		{"http://localhost:5173", "localhost", originWeb},
		{"chrome-extension://abcdefghijklmnop", "montarapass.com", originExtension},
		{"moz-extension://6f1c0c5e-0000-4000-8000-000000000000", "montarapass.com", originExtension},
		{"https://app.montarapass.com/path", "montarapass.com", originNone},
		{"javascript://montarapass.com", "montarapass.com", originNone},
		{"", "montarapass.com", originNone},
	} {
		if got := originKind(c.origin, c.rpID); got != c.want {
			t.Errorf("originKind(%q, %q) = %v, want %v", c.origin, c.rpID, got, c.want)
		}
	}
}

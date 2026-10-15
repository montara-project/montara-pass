package emails

import (
	"os"
	"strings"
	"testing"
	"time"

	emailtmpl "github.com/Authula/authula/core/email/template"
	eptypes "github.com/Authula/authula/plugins/email-password/types"
	mltypes "github.com/Authula/authula/plugins/magic-link/types"
)

// Every template renders through Authula's own manager with the context type
// Authula passes it, so a misspelt field fails here rather than at send time.
func TestTemplatesRender(t *testing.T) {
	// Install leaves operator overrides alone, so clear them; t.Setenv puts
	// each back as it was, set or unset, when the test ends.
	for _, e := range all {
		for _, suffix := range []string{"SUBJECT", "TEXT", "HTML"} {
			t.Setenv("AUTHULA_TEMPLATE_"+strings.ToUpper(e.name)+"_"+suffix, "")
		}
	}
	if err := Install(); err != nil {
		t.Fatal(err)
	}

	common := emailtmpl.NewCommonContext("montara-pass", "https://app.montarapass.com")
	link := "https://app.montarapass.com/api/v1/auth/x?token=abc&callback_url=%2Fverify-email"
	data := map[string]any{
		"verify_email":           eptypes.VerifyEmailContext{CommonContext: common, UserEmail: "a@b.co", VerificationLink: link, Expiry: 24 * time.Hour},
		"magic_link_sign_in":     mltypes.MagicLinkSignInContext{CommonContext: common, UserEmail: "a@b.co", MagicLink: link, Expiry: 15 * time.Minute},
		"password_reset_request": eptypes.PasswordResetContext{CommonContext: common, UserEmail: "a@b.co", ResetLink: link, Expiry: time.Hour},
		"password_changed":       eptypes.PasswordChangedContext{CommonContext: common, UserEmail: "a@b.co"},
		"email_change_request":   eptypes.EmailChangeRequestContext{CommonContext: common, UserEmail: "a@b.co", OldEmail: "a@b.co", NewEmail: "c@d.co", ChangeLink: link, Expiry: time.Hour},
		"email_changed":          eptypes.EmailChangedNotificationContext{CommonContext: common, UserEmail: "c@d.co", OldEmail: "a@b.co", NewEmail: "c@d.co"},
	}

	for _, e := range all {
		mgr := emailtmpl.NewManager()
		// Placeholder defaults: Register takes the values Install set instead.
		if err := mgr.Register(emailtmpl.Definition{Name: e.name, Subject: "-", Text: "-", HTML: "-"}); err != nil {
			t.Fatalf("%s: %v", e.name, err)
		}
		subject, text, html, err := mgr.Render(e.name, data[e.name])
		if err != nil {
			t.Fatalf("%s: %v", e.name, err)
		}
		if !strings.Contains(subject, "Montara Pass") || !strings.Contains(html, "https://app.montarapass.com/static/logo-128.png") {
			t.Errorf("%s: not the Montara Pass template:\n%s", e.name, subject)
		}
		if strings.Contains(e.text, "Link}}") {
			// The link survives HTML escaping as a working href.
			if !strings.Contains(html, `href="https://app.montarapass.com/api/v1/auth/x?token=abc&amp;callback_url=%2Fverify-email"`) || !strings.Contains(text, link) {
				t.Errorf("%s: link missing or mangled", e.name)
			}
		}
		if dir := os.Getenv("EMAIL_PREVIEW_DIR"); dir != "" {
			_ = os.WriteFile(dir+"/"+e.name+".html", []byte(html), 0o644)
		}
	}
}

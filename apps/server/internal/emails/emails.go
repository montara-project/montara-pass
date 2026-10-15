// Package emails gives the emails Authula sends the Montara Pass look and
// voice. Authula reads each template from AUTHULA_TEMPLATE_<NAME>_{SUBJECT,
// TEXT,HTML} when its plugin registers it, so Install sets those variables
// before Authula is built. A variable the operator has set to a non-empty value is left alone.
package emails

import (
	"fmt"
	"os"
	"strings"
)

// The web app's light theme (apps/app/DESIGN.md). Email clients have no
// stylesheet to theme from, so the values are inlined.
const (
	bg      = "#eef2fb"
	panel   = "#ffffff"
	border  = "#d3dcef"
	fg      = "#101d3a"
	muted   = "#51607f"
	primary = "#145cff"
	font    = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`
)

// layout is the frame every email shares: the mark, one card, a footer under
// it. %PREVIEW% is the line inboxes show after the subject; %BODY% is the card.
var layout = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
</head>
<body style="margin:0;padding:0;background-color:` + bg + `;font-family:` + font + `;color:` + fg + `">
<div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">%PREVIEW%</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:` + bg + `">
<tr><td align="center" style="padding:40px 16px 48px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px">
<tr><td align="center" style="padding-bottom:24px">
<img src="{{.BaseURL}}/static/logo-128.png" width="56" height="56" alt="Montara Pass" style="display:block;border:0;width:56px;height:56px">
</td></tr>
<tr><td style="background-color:` + panel + `;border:1px solid ` + border + `;border-radius:16px;padding:32px 28px 24px">
%BODY%
</td></tr>
<tr><td align="center" style="padding:24px 12px 0">
<p style="margin:0 0 6px;font-size:12px;line-height:18px;color:` + muted + `">Montara Pass never asks for your master password by email.</p>
<p style="margin:0;font-size:12px;line-height:18px;color:` + muted + `">Sent by the Montara Pass server at {{.BaseURL}}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`

// textFooter closes every plain-text email with what the HTML footer says.
const textFooter = `

--
Montara Pass never asks for your master password by email.
Sent by the Montara Pass server at {{.BaseURL}}
`

// p is a paragraph of the card; note is a quieter one, for expiry and the
// "if this was not you" line.
func p(s string) string {
	return `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:` + fg + `">` + s + `</p>`
}

func note(s string) string {
	return `<p style="margin:0 0 8px;font-size:13px;line-height:20px;color:` + muted + `">` + s + `</p>`
}

// button is the email's one way through. A filled cell, not only a padded
// link, so Outlook still draws it blue.
func button(href, label string) string {
	return fmt.Sprintf(`<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px">
<tr><td align="center" bgcolor="%s" style="border-radius:12px">
<a href="%s" style="display:block;padding:14px 24px;font-size:15px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:12px">%s</a>
</td></tr>
</table>`, primary, href, label)
}

func b(s string) string { return `<strong style="font-weight:600">` + s + `</strong>` }

type email struct {
	name, subject, preview, html, text string
}

// Names are Authula's (core/email/constants); the fields each one can use are
// its context type in the plugin's types package.
var all = []email{
	{
		name:    "verify_email",
		subject: "Verify your email address for Montara Pass",
		preview: "One step left before you can sign in to Montara Pass.",
		html: p("Hello,") +
			p("Confirm that "+b("{{.UserEmail}}")+" is your email address to finish creating your Montara Pass account.") +
			button("{{.VerificationLink}}", "Verify email address") +
			note("This link expires in {{humanDuration .Expiry}}.") +
			note("If you did not create this account, ignore this email. No one can sign in to it until the address is verified."),
		text: `Hello,

Confirm that {{.UserEmail}} is your email address to finish creating your Montara Pass account:

{{.VerificationLink}}

This link expires in {{humanDuration .Expiry}}.

If you did not create this account, ignore this email. No one can sign in to it until the address is verified.`,
	},
	{
		name:    "magic_link_sign_in",
		subject: "Sign in to Montara Pass",
		preview: "A sign-in link for {{.UserEmail}}.",
		html: p("Hello,") +
			p("Use this link to sign in to Montara Pass as "+b("{{.UserEmail}}")+".") +
			button("{{.MagicLink}}", "Sign in to Montara Pass") +
			p("Signing in does not unlock the vault. That still takes your master password.") +
			note("This link expires in {{humanDuration .Expiry}}.") +
			note("If you did not ask to sign in, ignore this email."),
		text: `Hello,

Use this link to sign in to Montara Pass as {{.UserEmail}}:

{{.MagicLink}}

Signing in does not unlock the vault. That still takes your master password.

This link expires in {{humanDuration .Expiry}}.

If you did not ask to sign in, ignore this email.`,
	},
	{
		name:    "password_reset_request",
		subject: "Reset your Montara Pass account password",
		preview: "This resets the password you sign in with, not your master password.",
		html: p("Hello,") +
			p("A new account password was requested for "+b("{{.UserEmail}}")+".") +
			button("{{.ResetLink}}", "Reset account password") +
			p("This resets the password you sign in with. It does not reset your master password, which no one can reset: the vault stays encrypted with it.") +
			note("This link expires in {{humanDuration .Expiry}}.") +
			note("If you did not ask for this, ignore this email. The password stays as it is."),
		text: `Hello,

A new account password was requested for {{.UserEmail}}. To choose one, open:

{{.ResetLink}}

This resets the password you sign in with. It does not reset your master password, which no one can reset: the vault stays encrypted with it.

This link expires in {{humanDuration .Expiry}}.

If you did not ask for this, ignore this email. The password stays as it is.`,
	},
	{
		name:    "password_changed",
		subject: "Your Montara Pass account password was changed",
		preview: "The password you sign in with was changed. Your master password was not.",
		html: p("Hello,") +
			p("The account password for "+b("{{.UserEmail}}")+" was changed. Your master password and your vault are unchanged.") +
			note("If you did not make this change, someone else knows your account password: reset it. They cannot open the vault without your master password."),
		text: `Hello,

The account password for {{.UserEmail}} was changed. Your master password and your vault are unchanged.

If you did not make this change, someone else knows your account password: reset it. They cannot open the vault without your master password.`,
	},
	{
		name:    "email_change_request",
		subject: "Confirm your new email address for Montara Pass",
		preview: "Confirm the change to {{.NewEmail}}.",
		html: p("Hello,") +
			p("Confirm that "+b("{{.NewEmail}}")+" should replace {{.OldEmail}} as the email address of your Montara Pass account.") +
			button("{{.ChangeLink}}", "Confirm new address") +
			note("This link expires in {{humanDuration .Expiry}}.") +
			note("If you did not ask for this change, ignore this email. The address stays as it is."),
		text: `Hello,

Confirm that {{.NewEmail}} should replace {{.OldEmail}} as the email address of your Montara Pass account:

{{.ChangeLink}}

This link expires in {{humanDuration .Expiry}}.

If you did not ask for this change, ignore this email. The address stays as it is.`,
	},
	{
		name:    "email_changed",
		subject: "The email address of your Montara Pass account was changed",
		preview: "It is now {{.NewEmail}}.",
		html: p("Hello,") +
			p("The email address of your Montara Pass account was changed from "+b("{{.OldEmail}}")+" to "+b("{{.NewEmail}}")+". Sign in with the new one from now on.") +
			note("If you did not make this change, someone else has access to your account. They cannot open the vault without your master password."),
		text: `Hello,

The email address of your Montara Pass account was changed from {{.OldEmail}} to {{.NewEmail}}. Sign in with the new one from now on.

If you did not make this change, someone else has access to your account. They cannot open the vault without your master password.`,
	},
}

// Install points Authula at these templates. Call it before authula.New.
func Install() error {
	for _, e := range all {
		html := strings.NewReplacer("%PREVIEW%", e.preview, "%BODY%", e.html).Replace(layout)
		for suffix, value := range map[string]string{
			"SUBJECT": e.subject,
			"TEXT":    e.text + textFooter,
			"HTML":    html,
		} {
			key := "AUTHULA_TEMPLATE_" + strings.ToUpper(e.name) + "_" + suffix
			if os.Getenv(key) != "" {
				continue
			}
			if err := os.Setenv(key, value); err != nil {
				return err
			}
		}
	}
	return nil
}

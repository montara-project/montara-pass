// Package passkey runs the WebAuthn ceremonies for passkeys on the account
// itself: registering one, and signing in with one. A ceremony is begun on
// one request and finished on the next; what it was begun with is held in the
// key-value store between the two, and can be finished only once.
package passkey

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/url"
	"strings"
	"time"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"

	"montara-pass/server/internal/lib"
	"montara-pass/server/internal/lib/apperr"
)

// ceremonyTTL is how long a begun ceremony waits for the browser.
const ceremonyTTL = 5 * time.Minute

const ceremonyPrefix = "passkey:ceremony:"

// ErrCeremony answers a ceremony that is unknown, expired, finished or not the caller's.
var ErrCeremony = apperr.New(apperr.KindBadRequest, "the passkey request expired: try again")

// Service runs the ceremonies for one relying party.
type Service struct {
	RPID    string
	rpName  string
	baseURL string
	kv      lib.IPKV
}

// New sets up the relying party for rpID. baseURL is the origin the web app
// is served from; other origins are let in per ceremony (see RelyingParty).
func New(rpID, rpName, baseURL string, kv lib.IPKV) (*Service, error) {
	s := &Service{RPID: rpID, rpName: rpName, baseURL: baseURL, kv: kv}
	// Checks the configuration once, at boot.
	if _, err := s.RelyingParty(""); err != nil {
		return nil, err
	}
	return s, nil
}

// RelyingParty is the relying party for a ceremony begun by a request with
// this Origin header: it accepts the web app's own origin and, when allowed,
// the one that began the ceremony. go-webauthn matches origins only against
// its configuration, so it is built per ceremony; that is cheap.
func (s *Service) RelyingParty(origin string) (*webauthn.WebAuthn, error) {
	cfg := &webauthn.Config{
		RPID:          s.RPID,
		RPDisplayName: s.rpName,
		RPOrigins:     []string{s.baseURL},
		Timeouts: webauthn.TimeoutsConfig{
			Login:        webauthn.TimeoutConfig{Enforce: true, Timeout: ceremonyTTL},
			Registration: webauthn.TimeoutConfig{Enforce: true, Timeout: ceremonyTTL},
		},
	}
	switch originKind(origin, s.RPID) {
	case originWeb:
		cfg.RPOrigins = append(cfg.RPOrigins, origin)
	case originExtension:
		cfg.RPOpaqueOrigins = []string{origin}
	}
	return webauthn.New(cfg)
}

// User is an account as go-webauthn sees it. Its WebAuthn id, the user
// handle a discoverable passkey returns at sign-in, is the user's id.
type User struct {
	ID          uuid.UUID
	Email       string
	Name        string
	Credentials []webauthn.Credential
}

func (u User) WebAuthnID() []byte                         { return u.ID[:] }
func (u User) WebAuthnName() string                       { return u.Email }
func (u User) WebAuthnDisplayName() string                { return u.Name }
func (u User) WebAuthnCredentials() []webauthn.Credential { return u.Credentials }

type kind int

const (
	originNone kind = iota
	originWeb
	originExtension
)

// originKind says whether a ceremony may be finished from origin. The browser
// lets a page use the RP ID only from that domain or a subdomain of it, and an
// extension only for the hosts it has permission for, so either may finish
// what it begins: the web app on any host under the RP ID, and the browser
// extension, whose origin is its own (and, in Firefox, random per install).
func originKind(origin, rpID string) kind {
	u, err := url.Parse(origin)
	if err != nil || u.Host == "" || (u.Path != "" && u.Path != "/") {
		return originNone
	}
	switch u.Scheme {
	case "chrome-extension", "moz-extension":
		return originExtension
	case "https":
	case "http":
		// Only a development server on this machine.
		if rpID != "localhost" {
			return originNone
		}
	default:
		return originNone
	}
	host := u.Hostname()
	if host == rpID || strings.HasSuffix(host, "."+rpID) {
		return originWeb
	}
	return originNone
}

// held is a begun ceremony and the Origin header of the request that began it.
type held struct {
	Session webauthn.SessionData `json:"session"`
	Origin  string               `json:"origin"`
}

// Hold keeps a begun ceremony until it is finished, and returns its id.
// origin is the Origin header it was begun with, for RelyingParty to finish it.
func (s *Service) Hold(session *webauthn.SessionData, origin string) (string, error) {
	raw, err := json.Marshal(held{Session: *session, Origin: origin})
	if err != nil {
		return "", err
	}
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	id := hex.EncodeToString(b)
	return id, s.kv.Set(ceremonyPrefix+id, raw, ceremonyTTL)
}

// Take returns a held ceremony and forgets it in the same step, so of two
// requests finishing it at once only one gets it: it is finished only once.
func (s *Service) Take(id string) (session webauthn.SessionData, origin string, err error) {
	if id == "" {
		return session, "", ErrCeremony
	}
	raw, err := s.kv.Take(ceremonyPrefix + id)
	if err != nil || len(raw) == 0 {
		return session, "", ErrCeremony
	}
	var h held
	if err := json.Unmarshal(raw, &h); err != nil {
		return session, "", ErrCeremony
	}
	return h.Session, h.Origin, nil
}

// Descriptors names credentials for an allow or exclude list.
func Descriptors(creds []webauthn.Credential) []protocol.CredentialDescriptor {
	out := make([]protocol.CredentialDescriptor, len(creds))
	for i, c := range creds {
		out[i] = c.Descriptor()
	}
	return out
}

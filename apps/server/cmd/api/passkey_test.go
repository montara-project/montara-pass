package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/fxamacker/cbor/v2"
	"github.com/google/uuid"
)

// softAuthenticator is a passkey in memory, enough to drive the server's
// WebAuthn ceremonies the way a browser and an authenticator would: ES256,
// "none" attestation, user presence and verification always given.
type softAuthenticator struct {
	key    *ecdsa.PrivateKey
	id     []byte
	rpID   string
	origin string
	count  uint32
}

func newSoftAuthenticator(t *testing.T, rpID, origin string) *softAuthenticator {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	id := make([]byte, 16)
	_, _ = rand.Read(id)
	return &softAuthenticator{key: key, id: id, rpID: rpID, origin: origin}
}

var b64 = base64.RawURLEncoding

func (a *softAuthenticator) clientData(t *testing.T, kind, challenge string) []byte {
	t.Helper()
	raw, err := json.Marshal(map[string]any{"type": kind, "challenge": challenge, "origin": a.origin})
	if err != nil {
		t.Fatal(err)
	}
	return raw
}

// authData is rpIdHash | flags | signCount, plus the credential when made.
func (a *softAuthenticator) authData(t *testing.T, create bool) []byte {
	t.Helper()
	rpHash := sha256.Sum256([]byte(a.rpID))
	a.count++
	flags := byte(0x01 | 0x04) // user present, user verified
	if create {
		flags |= 0x40 // attested credential data
	}
	out := append(rpHash[:], flags)
	out = binary.BigEndian.AppendUint32(out, a.count)
	if !create {
		return out
	}
	x, y := make([]byte, 32), make([]byte, 32)
	a.key.X.FillBytes(x)
	a.key.Y.FillBytes(y)
	cose, err := cbor.Marshal(map[int]any{1: 2, 3: -7, -1: 1, -2: x, -3: y})
	if err != nil {
		t.Fatal(err)
	}
	out = append(out, make([]byte, 16)...) // AAGUID
	out = binary.BigEndian.AppendUint16(out, uint16(len(a.id)))
	out = append(out, a.id...)
	return append(out, cose...)
}

// create answers a registration's challenge, as PublicKeyCredential JSON.
func (a *softAuthenticator) create(t *testing.T, challenge string) map[string]any {
	t.Helper()
	att, err := cbor.Marshal(map[string]any{"fmt": "none", "attStmt": map[string]any{}, "authData": a.authData(t, true)})
	if err != nil {
		t.Fatal(err)
	}
	return map[string]any{
		"id": b64.EncodeToString(a.id), "rawId": b64.EncodeToString(a.id), "type": "public-key",
		"response": map[string]any{
			"clientDataJSON":    b64.EncodeToString(a.clientData(t, "webauthn.create", challenge)),
			"attestationObject": b64.EncodeToString(att),
			"transports":        []string{"internal"},
		},
		"clientExtensionResults": map[string]any{},
	}
}

// get answers a sign-in's challenge for the account userHandle names.
func (a *softAuthenticator) get(t *testing.T, challenge string, userHandle []byte) map[string]any {
	t.Helper()
	data := a.authData(t, false)
	client := a.clientData(t, "webauthn.get", challenge)
	clientHash := sha256.Sum256(client)
	digest := sha256.Sum256(append(append([]byte{}, data...), clientHash[:]...))
	sig, err := ecdsa.SignASN1(rand.Reader, a.key, digest[:])
	if err != nil {
		t.Fatal(err)
	}
	return map[string]any{
		"id": b64.EncodeToString(a.id), "rawId": b64.EncodeToString(a.id), "type": "public-key",
		"response": map[string]any{
			"clientDataJSON":    b64.EncodeToString(client),
			"authenticatorData": b64.EncodeToString(data),
			"signature":         b64.EncodeToString(sig),
			"userHandle":        b64.EncodeToString(userHandle),
		},
		"clientExtensionResults": map[string]any{},
	}
}

// challengeOf reads publicKey.challenge out of a ceremony's options.
func challengeOf(t *testing.T, options any) string {
	t.Helper()
	pk, _ := options.(map[string]any)["publicKey"].(map[string]any)
	challenge, _ := pk["challenge"].(string)
	if challenge == "" {
		t.Fatalf("no challenge in %v", options)
	}
	return challenge
}

// passkeyFlow registers a passkey on the user's account, signs in with it,
// and checks what must be refused: a wrong password, a ceremony finished
// twice, a passkey answering for another account, and a removed passkey.
func passkeyFlow(
	t *testing.T,
	call func(method, path, token string, body any, headers ...string) (int, map[string]any),
	userToken, userPassword, userID string,
) {
	t.Helper()
	auth := newSoftAuthenticator(t, "localhost", "http://localhost:8080")
	parsed := uuid.MustParse(userID)
	uid := parsed[:]

	if status, _ := call(http.MethodPost, "/api/v1/passkeys/register/begin", userToken, map[string]any{"password": "wrong-password"}); status != http.StatusForbidden {
		t.Fatalf("register with a wrong password: %d, want 403", status)
	}
	status, out := call(http.MethodPost, "/api/v1/passkeys/register/begin", userToken, map[string]any{"password": userPassword})
	if status != http.StatusOK {
		t.Fatalf("register begin: %d %v", status, out)
	}
	data := out["data"].(map[string]any)
	finish := map[string]any{
		"ceremony":            data["ceremony"],
		"name":                "Test key",
		"encrypted_vault_key": base64.StdEncoding.EncodeToString([]byte("sealed vault key")),
		"credential":          auth.create(t, challengeOf(t, data["options"])),
	}
	if status, out := call(http.MethodPost, "/api/v1/passkeys/register/finish", userToken, finish); status != http.StatusCreated {
		t.Fatalf("register finish: %d %v", status, out)
	}
	if status, _ := call(http.MethodPost, "/api/v1/passkeys/register/finish", userToken, finish); status != http.StatusBadRequest {
		t.Fatalf("register finished twice: %d, want 400", status)
	}
	status, out = call(http.MethodGet, "/api/v1/passkeys", userToken, nil)
	list, _ := out["data"].([]any)
	if status != http.StatusOK || len(list) != 1 || list[0].(map[string]any)["encrypted_vault_key"] == nil {
		t.Fatalf("passkeys: %d %v", status, out)
	}
	passkeyID := list[0].(map[string]any)["id"].(string)

	signIn := func(userHandle []byte) (int, map[string]any) {
		status, out := call(http.MethodPost, "/api/v1/auth/passkey/options", "", map[string]any{})
		if status != http.StatusOK {
			t.Fatalf("passkey options: %d %v", status, out)
		}
		return call(http.MethodPost, "/api/v1/auth/passkey/sign-in", "", map[string]any{
			"ceremony":   out["ceremony"],
			"credential": auth.get(t, challengeOf(t, out["options"]), userHandle),
		})
	}

	status, out = signIn(uid)
	if status != http.StatusOK || out["access_token"] == nil || out["refresh_token"] == nil {
		t.Fatalf("passkey sign-in: %d %v", status, out)
	}
	if key, _ := out["passkey"].(map[string]any)["encrypted_vault_key"].(string); key == "" {
		t.Fatalf("passkey sign-in without the sealed vault key: %v", out)
	}
	if status, _ := call(http.MethodGet, "/api/v1/passkeys", out["access_token"].(string), nil); status != http.StatusOK {
		t.Fatalf("access token from a passkey sign-in: %d", status)
	}

	other := append([]byte{}, uid...)
	other[0] ^= 0xff
	if status, _ := signIn(other); status != http.StatusUnauthorized {
		t.Fatalf("passkey answering for another account: %d, want 401", status)
	}

	if status, out := call(http.MethodDelete, "/api/v1/passkeys/"+passkeyID, userToken, nil); status != http.StatusOK {
		t.Fatalf("remove passkey: %d %v", status, out)
	}
	if status, _ := signIn(uid); status != http.StatusUnauthorized {
		t.Fatalf("sign-in with a removed passkey: %d, want 401", status)
	}
}

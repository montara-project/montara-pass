package main

import (
	"bytes"
	"context"
	"crypto/sha512"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	authulamodels "github.com/Authula/authula/models"
	"github.com/gofiber/fiber/v3"
	"github.com/golang-migrate/migrate/v4"

	"montara-pass/server/internal/app"
	"montara-pass/server/internal/config"
	"montara-pass/server/internal/lib"
	"montara-pass/server/internal/lib/constant"
	"montara-pass/server/internal/lib/midtrans"
	"montara-pass/server/internal/repositories"
	"montara-pass/server/internal/seeders"
)

// TestIntegration runs the boot sequence and the auth flow against a real
// PostgreSQL 18. It needs TEST_DB_DSN, pointing at a database it may wipe:
//
//	TEST_DB_DSN=postgres://postgres:postgres@localhost:5432/montara_pass_test?sslmode=disable go test ./cmd/api
func TestIntegration(t *testing.T) {
	dsn := os.Getenv("TEST_DB_DSN")
	if dsn == "" {
		t.Skip("TEST_DB_DSN not set")
	}

	const (
		superEmail = "admin@example.com"
		superPass  = "super-user-password"
		userEmail  = "user@example.com"
		userPass   = "plain-user-password"
	)

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	cfg := config.Config{
		App: config.ConfigApp{
			Env:    config.EnvDevelopment,
			Port:   8080,
			Name:   "montara-pass-test",
			Secret: "0123456789abcdef0123456789abcdef",
		},
		DB: config.ConfigDB{DSN: dsn, MaxOpenConns: 5, MaxIdleConns: 5},
		Auth: config.ConfigAuth{
			BaseURL:      "http://localhost:8080",
			EmailFrom:    "noreply@example.com",
			ResendAPIKey: "re_test",
		},
	}

	// Start from nothing; this also runs every down migration, the
	// Enterprise Edition's first, since its tables lean on the main ones.
	for _, newMigrator := range []func(*sql.DB) (*migrate.Migrate, error){lib.NewEEMigrator, lib.NewMigrator} {
		migrateDB, err := lib.OpenDB(dsn)
		if err != nil {
			t.Fatal(err)
		}
		m, err := newMigrator(migrateDB)
		if err != nil {
			t.Fatal(err)
		}
		if _, _, err := m.Version(); err == nil {
			if err := m.Down(); err != nil {
				t.Fatalf("down: %v", err)
			}
		}
		m.Close()
	}

	if err := migrateUp(&cfg.DB, logger); err != nil {
		t.Fatalf("migrate up: %v", err)
	}

	db, err := connectDB(&cfg.DB)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	repos := repositories.New(db)
	mirror := mirrorUser(&repos.User)
	auth := newAuth(cfg, mirror, logger)
	defer auth.CloseSystems()
	defer auth.ClosePlugins()

	ctx := context.Background()
	superUser := seeders.SuperUserSeeder{
		DB:       db,
		Auth:     auth.CoreServices(),
		Promote:  promoteSuperUser(&repos.User, mirror),
		Email:    superEmail,
		Password: "the-first-password",
	}
	// Twice: seeding must be repeatable.
	for range 2 {
		if err := seedAll(db, superUser, logger); err != nil {
			t.Fatalf("seed: %v", err)
		}
	}

	// The Community Edition boots on a database holding only the super user
	// (matched without regard to case), and refuses one holding anybody else.
	if others, err := repos.User.HasOtherThan(ctx, strings.ToUpper(superEmail)); err != nil || others {
		t.Fatalf("others with only the super user: %v err=%v", others, err)
	}

	// A plain user, created the way a verified sign-up ends up.
	services := auth.CoreServices()
	user, err := services.UserService.Create(ctx, "Plain User", userEmail, true, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	if others, err := repos.User.HasOtherThan(ctx, superEmail); err != nil || !others {
		t.Fatalf("others with a plain user: %v err=%v", others, err)
	}
	hash, err := services.PasswordService.Hash(userPass)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := services.AccountService.Create(ctx, user.ID, userEmail, authulamodels.AuthProviderEmail.String(), &hash); err != nil {
		t.Fatal(err)
	}

	// Authula's tables live in their own schema, and the mirror follows them.
	var authUsers int
	if err := db.QueryRow(`SELECT count(*) FROM authula.users`).Scan(&authUsers); err != nil || authUsers != 2 {
		t.Fatalf("authula.users: count=%d err=%v", authUsers, err)
	}
	roles := map[string]string{}
	rows, err := db.Query(`SELECT email, role FROM public.users`)
	if err != nil {
		t.Fatal(err)
	}
	for rows.Next() {
		var email, role string
		if err := rows.Scan(&email, &role); err != nil {
			t.Fatal(err)
		}
		roles[email] = role
	}
	rows.Close()
	if roles[superEmail] != constant.RoleSuperUser || roles[userEmail] != constant.RoleUser || len(roles) != 2 {
		t.Fatalf("public.users roles = %v", roles)
	}

	// Reconcile restores a mirror row that went missing and keeps the roles.
	if _, err := db.Exec(`DELETE FROM public.users WHERE email = $1`, userEmail); err != nil {
		t.Fatal(err)
	}
	if err := repos.User.Reconcile(ctx); err != nil {
		t.Fatalf("reconcile: %v", err)
	}
	var role string
	if err := db.QueryRow(`SELECT role FROM public.users WHERE email = $1`, superEmail).Scan(&role); err != nil || role != constant.RoleSuperUser {
		t.Fatalf("super user role after reconcile: %q err=%v", role, err)
	}
	if err := db.QueryRow(`SELECT role FROM public.users WHERE email = $1`, userEmail).Scan(&role); err != nil || role != constant.RoleUser {
		t.Fatalf("plain user after reconcile: %q err=%v", role, err)
	}

	billing(t, db, user.ID, superEmail)

	// Changing SUPER_USER's password resets the account on the next seed.
	superUser.Password = superPass
	if err := superUser.Seed(); err != nil {
		t.Fatalf("reseed: %v", err)
	}

	// Midtrans' Snap, as far as billing sees it: every checkout gets a page.
	snap := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			TransactionDetails struct {
				OrderID string `json:"order_id"`
			} `json:"transaction_details"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(map[string]string{"redirect_url": "https://pay.example/" + body.TransactionDetails.OrderID})
	}))
	defer snap.Close()
	payments := midtrans.New(midtransKey, false)
	payments.SnapURL = snap.URL

	application := &app.Application{Config: cfg, Logger: logger, DB: db, Repositories: repos, Auth: auth, Midtrans: payments}
	// With TEST_REDIS_URL the rate limiter and the idempotency keys go
	// through Redis, as they do with REDIS_URL; without it, through memory.
	if url := os.Getenv("TEST_REDIS_URL"); url != "" {
		client, err := connectRedis(url)
		if err != nil {
			t.Fatalf("connect redis: %v", err)
		}
		defer client.Close()
		application.Redis = client
	}

	server, err := newServer(application)
	if err != nil {
		t.Fatal(err)
	}

	// cookies holds the Set-Cookie pairs of the last answer.
	var cookies string

	// call sends one request and decodes the JSON answer.
	call := func(method, path, token string, body any, headers ...string) (int, map[string]any) {
		t.Helper()
		var payload io.Reader
		if body != nil {
			raw, _ := json.Marshal(body)
			payload = bytes.NewReader(raw)
		}
		req := httptest.NewRequest(method, path, payload)
		req.Header.Set("Content-Type", "application/json")
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		for i := 0; i+1 < len(headers); i += 2 {
			req.Header.Set(headers[i], headers[i+1])
		}
		resp, err := server.Test(req, fiber.TestConfig{Timeout: 30 * time.Second})
		if err != nil {
			t.Fatalf("%s %s: %v", method, path, err)
		}
		defer resp.Body.Close()
		cookies = ""
		for _, c := range resp.Cookies() {
			cookies += c.Name + "=" + c.Value + "; "
		}
		var out map[string]any
		_ = json.NewDecoder(resp.Body).Decode(&out)
		return resp.StatusCode, out
	}

	signIn := func(email, password string) map[string]any {
		t.Helper()
		status, out := call(http.MethodPost, "/api/v1/auth/email-password/sign-in", "", map[string]string{"email": email, "password": password})
		if status != http.StatusOK {
			t.Fatalf("sign in %s: %d %v", email, status, out)
		}
		for _, key := range []string{"user", "session", "access_token", "refresh_token", "expires_at", "expires_in"} {
			if out[key] == nil {
				t.Fatalf("sign in %s: no %q in %v", email, key, out)
			}
		}
		return out
	}

	if status, _ := call(http.MethodPost, "/api/v1/auth/email-password/sign-in", "", map[string]string{"email": superEmail, "password": "the-first-password"}); status == http.StatusOK {
		t.Fatal("the replaced super user password still signs in")
	}
	super := signIn(superEmail, superPass)
	superToken := super["access_token"].(string)
	superCookie := cookies
	if superCookie == "" {
		t.Fatal("sign in set no session cookie")
	}

	// A session without tokens can get a pair: by signing in again, or from
	// POST /token with the cookie or a bearer token.
	if status, out := call(http.MethodPost, "/api/v1/auth/email-password/sign-in", "", map[string]string{"email": superEmail, "password": superPass}, "Cookie", superCookie); status != http.StatusOK || out["access_token"] == nil || out["refresh_token"] == nil {
		t.Fatalf("repeated sign in: %d %v", status, out)
	}
	for _, headers := range [][]string{{"Cookie", superCookie}, {"Authorization", "Bearer " + superToken}} {
		status, out := call(http.MethodPost, "/api/v1/auth/token", "", nil, headers...)
		if status != http.StatusOK || out["access_token"] == nil || out["refresh_token"] == nil || out["expires_in"] == nil {
			t.Fatalf("token with %s: %d %v", headers[0], status, out)
		}
		if status, out := call(http.MethodPost, "/api/v1/auth/token/refresh", "", map[string]any{"refresh_token": out["refresh_token"]}); status != http.StatusOK {
			t.Fatalf("refresh of an issued token: %d %v", status, out)
		}
	}
	if status, _ := call(http.MethodPost, "/api/v1/auth/token", "", nil); status != http.StatusUnauthorized {
		t.Fatalf("token without a session: %d, want 401", status)
	}
	userToken := signIn(userEmail, userPass)["access_token"].(string)

	if status, out := call(http.MethodGet, "/api/health", "", nil); status != http.StatusOK {
		t.Fatalf("health: %d %v", status, out)
	}
	if status, out := call(http.MethodGet, "/api/v1/auth/me", superToken, nil); status != http.StatusOK {
		t.Fatalf("me with bearer: %d %v", status, out)
	}
	if status, out := call(http.MethodPost, "/api/v1/auth/token/refresh", "", map[string]any{"refresh_token": super["refresh_token"]}); status != http.StatusOK || out["access_token"] == nil {
		t.Fatalf("refresh: %d %v", status, out)
	}

	// Category writes: super user only.
	category := map[string]string{"name": "Integration"}
	if status, _ := call(http.MethodPost, "/api/v1/categories", "", category); status != http.StatusUnauthorized {
		t.Fatalf("create without auth: %d, want 401", status)
	}
	if status, _ := call(http.MethodPost, "/api/v1/categories", userToken, category); status != http.StatusForbidden {
		t.Fatalf("create as plain user: %d, want 403", status)
	}
	if status, out := call(http.MethodPost, "/api/v1/categories", superToken, category); status != http.StatusCreated {
		t.Fatalf("create as super user: %d %v", status, out)
	}
	if status, out := call(http.MethodGet, "/api/v1/categories?search=Integration", "", nil); status != http.StatusOK || len(out["data"].([]any)) != 1 {
		t.Fatalf("list: %d %v", status, out)
	}

	vaultFlow(t, call, superToken, userToken, userEmail, user.ID)
	billingFlow(t, call, superToken, userToken)

	// An address nobody has verified gets no session from signing up, and a
	// sign-in with it reaches nothing: no vault of its own, and no public key
	// for others to share with.
	const squatEmail, squatPass = "squatter@example.com", "squatter-password"
	status, out := call(http.MethodPost, "/api/v1/auth/email-password/sign-up", "", map[string]string{"name": "Squatter", "email": squatEmail, "password": squatPass})
	if status != http.StatusCreated || out["access_token"] != nil || cookies != "" {
		t.Fatalf("sign up: %d %v cookies=%q, want 201 without a session", status, out, cookies)
	}
	squatToken := signIn(squatEmail, squatPass)["access_token"].(string)
	if status, out := call(http.MethodGet, "/api/v1/keys", squatToken, nil); status != http.StatusForbidden {
		t.Fatalf("keys with an unverified email: %d %v, want 403", status, out)
	}
	if status, out := call(http.MethodPost, "/api/v1/items", squatToken, map[string]any{}); status != http.StatusForbidden {
		t.Fatalf("item with an unverified email: %d %v, want 403", status, out)
	}
	if status, out := call(http.MethodGet, "/api/v1/keys/public?email="+squatEmail, superToken, nil); status != http.StatusNotFound {
		t.Fatalf("public key of an unverified email: %d %v, want 404", status, out)
	}

	// A browser request from another site is refused before it is authenticated.
	if status, _ := call(http.MethodPost, "/api/v1/categories", superToken, category, "Sec-Fetch-Site", "cross-site", "Origin", "https://evil.example"); status != http.StatusForbidden {
		t.Fatalf("cross-site create: %d, want 403", status)
	}

	// Signing out revokes the access token.
	if status, out := call(http.MethodPost, "/api/v1/auth/sign-out", superToken, map[string]any{}); status != http.StatusOK {
		t.Fatalf("sign out: %d %v", status, out)
	}
	if status, _ := call(http.MethodPost, "/api/v1/categories", superToken, category); status != http.StatusUnauthorized {
		t.Fatalf("create after sign out: %d, want 401", status)
	}
}

// vaultFlow exercises the end-to-end encrypted vault as two users: an owner
// and the user an item is shared with. The server never reads the payloads,
// so any bytes stand in for ciphertext.
func vaultFlow(
	t *testing.T,
	call func(method, path, token string, body any, headers ...string) (int, map[string]any),
	ownerToken, otherToken, otherEmail, otherID string,
) {
	t.Helper()

	b64 := func(s string) string { return base64.StdEncoding.EncodeToString([]byte(s)) }
	// want sends a request, checks the status and returns the "data" object.
	want := func(wantStatus int, method, path, token string, body any) map[string]any {
		t.Helper()
		status, out := call(method, path, token, body)
		if status != wantStatus {
			t.Fatalf("%s %s: %d, want %d (%v)", method, path, status, wantStatus, out)
		}
		data, _ := out["data"].(map[string]any)
		return data
	}

	keys := map[string]any{
		"kdf_salt":              b64("0123456789abcdef"),
		"kdf_memory_kib":        19456,
		"kdf_iterations":        2,
		"kdf_parallelism":       1,
		"encrypted_vault_key":   b64("vault-key"),
		"public_key":            b64("public-key"),
		"encrypted_private_key": b64("private-key"),
	}
	want(http.StatusNotFound, http.MethodGet, "/api/v1/keys", ownerToken, nil)
	want(http.StatusUnauthorized, http.MethodGet, "/api/v1/keys", "", nil)
	want(http.StatusUnprocessableEntity, http.MethodPost, "/api/v1/keys", ownerToken, map[string]any{"kdf_salt": "***"})

	item := map[string]any{"type": "login", "encrypted_data": b64("secret v1"), "encrypted_item_key": b64("key for owner")}
	itemID := want(http.StatusCreated, http.MethodPost, "/api/v1/items", ownerToken, item)["id"].(string)
	itemPath := "/api/v1/items/" + itemID
	memberPath := itemPath + "/members/" + otherID
	share := map[string]any{"user_id": otherID, "role": "viewer", "encrypted_item_key": b64("key for other")}

	// Sharing needs the recipient's public key, so they must have a vault.
	want(http.StatusNotFound, http.MethodPost, itemPath+"/members", ownerToken, share)
	want(http.StatusNotFound, http.MethodGet, "/api/v1/keys/public?email="+otherEmail, ownerToken, nil)
	want(http.StatusCreated, http.MethodPost, "/api/v1/keys", ownerToken, keys)
	want(http.StatusConflict, http.MethodPost, "/api/v1/keys", ownerToken, keys)
	want(http.StatusCreated, http.MethodPost, "/api/v1/keys", otherToken, keys)
	if got := want(http.StatusOK, http.MethodGet, "/api/v1/keys/public?email="+otherEmail, ownerToken, nil); got["user_id"] != otherID || got["public_key"] != b64("public-key") {
		t.Fatalf("public key lookup: %v", got)
	}
	rewrapped := map[string]any{
		"kdf_salt": b64("fedcba9876543210"), "kdf_memory_kib": 65536, "kdf_iterations": 3, "kdf_parallelism": 4,
		"encrypted_vault_key": b64("vault-key-2"),
	}
	if got := want(http.StatusOK, http.MethodPut, "/api/v1/keys", ownerToken, rewrapped); got["encrypted_vault_key"] != b64("vault-key-2") || got["public_key"] != b64("public-key") {
		t.Fatalf("keys after a master password change: %v", got)
	}

	ownerFolder := want(http.StatusCreated, http.MethodPost, "/api/v1/folders", ownerToken, map[string]any{"encrypted_name": b64("work")})["id"].(string)
	otherFolder := want(http.StatusCreated, http.MethodPost, "/api/v1/folders", otherToken, map[string]any{"encrypted_name": b64("shared")})["id"].(string)
	want(http.StatusNotFound, http.MethodPut, "/api/v1/folders/"+ownerFolder, otherToken, map[string]any{"encrypted_name": b64("mine now")})

	// An item cannot be created in, or moved to, someone else's folder.
	inForeign := map[string]any{"type": "login", "encrypted_data": b64("x"), "encrypted_item_key": b64("k"), "folder_id": ownerFolder}
	want(http.StatusNotFound, http.MethodPost, "/api/v1/items", otherToken, inForeign)
	if got := want(http.StatusOK, http.MethodPut, itemPath+"/placement", ownerToken, map[string]any{"folder_id": ownerFolder, "favorite": true}); got["folder_id"] != ownerFolder || got["favorite"] != true || got["role"] != "owner" {
		t.Fatalf("owner placement: %v", got)
	}

	// Not shared yet: the item does not exist for the other user.
	want(http.StatusNotFound, http.MethodGet, itemPath, otherToken, nil)
	want(http.StatusCreated, http.MethodPost, itemPath+"/members", ownerToken, share)
	want(http.StatusConflict, http.MethodPost, itemPath+"/members", ownerToken, share)
	want(http.StatusForbidden, http.MethodPost, itemPath+"/members", otherToken, share)

	shared := want(http.StatusOK, http.MethodGet, itemPath, otherToken, nil)
	if shared["role"] != "viewer" || shared["encrypted_item_key"] != b64("key for other") || shared["folder_id"] != nil || shared["favorite"] != false {
		t.Fatalf("shared item as the recipient sees it: %v", shared)
	}

	// A write with an Idempotency-Key happens once: the repeat gets the first
	// folder back, and no second one is made. Another user's same key is theirs.
	idem := []string{"Idempotency-Key", "0b6e2c1a-7d0f-4f0e-9a51-3f6c2a9d1e77"}
	twice := map[string]any{"encrypted_name": b64("once")}
	_, made := call(http.MethodPost, "/api/v1/folders", ownerToken, twice, idem...)
	_, repeat := call(http.MethodPost, "/api/v1/folders", ownerToken, twice, idem...)
	madeID, repeatID := made["data"].(map[string]any)["id"], repeat["data"].(map[string]any)["id"]
	if madeID == nil || madeID != repeatID {
		t.Fatalf("repeated create made another folder: %v then %v", madeID, repeatID)
	}
	if _, theirs := call(http.MethodPost, "/api/v1/folders", otherToken, twice, idem...); theirs["data"].(map[string]any)["id"] == madeID {
		t.Fatalf("another user's key was answered with the owner's folder")
	}
	if status, out := call(http.MethodGet, "/api/v1/folders", ownerToken, nil); status != http.StatusOK || len(out["data"].([]any)) != 2 {
		t.Fatalf("owner's folders after a repeated create: %d %v", status, out)
	}
	if status, _ := call(http.MethodPost, "/api/v1/folders", ownerToken, twice, "Idempotency-Key", "short"); status != http.StatusBadRequest {
		t.Fatalf("malformed idempotency key: %d, want 400", status)
	}

	// Last use is each member's own: the recipient's does not show for the owner.
	want(http.StatusNotFound, http.MethodPut, "/api/v1/items/00000000-0000-7000-8000-000000000000/used", otherToken, nil)
	if got := want(http.StatusOK, http.MethodPut, itemPath+"/used", otherToken, nil); got["last_used_at"] == nil {
		t.Fatalf("last use as the recipient sees it: %v", got)
	}
	if got := want(http.StatusOK, http.MethodGet, itemPath, ownerToken, nil); got["last_used_at"] != nil {
		t.Fatalf("the recipient's last use leaked to the owner: %v", got)
	}

	if status, out := call(http.MethodGet, "/api/v1/items", otherToken, nil); status != http.StatusOK || len(out["data"].([]any)) != 1 {
		t.Fatalf("recipient's list: %d %v", status, out)
	}
	if status, out := call(http.MethodGet, itemPath+"/members", otherToken, nil); status != http.StatusOK || len(out["data"].([]any)) != 2 {
		t.Fatalf("members: %d %v", status, out)
	}

	// Each member files the item in their own folders.
	want(http.StatusNotFound, http.MethodPut, itemPath+"/placement", otherToken, map[string]any{"folder_id": ownerFolder})
	want(http.StatusOK, http.MethodPut, itemPath+"/placement", otherToken, map[string]any{"folder_id": otherFolder})
	if status, out := call(http.MethodGet, "/api/v1/items?folder_id="+otherFolder, otherToken, nil); status != http.StatusOK || len(out["data"].([]any)) != 1 {
		t.Fatalf("recipient's folder: %d %v", status, out)
	}
	if got := want(http.StatusOK, http.MethodGet, itemPath, ownerToken, nil); got["folder_id"] != ownerFolder {
		t.Fatalf("owner's filing moved with the recipient's: %v", got)
	}

	// A viewer reads, an editor writes, and a stale revision is refused.
	edit := map[string]any{"encrypted_data": b64("secret v2"), "revision": 1}
	want(http.StatusForbidden, http.MethodPut, itemPath, otherToken, edit)
	want(http.StatusOK, http.MethodPut, memberPath, ownerToken, map[string]any{"role": "editor"})
	if got := want(http.StatusOK, http.MethodPut, itemPath, otherToken, edit); got["revision"] != float64(2) || got["encrypted_data"] != b64("secret v2") || got["type"] != "login" {
		t.Fatalf("edit by an editor: %v", got)
	}
	want(http.StatusConflict, http.MethodPut, itemPath, ownerToken, edit)
	want(http.StatusForbidden, http.MethodDelete, itemPath, otherToken, nil)

	// Deleting a folder unfiles its items.
	want(http.StatusOK, http.MethodDelete, "/api/v1/folders/"+ownerFolder, ownerToken, nil)
	if got := want(http.StatusOK, http.MethodGet, itemPath, ownerToken, nil); got["folder_id"] != nil {
		t.Fatalf("item still filed in a deleted folder: %v", got)
	}

	// Revoking, then rotating the key for the members that are left.
	rotate := func(revision int, members ...string) map[string]any {
		memberKeys := []map[string]any{}
		for _, id := range members {
			memberKeys = append(memberKeys, map[string]any{"user_id": id, "encrypted_item_key": b64("new key")})
		}
		return map[string]any{"encrypted_data": b64("secret v3"), "revision": revision, "member_keys": memberKeys}
	}
	ownerID := shared["owner_id"].(string)
	want(http.StatusBadRequest, http.MethodDelete, itemPath+"/members/"+ownerID, ownerToken, nil)
	want(http.StatusConflict, http.MethodPut, itemPath+"/key", ownerToken, rotate(2, ownerID))
	want(http.StatusOK, http.MethodDelete, memberPath, ownerToken, nil)
	want(http.StatusNotFound, http.MethodGet, itemPath, otherToken, nil)
	want(http.StatusConflict, http.MethodPut, itemPath+"/key", ownerToken, rotate(2, ownerID, otherID))
	if got := want(http.StatusOK, http.MethodPut, itemPath+"/key", ownerToken, rotate(2, ownerID)); got["revision"] != float64(3) || got["encrypted_item_key"] != b64("new key") {
		t.Fatalf("rotated item: %v", got)
	}

	// A member can leave; the trash hides the item from the others.
	want(http.StatusCreated, http.MethodPost, itemPath+"/members", ownerToken, share)
	want(http.StatusOK, http.MethodDelete, itemPath, ownerToken, nil)
	want(http.StatusNotFound, http.MethodGet, itemPath, otherToken, nil)
	if status, out := call(http.MethodGet, "/api/v1/items?trashed=true", ownerToken, nil); status != http.StatusOK || len(out["data"].([]any)) != 1 {
		t.Fatalf("trash: %d %v", status, out)
	}
	want(http.StatusOK, http.MethodPut, itemPath+"/restore", ownerToken, nil)
	want(http.StatusOK, http.MethodDelete, memberPath, otherToken, nil)
	want(http.StatusOK, http.MethodDelete, itemPath+"/force", ownerToken, nil)
	want(http.StatusNotFound, http.MethodGet, itemPath, ownerToken, nil)
}

// billing checks the Enterprise Edition's billing tables against what they
// promise: only an account with the 'user' role subscribes or buys, each
// table takes only its kind of plan, and a user has one live subscription.
func billing(t *testing.T, db *sql.DB, userID, superEmail string) {
	t.Helper()

	var superID string
	if err := db.QueryRow(`SELECT id FROM users WHERE email = $1`, superEmail).Scan(&superID); err != nil {
		t.Fatal(err)
	}

	var monthly, lifetime string
	if err := db.QueryRow(`INSERT INTO plans (code, name, billing, billing_interval, amount, currency)
		VALUES ('pro-monthly', 'Pro', 'recurring', 'month', 500, 'USD') RETURNING id`).Scan(&monthly); err != nil {
		t.Fatalf("recurring plan: %v", err)
	}
	if err := db.QueryRow(`INSERT INTO plans (code, name, billing, amount, currency)
		VALUES ('pro-lifetime', 'Pro forever', 'one_time', 9900, 'USD') RETURNING id`).Scan(&lifetime); err != nil {
		t.Fatalf("one-time plan: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO plans (code, name, billing, amount, currency)
		VALUES ('no-interval', 'Broken', 'recurring', 500, 'USD')`); err == nil {
		t.Fatal("a recurring plan without an interval was accepted")
	}

	subscribe := func(user, plan string) error {
		_, err := db.Exec(`INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end, amount, currency)
			VALUES ($1, $2, 'active', now(), now() + interval '1 month', 500, 'USD')`, user, plan)
		return err
	}
	buy := func(user, plan string) error {
		_, err := db.Exec(`INSERT INTO purchases (user_id, plan_id, status, amount, currency, paid_at)
			VALUES ($1, $2, 'paid', 9900, 'USD', now())`, user, plan)
		return err
	}

	if err := subscribe(userID, monthly); err != nil {
		t.Fatalf("user subscribes: %v", err)
	}
	if subscribe(userID, monthly) == nil {
		t.Fatal("a second live subscription was accepted")
	}
	if subscribe(superID, monthly) == nil {
		t.Fatal("the super user subscribed")
	}
	if subscribe(userID, lifetime) == nil {
		t.Fatal("a subscription to a one-time plan was accepted")
	}
	if err := buy(userID, lifetime); err != nil {
		t.Fatalf("user buys: %v", err)
	}
	if buy(superID, lifetime) == nil {
		t.Fatal("the super user bought a plan")
	}
	if buy(userID, monthly) == nil {
		t.Fatal("a purchase of a recurring plan was accepted")
	}
	// A subscriber keeps the 'user' role.
	if _, err := db.Exec(`UPDATE users SET role = $2 WHERE id = $1`, userID, constant.RoleSuperUser); err == nil {
		t.Fatal("a subscriber was made super user")
	}

	// billingFlow starts from empty tables.
	if _, err := db.Exec(`TRUNCATE subscriptions, purchases, plans`); err != nil {
		t.Fatal(err)
	}
}

// midtransKey signs the notifications billingFlow sends.
const midtransKey = "SB-Mid-server-test"

// billingFlow drives billing over HTTP: plans managed by the super user, a
// subscription and a purchase paid through Midtrans' notification, which is
// believed only when signed and for the amount ordered.
func billingFlow(
	t *testing.T,
	call func(method, path, token string, body any, headers ...string) (int, map[string]any),
	superToken, userToken string,
) {
	t.Helper()

	want := func(wantStatus int, method, path, token string, body any) map[string]any {
		t.Helper()
		status, out := call(method, path, token, body)
		if status != wantStatus {
			t.Fatalf("%s %s: %d %v, want %d", method, path, status, out, wantStatus)
		}
		data, _ := out["data"].(map[string]any)
		return data
	}
	notify := func(orderID, status, gross string) (int, map[string]any) {
		t.Helper()
		sum := sha512.Sum512([]byte(orderID + "200" + gross + midtransKey))
		return call(http.MethodPost, "/api/v1/billing/midtrans/notification", "", map[string]string{
			"order_id": orderID, "status_code": "200", "gross_amount": gross,
			"transaction_status": status, "currency": "IDR", "signature_key": hex.EncodeToString(sum[:]),
		})
	}

	monthly := map[string]any{"code": "pro-monthly", "name": "Pro", "billing": "recurring", "billing_interval": "month", "amount": 50000, "currency": "IDR", "active": true}
	want(http.StatusForbidden, http.MethodPost, "/api/v1/plans", userToken, monthly)
	plan := want(http.StatusCreated, http.MethodPost, "/api/v1/plans", superToken, monthly)
	want(http.StatusConflict, http.MethodPost, "/api/v1/plans", superToken, monthly)
	want(http.StatusBadRequest, http.MethodPost, "/api/v1/plans", superToken, map[string]any{"code": "x", "name": "X", "billing": "one_time", "billing_interval": "month", "amount": 1, "currency": "IDR", "active": true})
	lifetime := want(http.StatusCreated, http.MethodPost, "/api/v1/plans", superToken, map[string]any{"code": "pro-lifetime", "name": "Pro forever", "billing": "one_time", "amount": 990000, "currency": "IDR", "active": true})
	retired := want(http.StatusCreated, http.MethodPost, "/api/v1/plans", superToken, map[string]any{"code": "old", "name": "Old", "billing": "recurring", "billing_interval": "year", "amount": 1, "currency": "IDR", "active": false})

	if status, out := call(http.MethodGet, "/api/v1/plans", "", nil); status != http.StatusOK || len(out["data"].([]any)) != 2 {
		t.Fatalf("public plans: %d %v", status, out)
	}

	// Only a user account subscribes, to a plan on offer, of the right kind.
	want(http.StatusForbidden, http.MethodPost, "/api/v1/billing/subscriptions", superToken, map[string]any{"plan_id": plan["id"]})
	want(http.StatusNotFound, http.MethodPost, "/api/v1/billing/subscriptions", userToken, map[string]any{"plan_id": retired["id"]})
	want(http.StatusNotFound, http.MethodPost, "/api/v1/billing/subscriptions", userToken, map[string]any{"plan_id": lifetime["id"]})

	sub := want(http.StatusCreated, http.MethodPost, "/api/v1/billing/subscriptions", userToken, map[string]any{"plan_id": plan["id"]})
	orderID := "sub-" + sub["id"].(string)
	if sub["status"] != "pending" || sub["checkout_url"] != "https://pay.example/"+orderID {
		t.Fatalf("subscription: %v", sub)
	}
	// Asked again while pending, the same payment is resumed.
	if again := want(http.StatusOK, http.MethodPost, "/api/v1/billing/subscriptions", userToken, map[string]any{"plan_id": plan["id"]}); again["id"] != sub["id"] {
		t.Fatalf("resumed subscription: %v", again)
	}

	// Notifications: a bad signature or amount is refused, and a valid one
	// activates the subscription once.
	if status, _ := call(http.MethodPost, "/api/v1/billing/midtrans/notification", "", map[string]string{"order_id": orderID, "status_code": "200", "gross_amount": "50000.00", "transaction_status": "settlement", "signature_key": "forged"}); status != http.StatusForbidden {
		t.Fatalf("forged notification: %d", status)
	}
	if status, _ := notify(orderID, "settlement", "1.00"); status != http.StatusBadRequest {
		t.Fatalf("notification for another amount: %d", status)
	}
	for range 2 {
		if status, out := notify(orderID, "settlement", "50000.00"); status != http.StatusOK {
			t.Fatalf("settlement: %d %v", status, out)
		}
	}
	overview := want(http.StatusOK, http.MethodGet, "/api/v1/billing", userToken, nil)
	active, _ := overview["subscription"].(map[string]any)
	if active == nil || active["status"] != "active" || active["checkout_url"] != nil {
		t.Fatalf("overview after settlement: %v", overview)
	}
	want(http.StatusConflict, http.MethodPost, "/api/v1/billing/subscriptions", userToken, map[string]any{"plan_id": plan["id"]})

	// A purchase: paid, bought only once, then refunded.
	buy := want(http.StatusCreated, http.MethodPost, "/api/v1/billing/purchases", userToken, map[string]any{"plan_id": lifetime["id"]})
	if status, out := notify("buy-"+buy["id"].(string), "capture", "990000.00"); status != http.StatusOK {
		t.Fatalf("capture under review: %d %v", status, out)
	}
	if status, out := notify("buy-"+buy["id"].(string), "settlement", "990000.00"); status != http.StatusOK {
		t.Fatalf("purchase settlement: %d %v", status, out)
	}
	want(http.StatusConflict, http.MethodPost, "/api/v1/billing/purchases", userToken, map[string]any{"plan_id": lifetime["id"]})
	if status, out := notify("buy-"+buy["id"].(string), "refund", "990000.00"); status != http.StatusOK {
		t.Fatalf("refund: %d %v", status, out)
	}
	if status, out := call(http.MethodGet, "/api/v1/billing", userToken, nil); status != http.StatusOK ||
		out["data"].(map[string]any)["purchases"].([]any)[0].(map[string]any)["status"] != "refunded" {
		t.Fatalf("overview after refund: %d %v", status, out)
	}

	// The super user sees billing, empty, and retired plans.
	if status, out := call(http.MethodGet, "/api/v1/plans/all", superToken, nil); status != http.StatusOK || len(out["data"].([]any)) != 3 {
		t.Fatalf("all plans: %d %v", status, out)
	}
}

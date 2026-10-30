---
title: Testing the web app end to end locally needs the Community Edition on the test database
author: Masb0ymas
date: 2026-10-30
branch: dev
cost: { minutes: 21, tokens: 187941 }
id: l-e55f7704
scope: repo
status: active
src: agent
touches:
  - ".github/workflows/release.yml"
  - README.md
  - apps/docs/.gitignore
  - apps/docs/content/docs/getting-started/docker.mdx
---

## Decided
Browser checks of apps/app run against the test database with the Community Edition API, which seeds one verified user and needs no email key. The Cloud Edition refuses to start without a Resend key and sender, and sign-up needs a verification email.

## Tried and ruled out
Making the access token cookie invalid to test the refresh-on-401 path: requests still answered 200, because the API falls back to Authula's session cookie when the bearer token is bad. Clear `authula.session_token` too, or the refresh never runs.
Opening pages with a full page load after unlocking: the vault keys are never persisted, so every reload locks the vault again. Move between pages through the sidebar links instead.

## Watch out
The Community Edition stops at boot if the database already has other accounts (left by the integration test). Reset the test database first; it is meant to be wiped. Never point this at the dev database.
REQUIRE_PAID_SHARING must be false for the Community Edition.

In the code:
- `go run ./cmd/migrate refresh` with DB_DSN pointing at montara_pass_test
- API: `go run -ldflags '-X montara-pass/server/internal/config.Edition=community' ./cmd/api` with ENV=development, PORT=18080, RESEND_API_KEY= FROM_ADDRESS= LEMONSQUEEZY_*= REQUIRE_PAID_SHARING=false SEED_ON_BOOT=true SUPER_USER=email:password
- App: `VITE_API_PROXY_TARGET=http://localhost:18080 VITE_EDITION=community vite --port 5199 --strictPort`
- Token cookies: authAccessToken, authRefreshToken; session cookie: authula.session_token

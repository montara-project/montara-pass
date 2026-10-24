---
title: "Authula password reset goes through verify-email, which adds the token"
author: Masb0ymas
date: 2026-10-24
branch: dev
cost: { minutes: 14, tokens: 193432 }
id: l-d710e7b6
scope: repo
status: active
touches:
  - packages/shared/src/api/dtos/auth/schema.ts
  - apps/app/src/lib/api/services/types/auth.ts
  - apps/app/src/lib/api/services/auth.ts
  - apps/app/src/lib/constants/auth.ts
  - apps/app/src/lib/auth/email-auth.ts
  - apps/app/src/components/block/auth/forgot-password-form.tsx
  - apps/app/src/components/block/auth/reset-password-form.tsx
  - apps/app/src/routes/(auth)/forgot-password/index.tsx
  - apps/app/src/routes/reset-password/index.tsx
  - apps/app/src/components/block/auth/login-form.tsx
---

## Decided
The reset email link is Authula's GET /email-password/verify-email?token&callback_url. For a password
reset token it 302s to callback_url with ?token= added and does not consume it; POST
/email-password/change-password {token, password} does. apps/app sends callback_url /reset-password
(via emailLinkCallback in lib/auth/email-auth.ts, same rule as sign-up). /reset-password sits outside
the (auth) route group so a still-signed-in browser is not bounced to the vault. The extension only
links to the web app's /forgot-password: an email link can't open the popup.

## Watch out
change-password with a bad or expired token answers 500 "invalid or expired token", not 401/403, so
failedAttempt in cmd/api/routes.go does not count it toward the IP block (tokens are 32 random bytes).
A reset ends every session (BeforeChangePassword hook in authula.go); clients must drop stored tokens.
TestIntegration's passwordResetFlow covers the redirect and the reset against real Postgres.

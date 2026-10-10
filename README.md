# montara-pass

pnpm monorepo.

| Path          | Stack                                  | Deploy                      |
| ------------- | -------------------------------------- | --------------------------- |
| `apps/app`    | vinext (Next.js API on Vite), Node     | Docker (`apps/app/Dockerfile`) |
| `apps/server` | Go, Fiber v3, PostgreSQL, golang-migrate | Docker (`apps/server/Dockerfile`) |
| `apps/extension` | Browser extension (Manifest V3), Vite + React | Load `dist/chrome` or `dist/firefox` |
| `apps/web`    | vinext on Cloudflare Workers           | `wrangler` / `vinext-cloudflare deploy` |

## Requirements

Node >= 22, pnpm 11, Go 1.27, Docker.

## Setup

```sh
pnpm install
cp apps/server/.env.example apps/server/.env   # fill in APP_SECRET, RESEND_API_KEY, SUPER_USER
cp apps/app/.env.example apps/app/.env         # NEXT_PUBLIC_API_URL, default http://localhost:8080
pnpm db:up          # postgres on localhost:5432 (override: POSTGRES_PORT=55432)
pnpm migrate:up
```

## Development

```sh
pnpm dev:app        # http://localhost:5173
pnpm dev:web        # http://localhost:5174 (Workers runtime via @cloudflare/vite-plugin)
pnpm dev:server     # http://localhost:8080/health
pnpm dev            # all three in parallel
```

## Migrations

SQL files live in `apps/server/migrations` and are embedded in the binary.

```sh
pnpm --filter @montara-pass/server run migrate:create add_something
pnpm migrate:up
pnpm migrate:down                                          # rolls back everything (localhost only)
pnpm --filter @montara-pass/server run migrate:up:seed     # up, then seed the categories
pnpm --filter @montara-pass/server run migrate:refresh     # down + up
pnpm --filter @montara-pass/server run migrate:force 2     # after a failed migration
pnpm --filter @montara-pass/server run migrate:version
```

`down` and `refresh` delete all data, users included, so they refuse a
database that is not on localhost unless `--allow-remote` is passed.

## Server

Structure follows [gofi](https://github.com/masb0ymas/gofi): Fiber v3 with
[Authula](https://github.com/Authula/authula) embedded at `/v1/auth`
(email & password, magic link, Google; session cookie or
`Authorization: Bearer <access_token>`). Requires PostgreSQL 18 (`uuidv7()`).

Every setting is an environment variable, or the flag of the same name
(`go run ./cmd/api -h`); see `apps/server/.env.example`.

- Authula keeps its tables in the `authula` schema and creates them on boot.
  `public.users` mirrors `authula.users` and adds the application `role`.
- `SEED_ON_BOOT=true` creates the `SUPER_USER` account with the `super_user`
  role. Only that role may write `/v1/categories`; everyone can read them.
### Vault

The password vault is end-to-end encrypted: clients encrypt everything and the
server stores ciphertext and wrapped keys only (base64 in JSON), so it cannot
search or sort by content. All routes need a signed-in user.

| Route | Purpose |
|---|---|
| `GET/POST/PUT /v1/keys` | The caller's key set; `PUT` re-wraps the vault key after a master password change |
| `GET /v1/keys/public?email=` | Public key of the user to share with |
| `/v1/folders` | The caller's own folders (encrypted names) |
| `/v1/items` | Items; `?folder_id=`, `?type=`, `?trashed=true` |
| `PUT /v1/items/:id/placement` | The caller's own folder and favorite flag for an item |
| `/v1/items/:id/members` | Share with a user (`editor` or `viewer`), change a role, revoke or leave |
| `PUT /v1/items/:id/key` | Re-encrypt under a new item key after revoking a member |

The master password is separate from the sign-in password and never reaches
the server. An item update names the `revision` it read; a stale one answers 409.

- `apps/server/cmd/api` has an integration test, skipped unless `TEST_DB_DSN`
  points at a PostgreSQL 18 database it may wipe.

## App

`apps/app` is the vault UI, structured after the web UI of
[kodingup-assessment](https://github.com/masb0ymas/kodingup-assessment):
`components/{ui,block,layout}`, `config`, `data`, `hooks`, `lib` and `types`.
It talks to the Go API with a bearer token, so its origin
(`http://localhost:5173` in development) must be in the API's
`CORS_ALLOWED_ORIGINS`.

- `lib/api`: one axios client (`client-fetch.ts`, refreshes the access token
  on a 401), then `services` (HTTP), `queries` (TanStack Query options),
  `models` and `dtos` (zod).
- `lib/crypto`: the end-to-end encryption. Argon2id turns the master password
  into the master key; that unwraps the vault key (folder names, private key);
  the RSA-OAEP private key unwraps one AES-256-GCM key per item. Sharing wraps
  the item key with the recipient's public key.
- The unlocked keys live in memory only (`lib/stores/vault.ts`): a reload
  locks the vault and asks for the master password again.
- Routes: `/sign-in`, `/sign-up`, `/vault`, `/folders`, `/trash`,
  `/categories`, `/profile`.

## Browser extension

`apps/extension` fills and saves logins from the vault in Chrome (and other
Chromium browsers) and Firefox 128+. It reuses the web app's `lib/crypto`, so
both read and write the same ciphertext.

```sh
pnpm build:extension   # writes apps/extension/dist/chrome and dist/firefox
```

- **Chrome**: `chrome://extensions` → enable Developer mode → Load unpacked →
  `apps/extension/dist/chrome`.
- **Firefox**: `about:debugging#/runtime/this-firefox` → Load Temporary
  Add-on → `apps/extension/dist/firefox/manifest.json`.

Sign in, then unlock with the master password. The vault must already exist:
create it in the web app first.

- The unlocked keys are kept in the browser's in-memory session storage, so
  the popup does not ask again each time it opens. They are cleared after 15
  minutes without use, when the browser closes, and on Lock.
- **Fill** is offered only for a login whose saved URL belongs to the page in
  the active tab, and the page is touched only when you click it.
- The API and web app URLs default to `VITE_DEFAULT_API_URL` and
  `VITE_DEFAULT_APP_URL` at build time (`apps/extension/.env.example`) and can
  be changed under Settings in the popup.

## Docker

```sh
docker compose up -d --build   # postgres -> migrate -> server:8080, app:3000
```

`app` builds with `output: "standalone"` and runs `node server.js`.

## Deploy web (Cloudflare Workers)

```sh
pnpm --filter @montara-pass/web exec wrangler login
pnpm --filter @montara-pass/web run build
pnpm deploy:web
```

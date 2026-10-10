# montara-pass

pnpm monorepo.

| Path          | Stack                                  | Deploy                      |
| ------------- | -------------------------------------- | --------------------------- |
| `apps/app`    | vinext (Next.js API on Vite), Node     | Docker (`apps/app/Dockerfile`) |
| `apps/server` | Go, Fiber v3, PostgreSQL, golang-migrate | Docker (`apps/server/Dockerfile`) |
| `apps/web`    | vinext on Cloudflare Workers           | `wrangler` / `vinext-cloudflare deploy` |

## Requirements

Node >= 22, pnpm 11, Go 1.27, Docker.

## Setup

```sh
pnpm install
cp apps/server/.env.example apps/server/.env   # fill in APP_SECRET, RESEND_API_KEY, SUPER_USER
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

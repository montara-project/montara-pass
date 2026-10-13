# montara-pass

pnpm monorepo.

| Path          | Stack                                  | Deploy                      |
| ------------- | -------------------------------------- | --------------------------- |
| `apps/app`    | Vite SPA, TanStack Router, React 19    | Served by the API (built into its image) |
| `apps/server` | Go, Fiber v3, PostgreSQL, golang-migrate | Docker (`apps/server/Dockerfile`), with the web app inside |
| `apps/extension` | Browser extension (Manifest V3), Vite + React | Load `dist/chrome` or `dist/firefox` |
| `apps/web`    | vinext on Cloudflare Workers           | `cf` / `vinext-cloudflare deploy` |
| `apps/docs`   | Next.js, Fumadocs                      | Docker (`apps/docs/Dockerfile`) |

## Requirements

Node >= 22, pnpm 11, Go 1.27, Docker.

## Setup

```sh
pnpm install
cp apps/server/.env.example apps/server/.env   # fill in APP_SECRET, RESEND_API_KEY, SUPER_USER
cp apps/app/.env.example apps/app/.env         # optional; the defaults work
pnpm db:up          # postgres on localhost:5432 (override: POSTGRES_PORT=55432)
pnpm migrate:up
```

## Development

```sh
pnpm dev:app        # http://localhost:5173, proxies /api to the API on :8080
pnpm dev:web        # http://localhost:5174 (Workers runtime via @cloudflare/vite-plugin)
pnpm dev:server     # http://localhost:8080/api/health
pnpm dev            # all three in parallel
```

## Lint, format and commits

```sh
pnpm lint            # oxlint (.oxlintrc.json)
pnpm lint:fix
pnpm format          # oxfmt (.oxfmtrc.json; apps/web keeps its own style)
pnpm format:check
```

`pnpm install` sets up two git hooks with husky: `pre-commit` runs lint-staged
(oxlint and oxfmt on the staged files), and `commit-msg` runs commitlint, which
only accepts [conventional commits](https://www.conventionalcommits.org). The
release workflow reads those messages to pick the next version.

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
[Authula](https://github.com/Authula/authula) embedded at `/api/v1/auth`
(email & password, magic link, Google; session cookie or
`Authorization: Bearer <access_token>`). Requires PostgreSQL 18 (`uuidv7()`).

Every setting is an environment variable, or the flag of the same name
(`go run ./cmd/api -h`); see `apps/server/.env.example`.

- Authula keeps its tables in the `authula` schema and creates them on boot.
  `public.users` mirrors `authula.users` and adds the application `role`.
- `SEED_ON_BOOT=true` creates the `SUPER_USER` account with the `super_user`
  role. Only that role may write `/api/v1/categories`; everyone can read them.
### Vault

The password vault is end-to-end encrypted: clients encrypt everything and the
server stores ciphertext and wrapped keys only (base64 in JSON), so it cannot
search or sort by content. All routes need a signed-in user.

| Route | Purpose |
|---|---|
| `GET/POST/PUT /api/v1/keys` | The caller's key set; `PUT` re-wraps the vault key after a master password change |
| `GET /api/v1/keys/public?email=` | Public key of the user to share with |
| `/api/v1/folders` | The caller's own folders (encrypted names) |
| `/api/v1/items` | Items; `?folder_id=`, `?type=`, `?trashed=true` |
| `PUT /api/v1/items/:id/placement` | The caller's own folder and favorite flag for an item |
| `/api/v1/items/:id/members` | Share with a user (`editor` or `viewer`), change a role, revoke or leave |
| `PUT /api/v1/items/:id/key` | Re-encrypt under a new item key after revoking a member |

The master password is separate from the sign-in password and never reaches
the server. An item update names the `revision` it read; a stale one answers 409.

- `apps/server/cmd/api` has an integration test, skipped unless `TEST_DB_DSN`
  points at a PostgreSQL 18 database it may wipe. `TEST_REDIS_URL` adds the
  tests of the rate limiter and idempotency keys shared through Redis.

## App

`apps/app` is the vault UI: a Vite single-page app with TanStack Router,
structured as `src/routes` plus `src/components/{ui,block,layout}`, `config`,
`data`, `hooks`, `lib` and `types`. It talks to the Go API with a bearer token.

The UI and the API share one origin: in development Vite proxies `/api` to the
API, and in production the API serves the built app itself from `./public`,
with a fallback to `index.html` for client routes. `CORS_ALLOWED_ORIGINS` is
only needed when the app is hosted somewhere else (`VITE_API_URL`).

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
Chromium browsers) and Firefox 140+. It reuses the web app's `lib/crypto`, so
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
  the active tab. A badge in login fields opens the same list under the field.
- **Passkeys**: a script in the page's own world stands in for
  `navigator.credentials` (top frame only). With the vault unlocked, a prompt
  offers to save a new passkey or to sign in with a saved one; the key (ES256)
  is kept in the login's encrypted content, so the server needs no change and
  the passkey works on any computer the vault is unlocked on. Whatever the
  vault cannot answer goes to the browser's own passkeys, unchanged. A
  passkey always reports the user as verified: that means the vault was
  unlocked with the master password within the auto-lock time, not that
  anyone was asked again for this sign-in.
  `node apps/extension/src/lib/passkey.check.ts` checks the signing.
- **Full screen** in the popup opens the vault in a tab: filters, the list and
  the selected item side by side, with reveal, copy, add, edit and share.
  Folders, and changing who has an item, stay in the web app.
- The build points at `https://app.montarapass.com`; Settings → Self-hosted
  takes the URL of another server. `pnpm --filter @montara-pass/extension
  watch` builds against the local servers instead
  (`apps/extension/.env.example`).

## Docs

`apps/docs` is the documentation site: Next.js with
[Fumadocs](https://www.fumadocs.dev), pages as MDX under `content/docs`.

```sh
pnpm dev:docs       # http://localhost:3001/docs
```

## Docker

```sh
docker build -f apps/server/Dockerfile -t montara-pass-server .
docker run --rm -p 8080:8080 --env-file apps/server/.env montara-pass-server
```

One image holds the Go API and the built web app; `http://localhost:8080`
serves both. The build context is the repository root.

### Dokploy

`deploy/docker-compose.yml` runs PostgreSQL 18 and the server image, built
from this repository. In Dokploy, create a Compose service, set the compose
path to `./deploy/docker-compose.yml`, paste `deploy/.env.example` into the
Environment tab and fill it in, then add a domain for the `server` service on
port 8080. Adding `COMPOSE_PROFILES=docs` also runs the docs site (port 3000).

## Deploy web (Cloudflare Workers)

The Worker is described in `apps/web/cloudflare.config.ts` (name, entrypoint,
compatibility date, the `ASSETS` binding) and deployed with Cloudflare's `cf`
CLI; there is no `wrangler.jsonc`. `cf` and `@cloudflare/vite-plugin` 2 are
still beta releases.

```sh
pnpm --filter @montara-pass/web exec cf auth login
pnpm deploy:web                                      # builds, then deploys
pnpm --filter @montara-pass/web run start            # serve the build locally
```

## Releases

Versions follow conventional commits and are cut from `main` by three
workflows in `.github/workflows`:

1. **Release Prepare** (run manually on `main`) bumps the version in every
   `package.json`, writes `CHANGELOG.md` and opens a `chore: release vX.Y.Z` PR.
2. **Release Publish** runs when that PR merges: it tags the commit, creates
   the GitHub release and starts the Release workflow.
3. **Release** pushes `ghcr.io/montara-project/montara-pass/server` (the API
   with the web app inside) and `.../docs`, and deploys `apps/web` to
   Cloudflare Workers.

It needs the repository secrets `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID`. The repository variable `VITE_API_URL` is optional:
set it only when the web app is hosted on another origin than the API.

**React Doctor** comments on pull requests and scans `main`; it is advisory
and never fails a check.

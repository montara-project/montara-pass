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
cp apps/server/.env.example apps/server/.env
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
pnpm migrate:down
pnpm --filter @montara-pass/server run migrate:version
```

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

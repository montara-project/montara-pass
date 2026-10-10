# Montara Pass web app

The vault UI: a Vite single-page app with TanStack Router, React 19, TanStack
Query, Form and Table, and Tailwind 4.

## Scripts

- `pnpm run dev` starts Vite on http://localhost:5173 and proxies `/api` to the
  API on http://localhost:8080 (`VITE_API_PROXY_TARGET` overrides the target).
- `pnpm run build` writes the static bundle to `dist/`.
- `pnpm run preview` serves that bundle locally.
- `pnpm run typecheck` runs `tsc --noEmit`.

## Layout

- `src/routes`: file-based routes. `(auth)` and `(app)` group routes without
  adding a URL segment; `src/routeTree.gen.ts` is generated.
- `src/components`, `src/lib`, `src/hooks`, `src/config`, `src/data`,
  `src/types`: the rest of the app. `@/` points at `src/`.

In production there is no Node server: `apps/server/Dockerfile` copies `dist/`
next to the Go binary, which serves it.

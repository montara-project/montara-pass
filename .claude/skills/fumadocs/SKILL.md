---
name: fumadocs
description: Work on the Fumadocs docs site in apps/docs (TanStack Start + Fumadocs MDX on Cloudflare Workers). Use when writing or editing docs content under content/docs, changing sidebar/navigation via meta.json, or touching docs wiring (source.config.ts, src/lib/source.ts, docs layout, splat route, MDX components).
---

# Fumadocs

Docs site lives in `apps/docs`. Content source is Fumadocs MDX (Config API); routing by TanStack Start (file routes under `src/routes`), served by a Cloudflare Worker.

## Pick a branch

- **Writing or editing docs content** (new page, frontmatter, sidebar order, MDX components) → read [CONTENT.md](CONTENT.md) and follow it.
- **Changing docs wiring** (collections/schema, loader, layout, slug page, MDX setup, theming) → read [APP.md](APP.md) and follow it.

Wrong branch wastes the whole change: content edits never touch `src/` wiring; wiring changes never hand-write slugs or sidebar trees.

## Rules for both

1. **Follow the existing wiring, don't re-derive it.** `apps/docs/src/lib/source.ts`, `apps/docs/source.config.ts`, `apps/docs/src/routes/$.tsx`, `apps/docs/src/lib/layout.shared.tsx` are the source of truth. Match their patterns; don't introduce a second convention (e.g. macro API alongside the Config API).
2. **Slugs and sidebar are generated, never hardcoded.** File paths under `apps/docs/content/docs` plus `meta.json` produce slugs and the page tree via `loader()`. No manual route lists.
3. **Title comes from frontmatter, not `# h1`.** Every doc file needs `title` in frontmatter; body starts at `##`.
4. **TanStack Start moves fast.** Before writing route, server function or `vite.config.ts` code, check the current TanStack Start and Fumadocs TanStack Start docs; APIs (`createServerFn`, server route `handlers`, `createStart`) change between minors.
5. **Verify by running.** Content: `pnpm --filter @montara-pass/docs dev` (port 3001) and open the page. Wiring: also run `typecheck` (`tsc --noEmit`) and `build` + `preview` in `apps/docs` (preview runs the Worker in workerd). Generated `.source/` output is build artifact, never edited by hand.

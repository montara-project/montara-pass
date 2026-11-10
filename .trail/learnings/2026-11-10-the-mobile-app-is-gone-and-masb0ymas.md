---
title: "The mobile app is gone, and the dependency fixes it needed were dropped or re-pointed to what still uses them"
author: Masb0ymas
date: 2026-11-10
branch: dev
cost: { minutes: 13, tokens: 38417 }
id: l-698c8bfb
scope: repo
status: active
replaces: l-3a028cce
src: agent
touches:
  - "patches/deepmerge@4.3.1.patch"
  - pnpm-lock.yaml
  - pnpm-workspace.yaml
  - package.json
  - README.md
  - ISSUES.md
---

## Decided
The user removed apps/mobile (the Expo app) with its packages: the workspace script, the Expo entries in minimumReleaseAgeExclude, and its README section went with it.
Overrides were kept only where something still pulls the vulnerable version, checked by removing each one, re-resolving the lockfile and running the full audit:
- zod stays: @cloudflare/config (apps/web's Vite plugin) pins 4.6.5.
- minimatch stays: eslint 10's config-array asks for ^10.2.4.
- node-forge stays (web-ext). The deepmerge patch stays: web-ext's addons-linter still uses 4.3.1.
- fast-uri (now resolves to 3.1.9 by itself) and the glob 13 override (no glob 13 left) were dropped.
`pnpm audit --prod` reports nothing.

## Tried and ruled out
- Dropping the zod override with the mobile app: zod 4.6.5 came back through apps/web, a high advisory in the prod audit.

## Watch out
- The full (non-prod) audit still lists basic-ftp and ip-address through release-it, and glob 11 through rimraf in the extension. All are dev tooling and were there before.
- The Expo agent skills under .agents/skills are not packages; they were left as they are.

In the code: pnpm-workspace.yaml (overrides, patchedDependencies, auditConfig), patches/deepmerge@4.3.1.patch, package.json (scripts), README.md, ISSUES.md (DEP-4).

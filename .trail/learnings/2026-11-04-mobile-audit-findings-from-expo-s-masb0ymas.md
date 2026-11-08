---
title: "Mobile audit findings from Expo's CLI cannot be patched with overrides yet"
author: Masb0ymas
date: 2026-11-04
branch: dev
cost: { minutes: 1, tokens: 10327 }
id: l-35a208da
scope: repo
status: active
src: agent
touches:
  - pnpm-workspace.yaml
---

## Decided
- `pnpm audit --prod` reports 3 findings, all only in the mobile app through Expo's CLI (build-time config/prebuild, not shipped code): deepmerge (low), glob and minimatch (moderate). The user chose to override only what is a safe patch bump; nothing qualified, so they stay open until Expo updates.

## Tried and ruled out
- Overriding deepmerge to 4.3.2 (the advisory's "patched" version): that version was never published. npm's latest is 4.3.1 (March 2023), so `pnpm install` refuses the override.
- Overriding glob to 14.x and minimatch to 11.x: their fixes are major versions that @expo/cli does not ask for, with a real risk of breaking it. Not done.

## Watch out
- Before adding an override for an advisory, check the patched version exists (`npm view <pkg> versions`).
- If a clean audit is wanted meanwhile, accept them via `auditConfig.ignoreGhsas` in pnpm-workspace.yaml with a reason, not with overrides.

In the code: pnpm-workspace.yaml `overrides`; advisories GHSA-gcqx-w48m-w2h4 (deepmerge), GHSA-3g3m-2fjr-6pw4 (glob), GHSA-g3hv-75wg-m249 (minimatch).

---
title: "IP blocks live only in Settings' Security tab for the super user, and form fields add a caller's classes instead of replacing them"
author: Masb0ymas
date: 2026-11-10
branch: dev
cost: { minutes: 9, tokens: 65409 }
id: l-ae5c8c9b
scope: repo
status: active
src: agent
touches:
  - apps/app/src/components/block/security/block-form.tsx
  - apps/app/src/components/block/form/text-field.tsx
  - apps/app/src/components/block/security/ip-blocks.tsx
  - apps/app/src/components/layout/shell.tsx
---

## Decided
The user removed IP blocks from the sidebar. The list is now only a section of Settings' Security tab, shown to the super user; the server's SuperUser middleware refuses anyone else. The old /settings/ip-blocks route redirects to /security, like /activity does.
In Settings' breadcrumbs, the three tabs read "Settings / General", "Settings / Profile" and "Settings / Security".

## Tried and ruled out
- Keeping the standalone IP blocks page with its status filter: dropped with the sidebar entry, since nothing linked to it any more.

## Watch out
- The block-IP dialog's address field showed no box at all: TextField spread the caller's props after its own className, so className="font-mono" replaced the whole field style. TextField now merges a caller's className with cn.
- The failing typecheck along the way was the IP blocks component still reading the old route's search params after that route lost validateSearch, not the form.

In the code: apps/app/src/components/block/form/text-field.tsx (className merged), apps/app/src/components/block/security/block-form.tsx (validationLogic: checked, IP_PATTERN), apps/app/src/components/block/security/ip-blocks.tsx (IpBlockSection), apps/app/src/routes/(app)/settings/ip-blocks/index.tsx (redirect), apps/app/src/components/layout/shell.tsx (CRUMBS).

---
title: "The web theme reveal is a port of Magic UI's toggler, not the installed component"
author: Masb0ymas
date: 2026-10-25
branch: dev
cost: { minutes: 1, tokens: 1908 }
id: l-67d1b608
scope: repo
status: active
src: agent
touches:
  - apps/web/components/site-header.tsx
---

## Decided
`revealTheme()` in `apps/web/components/site-header.tsx` ports only the mechanism of Magic UI's
animated theme toggler (view transition plus a clip-path circle on `::view-transition-new(root)`),
because the installed component does not fit this site's theme model (see below).

## Tried and ruled out
`shadcn add @magicui/animated-theme-toggler`: ruled out because it toggles a `.dark` class with two
states, while this site flips `.light` with three (light, dark, system), and because it pulls in
lucide-react and a `cn` helper the site does not have.

## Watch out
- Keep `fill: "forwards"` on the animation, otherwise the old theme flashes for a frame at the end:
  the CSS pins the new snapshot to the collapsed circle (`--theme-reveal-from`) for Firefox.
- Keep clip-path coordinates as percentages, because Chrome misplaces px values on fractional
  display scales (magicuidesign/magicui#989).
- 450ms is longer than DESIGN.md's 200ms motion beat on purpose, because a full-page reveal at
  200ms reads as a flicker.

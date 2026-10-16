---
name: Montara Pass Marketing Site
description: A dark-first navy site that argues like a printed record — hairlines, ruled rows and tabular monospace instead of cards and shadows.
colors:
  # Brand palette
  electric-blue: "#145cff"
  arctic-cyan: "#42c8ff"
  # Dark theme: the :root defaults, and what the site ships
  night-ink: "#0b1529"
  abyss-navy: "#070d1c"
  panel-navy: "#101d3a"
  paper-white: "#f4f7fd"
  mist-slate: "#a3b1cc"
  hairline-mist: "rgb(169 182 211 / 0.14)"
  pale-cyan: "#b9e8ff"
  accent-white: "#ffffff"
  # Light theme: the same roles, flipped by the .light class
  night-ink-light: "#f6f8fd"
  abyss-navy-light: "#eef2fb"
  panel-navy-light: "#ffffff"
  paper-white-light: "#101d3a"
  mist-slate-light: "#51607f"
  hairline-mist-light: "rgb(16 29 58 / 0.1)"
  arctic-cyan-light: "#145cff"
  pale-cyan-light: "#0f3fb5"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: "-0.025em"
    fontVariation: "opsz 14..32"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: "-0.025em"
  body-large:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 2rem
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.75rem
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.25rem
  body-small:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.25rem
  meta:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
  label-mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
    letterSpacing: "0.12em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  control: "10px"
  xl: "12px"
  card: "14px"
  pill: "999px"
spacing:
  hair: "1px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  section: "80px"
  section-lg: "112px"
components:
  button-primary:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.night-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-primary-pill:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.night-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "6px 16px"
  button-primary-submit:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.night-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 16px"
  button-secondary:
    backgroundColor: "{colors.panel-navy}"
    textColor: "{colors.paper-white}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  chip:
    backgroundColor: "{colors.panel-navy}"
    textColor: "{colors.mist-slate}"
    typography: "{typography.meta}"
    rounded: "{rounded.md}"
    padding: "2px 6px"
  card:
    backgroundColor: "{colors.panel-navy}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.card}"
    padding: "24px"
  icon-tile:
    backgroundColor: "{colors.panel-navy}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.lg}"
    size: "32px"
  tape-row:
    backgroundColor: "transparent"
    textColor: "{colors.paper-white}"
    typography: "{typography.label}"
    padding: "15px 8px 15px 4px"
  ledger-row:
    backgroundColor: "{colors.abyss-navy}"
    textColor: "{colors.mist-slate}"
    typography: "{typography.label-mono}"
    padding: "9px 0"
  input:
    backgroundColor: "{colors.abyss-navy}"
    textColor: "{colors.paper-white}"
    typography: "{typography.body-small}"
    rounded: "{rounded.xl}"
    height: "48px"
    padding: "0 16px"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.mist-slate}"
    typography: "{typography.body-small}"
    rounded: "{rounded.sm}"
    padding: "0"
---

# Design System: Montara Pass Marketing Site

This records the system as it ships in `apps/web`. The whole of it lives in
`app/globals.css`: the `@theme` tokens, the `.btn` set, the pricing surface's
`.tape` and `.ledger`, the `.light` override, and the page frame and hatch on
`body`. Product truth and voice are in `/PRODUCT.md`; the app and the extension
are a different world and have their own files.

## Overview

**Creative North Star: "The Printed Record"**

The site's job is evidentiary. It has to show what the server holds, what it
cannot read, what a tier entitles you to, and who wrote the software. It answers
in the form a record takes: ruled rows, hairline rules, slugs, terms, amounts in
tabular monospace, a receipt tape and a ledger, printed on one 1200px column
that sits on a hatched ground. Nothing here is a brochure panel. A card is the
exception, and it is a card because it holds two short lists side by side, not
because the section wanted decoration.

The record is dark. Night ink is the ground inside the frame, abyss navy is the
ground outside it and inside every art well, and panel navy is the one step up —
a sheet of stock. Text is paper white, annotations are mist slate, and a hairline
of mist at 14% does all the dividing. The hatch in the gutters is the only
texture in the system, and it is drawn from the text colour at 4%, so it moves
with the theme.

Two colours are allowed to say something. Electric blue selects and tints;
arctic cyan marks live state — the focus ring, the selected tape row, the value
the server never sees. Everything else is a step of the same navy. Prose is set
in Inter; JetBrains Mono is what the record prints.

Rejected, by decision, on the pricing surface: the category's three cards side by
side with a highlighted middle tier and a monthly/annual toggle. The tiers are one
continuous tape of ruled lines instead.

**Key Characteristics:**

- One 1200px bordered column on a hatched abyss ground; the frame is the page.
- Hairlines divide. Grid seams are a 1px gap over the line colour, not a border.
- Electric blue selects, arctic cyan marks; the filled action is paper white.
- Near-shadowless: one 5% black shadow on the card and nothing else.
- Depth is tonal — abyss under ink, ink under panel — never blur or glow.
- Inter for prose, JetBrains Mono for anything the record prints.
- Every section heading's second clause is dimmed to 75% mist, by the `Dim` device.
- One motion beat, 200ms, with a reduced-motion rule beside every transition.

## Colors

A navy scale in one hue with a single saturated blue and a cyan pointer; every
component names a role, and the role resolves differently in each theme.

### Primary

- **Electric Blue** (#145cff): the brand accent, used sparingly and never as a
  button fill. It is the text selection (a solid fill, with Accent White on it),
  the 7% wash on the selected tape row, and the radial glow behind the closing
  call to action. On the selection fill Accent White holds 5.2:1 in both themes.

### Secondary

- **Arctic Cyan** (#42c8ff): the live mark. The focus ring on every control, the
  2px rule down the left of the selected tape row, the selected radio dot, the
  "never sent" value in the ledger, the live dot on the release chip, and the
  second half of the wordmark. In the light theme it is Electric Blue (#145cff),
  because cyan does not hold on paper.
- **Pale Cyan** (#b9e8ff): one use, the reference code returned by the contact
  form. A tint of the cyan for text that must be copied.

### Neutral

- **Night Ink** (#0b1529): the ground inside the page frame and the fill of every
  grid cell. Also the text on a paper-white fill.
- **Abyss Navy** (#070d1c): the darkest step. The ground outside the frame, under
  the hatch, and the fill of every art well and of the ledger column.
- **Panel Navy** (#101d3a): the one step up — the card, the chip, the icon tile,
  the secondary button, the open mobile menu.
- **Paper White** (#f4f7fd): body text, headings, and the fill of the primary
  button. It is the light source of the system, and it is a role, not a
  background.
- **Mist Slate** (#a3b1cc): every annotation — ledes, captions, terms, labels,
  the dimmed half of a heading, resting nav links. It holds 8.4:1 on night ink.
- **Hairline Mist** (rgb(169 182 211 / 0.14)): the 1px rule. Section tops, tape
  lines, card edges, chip edges, the grid seam. Written as `rgb()` with alpha
  rather than hex, because it is the one token that is a veil and not a colour.
- **Accent White** (#ffffff): text and icons on an accent fill.

The light theme flips the same role names inside `.light`: Night Ink becomes
#f6f8fd, Abyss Navy #eef2fb, Panel Navy #ffffff, Paper White #101d3a, Mist Slate
#51607f, the hairline rgb(16 29 58 / 0.1). Electric Blue is unchanged and Arctic
Cyan resolves to it.

One colour in the build is outside this set: the contact form's error text and
its invalid field edge use Tailwind's rose scale directly. It is recorded here as
it ships, and is not part of the token set.

Three tokens are declared in `@theme` and consumed by nothing yet:
`--color-card-hover` (#17284e), `--color-brand` (#17284e) and `--color-accent-hover`
(#0f4ad6). They are not part of the recorded system; a surface that needs a hover
tone takes `--color-mist` at 55% on a border, which is what the secondary button
does.

### Named Rules

**The Two Voices Rule.** Electric blue selects and tints; arctic cyan marks live
state. Neither fills a button. The filled action in this world is paper white on
night ink, and there is one per viewport.

**The Token Rule.** A component names a role, never a hex. A new surface picks
from the existing steps before a step is added.

**The Hairline Rule.** A 1px `--color-line` rule does the dividing. A grid seam
is `gap-px` over `bg-line`, with each cell carrying `bg-ink` — never a border on
each cell.

## Typography

**Display Font:** Inter (`ui-sans-serif, system-ui, sans-serif`), loaded from
Google Fonts with an optical-size axis
**Body Font:** the same family
**Mono Font:** JetBrains Mono (`ui-monospace, SFMono-Regular, Menlo, monospace`)

**Character:** one family, and hierarchy from size, weight and colour rather than
a second face. Inter is served with its `opsz` axis over 14–32, so headings
resolve to its display cut and body text to its text cut without a second
request. JetBrains Mono is not a style: it is the mark of something the record
prints — an amount, a term, a slug, a ledger field, a caption, a version.

### Hierarchy

- **Display** (500, 3rem to 4.5rem, line-height 1.02, -0.025em): the hero and
  the closing heading. `text-balance`, stepped at 640px and 1024px.
- **Headline** (500, 2.25rem to 3.5rem, line-height 1.05, -0.025em): every
  section heading. Centred in `Statement`, and always two-tone.
- **Title** (500, 1.5rem, line-height 1.33, -0.025em): a heading inside a block
  ("What every tier has", "Billing, plainly"). The tape's own title is the
  exception: `clamp(2rem, 4.2vw, 2.75rem)` at -0.03em.
- **Body large** (400, 1.125rem, line-height 2rem): the hero's and the closing
  call to action's lede, capped at `max-w-xl`, and the legal pages' introduction,
  capped at `max-w-2xl`. `Statement`'s subcopy is one step down again, at 1rem
  over a 1.75rem line.
- **Body** (400, 0.9375rem, line-height 1.75rem): the workhorse — list items,
  FAQ answers, card copy, the tape's lede. Mist slate, and 46ch to 42rem wide.
- **Label** (500, 0.875rem, line-height 1.25rem): buttons, tape row names, field
  labels, the footer's column headings.
- **Body small** (400, 0.875rem, line-height 1.25rem): the most-used size in the
  build — nav links, footer links, contact fields, error messages.
- **Meta** (400, 0.75rem, JetBrains Mono, lowercase): chips, captions under a
  link, terms, the version, the footer's copyright.
- **Label mono** (500, 0.6875rem, 0.12em, uppercase): the slug line above a
  heading and the ledger's column title. The only uppercase in the system.

### Named Rules

**The One Family Rule.** Inter for prose and headings, JetBrains Mono for what
the record prints. No third face, and no display face.

**The Mono Is Not Decoration Rule.** Monospace marks a value, a term or a
mechanical label. It never carries a paragraph, and it never sets a heading
except the tape's title, which is a printed slip.

**The Dim Rule.** A section heading is two-tone: the second clause is dimmed to
75% mist (`Dim` in `components/shared.tsx`). It holds 5.2:1 on night ink and
3.5:1 in the light theme, so it is legal for large headings only — never for
body copy, and never below heading sizes.

**The Tabular Rule.** Anything that counts or prices sets
`font-variant-numeric: tabular-nums`. The tape's amounts are the case it exists
for.

## Layout

One column, one frame. `body` paints abyss navy with a 135° hairline hatch — a
1px line of the text colour at 4% every 9px — and a single `max-w-[1200px]`
column sits on it with `border-x border-line bg-ink`. The hatch is only ever
visible in the gutters; the frame is the page.

Inside the frame:

- **The header** is sticky at 64px, on `bg-ink/80` with a 12px backdrop blur and
  a hairline under it. Nav links at 14px, the primary button as a pill.
- **A section** is a band: `border-t border-line`, padding `24px` horizontally
  rising to `40px` at 640px, and `80px` to `112px` vertically. `Statement` is the
  centred variant, `py-20 sm:py-28`, on `max-w-3xl`.
- **Grid seams.** Where a band holds equal cells, the grid is
  `grid gap-px border-t border-line bg-line` with each cell on `bg-ink`, so the
  1px gap is the line. Three columns at 768px (the explainer, the feature matrix,
  the three steps), two at 640px (the contact channels), four at 1024px (the
  contact channels again).
- **Two-column blocks** are 280px or 240px of label beside the content, or the
  card pair on `max-w-4xl`. The pricing page splits at 1024px into
  `minmax(0,1fr) 360px` — the tape, then the ledger behind a dashed rule.
- **Text columns**: `max-w-3xl` for a statement, `max-w-4xl` for a two-column
  block, `max-w-2xl` for the FAQ and the contact form, `max-w-xl` for a lede.

The rhythm is 4px. 6 to 12px inside a control, 16 to 24px between blocks, 24px
to 28px for a card's padding, 36px to 40px for the tape and the ledger, and 80
and 112px for a section band. Stacks use `gap`, not margins, and a heading's
group is tight while the band above it is generous.

Breakpoints are Tailwind's defaults and nothing else: 640px, 768px, 1024px.

**The Frame Rule.** Content never escapes the 1200px column, and the hatch is
never painted inside it. Full-bleed is not a move this system has.

**The Seam Rule.** A shared edge is one line, not two. Cells in a grid own no
border; the gap over the line colour is the seam.

## Elevation & Depth

This system is near-shadowless, deliberately. Depth is tone and rule: abyss navy
under night ink, night ink under panel navy, and a 1px hairline wherever two
surfaces meet. A surface is raised by taking the next step of the scale, and the
scale has three steps. The hatch in the gutters is the only texture, and the only
translucency is the sticky header, which blurs the page it covers at 12px so the
frame reads as glass over paper. The closing call to action carries one radial
wash of electric blue — 24% in the dark theme, 10% in the light — a light source,
not a shadow.

### Shadow Vocabulary

- **Card rest** (`box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)`):
  the shared `card` class in `components/shared.tsx` only. It is Tailwind's
  `shadow-sm` with the shadow colour cut to 5% black, which on this ground is
  barely a lift. It exists to keep a card from reading as a hole.

There is no other shadow in the build. Menus, the header and the mobile nav all
sit on tone and a hairline.

### Named Rules

**The Tone Not Shadow Rule.** To raise a surface, take the next tone — abyss,
ink, panel. Do not reach for a shadow. The card's 5% black is the system's one
concession and it is not a pattern to extend.

**The Functional Translucency Rule.** Blur is used once, on the sticky header,
to separate it from the page it covers. It is not a decoration and no other
surface gets one.

## Shapes

Moderately rounded rectangles on a short ladder, growing with the size of the
thing: 6px on a chip, 8px on an icon tile and a nav target, 10px on a button and
an art well, 12px on a form field, 14px on a card. The global focus style also
stamps a 4px radius onto the control it outlines — 6px on the tape row, which
sets its own — so the ring hugs a rounded corner rather than a square one. 999px
covers the pills (the header's button, the release chip, the filter) and the two
tiny circles: the tape's radio mark at 8px and the ledger's state dot at 5px.

Borders are 1px and are never thickened to carry emphasis; a state changes a
border's colour, not its width. The 2px rule is a mark and appears in three
places only: down the left of the selected tape row, down the left of the current
entry in the legal table of contents, and beside a footnote. Dashed rules are the
ledger's — they divide a column of proof rather than a page, and at 1024px the
ledger's left edge is dashed so the two columns read as one sheet torn in two.

Icons are drawn inline in `components/icons.tsx` on a 24 grid: 2px stroke, round
caps and joins, no fill, `currentColor`, `aria-hidden`. They are 16px inside
buttons, chips, cards and fields, 20px on the header's menu toggle, and 18px on
the footer's GitHub link. The only raster images are the logo mark and the stack
logos in the trust strip.

## Components

### Buttons

Quiet and certain; the label leads and the arrow follows.

- **Shape:** 42px tall in the flow (10px 16px padding around a 20px line), 10px
  radius, 14px at 500, 8px gap to an icon.
- **Primary:** paper white with night-ink text — the neutral ink fill, which
  reads as light on the dark theme and navy on the light one. It dims to 88%
  opacity on hover.
- **Primary pill:** the header's "Log in" and the mobile menu's, both
  `rounded-full` — the header's at `px-4 py-1.5`, the menu's stretched to
  `flex-1`. Pills exist to keep the 64px bar and the stacked menu compact.
- **Primary submit:** the contact form's button keeps the 10px control radius and
  grows to 44px, dropping to 70% opacity while it is disabled.
- **Secondary:** panel navy with a hairline edge and paper-white text; on hover
  the edge firms to 55% mist.
- **Hover / focus:** opacity and border colour over 200ms; a 2px arctic-cyan
  outline at a 2px offset on `:focus-visible` for every control in the system.
- **The nudge:** the icon inside a `.btn` or a `.nudge` link translates 2px on
  the x axis on hover, over 200ms, and does not move under reduced motion.

### Chips

- **Style:** panel navy, hairline edge, 6px radius, 2px 6px padding, JetBrains
  Mono at 12px, lowercase, mist slate. The shared `chip` string.
- **Use:** what a feature runs on (web app, extension, api), and the entitlement
  the selected tier buys at the foot of the tape. The tape's chip takes the cyan
  edge and cyan text when it names the selected row.
- **Filter pills:** the feature matrix's surface filter is the same idea in a
  pill — hairline at rest, and on the checked state a paper-white fill with
  night-ink text.

### Cards / Containers

- **Corner Style:** 14px (`rounded-[14px]`).
- **Background:** panel navy, one step above the night-ink ground.
- **Border:** 1px hairline; no border is ever doubled.
- **Shadow:** the one 5% black rest shadow — see Elevation & Depth.
- **Internal Padding:** 24px, rising to 28px at 640px.
- **Use:** the two self-host lists side by side, the Cloud plan, and the
  "Before you pay" panel. A card never sits inside a card.

### Inputs / Fields

- **Style:** 48px tall, 12px radius, abyss navy at 60% as the fill, a 1px
  hairline edge, 16px inset, 14px text. Labels sit above at 14px/500 in paper
  white; placeholders are mist at 50%.
- **Focus:** the edge turns arctic cyan and a 2px ring of electric blue at 30%
  is added; the browser outline is removed on the field itself.
- **Invalid:** the edge and the ring go rose, and the message below is 12px
  rose with `role="alert"`.
- **Note:** the edge is the same hairline as every divider, so it measures well
  under the 3:1 a field edge is meant to hold against its fill. It is recorded as
  it ships.

### Navigation

- **Header:** sticky, 64px, `bg-ink/80` with a 12px blur, hairline under it. The
  wordmark is the logo mark at 28px beside "Montara" and "Pass", the second half
  in arctic cyan. Links are 14px mist slate, moving to paper white over 200ms.
  The theme toggle is a 36px square at 8px radius that takes a panel-navy fill on
  hover. Under 768px the links collapse into a button and an open panel on night
  ink.
- **Footer:** four columns on hairlines, headings at 14px paper white, links at
  14px mist slate. The wordmark repeats, then a bar with the copyright in mono.
- **Table of contents (legal pages):** a sticky 240px column at 1024px, each
  entry a 2px left rule that is hairline when idle and paper white when current;
  under 1024px the same list folds into a `details` on a card.

### Tape (pricing)

The tiers as one printed slip: a mono slug line, a two-tone title, a lede, then
ruled lines. The lines are the control — a radio each, visually hidden.

- **The row:** `1.125rem | 1fr | auto` at 14px gap, 15px 8px 15px 4px padding,
  a hairline under it, and the amount right-aligned in tabular mono.
- **Rest:** transparent over the night-ink ground; the mark is an 8px circle with
  a hairline edge.
- **Hover:** the ground takes 3% of the text colour, over 200ms.
- **Selected (`[data-on]`):** a 7% electric-blue wash, a 2px arctic-cyan rule
  running the full height of the row's left edge, and the mark filled arctic
  cyan. The foot of the tape then names that row's action.
- **Focus:** `:has(input:focus-visible)` draws the system's 2px cyan outline at a
  2px offset with a 6px radius, because the radio itself is hidden.
- **Foot:** the action, the self-host action, and a mono fine print whose first
  child is the chip naming the entitlement.

### Ledger (pricing)

The proof column: what the server holds, and what it cannot read. Static
evidence; it never competes with the tape.

- **Shape:** abyss navy, 36px 24px 32px of padding rising to 40px 40px 36px at
  640px, a dashed mist rule down its left edge at 1024px, and dashed rules between
  rows.
- **Rows:** a definition list in JetBrains Mono at 11px, field in mist slate,
  value at the right with a 5px state dot.
- **The three states:** `plain` at 400 weight in mist slate, `cipher` at 500 in
  paper white, `never` at 500 in arctic cyan. Weight carries the distinction as
  well as hue, so the column still reads as a contrast in greyscale — what the
  server cannot read is the heavier type.

### Motion

One beat, 200ms, on colour, border colour, opacity and transform. There is no
custom easing anywhere in the build; every transition runs on Tailwind's default
`cubic-bezier(0.4, 0, 0.2, 1)`, and nothing uses a keyframe animation. Three
things move, all of them transforms: the icon inside a `.btn` or a `.nudge` link
translates 2px on the x axis on hover; the FAQ's plus turns 45° when its
`details` opens; the legal table of contents' chevron turns 180°. Everything
else is a colour or an opacity.

`scroll-behavior: smooth` is set on `html` only inside
`prefers-reduced-motion: no-preference`. Under `prefers-reduced-motion: reduce`
every transition is set to `none` — the tape row's and the mark's in
`globals.css`, the buttons' and the nudge's in `globals.css`, and the plus, the
chevron and the feature matrix's opacity fade through `motion-reduce:` utilities.
The state still changes; it just arrives instantly.

### Statement and the dimmed heading (signature)

Every section heading is centred by `Statement` and is two-tone: a paper-white
clause, then `Dim` — the same text at 75% mist. The device carries nine headings
across the site: the hero, the closing call to action, the contact page's `h1` and
its form heading, and one per home-page section that has a heading. The sections
without one — the trust strip, the feature matrix — carry their own mono caption
instead. It is the site's one repeated rhetorical move: say the plain thing, then
say the part that matters, quieter.

## Do's and Don'ts

### Do:

- **Do** divide with a 1px `--color-line` rule, and draw a grid seam with
  `gap-px` over `bg-line` while each cell carries `bg-ink`.
- **Do** keep everything inside the 1200px bordered column; the hatch belongs to
  the ground outside it.
- **Do** dim a heading's second clause with `Dim` (75% mist) and keep it to
  headings — it holds 3:1 for large text, not 4.5:1.
- **Do** use electric blue to select and tint and arctic cyan to mark live state;
  the filled action is paper white on night ink, one per viewport.
- **Do** set amounts, terms, slugs, ledger fields and captions in JetBrains Mono,
  with `tabular-nums` on anything that counts or prices.
- **Do** pair every transition with a `prefers-reduced-motion` rule, and keep the
  beat at 200ms.
- **Do** check a pairing in both themes: dark is `:root`, and `.light` flips the
  same role names.
- **Do** take icons from `components/icons.tsx` at its 2px round stroke, 16px
  inside controls.

### Don't:

- **Don't** add a shadow beyond the card's 5% black. Depth is tone and hairline.
- **Don't** introduce a colour outside the token set. The contact form's rose
  error text is existing drift, not a precedent.
- **Don't** thicken a box's border for emphasis. A 2px rule is a mark — the
  selected tape row, the current TOC entry, a footnote — never an outline.
- **Don't** set a paragraph in monospace, or uppercase anything but the mono slug
  and the ledger's column title.
- **Don't** put the dimmed heading clause into body copy or below heading sizes.
- **Don't** build pricing as three cards side by side with a highlighted tier or
  a monthly/annual toggle. The tiers are one tape of ruled lines.
- **Don't** animate anything but a colour, an opacity or a transform. No keyframe
  animations, and nothing that animates a layout property.
- **Don't** nest a card in a card, or paint the hatch inside the frame.

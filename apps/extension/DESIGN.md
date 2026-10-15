---
name: Montara Pass Extension
description: A password manager's popup, tab and inline menu, quiet navy surfaces with one electric-blue action.
colors:
  # Brand palette
  midnight-navy: "#101d3a"
  electric-blue: "#145cff"
  arctic-cyan: "#42c8ff"
  # Light theme (the :root values)
  bg: "#eef2fb"
  panel: "#ffffff"
  card: "#f1f5fd"
  field: "#ffffff"
  hover: "#e4ebfa"
  border: "#d3dcef"
  field-border: "#7483a8"
  fg: "#101d3a"
  muted: "#51607f"
  primary: "#145cff"
  primary-fg: "#ffffff"
  focus: "#145cff"
  accent: "#42c8ff"
  accent-fg: "#101d3a"
  avatar: "#101d3a"
  avatar-fg: "#ffffff"
  danger: "#b42318"
  warn: "#b45309"
  good: "#15803d"
  # Dark theme (prefers-color-scheme: dark); tokens not listed keep their light value
  bg-dark: "#070d1c"
  panel-dark: "#101d3a"
  card-dark: "#1a2b52"
  field-dark: "#0b152c"
  hover-dark: "#1e3160"
  border-dark: "#2b3d68"
  field-border-dark: "#667aab"
  fg-dark: "#ffffff"
  muted-dark: "#a9b6d3"
  focus-dark: "#42c8ff"
  avatar-dark: "#145cff"
  danger-dark: "#ff9a91"
  warn-dark: "#fbbf24"
  good-dark: "#4ade80"
typography:
  display:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "26px"
    fontWeight: 700
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "22px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  title:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "20px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  body-large:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "15px"
    fontWeight: 500
    letterSpacing: "-0.005em"
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  secondary:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 400
  label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "12px"
    fontWeight: 500
  secret:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "26px"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  control: "10px"
  row: "12px"
  card: "14px"
  sheet: "16px"
  pill: "999px"
spacing:
  hair: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-fg}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 16px"
  button-primary-auth:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-fg}"
    rounded: "{rounded.row}"
    height: "48px"
    typography: "{typography.body-large}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.fg}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 16px"
  button-secondary-hover:
    backgroundColor: "{colors.hover}"
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    padding: "4px 6px"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    size: "36px"
  icon-button-hover:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.fg}"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.fg}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 12px"
  auth-field:
    backgroundColor: "{colors.card}"
    textColor: "{colors.fg}"
    rounded: "{rounded.row}"
    height: "58px"
    padding: "0 8px 0 14px"
  item-row:
    backgroundColor: "transparent"
    textColor: "{colors.fg}"
    rounded: "{rounded.row}"
    padding: "8px 6px 8px 12px"
  item-row-hover:
    backgroundColor: "{colors.hover}"
  tile:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.fg}"
    rounded: "{rounded.control}"
    size: "36px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.fg}"
    rounded: "{rounded.card}"
    padding: "12px"
  settings-card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.fg}"
    rounded: "{rounded.card}"
  menu:
    backgroundColor: "{colors.card}"
    textColor: "{colors.fg}"
    rounded: "{rounded.row}"
    padding: "6px"
  sheet:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.sheet}"
---

# Design System: Montara Pass Extension

This records the system as it ships in `apps/extension` (one stylesheet,
`src/popup/styles.css`, shared by the popup, the full tab and the inline menu).
The web app, the marketing site and the docs have their own systems and are not
described here. Product facts are in `/PRODUCT.md`.

## Overview

**Creative North Star: "The Quiet Keyholder"**

The extension appears for a moment, hands over the right key and steps aside.
Nothing in it competes with the page the user came from: surfaces are plain
navy or plain paper, type is the system's own, and one electric-blue button
per screen says where the way through is. Everything else is an outline, a row
or a line of text.

Components are calm and certain. Corners are moderately rounded, nothing casts
a shadow at rest, and state changes in 120ms. The density is that of a tool
that is opened fifty times a day: rows of 36 to 40 pixels, labels at 12 and 13,
and room only where a screen has a single thing to ask (sign in, unlock).

It follows the browser's light or dark scheme and has no theme switch. Both
themes are the same system: the same roles, the same steps between surfaces.

Rejected, by decision: decorative gradients and glass or blur effects;
illustrations, mascots and emoji; any brand colour beyond the three it has.

**Key Characteristics:**

- Three brand colours, used by role: navy grounds, blue acts, cyan points.
- Depth by tone (background, sheet, card), not by shadow.
- One filled button per screen; the rest are outlined or text.
- System fonts only; monospace only for secrets.
- Line icons at one stroke, drawn inline.
- Every motion is short, eased out, and has a reduced-motion rule beside it.

## Colors

A cool, low-chroma navy scale carrying one saturated blue; components never
use a raw colour, only the semantic tokens.

### Primary

- **Electric Blue** (`primary`): the filled button, the on state of a switch,
  the range slider. In the light theme it is also the focus ring. Its text is
  always white (`primary-fg`).

### Secondary

- **Arctic Cyan** (`accent`, `focus-dark`): the focus ring and caret in the
  dark theme, the tinted digits of a generated password, links inside an
  item, and the accent tile. It points; it never fills a button.

### Neutral

- **Midnight Navy** (`fg`, `panel-dark`, `avatar`): body text on light, the
  sheet on dark. The colour the whole neutral scale is tinted from.
- **Background** (`bg`): the page itself, the darkest step in dark and the
  tinted step in light. Tiles sit in it so a favicon reads on any surface.
- **Sheet** (`panel`): what a list or a form lives on; raised from the
  background by tone alone.
- **Card** (`card`): one step above the sheet: sign-in fields, menus, the
  selected row, grouped values.
- **Field** (`field`): the inside of a text input, one step *below* the sheet
  in dark so a field reads as a well.
- **Hover** (`hover`): the row or control under the pointer.
- **Divider** (`border`): hairlines between rows, card outlines, scrollbars.
- **Field edge** (`field-border`): the outline of anything typed into. Kept
  apart from the divider because it has to hold 3:1 against its surface.
- **Muted** (`muted`): labels, secondary lines, resting icons.

### Status

- **Danger** (`danger`): errors, destructive menu items, a weak password.
- **Warn** (`warn`): a fair password, symbols in a generated password.
- **Good** (`good`): a strong password.

### Named Rules

**The One Blue Rule.** A screen has one filled Electric Blue button: the way
through it. A second action is outlined; a way out is text.

**The Token Rule.** A component names a role (`--card`, `--muted`), never a
hex. A new surface picks from the existing steps before a step is added.

**The Edge Rule.** Something to type in is outlined with `field-border`, not
`border`. Dividers may be faint; a field's edge may not.

**The No Fourth Colour Rule.** Navy, blue and cyan are the brand. Status
colours are status only and never decorate.

## Typography

**Display Font:** the system UI font (`system-ui, -apple-system, 'Segoe UI', sans-serif`)
**Body Font:** the same
**Mono Font:** `ui-monospace, SFMono-Regular, Menlo, monospace`

**Character:** the browser's own voice. An extension cannot load a remote
font and gains nothing from shipping one; hierarchy comes from size, weight
and the muted colour, with slightly tightened tracking as sizes grow.

### Hierarchy

- **Display** (700, 26px, -0.02em, balanced): the one heading of sign-in and
  unlock.
- **Headline** (600, 22px, -0.01em): an item's name in the detail pane.
- **Title** (600, 20px, -0.01em): a view's `h1` (Settings, a form).
- **Body large** (500, 15px, -0.005em): an item's name in a list, a value in a
  detail row, text typed into a sign-in field, the sign-in button.
- **Body** (400, 14px, line-height 1.45): everything not named here. Buttons
  are body at 600.
- **Secondary** (400 to 500, 13px): the second line of a row, notes under a
  form, errors, compact buttons, text links.
- **Label** (500, 12px): field labels, column heads, counts, the version.
- **Secret** (mono 500, 26px, line-height 1.5): a generated password. Smaller
  secrets use the mono family at their row's size.

### Named Rules

**The Tabular Rule.** Anything that counts or dates (list counts, the version,
stats, "last used") sets `font-variant-numeric: tabular-nums`.

**The Mono Is For Secrets Rule.** Monospace marks a value that is copied
character by character: passwords and code in notes. It is not a style.

**The Balance Rule.** Centred headings and notes use `text-wrap: balance`, so
no line ends in an orphan.

## Layout

Three shapes share the stylesheet, switched by `data-view` on the root:

- **Popup** (default): `body` is fixed at 400×600, the tallest a browser
  allows. A view is a column: top bar, the sheet that scrolls, a bottom bar
  that stays put. Side padding is 20px for forms and 12 to 16px around lists.
- **Full tab** (`data-view="full"`): the web app's inset sidebar
  (`popup/vault-sidebar.tsx`, the only Tailwind in the extension), and on the
  sheet beside it a list that takes what is left (min 300px) and a detail
  pane of 360 to 640px. Forms that are popup-sized (sign-in, unlock) sit in a
  centred card 400px wide. At 860px and under the list and detail take turns;
  under 768px the sidebar opens over the page. The list drops its extra
  columns by container query at 520px.
- **Inline menu** (`data-view="inline"`): no fixed size; the page frames it
  and it reports its own height, capped at 320px.

Spacing is a 4px rhythm: 4 and 8 inside a control, 12 around a row, 16 between
fields, 20 to 24 for a view's padding, 32 for the full tab's detail pane.
Stacks use `gap`, not margins. Sign-in and unlock are the one generous layout:
52px above the mark, 14px between parts, the account and the way out pushed to
the foot.

**The Room Is Kept Rule.** A control that appears on hover (a row's actions)
keeps its space while hidden, so text beside it never jumps.

**The Truncate, Don't Wrap Rule.** Names, addresses and emails in rows are one
line with an ellipsis; only notes and errors wrap.

## Elevation & Depth

Flat, with depth by tone. Three steps (background, sheet, card) carry the whole
hierarchy, and a 1px divider separates what sits on the same step. Nothing has
a shadow at rest.

### Shadow Vocabulary

- **Floating** (`box-shadow: 0 8px 24px rgb(16 29 58 / 0.16)`; in dark
  `0 8px 24px rgb(0 0 0 / 0.6)`): menus and the toast only: things that sit
  over the content and go away.
- **Focus ring on a box** (`box-shadow: 0 0 0 1px var(--focus)` with a
  `--focus` border): text fields, search, the notes editor. Other controls
  take `outline: 2px solid var(--focus)` at a 2px offset.

### Named Rules

**The Flat At Rest Rule.** A shadow means "this is over the page and
temporary". Cards, sheets and buttons never have one.

**The Functional Effect Rule.** The only blur is the veil over a hidden secure
note, and the only gradient is the fade under a sticky form footer. Both hide
content on purpose; neither is decoration, and no other use is added.

## Shapes

Moderately rounded rectangles on a short scale, growing with the size of the
thing: controls and tiles 10px, rows, menus and sign-in fields 12px, cards
14px, sheets 16px. A sheet that meets the edge of the window is rounded only
on its free corners (`16px 16px 0 0`). Pills (999px) are for the switch, the
meter, the toast and the account chip; circles for avatars only.

Borders are 1px and never coloured for emphasis: a state changes the border's
colour (hover to muted, focus to the focus colour, invalid to danger), not its
width.

Icons are inline SVG on a 24 grid: 2px stroke, round caps and joins, no fill,
`currentColor`, 20px by default and 16 to 18px inside menus and fields. They
are decorative; the button around each carries the label.

## Components

### Buttons

Calm and certain: one is filled, the rest stand back.

- **Shape:** 40px high, 10px radius, body at 600, 8px gap to an icon.
- **Primary:** Electric Blue with white text. On sign-in and unlock it is 48px
  high with a 12px radius and 15px text, and brightens on hover
  (`filter: brightness(1.1)`), dims and scales to 0.99 on press.
- **Secondary:** transparent with a 1px divider outline and body-colour text;
  hover fills with the hover tone.
- **Link:** text only, muted, 4px 6px padding; hover turns it to the body
  colour. On sign-in screens it is underlined, with a faint underline that
  firms up on hover.
- **Icon button:** 36px square, 10px radius, muted icon; hover adds the hover
  tone and the body colour. While its menu is open it stays lit.
- **Compact:** beside a label (a settings row, a detail heading) buttons drop
  to 34 to 36px and 13px, so the label leads.
- **Disabled:** 55% opacity, default cursor. **Busy:** the label changes
  ("Signing in…"); there is no spinner in a button.
- **Motion:** background, colour and opacity over 120ms ease-out.

### Inputs / Fields

- **Text input, select, textarea:** 40px high, 10px radius, `field` fill, 1px
  `field-border`, 12px inset. The label sits above at 500, a required mark is
  a danger-coloured asterisk outside the label, the error sits below at 13px.
- **Focus:** the border takes the focus colour and gains a 1px ring of it; no
  outline. **Invalid:** the border takes the danger colour.
- **Sign-in field:** a 58px box on the card tone with a 12px radius, the 12px
  muted label *inside* above a 15px borderless input, and the show/hide
  button at its right. The box, not the input, shows hover, focus and error.
- **Password box:** the show/hide icon button sits inside the field's right
  edge; an optional outlined "Generate" button stands beside it.
- **Search:** a 40px field with a leading icon; focus is shown on the box
  because focus is there every time the popup opens.
- **Switch:** a checkbox drawn as a 38×22 pill with an 18px white thumb, the
  primary colour when on, 26% of the body colour when off.

### Cards / Containers

- **Sheet:** the surface a list lives on, 16px radius on its free corners, no
  border, no shadow.
- **Card:** 14px radius, 1px divider, card tone, 12px padding. As a button
  (a suggested login) it takes the hover tone under the pointer.
- **Grouped rows:** a 14px-radius card whose rows are divided by hairlines:
  settings rows (min 60px, label over a muted line, control at the right) and
  an item's fields (12px label over a 15px value, icon buttons at the right,
  the row lit on hover).
- **Tile:** a 36px square (48px in a detail heading) with a 10px radius on the
  background tone, holding a favicon at 6px inset or a line icon.
- **Never nested:** a card does not sit inside a card.

### Lists

- **Item row:** tile, then name (15px, 500) over a muted line (13px), in a
  12px-radius row with no divider between rows. Hover or focus-within fills
  the row; the selected row in the full tab takes the card tone.
- **Row actions:** two icon buttons that fade in (120ms) on hover or focus
  and are always shown where nothing hovers.
- **Empty:** one balanced, muted sentence in the middle of where the list
  would be.

### Navigation

- **Popup:** a top bar (search, tools, the avatar that opens the account menu)
  and a bottom bar divided from the sheet by a hairline.
- **Full tab sidebar:** the web app's: 32px items, muted at rest, body colour
  on hover, hover tone when current, a tabular count at the far end.
- **Menu:** card tone, 12px radius, 6px padding, the floating shadow; 36px
  items with an 18px muted icon; a destructive item is danger-coloured with a
  14% danger wash on hover. A row's menu grows from its button over 140ms
  (`cubic-bezier(0.16, 1, 0.3, 1)`, from 96% scale).
- **Back:** an icon button with an arrow at the top left of a sub-view.

### Feedback

- **Error:** danger-coloured text at 13px, next to what it is about, with
  `role="alert"`. No box, no icon.
- **Toast:** a pill on the card tone with the floating shadow, centred above
  the bottom bar, `role="status"`.
- **Strength meter:** a 6px pill track whose fill and label take danger, warn
  or good.

## Do's and Don'ts

### Do:

- **Do** give each screen exactly one filled Electric Blue button.
- **Do** build depth from the three tones (background, sheet, card) and a 1px
  divider.
- **Do** use the semantic tokens, and check a new pairing in both themes.
- **Do** outline anything typed into with `field-border` (3:1), and show its
  focus on the box.
- **Do** pair every transition and animation with a
  `prefers-reduced-motion: reduce` rule, and keep state changes at 120ms
  ease-out.
- **Do** keep a hidden control's room, and truncate one-line text with an
  ellipsis.
- **Do** use `tabular-nums` for counts and dates, and monospace for secrets.
- **Do** draw new icons inline on the 24 grid with a 2px round stroke.

### Don't:

- **Don't** add decorative gradients, glass, backdrop blur or glows. Surfaces
  are plain.
- **Don't** add illustrations, mascots or emoji. The mark and the line icons
  are the only pictures.
- **Don't** introduce a brand colour beyond navy, blue and cyan, or use a
  status colour as decoration.
- **Don't** put a shadow on anything that is not floating over the page.
- **Don't** nest a card in a card, or thicken a border for emphasis.
- **Don't** load a remote font, icon set, script or stylesheet: extension
  pages run under a CSP that allows only their own files.
- **Don't** write a raw hex in a component.
- **Don't** put a spinner in a button; change its label.

---
version: 1
slug: "apps-web-app-pricing-page-tsx"
primary_target: "apps/web/app/pricing/page.tsx"
related_targets: []
---

# Surface brief — /pricing

## Scope and mode

Persuade. A standalone route, `apps/web/app/pricing/page.tsx`, in the marketing
site's existing visual world. The visitor arrives deciding whether to pay for
Montara Pass Cloud or to run it themselves.

## Audience, job, action, proof

**Audience.** An individual who already wants a password manager and is now
choosing how to get one. They are privacy-literate but not necessarily a
developer; the second audience, the technical self-hoster, is the one the
product's own default path serves.

**Job.** Decide in one screen whether to self-host, stay on the free Cloud
account, or pay. Then act: subscribe, buy, or deploy.

**Action.** Two working actions, both in the first viewport: **Self-host**
(scrolls to the self-host section and the docs guide) and **Subscribe to Pro**
(links into `app.montarapass.com/billing?plan=<code>`). Neither is a decorative
link pointing elsewhere.

**Proof.** The product's own mechanism: a ledger of what the server can and
cannot read, in the clear versus ciphertext, identical on every tier including
the free one. This is the one demonstration a competitor cannot copy-paste.

**Constraints.** Prices, tier names, gates and refund terms are facts the user
supplied. Nothing invented: no testimonials, no user counts, no benchmarks, no
certification claims. Copy follows the brand voice — plain, declarative, no
exclamation marks, no marketing adjectives.

## Direction contract

**THESIS.** Pricing as the receipt for the service: every tier a printed line
item with its terms, the way a register prints them. Refuses the category's
three-cards-side-by-side arrangement with a highlighted middle tier and a
monthly/annual toggle.

**OWN-WORLD.** The incumbent navy world, unchanged: ground `#0b1529` inside the
page frame, panels `#101d3a`, hairline rules at 14% mist, text `#f4f7fd`, mist
`#a3b1cc`, one electric blue `#145cff` for the primary fill and arctic cyan
`#42c8ff` for live marks. Components are ruled rows, not cards: dashed hairlines
between price lines, tabular monospace for every number, small tracked mono for
terms and labels, generous padding above a heading and tight grouping below it.

**STORY.** The visitor reads four prices as one continuous printed tape, sees
that the same encryption runs under all of them, understands that paying buys
the running of a server rather than a key to the vault, and takes the action
whose line they chose.

**FIRST VIEWPORT.** One frame column, 1200px, under the site header. Left, two
thirds: a mono slug line (`Montara Pass — pricing` / a date), a two-tone
headline "Four prices. One vault.", then five ruled price lines — self-hosted
$0, Cloud free $0, Pro monthly $3, Pro annual $25, Pro lifetime $300 — each with
its tier name, a mono sub-line of terms, and the amount right-aligned in tabular
mono. At the foot of the tape, the two actions side by side with the processor and
no-refund terms in mono. Right, one third behind a dashed rule: the proof ledger,
a heading "What the server can see", then rows pairing a field with `plaintext`,
`ciphertext`, `wrapped`, or `never sent`.

**Signature interaction.** The price lines are the control. Selecting a line
marks it (arctic cyan rule and a live chip) and the action at the foot of the
tape names that tier — "Subscribe to monthly", "Buy lifetime" — so choosing and
acting are one motion on one surface. The proof ledger is static evidence and
never competes with it.

**FORM.** The roll is `concept-seed --scope surface --mode persuade`, seed key
`12df0f3f`, dealt indices 4, 5, 3. The user locked index 4 — the receipt tape —
from the hand of three, rendered as an HTML sketch at
`.impeccable/mocks/decision/receipt-stack.html`; the other two were
`four-state-machine` and `compose-manifest`. Build path: code-led (no image
generation available). No challenger was adopted, so no catalog world applies.

## Unresolved

- The free Cloud tier's limits are stated as "no sharing out" only; items,
  folders and passkeys are unstated and uncapped.
- A refund policy page is still owed before a payment processor review; the page
  states "no refunds" without one.
- Server-side enforcement of the sharing gate is not built yet.

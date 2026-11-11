# Release notes — Firefox add-on

The **Version notes** that go with each upload to addons.mozilla.org, newest
first. `../../RELEASE_NOTES.md` covers the product as a whole; this says only
what changed in the extension, in the words a user of it reads.

Paste the version's section — from its first **bold label** down — into AMO's
*Release notes* field. That field takes Markdown, but only bold, italic,
monospace, links, abbreviations, code blocks, blockquotes and lists: no
headings and no HTML, so a `##` line would show literally. It holds 3000
characters. AMO shows what is pasted there on the add-on's Version history
page, and Firefox shows it in the Release Notes tab of `about:addons`.

## 2.12.2 (2026-11-10)

**Improved**

- **The full tab wears the web app's frame.** Its sidebar is now the web
  app's own: 15rem wide on the page, folding to a rail of icons whose names
  show as tooltips, with the filters and how many items each holds, then
  **Password generator** and **Password health** under **Tools**, then
  **Settings** and **Open web app** under **System**, and **Documentation**,
  **GitHub** and **Feedback** at its foot. The bar across the top is 56px, on
  the sidebar's tone: the trigger, where the page sits, the clock, the update
  button, a lock button and your avatar.
- **The account menu is the web app's too**: **Profile**, which opens your
  profile in the web app, **Billing** in the Cloud Edition, **Lock vault**,
  then **Sign out** under a rule of its own, in the danger colour.
- **The clock shows the date** beside the time, with the zone it keeps:
  `UTC`. The add-on has no profile page, so the zone stays UTC here; the web
  app's profile chooses one for its own clock.
- **The tools sit in the web app's frame**: at most 1200px wide, 22px from the
  top, 28px gutters (20px under 640px) and 32px at the foot, so the generator,
  the health report and billing hold still as you move between them.
- On a wide display the frame steps up with it: 7% at 1600px, 15% at 2100px,
  30% at 3100px and above.

**Changed**

- **Security and Sharing left the full tab.** The sign-ins, passkeys, devices
  and activity log, and every shared item, are in the web app, which **Open
  web app** reaches. **Manage folders** and **Browse folders** now open its
  **Settings**, where the folders live.

**Fixed**

- The hairlines on the clock and along the sidebar's edge take the divider
  colour. They were drawn white.

**Also**

- The permissions the add-on asks for are unchanged, so updating does not ask
  again.

## 2.11.0 (2026-11-08)

**New**

- **Passkeys for your account.** Sign in to the popup with a passkey, and
  unlock the vault with one set up to unlock it. Passkeys are added in the web
  app, under **Security**. On Montara Pass itself the add-on no longer offers
  to keep a passkey, so the account's passkey stays on your device.
- **Save cards and contacts.** After you submit a payment or address form,
  the add-on offers to save it, as it does a login. A card keeps its number,
  holder and expiry, never its security code, and the prompt shows only the
  last four digits.
- **Security**, in the full tab: whether two-step verification is on, your
  passkeys, the devices signed in to your account, each of which you can sign
  out, and a log of sign-ins and changes to your items.
- **Manage sharing**, in the full tab: every shared item, who can open it,
  and whether they can only read it or also change it.
- **Pay in rupiah.** In Indonesia, **Billing** offers the IDR plans, paid by
  QRIS through BorderPay; elsewhere, the USD plans through Lemon Squeezy.
- **Favorites** has its own view in the sidebar.

**Improved**

- A new look for the full tab: a sidebar with your vault's views and how many
  items each holds, then **Password generator**, **Password health** and
  **Security**; a header with the time in UTC; and the vault as a table.
- The vault list in the full tab loads 25 items at a time as you scroll.
  Search still looks through every item.
- Self-hosting: a server on this computer (`localhost`, `127.0.0.1`) may be
  reached over plain http, to try one out. Every other server still needs
  https.

**Fixed**

- The buttons of the passkey prompt no longer run past the edge of its frame.
- Signing a device out says what can sign it back in: your password or one
  of your passkeys.

**Also**

- The permissions the add-on asks for are unchanged, so updating does not ask
  again.

## 2.9.0 (2026-10-26)

**Improved**

- **Documentation** in **Settings** opens the docs at their new address,
  `docs.montarapass.com`. Links to the old address still lead to the same
  pages.

**Also**

- The add-on is built with a new tool, WXT. The popup, the menu under a login
  field, the save prompt and passkeys work as before.
- The permissions the add-on asks for are unchanged, so updating does not ask
  again.

## 2.8.0 (2026-10-25)

**New**

- **Forgot your password?** The sign-in screen links to the web app's
  password reset. Enter your email there, follow the link it sends, and choose
  a new account password; every signed-in session ends, so sign in again with
  it. The link opens the web app named in **Server settings**.

**Also**

- The form validation library is updated to a version with security fixes.
- The permissions the add-on asks for are unchanged, so updating does not ask
  again.

## 2.2.0 (2026-10-18)

**New**

- **Two-step verification, optional.** Turn it on in **Settings → Security**
  with your account password, scan the QR code with an authenticator app such
  as Google Authenticator, and keep the backup codes. Signing in then asks for
  the 6-digit code, or a backup code.

**Improved**

- Sharing an item names the recipient by their email address.

**Also**

- The permissions the add-on asks for are unchanged, so updating does not ask
  again.

## 2.0.0 (2026-10-16)

**New**

- **Billing, in the full tab.** The Cloud Edition manages its subscription
  where the vault is: the subscription with its status and when it renews, or
  when it ends once cancelled, the plans on offer with **Subscribe** or
  **Buy**, and what was bought. Paying and cancelling happen at Lemon Squeezy,
  in a tab of its own, and the page reads the outcome again when it is back in
  front, and every five seconds while a payment is pending. A server that
  takes no payments says so.
- **Usernames are masked in the lists** — the popup's, the full tab's, the
  password health report and the menu under a login field. An email address
  keeps the start of its local part and its domain (`us••••@mail.com`); any
  other username keeps its start (`9r••••`). The mask is four dots whatever it
  hides, so it does not say how long the name was. The item's detail shows the
  whole value behind an eye, copying and searching always use it, and a screen
  reader still reads it in full.

**Improved**

- In the full tab the line between the list and the item meets the header's,
  the column headings stay on top of the rows that scroll under them, and a
  hairline under them says where the list begins.
- Rows stand 4px apart in the popup and the full tab, so a row lit on hover no
  longer runs into the selected one beside it.
- The list's scrollbar sits 4px off the line beside it, where a thumb of the
  same colour read as a second line.

**Also**

- The permissions the add-on asks for are unchanged, so updating does not ask
  again.
- Montara Pass CE is the same build without sign-up or sharing, under its own
  name and add-on id, and installs beside this one.

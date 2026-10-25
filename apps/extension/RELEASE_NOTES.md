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

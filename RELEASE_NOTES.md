# Release notes

What changed for the people who use and run Montara Pass, from 1.2.0 to 1.5.0.
`CHANGELOG.md` lists every commit; this says what they add up to.

## 1.7.0 (2026-10-14)

A rebuilt web app that looks and works like the extension.

### New

- **A new web app.** It shares the extension's design: the vault is a list
  with a detail pane beside it, 25 items to a page, and the open item is kept
  in the URL. The sidebar folds to a rail of icons, and a narrow window turns
  it into a strip. Sign-in, sign-up, unlock and vault setup are one card in
  the middle of the page.
- **Generate a password from the item form.** A Generate button beside the
  password field of a new or edited item fills it with a random password and
  shows it.
- **Hidden secure notes in the web app.** The item form has a Visible switch
  for a secure note, as the extension does. Off, the note is blurred in its
  detail until it is shown.
- **A way to an account from the extension.** The sign-in screen links to the
  web app's sign-up, and a new install opens sign-in in a tab.
- **Share and Move to trash from an item's detail** in the extension, under a
  More menu, next to a favorite star and Edit.
- **The extension's full-tab sidebar folds to its icons.** The choice is
  remembered in the browser, and the labels show as tooltips while folded.

### Improved

- An empty list in the web app says what will be there, and a page that does
  not exist says so.
- Folders, trash and categories show a skeleton on their first load, and a
  page settles in when the route changes. With reduced motion it only fades.
- The generator and the health report are wider, in the web app and in the
  extension's full tab, and the health report sets its reused and weak lists
  side by side where there is room.
- In the extension, logins that share a password sit in one card of the
  health report and the whole row opens the item. The generator's slider is
  readable on a dark page, and a regenerated password is drawn in one
  character after another.
- The extension's share view puts the address, the access and the Share
  button in one row, and lists the people who have access in one card.
- Forms announce field errors and move focus to the first refused field, and
  text fields have a border that stands out from their surface.

### Fixed

- Generating a password in an empty item form no longer asks for a name. The
  form is checked on saving, and from then on as its fields change.
- The inline menu says "Sign in" rather than "locked" when nobody is signed
  in.
- The extension uses the full-tab layout on Android, which has no popup.
- An item in no folder shows a dash in the vault list, and the column heads
  line up with their rows.

### Good to know

- The web app follows the browser's light or dark scheme and uses the system
  font. It no longer requests anything from Google Fonts.
- The server did not change in this version.

## 1.5.0 (2026-10-13)

Passkeys, and a tidier extension.

### New

- **Passkeys in the vault.** With the vault unlocked, the extension offers to
  save a new passkey when a site asks for one, and to sign in with one it
  holds. The key lives in the login's encrypted content, so it works on any
  computer the vault is unlocked on and the server needed no change. Whatever
  the vault cannot answer goes to the browser's own passkeys, unchanged.
- **Two buttons on a popup row**, shown on hover and on keyboard focus: one
  opens the login's website, the other a menu with copy username, copy
  password, move to folder, remove from folder, edit, share and move to trash.
- **Settings as a page of sections**: account, security, server and other.
  Lock and sign out can be done from there, and the URL of a self-hosted
  server sits under the switch that turns it on.

### Improved

- The sign-in, unlock, item list and settings screens of the extension were
  polished: one focus style throughout, a count above the list, notices that
  leave by themselves, thin scrollbars in the theme's color.

### Fixed

- A login that holds only a passkey is no longer offered for filling a
  password form.
- Settings offers Sign out when the extension could not reach the server.
- A login saved for a suffix many sites share, such as `github.io`, is no
  longer offered on `www.github.io`.
- Logins somebody shared with you say so in the inline menu, also to a screen
  reader.
- The web app shows a dash for a date it cannot read, where it used to fail.

### Good to know

- A passkey always reports the user as verified. That means the vault was
  unlocked with the master password within the auto-lock time, not that
  anyone was asked again for this sign-in.
- Passkeys are answered in a page's top frame only, and a new passkey is
  always saved as a new login.
- **Update the server before the extension.** A web app older than 1.5.0
  drops the passkey of a login when it edits that login.

## 1.4.0 (2026-10-12)

Saving logins as you go, and a round of security hardening.

### New

- **Save a login as it is submitted.** The extension offers to keep the
  username and password a page just sent, unless the vault already has them.
- **A suggested password on sign-up forms**, generated and filled from the
  inline menu.
- **Writes run once.** The web app and the extension send an idempotency key
  with every write, and the server answers a repeat with the first result, so
  a retry on a bad connection cannot save an item twice.

### Security

- **An unverified email no longer gets a session.** Sign-up does not sign in,
  and the API answers 403 until the address is verified. Before, an account
  could be opened on someone else's address and receive what others shared
  with it.
- The web app locks after 15 idle minutes, like the extension, and checks
  again when the tab is shown. It used to lock only on reload.
- A public key shorter than 3072 bits is refused before anything is shared
  with it.
- The sign-in routes are also rate limited per email address, the client address is taken
  from a validated forwarding header, and responses carry a
  Content-Security-Policy.
- The extension ignores key events a page made up, and on a plain http page
  offers only the logins that were saved for http.

### Fixed

- The inline menu opens when a login field is entered, not only when it is
  clicked.
- A login waiting to be saved expires even while its prompt is open.

### For self-hosters

- `REDIS_URL` is new and optional. Set it when more than one instance of the
  server runs, so they share rate limits and idempotency keys; empty keeps
  both in memory, which is enough for one instance.
- New accounts must verify their email before they can use the API.

## 1.3.0 (2026-10-11)

Password tools, Markdown notes, and a fuller extension.

### New

- **Password generator and password health check**, in the web app and in the
  extension's full-screen view.
- **Notes in Markdown.** Secure notes and the notes of a login are written in
  a rich-text editor and shown formatted, in both the web app and the
  extension.
- **Hidden secure notes.** A note can be marked not visible; the extension
  blurs it until it is shown.
- **Site icons and last used.** The extension shows each login's site icon,
  kept inside the encrypted item, and when a login was last used.
- **More in the full-screen view**: list columns, the password tools, and
  sharing an item with another user.
- **The inline menu is on for everyone.** It no longer needs a switch, so the
  extension asks for access to all sites when it is installed.
- The extension's settings offer one Server URL behind a Self-hosted switch.

### Fixed

- A password made of one block repeated is no longer rated strong.
- Code pasted into the Markdown editor arrives as a code block.
- The extension reports a failed copy or share instead of failing silently.

## 1.2.0 (2026-10-11)

### New

- **An inline menu in login fields.** Opt-in in this version: a badge in a
  login field opens the logins saved for the page, under the field.
- **A redesigned website**: a new landing page, header and footer, with a link
  to the documentation site.

### Fixed

- The Firefox add-on linter warnings of the extension are cleared.

### Also

- Montara Pass is now under the MIT license.
- The privacy policy was rewritten from what the code actually does.

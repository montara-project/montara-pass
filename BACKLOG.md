# Backlog

## Plan features, compared with NordPass Business

What NordPass lists in its business plans (Teams, Business, Enterprise) and
Montara Pass does not do yet. Already covered: unlimited devices, sharing an
item (editor or viewer), logins, secure notes, cards, contacts, passkeys,
password generator, password health, two-factor sign-in (TOTP), Google sign-in.

Once one ships, add it to `PLAN_INCLUDES` in `packages/shared/src/plan.ts`,
which both billing pages list.

- [ ] **Import and export**: bring a vault in from a CSV (browsers, Bitwarden,
      1Password, NordPass) and export it again, encrypted or as CSV.
      Must with Password Confirm and TOTP for enable.
- [ ] **Shared folders**: share a whole folder rather than item by item.
- [ ] **Organizations and groups**: a team workspace with members, and sharing
      to a group instead of to each person.
- [ ] **Admin panel**: invite and remove members, see who has access to what,
      suspend an account.
- [ ] **Data breach scanner**: warn when a saved email or password shows up in
      a known breach (k-anonymity lookup, so the server still learns nothing).
- [ ] **Security dashboard for admins**: password health across the team, not
      only one's own vault.
- [ ] **Activity log**: who signed in, shared, changed or removed an item.
- [ ] **Emergency access / account recovery**: a trusted contact, or an admin,
      can regain access without the server holding the master password.
- [ ] **Email masking**: generate an alias address per site that forwards to
      the user's inbox.
- [ ] **File attachments**: encrypted files on an item.
- [ ] **Password policies**: an admin sets minimum length and strength for
      the team.
- [ ] **SSO and provisioning (Enterprise)**: SAML/OIDC with Entra ID, Okta,
      ADFS, and SCIM user provisioning.

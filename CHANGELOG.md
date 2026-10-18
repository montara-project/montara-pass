# Changelog

All notable changes to this project are documented in this file. Versions follow the git tags (`v*`); Docker images are published to ghcr.io with the same version.


## [2.2.1](https://github.com/montara-project/montara-pass/compare/v2.2.0...v2.2.1) (2026-10-18)

### Features

* **extension:** add an Update button for a downloaded version ([8ff5268](https://github.com/montara-project/montara-pass/commit/8ff526888571568df294cd5422263e74b24e179f))

## [2.2.0](https://github.com/montara-project/montara-pass/compare/v2.1.0...v2.2.0) (2026-10-18)

### Features

* **auth:** add optional TOTP two-step verification ([1618cda](https://github.com/montara-project/montara-pass/commit/1618cdad9e6c562ddbc934758476a7f79d1eb8b1))
* **server:** block client IPs that keep failing ([01cab11](https://github.com/montara-project/montara-pass/commit/01cab11bf7f3fa0d67db9fff939d10d15fff57e9))

### Bug Fixes

* **auth:** end every session when the password is reset ([300359b](https://github.com/montara-project/montara-pass/commit/300359bb308b35e68d1e89b4e65533710427e9b2))
* update deploy docker compose ([02ed8cd](https://github.com/montara-project/montara-pass/commit/02ed8cdbd595dd85bf8b22893f46b221d8541a79))
* update script zip ([7d5ec59](https://github.com/montara-project/montara-pass/commit/7d5ec590854fbf415b472f72f51b13565e921b9d))
* **vault:** require the account password to change the master password ([8d1579a](https://github.com/montara-project/montara-pass/commit/8d1579afcc0b706c8a1a9eec41fd2375eb036313))
* **vault:** stop the public key lookup from returning the name ([a28a638](https://github.com/montara-project/montara-pass/commit/a28a638fd08abb9666d5f443534eb76d0601a55a))

## [2.1.0](https://github.com/montara-project/montara-pass/compare/v2.0.0...v2.1.0) (2026-10-17)

### Features

* **app:** redesign billing page plans as priced cards with yearly marked ([a149ebc](https://github.com/montara-project/montara-pass/commit/a149ebc62b54690bcfb454e81ed1430ad1161263))
* **app:** search the vault by name, username or URL ([9facd44](https://github.com/montara-project/montara-pass/commit/9facd446748226e211f51c51e2099234b74097c1))
* **extension:** put search, sort, refresh and new item on one bar in full screen ([48dd5ce](https://github.com/montara-project/montara-pass/commit/48dd5ce191dd4d6ff435f9a36503451a5599befb))
* **extension:** redesign billing page plans as priced cards with yearly marked ([ba89f06](https://github.com/montara-project/montara-pass/commit/ba89f06757303e78b691afdbafa6d3c48b6152e2))
* **web:** read pricing plans through an API layer and TanStack Query ([bb95fc1](https://github.com/montara-project/montara-pass/commit/bb95fc1ca411e0f0d119a0b1746432e3058768da))
* **web:** redesign contact page channels, form and office cards ([61b4511](https://github.com/montara-project/montara-pass/commit/61b4511acea136434b512ea5a2272155a441c297))
* **web:** redesign home hero with a top glow and single-tone heading ([4d2e48c](https://github.com/montara-project/montara-pass/commit/4d2e48ce40c36e91ccd3b28ba0108bb9a8ad12f9))
* **web:** redesign home pricing section as self-hosted and cloud cards ([c66ca34](https://github.com/montara-project/montara-pass/commit/c66ca349582a4fe607e5cdde4018d10908779d5d))
* **web:** redesign pricing page plans as a table with yearly as best value ([77b44e0](https://github.com/montara-project/montara-pass/commit/77b44e0da89f8c7725ba1f01d7236426444746d4))
* **web:** redesign self-host section as stack layers and deploy steps ([f4ed9cf](https://github.com/montara-project/montara-pass/commit/f4ed9cf8e30c451f72bae8d32303c3780565a3e5))
* **web:** redesign the sections below the pricing plans ([624672d](https://github.com/montara-project/montara-pass/commit/624672dccfee6e9629a6baf713121a4c2afe2b4e))

### Bug Fixes

* **app:** only lowercase string fields in vault search ([2b51d82](https://github.com/montara-project/montara-pass/commit/2b51d82e59af87bdbd36f89fa38152ebc1eb91f0))
* **web:** document Community Edition setup in the self-host guide ([11a27dc](https://github.com/montara-project/montara-pass/commit/11a27dc89ae1df710c0ccfc33093fc4504cf016a))

## [2.0.0](https://github.com/montara-project/montara-pass/compare/v1.9.0...v2.0.0) (2026-10-16)

### ⚠ BREAKING CHANGES

* **server:** /api/v1/categories is removed and its table dropped.
  cmd/migrate no longer takes --seed, and the migrate:up:seed script is gone;
  SEED_ON_BOOT now only creates the SUPER_USER account.
* **server:** cmd/migrate takes --cloud instead of --ee to force or
  create a Cloud Edition migration.
* **server:** MIDTRANS_SERVER_KEY and MIDTRANS_PRODUCTION are gone; set
  LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID and LEMONSQUEEZY_WEBHOOK_SECRET
  instead, all three or none. The webhook moves to
  /api/v1/billing/lemonsqueezy/webhook, and
  /api/v1/billing/midtrans/notification is removed. A plan is sold only once
  it names its Lemon Squeezy variant_id, and amounts are cents in every
  currency, so a plan stored in whole rupiah must be repriced.
* **server:** POST /api/v1/plans and PUT /api/v1/plans/:id are removed;
  plans are changed in the Lemon Squeezy store, then synced. Checkouts no
  longer send custom_price, so a plan costs what its variant costs there.

### Features

* **app:** manage the subscription in Lemon Squeezy's customer portal ([5bd73a6](https://github.com/montara-project/montara-pass/commit/5bd73a641bf9cc4f2fb84d53b91fde7f2cd337d2))
* **app:** show the plan refusal where sharing was attempted ([7e4ce1c](https://github.com/montara-project/montara-pass/commit/7e4ce1c4f31861b38a780b3f117f8b8aec4593a1))
* **extension:** mask email usernames in lists, with a reveal in the detail ([7bff3ad](https://github.com/montara-project/montara-pass/commit/7bff3adc16b2b338567a14aa6a654c61d72302cc))
* **extension:** mask every username in lists, not only email addresses ([986c8b2](https://github.com/montara-project/montara-pass/commit/986c8b2cdce4de3916383548cdf35a37ae192799))
* **extension:** show plans and the subscription in the full tab ([0742738](https://github.com/montara-project/montara-pass/commit/0742738ede83311f9ce2146563c6881883501f11))
* **server:** gate paid sharing on REQUIRE_PAID_SHARING ([df6ce30](https://github.com/montara-project/montara-pass/commit/df6ce308cb4c27a40db001dc41ad5d6953b502bc))
* **server:** gate sharing out on a paid plan ([53356b5](https://github.com/montara-project/montara-pass/commit/53356b5fd04525bb2518f32717a9beca20cc57b8))
* **server:** let the community edition run without email ([a159052](https://github.com/montara-project/montara-pass/commit/a159052f687e46690e0157a38dbd403b475081dd))
* **server:** sync the plans from the Lemon Squeezy catalog and save customers ([14aa8e7](https://github.com/montara-project/montara-pass/commit/14aa8e7d93a48e73a26d5afb472f55d07e8aa4e8))
* **server:** take payments through Lemon Squeezy instead of Midtrans ([b5a0105](https://github.com/montara-project/montara-pass/commit/b5a0105317943b1bff6ead41cf0e4073e6d87d33))
* **web:** add a pricing page and the site's design system ([5c9bca4](https://github.com/montara-project/montara-pass/commit/5c9bca4cc83b52e26956c5b87390feb85b62cfe4))
* **web:** name Lemon Squeezy as the merchant on the pricing pages ([b9f56bf](https://github.com/montara-project/montara-pass/commit/b9f56bfa9e64211bcd72472f297d197481529a61))

### Bug Fixes

* **extension:** join the list's edge to the header and rule off its headings ([50fbfae](https://github.com/montara-project/montara-pass/commit/50fbfae11973ff078fca5048f2576e63f46fb89d))
* **server:** exempt IPv6 loopback from the development rate limit ([fc5a59d](https://github.com/montara-project/montara-pass/commit/fc5a59da36f7e3903989a1bf8457fb9a54fe3a5b))
* **server:** refuse community sign-up alike for every address ([bf9212c](https://github.com/montara-project/montara-pass/commit/bf9212c8731cf366d4cea54861f45423d07e5dba))
* **server:** validate the edition in every binary and roll back cloud leftovers ([309f8f9](https://github.com/montara-project/montara-pass/commit/309f8f9281b65178db1fb4566840174969b58f42))

### Code Refactoring

* **server:** drop categories and seed the super user directly ([8471082](https://github.com/montara-project/montara-pass/commit/84710829d817e2b5feb27b4ed24f1afb4744bd2d))
* **server:** move the Cloud Edition migrations to migrations/cloud ([bd89554](https://github.com/montara-project/montara-pass/commit/bd8955417635ff5024c49c090605ad4f7b75b29a))

## [1.9.0](https://github.com/montara-project/montara-pass/compare/v1.8.0...v1.9.0) (2026-10-15)

### ⚠ BREAKING CHANGES

* EDITION=ee and EDITION=ce are no longer accepted; use
  EDITION=cloud or EDITION=community. The montara-pass-ee, -ce and -docs
  images stop receiving releases.

### Features

* **app:** show a page once the verification link is accepted ([6c6c19a](https://github.com/montara-project/montara-pass/commit/6c6c19a239e5ce12b41b0e9a7c7a3ee383dc6573))
* **server:** send auth emails in the Montara Pass layout ([a137436](https://github.com/montara-project/montara-pass/commit/a13743605f606eab52cd4f0e7a944d6a7b8178b2))

### Bug Fixes

* **app:** confirm the email only after the API accepts the link ([57b2bc2](https://github.com/montara-project/montara-pass/commit/57b2bc2226cc4cffd0cf8b9ec280b75ffe8d8040))
* **server:** install default email templates over empty overrides ([823270a](https://github.com/montara-project/montara-pass/commit/823270adcc93ce7a11bc9133a5e58bb7cf0ea7cd))

### Code Refactoring

* rename the editions to cloud and community ([078d7b3](https://github.com/montara-project/montara-pass/commit/078d7b350dc3df32fe1acf77cd2f79dfa1f55d6b))

## [1.8.0](https://github.com/montara-project/montara-pass/compare/v1.7.0...v1.8.0) (2026-10-15)

### Features

* **app:** add a billing page to the enterprise edition ([a2a898b](https://github.com/montara-project/montara-pass/commit/a2a898bf64fecd356576cb4fe3aee75d9fcd7582))
* **app:** drop sign-up and sharing from the community edition ([e862628](https://github.com/montara-project/montara-pass/commit/e8626282b71c9828a529b015e6905d86b711a6f6))
* **app:** replace the sidebar with shadcn's inset sidebar ([eeb1ae3](https://github.com/montara-project/montara-pass/commit/eeb1ae34043e8c4aee6597465062d5f97a9b2450))
* **extension:** build a community edition without sign-up or sharing ([00221a1](https://github.com/montara-project/montara-pass/commit/00221a1cfc279149b054c0244dc8f1813d85c348))
* **extension:** show a lock icon on the settings' lock button ([0d7f6b0](https://github.com/montara-project/montara-pass/commit/0d7f6b0a98d3f386a8d4db0d03b52e5e3223a3ba))
* **extension:** show the user's plan in the settings ([3850390](https://github.com/montara-project/montara-pass/commit/385039090a87ad48b5b6bfd305851af1a74bca83))
* **extension:** use the web app's sidebar in the full tab ([85fd1e1](https://github.com/montara-project/montara-pass/commit/85fd1e16489d667b329cd121ca24d4ee9f6a0b2a))
* **server:** add a community edition without sign-up or sharing ([5fa517f](https://github.com/montara-project/montara-pass/commit/5fa517f2bc8606e00bd0782293b89f65313c4e34))
* **server:** add an overview of counts and revenue for a super user ([6971694](https://github.com/montara-project/montara-pass/commit/697169433bffbcc6efc974e5dcd4710d035f978a))
* **server:** add billing with Midtrans to the enterprise edition ([3b5b519](https://github.com/montara-project/montara-pass/commit/3b5b51988723ca257dbe1af2397259f65f4a562a))
* **server:** list every customer's subscriptions and purchases for a super user ([93300c4](https://github.com/montara-project/montara-pass/commit/93300c4ce01b95b65fda7c619a6cc4948b905767))
* **web:** show the hosted service's plans in the pricing section ([e36acd5](https://github.com/montara-project/montara-pass/commit/e36acd56fb62c264ee32e0b512949912107154fb))

### Bug Fixes

* **app:** stop the page transition from flashing a scrollbar ([610568b](https://github.com/montara-project/montara-pass/commit/610568b23ddd450ad6b3ea82c99c0b006111fadd))
* **extension:** keep the full tab's item list scrollable ([14b8206](https://github.com/montara-project/montara-pass/commit/14b8206e3f07964d99649ceffbf44a4682237cc9))
* **server:** accept request headers up to 16KB ([600028a](https://github.com/montara-project/montara-pass/commit/600028a5872cda27d9838ec8577b279a96207e14))
* **server:** match application errors by kind in errors.Is ([88f8642](https://github.com/montara-project/montara-pass/commit/88f86427247a9484846b398cf858fe7f93e10541))
* **server:** refuse a community edition boot on a database with other accounts ([98684a0](https://github.com/montara-project/montara-pass/commit/98684a0d53d54bc53c78f41a6ca0b91ffe137f50))

## [1.7.0](https://github.com/montara-project/montara-pass/compare/v1.6.0...v1.7.0) (2026-10-14)

### Features

* **app:** give an empty page a shape ([5781a27](https://github.com/montara-project/montara-pass/commit/5781a271a843e4bff223f0cccf3b4b81f368338b))
* **app:** let a page arrive, and show a skeleton while it loads ([e42da3e](https://github.com/montara-project/montara-pass/commit/e42da3e55e4f0e607d7bdf5a4fe9f68a32ac6c12))
* **app:** let a secure note be kept hidden ([b3b449c](https://github.com/montara-project/montara-pass/commit/b3b449c7df30498dca8ac7e1d8d68d493afdabb9))
* **app:** make a password from the item form ([3ede577](https://github.com/montara-project/montara-pass/commit/3ede577e524b9d49d87890d2a5877398b8b99bf5))
* **app:** rebuild the web app on the extension's design system ([7782cdf](https://github.com/montara-project/montara-pass/commit/7782cdf64d2f2e0f289e34131844f8bbd2b77c14))
* **extension:** draw in a regenerated password ([cea7c2c](https://github.com/montara-project/montara-pass/commit/cea7c2c5b310839a560e6d15d2431f8ebe25c766))
* **extension:** fold the full-tab sidebar down to its icons ([43661ae](https://github.com/montara-project/montara-pass/commit/43661aec2812f091588fa2a03e3e704056370cee))
* **extension:** give a first-time user a way to an account ([d942b44](https://github.com/montara-project/montara-pass/commit/d942b446f72fbb9adf6337c96ed283080c845a55))
* **extension:** match the item detail's actions to the web app ([cf3d6bd](https://github.com/montara-project/montara-pass/commit/cf3d6bd2d3158dd856fdcf4a61a8e295d9cd52df))

### Bug Fixes

* **app:** give the parts of the vault list room and a rule ([1adb2a6](https://github.com/montara-project/montara-pass/commit/1adb2a6ebb81cd51a16d5874174e3f998afaa192))
* **extension:** centre the generator and the health report ([d264b0e](https://github.com/montara-project/montara-pass/commit/d264b0e1336ae8443b3b6f72357e515bc7b33e60))
* **extension:** finish the password generator's options and slider ([9bd7311](https://github.com/montara-project/montara-pass/commit/9bd73115be24ae306385cb7b32079e38e7d664a2))
* **extension:** group the password health report into cards ([60c1adf](https://github.com/montara-project/montara-pass/commit/60c1adf9ce1ed0bfdb68b46946158586b9e515cb))
* **extension:** put the share view in order ([ade6cff](https://github.com/montara-project/montara-pass/commit/ade6cfffb2eab311a37bacdedaaeda3990409643))
* give the generator and the health report more room ([8f50f1a](https://github.com/montara-project/montara-pass/commit/8f50f1acbf9e225cd352ac8660768f3ba66c3a67))

## [1.6.0](https://github.com/montara-project/montara-pass/compare/v1.5.0...v1.6.0) (2026-10-13)

### Features

* **extension:** offer a site's logins in the corner of its sign-in page ([cd7b1f1](https://github.com/montara-project/montara-pass/commit/cd7b1f1e8e90079c4d64c43fc15ab6eefb5c1380))

### Bug Fixes

* **extension:** tie a sign-in field's error to its input ([617dbe6](https://github.com/montara-project/montara-pass/commit/617dbe646dc86655bcf9e90027c9550b10d728a1))

## [1.5.0](https://github.com/montara-project/montara-pass/compare/v1.4.0...v1.5.0) (2026-10-13)

### Features

* **extension:** give a popup row two buttons, launch and more ([3b2628e](https://github.com/montara-project/montara-pass/commit/3b2628e25dbc2239b2bf68b57c23f3509fec73fb))
* **extension:** lay settings out as sections of cards ([73ecf86](https://github.com/montara-project/montara-pass/commit/73ecf86b6bf96eb697574df5715b799bff5dacfb))
* **extension:** save passkeys in the vault and sign in with them ([a7b4a30](https://github.com/montara-project/montara-pass/commit/a7b4a30fea968fd96eac42d58cf838d6d5937a47))

### Bug Fixes

* **app:** show a dash for a date that cannot be read ([a5060b6](https://github.com/montara-project/montara-pass/commit/a5060b6d00b04553b35ccae8072d0abd6e758bfb))
* **extension:** do not offer a passkey-only login for filling ([3eb45f5](https://github.com/montara-project/montara-pass/commit/3eb45f514d58470a94e21c24f29f83f305c9202a))
* **extension:** hear only the frames the content script made ([1d89fe8](https://github.com/montara-project/montara-pass/commit/1d89fe8a4780ecd1c46459785fb57726f9e0358f))
* **extension:** keep www apart on a shared suffix, and say shared aloud ([d383223](https://github.com/montara-project/montara-pass/commit/d38322359ba7cbd1be2a40097742f8d1232c224b))
* **extension:** offer sign out in settings after a failed start ([40099ed](https://github.com/montara-project/montara-pass/commit/40099ede45ff3cfafafdfc4d97d765ccc29106a6))

## [1.4.0](https://github.com/montara-project/montara-pass/compare/v1.3.0...v1.4.0) (2026-10-12)

### Features

* **app,extension:** send an idempotency key with every write ([98ff599](https://github.com/montara-project/montara-pass/commit/98ff5999dedd272340e489d4dbf24c2af349a396))
* **extension:** offer to save a login as it is submitted ([949ea5e](https://github.com/montara-project/montara-pass/commit/949ea5ec93269f1cec91fa10d7deb324896c467e))
* **extension:** suggest a generated password on sign-up forms ([929ed2d](https://github.com/montara-project/montara-pass/commit/929ed2da48b0b0220368b7c0139da12c4cba7283))
* **server:** run a write once when it carries an Idempotency-Key ([1ce0cfb](https://github.com/montara-project/montara-pass/commit/1ce0cfb12a13c2d8e5f38cdf48725cf348329a19))
* **server:** share rate limits and idempotency keys through Redis ([b43e623](https://github.com/montara-project/montara-pass/commit/b43e62330245cd3f77f401d2f0861906cfeb596b))

### Bug Fixes

* **app:** lock the vault after 15 idle minutes and refuse short public keys ([22f0a42](https://github.com/montara-project/montara-pass/commit/22f0a422807eeab11fd84fe2c059833d9ee9035f))
* **app:** lock the vault when a click arrives after the deadline ([c60d88b](https://github.com/montara-project/montara-pass/commit/c60d88b571dccce08a21c648506b7a151fdd2e95))
* **extension:** expire a pending login under an open save prompt ([2766278](https://github.com/montara-project/montara-pass/commit/27662783b2100812d711c9a6f80b7c8324db064e))
* **extension:** ignore synthetic key events and plain http pages ([6078aa8](https://github.com/montara-project/montara-pass/commit/6078aa813eab03880bb0273f3f514c27a22620d2))
* **extension:** open the inline menu when a login field is entered ([73fe601](https://github.com/montara-project/montara-pass/commit/73fe6018b5a381f4b52a9f2ec1f0e1750e086906))
* **server:** keep one idempotency lock token per holder ([6874496](https://github.com/montara-project/montara-pass/commit/6874496abf9a61195950be3b354ffd811d10b486))
* **server:** refuse unverified emails and harden rate limits and headers ([f4bf6e7](https://github.com/montara-project/montara-pass/commit/f4bf6e794cde922ff859627b28ede72f6f9ea8ea))

## [1.3.0](https://github.com/montara-project/montara-pass/compare/v1.2.0...v1.3.0) (2026-10-11)

### Features

* **app:** add a password generator and a password health check ([defc552](https://github.com/montara-project/montara-pass/commit/defc55248f8a8d208216326bbf7801dd482da9d1))
* **app:** balance the password generator and split out the Markdown editor ([9ec8df2](https://github.com/montara-project/montara-pass/commit/9ec8df278923b74c167c422da441741b4caa862a))
* **app:** edit a login's notes as Markdown too ([5c863fc](https://github.com/montara-project/montara-pass/commit/5c863fc1eecc79270c66d7aca200e72d4e6171f9))
* **app:** edit secure notes as rich text with Milkdown ([ae2f984](https://github.com/montara-project/montara-pass/commit/ae2f9849edc04d1e780157339cad273bbd88c764))
* **app:** let a secure note be marked not visible ([de5477a](https://github.com/montara-project/montara-pass/commit/de5477a1a47cfc8970eeb88f7b17f0d785c3c806))
* **extension:** add password tools, list columns and sharing to the full-screen view ([da71e3c](https://github.com/montara-project/montara-pass/commit/da71e3cb06a67f83dd28c5af6dd5530b26ce3153))
* **extension:** blur a secure note that is not visible until it is shown ([0695bd6](https://github.com/montara-project/montara-pass/commit/0695bd67882bf2622ac438e9711761108ca0e597))
* **extension:** edit and render a login's notes as Markdown ([75f44a4](https://github.com/montara-project/montara-pass/commit/75f44a47cd1fd46933f46b5060b066aa4127cf9a))
* **extension:** keep a login's site icon inside the encrypted item ([ef66b6e](https://github.com/montara-project/montara-pass/commit/ef66b6e5d5f9d3848a438e3fba86ddcaf58035e2))
* **extension:** render a secure note's Markdown in the item detail ([71e4be3](https://github.com/montara-project/montara-pass/commit/71e4be3e9377eedf60a7320d0920d2924a53f76a))
* **extension:** show site icons and when a login was last used ([ee13304](https://github.com/montara-project/montara-pass/commit/ee133046912e1913985f5ae84821011acd23a24a))
* **extension:** turn the inline menu on for everyone and offer one server URL ([eac1d59](https://github.com/montara-project/montara-pass/commit/eac1d59edb0b024964111d8f970a1c1e83c5e8cc))
* **extension:** write secure notes in the Markdown editor and balance the generator ([218306d](https://github.com/montara-project/montara-pass/commit/218306da9544490f2069ac42a682bacab3532366))
* **server:** record when a member last used an item ([ec6bcb4](https://github.com/montara-project/montara-pass/commit/ec6bcb49296b36e2ddfdd127f30970f858ef9da5))

### Bug Fixes

* **app:** do not rate a repeated block as a strong password ([5afdb27](https://github.com/montara-project/montara-pass/commit/5afdb27e73b6f6fbf66592f232a199764a97f550))
* **app:** paste code into the Markdown editor as a code block ([37c3e07](https://github.com/montara-project/montara-pass/commit/37c3e07862673cd4c90923755331284fe5736de1))
* **extension:** handle failures in copy, share and last-used, and show the editor's focus ([5026c8d](https://github.com/montara-project/montara-pass/commit/5026c8d3dab9952854eb05f767134666d1d66832))

## [1.2.0](https://github.com/montara-project/montara-pass/compare/v1.1.1...v1.2.0) (2026-10-11)

### Features

* **extension:** add an opt-in inline menu in login fields ([5a07c27](https://github.com/montara-project/montara-pass/commit/5a07c2713f1fa75f64c05a2064f30a1c5faa5c06))
* **web:** redesign the landing page, header and footer ([d061bdc](https://github.com/montara-project/montara-pass/commit/d061bdc6d6db96479da93b5ee074c53dc5de1ad7))
* **web:** use real stack logos and link to the docs site ([a84c4a4](https://github.com/montara-project/montara-pass/commit/a84c4a4e142b9a5da5164a22829060b4253ab618))

### Bug Fixes

* **extension:** clear the add-on linter warnings for Firefox ([b9fafd6](https://github.com/montara-project/montara-pass/commit/b9fafd6e2f7e482f70f343b2a0b5c4d67f4849e3))

## [1.1.1](https://github.com/montara-project/montara-pass/compare/v1.1.0...v1.1.1) (2026-10-10)

### Features

* **deploy:** add a Docker Compose stack for Dokploy ([dce72b4](https://github.com/montara-project/montara-pass/commit/dce72b47b20c87800140b47615cb2768e2b13c16))

## [1.1.0](https://github.com/montara-project/montara-pass/compare/v1.0.0...v1.1.0) (2026-10-10)

### ⚠ BREAKING CHANGES

* API paths move from /v1 and /health to /api/v1 and
  /api/health, including the Google OAuth callback. The separate app
  image is no longer published; the server image contains the web app.

### Features

* serve the web app from the API and move every endpoint under /api ([d5c8022](https://github.com/montara-project/montara-pass/commit/d5c80221d08a4f6272252bb8fcde7f186b7ad75a))

### Bug Fixes

* update domain web ([4f5fbbf](https://github.com/montara-project/montara-pass/commit/4f5fbbf27180238c7d1dedfc30333944469cf2e9))

## 1.0.0 (2026-10-10)

### ⚠ BREAKING CHANGES

* **server:** DATABASE_URL is replaced by DB_DSN, and APP_SECRET,
  FROM_ADDRESS and RESEND_API_KEY are now required. The migrations are
  replaced (PostgreSQL 18 for uuidv7()), so a database that applied the
  old 000001_create_users_table must be recreated. `migrate down` now
  rolls back every migration instead of one step.

### Features

* add skills ([e758f24](https://github.com/montara-project/montara-pass/commit/e758f244c5e70c22eb92b592b5fe628d9c6c400f))
* **app:** add the end-to-end encrypted vault UI ([d34858a](https://github.com/montara-project/montara-pass/commit/d34858a4231ece954d065da4b30ea30b6156ec5d))
* **app:** use the new logo and the brand palette ([bd54cbc](https://github.com/montara-project/montara-pass/commit/bd54cbc38f8a138f2a933ee2aa073fab0aa0f05b))
* **docs:** add the documentation site ([cc6f561](https://github.com/montara-project/montara-pass/commit/cc6f5613c5fc90a893ae6ef16920046742e451ed))
* **extension:** add the browser extension for Chrome and Firefox ([b00f008](https://github.com/montara-project/montara-pass/commit/b00f00869653dea55ec4b56d774221aaf79ca0a0))
* **extension:** restyle the popup and add a full-screen vault view ([4f17949](https://github.com/montara-project/montara-pass/commit/4f17949cdcb52f28d1e755f6980fff5b381a358f))
* **extension:** rework sign-in, the item form and the palette ([34ddea8](https://github.com/montara-project/montara-pass/commit/34ddea8885c2ae964b75b62845bd81c163231c68))
* **extension:** use the new logo and restyle the form selects ([687524d](https://github.com/montara-project/montara-pass/commit/687524d938b5c496a9dd543455511aa452eb79de))
* initial project ([dca56dd](https://github.com/montara-project/montara-pass/commit/dca56ddf78f553d285e7aa730d42d377c139f48a))
* **server:** add end-to-end encrypted password vault ([e911731](https://github.com/montara-project/montara-pass/commit/e911731bc00ce27e79ef2c9aaf628973efe58bdc))
* **server:** adopt gofi structure with embedded Authula auth ([75c4efd](https://github.com/montara-project/montara-pass/commit/75c4efdb5815af88c0e8614eb12628fefd1f4db2))
* **web:** contact page with validated form ([a87dbf8](https://github.com/montara-project/montara-pass/commit/a87dbf8162fac21dbb65cc1d30e6785d12b41d72))
* **web:** legal pages with sticky table of contents ([388f2ba](https://github.com/montara-project/montara-pass/commit/388f2ba4f1dc788cac77493b13b74c63dd05dba6))
* **web:** light mode with theme toggle ([ede0bf3](https://github.com/montara-project/montara-pass/commit/ede0bf3eb88ae62565f56a1b38d3f686bb65c74f))
* **web:** professional polish for the home page ([7a93d87](https://github.com/montara-project/montara-pass/commit/7a93d87f48d1e8cab267e860934a339d363a95c9))
* **web:** shared layout and site chrome ([f6cbb27](https://github.com/montara-project/montara-pass/commit/f6cbb27d0100a4c5f0446d0abbbd6bd5607d2939))
* **web:** use the new logo and the brand palette ([9f7207d](https://github.com/montara-project/montara-pass/commit/9f7207d72754d9c1136909af17873a2a81128804))

### Bug Fixes

* **server:** accept browser extension origins in the cross-origin check ([f9aa517](https://github.com/montara-project/montara-pass/commit/f9aa517ef3401a2a9ad5a265763df3f24a9a9968))
* update layout & env example ([5d6e782](https://github.com/montara-project/montara-pass/commit/5d6e78224c1881e000e825851c020b0bcd695186))
* update login page ([6b0525f](https://github.com/montara-project/montara-pass/commit/6b0525f8b935e4fb56479cb939cc7e07e208c651))

# Changelog

All notable changes to this project are documented in this file. Versions follow the git tags (`v*`); Docker images are published to ghcr.io with the same version.


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

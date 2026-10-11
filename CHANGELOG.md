# Changelog

All notable changes to this project are documented in this file. Versions follow the git tags (`v*`); Docker images are published to ghcr.io with the same version.


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

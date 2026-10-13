# ISSUES

Hasil audit keamanan dan review kode `montara-pass`, diurutkan menurut tingkat keparahan.
Diaudit pada 2026-10-11, branch `dev` (`b43e623`), versi 1.3.0.
Audit lanjutan pada 2026-10-13, branch `feat/extension-passkeys` (`a7b4a30`), untuk
`apps/extension` dan `apps/app`: menambah M-7, M-8, L-10 sampai L-13, dan bagian over-engineering.

## Ringkasan

| Level    | Jumlah | Arti                                                                  |
| -------- | ------ | --------------------------------------------------------------------- |
| Critical | 0      | Isi vault bisa dibaca tanpa syarat                                    |
| High     | 2      | Rahasia bocor atau pertahanan utama bisa dilewati, dengan syarat ringan |
| Medium   | 8      | Memperbesar dampak serangan lain, atau melemahkan klaim zero-knowledge |
| Low      | 13     | Pengerasan dan kebersihan                                             |

Tidak ada SQL injection, IDOR, atau kebocoran plaintext yang ditemukan: semua query memakai
bind parameter, setiap akses item lewat `item_members`, dan error 500 tidak membocorkan detail.

### Status perbaikan (2026-10-11)

| ID  | Status | Catatan |
| --- | ------ | ------- |
| H-1 | Diperbaiki | `Authorization` menolak email belum terverifikasi (403), `AutoSignIn` dimatikan; dicakup integration test |
| H-2 | Diperbaiki | `EnableIPValidation: true` |
| M-1 | Sebagian | CSP aktif. Token masih di cookie yang terbaca JavaScript |
| M-2 | Diperbaiki | HSTS satu tahun di luar development |
| M-3 | Terbuka | Butuh keputusan desain (fingerprint atau penyematan kunci) |
| M-4 | Sebagian | Limiter per email 10/menit di rute auth. Minimum password masih 8 |
| M-5 | Diperbaiki | Web app mengunci setelah 15 menit tanpa klik atau ketikan |
| M-6 | Sebagian | `fflate` di-override ke 0.7.5. `braces` belum punya rilis perbaikan; `katex` belum disentuh |
| L-1 | Terbuka | Butuh perubahan API dan klien |
| L-2 | Terbuka | Butuh format cipher baru dan migrasi |
| L-3 | Diperbaiki | Event sintetis diabaikan |
| L-4 | Diperbaiki | Login https tidak lagi ditawarkan di halaman http (kecuali localhost). Sufiks publik (`tldts`) tidak lagi dianggap induk |
| L-5 | Diperbaiki | Klien menolak public key di bawah 3072-bit |
| L-6 | Diperbaiki | `GET /keys/public` dibatasi 20/menit per IP |
| L-7 | Terbuka | Menghapus clipboard bisa menimpa salinan lain, membacanya memunculkan izin browser |
| L-8 | Terbuka | |
| L-9 | Terbuka | |
| M-7 | Diperbaiki | Tiap frame diberi token rahasia lewat `postMessage` dan content script hanya mendengar pesan yang membawanya. Diuji di Chromium; Firefox belum |
| M-8 | Terbuka | Urutan rilis menutup web app; ekstensi lama butuh versi klien minimum di server |
| L-10 | Diperbaiki | `rpIdFor` menolak sufiks publik (`tldts`) |
| L-11 | Diperbaiki | Item bukan milik sendiri diberi label "Shared with you" di menu inline dan prompt passkey |
| L-12 | Diperbaiki | `setAccessLevel('TRUSTED_CONTEXTS')` di background. Efeknya belum diuji, dan browser tanpa API ini tetap terbuka |
| L-13 | Sebagian | Didokumentasikan di README. Verifikasi ulang per permintaan butuh keputusan desain |

Dari bagian over-engineering: `login-form.tsx` dihapus dan `routes.go` dirapikan; dua lainnya
masih terbuka.

### Cakupan

- **Dibaca penuh:** `apps/server` (`cmd/api`, middlewares, handler item/key/folder, repository
  item/user_key/user, `dtos/vault.go`, migrasi 000002 dan 000004), `apps/app/src/lib/crypto`,
  `apps/app/src/lib/auth/token-storage.ts`, `apps/extension` (content script, background,
  inline menu, `lib/`), `deploy/`, `apps/server/Dockerfile`.
- **Tidak dibaca:** komponen UI `apps/app` (±150 file), `apps/docs`, handler dan repository
  kategori, `cmd/migrate`, workflow rilis.
- **Audit 2026-10-13:** `apps/extension/src` dibaca penuh, termasuk alur passkey yang baru
  (`passkey-page.ts`, `lib/passkey.ts`, prompt di `inline/main.tsx`). Di `apps/app/src` yang
  dibaca adalah `lib/`, `hooks/use-markdown-editor.ts` dan `package.json`; komponen UI hanya
  dipindai dengan pencarian (sink HTML, `href`, redirect, penyimpanan browser, impor dan ekspor
  yang tidak terpakai), tidak dibaca satu per satu. Alur passkey belum pernah dijalankan di
  browser saat audit ini ditulis. Setelah perbaikan, ekstensi hasil build diuji di Chromium
  (Playwright, API tiruan): simpan dan login passkey dengan verifikasi tanda tangan, jatuh ke
  browser saat belum sign in, salinan prompt yang dibingkai halaman, menu inline, dan prompt
  simpan. Firefox dan server sungguhan belum.
- **Metode:** baca kode dan source dependency (Authula v1.46.0, Fiber v3.5.0) plus
  `pnpm audit --prod`. Tidak ada pengujian terhadap server yang berjalan, jadi setiap temuan
  berstatus "terbukti dari kode", belum dieksploitasi.

---

## High

### H-1 · Akun dengan email belum terverifikasi bisa menerima item yang dibagikan

- **Lokasi:** `apps/server/cmd/api/authula.go:345-353`,
  `apps/server/internal/middlewares/authorization.go:34-47`,
  `apps/server/internal/repositories/user_key.go:63-72`
- **Masalah:** `AutoSignIn: true` membuat Authula memberi sesi langsung saat sign-up, sebelum
  email diverifikasi (`plugins/email-password/usecases/sign_up_usecase.go:107`), dan use case
  sign-in juga tidak memeriksa `EmailVerified`. Middleware `Authorization` hanya memeriksa sesi.
  Jadi `RequireEmailVerification: true` tidak menahan apa pun.
- **Dampak:** penyerang mendaftar dengan email orang lain yang belum punya akun, membuat kunci
  vault, lalu `GET /api/v1/keys/public?email=korban@…` mengembalikan public key milik penyerang.
  Siapa pun yang membagikan item ke email itu mengenkripsinya untuk penyerang. Pemilik email
  yang asli juga tidak bisa lagi mendaftar.
- **Perbaikan:** tolak pengguna yang belum terverifikasi di `Authorization` (atau minimal di
  `POST /keys` dan `PublicKeyByEmail`, dengan join ke `authula.users.email_verified`), dan set
  `AutoSignIn: false`.

### H-2 · Rate limit bisa dilewati dengan memalsukan `X-Forwarded-For`

- **Lokasi:** `apps/server/cmd/api/server.go:51-56`,
  `apps/server/internal/middlewares/rate_limit.go:18-23`
- **Masalah:** `EnableIPValidation` tidak diaktifkan, sehingga `c.IP()` mengembalikan isi mentah
  header `X-Forwarded-For` (Fiber `req.go:729`). Kalau proxy di depan menambahkan IP ke header
  kiriman klien alih-alih menimpanya, setiap nilai header yang berbeda mendapat jatah limit
  sendiri.
- **Dampak:** limiter 30/menit di rute auth, satu-satunya penahan tebak password, tidak berlaku.
  Klien juga bisa mengirim nilai yang cocok dengan `RATE_LIMIT_EXEMPT_IPS`.
- **Syarat:** proxy yang meneruskan `X-Forwarded-For` dari klien (mis. nginx dengan
  `$proxy_add_x_forwarded_for`). Traefik bawaan menimpa header ini, tetapi itu belum saya uji
  pada deploy Dokploy ini.
- **Perbaikan:** tambahkan `EnableIPValidation: true` di `fiber.Config`; Fiber lalu mengambil IP
  paling kanan yang bukan proxy tepercaya.

---

## Medium

### M-1 · Web app vault tanpa Content-Security-Policy, token bisa dibaca JavaScript

- **Lokasi:** `apps/server/cmd/api/server.go:66`, `apps/app/src/lib/auth/token-storage.ts:14-19`
- **Masalah:** `helmet.New()` bawaan tidak mengirim CSP. Access token dan refresh token disimpan
  di cookie yang ditulis lewat `document.cookie`, jadi bukan `HttpOnly`.
- **Dampak:** satu celah XSS (mis. dari dependency editor markdown) cukup untuk mencuri token
  dan memakai kunci vault yang sedang terbuka di memori.
- **Perbaikan:** set `ContentSecurityPolicy` di helmet, mis.
  `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'`.
  Untuk deploy satu origin, pakai cookie sesi `HttpOnly` yang sudah ada dan hapus cookie token.

### M-2 · Tidak ada HSTS

- **Lokasi:** `apps/server/cmd/api/server.go:66`
- **Masalah:** `HSTSMaxAge` helmet bawaan bernilai 0, jadi header `Strict-Transport-Security`
  tidak dikirim.
- **Perbaikan:** `helmet.New(helmet.Config{HSTSMaxAge: 31536000})` saat `ENV` bukan development.

### M-3 · Public key penerima tidak bisa diverifikasi

- **Lokasi:** `apps/app/src/lib/crypto/vault.ts:259-297`,
  `apps/server/internal/handlers/key.go:89-100`
- **Masalah:** klien membungkus item key dengan public key apa pun yang dikembalikan server saat
  berbagi dan saat rotasi kunci. Tidak ada fingerprint atau penyematan kunci.
- **Dampak:** server yang jahat atau diretas bisa mengganti public key dan membaca item yang
  dibagikan. Ini bertentangan dengan klaim "server tidak pernah memegang kunci" untuk item
  bersama; item pribadi tidak terdampak.
- **Perbaikan:** tampilkan fingerprint kunci penerima saat berbagi dan sematkan kunci yang
  pernah dipakai (trust on first use). Minimal, tulis batasan ini di dokumentasi keamanan.

### M-4 · Tebak password tanpa lockout akun

- **Lokasi:** `apps/server/cmd/api/routes.go:21,40-43`, `apps/server/cmd/api/authula.go:347`
- **Masalah:** rute auth dibatasi 30 percobaan per menit per IP dan 10 per menit per email,
  tetapi tidak ada lockout akun, dan panjang minimum password login 8 karakter.
- **Dampak:** tebakan terdistribusi ke satu akun diperlambat ke 10 per menit, tidak dihentikan.
  Yang didapat adalah sesi dan ciphertext, bukan isi vault, tetapi itu membuka serangan offline
  ke master password.
- **Perbaikan:** tambah lockout akun setelah sejumlah kegagalan, naikkan minimum ke 12.

### M-5 · Web app tidak mengunci otomatis saat ditinggal

- **Lokasi:** `apps/app/src/lib/stores/` (tidak ada timer idle di `apps/app/src`)
- **Masalah:** ekstensi mengunci setelah 15 menit, web app hanya saat reload. Tab yang ditinggal
  tetap terbuka tanpa batas.
- **Perbaikan:** timer idle yang mengosongkan store kunci vault, dengan durasi yang sama.

### M-6 · Tiga advisory dependency terbuka

- **Sumber:** `pnpm audit --prod`
- `braces` ≤3.0.3 (high, DoS) lewat `vinext` di `apps/web`: jalur build, bukan runtime.
- `fflate` <0.7.5 (moderate, infinite loop) lewat `@vercel/og` di `apps/web`.
- `katex` <0.18.2 (low, prototype pollution) lewat `@milkdown/react` di `apps/app`, yaitu web
  app vault.
- **Perbaikan:** naikkan `vinext` dan `@milkdown/*`, atau pakai `pnpm.overrides`. Modul Go belum
  dipindai karena `govulncheck` tidak terpasang.

### M-7 · Klik di salinan tersembunyi menu inline dianggap klik di menu yang terlihat

- **Lokasi:** `apps/extension/src/content.ts:481-490` (`inline:check`, `save:check`),
  `apps/extension/vite.config.ts` (`web_accessible_resources`),
  `apps/extension/src/inline/main.tsx:102,195,311`
- **Masalah:** `inline.html` bisa dibingkai oleh situs mana pun, bukan hanya oleh content script.
  Sebelum mengisi atau menyimpan, frame bertanya ke content script apakah menu terlihat, dan
  content script menjawab untuk frame buatannya sendiri tanpa memeriksa frame mana yang
  bertanya (`sender.frameId`).
- **Dampak:** halaman membingkai salinan `inline.html` yang transparan di bawah tombol umpan,
  sementara menu asli terbuka di tempat lain. Satu klik pada umpan mengisi login ke halaman itu
  tanpa pengguna memilihnya. Yang terisi hanya login yang cocok dengan situsnya, tetapi itu
  mencakup login domain induk: halaman di `a.example.com` mendapat password yang disimpan untuk
  `example.com`. Prompt simpan dan password saran bisa dipicu dengan cara yang sama.
- **Syarat:** vault terbuka, pengguna mengklik sesuatu di halaman penyerang, dan ada login
  tersimpan untuk host itu atau induknya.
- **Perbaikan (diterapkan):** content script mengirim token acak ke tiap frame buatannya lewat
  `contentWindow.postMessage` dengan target origin ekstensi, dan hanya mendengar pesan
  `inline:*`, `save:*` dan `passkey:*` yang membawa token frame itu. Mengikat lewat
  `sender.frameId` tidak bisa: di Chrome `chrome.runtime.getFrameId` tidak ada di content script
  dan `sender.frameId` kosong untuk pesan dari frame ekstensi. Pengikat pertama untuk passkey
  (commit `a7b4a30`) memakai `getFrameId` dan karena itu mematikan prompt passkey di Chrome.

### M-8 · Klien lama menghapus passkey saat item diedit

- **Lokasi:** `apps/app/src/lib/crypto/vault.ts:85-97` (`keepUnedited`),
  `apps/app/src/components/block/vault/form.tsx:266`,
  `apps/extension/src/popup/views/item-form.tsx:187`
- **Masalah:** passkey disimpan di isi terenkripsi item login. Klien sebelum `a7b4a30` menyusun
  ulang isi item dari form saat menyimpan dan tidak mengenal field `passkey`, jadi field itu
  hilang. Server tidak bisa mencegahnya karena tidak melihat isinya.
- **Dampak:** pengguna menyimpan passkey dari ekstensi baru, lalu mengganti nama item itu di web
  app yang belum di-deploy ulang atau di ekstensi lama di browser lain. Private key hilang
  permanen, sedangkan situs masih mendaftarkan passkey itu: pengguna terkunci dari akunnya bila
  tidak punya cara login lain.
- **Perbaikan:** deploy `apps/app` sebelum merilis ekstensi. Untuk ekstensi lama yang sudah
  terpasang, satu-satunya penutup penuh adalah versi klien minimum yang ditolak server.

---

## Low

| ID   | Masalah | Lokasi | Perbaikan |
| ---- | ------- | ------ | --------- |
| L-1  | `PUT /keys` menimpa vault key terbungkus tanpa bukti kunci lama dan tanpa revisi; sesi curian bisa mengunci vault selamanya | `internal/repositories/user_key.go:47-59` | Minta revisi, dan simpan salinan sebelumnya untuk pemulihan |
| L-2  | AES-GCM tanpa AAD: server bisa menukar ciphertext antar item atau mengembalikan revisi lama | `apps/app/src/lib/crypto/symmetric.ts:15-26` | Ikat id item dan versi sebagai `additionalData` (cipher_version 2) |
| L-3  | Handler `keydown` menerima event sintetis, jadi halaman bisa membuka menu inline sendiri. Pengisian tetap dijaga `isTrusted` | `apps/extension/src/content.ts:220-231` | Abaikan event dengan `isTrusted === false` |
| L-4  | Pencocokan situs mengabaikan skema (login https ditawarkan di http) dan tidak memakai public suffix list | `apps/extension/src/lib/site.ts:20-30` | Wajibkan https kecuali login disimpan untuk http |
| L-5  | Public key hanya dicek panjangnya, bukan RSA ≥3072-bit | `internal/dtos/vault.go:78`, `apps/app/src/lib/crypto/asymmetric.ts:30` | Periksa `modulusLength` setelah `importKey` |
| L-6  | Pengguna yang login bisa memeriksa apakah sebuah email terdaftar (120/menit) | `internal/handlers/key.go:89-100` | Limiter yang lebih ketat untuk rute ini |
| L-7  | Password yang disalin tidak dihapus dari clipboard | `apps/app/src/components/block/vault/column.tsx:164` | Kosongkan setelah ±30 detik |
| L-8  | Sampah tidak pernah dibersihkan; migrasi menyebut job yang tidak ada | `migrations/000004_create_vault.up.sql:62` | Tambah job purge atau hapus klaimnya |
| L-10 | `rpIdFor` tidak memakai public suffix list: halaman di `a.github.io` boleh menyebut `github.io` sebagai relying party, yang ditolak browser. Yang terbuka hanya passkey yang dibuat untuk nama semacam itu | `apps/extension/src/lib/passkey.ts:82-98` | Bundel daftarnya (mis. `tldts`), sekaligus menutup sisa L-4 |
| L-11 | Passkey dan login di item yang dibagikan ditawarkan seperti milik sendiri, tanpa tanda. Pembagi bisa membuat penerima masuk ke akun milik pembagi | `apps/extension/src/inline/main.tsx:164-170,411-424` | Tandai item yang `role`-nya bukan `owner`, atau minta konfirmasi sekali |
| L-12 | Token sesi di `chrome.storage.local` terbuka untuk content script (bawaan browser), jadi proses halaman yang diretas bisa membacanya. Kunci vault tidak terdampak: ada di `storage.session` | `apps/extension/src/lib/storage.ts:24-44`, `apps/extension/src/background.ts` | `chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' })` di background; periksa dulu dukungan Firefox |
| L-13 | Flag user-verified selalu diset pada passkey, tanpa verifikasi ulang per permintaan. Situs yang meminta `userVerification: 'required'` hanya mendapat "vault dibuka dengan master password dalam 15 menit terakhir" | `apps/extension/src/lib/passkey.ts:129-146` | Minta master password lagi untuk permintaan `required`, atau dokumentasikan |
| L-9  | CI tidak menjalankan `go test`, lint, atau audit dependency; workflow hanya rilis dan react-doctor | `.github/workflows/` | Satu workflow untuk test, lint, `pnpm audit`, `govulncheck` |

Catatan untuk L-6 dan H-1: `users.email` di tabel mirror tidak unik dan baris pengguna yang
dihapus di Authula dipertahankan, sedangkan `PublicKeyByEmail` memakai `LIMIT 1` tanpa urutan.
Selama belum ada jalur hapus akun ini tidak bisa dipicu; tambahkan indeks unik sebelum ada.

---

## Over-engineering

Daftar pertama dari audit 2026-10-11, hanya file yang terbaca saat audit keamanan.

- `delete:` `apps/web/components/login-form.tsx` tidak diimpor di mana pun. Gantinya: tidak ada. (213 baris)
- `delete:` `.agents/skills/authula` dan `.agents/skills/postgres-best-practices` identik dengan salinan di `.claude/skills`. Gantinya: symlink. (20 file)
- `native:` `apps/app/src/lib/auth/token-storage.ts` menulis dan membaca cookie token sendiri. Gantinya: cookie sesi `HttpOnly` yang sudah dikeluarkan server, untuk deploy satu origin (lihat M-1). (±90 baris)
- `shrink:` `apps/server/cmd/api/routes.go:41` menghitung ulang `exemptLoopback` dan `exemptIPs` yang dideklarasikan di baris 45-46. Gantinya: pindahkan deklarasi ke atas dan pakai di kedua limiter.

net: ±-300 baris, -0 dependency.

### `apps/app` dan `apps/extension` (2026-10-13)

Diurutkan dari potongan terbesar. Yang bertanda (selesai) sudah diterapkan; sisanya terbuka
karena menyentuh puluhan komponen UI yang belum punya uji.

- `native:` dua klien HTTP untuk API yang sama dengan aturan refresh-401 yang sama: axios di `apps/app/src/lib/api/client-fetch.ts`, `resource.ts` dan `axios-error.ts`, lalu `fetch` di `apps/extension/src/lib/api.ts`. Gantinya: satu klien `fetch` yang dipakai keduanya; ekstensi sudah mengimpor dari `@/`. (±250 baris, -1 dependency)
- `yagni:` dua pustaka ikon di `apps/app`: `@tabler/icons-react` (20 file) dan `lucide-react` (12 file, hampir semuanya di `components/ui`). Gantinya: tabler saja. (-1 dependency)
- `native:` `nuqs` dipakai di 4 file untuk state halaman dan pencarian di URL. Gantinya: `validateSearch` dan `useSearch` milik TanStack Router, yang sudah terpasang. (-1 dependency)
- (selesai) `delete:` `apps/app/src/components/ui/tabs.tsx` dan `ui/pagination.tsx` tidak diimpor di mana pun. Gantinya: tidak ada. (99 baris)
- (selesai) `stdlib:` `date-fns` dipakai satu file, `apps/app/src/lib/date.ts`, untuk dua format tetap. Gantinya: `new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'medium' })`. (-1 dependency)
- (selesai) `yagni:` `@t3-oss/env-core` di `apps/app/src/config/env.ts` memvalidasi dua variabel opsional yang sama-sama punya nilai bawaan. Gantinya: `import.meta.env.VITE_API_URL || window.location.origin`. (-1 dependency, ±10 baris)
- (selesai) `delete:` ekspor yang tidak dirujuk di mana pun: `getTotal` (`lib/constants/paginate.ts`), `requiredNonNegativeInteger` (`lib/validation.ts`), `IncludeParam` (`lib/api/dtos/paginate.ts`), `ResourceProps` (`types/api.ts`), `SetupVaultFormDto` dan `UnlockFormDto` (`lib/api/dtos/vault/schema.ts`), `DataGridApiFetchParams`, `DataGridApiResponse` dan `DataGridRequestParams` (`ui/data-grid.tsx`), `BadgeProps`, `BadgeButtonProps` dan `BadgeDotProps` (`ui/badge.tsx`). Gantinya: tidak ada. (±40 baris)
- `delete:` bagian komponen `components/ui` yang tidak dipakai di luar filenya, antara lain `DropdownMenuSub*`, `DropdownMenuCheckboxItem`, `DropdownMenuRadio*`, `SidebarInput`, `SidebarMenuSkeleton`, `SelectGroup`, `SheetFooter`, `FieldSet`, `BadgeButton`, `CardTable`. Ini salinan shadcn, jadi baru layak dipotong kalau filenya memang disentuh. Belum dihitung.
- `yagni:` `zustand` untuk satu store berisi satu nilai (`apps/app/src/lib/stores/vault.ts`). Gantinya: variabel modul dengan `useSyncExternalStore`. Paling kecil untungnya; biarkan kalau store kedua sudah direncanakan. (-1 dependency)

`apps/extension` sendiri ramping: tiga dependency runtime (`tldts` ditambahkan untuk L-10), dan pengulangan yang ada (`usable()` di tiga tempat, konstanta di `background.ts` dan `lib/session.ts`) dipaksa oleh aturan bahwa content script dan fungsi yang disuntikkan tidak boleh mengimpor.

net: ±-400 baris, -5 dependency mungkin (-6 dengan `zustand`).

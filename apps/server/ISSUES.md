# ISSUES — audit `apps/server`

## Audit 2 — 2026-10-16, setelah migrasi Lemon Squeezy (`dev` @ `14aa8e7`)

Scope: over-engineering saja (ponytail-audit). Bug, keamanan, dan performa
tidak termasuk. Shortcut yang sengaja diambil di billing (urutan webhook,
statistik perpanjangan) sudah ditandai `ponytail:` di kode dan tidak diulang
di sini. Diurutkan dari potongan terbesar.

**Status (2026-10-16):** #1–#7 sudah dikerjakan (belum di-commit). #8
ternyata keliru dan tidak diubah. Hasilnya: server −442 baris bersih
(+69/−511), app −451, docs −32. `go test ./...` dan integration test lolos;
typecheck app dan extension lolos.

Format: `<tag> <yang dipotong>. <penggantinya>. [path]`

1. `delete:` Fitur **categories**: CRUD admin untuk tabel yang tidak dirujuk
   tabel, item, atau fitur lain mana pun. Isinya hanya dua baris seed
   (`Public`, `Private`), dan fitur ini datang dari template awal
   (`75c4efd`, "adopt gofi structure"). Penggantinya tidak ada; buat migrasi
   `DROP TABLE categories` dan hapus halaman `/categories` di app. Sekitar
   −320 baris server dan −420 baris app. Karena fitur ini ada di UI, pastikan
   dulu memang tidak direncanakan. [internal/handlers/category.go,
   internal/repositories/category.go, internal/dtos/category.go,
   internal/models/category.go, internal/seeders/category.go,
   internal/lib/constant/category.go, cmd/api/routes.go:62-69;
   apps/app/src/components/block/category, routes/(app)/categories,
   lib/api/{models,dtos,queries,services}/category*]
   ✅ **Fixed:** semua dihapus dari server, app, dan docs. Migrasi main `000006_drop_categories` membuang tabelnya (down membuat ulang tabel kosong). Cek super user dan CSRF di integration test sekarang memakai `GET /plans/all` dan `POST /folders`.

2. `yagni:` Kerangka seeder (`Seeder` interface, `seeders.All`, `runSeed`
   untuk banyak seeder, flag `--seed` di cmd/migrate dan `execSeeders`, loop
   `seedAll`) melayani dua seeder, dan salah satunya categories. Kalau #1
   dihapus, yang tersisa hanya `SuperUserSeeder`. Panggil `Seed()` langsung
   di boot dan buang interface, `All`, `--seed`, dan `execSeeders`. Sekitar
   −50 baris. [internal/seeders/type.go, internal/seeders/run.go:10-17,
   cmd/migrate/main.go:82-91,186-193, cmd/migrate/flag.go:29,43,90-92,
   cmd/api/db.go:94-104]
   ✅ **Fixed:** interface `Seeder`, `seeders.All`, `Name()`, `seedAll`, flag `--seed`, `execSeeders`, dan script `migrate:up:seed` dihapus. Boot memanggil `SuperUserSeeder.Seed()` langsung.

3. `delete:` Helper yang hanya dipakai categories: `mutateByID`,
   `listParams`, dan `translateForeignKey`. Setelah #1 tidak ada pemanggil
   lain, jadi ikut dihapus. Sekitar −25 baris. [internal/handlers/common.go:25-41,
   internal/repositories/helpers.go:36-44]
   ✅ **Fixed:** ikut dihapus. `dtos.ListQuery` diganti fungsi `listRules`, yang hanya dipakai `BillingListQuery`.

4. `delete:` `lib.ContextParamUUID` hanya membungkus `uuid.Parse(c.Params(key))`
   dan punya dua pemanggil, yang keduanya sudah mengganti error-nya sendiri.
   Ganti dengan `uuid.Parse(c.Params("id"))` di `pathID` dan `memberParam`.
   Sekitar −5 baris. [internal/lib/context.go:22-25]
   ✅ **Fixed:** diganti `uuid.Parse(c.Params(...))`.

5. `shrink:` `AddMember` menulis ulang `affected()` dengan cabang `err`
   ganda. Ganti dengan:
   ```go
   ok, err := affected(res, err)
   if err != nil {
       return err
   }
   if !ok {
       return apperr.New(apperr.KindNotFound, "user not found or has not set up a vault")
   }
   ```
   Sekitar −4 baris. [internal/repositories/item.go:307-316]
   ✅ **Fixed:** memakai `affected()`.

6. `shrink:` `requireChanged` adalah `requireAffected` dengan error lain.
   Bentuk pendeknya: `if ok, err := affected(res, nil); err != nil || ok {
   return err }; return errStaleItem`. Sekitar −4 baris.
   [internal/repositories/item.go:208-219]
   ✅ **Fixed:** memakai `affected()`.

7. `delete:` Konstanta `models.SubscriptionCanceled` tidak pernah ditulis
   kode sejak Lemon Squeezy. Pembatalan sekarang tercatat sebagai `active`
   dengan `canceled_at`, dan refund tidak lagi membatalkan subscription.
   Nilai `canceled` di CHECK DB dan label di UI tetap dibiarkan untuk baris
   lama dari masa Midtrans. −1 baris. [internal/models/billing.go:23]
   ✅ **Fixed:** dihapus.

8. `yagni:` `config.EnvStaging` diterima sebagai nilai `ENV`, tapi tidak ada
   kode yang membedakannya dari `production`. Pilihannya: buang nilai itu,
   atau biarkan sebagai alias yang didokumentasikan. Membuangnya akan
   mematahkan deployment yang memakai `ENV=staging`, jadi cek dulu. −2 baris.
   [internal/config/config.go:13, cmd/api/flag.go:135]
   ❌ **Tidak diubah, temuan keliru:** `ENV` diteruskan ke Sentry sebagai
   `Environment` (`cmd/api/server.go`), jadi `staging` memisahkan event
   staging dari produksi. Nilai ini juga terdokumentasi.

Yang sengaja dibiarkan: validator berbasis map (memeriksa field yang absen
sebelum binding, yang tidak bisa dilakukan `go-playground/validator` di
sini), client Lemon Squeezy buatan sendiri (tidak ada SDK Go resmi, dan
bagian yang dipakai kecil), pola `Handlers`/`Middlewares` per struct (konsisten
di semua handler), dan template email (isi, bukan abstraksi).

**net: −410 lines server (−830 dengan app), −0 deps possible.**

---

## Audit 1 — Cloud vs Community

Audit 2026-10-16 di `dev` @ `7e4ce1c`. `go build ./... && go vet ./...` bersih.

**Status (2026-10-16):** semua item A dan B sudah diperbaiki (belum
di-commit). Keputusan produk untuk B.3: flag eksplisit. Untuk B.4: email
opsional di Community. Verifikasi: `go test ./...` dan integration test (`TEST_DB_DSN`,
Postgres 18) lolos. Perilaku Community diuji manual dengan binary
`-X ...Edition=community`.

Edisi dipilih saat build lewat `-ldflags -X .../config.Edition=community`
(`internal/config/config.go:17`), lalu dicek saat runtime lewat `config.Community()`.
Untuk dua edisi, flag runtime ini sudah pilihan paling ringan. Build tag
(`//go:build cloud`) cuma memecah file tanpa menghapus satu baris pun, jadi
saya tidak menyarankannya.

Ada dua bagian. **A** berisi over-engineering yang bisa dipotong, diurutkan
dari potongan terbesar. **B** berisi temuan correctness dan konfigurasi.
Bagian B di luar lingkup audit over-engineering, tapi ketemu selama review
dan perlu ditindaklanjuti di pass review biasa.

---

### A. Over-engineering (ponytail-audit)

Format: `<tag> <yang dipotong>. <penggantinya>. [path]`

1. `shrink:` `Subscribe` dan `Buy` adalah alur yang sama (insert pending → checkout → hapus kalau gagal → simpan URL → baca ulang), ditambah pasangan repo yang hanya beda nama tabel (`SetSubscriptionCheckout`/`SetPurchaseCheckout`, `DeleteSubscription`/`DeletePurchase`). Ganti dengan satu helper `startCheckout(c, user, plan, prefix, insert, get)` dan satu `setCheckout(ctx, table, id, url)` / `deletePending(ctx, table, id)` dengan nama tabel literal. Sekitar −25 baris. [internal/handlers/billing.go:259-347, internal/repositories/billing.go:263-274, 374-385]
   ✅ **Fixed:** `startCheckout[T]` dan `SetCheckout`/`DeletePending`.

2. `delete:` `tokenLifetime` mem-parse ulang JWT yang baru saja dibuat proses ini sendiri, hanya untuk mendapat `iat`/`exp`. TTL access token sudah diketahui (`ExpiresIn: 15 * time.Minute`). Jadikan konstanta `accessTokenTTL`, lalu `expires_in = accessTokenTTL.Seconds()` dan `expires_at = time.Now().Add(accessTokenTTL)`. Sekitar −20 baris. Batasnya: `expires_at` bisa bergeser <1 detik dari `exp` di token. [cmd/api/authula.go:121-140, 157-160, 348]
   ✅ **Fixed:** konstanta `accessTokenTTL`, test unit disesuaikan.

3. `yagni:` Daftar migration track per edisi ditulis dua kali: `migrateUp` di cmd/api dan `tracks` di cmd/migrate. Di cmd/migrate ada juga indeks hardcode `ms[1]` dan `[]string{"main","ee"}[i]`. Ganti dengan satu sumber di `internal/lib/migrate.go`:
   ```go
   type Track struct{ Name, ForceFlag string; New func(*sql.DB) (*migrate.Migrate, error) }
   func Tracks() []Track // main, lalu ee kecuali config.Community()
   ```
   Kedua binary cukup me-range `lib.Tracks()`. Sekitar −10 baris. [cmd/api/db.go:48-56, cmd/migrate/main.go:38-52, 62-73]
   ✅ **Fixed:** `lib.Track` dan `lib.Tracks()`.

4. `delete:` Cabang dirty yang tidak pernah tercapai di `migrateTrack`. Kalau `Up` gagal karena DB sudah dirty, `m.Version()` sudah mengembalikan `dirty=true`, jadi cabang pertama yang menanganinya. Karena itu `errors.As(err, &migrate.ErrDirty)` mati. Setelah `Up` sukses, `dirty` juga selalu false. Hapus kedua blok itu. Sekitar −7 baris. [cmd/api/db.go:80-83, 91-93]
   ✅ **Fixed:** dihapus.

5. `shrink:` `MessageRecord.Append` menyalin seluruh map untuk tiap field, padahal `FieldValidator.Validate` cuma mengembalikan satu pesan. Biarkan `FieldValidator.Validate` mengembalikan `string`, lalu isi map langsung:
   ```go
   for key, fv := range v.fvs {
       if msg := fv.Validate(dict[key]); msg != "" { mr[key] = []string{msg} }
   }
   return mr, len(mr) == 0
   ```
   `Append` dan `Empty` jadi tidak terpakai. Sekitar −15 baris. [internal/lib/validator/validator.go:12-38, internal/lib/validator/message_record.go]
   ✅ **Fixed:** `message_record.go` dihapus.

6. `shrink:` `ExpireAllEnded` dan `ExpireEnded` adalah UPDATE yang sama, hanya beda filter user. Gabungkan jadi satu `ExpireEnded(ctx, userID *uuid.UUID)` dengan `WHERE ($1::uuid IS NULL OR user_id = $1) AND ...`. Sekitar −8 baris. [internal/repositories/billing.go:150-169]
   ✅ **Fixed:** `ExpireEnded(ctx, *uuid.UUID)`.

7. `delete:` Stub route sign-up khusus Community. Hook `RegisterBeforeCreate` sudah menolak setiap pembuatan user selain super user, dan itu juga menutup sign-up, magic link, dan Google. Cek dulu status code yang dikembalikan Authula saat hook menolak. Kalau UI cukup menerima itu, stub bisa dihapus. Sekitar −6 baris. [cmd/api/routes.go:46-52]
   ✅ **Fixed:** diganti `DisableSignUp: config.Community()` milik Authula. Sekarang menjawab 403 "sign up is disabled" untuk semua alamat, termasuk email super user, jadi email itu tidak bisa ditebak.

8. `shrink:` `ItemListQuery.Clamp` dan `BillingListQuery.Clamp` menyalin bolak-balik ke `ListQuery` hanya untuk memanggil `Clamp`. Ganti dengan satu `func clampPage(offset, limit int) (int, int)` di `dtos/common.go`. Sekitar −6 baris. [internal/dtos/vault.go:117-122, internal/dtos/billing.go:68-73]
   ✅ **Fixed:** `clampPage`.

9. `delete:` Panggilan `r.ExpireEnded` di dalam `HasPaidPlan`. Query di bawahnya sudah memfilter `current_period_end > now()`, seperti yang diakui komentarnya sendiri. Hasilnya, tiap share menjalankan UPDATE yang tidak mengubah jawaban. Sekitar −3 baris dan satu write per request share. [internal/repositories/billing.go:177-179]
   ✅ **Fixed:** dihapus. Integration test yang mengecek efek sapuan itu disesuaikan, dan gate tetap menolak dengan 403.

10. `shrink:` Dua blok `if !config.Community()` berturut-turut (sharing lalu billing). Gabungkan jadi satu blok. Sekitar −3 baris. [cmd/api/routes.go:103, 115]
   ✅ **Fixed:** digabung.

Yang sengaja dibiarkan karena sudah ramping atau memang dibutuhkan:
- `case config.Community():` yang kosong di switch Midtrans (`cmd/api/main.go:118`) mencegah log warning yang menyesatkan di Community.
- Track `migrations/ee` dengan tabel versi sendiri (`schema_migrations_ee`) adalah cara paling sederhana supaya DB Community tidak pernah mendapat tabel billing.
- Pengecekan Community berlapis (hook Authula, `HasOtherThan` saat boot, `seed-on-boot` wajib) masing-masing menutup jalur yang berbeda.

**net: −103 baris, −0 deps possible.** Hasil nyata: −24 baris bersih (224 tambah, 248 hapus, di luar file ini). Sebagian besar baris yang dihemat terpakai lagi untuk perbaikan B.2 dan komentarnya.

---

### B. Correctness / konfigurasi (di luar lingkup ponytail, untuk review biasa)

1. **`cmd/migrate` tidak memvalidasi `config.Edition`.** Cek `cloud|community` hanya ada di `cmd/api/flag.go:162`. Kalau ldflag salah ketik (mis. `comunity`), binary migrate menganggapnya Cloud dan menjalankan track EE, sementara API menolak boot. Perbaikan: pindahkan cek ke `internal/config` (mis. `func init()` yang panic) supaya kedua binary memakainya.
   ✅ **Fixed:** `config.init()`. Binary dengan edisi typo langsung gagal.

2. **`migrate down`/`refresh` di Community gagal pada DB yang pernah dipakai Cloud.** Community hanya me-rollback track main. `000003_add_users_role.down.sql` melakukan `DROP COLUMN role`, padahal kolom itu dirujuk oleh `users_id_role_key` dan FK `subscriptions`/`purchases` dari `migrations/ee/000001`. Down berhenti di tengah dan schema jadi dirty. Cek `HasOtherThan` di boot tidak menangkap ini kalau DB Cloud tersebut hanya berisi super user. [cmd/migrate/main.go:38-41, migrations/000003_add_users_role.down.sql]
   ✅ **Fixed:** `lib.CloudLeftover`: down/refresh di Community ikut me-rollback track EE kalau `schema_migrations_ee` ada. Binary lama terbukti gagal (`cannot drop column role`), binary baru berhasil.

3. **Gate paid plan bergantung pada `Midtrans != nil`, bukan pada edisi.** Deployment Cloud yang kehilangan `MIDTRANS_SERVER_KEY` (salah konfigurasi atau rotasi) diam-diam membuat sharing gratis untuk semua orang. Tandanya hanya satu `Warn` saat boot. Pertimbangkan gate yang fail-closed di Cloud, atau flag eksplisit. [internal/handlers/item.go:294-297, cmd/api/main.go:116-123]
   ✅ **Fixed:** gate sekarang mengikuti `REQUIRE_PAID_SHARING` (default `false`), bukan `Midtrans != nil`. Boot menolak flag ini tanpa `MIDTRANS_SERVER_KEY` dan di Community. **Deployment Cloud yang ingin gate aktif harus set `REQUIRE_PAID_SHARING=true`**.

4. **Community tetap mewajibkan `RESEND_API_KEY` dan `FROM_ADDRESS`.** Satu user self-hosted yang di-seed sudah dalam keadaan email terverifikasi, dan email hanya dipakai untuk reset password, magic link, dan ganti email. Self-hoster jadi wajib punya akun Resend supaya server bisa boot. Ini keputusan produk: buat email opsional di Community, atau dokumentasikan dengan jelas. [cmd/api/flag.go:194-201]
   ✅ **Fixed:** di Community, `FROM_ADDRESS` dan `RESEND_API_KEY` boleh kosong (tapi harus diisi berdua atau tidak sama sekali). Tanpa keduanya, plugin email tidak didaftarkan dan magic link dimatikan (404). Cloud tetap wajib. Docs, `deploy/docker-compose.yml` dan `.env.example` sudah disesuaikan.

5. **Stub sign-up Community melewati rate limiter.** Stub didaftarkan dengan `r.Post` sebelum `r.Use(authBasePath, RateLimit...)`. Dampaknya kecil karena jawabannya selalu 404. Kalau A.7 dikerjakan, masalah ini ikut hilang. [cmd/api/routes.go:48-58]
   ✅ **Fixed:** hilang bersama A.7.

6. **Tidak ada script dev untuk Community.** `Edition` hanya bisa diset lewat ldflags, jadi `pnpm dev` selalu berjalan sebagai Cloud. Usulan untuk `package.json`:
   `"dev:community": "go run -ldflags '-X montara-pass/server/internal/config.Edition=community' ./cmd/api"`.
   ✅ **Fixed:** `pnpm dev:community`.

7. **Pengecualian loopback rate limit hanya untuk `127.0.0.1`.** Akses dev lewat `::1` tetap kena limit. Ini bukan soal edisi. [internal/middlewares/rate_limit.go:26]
   ✅ **Fixed:** `::1` ditambahkan.

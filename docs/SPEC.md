# SPEC

Status: **draf, menunggu persetujuan**. Modul 1.0 (fondasi) sudah ditulis dengan usulan di bagian 10 sebagai asumsi. Modul 1.1 dan seterusnya belum.
Sumber kebutuhan: [BRIEF.md](./BRIEF.md). Keputusan arsitektur: [DECISIONS.md](./DECISIONS.md).

Nama produk belum final. Dokumen ini menyebutnya "produk". Di kode, nama, tagline, dan domain hanya ada di `src/config/brand.ts`.

Tingkat detail: Fase 1 dirinci sampai kolom, index, dan kebijakan RLS. Fase 2 sampai 4 dirinci sampai tabel dan aturan kunci, lalu difinalkan di awal fase masing-masing sebelum kodenya ditulis.

## Daftar isi

1. Ringkasan arsitektur
2. Peran dan model akses
3. Peta halaman dan route
4. Skema database
5. Kebijakan RLS
6. Alur pengguna utama
7. Desain entitlement
8. Rencana per fase
9. Strategi tes dan CI
10. Pertanyaan terbuka

---

## 1. Ringkasan arsitektur

- **Aplikasi**: satu aplikasi Next.js (App Router, TypeScript strict), Tailwind, shadcn/ui, di-deploy ke Vercel.
- **Data**: Supabase Postgres. Satu wedding adalah satu tenant. Setiap tabel data membawa `wedding_id` dan dilindungi RLS.
- **Tiga jalur akses data**:
  1. **Pengguna login** (owner, keluarga, panitia): Server Components dan Server Actions memakai sesi Supabase pengguna. RLS berlaku penuh.
  2. **Tamu dan crew** (tanpa akun): hanya lewat Route Handler di server. Server memvalidasi token, menerapkan rate limit, lalu memanggil fungsi SQL sempit dengan service role. Peran `anon` tidak punya hak atas tabel apa pun.
  3. **Sistem** (cron, webhook, admin): service role di server, dicatat di log audit.
- **Realtime**: dashboard hari H memakai Supabase Realtime (`postgres_changes`) dengan sesi owner, jadi RLS tetap berlaku. Perangkat crew tersinkron lewat endpoint delta, bukan Realtime (lihat D-007).
- **Uang**: Rupiah, `bigint`, tanpa pecahan. Tidak ada `float` atau `numeric` untuk nominal.
- **Waktu**: `timestamptz` di database. Setiap wedding punya `timezone` (`Asia/Jakarta`, `Asia/Makassar`, atau `Asia/Jayapura`) untuk tampilan dan perhitungan tenggat.
- **Teks UI**: bahasa Indonesia lewat katalog pesan (`messages/id.json`). Tidak ada string UI yang ditulis langsung di komponen.
- **Brand**: `src/config/brand.ts` adalah satu-satunya sumber nama, tagline, dan domain. Aturan lint menolak literal nama produk di luar file itu.

### Struktur direktori (rencana)

```
src/
  app/                  route (lihat bagian 3)
  config/brand.ts       nama, tagline, domain
  components/           UI bersama (shadcn di components/ui)
  features/<modul>/     komponen, actions, queries, schema zod per modul
  lib/
    supabase/           klien server, browser, service role
    entitlements.ts     satu-satunya pengecekan entitlement di kode aplikasi
    money.ts            format dan aritmetika Rupiah integer
    dates.ts            zona waktu dan tenggat
    rate-limit.ts
    tokens.ts           pembuatan dan hash token
    ai/                 lapisan provider (Fase 2)
    payments/           lapisan gateway (Fase 3)
  invitation/templates/ template undangan (React)
  templates/            template rencana (checklist, rundown, anggaran)
messages/id.json
supabase/
  migrations/
  seed.sql
  tests/                tes RLS (pgTAP)
docs/
```

---

## 2. Peran dan model akses

| Peran | Identitas | Cakupan |
|---|---|---|
| Owner | Akun Supabase Auth, `wedding_members.role = 'owner'` | Semua modul, pengaturan, anggota, hapus data. Maksimal dua owner per wedding. |
| Keluarga atau panitia | Akun Supabase Auth, `role = 'collaborator'` | Per modul: `none`, `view`, atau `edit`. Bisa menjadi penanggung jawab tugas. |
| Crew hari H | Tanpa akun. Link crew + PIN, lalu sesi perangkat | Hanya mode check-in. Berakhir pada tanggal acara terakhir + 1 hari. Bisa dicabut. |
| Tamu | Tanpa akun. `invite_token` di link | Undangan miliknya, RSVP, ucapan. |
| Wedding organizer (Fase 4) | Akun + organisasi | Banyak wedding klien. |
| Admin internal | Akun di `platform_admins` | Template, paket, pengguna, transaksi, audit. |

Kunci modul untuk izin: `planning`, `budget`, `vendors`, `guests`, `invitation`, `event_day`, lalu `registry`, `seserahan`, `moodboard`, `album` di fase berikutnya. Pengaturan wedding dan anggota selalu khusus owner.

Token:

- `invite_token` tamu: 128 bit acak, base62. Disimpan apa adanya karena owner perlu menampilkan ulang link untuk dibagikan. Bisa diganti per tamu (link lama mati).
- `qr_token` tamu: token terpisah dari `invite_token`. Crew yang memindai QR tidak bisa membuka atau mengubah RSVP tamu.
- Token link crew, token sesi perangkat crew, token undangan anggota: hanya hash (SHA-256) yang disimpan.
- PIN crew: 6 digit, disimpan sebagai hash dengan salt. Lima kali salah mengunci link selama 15 menit.

---

## 3. Peta halaman dan route

Slug URL berbahasa Indonesia dan tetap (tidak diterjemahkan saat i18n). Kolom "Fase" menunjukkan kapan route pertama kali ada.

### Publik

| Route | Isi | Fase |
|---|---|---|
| `/` | Halaman depan | 1 |
| `/harga` | Paket dan harga | 3 |
| `/privasi`, `/syarat` | Kebijakan privasi, syarat layanan | 1 |
| `/status` | Status sistem | 2 |

### Auth

| Route | Isi | Fase |
|---|---|---|
| `/masuk`, `/daftar`, `/lupa-sandi` | Email + sandi, Google | 1 |
| `/auth/callback` | Callback OAuth dan konfirmasi email | 1 |
| `/gabung/[token]` | Terima undangan sebagai pasangan atau panitia | 1 |

### Aplikasi (wajib login)

Awalan: `/app/w/[weddingId]`.

| Route | Isi | Fase |
|---|---|---|
| `/app` | Daftar wedding, atau langsung ke wedding jika hanya satu | 1 |
| `/app/baru` | Wizard onboarding | 1 |
| `…/dasbor` | Hitung mundur, progres, sisa anggaran, jatuh tempo, RSVP, fokus minggu ini | 1 |
| `…/checklist` | Checklist per tahap | 1 |
| `…/rundown` | Rundown hari H | 1 (PDF: 2) |
| `…/anggaran` | Kategori, estimasi vs realisasi | 1 |
| `…/anggaran/pembayaran` | Jadwal pembayaran vendor | 1 |
| `…/anggaran/pihak`, `/simulasi`, `/arus-kas`, `/tabungan`, `/amplop-kado`, `/laporan` | Keuangan lanjutan | 2 |
| `…/vendor`, `…/vendor/[vendorId]`, `…/vendor/bandingkan` | Vendor | 1 |
| `…/tamu`, `…/tamu/impor`, `…/tamu/grup` | Tamu | 1 |
| `…/acara` | Sesi acara (akad, resepsi, dst.) | 1 |
| `…/undangan` | Pilih template, isi konten, atur bagian | 1 (editor blok penuh: 3) |
| `…/undangan/pratinjau` | Pratinjau draf | 1 |
| `…/undangan/kirim` | Daftar tamu + tombol wa.me per tamu | 1 |
| `…/hari-h` | Dashboard realtime | 1 |
| `…/hari-h/crew` | Kelola link crew, PIN, perangkat | 1 |
| `…/hari-h/kesiapan` | Checklist kesiapan H-1, unduh PDF daftar tamu | 2 |
| `…/kado` | Wishlist dan klaim | 2 |
| `…/seserahan`, `…/seragam`, `…/moodboard`, `…/album`, `…/terima-kasih` | | 3 |
| `…/asisten` | Panel asisten AI (juga tersedia sebagai panel samping) | 3 |
| `…/pengaturan` | Data wedding, anggota dan izin, paket, ekspor, arsip, hapus | 1 |

### Tamu (tanpa login)

| Route | Isi | Fase |
|---|---|---|
| `/u/[slug]` | Undangan. `?to=[invite_token]` menampilkan nama tamu, sesi miliknya, RSVP, dan QR setelah RSVP hadir | 1 |
| `/u/[slug]/kado` | Wishlist kado | 2 |
| `/u/[slug]/album` | Unggah foto dari venue | 3 |

Header `Referrer-Policy: no-referrer` dan `X-Robots-Tag: noindex` pada semua route `/u/`.

### Crew (link + PIN)

| Route | Isi | Fase |
|---|---|---|
| `/crew/[token]` | Masukkan PIN, beri nama perangkat | 1 |
| `/crew/[token]/scan` | Scan QR | 1 |
| `/crew/[token]/cari` | Cari nama manual | 1 |
| `/crew/[token]/tamu-baru` | Tamu dadakan | 1 |
| `/crew/[token]/gladi` | Mode gladi | 1 |
| `/crew/[token]/panduan` | Panduan bergambar | 2 |
| `/layar/[token]` | Layar sapa venue | 4 |

### Admin internal

`/admin/*`: template, paket, pengguna, transaksi, audit. Fase 4. Di Fase 1 sampai 3, pekerjaan admin dilakukan lewat SQL atau seed.

### API (Route Handler)

| Route | Fungsi | Fase |
|---|---|---|
| `POST /api/public/rsvp` | Kirim atau ubah RSVP + ucapan | 1 |
| `POST /api/public/opened` | Tandai undangan dibuka | 1 |
| `POST /api/crew/session` | Tukar PIN dengan sesi perangkat | 1 |
| `GET /api/crew/guests?since=` | Unduh daftar tamu, lalu delta | 1 |
| `POST /api/crew/checkins` | Kirim antrean check-in (batch, idempoten) | 1 |
| `GET /api/cron/reminders` | Pengingat harian (Vercel Cron, `CRON_SECRET`) | 2 |
| `POST /api/public/registry/claim` | Klaim wishlist | 2 |
| `POST /api/ai/*` | Scan nota, asisten | 2, 3 |
| `POST /api/public/album` | Unggah foto tamu | 3 |
| `POST /api/webhooks/payment` | Webhook gateway | 3 |
| `GET /api/health` | Cek kesehatan | 1 |

Semua endpoint `/api/public/*` dan `/api/crew/*` kena rate limit per IP dan per token.

---

## 4. Skema database

Konvensi:

- Kunci utama `id uuid default gen_random_uuid()`.
- `created_at`, `updated_at` `timestamptz` di semua tabel data. `updated_at` diisi trigger.
- Semua tabel data punya `wedding_id uuid not null references weddings on delete cascade`, dan index yang diawali `wedding_id`.
- Nilai terbatas memakai `text` + `check`, bukan enum Postgres, supaya mudah ditambah lewat migrasi.
- Nominal: `bigint` dengan `check (>= 0)`.
- Nama tabel dan kolom berbahasa Inggris. Teks yang tampil ke pengguna berbahasa Indonesia.
- Skema `private` berisi fungsi bantu RLS dan tabel internal. Skema ini tidak diekspos PostgREST.

### 4.1 Fase 1

#### Akun dan wedding

**profiles**
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | = `auth.users.id`, cascade |
| full_name | text | |
| avatar_url | text | |
| locale | text | default `'id'` |

Dibuat oleh trigger saat pengguna mendaftar.

**platform_admins**: `user_id uuid PK`. Tanpa kebijakan RLS untuk klien. Hanya dibaca lewat fungsi `private.is_platform_admin()`.

**weddings**
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| display_name | text | contoh "Rina & Dimas" |
| partner_a_name, partner_b_name | text | |
| date_start | date null | tanggal acara, atau awal rentang |
| date_end | date null | akhir rentang bila belum pasti |
| date_is_final | boolean | |
| city | text | |
| timezone | text | check: tiga zona Indonesia, default `Asia/Jakarta` |
| customs | text[] | 1 atau 2 kunci adat |
| guest_estimate | int | |
| total_budget | bigint | |
| guest_quota_groom, guest_quota_bride | int null | kuota tamu per pihak |
| plan | text | default `'free'` |
| limits | jsonb | snapshot limit efektif (lihat bagian 7) |
| status | text | `active`, `archived` |
| archived_at | timestamptz null | |
| created_by | uuid | |

**wedding_members**
| Kolom | Tipe | Catatan |
|---|---|---|
| wedding_id, user_id | uuid | unique bersama |
| role | text | `owner`, `collaborator` |
| permissions | jsonb | `{ "budget": "view", "guests": "edit", … }`. Diabaikan untuk owner |
| display_name | text | nama di wedding ini |

Trigger: maksimal dua baris `owner` per wedding. Owner terakhir tidak bisa dihapus. Index: `(user_id)`.

**wedding_invites**: `wedding_id`, `email citext`, `role`, `permissions jsonb`, `token_hash text unique`, `invited_by`, `expires_at`, `accepted_at`, `revoked_at`. Unique parsial `(wedding_id, email)` untuk undangan yang masih aktif.

**event_sessions**
| Kolom | Tipe | Catatan |
|---|---|---|
| kind | text | `akad`, `pemberkatan`, `resepsi`, `adat`, `lainnya` |
| name | text | |
| starts_at, ends_at | timestamptz | |
| venue_name, venue_address, maps_url | text | |
| sort_order | int | |

Jumlah sesi dibatasi entitlement `sessions.max` lewat trigger.

#### Perencanaan

**checklist_items**
| Kolom | Tipe | Catatan |
|---|---|---|
| stage | text | `m12`, `m9`, `m6`, `m3`, `m1`, `d7`, `d1`, `d0` |
| kind | text | `general`, `admin_docs`, `adat` |
| title, description, notes | text | |
| status | text | `todo`, `in_progress`, `done`, `skipped` |
| due_date | date null | |
| assignee_member_id | uuid null | → wedding_members |
| source | text | `template`, `manual`, `ai` |
| template_key | text null | asal item, untuk susun ulang saat tanggal berubah |
| needs_review | boolean | benar untuk isi adat dan administrasi yang belum direviu |
| sort_order | int | |

Index: `(wedding_id, stage, sort_order)`, `(wedding_id, due_date) where status <> 'done'`, `(assignee_member_id)`.

**rundown_items**: `event_session_id null`, `title`, `starts_at timestamptz`, `duration_min int`, `pic_text`, `pic_member_id null`, `location`, `notes`, `sort_order`. Index `(wedding_id, starts_at)`.

**attachments** (lampiran generik): `entity_type text`, `entity_id uuid`, `bucket`, `path`, `file_name`, `mime_type`, `size_bytes`, `uploaded_by`. Index `(wedding_id, entity_type, entity_id)`. Modul pemilik ditentukan dari `entity_type` untuk pengecekan izin.

#### Anggaran dan vendor

**budget_categories**: `name`, `template_key null`, `sort_order`.

**budget_items**
| Kolom | Tipe | Catatan |
|---|---|---|
| category_id | uuid | |
| vendor_id | uuid null | |
| name | text | |
| pricing_mode | text | `fixed`, `per_pax` |
| estimated_amount | bigint | untuk `fixed` |
| unit_price | bigint null | untuk `per_pax` |
| pax_basis | text null | `guest_estimate`, `rsvp`, `manual` (dipakai simulasi Fase 2) |
| pax_manual | int null | |
| notes | text | |

Di Fase 1, item `per_pax` dihitung dari `guest_estimate`. Simulasi dan basis RSVP datang di Fase 2 tanpa perubahan skema.

**vendors**
| Kolom | Tipe | Catatan |
|---|---|---|
| category_id | uuid | → budget_categories |
| name, contact_name, phone, email, instagram, website | text | |
| status | text | `survey`, `negotiation`, `dp`, `paid`, `cancelled` |
| notes | text | |
| rating | smallint null | 1 sampai 5, pribadi |

**vendor_offers** (penawaran, untuk perbandingan berdampingan): `vendor_id`, `package_name`, `price bigint`, `inclusions text`, `notes`, `is_selected boolean`.

**payments** (jadwal dan realisasi pembayaran)
| Kolom | Tipe | Catatan |
|---|---|---|
| budget_item_id | uuid | |
| vendor_id | uuid null | |
| label | text | |
| kind | text | `dp`, `termin`, `pelunasan`, `lainnya` |
| amount | bigint | > 0 |
| due_date | date null | |
| status | text | `scheduled`, `paid`, `cancelled` |
| paid_at | date null | wajib jika `paid` |
| method, notes | text | |

Index: `(wedding_id, status, due_date)`, `(budget_item_id)`, `(vendor_id)`.

Rumus (diuji unit):

- Estimasi kategori = jumlah estimasi item. Item `per_pax` = `unit_price × pax`.
- Realisasi = jumlah `payments` berstatus `paid`.
- Terikat = jumlah `payments` berstatus `scheduled` + `paid`.
- Persentase terpakai = realisasi ÷ estimasi, dibulatkan ke bawah. Estimasi nol ditangani eksplisit.
- Over budget bila terikat > estimasi (per item, kategori, dan total terhadap `total_budget`).

#### Tamu

**guest_groups**: `name`. Unique `(wedding_id, name)`.

**guests**
| Kolom | Tipe | Catatan |
|---|---|---|
| name | text | |
| name_normalized | text | huruf kecil, spasi dirapikan. Diisi trigger |
| phone | text null | opsional (minimisasi data) |
| phone_normalized | text null | format `+62…`. Diisi trigger |
| group_id | uuid null | |
| category | text | `vip`, `family`, `regular` |
| side | text | `groom`, `bride`, `both` |
| pax_quota | int | ≥ 1, default 1 |
| notes | text | catatan VIP, tampil di mode crew |
| invite_token | text unique | |
| qr_token | text unique | |
| source | text | `manual`, `import`, `walk_in` |
| sent_at, opened_at | timestamptz null | |

Index: `(wedding_id, name_normalized, phone_normalized)` untuk deteksi duplikat, `(wedding_id, group_id)`, `(wedding_id, side)`, dan index trigram pada `name_normalized` untuk pencarian.

Trigger sebelum insert: mengunci baris wedding, lalu menolak bila jumlah tamu melewati `guests.max`. Tamu `walk_in` dikecualikan supaya hari H tidak terhambat.

Status tamu tidak disimpan sebagai kolom. View `guest_status` menurunkannya dari `sent_at`, `opened_at`, `rsvps`, dan `checkins`, dengan urutan prioritas: check-in, RSVP hadir, RSVP tidak hadir, dibuka, dikirim, belum dikirim. "Dikirim" berarti owner menekan tombol wa.me. Platform tidak bisa memastikan pesan benar-benar terkirim, dan UI menyatakannya begitu.

**guest_sessions**: `guest_id`, `event_session_id`, `wedding_id`. PK `(guest_id, event_session_id)`.

**rsvps**
| Kolom | Tipe | Catatan |
|---|---|---|
| guest_id, event_session_id | uuid | unique bersama |
| status | text | `attending`, `declined` |
| pax_count | int | 0 jika `declined`. ≤ `guests.pax_quota` |
| responded_at | timestamptz | |

RSVP dicatat per sesi (lihat pertanyaan 5). Hanya ditulis lewat fungsi `private.submit_rsvp(invite_token, …)`, yang memeriksa token, sesi yang diundang, kuota pax, dan batas waktu RSVP dalam satu transaksi.

**guest_messages** (ucapan dan doa): `guest_id`, `display_name`, `message` (maks 500 karakter), `is_hidden boolean`.

#### Undangan

**invitations**
| Kolom | Tipe | Catatan |
|---|---|---|
| wedding_id | uuid unique | satu undangan per wedding |
| slug | citext unique | 3 sampai 40 karakter, huruf kecil, angka, tanda hubung. Ada daftar slug terlarang |
| template_key | text | template didefinisikan di kode |
| status | text | `draft`, `published` |
| theme | jsonb | warna, font |
| sections | jsonb | daftar berurutan `{ id, type, visible, data }` |
| rsvp_deadline | timestamptz null | |
| wa_message_template | text | placeholder `{nama}`, `{link}` |
| published_at | timestamptz null | |

`sections` sudah berbentuk daftar blok sejak Fase 1. Di Fase 1 pengguna mengatur visibilitas dan isi lewat formulir. Editor seret-lepas dan pengurutan bebas datang di Fase 3 tanpa migrasi. Bentuk `data` tiap jenis bagian divalidasi dengan skema zod di server.

Watermark ditentukan saat render dari entitlement, bukan disimpan.

Gambar undangan (galeri, foto mempelai, gambar QRIS) disimpan di bucket publik `invitation-media` dengan path acak. Dokumen pribadi disimpan di bucket privat `wedding-files`.

#### Hari H

**crew_access**
| Kolom | Tipe | Catatan |
|---|---|---|
| label | text | contoh "Meja depan" |
| token_hash | text unique | |
| pin_hash | text | |
| expires_at | timestamptz | akhir tanggal acara terakhir + 1 hari, zona wedding |
| revoked_at | timestamptz null | |
| failed_attempts | int | |
| locked_until | timestamptz null | |

**crew_devices**: `crew_access_id`, `device_name`, `session_token_hash unique`, `last_seen_at`, `revoked_at`.

**checkins**
| Kolom | Tipe | Catatan |
|---|---|---|
| guest_id, event_session_id | uuid | |
| pax_actual | int | ≥ 1 |
| method | text | `qr`, `manual`, `walk_in` |
| checked_in_at | timestamptz | waktu di perangkat |
| received_at | timestamptz | waktu server |
| crew_device_id | uuid null | |
| member_id | uuid null | bila dilakukan anggota yang login |
| client_op_id | uuid unique | idempotensi antrean offline |
| voided_at, voided_by | | pembatalan oleh owner |

Unique parsial `(guest_id, event_session_id) where voided_at is null`: inilah pencegah check-in ganda. Fungsi `private.crew_check_in(…)` melakukan insert. Jika bentrok, fungsi mengembalikan check-in yang sudah ada (waktu dan nama perangkat) agar layar crew bisa menampilkan "sudah check-in pukul …".

`pax_actual` yang melebihi `pax_quota` tidak ditolak. Crew mendapat peringatan dan harus mengonfirmasi, lalu selisihnya tampil di dashboard.

**gifts** (amplop dan kado)
| Kolom | Tipe | Catatan |
|---|---|---|
| guest_id | uuid null | |
| checkin_id | uuid null | |
| kind | text | `envelope_cash`, `envelope_digital`, `gift_item` |
| amount | bigint null | boleh diisi belakangan |
| label | text | nomor atau tanda di amplop |
| description | text | untuk kado barang |
| source | text | `checkin`, `manual`, `registry` |
| client_op_id | uuid unique null | |

Tabel dibuat di Fase 1 agar crew bisa mencatat "amplop diterima" saat check-in. Pengisian nominal, pencatatan manual, dan rekap datang di Fase 2.

#### Sistem

- **audit_logs**: `wedding_id null`, `actor_type` (`user`, `crew`, `guest`, `system`, `admin`), `actor_id`, `action`, `entity_type`, `entity_id`, `meta jsonb`, `created_at`. Hanya bisa ditambah.
- **private.rate_limits**: `key`, `window_start`, `count`. Diakses lewat fungsi `private.hit_rate_limit(key, limit, window)`.

### 4.2 Fase 2 (garis besar)

| Tabel | Isi dan aturan kunci |
|---|---|
| parties | Pihak penanggung biaya: keluarga pria, keluarga wanita, pasangan, dan pihak lain bila perlu |
| budget_item_shares | `budget_item_id`, `party_id`, `share_bp` (basis poin). Total per item = 10.000. "Patungan" adalah pembagian ke beberapa pihak, bukan pihak tersendiri |
| payments.paid_by_party_id | Kolom baru. Saldo pihak = tanggungan − yang sudah dibayar |
| contributions | Kontribusi dana dari pihak atau keluarga (pemasukan) |
| savings_goals, savings_deposits | Tabungan nikah. Setoran bulanan yang dibutuhkan = sisa target ÷ sisa bulan, dibulatkan ke atas |
| receipt_scans | Berkas, hasil ekstraksi AI (jsonb), status `pending`, `confirmed`, `discarded`, tautan ke `payments` setelah dikonfirmasi |
| registry_items | `kind` (`whole`, `group`, `fund`), `target_amount`, `image_path`, `shop_url`, `priority`, `claim_ttl_hours` |
| registry_claims | `item_id`, `guest_id null`, `name`, `is_anonymous`, `amount`, `status` (`claimed`, `awaiting_confirmation`, `confirmed`, `cancelled`, `expired`), `expires_at` |
| content_templates | Template adat dan administrasi: `kind`, `custom`, `version`, `body jsonb`, `review_status` (`draft`, `reviewed`), `reviewed_by`, `reviewed_at` |
| ai_usage | `wedding_id`, `feature`, `model`, `input_tokens`, `output_tokens`, `created_at` |
| notifications | Antrean pengingat email dengan `dedupe_key unique` |

Aturan klaim wishlist: `private.claim_registry_item(…)` mengunci baris item (`select … for update`), menghitung jumlah klaim aktif, lalu menolak bila barang utuh sudah diklaim atau total melewati target. Klaim kedaluwarsa dilepas oleh cron dan juga diabaikan saat menghitung, jadi kuota kembali tanpa menunggu cron. Klaim yang dikonfirmasi membuat baris `gifts` dengan `source = 'registry'`.

Simulasi jumlah tamu dan arus kas adalah perhitungan atas `budget_items` dan `payments`. Keduanya tidak butuh tabel baru. Skenario simulasi yang ingin disimpan masuk ke `guest_simulations` (opsional).

Laporan biaya bersih = total pengeluaran − (amplop + kado bernominal + kontribusi), dengan rincian per pihak.

### 4.3 Fase 3 (garis besar)

`moodboards`, `moodboard_images` (tag, catatan, palet hasil ekstraksi), `seserahan_items` (tautan ke `budget_items`), `uniform_people`, `album_photos` (status moderasi, persetujuan pengunggah), `thank_you_messages`, `ai_threads`, `ai_actions` (usulan perubahan data yang menunggu konfirmasi pengguna), `orders`, `payment_events` (webhook idempoten), `addons`.

### 4.4 Fase 4 (garis besar)

`organizations`, `organization_members`, `weddings.organization_id`, `referral_codes`, `referral_credits`, `greeting_screens`, serta tabel registri template undangan untuk admin.

---

## 5. Kebijakan RLS

Prinsip:

- RLS aktif di **semua** tabel di skema `public`. Tabel tanpa kebijakan berarti tertutup untuk klien.
- Peran `anon` tidak punya `grant` atas tabel apa pun. Tamu dan crew tidak pernah menyentuh database secara langsung.
- Semua kebijakan memakai dua fungsi `security definer` di skema `private`, dengan `search_path` dikunci:
  - `private.is_owner(wedding_id)`
  - `private.has_access(wedding_id, module, level)`, dengan `level` `view` atau `edit`. Owner selalu lolos. Kolaborator lolos bila `permissions[module]` memadai.
- Wedding berstatus `archived` menolak semua tulis, kecuali membatalkan arsip dan menghapus wedding.

| Tabel | select | insert, update, delete |
|---|---|---|
| profiles | diri sendiri, dan sesama anggota wedding yang sama | diri sendiri |
| weddings | anggota | insert: pengguna login (menjadi owner lewat fungsi `create_wedding`). update, delete: owner. Kolom `plan` dan `limits` tidak bisa diubah klien (dijaga trigger) |
| wedding_members | anggota wedding yang sama | owner |
| wedding_invites | owner | owner |
| event_sessions | anggota | `has_access('guests', 'edit')` atau owner |
| checklist_items, rundown_items | `planning` view | `planning` edit. Penanggung jawab boleh mengubah `status` dan `notes` pada tugasnya sendiri walau hanya punya izin view |
| budget_categories, budget_items, payments | `budget` view | `budget` edit |
| vendors, vendor_offers | `vendors` view | `vendors` edit |
| guest_groups, guests, guest_sessions | `guests` view | `guests` edit |
| rsvps, guest_messages | `guests` view | update `is_hidden`: `invitation` edit. Selain itu hanya lewat fungsi server |
| invitations | `invitation` view | `invitation` edit |
| crew_access, crew_devices | `event_day` view | `event_day` edit |
| checkins | `event_day` view | insert oleh anggota: `event_day` edit. Batal (void): owner |
| gifts | `budget` view | `budget` edit. Insert dari crew lewat fungsi server |
| attachments | izin view modul pemilik | izin edit modul pemilik |
| audit_logs | owner | tidak ada (hanya server) |
| platform_admins | tidak ada | tidak ada |

Storage:

- `wedding-files` (privat): path `{wedding_id}/{modul}/…`. Kebijakan memeriksa `has_access` dari segmen path.
- `invitation-media` (publik baca): tulis hanya `invitation` edit pada awalan `{wedding_id}/`.

Tes RLS otomatis (pgTAP) untuk setiap tabel: pengguna luar tidak bisa membaca atau menulis, kolaborator tanpa izin modul ditolak, kolaborator `view` tidak bisa menulis, owner bisa, dan `anon` selalu ditolak.

---

## 6. Alur pengguna utama

### 6.1 Daftar sampai dashboard

1. Daftar dengan email atau Google.
2. Wizard `/app/baru`: nama mempelai, tanggal atau rentang, kota (menentukan zona waktu awal), adat (maksimal dua), estimasi tamu, total anggaran.
3. `create_wedding` dalam satu transaksi: baris wedding, owner, sesi acara awal, checklist, rundown awal, dan alokasi anggaran dari template.
4. Tenggat checklist dihitung mundur dari tanggal acara. Jika tanggal berupa rentang, dipakai awal rentang dan ditandai "perkiraan".
5. Masuk ke dashboard.

Di Fase 1 generator ini berbasis aturan dan hanya memakai template umum. Template adat (Fase 2) dan penyesuaian AI (Fase 3) memakai titik masuk yang sama.

### 6.2 Mengundang pasangan dan panitia

Owner memasukkan email, peran, dan izin per modul. Sistem mengirim link `/gabung/[token]` yang berlaku 7 hari. Penerima login atau mendaftar, lalu menjadi anggota. Email akun harus sama dengan email yang diundang.

### 6.3 Anggaran, vendor, pembayaran

Owner meninjau alokasi per kategori, menambah vendor beserta penawaran, membandingkan penawaran, lalu memilih. Pilihan itu mengisi `budget_items.vendor_id` dan menawarkan pembuatan jadwal pembayaran (DP, termin, pelunasan). Saat pembayaran ditandai lunas, realisasi dan dashboard ikut berubah.

### 6.4 Tamu sampai RSVP

1. Impor CSV atau Excel: unggah, petakan kolom, validasi per baris, tandai duplikat (nama + nomor HP yang sudah dinormalkan), lalu pengguna memilih lewati atau tetap impor. File diproses di browser, lalu baris yang lolos dikirim ke server dan divalidasi ulang.
2. Atur grup, sesi, kategori, pihak, kuota pax.
3. Isi undangan, pratinjau, publikasi.
4. Halaman kirim: tombol wa.me per tamu dengan pesan dari template. Menekan tombol mengisi `sent_at`.
5. Tamu membuka `/u/[slug]?to=…`: melihat namanya dan sesi miliknya saja. `opened_at` terisi.
6. Tamu mengisi RSVP per sesi dan ucapan. Server memeriksa kuota pax dan batas waktu.
7. Setelah RSVP hadir, QR tampil di undangan.

Tanpa `?to=`, undangan tampil dalam versi umum tanpa RSVP dan tanpa QR.

### 6.5 Hari H

1. Owner membuat link crew + PIN, lalu membagikannya ke panitia.
2. Crew membuka link, memasukkan PIN, memberi nama perangkat, dan memilih sesi. Aplikasi mengunduh daftar tamu ke IndexedDB.
3. Scan QR: pencarian lokal lebih dulu, hasil tampil seketika (nama, grup, sesi, kuota pax, catatan VIP). Crew mengisi jumlah hadir dan tanda amplop atau kado, lalu konfirmasi.
4. Check-in masuk antrean lokal dengan `client_op_id`, lalu dikirim saat online. Server memakai aturan "yang pertama diterima menang". Kiriman kedua untuk tamu dan sesi yang sama mengembalikan data check-in pertama, dan perangkat menandainya sebagai duplikat.
5. Setiap beberapa detik perangkat menarik delta dari server. Perangkat lain ikut tahu tamu yang sudah check-in.
6. Dashboard owner berubah secara realtime: RSVP vs hadir, per sesi, grup, dan pihak.

Mode gladi berjalan sepenuhnya di perangkat dengan QR contoh. Tidak ada data yang dikirim ke server.

---

## 7. Desain entitlement

Tujuan: satu tempat untuk memutuskan "boleh atau tidak" dan "berapa batasnya".

**Penyimpanan**

- Tabel `plans`: `key`, `name`, `price_idr`, `limits jsonb`, `is_active`. Ini katalog.
- `weddings.plan` dan `weddings.limits`: snapshot limit efektif milik wedding itu. Saat paket dibeli atau add-on ditambah, server menghitung ulang dan menulis `limits`. Perubahan katalog di kemudian hari tidak mengubah wedding yang sudah membeli.
- Klien tidak bisa menulis kedua kolom itu.

**Kunci**

| Kunci | Tipe | Arti |
|---|---|---|
| `guests.max` | angka | Jumlah tamu maksimal |
| `sessions.max` | angka | Jumlah sesi acara |
| `members.max` | angka | Jumlah kolaborator |
| `invitation.watermark` | boolean | Watermark tampil |
| `invitation.premium_templates` | boolean | |
| `checkin.enabled` | boolean | QR check-in dan mode crew |
| `finance.advanced` | boolean | Pembagian pihak, simulasi, arus kas, laporan |
| `album.enabled` | boolean | |
| `ai.monthly_tokens` | angka | Kuota token AI per bulan |

**Pengecekan**

- Kode aplikasi: hanya `src/lib/entitlements.ts`, dengan `can(wedding, key)`, `limit(wedding, key)`, dan `assertCan(…)` yang melempar galat bertipe untuk ditampilkan sebagai ajakan upgrade.
- Database: hanya `private.wedding_limit(wedding_id, key)`, dipakai trigger untuk batas yang tidak boleh bisa dilewati lewat API langsung (`guests.max`, `sessions.max`, `members.max`).
- Keduanya membaca kolom yang sama. Tes memastikan hasilnya sama untuk semua kunci.
- Aturan lint melarang membaca `wedding.plan` atau `wedding.limits` di luar `entitlements.ts`.

Sebelum billing ada (Fase 1 dan 2), paket diubah oleh admin lewat SQL. Lihat pertanyaan 3 dan 4.

---

## 8. Rencana per fase

Setiap modul diselesaikan berurutan: migrasi, seed, tes, lalu lint, typecheck, test, dan build. Satu commit per modul, lalu laporan singkat.

### Fase 1 (MVP)

| # | Modul | Isi |
|---|---|---|
| 1.0 | Fondasi | Scaffold Next.js, Tailwind, shadcn, Supabase lokal, CI, Sentry, katalog pesan, aturan lint brand, `.env.example`, util uang, tanggal, token |
| 1.1 | Auth dan wedding bersama | Email + Google, profil, wedding, anggota, undangan anggota, fungsi RLS, `plans`, entitlement |
| 1.2 | Onboarding dan dashboard | Wizard, generator dari template umum, dashboard |
| 1.3 | Checklist dan rundown | CRUD, tahap, penanggung jawab, lampiran, berkas administrasi sebagai draf |
| 1.4 | Anggaran dan pembayaran | Kategori, item, pembayaran bertahap, peringatan over budget |
| 1.5 | Vendor | Daftar, penawaran, perbandingan, dokumen, tautan ke anggaran |
| 1.6 | Tamu | CRUD, grup, sesi, kuota per pihak, impor CSV dan Excel |
| 1.7 | Undangan dan RSVP | 5 template, formulir isi, link personal, RSVP, ucapan, wa.me, pratinjau, watermark, PWA |
| 1.8 | Hari H | QR, mode crew PWA, antrean lokal, sinkron multi-perangkat, tamu dadakan, mode gladi, dashboard realtime |
| 1.9 | Pengerasan | Rate limit, audit, ekspor dan hapus data, Lighthouse undangan ≥ 85, uji aksesibilitas dasar |

### Fase 2 (pembeda)

Wishlist kado, template adat (draf, alur reviu), pembagian biaya per pihak, simulasi jumlah tamu, arus kas, tabungan nikah, rekap amplop dan kado, laporan biaya bersih (Excel dan PDF), scan nota AI, pengingat email, PDF rundown dan daftar tamu, panduan crew, checklist kesiapan H-1, halaman status.

### Fase 3 (lengkap)

Moodboard dan palet ke tema, seserahan dan seragam, editor undangan berbasis blok, asisten AI, album bersama, ucapan terima kasih, laporan akhir PDF, billing dan paywall, arsip read-only.

### Fase 4 (skala)

Paket wedding organizer, referral, admin internal lengkap, layar sapa, mode offline penuh (precache, background sync, UI resolusi konflik).

### Hal yang butuh dari pemilik produk sebelum Fase 1 berjalan

- Proyek Supabase dan Vercel (lihat pertanyaan 6).
- Kredensial Google OAuth.
- DSN Sentry.
- Akun pengirim email (lihat pertanyaan 7).

---

## 9. Strategi tes dan CI

| Jenis | Alat | Cakupan |
|---|---|---|
| Unit | Vitest | Uang, tanggal dan zona waktu, perhitungan anggaran, entitlement, normalisasi nama dan HP, deteksi duplikat, pemetaan impor, penyelesaian konflik antrean check-in |
| Database | pgTAP lewat `supabase test db` | RLS setiap tabel, kuota pax, check-in ganda, batas tamu, batas dua owner, kunci klaim wishlist (Fase 2) |
| Integrasi | Vitest + Supabase lokal | Route Handler publik dan crew, termasuk rate limit dan token dicabut |
| E2E | Playwright | Tiga alur asap: onboarding, RSVP tamu, check-in crew |
| Performa | Lighthouse CI | Halaman undangan, mobile, ≥ 85 |

CI GitHub Actions pada setiap push dan PR: lint, typecheck, tes unit, tes database (Supabase lokal di runner), build. E2E dan Lighthouse berjalan pada PR ke `main`.

---

## 10. Pertanyaan terbuka

Setiap pertanyaan punya usulan. Jika disetujui tanpa catatan, usulan itulah yang dipakai.

1. **Fitur yang tidak disebut di tahapan rilis.** Rundown, tugas panitia, berkas administrasi, pengingat email, tabungan nikah, kuota tamu per pihak, dan ekspor PDF tidak tercantum di fase mana pun. Usulan: rundown dasar, tugas panitia, berkas administrasi, dan kuota per pihak di Fase 1. Pengingat email, tabungan nikah, dan ekspor PDF di Fase 2.
2. **Onboarding di Fase 1.** Brief meminta hasil wizard dari "template adat + penyesuaian AI", padahal template adat ada di Fase 2 dan AI di Fase 2 dan 3. Usulan: Fase 1 memakai template umum dan generator berbasis aturan. Pilihan adat tetap disimpan dan dipakai saat template adat rilis.
3. **Paywall sebelum billing ada.** QR check-in adalah fitur berbayar, tetapi billing baru ada di Fase 3. Usulan: gerbang entitlement dibangun sejak Fase 1, dan semua wedding selama Fase 1 dan 2 diberi paket `beta` yang membuka semuanya.
4. **Angka limit dan harga.** Berapa batas tamu paket gratis dan berbayar, jumlah sesi, dan harga? Usulan sementara, hanya sebagai placeholder di seed: gratis 100 tamu dan 2 sesi, berbayar 500 tamu dan 4 sesi, harga belum diisi.
5. **RSVP per sesi atau per tamu.** Tamu yang diundang ke akad dan resepsi bisa saja hanya hadir di salah satunya. Usulan: RSVP per sesi. Tamu dengan satu sesi melihat satu formulir sederhana. Estimasi katering per sesi jadi lebih akurat.
6. **Proyek Supabase dan Vercel.** Apakah sudah ada, atau saya buat lewat integrasi yang tersedia di sesi ini? Usulan: saya buat proyek Supabase baru di region Singapura setelah Anda setuju, dan pengembangan sehari-hari memakai Supabase lokal. Pembuatan proyek bisa menimbulkan biaya, jadi saya tidak akan melakukannya tanpa izin.
7. **Pengirim email.** Undangan anggota dan pengingat butuh layanan email. Usulan: Resend di balik lapisan abstraksi. Di Fase 1, email auth memakai SMTP bawaan Supabase, yang kuotanya kecil dan hanya layak untuk pengembangan.
8. **Provider AI bawaan (Fase 2).** Usulan: Claude lewat lapisan provider yang bisa diganti. Tidak memengaruhi Fase 1.
9. **Cakupan offline di Fase 1.** "Mode offline penuh" ada di Fase 4, tetapi brief juga mewajibkan keandalan hari H. Usulan: Fase 1 sudah berisi antrean check-in lokal, unduhan daftar tamu ke perangkat, sinkron multi-perangkat, dan mode gladi. Fase 2 menambah PDF daftar tamu, panduan crew, dan checklist H-1. Fase 4 menambah precache seluruh aplikasi, background sync, dan UI resolusi konflik.
10. **Jenis upacara.** Akad (Islam), pemberkatan (Kristen dan Katolik), dan upacara agama lain memengaruhi template checklist dan berkas administrasi (KUA atau catatan sipil). Wizard di brief tidak menanyakannya. Usulan: tambah satu pertanyaan opsional "jenis upacara" di wizard, hanya untuk memilih template. Data ini tidak ditampilkan ke tamu.
11. **Alur cabang dan PR.** Repo ini masih kosong, jadi belum ada cabang dasar untuk PR. Usulan: Anda menjadikan commit pertama sebagai `main`, lalu setiap fase berjalan di cabang kerja dengan PR ke `main`.

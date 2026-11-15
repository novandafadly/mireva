# DECISIONS

Catatan keputusan arsitektur. Status semua butir: **diusulkan**, menunggu persetujuan bersama [SPEC.md](./SPEC.md). Keputusan baru ditambahkan di bawah dengan nomor berikutnya. Keputusan yang diganti tidak dihapus, hanya ditandai "diganti oleh D-xxx".

Format: konteks, keputusan, konsekuensi.

---

## D-001 Nama produk hanya di satu file

**Konteks.** Nama produk belum final dan akan berganti.
**Keputusan.** `src/config/brand.ts` mengekspor `brand.name`, `brand.tagline`, `brand.domain`. Metadata, email, manifest PWA, watermark, template undangan, PDF, dan pesan wa.me mengimpor dari sana. Aturan lint menolak literal nama produk di file lain.
**Konsekuensi.** Ganti nama cukup satu file. Brief tetap memakai `[NAMA_PRODUK]`.

## D-002 Satu aplikasi Next.js, modul per fitur

**Konteks.** Ada area pengguna login, halaman tamu, mode crew, dan admin.
**Keputusan.** Satu aplikasi dengan route group terpisah, dan kode per modul di `src/features/<modul>`. Tidak memakai monorepo.
**Konsekuensi.** Deploy dan CI sederhana. Halaman undangan dijaga ringan dengan memisahkan bundel: tidak mengimpor komponen dashboard.

## D-003 Akses data lewat supabase-js dan RLS, tanpa ORM

**Konteks.** Brief mewajibkan RLS di semua tabel.
**Keputusan.** Server Components dan Server Actions memakai klien Supabase dengan sesi pengguna, sehingga RLS adalah lapisan otorisasi utama. Tipe dihasilkan dari skema (`supabase gen types`). Input divalidasi dengan zod. Operasi multi-tabel yang harus atomik ditulis sebagai fungsi SQL.
**Konsekuensi.** Tidak ada jalur kode yang melewati RLS tanpa sengaja. Service role hanya dipakai di tiga tempat (D-005), dan itu mudah diaudit.

## D-004 Tenant = wedding, izin per modul di `wedding_members`

**Konteks.** Dua owner, lalu keluarga dan panitia dengan izin lihat, edit, atau tanpa akses per modul.
**Keputusan.** `wedding_members.role` (`owner`, `collaborator`) dan `permissions jsonb` per modul. Dua fungsi `security definer` di skema `private` (`is_owner`, `has_access`) dipakai semua kebijakan.
**Konsekuensi.** Menambah modul berarti menambah satu kunci izin, tanpa migrasi tabel izin. Fungsi `security definer` menghindari rekursi RLS pada `wedding_members`.

## D-005 Tamu dan crew tidak menyentuh database secara langsung

**Konteks.** Tamu dan crew tidak punya akun. Memberi hak ke peran `anon` membuat permukaan serangan lebar dan sulit dibatasi lajunya.
**Keputusan.** `anon` tidak punya hak atas tabel. Semua akses tamu dan crew lewat Route Handler yang memvalidasi token, menerapkan rate limit, lalu memanggil fungsi SQL sempit dengan service role.
**Konsekuensi.** Otorisasi tamu dan crew ada di kode server, jadi butuh tes integrasi sendiri (token salah, dicabut, kedaluwarsa). Sebagai gantinya, kebocoran lewat kebijakan `anon` yang keliru tidak mungkin terjadi.

## D-006 Dua token per tamu

**Konteks.** Link undangan mudah diteruskan. QR dipindai oleh crew.
**Keputusan.** `invite_token` untuk membuka undangan dan RSVP. `qr_token` terpisah untuk check-in. Keduanya 128 bit acak dan bisa diganti per tamu. `invite_token` disimpan apa adanya karena owner perlu menampilkan ulang link. Token crew dan token undangan anggota disimpan sebagai hash.
**Konsekuensi.** Memindai QR tidak memberi akses ke RSVP. Kebocoran database membuka link undangan tamu, dan risiko ini diterima karena isi undangan memang dibagikan ke tamu.

## D-007 Sinkron crew lewat antrean lokal dan delta, bukan Realtime

**Konteks.** Venue sering bersinyal buruk. Crew tidak punya sesi Supabase, sehingga Realtime dengan RLS tidak tersedia untuk mereka tanpa membuat JWT khusus.
**Keputusan.** Perangkat crew menyimpan daftar tamu dan antrean check-in di IndexedDB. Check-in dikirim per batch dengan `client_op_id` (idempoten). Perangkat menarik delta dari server setiap beberapa detik. Dashboard owner tetap memakai Realtime.
**Konsekuensi.** Satu mekanisme untuk online dan offline. Perangkat lain tahu check-in baru dengan jeda beberapa detik, bukan seketika. Selama dua perangkat sama-sama offline, tamu yang sama bisa dipindai di keduanya, dan konflik itu diselesaikan oleh D-008.

## D-008 Check-in ganda dicegah index unik, "yang pertama diterima menang"

**Konteks.** Beberapa perangkat memindai bersamaan, sebagian offline.
**Keputusan.** Index unik parsial `(guest_id, event_session_id) where voided_at is null`. Insert yang bentrok mengembalikan check-in yang sudah ada. Urutan ditentukan waktu terima server, bukan jam perangkat.
**Konsekuensi.** Tidak ada check-in ganda di database dalam kondisi apa pun. Jam perangkat yang salah tidak memengaruhi hasil. Waktu perangkat tetap disimpan untuk laporan.

## D-009 Status tamu diturunkan, bukan disimpan

**Konteks.** Status tamu (belum dikirim sampai check-in) berasal dari beberapa peristiwa.
**Keputusan.** Simpan peristiwanya (`sent_at`, `opened_at`, `rsvps`, `checkins`). View `guest_status` menurunkan status.
**Konsekuensi.** Tidak ada status yang basi atau bertentangan. Filter berdasarkan status memakai view, dan index disiapkan untuk itu.

## D-010 Rupiah sebagai `bigint`, satu modul uang

**Konteks.** Brief melarang float.
**Keputusan.** Semua nominal `bigint` di database dan `number` integer di TypeScript (aman sampai sekitar 9 kuadriliun). Pembagian porsi memakai basis poin, dengan sisa pembulatan dialokasikan secara deterministik. Semua format dan aritmetika lewat `src/lib/money.ts`.
**Konsekuensi.** Jumlah porsi selalu sama dengan totalnya. Tidak ada selisih satu rupiah di laporan.

## D-011 Waktu: `timestamptz` + zona per wedding

**Konteks.** WIB sebagai default, dengan dukungan WITA dan WIT.
**Keputusan.** Simpan `timestamptz`. `weddings.timezone` berisi nama zona IANA. Tanggal tanpa jam (tenggat, jatuh tempo) disimpan sebagai `date` dan ditafsirkan di zona wedding. Label WIB, WITA, WIT ditampilkan di undangan.
**Konsekuensi.** Kedaluwarsa crew ("tanggal acara + 1 hari") dan pengingat dihitung di zona wedding, bukan zona server.

## D-012 Entitlement: snapshot limit di `weddings`, dua fungsi pengecek

**Konteks.** Brief meminta plan dan limit di tabel wedding dengan satu fungsi pengecekan terpusat.
**Keputusan.** `weddings.plan` dan `weddings.limits` (snapshot). Kode aplikasi hanya memakai `src/lib/entitlements.ts`. Database hanya memakai `private.wedding_limit()`, untuk batas yang harus kebal dari panggilan API langsung. Tes memastikan keduanya konsisten.
**Konsekuensi.** Perubahan harga atau paket tidak mengubah wedding yang sudah membeli. Ada dua implementasi (TS dan SQL) yang membaca data yang sama. Duplikasi ini disengaja dan dijaga tes.

## D-013 Undangan sebagai daftar blok sejak awal

**Konteks.** Editor blok baru ada di Fase 3, tetapi undangan rilis di Fase 1.
**Keputusan.** `invitations.sections` berupa daftar blok `{ id, type, visible, data }` sejak Fase 1. Template adalah komponen React di kode yang merender blok tersebut. Fase 1 hanya menyediakan formulir isi dan sakelar visibilitas.
**Konsekuensi.** Fase 3 menambah editor tanpa migrasi data. Template di kode berarti menambah template butuh deploy, dan itu diterima sampai admin template hadir di Fase 4.

## D-014 Render undangan di server, bagian personal tetap ringan

**Konteks.** Target Lighthouse mobile ≥ 85, HP murah, jaringan 3G. Setiap tamu punya link personal.
**Keputusan.** Isi undangan di-cache per slug dan dibatalkan saat owner menyimpan. Data personal (nama, sesi, RSVP) diambil dengan satu kueri berindeks. JavaScript klien hanya untuk hitung mundur, formulir RSVP, galeri, dan musik, dimuat malas. Gambar lewat `next/image`. Font di-host sendiri.
**Konsekuensi.** HTML pertama sudah berisi undangan lengkap. Musik latar tidak pernah diputar otomatis.

## D-015 PWA dengan Serwist, dua cakupan

**Konteks.** Halaman undangan dan halaman scan harus berupa PWA.
**Keputusan.** Service worker lewat Serwist. Mode crew bisa dipasang, dengan app shell di-cache dan data di IndexedDB. Undangan men-cache aset undangan yang pernah dibuka. Manifest dibuat dinamis dan mengambil nama dari `brand`.
**Konsekuensi.** Mode crew tetap terbuka tanpa sinyal setelah sekali dimuat. Offline penuh untuk seluruh aplikasi ditunda ke Fase 4.

## D-016 Rate limit di Postgres

**Konteks.** Endpoint publik wajib dibatasi. Stack wajib tidak menyebut Redis.
**Keputusan.** Penghitung jendela tetap di tabel `private.rate_limits` lewat satu fungsi SQL, di balik antarmuka `rateLimit(key, limit, window)`.
**Konsekuensi.** Tidak ada vendor tambahan. Setiap permintaan publik menambah satu tulis ke database. Bila beban naik, implementasi bisa diganti (misalnya Upstash) tanpa mengubah pemanggil.

## D-017 Impor tamu: parsing di browser, validasi ulang di server

**Konteks.** Impor CSV dan Excel dengan pemetaan kolom dan deteksi duplikat.
**Keputusan.** File diurai di browser (Papa Parse untuk CSV, ExcelJS untuk Excel), jadi file mentah tidak diunggah. Baris hasil pemetaan dikirim ke server, divalidasi ulang, lalu disisipkan dalam satu transaksi. Duplikat dideteksi dari nama dan nomor HP yang dinormalkan, ditandai, dan diputuskan pengguna.
**Konsekuensi.** Sesuai prinsip minimisasi data. Duplikat tidak diblokir oleh constraint, karena dua tamu bernama sama tanpa nomor HP memang bisa ada.

## D-018 i18n: katalog pesan sejak awal, tanpa awalan locale

**Konteks.** UI bahasa Indonesia, siap untuk English.
**Keputusan.** `next-intl` dengan satu locale `id`. Semua teks UI di `messages/id.json`. URL tanpa awalan locale dan slug berbahasa Indonesia. Format angka, uang, dan tanggal lewat util yang sadar locale.
**Konsekuensi.** Menambah English berarti menambah katalog dan pemilih bahasa, tanpa menyentuh komponen.

## D-019 Pengingat lewat Vercel Cron

**Konteks.** Pengingat tenggat tugas dan jatuh tempo pembayaran.
**Keputusan.** Cron harian memanggil `/api/cron/reminders` (dilindungi `CRON_SECRET`). Handler mengisi tabel `notifications` dengan `dedupe_key` unik, lalu mengirim email.
**Konsekuensi.** Pengingat bersifat harian, bukan per jam. Pengiriman ganda dicegah oleh `dedupe_key`.

## D-020 Lapisan abstraksi untuk AI, pembayaran, dan email

**Konteks.** Brief meminta provider AI yang bisa diganti dan gateway pembayaran lewat abstraksi.
**Keputusan.** Tiga antarmuka kecil di `src/lib/ai`, `src/lib/payments`, `src/lib/email`. Setiap antarmuka punya satu implementasi nyata dan satu implementasi palsu untuk tes. Kunci API hanya dibaca di server. Setiap panggilan AI mencatat token ke `ai_usage`.
**Konsekuensi.** Tes tidak memanggil layanan luar. Mengganti provider tidak menyentuh modul fitur.

## D-021 Perubahan data oleh AI selalu lewat usulan

**Konteks.** Setiap aksi AI yang mengubah data wajib dikonfirmasi pengguna.
**Keputusan.** AI tidak punya jalur tulis. Model menghasilkan usulan terstruktur (`ai_actions`). Pengguna melihat perbandingan sebelum dan sesudah, lalu menyetujui. Penerapan berjalan dengan sesi pengguna, sehingga RLS berlaku. Konteks yang dibaca AI juga diambil dengan sesi pengguna.
**Konsekuensi.** AI tidak bisa membaca atau mengubah apa pun yang tidak boleh diakses pengguna itu.

## D-022 Platform tidak pernah menyentuh dana tamu

**Konteks.** Batasan brief untuk amplop digital dan wishlist.
**Keputusan.** Amplop digital hanya menampilkan info rekening dan gambar QRIS yang diunggah pasangan. Wishlist hanya mencatat klaim dan konfirmasi. Tidak ada integrasi pembayaran pada alur tamu. Gateway hanya dipakai untuk pembelian paket (Fase 3).
**Konsekuensi.** Konfirmasi kontribusi dilakukan manual oleh pasangan. Pembayaran lewat platform butuh tinjauan hukum lebih dulu dan berada di luar cakupan.

## D-023 Konten adat dan administrasi berstatus draf sampai direviu

**Konteks.** Brief mewajibkan reviu manusia.
**Keputusan.** `content_templates.review_status` bernilai `draft` atau `reviewed`. Item yang berasal dari template draf membawa `needs_review` dan label "draf, belum direviu" di UI. Berkas administrasi selalu disertai catatan agar pengguna mengecek ke instansi terkait.
**Konsekuensi.** Template adat bisa dikembangkan tanpa tampil sebagai informasi resmi. Reviu oleh narasumber adat perlu dijadwalkan sebelum Fase 2 rilis.

## D-024 Tes RLS dengan pgTAP

**Konteks.** Tes RLS otomatis wajib.
**Keputusan.** pgTAP lewat `supabase test db`, dijalankan di CI terhadap Supabase lokal. Satu berkas tes per tabel dengan matriks peran yang sama. Logika murni diuji dengan Vitest.
**Konsekuensi.** CI butuh Docker di runner (tersedia di GitHub Actions) dan bertambah beberapa menit.

## D-025 Perkakas

**Keputusan.** pnpm, Node LTS, ESLint + Prettier, Vitest, Playwright, Supabase CLI. Versi Next.js stabil terbaru saat scaffold, dikunci di lockfile.

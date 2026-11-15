# Prompt: Platform Persiapan Pernikahan End-to-End

Peran: kamu senior full-stack engineer, product designer, dan tech lead.
Bangun [NAMA_PRODUK], platform persiapan pernikahan end-to-end untuk pasangan di Indonesia.
Bahasa UI: Indonesia (struktur siap i18n untuk English nanti). Model: self-serve, pasangan mengelola semuanya sendiri.

## Positioning dan pembeda

Kompetitor (Katsudoto, Viding, dll.) kuat di undangan digital dan buku tamu. Pembeda [NAMA_PRODUK]:
1. Satu alur utuh dari "baru lamaran" sampai "laporan akhir setelah acara", bukan kumpulan fitur terpisah.
2. Keuangan pernikahan yang serius: pembagian biaya antar pihak, simulasi jumlah tamu, arus kas vendor, rekap amplop dan kado, sampai biaya bersih pernikahan.
3. Lokal dan adat: template checklist, rundown, dan seserahan per adat.
4. Asisten AI yang memahami data wedding pengguna: rencana otomatis, scan nota, saran anggaran, penulisan teks.
5. Semua modul saling terhubung: palet moodboard menjadi tema undangan, jumlah RSVP mengubah estimasi katering, check-in mencatat amplop ke laporan keuangan.

## Stack (wajib)

- Next.js (App Router, TypeScript strict), Tailwind, shadcn/ui
- Supabase: Postgres, Auth (email + Google), Storage, Realtime, Row Level Security, Edge Functions bila perlu
- Deploy: Vercel. Repo GitHub ini. CI dengan GitHub Actions (lint, typecheck, test, build).
- AI: panggil model lewat route server (jangan dari browser). Buat lapisan provider yang bisa diganti. Kunci API hanya di env server.
- Pembayaran (fase akhir): Midtrans atau Xendit lewat lapisan abstraksi.
- Monitoring error: Sentry (atau setara).
- Halaman undangan dan halaman scan berupa PWA.

## Peran pengguna

1. Owner (pasangan): dua akun berbagi satu wedding. Undang pasangan lewat email.
2. Keluarga atau panitia: diundang owner, dengan izin per modul (lihat, edit, atau tanpa akses). Bisa diberi tugas.
3. Crew hari H: akses hanya ke mode check-in, lewat link + PIN, berlaku sampai tanggal acara + 1 hari.
4. Tamu: tanpa login, akses lewat link unik per tamu.
5. Wedding organizer (fase 4): satu akun mengelola banyak wedding klien.
6. Admin internal: kelola template, paket, pengguna, dan pembayaran.

## Modul

### 0. Onboarding dan rencana otomatis
- Wizard: nama mempelai, tanggal (atau rentang jika belum pasti), kota, adat (bisa campuran dua adat), estimasi tamu, total anggaran, sumber dana per pihak.
- Hasil wizard: checklist bertahap, rundown awal, alokasi anggaran per kategori, dan daftar seserahan, dibuat dari template adat + penyesuaian AI.
- Dashboard utama: hitung mundur, progres checklist, sisa anggaran, pembayaran jatuh tempo terdekat, status RSVP, dan "fokus minggu ini".

### 1. Perencanaan
- Checklist per tahap (12, 9, 6, 3, 1 bulan, H-7, H-1, hari H) dengan status, tenggat, penanggung jawab, catatan, lampiran.
- Template adat: Jawa, Sunda, Minang, Batak, Bugis, Betawi, Bali, nasional/umum. Mencakup lamaran, seserahan, prosesi adat, dan akad/pemberkatan. Tandai semua isi adat sebagai draf yang wajib direviu manusia sebelum rilis.
- Checklist berkas administrasi pernikahan (KUA atau catatan sipil) yang bisa diedit. Jangan mengklaim persyaratan resmi; beri catatan agar pengguna mengecek ke instansi terkait.
- Rundown hari H per sesi dengan durasi, PIC, dan lokasi. Bisa diekspor PDF untuk panitia.
- Tugas untuk panitia keluarga, dengan notifikasi.
- Pengingat lewat email (tenggat tugas, jatuh tempo pembayaran).

### 2. Anggaran dan keuangan
- Kategori anggaran dengan estimasi vs realisasi, persentase terpakai, peringatan over budget.
- Pembayaran vendor bertahap (DP, termin, pelunasan) dengan jatuh tempo dan status.
- Pembagian biaya antar pihak (keluarga pria, keluarga wanita, pasangan, patungan): siapa menanggung apa, saldo per pihak.
- Simulasi jumlah tamu: ubah jumlah tamu, item berbasis per-orang (katering, souvenir, undangan cetak) dihitung ulang. Bisa memakai angka RSVP aktual.
- Tabungan nikah: target, setoran, sisa bulan, setoran bulanan yang dibutuhkan.
- Arus kas: kebutuhan dana per bulan sampai hari H.
- Scan nota: unggah foto kuitansi atau invoice, AI mengekstrak vendor, tanggal, jumlah, kategori. Pengguna mengonfirmasi sebelum disimpan.
- Rekap amplop dan kado: amplop fisik dicatat crew saat check-in (nominal opsional, bisa dicatat belakangan), amplop digital dicatat manual, kado dicatat per tamu.
- Laporan akhir: total pengeluaran, total pemasukan (amplop, kontribusi keluarga), biaya bersih, rincian per pihak. Ekspor Excel dan PDF.
- Semua nominal dalam Rupiah, disimpan sebagai integer (tanpa float).

### 3. Vendor
- Daftar vendor pribadi per kategori: kontak, penawaran, paket, status (survei, negosiasi, DP, lunas, batal).
- Perbandingan penawaran berdampingan untuk satu kategori.
- Unggah kontrak dan dokumen penawaran.
- Terhubung ke anggaran dan jadwal pembayaran.
- Catatan dan rating pribadi (tidak publik di MVP).

### 4. Seserahan dan seragam
- Daftar seserahan: item, estimasi harga, link toko, status beli, terhubung ke anggaran.
- Seragam keluarga dan panitia: daftar orang, ukuran, warna, bahan, status jahit dan ambil.

### 5. Moodboard
- Unggah gambar ke Storage, susun per board (tema, dekor, baju, makeup, foto).
- Tag dan catatan per gambar.
- Ekstrak palet warna dari gambar. Palet bisa dipakai langsung sebagai tema undangan.

### 6. Manajemen tamu
- Impor CSV/Excel dengan pemetaan kolom, validasi, dan deteksi duplikat (nama + nomor HP).
- Grup, sesi (akad, resepsi, sesi resepsi berbeda), kategori (VIP, keluarga, reguler), pihak pengundang (pria atau wanita), kuota pax.
- Kuota tamu per pihak dengan peringatan jika terlampaui.
- Status per tamu: belum dikirim, dikirim, dibuka, RSVP hadir, RSVP tidak hadir, check-in.

### 7. Undangan digital
- Minimal 5 template orisinal, editor berbasis blok (urutan dan visibilitas bagian bisa diatur), warna dan font bisa diganti atau diambil dari palet moodboard.
- Bagian: mempelai, orang tua, ayat atau kutipan, acara per sesi (tanggal, jam, lokasi, link maps, tambahkan ke kalender), hitung mundur, galeri, love story, musik latar opsional, protokol acara, amplop digital, ucapan dan doa.
- Link personal per tamu: /u/[slug]?to=[guest_token], menampilkan nama tamu dan hanya sesi yang ia diundang.
- RSVP: hadir/tidak, jumlah orang (dibatasi kuota), ucapan. Batas waktu RSVP bisa diatur.
- Amplop digital: hanya menampilkan info rekening atau gambar QRIS yang diunggah pasangan. Jangan pernah menampung, memproses, atau meneruskan dana tamu.
- Bagikan lewat tautan wa.me per tamu dengan template pesan yang bisa diedit. Jangan memakai WhatsApp blast tidak resmi.
- Pratinjau sebelum publikasi, mode draf, dan watermark di paket gratis.

### 7b. Wishlist kado (gift registry)
- Pasangan membuat wishlist: nama barang, foto, harga atau target nominal, link toko, prioritas, catatan.
- Tiga jenis item:
  - Barang utuh: satu tamu mengklaim seluruhnya.
  - Patungan: banyak tamu berkontribusi nominal bebas sampai target tercapai.
  - Dana tujuan: misalnya dana bulan madu atau dana rumah, dengan target nominal.
- Tampil sebagai bagian di halaman undangan dan sebagai halaman terpisah yang bisa dibagikan.
- Tamu memilih item, mengisi klaim (utuh atau nominal), lalu membeli sendiri lewat link toko atau transfer langsung ke rekening pasangan. Platform tidak memproses pembayaran.
- Status kontribusi: diklaim, menunggu konfirmasi, dikonfirmasi, dibatalkan. Klaim yang tidak dikonfirmasi bisa kedaluwarsa setelah jangka waktu yang diatur pasangan, lalu kuotanya kembali tersedia.
- Progres bar per item dari nominal yang dikonfirmasi (dan, terpisah, nominal yang masih diklaim). Cegah klaim melebihi target dan klaim ganda untuk barang utuh, dengan penguncian di database.
- Privasi: tamu bisa memilih tampil dengan nama atau anonim di daftar publik. Pasangan selalu melihat nama dan nominal lengkap.
- Kontribusi yang dikonfirmasi otomatis masuk ke rekap kado (modul 2) dan menjadi dasar ucapan terima kasih (modul 9).
- Fase berikutnya (jangan dibangun sekarang): pembayaran langsung lewat platform dengan split atau disbursement dari payment gateway. Butuh tinjauan hukum dan verifikasi identitas pasangan sebelum dikerjakan.

### 8. Hari H
- QR per tamu berisi token acak yang tidak bisa ditebak, tampil di undangan setelah RSVP hadir.
- Mode crew (PWA): scan kamera, tampilkan nama, grup, sesi, kuota pax, catatan VIP. Cegah check-in ganda. Pencarian nama manual. Tambah tamu dadakan (walk-in).
- Toleran jaringan buruk: antrean check-in lokal yang tersinkron saat online, dengan penanganan konflik.
- Catat amplop dan kado saat check-in.
- Dashboard realtime: RSVP vs hadir, per sesi, per grup, per pihak.
- Layar sapa opsional untuk monitor di venue: menampilkan nama tamu yang baru check-in.
- Model operasional self-service penuh: tidak ada tim dari [NAMA_PRODUK] yang datang ke venue. Keluarga atau panitia menjalankan check-in dengan HP masing-masing. Karena itu, keandalan wajib dibangun ke dalam produk:
  - Mode gladi: crew bisa berlatih scan dengan QR contoh sebelum hari H, tanpa memengaruhi data asli.
  - Panduan crew di dalam aplikasi (langkah singkat bergambar), dan checklist kesiapan H-1: jumlah HP, baterai, izin kamera, PIN crew, sinyal venue.
  - Beberapa perangkat crew bisa scan bersamaan dan tetap sinkron.
  - Cadangan tanpa internet: unduh daftar tamu ke perangkat crew sebelum acara, dan cetak daftar tamu PDF (urut abjad, per sesi) untuk cek manual.
  - Halaman status sistem dan kanal bantuan darurat di hari acara. Tandai kanal bantuan manusia sebagai add-on berbayar opsional untuk fase berikutnya.

### 9. Setelah acara
- Album bersama: tamu mengunggah foto lewat QR di venue, owner memoderasi.
- Ucapan terima kasih: template pesan per tamu (hadir atau memberi kado), dibagikan lewat wa.me.
- Laporan akhir wedding (keuangan + kehadiran) dalam PDF.
- Arsip read-only, dan opsi hapus seluruh data wedding beserta data tamu.

### 10. Asisten AI
- Panel asisten yang membaca konteks wedding pengguna (dengan izin RLS yang sama).
- Kemampuan: menjawab "apa yang harus kukerjakan minggu ini", menyusun ulang checklist jika tanggal berubah, menyarankan alokasi anggaran, menulis teks undangan dan ucapan terima kasih, membaca nota.
- Setiap aksi AI yang mengubah data harus dikonfirmasi pengguna terlebih dahulu.
- Batasi pemakaian AI per paket. Catat token per wedding untuk kontrol biaya.

### 11. Bisnis dan admin
- Freemium per wedding:
  - Gratis: onboarding, checklist, anggaran inti, vendor, moodboard, undangan dengan watermark, tamu sampai batas tertentu.
  - Berbayar per acara: tanpa watermark, tamu lebih banyak, QR check-in, template premium, fitur keuangan lanjutan, kuota AI lebih besar, album bersama.
  - Add-on: tambahan kuota tamu, tambahan sesi.
- Simpan plan dan limit di tabel wedding, dengan satu fungsi pengecekan entitlement terpusat.
- Paket wedding organizer (fase 4): dashboard multi-klien, branding WO di undangan, langganan bulanan.
- Program referral sederhana (kode undangan, kredit).
- Admin internal: kelola template, isi template adat, paket dan harga, pengguna, transaksi, dan log audit.

## Non-fungsional

- Keamanan: RLS di semua tabel, dengan tes RLS otomatis. Token tamu dan crew acak, bisa dicabut. Rate limit pada endpoint publik (RSVP, check-in, unggah foto).
- Privasi (prinsip UU PDP): kebijakan privasi, minimisasi data tamu, persetujuan saat tamu mengunggah foto, ekspor dan hapus data.
- Performa: halaman undangan Lighthouse mobile performance ≥ 85, gambar dioptimasi, berjalan baik di HP murah dan jaringan 3G.
- Mobile-first di semua halaman.
- Aksesibilitas dasar: kontras, label form, navigasi keyboard.
- Uang dan tanggal: Rupiah integer, zona waktu Asia/Jakarta sebagai default dengan dukungan WITA/WIT.
- Tidak ada secret di repo. Sediakan .env.example.

## Batasan

- Semua desain, template, teks, dan aset orisinal. Jangan meniru tampilan, logo, nama fitur khas, atau copy dari Katsudoto, Viding, atau kompetitor lain.
- Jangan menampung dana pengguna atau tamu. Pembayaran paket hanya lewat payment gateway resmi.
- Jangan memakai integrasi WhatsApp tidak resmi.
- Konten adat dan administrasi pernikahan wajib ditandai sebagai draf untuk direviu manusia.

## Tahapan rilis

- Fase 1 (MVP): auth, wedding bersama, onboarding, checklist, anggaran inti dan pembayaran vendor, vendor, manajemen tamu + impor, undangan + RSVP, QR check-in + mode crew + dashboard realtime.
- Fase 2 (pembeda): wishlist kado mode klaim dan konfirmasi, template adat, pembagian biaya per pihak, simulasi jumlah tamu, arus kas, rekap amplop dan kado, laporan biaya bersih, scan nota AI.
- Fase 3 (lengkap): moodboard + palet ke tema, seserahan dan seragam, editor undangan berbasis blok, asisten AI, album bersama, ucapan terima kasih, laporan akhir PDF, billing dan paywall.
- Fase 4 (skala): paket wedding organizer, referral, admin internal lengkap, layar sapa, mode offline penuh.

## Cara kerja

1. Sebelum menulis kode, tulis docs/SPEC.md: peta halaman dan route, skema database (tabel, kolom, relasi, index, kebijakan RLS), alur pengguna utama end-to-end, desain entitlement, dan rencana per fase. Tulis juga docs/DECISIONS.md untuk keputusan arsitektur. Ajukan pertanyaan untuk hal yang ambigu. Berhenti dan minta persetujuanku.
2. Kerjakan satu fase pada satu waktu. Di dalam fase, kerjakan per modul dan commit per modul.
3. Tiap modul: migrasi di supabase/migrations, seed data dummy yang realistis, tes untuk logika penting (kuota pax, check-in ganda, entitlement, perhitungan anggaran, RLS), lalu jalankan lint, typecheck, test, dan build sebelum lanjut.
4. Di akhir tiap modul, laporkan singkat: apa yang selesai, apa yang belum, risiko, dan keputusan yang perlu dariku.
5. Jangan mulai fase berikutnya tanpa persetujuanku.

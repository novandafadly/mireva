/**
 * Template rencana umum (nasional). Dipakai generator onboarding di Fase 1.
 * Template adat menyusul di Fase 2 lewat titik masuk yang sama.
 *
 * Isi di sini adalah data yang disalin ke wedding pengguna, bukan teks UI.
 * Berkas administrasi adalah DRAF: persyaratan bisa berbeda per daerah dan
 * berubah, jadi setiap butirnya ditandai perlu direviu (D-023).
 */

export type ChecklistStage = "m12" | "m9" | "m6" | "m3" | "m1" | "d7" | "d1" | "d0";
export type Ceremony = "akad" | "pemberkatan" | "lainnya";

/** Hari sebelum acara untuk tenggat tiap tahap. */
export const STAGE_OFFSET_DAYS: Record<ChecklistStage, number> = {
  m12: 365,
  m9: 270,
  m6: 180,
  m3: 90,
  m1: 30,
  d7: 7,
  d1: 1,
  d0: 0,
};

export const STAGE_ORDER: ChecklistStage[] = ["m12", "m9", "m6", "m3", "m1", "d7", "d1", "d0"];

export type ChecklistTemplateItem = {
  key: string;
  stage: ChecklistStage;
  title: string;
  description?: string;
};

export const CHECKLIST_TEMPLATE: ChecklistTemplateItem[] = [
  { key: "general.budget_talk", stage: "m12", title: "Sepakati total anggaran dan sumber dana" },
  { key: "general.date_options", stage: "m12", title: "Tentukan tanggal atau pilihan tanggal" },
  { key: "general.guest_estimate", stage: "m12", title: "Perkirakan jumlah tamu per pihak" },
  { key: "general.concept", stage: "m12", title: "Sepakati konsep acara dengan keluarga" },
  { key: "general.venue_survey", stage: "m12", title: "Survei dan bandingkan gedung atau lokasi" },

  { key: "general.venue_book", stage: "m9", title: "Pesan gedung atau lokasi dan bayar DP" },
  {
    key: "general.catering_survey",
    stage: "m9",
    title: "Survei katering dan jadwalkan tes makanan",
  },
  { key: "general.photo_survey", stage: "m9", title: "Survei fotografer dan videografer" },
  { key: "general.committee", stage: "m9", title: "Bentuk panitia keluarga dan bagi tugas" },

  { key: "general.catering_book", stage: "m6", title: "Pesan katering" },
  { key: "general.decor_book", stage: "m6", title: "Pesan dekorasi" },
  { key: "general.photo_book", stage: "m6", title: "Pesan fotografer dan videografer" },
  { key: "general.attire_makeup", stage: "m6", title: "Pesan busana dan rias pengantin" },
  { key: "general.guest_list_draft", stage: "m6", title: "Susun daftar tamu awal" },

  { key: "general.entertainment", stage: "m3", title: "Pesan MC dan hiburan" },
  { key: "general.invitation_design", stage: "m3", title: "Siapkan isi dan desain undangan" },
  { key: "general.souvenir", stage: "m3", title: "Pesan souvenir" },
  { key: "general.family_uniform", stage: "m3", title: "Siapkan seragam keluarga dan panitia" },
  { key: "general.rings", stage: "m3", title: "Siapkan cincin dan mahar atau mas kawin" },
  { key: "general.guest_list_final", stage: "m3", title: "Finalkan daftar tamu" },

  { key: "general.invitation_send", stage: "m1", title: "Kirim undangan" },
  { key: "general.fitting", stage: "m1", title: "Fitting akhir busana" },
  { key: "general.rundown_final", stage: "m1", title: "Finalkan rundown bersama MC dan panitia" },
  { key: "general.vendor_confirm", stage: "m1", title: "Konfirmasi ulang semua vendor" },
  { key: "general.transport", stage: "m1", title: "Atur transportasi dan penginapan keluarga" },

  {
    key: "general.rsvp_followup",
    stage: "d7",
    title: "Rekap RSVP dan kabari katering jumlah tamu",
  },
  {
    key: "general.payments_settle",
    stage: "d7",
    title: "Lunasi pembayaran vendor yang jatuh tempo",
  },
  { key: "general.crew_brief", stage: "d7", title: "Beri arahan panitia penerima tamu" },

  { key: "general.rehearsal", stage: "d1", title: "Gladi bersih di lokasi" },
  {
    key: "general.items_pack",
    stage: "d1",
    title: "Siapkan barang bawaan: cincin, berkas, busana",
  },
  {
    key: "general.envelopes_box",
    stage: "d1",
    title: "Siapkan kotak amplop dan buku tamu cadangan",
  },

  {
    key: "general.day_checkin",
    stage: "d0",
    title: "Pastikan meja penerima tamu siap sebelum acara",
  },
  { key: "general.day_vendors", stage: "d0", title: "Cek kedatangan vendor sesuai rundown" },
];

const ADMIN_NOTE =
  "Draf. Persyaratan bisa berbeda per daerah dan berubah. Cek ke instansi terkait sebelum mengurus.";

type AdminTemplateItem = Omit<ChecklistTemplateItem, "description">;

const ADMIN_KUA: AdminTemplateItem[] = [
  {
    key: "admin.kua.requirements",
    stage: "m3",
    title: "Tanyakan syarat dan jadwal ke KUA setempat",
  },
  {
    key: "admin.kua.intro_letters",
    stage: "m3",
    title: "Urus surat pengantar nikah dari kelurahan atau desa",
  },
  {
    key: "admin.kua.documents",
    stage: "m3",
    title: "Siapkan fotokopi KTP, KK, akta kelahiran, dan pas foto",
  },
  { key: "admin.kua.register", stage: "m1", title: "Daftarkan kehendak nikah ke KUA" },
  { key: "admin.kua.guidance", stage: "m1", title: "Ikuti bimbingan perkawinan bila diwajibkan" },
];

const ADMIN_CIVIL: AdminTemplateItem[] = [
  {
    key: "admin.sipil.requirements",
    stage: "m3",
    title: "Tanyakan syarat dan jadwal ke Dukcapil setempat",
  },
  {
    key: "admin.sipil.religious",
    stage: "m3",
    title: "Urus persyaratan dari gereja atau lembaga agama",
  },
  {
    key: "admin.sipil.documents",
    stage: "m3",
    title: "Siapkan fotokopi KTP, KK, akta kelahiran, dan pas foto",
  },
  {
    key: "admin.sipil.register",
    stage: "m1",
    title: "Daftarkan pencatatan perkawinan ke Dukcapil",
  },
];

const ADMIN_UNKNOWN: AdminTemplateItem[] = [
  {
    key: "admin.umum.requirements",
    stage: "m3",
    title: "Tanyakan syarat pencatatan nikah ke KUA atau Dukcapil",
  },
  {
    key: "admin.umum.documents",
    stage: "m3",
    title: "Siapkan fotokopi KTP, KK, akta kelahiran, dan pas foto",
  },
];

export function adminDocsTemplate(ceremony: Ceremony | null): ChecklistTemplateItem[] {
  const items =
    ceremony === "akad" ? ADMIN_KUA : ceremony === "pemberkatan" ? ADMIN_CIVIL : ADMIN_UNKNOWN;
  return items.map((item) => ({ ...item, description: ADMIN_NOTE }));
}

export type BudgetTemplateCategory = { key: string; name: string; shareBp: number };

/** Alokasi awal per kategori dalam basis poin. Titik berangkat, bukan patokan. */
export const BUDGET_TEMPLATE: BudgetTemplateCategory[] = [
  { key: "catering", name: "Katering", shareBp: 4000 },
  { key: "venue", name: "Gedung dan lokasi", shareBp: 1500 },
  { key: "decoration", name: "Dekorasi", shareBp: 1000 },
  { key: "documentation", name: "Foto dan video", shareBp: 800 },
  { key: "attire", name: "Busana dan rias", shareBp: 800 },
  { key: "seserahan", name: "Seserahan dan mahar", shareBp: 500 },
  { key: "invitation", name: "Undangan dan souvenir", shareBp: 400 },
  { key: "entertainment", name: "MC dan hiburan", shareBp: 300 },
  { key: "transport", name: "Transportasi dan penginapan", shareBp: 200 },
  { key: "admin", name: "Administrasi", shareBp: 100 },
  { key: "reserve", name: "Dana cadangan", shareBp: 400 },
];

export type SessionTemplate = {
  kind: "akad" | "pemberkatan" | "resepsi";
  name: string;
  /** Menit dari tengah malam di zona wedding. */
  startMinute: number;
  durationMin: number;
  rundown: { key: string; title: string; offsetMin: number; durationMin: number }[];
};

const RECEPTION: SessionTemplate = {
  kind: "resepsi",
  name: "Resepsi",
  startMinute: 11 * 60,
  durationMin: 180,
  rundown: [
    { key: "resepsi.open", title: "Penerimaan tamu dibuka", offsetMin: 0, durationMin: 30 },
    {
      key: "resepsi.entrance",
      title: "Pengantin memasuki ruangan",
      offsetMin: 30,
      durationMin: 15,
    },
    { key: "resepsi.welcome", title: "Sambutan keluarga dan doa", offsetMin: 45, durationMin: 15 },
    {
      key: "resepsi.greeting",
      title: "Ramah tamah dan foto bersama",
      offsetMin: 60,
      durationMin: 105,
    },
    { key: "resepsi.close", title: "Penutup", offsetMin: 165, durationMin: 15 },
  ],
};

const AKAD: SessionTemplate = {
  kind: "akad",
  name: "Akad nikah",
  startMinute: 8 * 60,
  durationMin: 90,
  rundown: [
    {
      key: "akad.arrival",
      title: "Kedatangan keluarga dan penghulu",
      offsetMin: 0,
      durationMin: 20,
    },
    {
      key: "akad.opening",
      title: "Pembukaan dan pembacaan ayat suci",
      offsetMin: 20,
      durationMin: 15,
    },
    { key: "akad.ijab", title: "Ijab kabul", offsetMin: 35, durationMin: 20 },
    {
      key: "akad.sign",
      title: "Penandatanganan buku nikah dan doa",
      offsetMin: 55,
      durationMin: 15,
    },
    { key: "akad.photo", title: "Foto keluarga", offsetMin: 70, durationMin: 20 },
  ],
};

const BLESSING: SessionTemplate = {
  kind: "pemberkatan",
  name: "Pemberkatan",
  startMinute: 8 * 60,
  durationMin: 90,
  rundown: [
    {
      key: "pemberkatan.arrival",
      title: "Kedatangan keluarga dan jemaat",
      offsetMin: 0,
      durationMin: 20,
    },
    { key: "pemberkatan.service", title: "Ibadah pemberkatan", offsetMin: 20, durationMin: 45 },
    { key: "pemberkatan.sign", title: "Penandatanganan dokumen", offsetMin: 65, durationMin: 10 },
    { key: "pemberkatan.photo", title: "Foto keluarga", offsetMin: 75, durationMin: 15 },
  ],
};

export function sessionTemplates(ceremony: Ceremony | null): SessionTemplate[] {
  if (ceremony === "akad") return [AKAD, RECEPTION];
  if (ceremony === "pemberkatan") return [BLESSING, RECEPTION];
  return [RECEPTION];
}

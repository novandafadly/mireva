import { describe, expect, it } from "vitest";
import { groupBySession, rundownItemSchema, type RundownItem } from "./schema";

const valid = {
  title: " Ijab kabul ",
  eventSessionId: "",
  startsAt: "2027-05-10T08:35",
  durationMin: "20",
  picText: "Pak Hasan",
  location: "Masjid",
  notes: "",
};

describe("rundownItemSchema", () => {
  it("merapikan isian", () => {
    expect(rundownItemSchema.parse(valid)).toEqual({
      title: "Ijab kabul",
      eventSessionId: null,
      startsAt: "2027-05-10T08:35",
      durationMin: 20,
      picText: "Pak Hasan",
      location: "Masjid",
      notes: "",
    });
  });

  it("jam dan durasi boleh kosong", () => {
    const parsed = rundownItemSchema.parse({ ...valid, startsAt: "", durationMin: "" });
    expect(parsed.startsAt).toBeNull();
    expect(parsed.durationMin).toBeNull();
  });

  it("menolak judul kosong", () => {
    expect(rundownItemSchema.safeParse({ ...valid, title: " " }).success).toBe(false);
  });

  it("menolak durasi negatif, pecahan, atau lebih dari sehari", () => {
    expect(rundownItemSchema.safeParse({ ...valid, durationMin: "-5" }).success).toBe(false);
    expect(rundownItemSchema.safeParse({ ...valid, durationMin: "1.5" }).success).toBe(false);
    expect(rundownItemSchema.safeParse({ ...valid, durationMin: "1441" }).success).toBe(false);
  });

  it("menolak format jam yang salah", () => {
    expect(rundownItemSchema.safeParse({ ...valid, startsAt: "jam 8" }).success).toBe(false);
  });

  it("sesi harus UUID bila diisi", () => {
    expect(rundownItemSchema.safeParse({ ...valid, eventSessionId: "akad" }).success).toBe(false);
  });
});

describe("groupBySession", () => {
  const sessions = [
    { id: "s1", name: "Akad nikah", sortOrder: 0 },
    { id: "s2", name: "Resepsi", sortOrder: 1 },
  ];
  const item = (overrides: Partial<RundownItem>): RundownItem => ({
    id: "1",
    eventSessionId: null,
    title: "Acara",
    startsAt: null,
    durationMin: null,
    picText: "",
    location: "",
    notes: "",
    sortOrder: 0,
    ...overrides,
  });

  it("mengelompokkan per sesi sesuai urutan sesi, lalu acara tanpa sesi", () => {
    const groups = groupBySession(sessions, [
      item({ id: "c", eventSessionId: null }),
      item({ id: "b", eventSessionId: "s2" }),
      item({ id: "a", eventSessionId: "s1" }),
    ]);
    expect(groups.map((group) => group.session?.id ?? null)).toEqual(["s1", "s2", null]);
  });

  it("mengurutkan acara menurut jam, yang tanpa jam di akhir menurut sort_order", () => {
    const groups = groupBySession(sessions, [
      item({ id: "tanpa-jam-2", eventSessionId: "s1", sortOrder: 2 }),
      item({ id: "siang", eventSessionId: "s1", startsAt: "2027-05-10T05:00:00Z" }),
      item({ id: "tanpa-jam-1", eventSessionId: "s1", sortOrder: 1 }),
      item({ id: "pagi", eventSessionId: "s1", startsAt: "2027-05-10T01:00:00Z" }),
    ]);
    expect(groups[0]!.items.map((i) => i.id)).toEqual([
      "pagi",
      "siang",
      "tanpa-jam-1",
      "tanpa-jam-2",
    ]);
  });

  it("sesi tanpa acara tetap ditampilkan, kelompok tanpa sesi hanya bila ada isinya", () => {
    const groups = groupBySession(sessions, []);
    expect(groups.map((group) => group.session?.id ?? null)).toEqual(["s1", "s2"]);
  });
});

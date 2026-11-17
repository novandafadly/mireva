import { describe, expect, it } from "vitest";
import { BUDGET_TEMPLATE, CHECKLIST_TEMPLATE } from "@/templates/general";
import { buildPlan, type PlanInput } from "./plan";

const base: PlanInput = {
  dateStart: "2027-05-10",
  ceremony: "akad",
  timezone: "Asia/Jakarta",
  totalBudget: 150_000_000,
  today: "2026-01-01",
};

describe("template umum", () => {
  it("porsi anggaran berjumlah 10.000 basis poin", () => {
    expect(BUDGET_TEMPLATE.reduce((sum, category) => sum + category.shareBp, 0)).toBe(10_000);
  });

  it("kunci template checklist unik", () => {
    const keys = CHECKLIST_TEMPLATE.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("setiap tahap punya minimal satu tugas", () => {
    const stages = new Set(CHECKLIST_TEMPLATE.map((item) => item.stage));
    expect([...stages].sort()).toEqual(["d0", "d1", "d7", "m1", "m12", "m3", "m6", "m9"]);
  });
});

describe("buildPlan: checklist", () => {
  it("menghitung tenggat mundur dari tanggal acara", () => {
    const plan = buildPlan(base);
    const byStage = (stage: string) => plan.checklist.find((item) => item.stage === stage)!;
    expect(byStage("d0").dueDate).toBe("2027-05-10");
    expect(byStage("d1").dueDate).toBe("2027-05-09");
    expect(byStage("d7").dueDate).toBe("2027-05-03");
    expect(byStage("m1").dueDate).toBe("2027-04-10");
    expect(byStage("m12").dueDate).toBe("2026-05-10");
  });

  it("tenggat yang sudah lewat digeser ke hari ini", () => {
    const plan = buildPlan({ ...base, today: "2027-03-01" });
    const m12 = plan.checklist.find((item) => item.stage === "m12")!;
    const m1 = plan.checklist.find((item) => item.stage === "m1")!;
    expect(m12.dueDate).toBe("2027-03-01");
    expect(m1.dueDate).toBe("2027-04-10");
  });

  it("tanpa tanggal acara, tenggat kosong", () => {
    const plan = buildPlan({ ...base, dateStart: null });
    expect(plan.checklist.every((item) => item.dueDate === null)).toBe(true);
  });

  it("berkas administrasi ditandai draf yang perlu direviu", () => {
    const docs = buildPlan(base).checklist.filter((item) => item.kind === "admin_docs");
    expect(docs.length).toBeGreaterThan(0);
    expect(docs.every((item) => item.needsReview)).toBe(true);
  });

  it("tugas umum tidak ditandai perlu direviu", () => {
    const general = buildPlan(base).checklist.filter((item) => item.kind === "general");
    expect(general.some((item) => item.needsReview)).toBe(false);
  });

  it("berkas administrasi mengikuti jenis upacara", () => {
    const keys = (ceremony: PlanInput["ceremony"]) =>
      buildPlan({ ...base, ceremony })
        .checklist.filter((item) => item.kind === "admin_docs")
        .map((item) => item.templateKey);
    expect(keys("akad").some((key) => key.includes("kua"))).toBe(true);
    expect(keys("akad").some((key) => key.includes("sipil"))).toBe(false);
    expect(keys("pemberkatan").some((key) => key.includes("sipil"))).toBe(true);
    expect(keys("pemberkatan").some((key) => key.includes("kua"))).toBe(false);
    expect(keys(null).length).toBeGreaterThan(0);
  });

  it("urutan stabil dan berurutan dari nol", () => {
    const orders = buildPlan(base).checklist.map((item) => item.sortOrder);
    expect(orders).toEqual(orders.map((_, index) => index));
  });
});

describe("buildPlan: sesi dan rundown", () => {
  it("akad menghasilkan sesi akad dan resepsi", () => {
    expect(buildPlan(base).sessions.map((session) => session.kind)).toEqual(["akad", "resepsi"]);
  });

  it("pemberkatan menghasilkan sesi pemberkatan dan resepsi", () => {
    expect(
      buildPlan({ ...base, ceremony: "pemberkatan" }).sessions.map((session) => session.kind),
    ).toEqual(["pemberkatan", "resepsi"]);
  });

  it("tanpa jenis upacara hanya ada resepsi", () => {
    expect(buildPlan({ ...base, ceremony: null }).sessions.map((session) => session.kind)).toEqual([
      "resepsi",
    ]);
  });

  it("jam sesi memakai zona waktu wedding", () => {
    const wib = buildPlan(base).sessions[0]!;
    const wit = buildPlan({ ...base, timezone: "Asia/Jayapura" }).sessions[0]!;
    // 08.00 WIB = 01.00 UTC; 08.00 WIT = 23.00 UTC hari sebelumnya
    expect(wib.startsAt).toBe("2027-05-10T01:00:00.000Z");
    expect(wit.startsAt).toBe("2027-05-09T23:00:00.000Z");
  });

  it("tanpa tanggal, sesi dan rundown tidak punya jam", () => {
    const plan = buildPlan({ ...base, dateStart: null });
    expect(plan.sessions.every((session) => session.startsAt === null)).toBe(true);
    expect(plan.rundown.every((item) => item.startsAt === null)).toBe(true);
  });

  it("setiap acara rundown merujuk sesi yang ada dan berada di dalam jam sesinya", () => {
    const plan = buildPlan(base);
    for (const item of plan.rundown) {
      const session = plan.sessions.find((s) => s.sortOrder === item.sessionSortOrder)!;
      expect(session).toBeDefined();
      expect(item.startsAt! >= session.startsAt!).toBe(true);
      expect(item.startsAt! < session.endsAt!).toBe(true);
    }
  });
});

describe("buildPlan: anggaran", () => {
  it("jumlah alokasi sama persis dengan total anggaran", () => {
    for (const total of [150_000_000, 99_999_999, 1, 0]) {
      const plan = buildPlan({ ...base, totalBudget: total });
      expect(plan.budget.reduce((sum, category) => sum + category.amount, 0)).toBe(total);
    }
  });

  it("satu kategori per baris template", () => {
    expect(buildPlan(base).budget.map((c) => c.templateKey)).toEqual(
      BUDGET_TEMPLATE.map((c) => c.key),
    );
  });

  it("katering mendapat porsi terbesar", () => {
    const budget = buildPlan(base).budget;
    const largest = budget.reduce((a, b) => (b.amount > a.amount ? b : a));
    expect(largest.templateKey).toBe("catering");
  });
});

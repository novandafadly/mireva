import { describe, expect, it } from "vitest";
import { checklistItemSchema, groupByStage, statusSchema, type ChecklistItem } from "./schema";

const valid = {
  title: "  Pesan katering ",
  stage: "m6",
  description: "",
  notes: "",
  dueDate: "2026-11-10",
  assigneeMemberId: "",
};

describe("checklistItemSchema", () => {
  it("merapikan judul dan mengosongkan nilai opsional", () => {
    expect(checklistItemSchema.parse(valid)).toEqual({
      title: "Pesan katering",
      stage: "m6",
      description: "",
      notes: "",
      dueDate: "2026-11-10",
      assigneeMemberId: null,
    });
  });

  it("tenggat boleh kosong", () => {
    expect(checklistItemSchema.parse({ ...valid, dueDate: "" }).dueDate).toBeNull();
  });

  it("menolak judul kosong atau terlalu panjang", () => {
    expect(checklistItemSchema.safeParse({ ...valid, title: "   " }).success).toBe(false);
    expect(checklistItemSchema.safeParse({ ...valid, title: "x".repeat(201) }).success).toBe(false);
  });

  it("menolak tahap yang tidak dikenal", () => {
    expect(checklistItemSchema.safeParse({ ...valid, stage: "m2" }).success).toBe(false);
  });

  it("menolak tanggal yang tidak ada", () => {
    expect(checklistItemSchema.safeParse({ ...valid, dueDate: "2026-02-30" }).success).toBe(false);
  });

  it("penanggung jawab harus UUID bila diisi", () => {
    expect(checklistItemSchema.safeParse({ ...valid, assigneeMemberId: "tante" }).success).toBe(
      false,
    );
    const id = "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b";
    expect(checklistItemSchema.parse({ ...valid, assigneeMemberId: id }).assigneeMemberId).toBe(id);
  });
});

describe("statusSchema", () => {
  it("menerima empat status", () => {
    for (const status of ["todo", "in_progress", "done", "skipped"]) {
      expect(statusSchema.safeParse(status).success).toBe(true);
    }
    expect(statusSchema.safeParse("selesai").success).toBe(false);
  });
});

describe("groupByStage", () => {
  const item = (overrides: Partial<ChecklistItem>): ChecklistItem => ({
    id: "1",
    stage: "m6",
    kind: "general",
    title: "Tugas",
    description: "",
    notes: "",
    status: "todo",
    dueDate: null,
    assigneeMemberId: null,
    needsReview: false,
    sortOrder: 0,
    ...overrides,
  });

  it("mengurutkan tahap dari yang paling awal dan melewatkan tahap kosong", () => {
    const groups = groupByStage([
      item({ stage: "d0" }),
      item({ stage: "m12" }),
      item({ stage: "m3" }),
    ]);
    expect(groups.map((group) => group.stage)).toEqual(["m12", "m3", "d0"]);
  });

  it("mengurutkan tugas di dalam tahap menurut sort_order", () => {
    const groups = groupByStage([item({ id: "b", sortOrder: 2 }), item({ id: "a", sortOrder: 1 })]);
    expect(groups[0]!.items.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("menghitung selesai per tahap tanpa yang dilewati", () => {
    const groups = groupByStage([
      item({ status: "done" }),
      item({ status: "todo" }),
      item({ status: "skipped" }),
    ]);
    expect(groups[0]).toMatchObject({ done: 1, total: 2 });
  });
});

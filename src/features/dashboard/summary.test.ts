import { describe, expect, it } from "vitest";
import { checklistProgress, focusThisWeek, type ChecklistRow } from "./summary";

const row = (overrides: Partial<ChecklistRow>): ChecklistRow => ({
  id: "1",
  title: "Tugas",
  status: "todo",
  dueDate: null,
  ...overrides,
});

describe("checklistProgress", () => {
  it("menghitung selesai dari total, tanpa tugas yang dilewati", () => {
    const progress = checklistProgress([
      row({ status: "done" }),
      row({ status: "todo" }),
      row({ status: "in_progress" }),
      row({ status: "skipped" }),
    ]);
    expect(progress).toEqual({ done: 1, total: 3, percent: 33 });
  });

  it("tanpa tugas, persen nol", () => {
    expect(checklistProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
  });

  it("semua selesai berarti 100", () => {
    expect(checklistProgress([row({ status: "done" })]).percent).toBe(100);
  });
});

describe("focusThisWeek", () => {
  const today = "2027-03-10";

  it("memuat tugas yang jatuh tempo dalam 7 hari dan yang terlambat", () => {
    const items = [
      row({ id: "terlambat", dueDate: "2027-03-01" }),
      row({ id: "hari-ini", dueDate: "2027-03-10" }),
      row({ id: "h7", dueDate: "2027-03-17" }),
      row({ id: "h8", dueDate: "2027-03-18" }),
      row({ id: "tanpa-tenggat", dueDate: null }),
    ];
    expect(focusThisWeek(items, today).map((item) => item.id)).toEqual([
      "terlambat",
      "hari-ini",
      "h7",
    ]);
  });

  it("melewatkan tugas yang selesai atau dilewati", () => {
    const items = [
      row({ id: "selesai", dueDate: "2027-03-11", status: "done" }),
      row({ id: "dilewati", dueDate: "2027-03-11", status: "skipped" }),
      row({ id: "jalan", dueDate: "2027-03-11", status: "in_progress" }),
    ];
    expect(focusThisWeek(items, today).map((item) => item.id)).toEqual(["jalan"]);
  });

  it("mengurutkan dari tenggat paling awal dan menandai yang terlambat", () => {
    const focus = focusThisWeek(
      [row({ id: "b", dueDate: "2027-03-12" }), row({ id: "a", dueDate: "2027-03-05" })],
      today,
    );
    expect(focus.map((item) => [item.id, item.overdue])).toEqual([
      ["a", true],
      ["b", false],
    ]);
  });

  it("membatasi jumlah yang ditampilkan", () => {
    const items = Array.from({ length: 12 }, (_, index) =>
      row({ id: String(index), dueDate: "2027-03-11" }),
    );
    expect(focusThisWeek(items, today)).toHaveLength(5);
    expect(focusThisWeek(items, today, 8)).toHaveLength(8);
  });
});

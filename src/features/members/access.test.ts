import { describe, expect, it } from "vitest";
import { accessLevel, canEdit, canView } from "./access";

const owner = { role: "owner", status: "active", permissions: {} } as const;
const collaborator = {
  role: "collaborator",
  status: "active",
  permissions: { planning: "edit", budget: "view", guests: "none" },
} as const;

describe("accessLevel", () => {
  it("owner punya izin edit di semua modul", () => {
    expect(accessLevel(owner, "planning")).toBe("edit");
    expect(accessLevel(owner, "album")).toBe("edit");
  });

  it("kolaborator mengikuti izin per modul", () => {
    expect(accessLevel(collaborator, "planning")).toBe("edit");
    expect(accessLevel(collaborator, "budget")).toBe("view");
    expect(accessLevel(collaborator, "guests")).toBe("none");
  });

  it("modul tanpa izin berarti tanpa akses", () => {
    expect(accessLevel(collaborator, "vendors")).toBe("none");
  });

  it("wedding yang diarsipkan menurunkan edit menjadi view, sama seperti has_access", () => {
    expect(accessLevel({ ...owner, status: "archived" }, "planning")).toBe("view");
    expect(accessLevel({ ...collaborator, status: "archived" }, "planning")).toBe("view");
    expect(accessLevel({ ...collaborator, status: "archived" }, "guests")).toBe("none");
  });
});

describe("canView dan canEdit", () => {
  it("view dan edit sama-sama boleh melihat", () => {
    expect(canView(collaborator, "planning")).toBe(true);
    expect(canView(collaborator, "budget")).toBe(true);
    expect(canView(collaborator, "guests")).toBe(false);
  });

  it("hanya edit yang boleh mengubah", () => {
    expect(canEdit(collaborator, "planning")).toBe(true);
    expect(canEdit(collaborator, "budget")).toBe(false);
  });
});

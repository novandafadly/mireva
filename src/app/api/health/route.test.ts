import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("menjawab 200 dengan status ok", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("tidak boleh di-cache", () => {
    expect(GET().headers.get("cache-control")).toBe("no-store");
  });
});

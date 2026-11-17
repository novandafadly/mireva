import { describe, expect, it } from "vitest";
import {
  formatClock,
  instantToLocalInput,
  localInputToInstant,
  addDays,
  crewAccessExpiry,
  dateInZone,
  daysUntil,
  isWeddingTimezone,
  startOfDayInZone,
  timezoneLabel,
} from "./dates";

describe("isWeddingTimezone", () => {
  it("menerima tiga zona Indonesia", () => {
    expect(isWeddingTimezone("Asia/Jakarta")).toBe(true);
    expect(isWeddingTimezone("Asia/Makassar")).toBe(true);
    expect(isWeddingTimezone("Asia/Jayapura")).toBe(true);
  });

  it("menolak zona lain", () => {
    expect(isWeddingTimezone("Asia/Singapore")).toBe(false);
    expect(isWeddingTimezone("UTC")).toBe(false);
  });
});

describe("timezoneLabel", () => {
  it("memberi label WIB, WITA, WIT", () => {
    expect(timezoneLabel("Asia/Jakarta")).toBe("WIB");
    expect(timezoneLabel("Asia/Makassar")).toBe("WITA");
    expect(timezoneLabel("Asia/Jayapura")).toBe("WIT");
  });
});

describe("dateInZone", () => {
  it("memakai tanggal zona wedding, bukan UTC", () => {
    // 20.00 UTC = 03.00 WIB esok harinya
    const instant = new Date("2026-05-09T20:00:00Z");
    expect(dateInZone(instant, "Asia/Jakarta")).toBe("2026-05-10");
  });

  it("berbeda antar zona pada saat yang sama", () => {
    // 15.30 UTC = 22.30 WIB, 23.30 WITA, 00.30 WIT esok harinya
    const instant = new Date("2026-05-09T15:30:00Z");
    expect(dateInZone(instant, "Asia/Jakarta")).toBe("2026-05-09");
    expect(dateInZone(instant, "Asia/Makassar")).toBe("2026-05-09");
    expect(dateInZone(instant, "Asia/Jayapura")).toBe("2026-05-10");
  });
});

describe("startOfDayInZone", () => {
  it("mengembalikan tengah malam lokal sebagai instant", () => {
    expect(startOfDayInZone("2026-05-10", "Asia/Jakarta").toISOString()).toBe(
      "2026-05-09T17:00:00.000Z",
    );
    expect(startOfDayInZone("2026-05-10", "Asia/Jayapura").toISOString()).toBe(
      "2026-05-09T15:00:00.000Z",
    );
  });

  it("menolak tanggal yang tidak ada", () => {
    expect(() => startOfDayInZone("2026-02-30", "Asia/Jakarta")).toThrow(RangeError);
    expect(() => startOfDayInZone("10-05-2026", "Asia/Jakarta")).toThrow(RangeError);
  });
});

describe("addDays", () => {
  it("melewati batas bulan dan tahun", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("menangani tahun kabisat", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("menerima selisih negatif", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("daysUntil", () => {
  it("menghitung selisih hari kalender di zona wedding", () => {
    // 9 Mei 23.30 WIB; acara 10 Mei → 1 hari lagi
    const now = new Date("2026-05-09T16:30:00Z");
    expect(daysUntil("2026-05-10", now, "Asia/Jakarta")).toBe(1);
  });

  it("nol pada hari acara", () => {
    const now = new Date("2026-05-09T18:00:00Z"); // 10 Mei 01.00 WIB
    expect(daysUntil("2026-05-10", now, "Asia/Jakarta")).toBe(0);
  });

  it("negatif setelah acara lewat", () => {
    const now = new Date("2026-05-12T03:00:00Z");
    expect(daysUntil("2026-05-10", now, "Asia/Jakarta")).toBe(-2);
  });
});

describe("crewAccessExpiry", () => {
  it("berakhir di penghujung hari setelah acara terakhir, zona wedding", () => {
    // Acara 10 Mei. Berlaku sepanjang 11 Mei WIB, berakhir 12 Mei 00.00 WIB.
    expect(crewAccessExpiry("2026-05-10", "Asia/Jakarta").toISOString()).toBe(
      "2026-05-11T17:00:00.000Z",
    );
  });

  it("mengikuti zona WITA", () => {
    expect(crewAccessExpiry("2026-05-10", "Asia/Makassar").toISOString()).toBe(
      "2026-05-11T16:00:00.000Z",
    );
  });
});

describe("localInputToInstant dan instantToLocalInput", () => {
  it("menafsirkan isian datetime-local di zona wedding", () => {
    expect(localInputToInstant("2027-05-10T08:00", "Asia/Jakarta")).toBe(
      "2027-05-10T01:00:00.000Z",
    );
    expect(localInputToInstant("2027-05-10T08:00", "Asia/Jayapura")).toBe(
      "2027-05-09T23:00:00.000Z",
    );
  });

  it("bolak-balik menghasilkan nilai yang sama", () => {
    const instant = localInputToInstant("2027-12-31T23:45", "Asia/Makassar")!;
    expect(instantToLocalInput(instant, "Asia/Makassar")).toBe("2027-12-31T23:45");
  });

  it("melewati batas hari saat dikonversi balik", () => {
    expect(instantToLocalInput("2027-05-09T18:30:00Z", "Asia/Jakarta")).toBe("2027-05-10T01:30");
  });

  it("mengembalikan null untuk isian yang tidak sah", () => {
    expect(localInputToInstant("", "Asia/Jakarta")).toBeNull();
    expect(localInputToInstant("2027-02-30T08:00", "Asia/Jakarta")).toBeNull();
    expect(localInputToInstant("2027-05-10T25:00", "Asia/Jakarta")).toBeNull();
    expect(localInputToInstant("2027-05-10 08:00", "Asia/Jakarta")).toBeNull();
  });
});

describe("formatClock", () => {
  it("menampilkan jam di zona wedding dengan label zona", () => {
    expect(formatClock("2027-05-10T01:00:00Z", "Asia/Jakarta")).toBe("08.00 WIB");
    expect(formatClock("2027-05-10T01:05:00Z", "Asia/Makassar")).toBe("09.05 WITA");
  });
});

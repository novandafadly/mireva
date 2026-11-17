import { describe, expect, it } from "vitest";
import { brand } from "@/config/brand";
import { createFakeEmailSender } from "./fake";
import { memberInviteEmail } from "./templates";

describe("memberInviteEmail", () => {
  const message = memberInviteEmail({
    to: "dimas@example.com",
    inviterName: "Rina",
    weddingName: "Rina & Dimas",
    link: "https://contoh.test/gabung/abc",
  });

  it("dikirim ke alamat yang diundang", () => {
    expect(message.to).toBe("dimas@example.com");
  });

  it("memuat link, nama pengundang, dan nama wedding", () => {
    expect(message.text).toContain("https://contoh.test/gabung/abc");
    expect(message.text).toContain("Rina");
    expect(message.subject).toContain("Rina & Dimas");
  });

  it("mengambil nama produk dari brand", () => {
    expect(message.text).toContain(brand.name);
  });

  it("menyebut masa berlaku 7 hari", () => {
    expect(message.text).toContain("7 hari");
  });
});

describe("createFakeEmailSender", () => {
  it("mencatat pesan yang dikirim tanpa memanggil layanan luar", async () => {
    const sender = createFakeEmailSender();
    await sender.send({ to: "a@b.co", subject: "Halo", text: "Isi" });
    expect(sender.sent).toEqual([{ to: "a@b.co", subject: "Halo", text: "Isi" }]);
  });
});

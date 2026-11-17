import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import { brand } from "@/config/brand";
import messages from "../../messages/id.json";

const RULE_MESSAGE = "src/config/brand.ts";

async function lint(code: string, filePath: string) {
  const eslint = new ESLint();
  const [result] = await eslint.lintText(code, { filePath });
  return result!.messages.filter((message) => message.message.includes(RULE_MESSAGE));
}

describe("aturan lint brand", () => {
  it("menolak nama produk sebagai string literal", async () => {
    const code = `export const title = ${JSON.stringify(brand.name)};\n`;
    expect(await lint(code, "src/lib/contoh.ts")).toHaveLength(1);
  });

  it("menolak nama produk di dalam template literal", async () => {
    const code = `export const title = \`Selamat datang di ${brand.name}\`;\n`;
    expect(await lint(code, "src/lib/contoh.ts")).toHaveLength(1);
  });

  it("menolak nama produk di teks JSX, tanpa peduli huruf besar-kecil", async () => {
    const code = `export function Judul() {\n  return <h1>${brand.name.toUpperCase()}</h1>;\n}\n`;
    expect(await lint(code, "src/components/contoh.tsx")).toHaveLength(1);
  });

  it("mengizinkan string lain", async () => {
    const code = `export const title = "Undangan";\n`;
    expect(await lint(code, "src/lib/contoh.ts")).toHaveLength(0);
  });

  it("mengizinkan literal di src/config/brand.ts", async () => {
    const code = `export const brand = { name: ${JSON.stringify(brand.name)} };\n`;
    expect(await lint(code, "src/config/brand.ts")).toHaveLength(0);
  });
});

describe("katalog pesan", () => {
  it("tidak memuat nama produk, hanya placeholder {brand}", () => {
    const text = JSON.stringify(messages).toLowerCase();
    expect(text).not.toContain(brand.name.toLowerCase());
  });

  it("memakai placeholder {brand} di halaman depan", () => {
    expect(messages.home.title).toContain("{brand}");
  });
});

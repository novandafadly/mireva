import { readFileSync } from "node:fs";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

// D-001: nama produk hanya boleh ditulis di src/config/brand.ts.
// Nama dibaca dari file itu supaya aturan ikut berubah saat nama diganti.
const brandSource = readFileSync(new URL("./src/config/brand.ts", import.meta.url), "utf8");
const brandName = /name:\s*"([^"]+)"/.exec(brandSource)?.[1];
if (!brandName) {
  throw new Error("eslint.config.mjs: brand.name tidak ditemukan di src/config/brand.ts");
}
const brandPattern = `/${brandName.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}/i`;
const brandMessage =
  "Jangan menulis nama produk sebagai literal. Impor `brand` dari src/config/brand.ts.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    files: ["**/*.{ts,tsx,mts,js,jsx,mjs}"],
    ignores: ["src/config/brand.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: `Literal[value=${brandPattern}]`, message: brandMessage },
        { selector: `TemplateElement[value.raw=${brandPattern}]`, message: brandMessage },
        { selector: `JSXText[value=${brandPattern}]`, message: brandMessage },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/lib/supabase/database.types.ts",
  ]),
]);

export default eslintConfig;

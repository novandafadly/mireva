import type { ReactNode } from "react";
import { brand } from "@/config/brand";

/** Kerangka halaman auth: satu kolom sempit, nyaman di layar HP. */
export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-12">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{brand.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </header>
      {children}
    </main>
  );
}

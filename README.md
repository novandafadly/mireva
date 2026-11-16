# Platform persiapan pernikahan

Nama produk belum final dan hanya ditulis di `src/config/brand.ts`.

- Kebutuhan: [docs/BRIEF.md](docs/BRIEF.md)
- Spesifikasi: [docs/SPEC.md](docs/SPEC.md)
- Keputusan arsitektur: [docs/DECISIONS.md](docs/DECISIONS.md)

## Menjalankan

Butuh Node 22, pnpm, dan Docker (untuk Supabase lokal).

```bash
pnpm install
pnpm db:start          # Supabase lokal; salin URL dan kunci ke .env.local
cp .env.example .env.local
pnpm dev
```

## Pemeriksaan

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test              # Vitest
pnpm test:db           # pgTAP, butuh Supabase lokal
pnpm build
```

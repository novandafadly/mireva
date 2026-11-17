-- Modul 1.4: jadwal dan realisasi pembayaran. Lihat docs/SPEC.md bagian 4.1.
-- Kolom vendor_id ditambahkan bersama tabel vendors di modul 1.5.

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  budget_item_id uuid not null,
  label text not null check (length(btrim(label)) between 1 and 120),
  kind text not null default 'lainnya' check (kind in ('dp', 'termin', 'pelunasan', 'lainnya')),
  amount bigint not null check (amount > 0),
  due_date date,
  status text not null default 'scheduled' check (status in ('scheduled', 'paid', 'cancelled')),
  paid_at date,
  method text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Tanpa `on delete cascade`: item anggaran yang sudah punya pembayaran tidak
  -- bisa dihapus. Menghapus wedding tetap bisa karena pembayaran ikut terhapus
  -- lewat wedding_id sebelum pengecekan di akhir pernyataan.
  constraint payments_budget_item_fkey
    foreign key (budget_item_id, wedding_id)
    references public.budget_items (id, wedding_id),
  constraint payments_paid_at check ((status = 'paid') = (paid_at is not null))
);
create index payments_due_idx on public.payments (wedding_id, status, due_date);
create index payments_budget_item_idx on public.payments (budget_item_id);

create trigger payments_set_updated_at before update on public.payments
  for each row execute function private.set_updated_at();

revoke all on public.payments from public, anon, authenticated;
grant select, insert, update, delete on public.payments to authenticated;

alter table public.payments enable row level security;

create policy payments_select on public.payments for select to authenticated
  using (private.has_access(wedding_id, 'budget', 'view'));
create policy payments_insert on public.payments for insert to authenticated
  with check (private.has_access(wedding_id, 'budget', 'edit'));
create policy payments_update on public.payments for update to authenticated
  using (private.has_access(wedding_id, 'budget', 'edit'))
  with check (private.has_access(wedding_id, 'budget', 'edit'));
create policy payments_delete on public.payments for delete to authenticated
  using (private.has_access(wedding_id, 'budget', 'edit'));

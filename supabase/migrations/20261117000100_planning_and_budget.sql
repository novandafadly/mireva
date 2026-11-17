-- Modul 1.2: tabel yang diisi generator rencana (sesi acara, checklist, rundown,
-- kategori dan item anggaran). Layar CRUD-nya datang di modul 1.3 dan 1.4.
-- Lihat docs/SPEC.md bagian 4.1 dan 5.

-- Kunci gabungan supaya baris anak hanya bisa merujuk induk di wedding yang sama.
alter table public.wedding_members
  add constraint wedding_members_id_wedding_key unique (id, wedding_id);

-- ---------------------------------------------------------------------------
-- Sesi acara
-- ---------------------------------------------------------------------------
create table public.event_sessions (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  kind text not null check (kind in ('akad', 'pemberkatan', 'resepsi', 'adat', 'lainnya')),
  name text not null check (length(btrim(name)) between 1 and 120),
  starts_at timestamptz,
  ends_at timestamptz,
  venue_name text not null default '',
  venue_address text not null default '',
  maps_url text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, wedding_id),
  constraint event_sessions_time_range check (ends_at is null or starts_at is null or ends_at >= starts_at)
);
create index event_sessions_wedding_idx on public.event_sessions (wedding_id, sort_order);

create function private.event_sessions_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform 1 from public.weddings w where w.id = new.wedding_id for update;
  select count(*) into v_count from public.event_sessions s where s.wedding_id = new.wedding_id;
  if v_count >= private.wedding_limit(new.wedding_id, 'sessions.max') then
    raise exception 'limit_exceeded:sessions.max';
  end if;
  return new;
end;
$$;

create trigger event_sessions_limit before insert on public.event_sessions
  for each row execute function private.event_sessions_limit();
create trigger event_sessions_set_updated_at before update on public.event_sessions
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Checklist
-- ---------------------------------------------------------------------------
create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  stage text not null check (stage in ('m12', 'm9', 'm6', 'm3', 'm1', 'd7', 'd1', 'd0')),
  kind text not null default 'general' check (kind in ('general', 'admin_docs', 'adat')),
  title text not null check (length(btrim(title)) between 1 and 200),
  description text not null default '',
  notes text not null default '',
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'skipped')),
  due_date date,
  assignee_member_id uuid,
  source text not null default 'manual' check (source in ('template', 'manual', 'ai')),
  template_key text,
  needs_review boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checklist_items_assignee_fkey
    foreign key (assignee_member_id, wedding_id)
    references public.wedding_members (id, wedding_id)
    on delete set null (assignee_member_id)
);
create index checklist_items_stage_idx on public.checklist_items (wedding_id, stage, sort_order);
create index checklist_items_due_idx on public.checklist_items (wedding_id, due_date)
  where status <> 'done';
create index checklist_items_assignee_idx on public.checklist_items (assignee_member_id);

-- Pemanggil adalah penanggung jawab tugas, pada wedding yang tidak diarsipkan.
create function private.is_assignee(p_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.wedding_members m
    join public.weddings w on w.id = m.wedding_id
    where m.id = p_member_id and m.user_id = (select auth.uid()) and w.status = 'active'
  );
$$;

-- Penanggung jawab tanpa izin edit hanya boleh mengubah status dan catatan.
-- Security invoker: `current_user` harus peran pemanggil.
create function private.checklist_items_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon')
    and not private.has_access(old.wedding_id, 'planning', 'edit')
    and (to_jsonb(new) - 'status' - 'notes' - 'updated_at')
      <> (to_jsonb(old) - 'status' - 'notes' - 'updated_at') then
    raise exception 'assignee_can_only_change_status_and_notes' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger checklist_items_guard before update on public.checklist_items
  for each row execute function private.checklist_items_guard();
create trigger checklist_items_set_updated_at before update on public.checklist_items
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Rundown
-- ---------------------------------------------------------------------------
create table public.rundown_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  event_session_id uuid,
  title text not null check (length(btrim(title)) between 1 and 200),
  starts_at timestamptz,
  duration_min integer check (duration_min >= 0),
  pic_text text not null default '',
  pic_member_id uuid,
  location text not null default '',
  notes text not null default '',
  template_key text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rundown_items_session_fkey
    foreign key (event_session_id, wedding_id)
    references public.event_sessions (id, wedding_id)
    on delete set null (event_session_id),
  constraint rundown_items_pic_fkey
    foreign key (pic_member_id, wedding_id)
    references public.wedding_members (id, wedding_id)
    on delete set null (pic_member_id)
);
create index rundown_items_time_idx on public.rundown_items (wedding_id, starts_at);
create index rundown_items_session_idx on public.rundown_items (event_session_id);

create trigger rundown_items_set_updated_at before update on public.rundown_items
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Anggaran
-- ---------------------------------------------------------------------------
create table public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  template_key text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, wedding_id)
);
create unique index budget_categories_name_idx
  on public.budget_categories (wedding_id, lower(name));

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  category_id uuid not null,
  name text not null check (length(btrim(name)) between 1 and 120),
  pricing_mode text not null default 'fixed' check (pricing_mode in ('fixed', 'per_pax')),
  estimated_amount bigint not null default 0 check (estimated_amount >= 0),
  unit_price bigint check (unit_price >= 0),
  pax_basis text check (pax_basis in ('guest_estimate', 'rsvp', 'manual')),
  pax_manual integer check (pax_manual >= 0),
  notes text not null default '',
  template_key text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, wedding_id),
  constraint budget_items_category_fkey
    foreign key (category_id, wedding_id)
    references public.budget_categories (id, wedding_id)
    on delete cascade,
  constraint budget_items_per_pax check (
    pricing_mode = 'fixed' or (unit_price is not null and pax_basis is not null)
  )
);
create index budget_items_category_idx on public.budget_items (wedding_id, category_id, sort_order);

create trigger budget_categories_set_updated_at before update on public.budget_categories
  for each row execute function private.set_updated_at();
create trigger budget_items_set_updated_at before update on public.budget_items
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Hak (D-026)
-- ---------------------------------------------------------------------------
revoke all on public.event_sessions, public.checklist_items, public.rundown_items,
  public.budget_categories, public.budget_items from public, anon, authenticated;
grant select, insert, update, delete on public.event_sessions, public.checklist_items,
  public.rundown_items, public.budget_categories, public.budget_items to authenticated;

revoke all on function private.event_sessions_limit(), private.is_assignee(uuid),
  private.checklist_items_guard() from public, anon, authenticated;
grant execute on function private.is_assignee(uuid) to authenticated;
grant execute on all functions in schema private to service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.event_sessions enable row level security;
alter table public.checklist_items enable row level security;
alter table public.rundown_items enable row level security;
alter table public.budget_categories enable row level security;
alter table public.budget_items enable row level security;

-- event_sessions: semua anggota membaca; tulis butuh izin edit modul tamu.
create policy event_sessions_select on public.event_sessions for select to authenticated
  using (private.is_member(wedding_id));
create policy event_sessions_insert on public.event_sessions for insert to authenticated
  with check (private.has_access(wedding_id, 'guests', 'edit'));
create policy event_sessions_update on public.event_sessions for update to authenticated
  using (private.has_access(wedding_id, 'guests', 'edit'))
  with check (private.has_access(wedding_id, 'guests', 'edit'));
create policy event_sessions_delete on public.event_sessions for delete to authenticated
  using (private.has_access(wedding_id, 'guests', 'edit'));

-- checklist_items: modul planning. Penanggung jawab boleh update (dibatasi trigger).
create policy checklist_items_select on public.checklist_items for select to authenticated
  using (private.has_access(wedding_id, 'planning', 'view'));
create policy checklist_items_insert on public.checklist_items for insert to authenticated
  with check (private.has_access(wedding_id, 'planning', 'edit'));
create policy checklist_items_update on public.checklist_items for update to authenticated
  using (
    private.has_access(wedding_id, 'planning', 'edit') or private.is_assignee(assignee_member_id)
  )
  with check (
    private.has_access(wedding_id, 'planning', 'edit') or private.is_assignee(assignee_member_id)
  );
create policy checklist_items_delete on public.checklist_items for delete to authenticated
  using (private.has_access(wedding_id, 'planning', 'edit'));

-- rundown_items: modul planning.
create policy rundown_items_select on public.rundown_items for select to authenticated
  using (private.has_access(wedding_id, 'planning', 'view'));
create policy rundown_items_insert on public.rundown_items for insert to authenticated
  with check (private.has_access(wedding_id, 'planning', 'edit'));
create policy rundown_items_update on public.rundown_items for update to authenticated
  using (private.has_access(wedding_id, 'planning', 'edit'))
  with check (private.has_access(wedding_id, 'planning', 'edit'));
create policy rundown_items_delete on public.rundown_items for delete to authenticated
  using (private.has_access(wedding_id, 'planning', 'edit'));

-- budget_categories, budget_items: modul budget.
create policy budget_categories_select on public.budget_categories for select to authenticated
  using (private.has_access(wedding_id, 'budget', 'view'));
create policy budget_categories_insert on public.budget_categories for insert to authenticated
  with check (private.has_access(wedding_id, 'budget', 'edit'));
create policy budget_categories_update on public.budget_categories for update to authenticated
  using (private.has_access(wedding_id, 'budget', 'edit'))
  with check (private.has_access(wedding_id, 'budget', 'edit'));
create policy budget_categories_delete on public.budget_categories for delete to authenticated
  using (private.has_access(wedding_id, 'budget', 'edit'));

create policy budget_items_select on public.budget_items for select to authenticated
  using (private.has_access(wedding_id, 'budget', 'view'));
create policy budget_items_insert on public.budget_items for insert to authenticated
  with check (private.has_access(wedding_id, 'budget', 'edit'));
create policy budget_items_update on public.budget_items for update to authenticated
  using (private.has_access(wedding_id, 'budget', 'edit'))
  with check (private.has_access(wedding_id, 'budget', 'edit'));
create policy budget_items_delete on public.budget_items for delete to authenticated
  using (private.has_access(wedding_id, 'budget', 'edit'));

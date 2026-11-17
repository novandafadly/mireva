-- Modul 1.1: akun, wedding bersama, anggota, undangan anggota, paket.
-- Lihat docs/SPEC.md bagian 4.1, 5, 7 dan docs/DECISIONS.md D-003, D-004, D-012, D-026.

create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Hak bawaan
-- ---------------------------------------------------------------------------
-- Supabase memberi anon dan authenticated hak penuh atas tabel baru di `public`.
-- Di proyek ini hak diberikan satu per satu, dan anon tidak mendapat apa pun (D-005).
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- Skema `private`: fungsi bantu RLS dan tabel internal. Tidak diekspos PostgREST.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Fungsi umum
-- ---------------------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Izin per modul: objek { modul: 'none' | 'view' | 'edit' }.
create function private.valid_permissions(p_permissions jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_permissions) = 'object'
    and not exists (
      select 1
      from jsonb_each(p_permissions) as entry(key, value)
      where entry.key not in (
          'planning', 'budget', 'vendors', 'guests', 'invitation', 'event_day',
          'registry', 'seserahan', 'moodboard', 'album'
        )
        or jsonb_typeof(entry.value) <> 'string'
        or entry.value #>> '{}' not in ('none', 'view', 'edit')
    );
$$;

-- ---------------------------------------------------------------------------
-- Tabel
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  locale text not null default 'id',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Katalog paket. Wedding menyimpan salinan limit, bukan rujukan (D-012).
create table public.plans (
  key text primary key,
  name text not null,
  price_idr bigint check (price_idr >= 0),
  limits jsonb not null check (jsonb_typeof(limits) = 'object'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weddings (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (length(btrim(display_name)) between 1 and 120),
  partner_a_name text not null check (length(btrim(partner_a_name)) between 1 and 80),
  partner_b_name text not null check (length(btrim(partner_b_name)) between 1 and 80),
  date_start date,
  date_end date,
  date_is_final boolean not null default false,
  city text not null default '',
  timezone text not null default 'Asia/Jakarta'
    check (timezone in ('Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura')),
  customs text[] not null default '{}' check (cardinality(customs) <= 2),
  guest_estimate integer not null default 0 check (guest_estimate >= 0),
  total_budget bigint not null default 0 check (total_budget >= 0),
  guest_quota_groom integer check (guest_quota_groom >= 0),
  guest_quota_bride integer check (guest_quota_bride >= 0),
  plan text not null references public.plans (key),
  limits jsonb not null check (jsonb_typeof(limits) = 'object'),
  status text not null default 'active' check (status in ('active', 'archived')),
  archived_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weddings_date_range check (date_end is null or date_start is null or date_end >= date_start)
);

create table public.wedding_members (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'collaborator')),
  permissions jsonb not null default '{}'::jsonb
    constraint wedding_members_permissions_valid check (private.valid_permissions(permissions)),
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wedding_id, user_id)
);
create index wedding_members_user_id_idx on public.wedding_members (user_id);

create table public.wedding_invites (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  email extensions.citext not null check (position('@' in email::text) > 1),
  role text not null check (role in ('owner', 'collaborator')),
  permissions jsonb not null default '{}'::jsonb
    constraint wedding_invites_permissions_valid check (private.valid_permissions(permissions)),
  token_hash text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index wedding_invites_active_email_idx
  on public.wedding_invites (wedding_id, email)
  where accepted_at is null and revoked_at is null;

-- ---------------------------------------------------------------------------
-- Katalog paket awal. Angka limit masih sementara (SPEC pertanyaan 4).
-- ---------------------------------------------------------------------------
insert into public.plans (key, name, price_idr, limits) values
  ('free', 'Gratis', 0, '{
    "guests.max": 100, "sessions.max": 2, "members.max": 2,
    "invitation.watermark": true, "invitation.premium_templates": false,
    "checkin.enabled": false, "finance.advanced": false, "album.enabled": false,
    "ai.monthly_tokens": 0
  }'),
  ('paid', 'Berbayar', null, '{
    "guests.max": 500, "sessions.max": 4, "members.max": 10,
    "invitation.watermark": false, "invitation.premium_templates": true,
    "checkin.enabled": true, "finance.advanced": true, "album.enabled": true,
    "ai.monthly_tokens": 500000
  }'),
  -- Selama Fase 1 dan 2 semua wedding memakai paket ini (SPEC pertanyaan 3).
  ('beta', 'Beta', 0, '{
    "guests.max": 500, "sessions.max": 4, "members.max": 20,
    "invitation.watermark": false, "invitation.premium_templates": true,
    "checkin.enabled": true, "finance.advanced": true, "album.enabled": true,
    "ai.monthly_tokens": 500000
  }');

-- ---------------------------------------------------------------------------
-- Fungsi bantu RLS (security definer supaya tidak rekursif pada wedding_members)
-- ---------------------------------------------------------------------------
create function private.is_member(p_wedding_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.wedding_members m
    where m.wedding_id = p_wedding_id and m.user_id = (select auth.uid())
  );
$$;

create function private.is_owner(p_wedding_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.wedding_members m
    where m.wedding_id = p_wedding_id and m.user_id = (select auth.uid()) and m.role = 'owner'
  );
$$;

-- Owner pada wedding yang tidak diarsipkan. Dipakai untuk tulis di luar modul.
create function private.can_manage(p_wedding_id uuid)
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
    where m.wedding_id = p_wedding_id
      and m.user_id = (select auth.uid())
      and m.role = 'owner'
      and w.status = 'active'
  );
$$;

-- Akses modul. `p_level`: 'view' atau 'edit'. Wedding yang diarsipkan menolak 'edit'.
create function private.has_access(p_wedding_id uuid, p_module text, p_level text)
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
    where m.wedding_id = p_wedding_id
      and m.user_id = (select auth.uid())
      and case p_level
        when 'view' then m.role = 'owner' or m.permissions ->> p_module in ('view', 'edit')
        when 'edit' then w.status = 'active'
          and (m.role = 'owner' or m.permissions ->> p_module = 'edit')
        else false
      end
  );
$$;

create function private.shares_wedding(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.wedding_members mine
    join public.wedding_members theirs on theirs.wedding_id = mine.wedding_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = p_user_id
  );
$$;

create function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid()));
$$;

-- Satu-satunya pembaca limit di sisi database (D-012). Kunci yang tidak ada = 0.
create function private.wedding_limit(p_wedding_id uuid, p_key text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select (w.limits ->> p_key)::integer from public.weddings w where w.id = p_wedding_id),
    0
  );
$$;

-- ---------------------------------------------------------------------------
-- Trigger
-- ---------------------------------------------------------------------------
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Menjaga kolom yang tidak boleh diubah klien dan aturan arsip.
-- Sengaja security invoker: `current_user` harus peran pemanggil.
create function private.weddings_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.plan is distinct from old.plan or new.limits is distinct from old.limits then
      raise exception 'plan_and_limits_are_server_managed' using errcode = '42501';
    end if;
    if new.id <> old.id or new.created_by is distinct from old.created_by then
      raise exception 'immutable_column' using errcode = '42501';
    end if;
    if old.status = 'archived'
      and not (
        new.status = 'active'
        and (to_jsonb(new) - 'status' - 'archived_at' - 'updated_at')
          = (to_jsonb(old) - 'status' - 'archived_at' - 'updated_at')
      ) then
      raise exception 'wedding_archived' using errcode = '42501';
    end if;
  end if;

  if new.status = 'archived' and old.status <> 'archived' then
    new.archived_at := now();
  elsif new.status = 'active' then
    new.archived_at := null;
  end if;
  return new;
end;
$$;

create function private.wedding_members_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if tg_op = 'UPDATE' and (new.wedding_id <> old.wedding_id or new.user_id <> old.user_id) then
    raise exception 'immutable_column' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and new.role = old.role then
    return new;
  end if;

  -- Kunci baris wedding supaya dua transaksi tidak sama-sama lolos hitungan.
  perform 1 from public.weddings w where w.id = new.wedding_id for update;

  if new.role = 'owner' then
    select count(*) into v_count
    from public.wedding_members m
    where m.wedding_id = new.wedding_id and m.role = 'owner';
    if v_count >= 2 then
      raise exception 'max_two_owners' using errcode = '23514';
    end if;
  else
    select count(*) into v_count
    from public.wedding_members m
    where m.wedding_id = new.wedding_id and m.role = 'collaborator';
    if v_count >= private.wedding_limit(new.wedding_id, 'members.max') then
      raise exception 'limit_exceeded:members.max';
    end if;
  end if;
  return new;
end;
$$;

create function private.wedding_members_keep_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner') then
    -- Saat wedding sendiri dihapus (cascade), baris wedding sudah tidak ada.
    if exists (select 1 from public.weddings w where w.id = old.wedding_id)
      and not exists (
        select 1 from public.wedding_members m
        where m.wedding_id = old.wedding_id and m.role = 'owner' and m.id <> old.id
      ) then
      raise exception 'last_owner' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger plans_set_updated_at before update on public.plans
  for each row execute function private.set_updated_at();
create trigger weddings_guard before update on public.weddings
  for each row execute function private.weddings_guard();
create trigger weddings_set_updated_at before update on public.weddings
  for each row execute function private.set_updated_at();
create trigger wedding_members_guard before insert or update on public.wedding_members
  for each row execute function private.wedding_members_guard();
create trigger wedding_members_keep_last_owner before update or delete on public.wedding_members
  for each row execute function private.wedding_members_keep_last_owner();
create trigger wedding_members_set_updated_at before update on public.wedding_members
  for each row execute function private.set_updated_at();
create trigger wedding_invites_set_updated_at before update on public.wedding_invites
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Fungsi publik (RPC)
-- ---------------------------------------------------------------------------
-- Membuat wedding dan menjadikan pemanggil sebagai owner, dalam satu transaksi.
-- Modul 1.2 menambahkan pembuatan checklist, rundown, dan anggaran dari template.
create function public.create_wedding(
  p_display_name text,
  p_partner_a_name text,
  p_partner_b_name text,
  p_date_start date default null,
  p_date_end date default null,
  p_date_is_final boolean default false,
  p_city text default '',
  p_timezone text default 'Asia/Jakarta',
  p_customs text[] default '{}',
  p_guest_estimate integer default 0,
  p_total_budget bigint default 0
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_wedding_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  insert into public.weddings (
    display_name, partner_a_name, partner_b_name, date_start, date_end, date_is_final,
    city, timezone, customs, guest_estimate, total_budget, plan, limits, created_by
  )
  select
    p_display_name, p_partner_a_name, p_partner_b_name, p_date_start, p_date_end,
    p_date_is_final, p_city, p_timezone, p_customs, p_guest_estimate, p_total_budget,
    p.key, p.limits, v_user_id
  from public.plans p
  where p.key = 'beta'
  returning id into v_wedding_id;

  if v_wedding_id is null then
    raise exception 'default_plan_missing';
  end if;

  insert into public.wedding_members (wedding_id, user_id, role)
  values (v_wedding_id, v_user_id, 'owner');

  return v_wedding_id;
end;
$$;

-- Menerima undangan anggota. Server mengirim hash dari token di link.
create function public.accept_wedding_invite(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_invite public.wedding_invites%rowtype;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_invite
  from public.wedding_invites i
  where i.token_hash = p_token_hash and i.accepted_at is null and i.revoked_at is null
  for update;

  if not found then
    raise exception 'invite_not_found';
  end if;
  if v_invite.expires_at <= now() then
    raise exception 'invite_expired';
  end if;

  select u.email into v_email from auth.users u where u.id = v_user_id;
  if v_email is null or lower(v_email) <> lower(v_invite.email::text) then
    raise exception 'invite_email_mismatch';
  end if;

  if exists (
    select 1 from public.weddings w where w.id = v_invite.wedding_id and w.status <> 'active'
  ) then
    raise exception 'wedding_archived';
  end if;

  if exists (
    select 1 from public.wedding_members m
    where m.wedding_id = v_invite.wedding_id and m.user_id = v_user_id
  ) then
    raise exception 'already_member';
  end if;

  insert into public.wedding_members (wedding_id, user_id, role, permissions)
  values (
    v_invite.wedding_id,
    v_user_id,
    v_invite.role,
    case when v_invite.role = 'owner' then '{}'::jsonb else v_invite.permissions end
  );

  update public.wedding_invites set accepted_at = now() where id = v_invite.id;

  return v_invite.wedding_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Hak
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select on public.plans to authenticated;
grant select, update, delete on public.weddings to authenticated;
grant select, update, delete on public.wedding_members to authenticated;
grant select, insert, update, delete on public.wedding_invites to authenticated;

grant execute on function public.create_wedding(
  text, text, text, date, date, boolean, text, text, text[], integer, bigint
) to authenticated;
grant execute on function public.accept_wedding_invite(text) to authenticated;

grant execute on function
  private.valid_permissions(jsonb),
  private.is_member(uuid),
  private.is_owner(uuid),
  private.can_manage(uuid),
  private.has_access(uuid, text, text),
  private.shares_wedding(uuid),
  private.is_platform_admin()
to authenticated;

grant execute on all functions in schema private to service_role;
grant execute on all functions in schema public to service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.plans enable row level security;
alter table public.weddings enable row level security;
alter table public.wedding_members enable row level security;
alter table public.wedding_invites enable row level security;

-- profiles: diri sendiri dan sesama anggota wedding.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_wedding(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- platform_admins: tanpa kebijakan. Hanya lewat private.is_platform_admin().

-- plans: katalog, hanya baca.
create policy plans_select on public.plans for select to authenticated using (true);

-- weddings: insert hanya lewat create_wedding().
create policy weddings_select on public.weddings for select to authenticated
  using (private.is_member(id));
create policy weddings_update on public.weddings for update to authenticated
  using (private.is_owner(id))
  with check (private.is_owner(id));
create policy weddings_delete on public.weddings for delete to authenticated
  using (private.is_owner(id));

-- wedding_members: insert hanya lewat create_wedding() dan accept_wedding_invite().
create policy wedding_members_select on public.wedding_members for select to authenticated
  using (private.is_member(wedding_id));
create policy wedding_members_update on public.wedding_members for update to authenticated
  using (private.can_manage(wedding_id))
  with check (private.can_manage(wedding_id));
create policy wedding_members_delete on public.wedding_members for delete to authenticated
  using (private.can_manage(wedding_id));

-- wedding_invites: hanya owner.
create policy wedding_invites_select on public.wedding_invites for select to authenticated
  using (private.is_owner(wedding_id));
create policy wedding_invites_insert on public.wedding_invites for insert to authenticated
  with check (private.can_manage(wedding_id) and invited_by = (select auth.uid()));
create policy wedding_invites_update on public.wedding_invites for update to authenticated
  using (private.can_manage(wedding_id))
  with check (private.can_manage(wedding_id));
create policy wedding_invites_delete on public.wedding_invites for delete to authenticated
  using (private.can_manage(wedding_id));

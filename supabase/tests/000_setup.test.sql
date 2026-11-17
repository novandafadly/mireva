-- Menyiapkan pgTAP dan fungsi bantu untuk semua berkas tes (D-024).
-- Berkas ini sengaja TIDAK di-rollback: berkas tes lain berjalan di sesi
-- terpisah dan butuh skema `tests`. Hanya dijalankan di database lokal dan CI.

create extension if not exists pgtap with schema extensions;

create schema if not exists tests;
grant usage on schema tests to anon, authenticated, service_role;

-- Membuat pengguna auth. Trigger aplikasi ikut membuat baris `profiles`.
create or replace function tests.create_user(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (v_id, p_email, jsonb_build_object('full_name', split_part(p_email, '@', 1)));
  return v_id;
end;
$$;

-- Bertindak sebagai pengguna login (peran `authenticated`, RLS berlaku).
create or replace function tests.login(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- Bertindak sebagai pengunjung tanpa sesi (peran `anon`).
create or replace function tests.login_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
end;
$$;

-- Kembali ke peran pemilik tes (melewati RLS) untuk menyiapkan atau memeriksa data.
create or replace function tests.logout()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- Membuat wedding sebagai pengguna tersebut lewat fungsi publik, lalu logout.
create or replace function tests.create_wedding(p_owner uuid, p_name text default 'Rina & Dimas')
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  perform tests.login(p_owner);
  v_id := public.create_wedding(
    p_display_name => p_name,
    p_partner_a_name => 'Rina',
    p_partner_b_name => 'Dimas',
    p_date_start => date '2027-05-10',
    p_city => 'Bandung',
    p_guest_estimate => 300,
    p_total_budget => 150000000
  );
  perform tests.logout();
  return v_id;
end;
$$;

-- Menambahkan kolaborator langsung (melewati alur undangan) untuk menyiapkan tes.
create or replace function tests.add_collaborator(
  p_wedding uuid, p_user uuid, p_permissions jsonb default '{}'::jsonb
)
returns void
language plpgsql
as $$
begin
  perform tests.logout();
  insert into public.wedding_members (wedding_id, user_id, role, permissions)
  values (p_wedding, p_user, 'collaborator', p_permissions);
end;
$$;

grant execute on all functions in schema tests to anon, authenticated, service_role;

begin;
select plan(1);
select has_schema('public');
select * from finish();
rollback;

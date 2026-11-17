-- Modul 1.2: create_wedding() menyimpan wedding beserta rencana awal (sesi,
-- checklist, rundown, alokasi anggaran) dalam satu transaksi. Lihat SPEC 6.1.

-- Jenis upacara hanya dipakai untuk memilih template. Tidak ditampilkan ke tamu.
alter table public.weddings
  add column ceremony_type text check (ceremony_type in ('akad', 'pemberkatan', 'lainnya'));

drop function public.create_wedding(
  text, text, text, date, date, boolean, text, text, text[], integer, bigint
);

-- `p_plan` dibuat generator di server aplikasi (src/features/onboarding/plan.ts):
--   { sessions: [...], checklist: [...], rundown: [...], budget: [...] }
-- Isinya tetap divalidasi oleh constraint dan trigger tabel, termasuk batas paket.
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
  p_total_budget bigint default 0,
  p_ceremony_type text default null,
  p_plan jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_wedding_id uuid;
  v_plan jsonb := coalesce(p_plan, '{}'::jsonb);
  v_part text;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  foreach v_part in array array['sessions', 'checklist', 'rundown', 'budget'] loop
    if v_plan ? v_part and (
      jsonb_typeof(v_plan -> v_part) <> 'array' or jsonb_array_length(v_plan -> v_part) > 500
    ) then
      raise exception 'plan_too_large';
    end if;
  end loop;

  insert into public.weddings (
    display_name, partner_a_name, partner_b_name, date_start, date_end, date_is_final,
    city, timezone, customs, guest_estimate, total_budget, ceremony_type, plan, limits, created_by
  )
  select
    p_display_name, p_partner_a_name, p_partner_b_name, p_date_start, p_date_end,
    p_date_is_final, p_city, p_timezone, p_customs, p_guest_estimate, p_total_budget,
    p_ceremony_type, p.key, p.limits, v_user_id
  from public.plans p
  where p.key = 'beta'
  returning id into v_wedding_id;

  if v_wedding_id is null then
    raise exception 'default_plan_missing';
  end if;

  insert into public.wedding_members (wedding_id, user_id, role)
  values (v_wedding_id, v_user_id, 'owner');

  insert into public.event_sessions (wedding_id, kind, name, starts_at, ends_at, sort_order)
  select v_wedding_id, s.kind, s.name, s.starts_at, s.ends_at, coalesce(s.sort_order, 0)
  from jsonb_to_recordset(coalesce(v_plan -> 'sessions', '[]'::jsonb)) as s(
    kind text, name text, starts_at timestamptz, ends_at timestamptz, sort_order integer
  )
  order by s.sort_order;

  insert into public.checklist_items (
    wedding_id, stage, kind, title, description, due_date, source, template_key,
    needs_review, sort_order
  )
  select
    v_wedding_id, c.stage, coalesce(c.kind, 'general'), c.title, coalesce(c.description, ''),
    c.due_date, 'template', c.template_key, coalesce(c.needs_review, false),
    coalesce(c.sort_order, 0)
  from jsonb_to_recordset(coalesce(v_plan -> 'checklist', '[]'::jsonb)) as c(
    stage text, kind text, title text, description text, due_date date, template_key text,
    needs_review boolean, sort_order integer
  );

  insert into public.rundown_items (
    wedding_id, event_session_id, title, starts_at, duration_min, template_key, sort_order
  )
  select
    v_wedding_id,
    (select s.id from public.event_sessions s
      where s.wedding_id = v_wedding_id and s.sort_order = r.session_sort_order
      limit 1),
    r.title, r.starts_at, r.duration_min, r.template_key, coalesce(r.sort_order, 0)
  from jsonb_to_recordset(coalesce(v_plan -> 'rundown', '[]'::jsonb)) as r(
    session_sort_order integer, title text, starts_at timestamptz, duration_min integer,
    template_key text, sort_order integer
  );

  -- Tiap kategori mendapat satu item "Perkiraan awal" berisi alokasinya.
  with categories as (
    insert into public.budget_categories (wedding_id, name, template_key, sort_order)
    select v_wedding_id, b.name, b.template_key, coalesce(b.sort_order, 0)
    from jsonb_to_recordset(coalesce(v_plan -> 'budget', '[]'::jsonb)) as b(
      name text, template_key text, sort_order integer
    )
    returning id, name
  )
  insert into public.budget_items (wedding_id, category_id, name, estimated_amount, template_key)
  select v_wedding_id, c.id, 'Perkiraan awal', b.amount, 'initial_allocation'
  from categories c
  join jsonb_to_recordset(coalesce(v_plan -> 'budget', '[]'::jsonb)) as b(name text, amount bigint)
    on b.name = c.name;

  return v_wedding_id;
end;
$$;

revoke all on function public.create_wedding(
  text, text, text, date, date, boolean, text, text, text[], integer, bigint, text, jsonb
) from public, anon, authenticated;
grant execute on function public.create_wedding(
  text, text, text, date, date, boolean, text, text, text[], integer, bigint, text, jsonb
) to authenticated, service_role;

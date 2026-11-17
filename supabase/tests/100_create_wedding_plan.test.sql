begin;
select plan(17);

select tests.create_user('rina@example.com') as rina \gset

select tests.login(:'rina');
select public.create_wedding(
  p_display_name => 'Rina & Dimas',
  p_partner_a_name => 'Rina',
  p_partner_b_name => 'Dimas',
  p_date_start => date '2027-05-10',
  p_total_budget => 100000000,
  p_ceremony_type => 'akad',
  p_plan => '{
    "sessions": [
      {"kind": "akad", "name": "Akad nikah", "starts_at": "2027-05-10T01:00:00Z",
       "ends_at": "2027-05-10T02:30:00Z", "sort_order": 0},
      {"kind": "resepsi", "name": "Resepsi", "starts_at": "2027-05-10T04:00:00Z",
       "ends_at": "2027-05-10T07:00:00Z", "sort_order": 1}
    ],
    "checklist": [
      {"stage": "m6", "kind": "general", "title": "Pesan katering", "description": "",
       "due_date": "2026-11-11", "template_key": "general.catering_book", "needs_review": false,
       "sort_order": 0},
      {"stage": "m3", "kind": "admin_docs", "title": "Tanya syarat ke KUA", "description": "Draf.",
       "due_date": null, "template_key": "admin.kua.requirements", "needs_review": true,
       "sort_order": 1}
    ],
    "rundown": [
      {"session_sort_order": 0, "title": "Ijab kabul", "starts_at": "2027-05-10T01:35:00Z",
       "duration_min": 20, "template_key": "akad.ijab", "sort_order": 0},
      {"session_sort_order": 1, "title": "Penerimaan tamu", "starts_at": "2027-05-10T04:00:00Z",
       "duration_min": 30, "template_key": "resepsi.open", "sort_order": 1}
    ],
    "budget": [
      {"name": "Katering", "template_key": "catering", "amount": 60000000, "sort_order": 0},
      {"name": "Dana cadangan", "template_key": "reserve", "amount": 40000000, "sort_order": 1}
    ]
  }'::jsonb
) as wedding \gset
select tests.logout();

select is((select ceremony_type from public.weddings where id = :'wedding'), 'akad', 'jenis upacara tersimpan');
select is((select count(*) from public.event_sessions where wedding_id = :'wedding')::int, 2, 'sesi dibuat');
select is((select count(*) from public.checklist_items where wedding_id = :'wedding')::int, 2, 'checklist dibuat');
select is(
  (select count(*) from public.checklist_items where wedding_id = :'wedding' and source = 'template')::int, 2,
  'tugas dari generator bersumber template'
);
select is(
  (select needs_review from public.checklist_items where template_key = 'admin.kua.requirements'
     and wedding_id = :'wedding'),
  true, 'tanda perlu direviu tersimpan'
);
select is(
  (select due_date from public.checklist_items where template_key = 'general.catering_book'
     and wedding_id = :'wedding'),
  date '2026-11-11', 'tenggat tersimpan'
);
select is((select count(*) from public.rundown_items where wedding_id = :'wedding')::int, 2, 'rundown dibuat');
select is(
  (select s.kind from public.rundown_items r join public.event_sessions s on s.id = r.event_session_id
    where r.template_key = 'resepsi.open' and r.wedding_id = :'wedding'),
  'resepsi', 'acara rundown terhubung ke sesi yang benar'
);
select is((select count(*) from public.budget_categories where wedding_id = :'wedding')::int, 2, 'kategori dibuat');
select is(
  (select sum(estimated_amount)::bigint from public.budget_items where wedding_id = :'wedding'),
  100000000::bigint, 'jumlah alokasi sama dengan total anggaran'
);
select is(
  (select i.estimated_amount from public.budget_items i
     join public.budget_categories c on c.id = i.category_id
    where c.template_key = 'catering' and i.wedding_id = :'wedding'),
  60000000::bigint, 'alokasi masuk ke kategori yang benar'
);

-- Tanpa rencana: hanya wedding dan owner.
select tests.login(:'rina');
select public.create_wedding(
  p_display_name => 'A & B', p_partner_a_name => 'A', p_partner_b_name => 'B'
) as bare \gset
select tests.logout();
select is((select count(*) from public.checklist_items where wedding_id = :'bare')::int, 0, 'tanpa rencana tidak ada checklist');

-- Satu bagian yang rusak membatalkan semuanya.
select tests.login(:'rina');
select throws_ok(
  $$select public.create_wedding(
      p_display_name => 'Gagal', p_partner_a_name => 'A', p_partner_b_name => 'B',
      p_plan => '{"checklist": [{"stage": "m2", "title": "Tahap salah"}],
                  "budget": [{"name": "Katering", "amount": 1}]}'::jsonb)$$,
  '23514', null, 'rencana dengan tahap tidak sah ditolak'
);
select tests.logout();
select is(
  (select count(*) from public.weddings where display_name = 'Gagal')::int, 0,
  'wedding tidak terbuat bila rencana gagal'
);

-- Batas paket tetap berlaku untuk rencana.
select tests.login(:'rina');
select throws_ok(
  $$select public.create_wedding(
      p_display_name => 'Banyak sesi', p_partner_a_name => 'A', p_partner_b_name => 'B',
      p_plan => '{"sessions": [
        {"kind": "resepsi", "name": "1", "sort_order": 0}, {"kind": "resepsi", "name": "2", "sort_order": 1},
        {"kind": "resepsi", "name": "3", "sort_order": 2}, {"kind": "resepsi", "name": "4", "sort_order": 3},
        {"kind": "resepsi", "name": "5", "sort_order": 4}]}'::jsonb)$$,
  'P0001', 'limit_exceeded:sessions.max', 'rencana tidak bisa melewati sessions.max'
);
select throws_ok(
  format($$select public.create_wedding(
      p_display_name => 'Terlalu besar', p_partner_a_name => 'A', p_partner_b_name => 'B',
      p_plan => jsonb_build_object('checklist', (select jsonb_agg(jsonb_build_object(
        'stage', 'm1', 'title', 'Tugas ' || n)) from generate_series(1, 501) n)))$$),
  'P0001', 'plan_too_large', 'rencana yang terlalu besar ditolak'
);
select throws_ok(
  $$select public.create_wedding(
      p_display_name => 'X', p_partner_a_name => 'A', p_partner_b_name => 'B', p_ceremony_type => 'pesta')$$,
  '23514', null, 'jenis upacara yang tidak dikenal ditolak'
);

select tests.logout();
select * from finish();
rollback;

begin;
select plan(15);

select tests.create_user('rina@example.com') as rina \gset
select tests.create_user('edit@example.com') as editor \gset
select tests.create_user('view@example.com') as viewer \gset
select tests.create_user('none@example.com') as nobody \gset
select tests.create_user('orang-luar@example.com') as luar \gset
select tests.create_wedding(:'rina') as wedding \gset
select tests.create_wedding(:'luar', 'Wedding Lain') as other_wedding \gset
select tests.add_collaborator(:'wedding', :'editor', '{"budget": "edit"}');
select tests.add_collaborator(:'wedding', :'viewer', '{"budget": "view"}');
select tests.add_collaborator(:'wedding', :'nobody', '{}');

select tests.login(:'editor');
insert into public.budget_categories (wedding_id, name) values (:'wedding', 'Katering')
returning id as category \gset
select lives_ok(
  format($$insert into public.budget_items (wedding_id, category_id, name, estimated_amount)
           values (%L, %L, 'Gedung', 25000000)$$, :'wedding', :'category'),
  'izin edit bisa menambah item anggaran'
);
select lives_ok(
  format($$insert into public.budget_items (wedding_id, category_id, name, pricing_mode, unit_price, pax_basis)
           values (%L, %L, 'Katering per orang', 'per_pax', 85000, 'guest_estimate')$$, :'wedding', :'category'),
  'item per orang diterima'
);

select tests.login(:'viewer');
select is((select count(*) from public.budget_categories)::int, 1, 'izin view membaca kategori');
select is((select count(*) from public.budget_items)::int, 2, 'izin view membaca item');
select throws_ok(
  format($$insert into public.budget_categories (wedding_id, name) values (%L, 'Dekor')$$, :'wedding'),
  '42501', null, 'izin view tidak bisa menambah kategori'
);
update public.budget_items set estimated_amount = 1;
select tests.logout();
select is(
  (select count(*) from public.budget_items where estimated_amount = 1)::int, 0,
  'izin view tidak bisa mengubah item'
);

select tests.login(:'nobody');
select is((select count(*) from public.budget_categories)::int, 0, 'tanpa izin modul tidak membaca kategori');
select is((select count(*) from public.budget_items)::int, 0, 'tanpa izin modul tidak membaca item');
select tests.login(:'luar');
select is((select count(*) from public.budget_items)::int, 0, 'orang luar tidak membaca item');
select tests.login_anon();
select throws_ok('select count(*) from public.budget_categories', '42501', null, 'anon ditolak (kategori)');
select throws_ok('select count(*) from public.budget_items', '42501', null, 'anon ditolak (item)');

-- validasi
select tests.login(:'rina');
select throws_ok(
  format($$insert into public.budget_items (wedding_id, category_id, name, estimated_amount)
           values (%L, %L, 'X', -1)$$, :'wedding', :'category'),
  '23514', null, 'nominal negatif ditolak'
);
select throws_ok(
  format($$insert into public.budget_items (wedding_id, category_id, name, pricing_mode)
           values (%L, %L, 'X', 'per_pax')$$, :'wedding', :'category'),
  '23514', null, 'item per orang wajib punya harga satuan'
);
select throws_ok(
  format($$insert into public.budget_categories (wedding_id, name) values (%L, 'katering')$$, :'wedding'),
  '23505', null, 'nama kategori unik per wedding tanpa peduli huruf besar-kecil'
);
select tests.logout();
insert into public.budget_categories (wedding_id, name) values (:'other_wedding', 'Lain');
select throws_ok(
  format($$insert into public.budget_items (wedding_id, category_id, name)
           values (%L, (select id from public.budget_categories where wedding_id = %L), 'X')$$,
    :'wedding', :'other_wedding'),
  '23503', null, 'kategori harus milik wedding yang sama'
);

select * from finish();
rollback;

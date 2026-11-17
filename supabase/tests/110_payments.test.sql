begin;
select plan(16);

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

insert into public.budget_categories (wedding_id, name) values (:'wedding', 'Katering')
returning id as category \gset
insert into public.budget_items (wedding_id, category_id, name, estimated_amount)
values (:'wedding', :'category', 'Katering', 60000000) returning id as item \gset
insert into public.budget_categories (wedding_id, name) values (:'other_wedding', 'Lain')
returning id as other_category \gset
insert into public.budget_items (wedding_id, category_id, name)
values (:'other_wedding', :'other_category', 'Lain') returning id as other_item \gset

select tests.login(:'editor');
insert into public.payments (wedding_id, budget_item_id, label, kind, amount, due_date)
values (:'wedding', :'item', 'DP katering', 'dp', 15000000, '2027-01-10') returning id as payment \gset
select is((select status from public.payments where id = :'payment'), 'scheduled', 'status bawaan scheduled');

update public.payments set status = 'paid', paid_at = '2027-01-08' where id = :'payment';
select is((select status from public.payments where id = :'payment'), 'paid', 'izin edit bisa menandai lunas');

select tests.login(:'viewer');
select is((select count(*) from public.payments)::int, 1, 'izin view bisa membaca');
select throws_ok(
  format($$insert into public.payments (wedding_id, budget_item_id, label, amount)
           values (%L, %L, 'X', 1000)$$, :'wedding', :'item'),
  '42501', null, 'izin view tidak bisa menambah'
);
update public.payments set amount = 1 where id = :'payment';
delete from public.payments where id = :'payment';
select tests.logout();
select is(
  (select amount from public.payments where id = :'payment'), 15000000::bigint,
  'izin view tidak bisa mengubah atau menghapus'
);

select tests.login(:'nobody');
select is((select count(*) from public.payments)::int, 0, 'tanpa izin modul tidak bisa membaca');
select tests.login(:'luar');
select is((select count(*) from public.payments)::int, 0, 'orang luar tidak bisa membaca');
select tests.login_anon();
select throws_ok('select count(*) from public.payments', '42501', null, 'anon ditolak');

-- validasi
select tests.login(:'rina');
select throws_ok(
  format($$insert into public.payments (wedding_id, budget_item_id, label, amount)
           values (%L, %L, 'X', 0)$$, :'wedding', :'item'),
  '23514', null, 'nominal harus lebih dari nol'
);
select throws_ok(
  format($$insert into public.payments (wedding_id, budget_item_id, label, amount, status)
           values (%L, %L, 'X', 1000, 'paid')$$, :'wedding', :'item'),
  '23514', null, 'pembayaran lunas wajib punya tanggal bayar'
);
select throws_ok(
  format($$insert into public.payments (wedding_id, budget_item_id, label, amount, paid_at)
           values (%L, %L, 'X', 1000, '2027-01-01')$$, :'wedding', :'item'),
  '23514', null, 'tanggal bayar hanya untuk pembayaran lunas'
);
select throws_ok(
  format($$insert into public.payments (wedding_id, budget_item_id, label, amount, kind)
           values (%L, %L, 'X', 1000, 'cicilan')$$, :'wedding', :'item'),
  '23514', null, 'jenis pembayaran yang tidak dikenal ditolak'
);
select tests.logout();
select throws_ok(
  format($$insert into public.payments (wedding_id, budget_item_id, label, amount)
           values (%L, %L, 'X', 1000)$$, :'wedding', :'other_item'),
  '23503', null, 'item anggaran harus milik wedding yang sama'
);

-- menghapus item anggaran yang sudah punya pembayaran ditolak
select throws_ok(
  format($$delete from public.budget_items where id = %L$$, :'item'),
  '23503', null, 'item yang punya pembayaran tidak bisa dihapus'
);
-- tetapi menghapus wedding menghapus semuanya
select lives_ok(format($$delete from public.weddings where id = %L$$, :'wedding'), 'wedding bisa dihapus');
select is(
  (select count(*) from public.payments where wedding_id = :'wedding')::int, 0,
  'pembayaran ikut terhapus bersama wedding'
);

select * from finish();
rollback;

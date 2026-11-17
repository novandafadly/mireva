begin;
select plan(11);

select tests.create_user('rina@example.com') as rina \gset
select tests.create_user('a@example.com') as a \gset
select tests.create_user('b@example.com') as b \gset
select tests.create_user('c@example.com') as c \gset

select tests.create_wedding(:'rina') as wedding \gset

-- Katalog paket
select tests.login(:'rina');
select ok((select count(*) from public.plans) >= 3, 'pengguna login bisa membaca katalog paket');
select throws_ok(
  $$update public.plans set limits = '{}' where key = 'free'$$, '42501', null,
  'klien tidak bisa mengubah katalog paket'
);
select tests.login_anon();
select throws_ok('select count(*) from public.plans', '42501', null, 'anon tidak bisa membaca paket');
select tests.logout();

-- wedding_limit membaca snapshot di weddings.limits
select is(
  private.wedding_limit(:'wedding', 'guests.max'),
  (select (limits ->> 'guests.max')::int from public.plans where key = 'beta'),
  'wedding_limit membaca limit dari snapshot wedding'
);
select is(private.wedding_limit(:'wedding', 'tidak.ada'), 0, 'kunci yang tidak ada berarti 0');
select is(private.wedding_limit(gen_random_uuid(), 'guests.max'), 0, 'wedding yang tidak ada berarti 0');

-- Perubahan katalog tidak mengubah wedding yang sudah ada
update public.plans set limits = limits || '{"guests.max": 1}' where key = 'beta';
select isnt(
  private.wedding_limit(:'wedding', 'guests.max'), 1,
  'perubahan katalog tidak mengubah snapshot wedding'
);

-- members.max membatasi jumlah kolaborator, tidak menghitung owner
update public.weddings set limits = limits || '{"members.max": 2}' where id = :'wedding';
select lives_ok(
  format($$insert into public.wedding_members (wedding_id, user_id, role) values (%L, %L, 'collaborator')$$,
    :'wedding', :'a'),
  'kolaborator pertama diterima'
);
select lives_ok(
  format($$insert into public.wedding_members (wedding_id, user_id, role) values (%L, %L, 'collaborator')$$,
    :'wedding', :'b'),
  'kolaborator kedua diterima'
);
select throws_ok(
  format($$insert into public.wedding_members (wedding_id, user_id, role) values (%L, %L, 'collaborator')$$,
    :'wedding', :'c'),
  'P0001', 'limit_exceeded:members.max',
  'kolaborator melewati members.max ditolak'
);
select lives_ok(
  format($$insert into public.wedding_members (wedding_id, user_id, role) values (%L, %L, 'owner')$$,
    :'wedding', :'c'),
  'owner kedua tidak dihitung dalam members.max'
);

select * from finish();
rollback;

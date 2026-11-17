begin;
select plan(9);

select tests.create_user('rina@example.com') as rina \gset
select tests.create_user('dimas@example.com') as dimas \gset
select tests.create_user('orang-luar@example.com') as luar \gset

select is(
  (select full_name from public.profiles where id = :'rina'),
  'rina',
  'pendaftaran membuat profil dengan nama dari metadata'
);

select tests.create_wedding(:'rina') as wedding \gset
select tests.add_collaborator(:'wedding', :'dimas');

-- Pengguna melihat profilnya sendiri dan profil sesama anggota wedding.
select tests.login(:'rina');
select is(
  (select count(*) from public.profiles)::int, 2,
  'anggota melihat profil sendiri dan sesama anggota, tidak yang lain'
);
select is(
  (select count(*) from public.profiles where id = :'luar')::int, 0,
  'profil orang luar tidak terlihat'
);

-- Orang luar hanya melihat dirinya.
select tests.login(:'luar');
select is((select count(*) from public.profiles)::int, 1, 'orang luar hanya melihat profilnya sendiri');

-- Hanya pemilik profil yang bisa mengubah.
update public.profiles set full_name = 'diubah orang lain' where id = :'rina';
select tests.logout();
select is(
  (select full_name from public.profiles where id = :'rina'), 'rina',
  'orang lain tidak bisa mengubah profil'
);

select tests.login(:'rina');
update public.profiles set full_name = 'Rina Kartika' where id = :'rina';
select is(
  (select full_name from public.profiles where id = :'rina'), 'Rina Kartika',
  'pemilik bisa mengubah profilnya'
);

select throws_ok(
  format($$insert into public.profiles (id, full_name) values (%L, 'palsu')$$, gen_random_uuid()),
  '42501', null,
  'klien tidak bisa membuat profil secara langsung'
);

-- anon tidak punya hak apa pun.
select tests.login_anon();
select throws_ok('select count(*) from public.profiles', '42501', null, 'anon tidak bisa membaca profil');
select throws_ok(
  $$update public.profiles set full_name = 'x'$$, '42501', null, 'anon tidak bisa mengubah profil'
);

select tests.logout();
select * from finish();
rollback;

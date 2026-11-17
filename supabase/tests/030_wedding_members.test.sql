begin;
select plan(20);

select tests.create_user('rina@example.com') as rina \gset
select tests.create_user('dimas@example.com') as dimas \gset
select tests.create_user('tante@example.com') as tante \gset
select tests.create_user('om@example.com') as om \gset
select tests.create_user('orang-luar@example.com') as luar \gset

select tests.create_wedding(:'rina') as wedding \gset
select tests.add_collaborator(:'wedding', :'tante', '{"guests": "edit", "budget": "view"}');

-- select
select tests.login(:'tante');
select is(
  (select count(*) from public.wedding_members where wedding_id = :'wedding')::int, 2,
  'anggota melihat daftar anggota'
);
select tests.login(:'luar');
select is((select count(*) from public.wedding_members)::int, 0, 'orang luar tidak melihat anggota');
select tests.login_anon();
select throws_ok('select count(*) from public.wedding_members', '42501', null, 'anon ditolak');

-- insert langsung ditolak, termasuk untuk owner (anggota masuk lewat undangan)
select tests.login(:'luar');
select throws_ok(
  format($$insert into public.wedding_members (wedding_id, user_id, role) values (%L, %L, 'owner')$$,
    :'wedding', :'luar'),
  '42501', null,
  'orang luar tidak bisa menambahkan dirinya'
);
select tests.login(:'rina');
select throws_ok(
  format($$insert into public.wedding_members (wedding_id, user_id, role) values (%L, %L, 'collaborator')$$,
    :'wedding', :'om'),
  '42501', null,
  'owner tidak bisa menambah anggota tanpa undangan'
);

-- update izin: hanya owner
select tests.login(:'tante');
update public.wedding_members set permissions = '{"budget": "edit"}'
  where wedding_id = :'wedding' and user_id = :'tante';
select tests.logout();
select is(
  (select permissions ->> 'budget' from public.wedding_members
    where wedding_id = :'wedding' and user_id = :'tante'),
  'view',
  'kolaborator tidak bisa menaikkan izinnya sendiri'
);

select tests.login(:'rina');
update public.wedding_members set permissions = '{"budget": "edit"}'
  where wedding_id = :'wedding' and user_id = :'tante';
select is(
  (select permissions ->> 'budget' from public.wedding_members
    where wedding_id = :'wedding' and user_id = :'tante'),
  'edit',
  'owner bisa mengubah izin kolaborator'
);

select throws_ok(
  format($$update public.wedding_members set permissions = '{"rahasia": "edit"}'
           where wedding_id = %L and user_id = %L$$, :'wedding', :'tante'),
  '23514', null,
  'kunci modul yang tidak dikenal ditolak'
);
select throws_ok(
  format($$update public.wedding_members set permissions = '{"budget": "admin"}'
           where wedding_id = %L and user_id = %L$$, :'wedding', :'tante'),
  '23514', null,
  'tingkat izin yang tidak dikenal ditolak'
);
select throws_ok(
  format($$update public.wedding_members set user_id = %L
           where wedding_id = %L and user_id = %L$$, :'luar', :'wedding', :'tante'),
  '42501', null,
  'user_id anggota tidak bisa diganti'
);

-- has_access
select tests.logout();
update public.wedding_members set permissions = '{"guests": "edit", "budget": "view"}'
  where wedding_id = :'wedding' and user_id = :'tante';
select tests.login(:'tante');
select ok(private.has_access(:'wedding', 'guests', 'edit'), 'izin edit mencakup edit');
select ok(private.has_access(:'wedding', 'guests', 'view'), 'izin edit mencakup view');
select ok(private.has_access(:'wedding', 'budget', 'view'), 'izin view mencakup view');
select ok(not private.has_access(:'wedding', 'budget', 'edit'), 'izin view tidak mencakup edit');
select ok(not private.has_access(:'wedding', 'vendors', 'view'), 'modul tanpa izin ditolak');
select tests.login(:'rina');
select ok(private.has_access(:'wedding', 'vendors', 'edit'), 'owner lolos di semua modul');
select tests.login(:'luar');
select ok(not private.has_access(:'wedding', 'guests', 'view'), 'orang luar ditolak');

-- batas dua owner
select tests.logout();
insert into public.wedding_members (wedding_id, user_id, role) values (:'wedding', :'dimas', 'owner');
select throws_ok(
  format($$insert into public.wedding_members (wedding_id, user_id, role) values (%L, %L, 'owner')$$,
    :'wedding', :'om'),
  '23514', null,
  'owner ketiga ditolak'
);

-- owner terakhir tidak bisa dihapus atau diturunkan
select tests.login(:'rina');
delete from public.wedding_members where wedding_id = :'wedding' and user_id = :'dimas';
select throws_ok(
  format($$delete from public.wedding_members where wedding_id = %L and user_id = %L$$,
    :'wedding', :'rina'),
  '23514', null,
  'owner terakhir tidak bisa dihapus'
);
select throws_ok(
  format($$update public.wedding_members set role = 'collaborator'
           where wedding_id = %L and user_id = %L$$, :'wedding', :'rina'),
  '23514', null,
  'owner terakhir tidak bisa diturunkan'
);

select tests.logout();
select * from finish();
rollback;

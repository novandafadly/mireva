begin;
select plan(12);

select tests.create_user('rina@example.com') as rina \gset
select tests.create_user('edit@example.com') as editor \gset
select tests.create_user('view@example.com') as viewer \gset
select tests.create_user('none@example.com') as nobody \gset
select tests.create_user('orang-luar@example.com') as luar \gset
select tests.create_wedding(:'rina') as wedding \gset
select tests.create_wedding(:'luar', 'Wedding Lain') as other_wedding \gset
select tests.add_collaborator(:'wedding', :'editor', '{"guests": "edit"}');
select tests.add_collaborator(:'wedding', :'viewer', '{"guests": "view"}');
select tests.add_collaborator(:'wedding', :'nobody', '{}');

select tests.login(:'rina');
select lives_ok(
  format($$insert into public.event_sessions (wedding_id, kind, name, starts_at)
           values (%L, 'akad', 'Akad nikah', '2027-05-10 08:00+07')$$, :'wedding'),
  'owner bisa menambah sesi'
);

select tests.login(:'editor');
select lives_ok(
  format($$insert into public.event_sessions (wedding_id, kind, name) values (%L, 'resepsi', 'Resepsi')$$,
    :'wedding'),
  'kolaborator dengan izin edit tamu bisa menambah sesi'
);

select tests.login(:'viewer');
select is((select count(*) from public.event_sessions)::int, 2, 'semua anggota melihat sesi');
select throws_ok(
  format($$insert into public.event_sessions (wedding_id, kind, name) values (%L, 'adat', 'Siraman')$$,
    :'wedding'),
  '42501', null, 'izin view tidak bisa menambah sesi'
);
update public.event_sessions set name = 'Diubah' where wedding_id = :'wedding';
select tests.logout();
select is(
  (select count(*) from public.event_sessions where name = 'Diubah')::int, 0,
  'izin view tidak bisa mengubah sesi'
);

select tests.login(:'nobody');
select is((select count(*) from public.event_sessions)::int, 2, 'anggota tanpa izin modul tetap melihat sesi');

select tests.login(:'luar');
select is((select count(*) from public.event_sessions)::int, 0, 'orang luar tidak melihat sesi');
select throws_ok(
  format($$insert into public.event_sessions (wedding_id, kind, name) values (%L, 'adat', 'Susupan')$$,
    :'wedding'),
  '42501', null, 'orang luar tidak bisa menambah sesi'
);

select tests.login_anon();
select throws_ok('select count(*) from public.event_sessions', '42501', null, 'anon ditolak');

-- validasi
select tests.login(:'rina');
select throws_ok(
  format($$insert into public.event_sessions (wedding_id, kind, name) values (%L, 'pesta', 'X')$$, :'wedding'),
  '23514', null, 'jenis sesi yang tidak dikenal ditolak'
);
select throws_ok(
  format($$insert into public.event_sessions (wedding_id, kind, name, starts_at, ends_at)
           values (%L, 'resepsi', 'X', '2027-05-10 12:00+07', '2027-05-10 11:00+07')$$, :'wedding'),
  '23514', null, 'selesai sebelum mulai ditolak'
);

-- sessions.max
select tests.logout();
update public.weddings set limits = limits || '{"sessions.max": 2}' where id = :'wedding';
select tests.login(:'rina');
select throws_ok(
  format($$insert into public.event_sessions (wedding_id, kind, name) values (%L, 'lainnya', 'Ketiga')$$,
    :'wedding'),
  'P0001', 'limit_exceeded:sessions.max', 'sesi melewati sessions.max ditolak'
);

select tests.logout();
select * from finish();
rollback;

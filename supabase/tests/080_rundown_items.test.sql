begin;
select plan(8);

select tests.create_user('rina@example.com') as rina \gset
select tests.create_user('edit@example.com') as editor \gset
select tests.create_user('view@example.com') as viewer \gset
select tests.create_user('none@example.com') as nobody \gset
select tests.create_user('orang-luar@example.com') as luar \gset
select tests.create_wedding(:'rina') as wedding \gset
select tests.create_wedding(:'luar', 'Wedding Lain') as other_wedding \gset
select tests.add_collaborator(:'wedding', :'editor', '{"planning": "edit"}');
select tests.add_collaborator(:'wedding', :'viewer', '{"planning": "view"}');
select tests.add_collaborator(:'wedding', :'nobody', '{}');

select tests.login(:'editor');
select lives_ok(
  format($$insert into public.rundown_items (wedding_id, title, starts_at, duration_min)
           values (%L, 'Akad nikah', '2027-05-10 08:00+07', 60)$$, :'wedding'),
  'izin edit bisa menambah acara rundown'
);
select tests.login(:'viewer');
select is((select count(*) from public.rundown_items)::int, 1, 'izin view bisa membaca');
select throws_ok(
  format($$insert into public.rundown_items (wedding_id, title) values (%L, 'X')$$, :'wedding'),
  '42501', null, 'izin view tidak bisa menambah'
);
select tests.login(:'nobody');
select is((select count(*) from public.rundown_items)::int, 0, 'tanpa izin modul tidak bisa membaca');
select tests.login(:'luar');
select is((select count(*) from public.rundown_items)::int, 0, 'orang luar tidak bisa membaca');
select tests.login_anon();
select throws_ok('select count(*) from public.rundown_items', '42501', null, 'anon ditolak');

select tests.login(:'rina');
select throws_ok(
  format($$insert into public.rundown_items (wedding_id, title, duration_min) values (%L, 'X', -5)$$,
    :'wedding'),
  '23514', null, 'durasi negatif ditolak'
);
select tests.logout();
insert into public.event_sessions (wedding_id, kind, name) values (:'other_wedding', 'resepsi', 'Lain');
select throws_ok(
  format($$insert into public.rundown_items (wedding_id, title, event_session_id)
           values (%L, 'X', (select id from public.event_sessions limit 1))$$, :'wedding'),
  '23503', null, 'sesi harus milik wedding yang sama'
);

select tests.logout();
select * from finish();
rollback;

begin;
select plan(22);

select tests.create_user('rina@example.com') as rina \gset
select tests.create_user('tante@example.com') as tante \gset
select tests.create_user('orang-luar@example.com') as luar \gset

select tests.create_wedding(:'rina') as wedding \gset
select tests.add_collaborator(:'wedding', :'tante', '{"guests": "edit"}');

-- create_wedding
select is(
  (select role from public.wedding_members where wedding_id = :'wedding' and user_id = :'rina'),
  'owner',
  'pembuat wedding menjadi owner'
);
select is(
  (select plan from public.weddings where id = :'wedding'), 'beta',
  'wedding baru memakai paket beta'
);
select is(
  (select limits from public.weddings where id = :'wedding'),
  (select limits from public.plans where key = 'beta'),
  'limit wedding adalah salinan limit paket'
);
select is(
  (select timezone from public.weddings where id = :'wedding'), 'Asia/Jakarta',
  'zona waktu bawaan WIB'
);

select tests.login_anon();
select throws_ok(
  $$select public.create_wedding(p_display_name => 'A & B', p_partner_a_name => 'A', p_partner_b_name => 'B')$$,
  '42501', null,
  'anon tidak bisa membuat wedding'
);
select throws_ok('select count(*) from public.weddings', '42501', null, 'anon tidak bisa membaca wedding');
select tests.logout();

-- select
select tests.login(:'rina');
select is((select count(*) from public.weddings)::int, 1, 'owner melihat weddingnya');
select tests.login(:'tante');
select is((select count(*) from public.weddings)::int, 1, 'kolaborator melihat wedding');
select tests.login(:'luar');
select is((select count(*) from public.weddings)::int, 0, 'orang luar tidak melihat wedding');

-- insert langsung ditolak untuk semua klien
select tests.login(:'rina');
select throws_ok(
  $$insert into public.weddings (display_name, partner_a_name, partner_b_name, limits)
    values ('X & Y', 'X', 'Y', '{}')$$,
  '42501', null,
  'insert langsung ke weddings ditolak; harus lewat create_wedding'
);

-- update
update public.weddings set city = 'Yogyakarta' where id = :'wedding';
select is((select city from public.weddings where id = :'wedding'), 'Yogyakarta', 'owner bisa mengubah wedding');

select tests.login(:'tante');
update public.weddings set city = 'Diubah kolaborator' where id = :'wedding';
select tests.logout();
select is(
  (select city from public.weddings where id = :'wedding'), 'Yogyakarta',
  'kolaborator tidak bisa mengubah data wedding'
);

-- plan dan limits tidak bisa diubah klien
select tests.login(:'rina');
select throws_ok(
  format($$update public.weddings set plan = 'paid' where id = %L$$, :'wedding'),
  '42501', null,
  'owner tidak bisa mengubah plan'
);
select throws_ok(
  format($$update public.weddings set limits = '{"guests.max": 999999}' where id = %L$$, :'wedding'),
  '42501', null,
  'owner tidak bisa mengubah limits'
);
select tests.logout();
select lives_ok(
  format($$update public.weddings set plan = 'paid',
           limits = (select limits from public.plans where key = 'paid') where id = %L$$, :'wedding'),
  'server (service role) bisa mengubah plan dan limits'
);

-- validasi
select tests.login(:'rina');
select throws_ok(
  format($$update public.weddings set timezone = 'Asia/Singapore' where id = %L$$, :'wedding'),
  '23514', null,
  'zona waktu di luar Indonesia ditolak'
);
select throws_ok(
  format($$update public.weddings set customs = '{jawa,sunda,minang}' where id = %L$$, :'wedding'),
  '23514', null,
  'lebih dari dua adat ditolak'
);
select throws_ok(
  format($$update public.weddings set date_end = date '2027-01-01' where id = %L$$, :'wedding'),
  '23514', null,
  'akhir rentang sebelum awal rentang ditolak'
);

-- arsip: semua tulis ditolak kecuali membatalkan arsip dan menghapus
update public.weddings set status = 'archived' where id = :'wedding';
select isnt(
  (select archived_at from public.weddings where id = :'wedding'), null,
  'mengarsipkan mengisi archived_at'
);
select throws_ok(
  format($$update public.weddings set city = 'Solo' where id = %L$$, :'wedding'),
  '42501', null,
  'wedding yang diarsipkan tidak bisa diubah'
);
update public.weddings set status = 'active' where id = :'wedding';
select is(
  (select archived_at from public.weddings where id = :'wedding'), null,
  'arsip bisa dibatalkan'
);

-- delete
select tests.login(:'tante');
delete from public.weddings where id = :'wedding';
select tests.login(:'rina');
delete from public.weddings where id = :'wedding';
select tests.logout();
select is(
  (select count(*) from public.weddings where id = :'wedding')::int, 0,
  'hanya owner yang bisa menghapus wedding'
);

select * from finish();
rollback;

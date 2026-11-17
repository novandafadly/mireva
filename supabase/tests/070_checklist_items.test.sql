begin;
select plan(17);

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

select tests.login(:'rina');
insert into public.checklist_items (wedding_id, stage, title, due_date)
values (:'wedding', 'm6', 'Pesan gedung', '2026-11-10') returning id as item \gset
select is((select status from public.checklist_items where id = :'item'), 'todo', 'status bawaan todo');
select is((select source from public.checklist_items where id = :'item'), 'manual', 'sumber bawaan manual');

select tests.login(:'editor');
select lives_ok(
  format($$insert into public.checklist_items (wedding_id, stage, title) values (%L, 'm3', 'Fitting baju')$$,
    :'wedding'),
  'izin edit bisa menambah tugas'
);
update public.checklist_items set title = 'Pesan gedung resepsi' where id = :'item';
select is(
  (select title from public.checklist_items where id = :'item'), 'Pesan gedung resepsi',
  'izin edit bisa mengubah tugas'
);

select tests.login(:'viewer');
select is((select count(*) from public.checklist_items)::int, 2, 'izin view bisa membaca');
select throws_ok(
  format($$insert into public.checklist_items (wedding_id, stage, title) values (%L, 'm3', 'X')$$, :'wedding'),
  '42501', null, 'izin view tidak bisa menambah'
);
update public.checklist_items set status = 'done' where id = :'item';
select tests.logout();
select is(
  (select status from public.checklist_items where id = :'item'), 'todo',
  'izin view tidak bisa mengubah tugas orang lain'
);

-- Penanggung jawab dengan izin view boleh mengubah status dan catatan tugasnya.
update public.checklist_items
set assignee_member_id = (
  select id from public.wedding_members where wedding_id = :'wedding' and user_id = :'viewer'
)
where id = :'item';
select tests.login(:'viewer');
update public.checklist_items set status = 'done', notes = 'Sudah DP' where id = :'item';
select is(
  (select status || '/' || notes from public.checklist_items where id = :'item'), 'done/Sudah DP',
  'penanggung jawab bisa mengubah status dan catatan tugasnya'
);
select throws_ok(
  format($$update public.checklist_items set title = 'Judul baru' where id = %L$$, :'item'),
  '42501', null, 'penanggung jawab tidak bisa mengubah kolom lain'
);
delete from public.checklist_items where id = :'item';
select tests.logout();
select is(
  (select count(*) from public.checklist_items where id = :'item')::int, 1,
  'penanggung jawab tidak bisa menghapus tugas'
);

select tests.login(:'nobody');
select is((select count(*) from public.checklist_items)::int, 0, 'tanpa izin modul tidak bisa membaca');
select tests.login(:'luar');
select is((select count(*) from public.checklist_items)::int, 0, 'orang luar tidak bisa membaca');
select tests.login_anon();
select throws_ok('select count(*) from public.checklist_items', '42501', null, 'anon ditolak');

-- validasi dan integritas antar wedding
select tests.login(:'rina');
select throws_ok(
  format($$insert into public.checklist_items (wedding_id, stage, title) values (%L, 'm2', 'X')$$, :'wedding'),
  '23514', null, 'tahap yang tidak dikenal ditolak'
);
select tests.logout();
select throws_ok(
  format($$update public.checklist_items set assignee_member_id =
             (select id from public.wedding_members where wedding_id = %L limit 1) where id = %L$$,
    :'other_wedding', :'item'),
  '23503', null, 'penanggung jawab harus anggota wedding yang sama'
);

-- anggota yang dikeluarkan dilepas dari tugasnya, tugas tetap ada
select tests.login(:'rina');
delete from public.wedding_members where wedding_id = :'wedding' and user_id = :'viewer';
select is(
  (select assignee_member_id from public.checklist_items where id = :'item'), null,
  'tugas tetap ada setelah penanggung jawab dikeluarkan'
);

-- arsip menolak tulis
update public.weddings set status = 'archived' where id = :'wedding';
select throws_ok(
  format($$insert into public.checklist_items (wedding_id, stage, title) values (%L, 'm1', 'X')$$, :'wedding'),
  '42501', null, 'wedding yang diarsipkan menolak tugas baru'
);

select tests.logout();
select * from finish();
rollback;

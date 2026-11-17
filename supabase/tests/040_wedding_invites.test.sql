begin;
select plan(19);

select tests.create_user('rina@example.com') as rina \gset
select tests.create_user('dimas@example.com') as dimas \gset
select tests.create_user('tante@example.com') as tante \gset
select tests.create_user('orang-luar@example.com') as luar \gset

select tests.create_wedding(:'rina') as wedding \gset
select tests.add_collaborator(:'wedding', :'tante', '{"guests": "edit"}');

-- Owner membuat undangan. Hanya hash token yang disimpan.
select tests.login(:'rina');
select lives_ok(
  format($$insert into public.wedding_invites (wedding_id, email, role, permissions, token_hash, invited_by)
           values (%L, 'Dimas@Example.com', 'owner', '{}', 'hash-dimas', %L)$$, :'wedding', :'rina'),
  'owner bisa mengundang'
);
select throws_ok(
  format($$insert into public.wedding_invites (wedding_id, email, role, token_hash, invited_by)
           values (%L, 'dimas@example.com', 'collaborator', 'hash-dimas-2', %L)$$, :'wedding', :'rina'),
  '23505', null,
  'satu email hanya punya satu undangan aktif per wedding'
);
select is(
  (select expires_at::date from public.wedding_invites where token_hash = 'hash-dimas'),
  (now() + interval '7 days')::date,
  'undangan berlaku 7 hari'
);

-- Kolaborator dan orang luar tidak bisa melihat atau membuat undangan.
select tests.login(:'tante');
select is((select count(*) from public.wedding_invites)::int, 0, 'kolaborator tidak melihat undangan');
select throws_ok(
  format($$insert into public.wedding_invites (wedding_id, email, role, token_hash, invited_by)
           values (%L, 'teman@example.com', 'collaborator', 'hash-teman', %L)$$, :'wedding', :'tante'),
  '42501', null,
  'kolaborator tidak bisa mengundang'
);
select tests.login_anon();
select throws_ok('select count(*) from public.wedding_invites', '42501', null, 'anon ditolak');
select throws_ok(
  $$select public.accept_wedding_invite('hash-dimas')$$, '42501', null,
  'anon tidak bisa menerima undangan'
);

-- Menerima undangan: email akun harus sama dengan email yang diundang.
select tests.login(:'luar');
select throws_ok(
  $$select public.accept_wedding_invite('hash-dimas')$$, 'P0001', 'invite_email_mismatch',
  'akun dengan email lain ditolak'
);
select throws_ok(
  $$select public.accept_wedding_invite('hash-tidak-ada')$$, 'P0001', 'invite_not_found',
  'token yang tidak dikenal ditolak'
);

select tests.login(:'dimas');
select is(public.accept_wedding_invite('hash-dimas'), :'wedding'::uuid, 'penerima yang benar bisa bergabung');
select is(
  (select role from public.wedding_members where wedding_id = :'wedding' and user_id = :'dimas'),
  'owner',
  'peran mengikuti undangan'
);
select throws_ok(
  $$select public.accept_wedding_invite('hash-dimas')$$, 'P0001', 'invite_not_found',
  'undangan tidak bisa dipakai dua kali'
);

-- Undangan yang dicabut atau kedaluwarsa.
select tests.login(:'rina');
insert into public.wedding_invites (wedding_id, email, role, permissions, token_hash, invited_by)
values (:'wedding', 'orang-luar@example.com', 'collaborator', '{"budget": "view"}', 'hash-luar', :'rina');
update public.wedding_invites set revoked_at = now() where token_hash = 'hash-luar';
select tests.login(:'luar');
select throws_ok(
  $$select public.accept_wedding_invite('hash-luar')$$, 'P0001', 'invite_not_found',
  'undangan yang dicabut ditolak'
);

select tests.login(:'rina');
insert into public.wedding_invites (wedding_id, email, role, permissions, token_hash, invited_by)
values (:'wedding', 'orang-luar@example.com', 'collaborator', '{"budget": "view"}', 'hash-luar-2', :'rina');
select tests.logout();
update public.wedding_invites set expires_at = now() - interval '1 minute' where token_hash = 'hash-luar-2';
select tests.login(:'luar');
select throws_ok(
  $$select public.accept_wedding_invite('hash-luar-2')$$, 'P0001', 'invite_expired',
  'undangan kedaluwarsa ditolak'
);

select tests.logout();
update public.wedding_invites set expires_at = now() + interval '1 day' where token_hash = 'hash-luar-2';
select tests.login(:'luar');
select lives_ok($$select public.accept_wedding_invite('hash-luar-2')$$, 'undangan aktif diterima');
select is(
  (select permissions from public.wedding_members where wedding_id = :'wedding' and user_id = :'luar'),
  '{"budget": "view"}'::jsonb,
  'izin kolaborator mengikuti undangan'
);

-- Undangan owner ketiga gagal saat diterima, tanpa menandai undangan terpakai.
select tests.login(:'rina');
insert into public.wedding_invites (wedding_id, email, role, token_hash, invited_by)
values (:'wedding', 'tante-baru@example.com', 'owner', 'hash-owner-3', :'rina');
select tests.logout();
select tests.create_user('tante-baru@example.com') as tante_baru \gset
select tests.login(:'tante_baru');
select throws_ok(
  $$select public.accept_wedding_invite('hash-owner-3')$$, '23514', null,
  'owner ketiga ditolak saat menerima undangan'
);

-- Anggota yang sudah bergabung tidak bisa diundang ulang lalu bergabung dua kali.
select tests.login(:'rina');
insert into public.wedding_invites (wedding_id, email, role, token_hash, invited_by)
values (:'wedding', 'tante@example.com', 'collaborator', 'hash-tante', :'rina');
select tests.login(:'tante');
select throws_ok(
  $$select public.accept_wedding_invite('hash-tante')$$, 'P0001', 'already_member',
  'anggota lama tidak bisa bergabung dua kali'
);

-- Owner bisa mencabut undangan; penghapusan wedding ikut menghapus undangan.
select tests.login(:'rina');
delete from public.weddings where id = :'wedding';
select tests.logout();
select is(
  (select count(*) from public.wedding_invites where wedding_id = :'wedding')::int, 0,
  'undangan terhapus bersama wedding'
);

select * from finish();
rollback;

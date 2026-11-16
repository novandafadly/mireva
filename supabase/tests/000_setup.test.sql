-- Tes asap: memastikan pgTAP berjalan di CI sebelum tes RLS per tabel ditambahkan (D-024).
begin;
select plan(1);

select has_schema('public');

select * from finish();
rollback;

-- ============================================================
-- Migration 002: fix "new row violates row-level security policy"
-- when uploading a variant photo.
--
-- Cause: the app uploads with upsert (so "Replace photo" overwrites
-- the existing file). Supabase Storage only allows an upsert when the
-- caller has INSERT, UPDATE *and* SELECT permission on the object.
-- storage.sql granted insert/update/delete but never select, so every
-- upload was rejected.
--
-- This file (re)creates the full set of policies for the
-- variant-photos bucket, so it is safe to run whether or not
-- storage.sql was applied before, and safe to run more than once.
-- Each business is still confined to its own "<business_id>/" folder.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('variant-photos', 'variant-photos', true)
on conflict (id) do nothing;

drop policy if exists "business staff can read their variant photos" on storage.objects;
create policy "business staff can read their variant photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'variant-photos'
  and (storage.foldername(name))[1] = (select business_id::text from public.current_staff())
);

drop policy if exists "business staff can upload variant photos" on storage.objects;
create policy "business staff can upload variant photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'variant-photos'
  and (storage.foldername(name))[1] = (select business_id::text from public.current_staff())
);

drop policy if exists "business staff can replace their variant photos" on storage.objects;
create policy "business staff can replace their variant photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'variant-photos'
  and (storage.foldername(name))[1] = (select business_id::text from public.current_staff())
)
with check (
  bucket_id = 'variant-photos'
  and (storage.foldername(name))[1] = (select business_id::text from public.current_staff())
);

drop policy if exists "business staff can delete their variant photos" on storage.objects;
create policy "business staff can delete their variant photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'variant-photos'
  and (storage.foldername(name))[1] = (select business_id::text from public.current_staff())
);

-- ============================================================
-- Storage: variant photos
--
-- One public bucket. Photo objects are named "<business_id>/<variant_id>.<ext>",
-- e.g. "3f1e.../8a2c....jpg" — that's how the write policies below
-- confine each business to its own folder. The bucket is public so
-- the app can just use the plain public URL for <img src>, no signed
-- URLs to refresh. Public here only means "readable if you know the
-- exact path" — nothing sensitive lives in a shoe photo, and the
-- business isolation that matters (who can add/replace/delete a
-- photo) is still enforced below.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('variant-photos', 'variant-photos', true)
on conflict (id) do nothing;

-- storage.objects already has RLS enabled by default in Supabase.

create policy "business staff can upload variant photos"
on storage.objects for insert
with check (
  bucket_id = 'variant-photos'
  and (storage.foldername(name))[1] = (select business_id::text from current_staff())
);

create policy "business staff can replace their variant photos"
on storage.objects for update
using (
  bucket_id = 'variant-photos'
  and (storage.foldername(name))[1] = (select business_id::text from current_staff())
);

create policy "business staff can delete their variant photos"
on storage.objects for delete
using (
  bucket_id = 'variant-photos'
  and (storage.foldername(name))[1] = (select business_id::text from current_staff())
);

import { supabase } from '../supabaseClient'

const BUCKET = 'variant-photos'

// Path convention the storage RLS policies in supabase/storage.sql
// rely on: "<business_id>/<variant_id>.<ext>". The business_id folder
// prefix is what confines each business to its own uploads.
export async function uploadVariantPhoto({ businessId, variantId, file }) {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
  const path = `${businessId}/${variantId}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

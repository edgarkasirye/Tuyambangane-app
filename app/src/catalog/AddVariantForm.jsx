import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { uploadVariantPhoto } from '../lib/photos'
import { friendlyDbError } from '../lib/friendlyError'
import { PreviewableThumb } from '../components/PhotoPreview'

export default function AddVariantForm({ styleId, businessId, onAdded }) {
  const [color, setColor] = useState('')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState(null)

  // Show the chosen photo before it's uploaded, so staff can check
  // they picked the right picture. Old preview URLs are released as
  // soon as they're replaced.
  function chooseFile(next) {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl)
    setFile(next)
    setFilePreviewUrl(next ? URL.createObjectURL(next) : null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { data: variant, error: insertError } = await supabase
        .from('variants')
        .insert({ style_id: styleId, color: color.trim() })
        .select()
        .single()
      if (insertError) throw insertError

      let final = variant
      let photoError = null
      if (file) {
        // The color is already saved at this point. If the photo step
        // fails, still show the new color (instead of leaving it saved
        // but invisible, which makes a retry hit "already added") and
        // tell the user to retry the photo from the color's own row.
        try {
          const imageUrl = await uploadVariantPhoto({ businessId, variantId: variant.id, file })
          const { data, error: updateError } = await supabase
            .from('variants')
            .update({ image_url: imageUrl })
            .eq('id', variant.id)
            .select()
            .single()
          if (updateError) throw updateError
          final = data
        } catch (err) {
          photoError = `Color added, but the photo didn't upload (${friendlyDbError(err)}). Use "Add photo" on the color to try again.`
        }
      }

      onAdded(final)
      setColor('')
      chooseFile(null)
      e.target.reset()
      if (photoError) setError(photoError)
    } catch (err) {
      setError(friendlyDbError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <label>
        Add a color
        <input
          placeholder="e.g. Black"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          required
        />
      </label>
      <label>
        Photo (optional)
        <input type="file" accept="image/*" onChange={(e) => chooseFile(e.target.files?.[0] ?? null)} />
      </label>
      {filePreviewUrl && (
        <PreviewableThumb
          className="photo-selected-preview"
          src={filePreviewUrl}
          alt="Selected photo"
          caption={color.trim() || 'Selected photo'}
        />
      )}
      {error && <p className="form-error">{error}</p>}
      <button type="submit" disabled={saving}>
        {saving ? 'Adding…' : 'Add color'}
      </button>
    </form>
  )
}

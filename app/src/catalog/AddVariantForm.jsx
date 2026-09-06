import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { uploadVariantPhoto } from '../lib/photos'
import { friendlyDbError } from '../lib/friendlyError'

export default function AddVariantForm({ styleId, businessId, onAdded }) {
  const [color, setColor] = useState('')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

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
      if (file) {
        const imageUrl = await uploadVariantPhoto({ businessId, variantId: variant.id, file })
        const { data, error: updateError } = await supabase
          .from('variants')
          .update({ image_url: imageUrl })
          .eq('id', variant.id)
          .select()
          .single()
        if (updateError) throw updateError
        final = data
      }

      onAdded(final)
      setColor('')
      setFile(null)
      e.target.reset()
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
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button type="submit" disabled={saving}>
        {saving ? 'Adding…' : 'Add color'}
      </button>
    </form>
  )
}

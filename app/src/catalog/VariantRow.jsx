import { useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { uploadVariantPhoto } from '../lib/photos'
import { PreviewableThumb } from '../components/PhotoPreview'

export default function VariantRow({ variant, businessId, onUpdated }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  async function toggleActive() {
    setBusy(true)
    setError(null)
    const { data, error } = await supabase
      .from('variants')
      .update({ active: !variant.active })
      .eq('id', variant.id)
      .select()
      .single()
    setBusy(false)
    if (error) setError(error.message)
    else onUpdated(data)
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const imageUrl = await uploadVariantPhoto({ businessId, variantId: variant.id, file })
      const { data, error } = await supabase
        .from('variants')
        .update({ image_url: imageUrl })
        .eq('id', variant.id)
        .select()
        .single()
      if (error) throw error
      onUpdated(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="variant-row">
      <PreviewableThumb className="variant-thumb" src={variant.image_url} alt={variant.color} />
      <div className="variant-info">
        <div>{variant.color}</div>
        <span className={`badge ${variant.active ? 'active' : 'inactive'}`}>
          {variant.active ? 'Active' : 'Inactive'}
        </span>
        {error && <p className="form-error">{error}</p>}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        id={`photo-${variant.id}`}
        style={{ display: 'none' }}
        onChange={handlePhotoChange}
      />
      <label htmlFor={`photo-${variant.id}`} className="link-button" style={{ cursor: 'pointer' }}>
        {variant.image_url ? 'Replace photo' : 'Add photo'}
      </label>
      <button type="button" className="secondary" onClick={toggleActive} disabled={busy}>
        {variant.active ? 'Deactivate' : 'Reactivate'}
      </button>
    </div>
  )
}

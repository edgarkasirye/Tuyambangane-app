import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth/AuthContext'
import { parseSizes, formatSizes } from '../lib/sizes'
import { friendlyDbError } from '../lib/friendlyError'
import VariantRow from './VariantRow'
import AddVariantForm from './AddVariantForm'

export default function StyleDetail({ isNew = false }) {
  const { styleId } = useParams()
  const navigate = useNavigate()
  const { staffProfile } = useAuth()

  const [artNumber, setArtNumber] = useState('')
  const [name, setName] = useState('')
  const [recommendedPrice, setRecommendedPrice] = useState('')
  const [sizesInput, setSizesInput] = useState('')
  const [variants, setVariants] = useState([])

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [savedMessage, setSavedMessage] = useState(null)

  useEffect(() => {
    if (isNew) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('styles')
        .select('*, variants(*)')
        .eq('id', styleId)
        .single()

      if (cancelled) return
      if (error) {
        setError(error.message)
      } else {
        setArtNumber(data.art_number)
        setName(data.name)
        setRecommendedPrice(data.recommended_price ?? '')
        setSizesInput(formatSizes(data.sizes_offered))
        setVariants(
          [...data.variants].sort((a, b) => a.color.localeCompare(b.color))
        )
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [styleId, isNew])

  async function handleSaveStyle(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSavedMessage(null)

    const payload = {
      art_number: artNumber.trim(),
      name: name.trim(),
      recommended_price: recommendedPrice === '' ? null : Number(recommendedPrice),
      sizes_offered: parseSizes(sizesInput),
    }

    if (isNew) {
      const { data, error } = await supabase
        .from('styles')
        .insert({ ...payload, business_id: staffProfile.business_id })
        .select()
        .single()

      setSaving(false)
      if (error) setError(friendlyDbError(error))
      else navigate(`/catalog/${data.id}`, { replace: true })
      return
    }

    const { error } = await supabase.from('styles').update(payload).eq('id', styleId)
    setSaving(false)
    if (error) setError(friendlyDbError(error))
    else setSavedMessage('Saved.')
  }

  function handleVariantAdded(variant) {
    setVariants((prev) => [...prev, variant].sort((a, b) => a.color.localeCompare(b.color)))
  }

  function handleVariantUpdated(updated) {
    setVariants((prev) => prev.map((v) => (v.id === updated.id ? updated : v)))
  }

  if (loading) return <p className="page-loading">Loading…</p>

  return (
    <div>
      <div className="page-title">
        <h1>{isNew ? 'Add Art No.' : name}</h1>
      </div>

      <form className="card" onSubmit={handleSaveStyle}>
        <label>
          Article number
          <input value={artNumber} onChange={(e) => setArtNumber(e.target.value)} required />
        </label>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Recommended price
          <input
            type="number"
            min="0"
            step="0.01"
            value={recommendedPrice}
            onChange={(e) => setRecommendedPrice(e.target.value)}
          />
        </label>
        <label>
          Sizes offered (comma-separated)
          <input
            placeholder="38, 39, 40, 41, 42"
            value={sizesInput}
            onChange={(e) => setSizesInput(e.target.value)}
          />
        </label>

        {error && <p className="form-error">{error}</p>}
        {savedMessage && <p className="form-success">{savedMessage}</p>}

        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : isNew ? 'Create style' : 'Save changes'}
        </button>
      </form>

      {!isNew && (
        <>
          <h2>Colors</h2>
          <div className="card">
            {variants.length === 0 && <p>No colors added yet.</p>}
            {variants.map((variant) => (
              <VariantRow
                key={variant.id}
                variant={variant}
                businessId={staffProfile.business_id}
                onUpdated={handleVariantUpdated}
              />
            ))}
          </div>

          <AddVariantForm
            styleId={styleId}
            businessId={staffProfile.business_id}
            onAdded={handleVariantAdded}
          />
        </>
      )}
    </div>
  )
}

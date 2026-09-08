import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth/AuthContext'
import { formatMoney } from '../lib/formatMoney'
import LineItemForm from './LineItemForm'

export default function RecordSale() {
  const { staffProfile, isOwnerOrAdmin } = useAuth()
  const navigate = useNavigate()

  const [shops, setShops] = useState(null)
  const [shopId, setShopId] = useState(staffProfile.shop_id ?? '')
  const [variants, setVariants] = useState(null)
  const [query, setQuery] = useState('')
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [cart, setCart] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isOwnerOrAdmin) return
    supabase
      .from('shops')
      .select('id, name')
      .order('name')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else {
          setShops(data)
          setShopId((current) => current || data[0]?.id || '')
        }
      })
  }, [isOwnerOrAdmin])

  useEffect(() => {
    supabase
      .from('variants')
      .select('id, color, image_url, style:styles(id, name, art_number, recommended_price, sizes_offered)')
      .eq('active', true)
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setVariants(data.sort((a, b) => a.style.art_number.localeCompare(b.style.art_number)))
      })
  }, [])

  const filteredVariants = useMemo(() => {
    if (!variants) return null
    const q = query.trim().toLowerCase()
    if (!q) return variants
    return variants.filter(
      (variant) =>
        variant.style.art_number.toLowerCase().includes(q) ||
        variant.style.name.toLowerCase().includes(q) ||
        variant.color.toLowerCase().includes(q)
    )
  }, [variants, query])

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [cart]
  )

  function handleAddLineItem(item) {
    setCart((prev) => [...prev, { ...item, tempId: crypto.randomUUID() }])
    setSelectedVariant(null)
  }

  function handleRemoveLineItem(tempId) {
    setCart((prev) => prev.filter((item) => item.tempId !== tempId))
  }

  async function handleCompleteSale() {
    setSubmitting(true)
    setError(null)

    const payload = cart.map((item) => ({
      variant_id: item.variantId,
      size: item.size,
      quantity: item.quantity,
      unit_type: item.unitType,
      unit_price: item.unitPrice,
    }))

    const { error } = await supabase.rpc('record_sale', {
      p_shop_id: shopId,
      p_line_items: payload,
    })

    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setCart([])
    navigate('/sales')
  }

  if (!variants) return <p className="page-loading">Loading catalog…</p>

  return (
    <div>
      <div className="page-title">
        <h1>Record sale</h1>
      </div>

      {isOwnerOrAdmin && shops && (
        <label>
          Shop
          <select value={shopId} onChange={(e) => setShopId(e.target.value)}>
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {selectedVariant ? (
        <LineItemForm
          variant={selectedVariant}
          onCancel={() => setSelectedVariant(null)}
          onAdd={handleAddLineItem}
        />
      ) : (
        <>
          {variants.length === 0 && <p>No active colors in the catalog yet.</p>}
          {variants.length > 0 && (
            <input
              type="search"
              placeholder="Search art number, name, or color…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ marginBottom: '1rem' }}
            />
          )}
          {variants.length > 0 && filteredVariants.length === 0 && <p>No matches.</p>}
          <div className="variant-picker-grid">
            {filteredVariants.map((variant) => (
              <div
                key={variant.id}
                className="variant-picker-item"
                onClick={() => setSelectedVariant(variant)}
              >
                {variant.image_url ? (
                  <img src={variant.image_url} alt={variant.color} />
                ) : (
                  <div style={{ width: '100%', aspectRatio: '1', background: '#f5f5f4', borderRadius: '0.4rem' }} />
                )}
                <div className="color">{variant.style.art_number}</div>
                <div className="art-number">
                  {variant.style.name} · {variant.color}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {cart.length > 0 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>This sale</h2>
          {cart.map((item) => (
            <div className="cart-item" key={item.tempId}>
              <div>
                <div>
                  <strong>{item.artNumber}</strong> · {item.styleName} — {item.color}
                  {item.size ? `, size ${item.size}` : ''}
                </div>
                <div className="art-number">
                  {item.quantity} × {item.unitType} @ {formatMoney(item.unitPrice)}
                </div>
              </div>
              <button type="button" className="link-button" onClick={() => handleRemoveLineItem(item.tempId)}>
                Remove
              </button>
            </div>
          ))}
          <div className="cart-total">
            <span>Total</span>
            <span>{formatMoney(total)}</span>
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="button" onClick={handleCompleteSale} disabled={submitting || !shopId}>
            {submitting ? 'Saving…' : 'Complete sale'}
          </button>
        </div>
      )}
    </div>
  )
}

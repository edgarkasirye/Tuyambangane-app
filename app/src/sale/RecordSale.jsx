import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth/AuthContext'
import { formatMoney } from '../lib/formatMoney'
import { todayLocalISODate, toLocalISODate, combineLocalDateAndTime } from '../lib/dateRange'
import LineItemForm from './LineItemForm'

// Handles both recording a new sale (/sales/record) and editing an
// existing one (/sales/:saleId/edit). Edit mode loads the sale into
// the same cart UI and saves through update_sale instead of record_sale.
export default function RecordSale() {
  const { saleId } = useParams()
  const isEdit = Boolean(saleId)
  const { user, staffProfile, isOwnerOrAdmin } = useAuth()
  const navigate = useNavigate()
  const today = todayLocalISODate()

  const [shops, setShops] = useState(null)
  const [shopId, setShopId] = useState(staffProfile.shop_id ?? '')
  const [date, setDate] = useState(today)
  const [variants, setVariants] = useState(null)
  const [query, setQuery] = useState('')
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [cart, setCart] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  // Edit mode only: the sale as loaded, so we can keep its original
  // time-of-day and tell whether the date was changed.
  const [originalSale, setOriginalSale] = useState(null)
  const [loadError, setLoadError] = useState(null)

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

  useEffect(() => {
    if (!isEdit) return
    let cancelled = false

    async function loadSale() {
      const { data, error } = await supabase
        .from('sales')
        .select(
          `id, sold_at, shop_id, staff_id,
           sale_line_items(size, quantity, unit_type, unit_price,
             variant:variants(id, color, style:styles(name, art_number)))`
        )
        .eq('id', saleId)
        .maybeSingle()

      if (cancelled) return
      if (error) {
        setLoadError(error.message)
        return
      }
      if (!data) {
        setLoadError('This sale was not found.')
        return
      }
      if (!isOwnerOrAdmin && data.staff_id !== user.id) {
        setLoadError('You can only edit sales you recorded yourself.')
        return
      }

      setOriginalSale(data)
      setShopId(data.shop_id)
      setDate(toLocalISODate(new Date(data.sold_at)))
      setCart(
        data.sale_line_items.map((li) => ({
          tempId: crypto.randomUUID(),
          variantId: li.variant.id,
          styleName: li.variant.style.name,
          artNumber: li.variant.style.art_number,
          color: li.variant.color,
          size: li.size,
          quantity: li.quantity,
          unitType: li.unit_type,
          unitPrice: Number(li.unit_price),
        }))
      )
    }

    loadSale()
    return () => {
      cancelled = true
    }
  }, [isEdit, saleId, isOwnerOrAdmin, user.id])

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

  // The timestamp to save. Untouched dates keep their exact original
  // value; a changed date keeps the original (or current) time of day.
  function soldAtToSave() {
    if (isEdit) {
      const originalDate = toLocalISODate(new Date(originalSale.sold_at))
      if (date === originalDate) return originalSale.sold_at
      return combineLocalDateAndTime(date, new Date(originalSale.sold_at))
    }
    // New sale for today: let the server stamp the exact time.
    if (date === today) return null
    return combineLocalDateAndTime(date, new Date())
  }

  async function handleSave() {
    if (date > today) {
      setError('A sale cannot be dated in the future.')
      return
    }
    setSubmitting(true)
    setError(null)

    const payload = cart.map((item) => ({
      variant_id: item.variantId,
      size: item.size,
      quantity: item.quantity,
      unit_type: item.unitType,
      unit_price: item.unitPrice,
    }))

    const { error } = isEdit
      ? await supabase.rpc('update_sale', {
          p_sale_id: saleId,
          p_shop_id: shopId,
          p_sold_at: soldAtToSave(),
          p_line_items: payload,
        })
      : await supabase.rpc('record_sale', {
          p_shop_id: shopId,
          p_line_items: payload,
          p_sold_at: soldAtToSave(),
        })

    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setCart([])
    navigate(`/sales?date=${date}`)
  }

  async function handleDelete() {
    if (!window.confirm('Delete this whole sale? This cannot be undone.')) return
    setDeleting(true)
    setError(null)

    const { data, error } = await supabase.from('sales').delete().eq('id', saleId).select('id')

    setDeleting(false)
    if (error) {
      setError(error.message)
      return
    }
    if (!data || data.length === 0) {
      setError('This sale could not be deleted. You may not have permission.')
      return
    }
    navigate(`/sales?date=${date}`)
  }

  if (loadError) return <p className="form-error">{loadError}</p>
  if (!variants || (isEdit && !originalSale)) return <p className="page-loading">Loading…</p>

  const isBackdated = date !== today

  return (
    <div>
      <div className="page-title">
        <h1>{isEdit ? 'Edit sale' : 'Record sale'}</h1>
      </div>

      <div className="field-row">
        <label>
          Sale date
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value || today)}
            required
          />
        </label>

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
      </div>
      {!isEdit && isBackdated && (
        <p className="form-note">This sale will be recorded for a past date.</p>
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
          <button type="button" onClick={handleSave} disabled={submitting || deleting || !shopId}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Complete sale'}
          </button>
        </div>
      )}

      {isEdit && (
        <div className="card">
          {cart.length === 0 && (
            <p>A sale needs at least one item. Add an item, or delete the sale instead.</p>
          )}
          {cart.length === 0 && error && <p className="form-error">{error}</p>}
          <button type="button" className="danger" onClick={handleDelete} disabled={deleting || submitting}>
            {deleting ? 'Deleting…' : 'Delete sale'}
          </button>
        </div>
      )}
    </div>
  )
}

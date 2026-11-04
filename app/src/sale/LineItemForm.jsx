import { useState } from 'react'
import { PreviewableThumb } from '../components/PhotoPreview'

export default function LineItemForm({ variant, onCancel, onAdd }) {
  const sizes = variant.style.sizes_offered ?? []
  const [size, setSize] = useState(sizes[0] ?? '')
  const [customSize, setCustomSize] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unitType, setUnitType] = useState('pair')
  const [unitPrice, setUnitPrice] = useState(variant.style.recommended_price ?? '')

  // Carton (wholesale/bulk) sales are a box of mixed or unspecified
  // sizes, not one pair, so there's no single size to record.
  const needsSize = unitType === 'pair'

  function handleSubmit(e) {
    e.preventDefault()
    const finalSize = !needsSize
      ? null
      : sizes.length === 0 || size === '__custom__'
        ? customSize.trim()
        : size

    onAdd({
      variantId: variant.id,
      styleName: variant.style.name,
      artNumber: variant.style.art_number,
      color: variant.color,
      imageUrl: variant.image_url,
      size: finalSize,
      quantity: Number(quantity),
      unitType,
      unitPrice: Number(unitPrice),
    })
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="page-title">
        <div className="line-with-thumb">
          <PreviewableThumb
            className="variant-thumb"
            src={variant.image_url}
            alt={variant.color}
            caption={`${variant.style.art_number} · ${variant.style.name} — ${variant.color}`}
          />
          <strong>
            {variant.style.art_number} · {variant.style.name} — {variant.color}
          </strong>
        </div>
        <button type="button" className="link-button" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <label>
        Sale type
        <div className="unit-toggle">
          <button
            type="button"
            className={unitType === 'pair' ? 'selected' : ''}
            onClick={() => setUnitType('pair')}
          >
            Pair
          </button>
          <button
            type="button"
            className={unitType === 'carton' ? 'selected' : ''}
            onClick={() => setUnitType('carton')}
          >
            Carton
          </button>
        </div>
      </label>

      {needsSize && (
        <>
          <label>
            Size
            {sizes.length > 0 ? (
              <select value={size} onChange={(e) => setSize(e.target.value)}>
                {sizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="__custom__">Other…</option>
              </select>
            ) : (
              <input
                value={customSize}
                onChange={(e) => setCustomSize(e.target.value)}
                placeholder="Size"
                required
              />
            )}
          </label>
          {sizes.length > 0 && size === '__custom__' && (
            <label>
              Size (other)
              <input value={customSize} onChange={(e) => setCustomSize(e.target.value)} required />
            </label>
          )}
        </>
      )}

      <div className="field-row">
        <label>
          Quantity
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </label>
        <label>
          Price charged
          <input
            type="number"
            min="0"
            step="0.01"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            required
          />
        </label>
      </div>

      <button type="submit">Add to sale</button>
    </form>
  )
}

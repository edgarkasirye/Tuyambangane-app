import { useState } from 'react'
import { useLongPress } from '../lib/useLongPress'
import { PhotoPreview } from '../components/PhotoPreview'

// One tile in the Record sale catalog grid.
//   tap            -> choose this color for the sale
//   press and hold -> show the photo full screen (if it has one)
export default function VariantPickerTile({ variant, onSelect }) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const hasPhoto = Boolean(variant.image_url)

  const { handlers, consumeLongPress } = useLongPress(() => {
    if (hasPhoto) setPreviewOpen(true)
  })

  const caption = `${variant.style.art_number} · ${variant.style.name} — ${variant.color}`

  return (
    <>
      <div
        className="variant-picker-item"
        role="button"
        tabIndex={0}
        aria-label={`${caption}. Tap to add${hasPhoto ? ', press and hold to see photo' : ''}.`}
        {...handlers}
        onClick={() => {
          if (consumeLongPress()) return // that was a hold, not a tap
          onSelect(variant)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect(variant)
          }
        }}
      >
        {hasPhoto ? (
          <img src={variant.image_url} alt={variant.color} draggable={false} />
        ) : (
          <div style={{ width: '100%', aspectRatio: '1', background: '#f5f5f4', borderRadius: '0.4rem' }} />
        )}
        <div className="color">{variant.style.art_number}</div>
        <div className="art-number">
          {variant.style.name} · {variant.color}
        </div>
      </div>
      {previewOpen && (
        <PhotoPreview src={variant.image_url} caption={caption} onClose={() => setPreviewOpen(false)} />
      )}
    </>
  )
}

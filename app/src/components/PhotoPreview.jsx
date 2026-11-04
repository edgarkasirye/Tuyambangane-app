import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// Full-screen photo viewer. Tap anywhere (or press Escape) to close.
// Rendered into <body> via a portal so it sits above the header/nav.
export function PhotoPreview({ src, caption, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    // Stop the page behind from scrolling while the viewer is open.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return createPortal(
    <div
      className="photo-preview"
      role="dialog"
      aria-modal="true"
      aria-label={caption ?? 'Photo'}
      onClick={(e) => {
        // React events bubble through portals to the component that
        // opened us (e.g. a catalog card link). Stop that here so
        // closing the viewer doesn't also "tap" whatever is underneath.
        e.stopPropagation()
        e.preventDefault()
        onClose()
      }}
    >
      <img src={src} alt={caption ?? ''} />
      {caption && <div className="photo-preview-caption">{caption}</div>}
      <button type="button" className="photo-preview-close" aria-label="Close photo">
        ×
      </button>
    </div>,
    document.body
  )
}

// A thumbnail that opens the full-screen viewer when tapped. With no
// photo it renders the usual empty grey square, not tappable.
// `className` sizes it (e.g. "variant-thumb", "style-card-thumb").
export function PreviewableThumb({ src, alt, caption, className }) {
  const [open, setOpen] = useState(false)

  if (!src) return <div className={className} />

  return (
    <>
      <button
        type="button"
        className={`thumb-button ${className}`}
        aria-label={`View photo: ${caption ?? alt}`}
        onClick={(e) => {
          // Don't let the tap also trigger a surrounding link/row.
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
      >
        <img src={src} alt={alt} />
      </button>
      {open && <PhotoPreview src={src} caption={caption ?? alt} onClose={() => setOpen(false)} />}
    </>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { PreviewableThumb } from '../components/PhotoPreview'

export default function StylesList() {
  const [styles, setStyles] = useState(null)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('styles')
        .select('id, art_number, name, variants(id, color, image_url, active)')
        .order('art_number')

      if (cancelled) return
      if (error) setError(error.message)
      else setStyles(data)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredStyles = useMemo(() => {
    if (!styles) return null
    const q = query.trim().toLowerCase()
    if (!q) return styles
    return styles.filter((style) => {
      if (style.art_number.toLowerCase().includes(q)) return true
      if (style.name.toLowerCase().includes(q)) return true
      return style.variants.some((v) => v.color.toLowerCase().includes(q))
    })
  }, [styles, query])

  if (error) return <p className="form-error">{error}</p>
  if (!styles) return <p className="page-loading">Loading catalog…</p>

  return (
    <div>
      <div className="page-title">
        <h1>Catalog</h1>
        <Link className="fab-link" to="/catalog/new">
          + Add Art No.
        </Link>
      </div>

      <input
        type="search"
        placeholder="Search art number, name, or color…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: '1rem' }}
      />

      {styles.length === 0 && <p>No styles yet. Add your first one.</p>}
      {styles.length > 0 && filteredStyles.length === 0 && <p>No matches.</p>}

      <div className="card-list">
        {filteredStyles.map((style) => {
          const thumb = style.variants.find((v) => v.image_url)?.image_url
          const activeCount = style.variants.filter((v) => v.active).length

          return (
            <Link key={style.id} to={`/catalog/${style.id}`} className="card style-card">
              <PreviewableThumb
                className="style-card-thumb"
                src={thumb}
                alt={style.name}
                caption={`${style.art_number} · ${style.name}`}
              />
              <div className="style-card-info">
                <div className="art-number-primary">{style.art_number}</div>
                <div className="style-name-secondary">{style.name}</div>
              </div>
              <span className="badge">
                {activeCount} color{activeCount === 1 ? '' : 's'} active
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

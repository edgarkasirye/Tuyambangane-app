import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth/AuthContext'
import { todayLocalISODate, startOfLocalDayISO, endOfLocalDayISO } from '../lib/dateRange'

export default function SalesView() {
  const { isOwnerOrAdmin } = useAuth()
  const today = todayLocalISODate()

  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [shops, setShops] = useState(null)
  const [shopFilter, setShopFilter] = useState('all')
  const [sales, setSales] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isOwnerOrAdmin) return
    supabase
      .from('shops')
      .select('id, name')
      .order('name')
      .then(({ data, error }) => {
        if (!error) setShops(data)
      })
  }, [isOwnerOrAdmin])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setSales(null)
      const { data, error } = await supabase
        .from('sales')
        .select(
          `id, sold_at,
           shop:shops(id, name),
           staff:staff(name),
           sale_line_items(id, size, quantity, unit_type, unit_price, total_amount,
             variant:variants(color, style:styles(name, art_number)))`
        )
        .gte('sold_at', startOfLocalDayISO(startDate))
        .lte('sold_at', endOfLocalDayISO(endDate))
        .order('sold_at', { ascending: false })

      if (cancelled) return
      if (error) setError(error.message)
      else setSales(data)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [startDate, endDate])

  const filteredSales = useMemo(() => {
    if (!sales) return null
    if (shopFilter === 'all') return sales
    return sales.filter((sale) => sale.shop.id === shopFilter)
  }, [sales, shopFilter])

  const grandTotal = useMemo(() => {
    if (!filteredSales) return 0
    return filteredSales.reduce(
      (sum, sale) => sum + sale.sale_line_items.reduce((s, li) => s + Number(li.total_amount), 0),
      0
    )
  }, [filteredSales])

  return (
    <div>
      <div className="page-title">
        <h1>Sales</h1>
      </div>

      <div className="date-range-bar">
        <label>
          From
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setStartDate(today)
            setEndDate(today)
          }}
        >
          Today
        </button>
        {isOwnerOrAdmin && shops && (
          <label>
            Shop
            <select value={shopFilter} onChange={(e) => setShopFilter(e.target.value)}>
              <option value="all">All shops</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}

      {!filteredSales && !error && <p className="page-loading">Loading sales…</p>}

      {filteredSales && (
        <>
          <div className="sale-summary-row">
            <span>
              {filteredSales.length} sale{filteredSales.length === 1 ? '' : 's'}
            </span>
            <span className="total">{grandTotal}</span>
          </div>

          {filteredSales.length === 0 && <p>No sales in this range.</p>}

          <div className="card-list">
            {filteredSales.map((sale) => {
              const saleTotal = sale.sale_line_items.reduce(
                (s, li) => s + Number(li.total_amount),
                0
              )
              return (
                <div className="card" key={sale.id}>
                  <div className="sale-card-header">
                    <span>
                      {sale.shop.name} · {sale.staff.name}
                    </span>
                    <span>{new Date(sale.sold_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {sale.sale_line_items.map((li) => (
                    <div className="sale-line" key={li.id}>
                      <span>
                        <strong>{li.variant.style.art_number}</strong> · {li.variant.style.name} —{' '}
                        {li.variant.color}
                        {li.size ? `, size ${li.size}` : ''} ({li.quantity} {li.unit_type})
                      </span>
                      <span>{li.total_amount}</span>
                    </div>
                  ))}
                  <div className="cart-total">
                    <span>Total</span>
                    <span>{saleTotal}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

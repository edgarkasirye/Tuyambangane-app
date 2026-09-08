import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth/AuthContext'
import { todayLocalISODate, startOfLocalDayISO, endOfLocalDayISO, toLocalISODate } from '../lib/dateRange'
import { formatMoney } from '../lib/formatMoney'
import MonthCalendar from './MonthCalendar'

export default function SalesView() {
  const { isOwnerOrAdmin } = useAuth()
  const today = todayLocalISODate()
  const todayObj = new Date(`${today}T00:00:00`)

  const [date, setDate] = useState(today)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [viewYear, setViewYear] = useState(todayObj.getFullYear())
  const [viewMonth, setViewMonth] = useState(todayObj.getMonth())
  const [monthSales, setMonthSales] = useState(null)
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

  // Which days in the currently-viewed month have at least one sale,
  // so the calendar can show a dot instead of making staff guess.
  useEffect(() => {
    let cancelled = false

    async function loadMonth() {
      const start = new Date(viewYear, viewMonth, 1)
      const end = new Date(viewYear, viewMonth + 1, 1)
      const { data, error } = await supabase
        .from('sales')
        .select('sold_at, shop_id')
        .gte('sold_at', start.toISOString())
        .lt('sold_at', end.toISOString())

      if (cancelled) return
      if (!error) setMonthSales(data)
    }

    loadMonth()
    return () => {
      cancelled = true
    }
  }, [viewYear, viewMonth])

  const datesWithSales = useMemo(() => {
    const set = new Set()
    if (!monthSales) return set
    for (const s of monthSales) {
      if (shopFilter !== 'all' && s.shop_id !== shopFilter) continue
      set.add(toLocalISODate(new Date(s.sold_at)))
    }
    return set
  }, [monthSales, shopFilter])

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
        .gte('sold_at', startOfLocalDayISO(date))
        .lte('sold_at', endOfLocalDayISO(date))
        .order('sold_at', { ascending: false })

      if (cancelled) return
      if (error) setError(error.message)
      else setSales(data)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [date])

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

  const isToday = date === today

  function handleToday() {
    setDate(today)
    setViewYear(todayObj.getFullYear())
    setViewMonth(todayObj.getMonth())
  }

  function handleChangeMonth(delta) {
    let m = viewMonth + delta
    let y = viewYear
    if (m < 0) {
      m = 11
      y -= 1
    } else if (m > 11) {
      m = 0
      y += 1
    }
    setViewMonth(m)
    setViewYear(y)
  }

  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div>
      <div className="page-title">
        <h1>Sales</h1>
      </div>

      <div className="date-range-bar">
        <button type="button" className="date-picker-toggle" onClick={() => setCalendarOpen((o) => !o)}>
          {dateLabel} {calendarOpen ? '▴' : '▾'}
        </button>
        <button type="button" className="secondary" onClick={handleToday} disabled={isToday}>
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

      {calendarOpen && (
        <MonthCalendar
          year={viewYear}
          month={viewMonth}
          selectedDate={date}
          datesWithSales={datesWithSales}
          onSelectDate={(d) => {
            setDate(d)
            setCalendarOpen(false)
          }}
          onChangeMonth={handleChangeMonth}
        />
      )}

      {error && <p className="form-error">{error}</p>}

      {!filteredSales && !error && <p className="page-loading">Loading sales…</p>}

      {filteredSales && (
        <>
          <div className="sale-summary-row">
            <span>
              {filteredSales.length} sale{filteredSales.length === 1 ? '' : 's'}
            </span>
            <span className="total">{formatMoney(grandTotal)}</span>
          </div>

          {filteredSales.length === 0 && <p>No sales on this date.</p>}

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
                      <span>{formatMoney(li.total_amount)}</span>
                    </div>
                  ))}
                  <div className="cart-total">
                    <span>Total</span>
                    <span>{formatMoney(saleTotal)}</span>
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

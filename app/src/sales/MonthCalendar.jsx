import { useMemo } from 'react'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// A small custom month grid, since the browser's native date input
// can't show which days already have sales on them. A dot under a
// day means at least one sale was recorded that day.
export default function MonthCalendar({ year, month, selectedDate, datesWithSales, onSelectDate, onChangeMonth }) {
  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const startOffset = firstDay.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const arr = []
    for (let i = 0; i < startOffset; i++) arr.push(null)
    for (let d = 1; d <= daysInMonth; d++) arr.push(d)
    return arr
  }, [year, month])

  function dateStr(day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button type="button" className="link-button" onClick={() => onChangeMonth(-1)} aria-label="Previous month">
          ‹
        </button>
        <span>{monthLabel}</span>
        <button type="button" className="link-button" onClick={() => onChangeMonth(1)} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="calendar-weekdays">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="calendar-cell empty" />
          const ds = dateStr(day)
          const hasSales = datesWithSales.has(ds)
          const isSelected = ds === selectedDate
          return (
            <button
              type="button"
              key={ds}
              className={`calendar-cell${isSelected ? ' selected' : ''}${hasSales ? ' has-sales' : ''}`}
              onClick={() => onSelectDate(ds)}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

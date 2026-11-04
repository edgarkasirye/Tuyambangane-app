// Sales are reviewed by calendar day in the shop's own local time, not
// UTC, so "today" here means the browser's local today.

export function toLocalISODate(date) {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 10)
}

export function todayLocalISODate() {
  return toLocalISODate(new Date())
}

export function startOfLocalDayISO(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toISOString()
}

export function endOfLocalDayISO(dateStr) {
  return new Date(`${dateStr}T23:59:59.999`).toISOString()
}

// Builds the sold_at timestamp for a sale placed on `dateStr` (a local
// "YYYY-MM-DD"), keeping the local time-of-day from `timeSource`. Used
// for backdating ("this sale happened last Tuesday") and for moving an
// existing sale to another day without losing its original time. If
// the result would land in the future (e.g. moving an evening sale to
// this morning), it's clamped to now, since the database rejects
// future-dated sales.
export function combineLocalDateAndTime(dateStr, timeSource) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const combined = new Date(
    y,
    m - 1,
    d,
    timeSource.getHours(),
    timeSource.getMinutes(),
    timeSource.getSeconds()
  )
  const now = new Date()
  return (combined > now ? now : combined).toISOString()
}

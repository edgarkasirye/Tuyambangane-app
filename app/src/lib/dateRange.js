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

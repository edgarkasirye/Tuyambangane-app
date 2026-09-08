// Formats a number with thousands separators for display only
// ("45000" -> "45,000"). Never use this on a value that still needs
// to be edited or sent back to the database, native number inputs
// can't contain commas, so editable price fields stay plain numbers.
export function formatMoney(amount) {
  const n = Number(amount)
  if (Number.isNaN(n)) return amount
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

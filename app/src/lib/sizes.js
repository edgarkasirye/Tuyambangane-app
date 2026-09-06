// Sizes are entered by staff as a simple comma-separated list
// ("38, 39, 40, 41") rather than a picker, since shoe sizing schemes
// vary and this keeps the form simple. Stored as a Postgres text[].

export function parseSizes(input) {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function formatSizes(sizes) {
  return (sizes ?? []).join(', ')
}

// Maps a handful of expected Postgres constraint violations to messages
// a non-technical shop staff member can actually act on, instead of the
// raw "duplicate key value violates unique constraint ..." text.
export function friendlyDbError(err) {
  if (err?.code === '23505') {
    if (err.message?.includes('variants_style_color_unique_idx')) {
      return 'This color has already been added to this style.'
    }
    if (err.message?.includes('art_number')) {
      return 'That article number is already used by another style.'
    }
    return 'That already exists.'
  }
  return err?.message ?? 'Something went wrong.'
}

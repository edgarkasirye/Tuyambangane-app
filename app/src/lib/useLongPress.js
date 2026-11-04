import { useEffect, useRef } from 'react'

// Press-and-hold detection that works for touch and mouse.
//
// Returns { handlers, consumeLongPress }:
//   - spread `handlers` onto the element
//   - in that element's onClick, call consumeLongPress() first; it
//     returns true (and resets) if this tap was actually a long press,
//     so the normal tap action can be skipped.
//
// The press is cancelled if the finger moves more than a few pixels,
// so scrolling through a list never triggers it.
export function useLongPress(onLongPress, { ms = 450, moveTolerance = 10 } = {}) {
  const timer = useRef(null)
  const start = useRef(null)
  const fired = useRef(false)
  const callback = useRef(onLongPress)
  useEffect(() => {
    callback.current = onLongPress
  }, [onLongPress])

  function clear() {
    clearTimeout(timer.current)
    timer.current = null
    start.current = null
  }

  const handlers = {
    onPointerDown(e) {
      fired.current = false
      start.current = { x: e.clientX, y: e.clientY }
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        fired.current = true
        timer.current = null
        callback.current()
      }, ms)
    },
    onPointerMove(e) {
      if (!start.current || !timer.current) return
      const dx = e.clientX - start.current.x
      const dy = e.clientY - start.current.y
      if (Math.hypot(dx, dy) > moveTolerance) clear()
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    // Suppress the phone's own long-press menu ("Save image", etc).
    onContextMenu(e) {
      e.preventDefault()
    },
  }

  function consumeLongPress() {
    const was = fired.current
    fired.current = false
    return was
  }

  return { handlers, consumeLongPress }
}

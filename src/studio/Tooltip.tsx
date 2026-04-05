import { useState, useRef, useCallback, type ReactNode } from 'react'

interface TooltipProps {
  text: string
  children: ReactNode
}

export function Tooltip({ text, children }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const wrapRef = useRef<HTMLSpanElement>(null)

  const handleMouseEnter = useCallback(() => {
    if (!wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    setCoords({ x: rect.left + rect.width / 2, y: rect.top })
    setVisible(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setVisible(false)
  }, [])

  return (
    <span
      ref={wrapRef}
      className="tooltip-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {visible && (
        <span
          className="tooltip-content"
          style={{ left: coords.x, top: coords.y }}
        >
          {text}
        </span>
      )}
    </span>
  )
}

import { useEffect, useRef } from 'react'

interface WaveformStripProps {
  collapsed: boolean
  onToggle: () => void
}

export function WaveformStrip({ collapsed, onToggle }: WaveformStripProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Draw a static flat line placeholder
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)
    ctx.strokeStyle = '#2a2a2a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, h / 2)
    ctx.lineTo(w, h / 2)
    ctx.stroke()
  }, [collapsed])

  return (
    <div className={`studio-waveform${collapsed ? ' collapsed' : ''}`}>
      <span className="studio-waveform-label">OUTPUT</span>
      <canvas
        ref={canvasRef}
        className="studio-waveform-canvas"
        width={800}
        height={32}
      />
      <span className="studio-waveform-time">00:00</span>
      <button
        className="studio-wave-toggle"
        onClick={onToggle}
        title={collapsed ? 'Show waveform' : 'Hide waveform'}
      >
        {collapsed ? '∨' : '∧'}
      </button>
    </div>
  )
}

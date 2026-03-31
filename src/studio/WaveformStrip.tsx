import { useEffect, useRef } from 'react'
import type * as Tone from 'tone'

interface WaveformStripProps {
  collapsed: boolean
  onToggle: () => void
  analyser: Tone.Analyser | null
}

export function WaveformStrip({ collapsed, onToggle, analyser }: WaveformStripProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!analyser || collapsed) {
      // Draw static flat line
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)
      ctx.strokeStyle = '#2a2a2a'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, h / 2)
      ctx.lineTo(w, h / 2)
      ctx.stroke()
      return
    }

    function draw() {
      if (!canvas || !ctx || !analyser) return
      const w = canvas.width
      const h = canvas.height
      const waveform = analyser.getValue() as Float32Array

      ctx.clearRect(0, 0, w, h)
      ctx.strokeStyle = '#00ff41'
      ctx.lineWidth = 1.5
      ctx.beginPath()

      const sliceWidth = w / waveform.length
      let x = 0
      for (let i = 0; i < waveform.length; i++) {
        const y = ((waveform[i] + 1) / 2) * h
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
        x += sliceWidth
      }
      ctx.stroke()

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [analyser, collapsed])

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

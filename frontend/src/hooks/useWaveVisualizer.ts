/**
 * useWaveVisualizer — AnalyserNode-driven Canvas waveform animator
 *
 * Draws a time-domain waveform reacting to live audio input.
 * Colors: electric blue (#00d4ff) for Listening, violet (#9b59b6) for Speaking.
 * fftSize is set by caller (from useVoiceRecorder.analyserRef) — keep at 256 or 512
 * for iPad performance (higher values cause frame-time variance issues per RESEARCH.md).
 */
import { useRef, useCallback } from 'react'

export function useWaveVisualizer() {
  const rafRef = useRef<number | null>(null)

  /**
   * Start drawing the waveform on the given canvas.
   * @param canvas — HTMLCanvasElement to draw on
   * @param analyser — AnalyserNode connected to audio source
   * @param color — Hex color string: '#00d4ff' for listening, '#9b59b6' for speaking
   * @returns cleanup function (call on component unmount or state change)
   */
  const startVisualization = useCallback(
    (canvas: HTMLCanvasElement, analyser: AnalyserNode, color: string) => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return () => {}

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const draw = () => {
        rafRef.current = requestAnimationFrame(draw)
        analyser.getByteTimeDomainData(dataArray)

        // Clear with transparent black for motion trail effect
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        const sliceWidth = canvas.width / dataArray.length
        let x = 0

        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i] / 128.0  // Normalize: 0-255 → 0-2 (1.0 = silence center)
          const y = (v * canvas.height) / 2

          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
          x += sliceWidth
        }

        // Connect to right edge at center height
        ctx.lineTo(canvas.width, canvas.height / 2)
        ctx.stroke()
      }

      draw()

      // Return cleanup function
      return () => {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    },
    []
  )

  const stopVisualization = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  return { startVisualization, stopVisualization }
}

/**
 * ListeningMode — Audio-reactive Canvas waveform visualization (per LIST-01 to LIST-04)
 * Stitch screen ID: d6bf4b24d8844d3ba4aa32d422a6a8c4
 *
 * Design: Dark #0e0e0e background, primary blue #85adff waveform, "Listening..." label.
 * Canvas waveform reacts to actual audio levels from AnalyserNode.
 * No other UI elements — fully immersive (LIST-04).
 */
import { useEffect, useRef } from 'react'
import { useWaveVisualizer } from '../hooks/useWaveVisualizer'

// Props: analyserRef passed from App.tsx (connected to MediaRecorder stream)
interface ListeningModeProps {
  analyserRef: React.RefObject<AnalyserNode | null>
}

// Primary blue waveform per Stitch Listening Mode screen — #85adff (var(--color-primary))
const WAVE_COLOR = '#85adff'

export function ListeningMode({ analyserRef }: ListeningModeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { startVisualization, stopVisualization } = useWaveVisualizer()

  useEffect(() => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current

    if (!canvas || !analyser) return

    // Set canvas to device pixel ratio for crisp rendering on Retina iPad
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * dpr
    canvas.height = canvas.offsetHeight * dpr
    const ctx = canvas.getContext('2d')
    ctx?.scale(dpr, dpr)

    const cleanup = startVisualization(canvas, analyser, WAVE_COLOR)
    return cleanup
  }, [analyserRef, startVisualization])

  // Suppress exhaustive-deps warning — stopVisualization is stable (useCallback with no deps)
  useEffect(() => {
    return () => {
      stopVisualization()
    }
  }, [stopVisualization])

  return (
    <div
      className="w-screen h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'var(--color-background)' }}
    >
      {/* Audio-reactive waveform canvas (LIST-02) */}
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{
          height: '30vh',
          maxWidth: '80vw',
        }}
      />

      {/* "Listening..." label — Space Grotesk, on-surface-variant (LIST-03, D-27) */}
      <p
        className="mt-8 text-sm tracking-widest uppercase"
        style={{
          fontFamily: 'var(--font-label)',
          color: 'var(--color-on-surface-variant)',  // #adaaaa — never pure white
          letterSpacing: '0.15em',
        }}
      >
        Listening...
      </p>

      {/* LIST-04: No other UI elements */}
    </div>
  )
}

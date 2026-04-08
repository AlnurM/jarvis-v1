/**
 * SpeakingMode — Purple waveform + subtitle text overlay (per SPEAK-01 to SPEAK-03)
 * Stitch screen ID: 8554ef1a3efa42f9a07ad8774a690a7d
 *
 * Design:
 * - Wave animation in purple/violet #9b59b6 (SPEAK-01, D-33)
 * - AI response text as subtitles at bottom, max 2 lines visible (SPEAK-02, D-34)
 * - Subtitle fades in with speech progress (SPEAK-03, D-35)
 * - Tap anywhere stops TTS and returns to idle (D-36, TTS-03)
 *
 * The analyserRef prop is connected to the same AudioContext as during listening,
 * but for SpeakingMode the waveform reacts to the TTS audio output routed
 * through an AnalyserNode. If no analyser is connected (TTS on system audio bus),
 * the waveform animates as a static sine wave fallback.
 */
import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { useAssistantStore } from '../store/assistantStore'
import { useWaveVisualizer } from '../hooks/useWaveVisualizer'

interface SpeakingModeProps {
  analyserRef?: React.RefObject<AnalyserNode | null>
  onTap?: () => void  // Tap handler from App.tsx — calls stopSpeaking
}

// Violet/purple per SPEAK-01, D-33
const WAVE_COLOR = '#9b59b6'

export function SpeakingMode({ analyserRef, onTap }: SpeakingModeProps) {
  const { response } = useAssistantStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { startVisualization, stopVisualization } = useWaveVisualizer()

  // Start waveform if analyser is available (connected to audio source)
  useEffect(() => {
    const canvas = canvasRef.current
    const analyser = analyserRef?.current

    if (!canvas) return
    if (!analyser) {
      // Fallback: draw a gentle static waveform to indicate speaking state
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      // Static flatline with slight curve — shows JARVIS is speaking even without analyser data
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.beginPath()
      ctx.strokeStyle = WAVE_COLOR
      ctx.lineWidth = 2.5
      ctx.moveTo(0, canvas.height / 2)
      ctx.bezierCurveTo(
        canvas.width * 0.25, canvas.height * 0.3,
        canvas.width * 0.75, canvas.height * 0.7,
        canvas.width, canvas.height / 2
      )
      ctx.stroke()
      return
    }

    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * dpr
    canvas.height = canvas.offsetHeight * dpr
    const ctx = canvas.getContext('2d')
    ctx?.scale(dpr, dpr)

    const cleanup = startVisualization(canvas, analyser, WAVE_COLOR)
    return cleanup
  }, [analyserRef, startVisualization])

  // Cleanup visualization on unmount
  useEffect(() => {
    return () => {
      stopVisualization()
    }
  }, [stopVisualization])

  // Split response text into words for progressive subtitle display (SPEAK-02)
  // Show max 2 lines at ~40 chars per line = ~80 chars visible
  const maxChars = 80
  const subtitleText = response.length > maxChars
    ? `...${response.slice(-maxChars)}`
    : response

  return (
    <div
      className="w-screen h-screen flex flex-col items-center justify-center overflow-hidden relative"
      style={{ background: '#0a0a0a' }}
      onClick={onTap}
      onTouchEnd={onTap}
    >
      {/* Atmospheric glow behind waveform */}
      <div
        className="absolute rounded-full"
        style={{
          width: 300,
          height: 300,
          background: `radial-gradient(circle, ${WAVE_COLOR}30 0%, transparent 70%)`,
          filter: 'blur(60px)',
          top: '30%',
          transform: 'translateY(-50%)',
        }}
      />

      {/* Purple waveform canvas (SPEAK-01) */}
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{
          height: '28vh',
          maxWidth: '80vw',
          position: 'relative',
          zIndex: 1,
        }}
      />

      {/* Subtitle text — fades in per SPEAK-03 */}
      {response && (
        <motion.div
          key={subtitleText}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}  // per D-38
          className="absolute bottom-16 px-8 text-center"
          style={{ zIndex: 2 }}
        >
          <p
            className="text-base leading-relaxed"
            style={{
              // SPEAK-02: max 2 lines — overflow hidden
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              // design.md: never pure white — use on-surface-variant
              color: 'var(--color-on-surface-variant)',
              fontFamily: 'var(--font-display)',
              maxWidth: '70vw',
              textShadow: `0 0 20px ${WAVE_COLOR}80`,
            }}
          >
            {subtitleText}
          </p>
        </motion.div>
      )}

      {/* Tap hint — very subtle, fades away after 2s */}
      <motion.p
        className="absolute bottom-6 text-xs tracking-widest uppercase"
        style={{
          fontFamily: 'var(--font-label)',
          color: `${WAVE_COLOR}40`,
          letterSpacing: '0.15em',
        }}
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 0 }}
        transition={{ delay: 2, duration: 1.5 }}
      >
        Tap to stop
      </motion.p>
    </div>
  )
}

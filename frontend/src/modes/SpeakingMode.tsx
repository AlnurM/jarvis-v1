/**
 * SpeakingMode — Top tab bar, purple vertical equalizer bars, response card, weather widget, avatar
 * Stitch screen ID: 8554ef1a3efa42f9a07ad8774a690a7d
 *
 * Design:
 * - Top tab bar: DIAGNOSTICS / VOICE MODE (active) / PROTOCOLS
 * - Purple vertical equalizer bars (10 bars, #ad89ff gradient) react to analyser or animate statically
 * - AI response text in glassmorphism card ABOVE bars
 * - Mini weather widget decorative top-right
 * - Circular avatar button bottom-left
 * - Tap anywhere stops TTS and returns to idle (D-36, TTS-03)
 */
import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useAssistantStore } from '../store/assistantStore'

interface SpeakingModeProps {
  analyserRef?: React.RefObject<AnalyserNode | null>
  onTap?: () => void  // Tap handler from App.tsx — calls stopSpeaking
}

export function SpeakingMode({ analyserRef, onTap }: SpeakingModeProps) {
  const { response } = useAssistantStore()
  const [barHeights, setBarHeights] = useState<number[]>(Array(10).fill(20))

  // Audio-reactive bars — same pattern as ListeningMode but 10 bars
  useEffect(() => {
    const analyser = analyserRef?.current
    if (!analyser) {
      // Static bezier fallback — gentle pulsing bars when no analyser connected
      const interval = setInterval(() => {
        setBarHeights(Array.from({ length: 10 }, (_, i) => {
          const center = 5
          const dist = Math.abs(i - center)
          return 30 + Math.random() * (50 - dist * 8)
        }))
      }, 200)
      return () => clearInterval(interval)
    }

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    let rafId: number

    const update = () => {
      analyser.getByteFrequencyData(dataArray)
      const step = Math.floor(bufferLength / 10)
      const heights = Array.from({ length: 10 }, (_, i) => {
        const val = dataArray[i * step] || 0
        return Math.max(10, (val / 255) * 100)
      })
      setBarHeights(heights)
      rafId = requestAnimationFrame(update)
    }
    rafId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(rafId)
  }, [analyserRef])

  // Show last 100 chars of response with ellipsis prefix
  const maxChars = 100
  const subtitleText = response.length > maxChars
    ? `...${response.slice(-maxChars)}`
    : response

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden relative"
      style={{ background: 'var(--color-background)' }}
      onClick={onTap}
      onTouchEnd={onTap}
    >
      {/* Top tab bar */}
      <div className="flex items-center justify-center gap-8 py-3">
        {(['DIAGNOSTICS', 'VOICE MODE', 'PROTOCOLS'] as const).map((tab) => (
          <span
            key={tab}
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.625rem',
              color: tab === 'VOICE MODE' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              opacity: tab === 'VOICE MODE' ? 1 : 0.5,
              fontWeight: tab === 'VOICE MODE' ? 600 : 400,
            }}
          >
            {tab}
          </span>
        ))}
      </div>

      {/* Mini weather widget — decorative top-right */}
      <div
        className="absolute top-3 right-4 flex items-center gap-2"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: 'var(--radius-xl)',
          padding: '0.5rem 0.75rem',
        }}
      >
        <span style={{
          fontSize: '0.75rem',
          color: 'var(--color-on-surface)',
          fontFamily: 'var(--font-label)',
          fontWeight: 600,
        }}>
          --°
        </span>
        <span style={{
          fontSize: '0.625rem',
          color: 'var(--color-on-surface-variant)',
          fontFamily: 'var(--font-label)',
        }}>
          --
        </span>
      </div>

      {/* Center area — response card above bars */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">

        {/* Response text in glassmorphism card */}
        {response && (
          <motion.div
            key={subtitleText}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ maxWidth: '60vw' }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderRadius: 'var(--radius-xl)',
                padding: '1rem 1.5rem',
              }}
            >
              <p
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  color: 'var(--color-on-surface-variant)',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.9375rem',
                  lineHeight: 1.6,
                  textAlign: 'center',
                }}
              >
                "{subtitleText}"
              </p>
            </div>
          </motion.div>
        )}

        {/* Purple vertical equalizer bars */}
        <div className="flex items-end justify-center gap-2" style={{ height: 100 }}>
          {barHeights.map((h, i) => (
            <motion.div
              key={i}
              className="rounded-full"
              style={{
                width: 6,
                background: 'linear-gradient(to top, #ad89ff, #d4b8ff)',
                minHeight: 8,
              }}
              animate={{ height: `${h}%` }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
        </div>
      </div>

      {/* Circular avatar button — bottom-left */}
      <div
        className="absolute bottom-6 left-6"
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #85adff 0%, #6c9fff 100%)',
          boxShadow: '0 0 20px rgba(133, 173, 255, 0.3)',
        }}
      />

      {/* Tap hint — very subtle, fades away after 2s */}
      <motion.p
        className="absolute bottom-6 text-xs tracking-widest uppercase"
        style={{
          fontFamily: 'var(--font-label)',
          color: '#ad89ff40',
          letterSpacing: '0.15em',
          left: '50%',
          transform: 'translateX(-50%)',
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

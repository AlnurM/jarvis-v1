/**
 * ListeningMode — Full Stitch-fidelity listening mode layout
 * Stitch screen ID: d6bf4b24d8844d3ba4aa32d422a6a8c4
 *
 * Layout: Circular mic icon (blue-purple gradient) + 14 audio-reactive equalizer bars
 * + "Listening..." + "AUDIO STREAM ACTIVE" labels + bottom status panels
 * + bottom-left protocol text.
 *
 * Root is w-full h-full — fills AppShell content area (not full screen).
 */
import { useEffect, useState } from 'react'

// Props: analyserRef passed from App.tsx (connected to MediaRecorder stream)
interface ListeningModeProps {
  analyserRef: React.RefObject<AnalyserNode | null>
}

const BAR_COUNT = 14

export function ListeningMode({ analyserRef }: ListeningModeProps) {
  const [barHeights, setBarHeights] = useState<number[]>(Array(BAR_COUNT).fill(20))

  // Audio-reactive equalizer bars — reads frequency data from AnalyserNode
  useEffect(() => {
    const analyser = analyserRef.current
    if (!analyser) {
      // Idle animation — gentle random movement when no analyser connected
      const interval = setInterval(() => {
        setBarHeights(Array.from({ length: BAR_COUNT }, () => 15 + Math.random() * 30))
      }, 300)
      return () => clearInterval(interval)
    }

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    let rafId: number

    const update = () => {
      analyser.getByteFrequencyData(dataArray)
      const step = Math.floor(bufferLength / BAR_COUNT)
      const heights = Array.from({ length: BAR_COUNT }, (_, i) => {
        const val = dataArray[i * step] || 0
        return Math.max(8, (val / 255) * 100)
      })
      setBarHeights(heights)
      rafId = requestAnimationFrame(update)
    }
    rafId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(rafId)
  }, [analyserRef])

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center overflow-hidden relative"
      style={{ background: 'var(--color-background)' }}
    >
      {/* Circular mic icon — blue-purple gradient, centered upper area */}
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #85adff 0%, #ad89ff 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 60px rgba(133, 173, 255, 0.3), 0 0 120px rgba(173, 137, 255, 0.15)',
        }}
      >
        {/* Mic SVG icon — dark fill on bright gradient circle */}
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0e0e0e"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z" />
          <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="8" y1="22" x2="16" y2="22" />
        </svg>
      </div>

      {/* Equalizer bars — 14 audio-reactive vertical bars in primary blue */}
      <div
        className="flex items-end justify-center gap-1"
        style={{ height: 80, marginTop: 24 }}
      >
        {Array.from({ length: BAR_COUNT }, (_, i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: 4,
              height: `${barHeights[i] || 20}%`,
              background: i % 3 === 0
                ? 'linear-gradient(to top, #85adff, #ad89ff)'
                : '#85adff',
              transition: 'height 0.1s cubic-bezier(0.22, 1, 0.36, 1)',
              minHeight: 4,
            }}
          />
        ))}
      </div>

      {/* "Listening..." text — Inter, semi-bold, on-surface */}
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.25rem',
          fontWeight: 600,
          color: 'var(--color-on-surface)',
          marginTop: 16,
          letterSpacing: '0.02em',
        }}
      >
        Listening...
      </p>

      {/* "AUDIO STREAM ACTIVE" label — Space Grotesk, uppercase, muted */}
      <p
        style={{
          fontFamily: 'var(--font-label)',
          fontSize: '0.625rem',
          color: 'var(--color-on-surface-variant)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginTop: 8,
          opacity: 0.7,
        }}
      >
        AUDIO STREAM ACTIVE
      </p>

      {/* Bottom-right status panels — glassmorphism cards */}
      <div className="absolute bottom-6 right-6 flex gap-3">
        {/* AMBIENT NOISE panel */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 'var(--radius-xl)',
            padding: '0.75rem 1rem',
            minWidth: 100,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.5rem',
              color: 'var(--color-on-surface-variant)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              opacity: 0.6,
              display: 'block',
            }}
          >
            AMBIENT NOISE
          </span>
          <p
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.875rem',
              color: 'var(--color-on-surface)',
              marginTop: 4,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            LOW
          </p>
        </div>

        {/* CONFIDENCE panel */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 'var(--radius-xl)',
            padding: '0.75rem 1rem',
            minWidth: 100,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.5rem',
              color: 'var(--color-on-surface-variant)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              opacity: 0.6,
              display: 'block',
            }}
          >
            CONFIDENCE
          </span>
          {/* Confidence bar — 82% primary blue */}
          <div
            style={{
              marginTop: 4,
              height: 4,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.1)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '82%',
                height: '100%',
                borderRadius: 2,
                background: '#85adff',
              }}
            />
          </div>
        </div>
      </div>

      {/* Bottom-left protocol text */}
      <p
        className="absolute bottom-6 left-6"
        style={{
          fontFamily: 'var(--font-label)',
          fontSize: '0.5rem',
          color: 'var(--color-on-surface-variant)',
          letterSpacing: '0.1em',
          opacity: 0.4,
        }}
      >
        CORE PROCESSING UNIT 01 // LISTENING PROTOCOL V3.0
      </p>
    </div>
  )
}

/**
 * PrayerMode — Full-screen prayer times display with live countdown (per PRAY-01 to PRAY-04)
 * Stitch screen ID: b9c8cef5cb4b4a9db5931e80797efe16
 *
 * Design:
 * - Full screen #0e0e0e background
 * - Center: next prayer name large (Space Grotesk) + live countdown timer in primary blue
 * - Bottom half: all 5 prayers listed, next highlighted, passed dimmed to 0.35 opacity
 * - setInterval countdown updates every second, cleared on unmount
 * - Midnight crossing handled: delta <= 0 adds 1440 minutes (Pitfall 4)
 * - No pure white text, no 1px borders — glassmorphism via backdrop-blur + rgba
 */
import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useAssistantStore } from '../store/assistantStore'

// ─── Type definitions ─────────────────────────────────────────────────────────

interface PrayerData {
  Fajr: string    // "03:40" HH:MM local Almaty time
  Dhuhr: string   // "11:54"
  Asr: string     // "15:33"
  Maghrib: string // "18:28"
  Isha: string    // "20:09"
}

const PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const
type PrayerName = typeof PRAYER_ORDER[number]

// ─── Helper functions ─────────────────────────────────────────────────────────

/** Convert "HH:MM" string to total minutes since midnight */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Compute the next prayer and how many seconds remain until it starts (Pitfall 4: midnight) */
function computeCountdown(data: PrayerData): { nextName: PrayerName; secondsLeft: number } {
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const entries = PRAYER_ORDER.map(name => ({ name, minutes: toMinutes(data[name]) }))

  // Find the first prayer that hasn't started yet; wraps to Fajr at midnight
  const next = entries.find(e => e.minutes > nowMin) ?? entries[0]

  let deltaMin = next.minutes - nowMin
  if (deltaMin <= 0) deltaMin += 1440  // midnight crossing: add 24 hours (Pitfall 4)

  const secondsLeft = deltaMin * 60 - now.getSeconds()
  return { nextName: next.name as PrayerName, secondsLeft }
}

/** Format seconds into HH:MM:SS or MM:SS */
function formatCountdown(seconds: number): string {
  const absSeconds = Math.max(0, seconds)
  const h = Math.floor(absSeconds / 3600)
  const m = Math.floor((absSeconds % 3600) / 60)
  const s = absSeconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Classify each prayer's display status relative to the current next prayer (D-16, D-17) */
function getPrayerStatus(
  name: PrayerName,
  data: PrayerData,
  nextName: PrayerName
): 'past' | 'next' | 'future' {
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const prayerMin = toMinutes(data[name])

  if (name === nextName) return 'next'
  if (prayerMin < nowMin) return 'past'
  return 'future'
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PrayerMode() {
  const modeData = useAssistantStore(s => s.modeData)
  const data = modeData as PrayerData | null

  const [countdown, setCountdown] = useState<{ nextName: PrayerName; secondsLeft: number } | null>(null)

  useEffect(() => {
    if (!data) return

    // Initialize immediately so there's no blank frame on first render
    setCountdown(computeCountdown(data))

    // Update every second — cleared on unmount (no memory leak)
    const timer = setInterval(() => setCountdown(computeCountdown(data)), 1000)
    return () => clearInterval(timer)
  }, [data])

  if (!data || !countdown) {
    return (
      <div
        className="w-screen h-screen flex items-center justify-center"
        style={{ background: '#0e0e0e' }}
      >
        <p
          style={{
            color: 'var(--color-on-surface-variant)',
            fontFamily: 'var(--font-label)',
            fontSize: '1rem',
            letterSpacing: '0.05em',
          }}
        >
          Prayer times unavailable
        </p>
      </div>
    )
  }

  return (
    <motion.div
      className="w-screen h-screen flex flex-col items-center justify-between overflow-hidden py-12"
      style={{ background: '#0e0e0e' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* ── Center: next prayer name + countdown ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">

        {/* "Next prayer" label — Space Grotesk, faded uppercase (D-14) */}
        <p
          style={{
            fontFamily: 'var(--font-label)',
            fontSize: '0.75rem',
            color: 'var(--color-on-surface-variant)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          Next prayer
        </p>

        {/* Next prayer name — large, Space Grotesk, near-white (D-13) */}
        <motion.h1
          key={countdown.nextName}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: 'var(--font-label)',  /* Space Grotesk — display metric */
            fontSize: 'clamp(3rem, 10vw, 6rem)',
            fontWeight: 700,
            color: '#e8e8e8',  /* near-white, not pure #FFFFFF */
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {countdown.nextName}
        </motion.h1>

        {/* Live countdown timer — primary blue, tabular nums for stable width (D-15) */}
        <p
          style={{
            fontFamily: 'var(--font-label)',
            fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
            color: 'var(--color-primary, #85adff)',
            fontWeight: 600,
            letterSpacing: '0.05em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatCountdown(countdown.secondsLeft)}
        </p>
      </div>

      {/* ── Bottom: all 5 prayers list (D-16, D-17) ── */}
      <div className="w-full px-8 flex flex-col gap-2 pb-4">
        {PRAYER_ORDER.map((name) => {
          const status = getPrayerStatus(name, data, countdown.nextName)
          const isNext = status === 'next'
          const isPast = status === 'past'

          return (
            <div
              key={name}
              className="flex justify-between items-center px-6 py-3 rounded-2xl"
              style={{
                /* Glassmorphism card — no 1px borders (No-Line Rule) */
                background: isNext
                  ? 'rgba(133, 173, 255, 0.1)'  /* primary glow tint for next prayer */
                  : 'rgba(32, 31, 31, 0.4)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                /* Subtle glow for next prayer — not a border, just luminous depth */
                boxShadow: isNext ? '0 0 30px rgba(133, 173, 255, 0.06)' : 'none',
                /* Passed prayers dimmed to 0.35 (D-17) */
                opacity: isPast ? 0.35 : 1,
                transition: 'opacity 0.3s ease, background 0.3s ease',
              }}
            >
              {/* Prayer name label — Inter for body text */}
              <span
                style={{
                  fontFamily: 'var(--font-display)',  /* Inter */
                  fontSize: '1rem',
                  fontWeight: isNext ? 600 : 400,
                  color: isNext
                    ? '#85adff'
                    : 'var(--color-on-surface-variant)',
                }}
              >
                {name}
              </span>

              {/* Prayer time — Space Grotesk, tabular nums */}
              <span
                style={{
                  fontFamily: 'var(--font-label)',  /* Space Grotesk — technical readout */
                  fontSize: '1rem',
                  color: isNext ? '#85adff' : 'var(--color-on-surface-variant)',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.05em',
                }}
              >
                {data[name]}
              </span>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

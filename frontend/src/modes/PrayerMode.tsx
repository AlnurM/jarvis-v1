/**
 * PrayerMode — Full-screen prayer times display with live countdown (per PRAY-01 to PRAY-04)
 * Stitch screen ID: b9c8cef5cb4b4a9db5931e80797efe16
 *
 * Design (04-10 rebuild):
 * - Header tab bar: PRAYER TIMES (active) / QIBLA / MEDITATION
 * - Center: NEXT PRAYER label → large prayer name → segmented countdown (HOURS/MINUTES/SECONDS)
 * - Green location pill: ALMATY, KZ + current time
 * - Right date panel: weekday/date, Islamic date placeholder, Golden Hour placeholder
 * - Bottom: 5 horizontal prayer cards — time prominent (1.25rem), name below (0.75rem)
 * - No CSS border: properties (No-Line Rule D-09)
 * - Easing: [0.22, 1, 0.36, 1] (D-07)
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

/** Split seconds into padded hours/minutes/seconds segments for labeled display */
function splitCountdown(seconds: number): { h: string; m: string; s: string } {
  const abs = Math.max(0, seconds)
  const h = Math.floor(abs / 3600)
  const m = Math.floor((abs % 3600) / 60)
  const s = abs % 60
  return {
    h: String(h).padStart(2, '0'),
    m: String(m).padStart(2, '0'),
    s: String(s).padStart(2, '0'),
  }
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
        className="w-full h-full flex items-center justify-center"
        style={{ background: 'var(--color-background)' }}
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

  const { h, m, s } = splitCountdown(countdown.secondsLeft)

  return (
    <motion.div
      className="w-full h-full flex flex-col overflow-hidden relative"
      style={{ background: 'var(--color-background)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* ── Header tab bar (centered, ~48px) ── */}
      <div className="flex items-center justify-center gap-8 py-3 flex-shrink-0">
        {(['PRAYER TIMES', 'QIBLA', 'MEDITATION'] as const).map((tab) => (
          <span
            key={tab}
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.625rem',
              color: tab === 'PRAYER TIMES' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              opacity: tab === 'PRAYER TIMES' ? 1 : 0.5,
              fontWeight: tab === 'PRAYER TIMES' ? 600 : 400,
            }}
          >
            {tab}
          </span>
        ))}
      </div>

      {/* ── Main content area: center + right date panel ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left/Center: NEXT PRAYER label + prayer name + countdown + location pill */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4">

          {/* "NEXT PRAYER" label */}
          <p style={{
            fontFamily: 'var(--font-label)',
            fontSize: '0.625rem',
            color: 'var(--color-on-surface-variant)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            opacity: 0.7,
          }}>
            NEXT PRAYER
          </p>

          {/* Large prayer name — uppercase, Space Grotesk */}
          <motion.h1
            key={countdown.nextName}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: 'clamp(3rem, 8vw, 5rem)',
              fontWeight: 700,
              color: '#e8e8e8',
              letterSpacing: '-0.02em',
              lineHeight: 1,
              textTransform: 'uppercase',
            }}
          >
            {countdown.nextName}
          </motion.h1>

          {/* Countdown segmented: HOURS / MINUTES / SECONDS */}
          <div className="flex items-start gap-6 mt-2">
            {/* Hours */}
            <div className="flex flex-col items-center">
              <span style={{
                fontFamily: 'var(--font-label)',
                fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                fontWeight: 600,
                color: 'var(--color-primary)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.05em',
              }}>
                {h}
              </span>
              <span style={{
                fontFamily: 'var(--font-label)',
                fontSize: '0.5rem',
                color: 'var(--color-on-surface-variant)',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                opacity: 0.6,
                marginTop: 4,
              }}>
                HOURS
              </span>
            </div>

            {/* Minutes */}
            <div className="flex flex-col items-center">
              <span style={{
                fontFamily: 'var(--font-label)',
                fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                fontWeight: 600,
                color: 'var(--color-primary)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.05em',
              }}>
                {m}
              </span>
              <span style={{
                fontFamily: 'var(--font-label)',
                fontSize: '0.5rem',
                color: 'var(--color-on-surface-variant)',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                opacity: 0.6,
                marginTop: 4,
              }}>
                MINUTES
              </span>
            </div>

            {/* Seconds */}
            <div className="flex flex-col items-center">
              <span style={{
                fontFamily: 'var(--font-label)',
                fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                fontWeight: 600,
                color: 'var(--color-primary)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.05em',
              }}>
                {s}
              </span>
              <span style={{
                fontFamily: 'var(--font-label)',
                fontSize: '0.5rem',
                color: 'var(--color-on-surface-variant)',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                opacity: 0.6,
                marginTop: 4,
              }}>
                SECONDS
              </span>
            </div>
          </div>

          {/* Green location pill */}
          <div
            className="mt-4"
            style={{
              background: 'rgba(76, 175, 80, 0.15)',
              borderRadius: '999px',
              padding: '0.5rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4caf50' }} />
            <span style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.625rem',
              color: '#4caf50',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              ALMATY, KZ — {new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Almaty' })}
            </span>
          </div>
        </div>

        {/* Right date panel (200px wide) */}
        <div
          className="flex flex-col gap-4 justify-center px-6 flex-shrink-0"
          style={{ width: 200 }}
        >
          {/* Weekday + date */}
          <div>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.875rem',
              color: 'var(--color-on-surface)',
              fontWeight: 500,
            }}>
              {new Date().toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Almaty' })}
            </p>
          </div>

          {/* Islamic date placeholder */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 'var(--radius-xl)',
            padding: '0.75rem 1rem',
          }}>
            <span style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.5rem',
              color: 'var(--color-on-surface-variant)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              opacity: 0.6,
              display: 'block',
            }}>
              ISLAMIC DATE
            </span>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.75rem',
              color: 'var(--color-on-surface-variant)',
              marginTop: 4,
            }}>
              --
            </p>
          </div>

          {/* Golden Hour indicator */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 'var(--radius-xl)',
            padding: '0.75rem 1rem',
          }}>
            <span style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.5rem',
              color: 'var(--color-on-surface-variant)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              opacity: 0.6,
              display: 'block',
            }}>
              GOLDEN HOUR
            </span>
            <p style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.75rem',
              color: '#ffc107',
              marginTop: 4,
            }}>
              --
            </p>
          </div>
        </div>
      </div>

      {/* ── Bottom: 5 horizontal prayer cards ── */}
      <div className="px-8 pb-6 pt-4 flex gap-3 flex-shrink-0">
        {PRAYER_ORDER.map((name) => {
          const status = getPrayerStatus(name, data, countdown.nextName)
          const isNext = status === 'next'
          const isPast = status === 'past'

          return (
            <div
              key={name}
              className="flex-1 flex flex-col items-center py-4 px-3"
              style={{
                background: isNext
                  ? 'linear-gradient(135deg, rgba(133, 173, 255, 0.12) 0%, rgba(173, 137, 255, 0.06) 100%), rgba(32, 31, 31, 0.4)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%), rgba(32, 31, 31, 0.4)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                /* Inset box-shadow for next-prayer glow (No-Line Rule: no CSS border) */
                boxShadow: isNext
                  ? '0 0 30px rgba(133, 173, 255, 0.12), inset 0 0 0 1px rgba(133, 173, 255, 0.15)'
                  : '0 0 30px rgba(133, 173, 255, 0.04)',
                borderRadius: 'var(--radius-xl)',
                opacity: isPast ? 0.35 : 1,
                transition: 'opacity 0.3s cubic-bezier(0.22, 1, 0.36, 1), background 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              {/* Time prominent (large) */}
              <span style={{
                fontFamily: 'var(--font-label)',
                fontSize: '1.25rem',
                fontWeight: 600,
                color: isNext ? '#85adff' : 'var(--color-on-surface)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.02em',
              }}>
                {data[name]}
              </span>
              {/* Prayer name below (smaller) */}
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.75rem',
                color: isNext ? '#85adff' : 'var(--color-on-surface-variant)',
                marginTop: 6,
                fontWeight: isNext ? 600 : 400,
              }}>
                {name}
              </span>
              {/* Status dot for next prayer */}
              {isNext && (
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#85adff',
                  marginTop: 8,
                  boxShadow: '0 0 8px rgba(133, 173, 255, 0.5)',
                }} />
              )}
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

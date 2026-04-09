/**
 * BriefingMode — Morning briefing split layout
 * Per D-16, D-19, BRIEF-01/02/03
 *
 * Design:
 * - Split layout: events left, weather + summary right
 * - Full-width quote card at the bottom
 * - FloatingMic at bottom right (per D-19)
 * - Fills AppShell content area (w-full h-full)
 * - No pure white text — #e8e8e8 for headings, on-surface-variant for body
 * - No 1px borders — glassmorphism via backdrop-blur + rgba (No-Line Rule)
 * - Custom easing: [0.22, 1, 0.36, 1] (D-07)
 */
import { motion } from 'motion/react'
import { useAssistantStore } from '../store/assistantStore'
import { FloatingMic } from '../components/FloatingMic'

// ─── Type definitions ──────────────────────────────────────────────────────────

interface BriefingEvent {
  id: string
  title: string
  start: string
  end: string
}

interface BriefingWeather {
  temp?: number
  condition_main?: string
  icon?: string
}

interface BriefingData {
  weather: BriefingWeather
  events: BriefingEvent[]
  summary: string
  quote: string
}

interface BriefingModeProps {
  onStartListening?: () => void
  onStopListening?: () => void
}

// ─── Helper functions ──────────────────────────────────────────────────────────

/** Format ISO datetime string to HH:MM in Asia/Almaty timezone */
function formatEventTime(isoStr: string): string {
  if (!isoStr) return ''
  try {
    return new Date(isoStr).toLocaleTimeString('ru', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Almaty',
    })
  } catch {
    return isoStr
  }
}

// ─── Reusable glassmorphism card style ─────────────────────────────────────────

const glassCard: React.CSSProperties = {
  background:
    'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%), rgba(32, 31, 31, 0.4)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  boxShadow: '0 0 30px rgba(133, 173, 255, 0.05)',
  borderRadius: 'var(--radius-xl)',
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function BriefingMode({ onStartListening, onStopListening }: BriefingModeProps = {}) {
  const modeData = useAssistantStore((s) => s.modeData)
  const data = modeData as BriefingData | null

  if (!data || !data.weather || !data.summary) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--color-background)' }}>
        <p style={{ color: 'var(--color-on-surface-variant)', fontFamily: 'var(--font-label)', fontSize: '1rem' }}>
          Briefing loading...
        </p>
      </div>
    )
  }

  return (
    <motion.div
      className="w-full h-full flex flex-col overflow-hidden relative"
      style={{ background: 'var(--color-background)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
    >
      {/* ── Main grid: events left | weather+summary right ── */}
      <div
        className="flex-1 overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.5rem',
          padding: '1.5rem 2rem',
        }}
      >
        {/* ── LEFT: Today's Schedule ── */}
        <div className="flex flex-col gap-3 overflow-hidden">
          {/* Section label */}
          <p
            style={{
              color: 'var(--color-on-surface-variant)',
              fontFamily: 'var(--font-heading)',
              fontSize: '0.6875rem',
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            Today's Schedule
          </p>

          {/* Event list */}
          <div className="flex flex-col gap-2 overflow-y-auto" style={{ flex: 1 }}>
            {data && data.events && data.events.length > 0 ? (
              data.events.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.06,
                    ease: [0.22, 1, 0.36, 1] as const,
                  }}
                  style={{
                    ...glassCard,
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                  }}
                >
                  <p
                    style={{
                      color: '#e8e8e8',
                      fontFamily: 'var(--font-heading)',
                      fontSize: '0.9375rem',
                      fontWeight: 500,
                      margin: 0,
                    }}
                  >
                    {event.title}
                  </p>
                  <p
                    style={{
                      color: 'var(--color-on-surface-variant)',
                      fontFamily: 'var(--font-label)',
                      fontSize: '0.75rem',
                      margin: 0,
                    }}
                  >
                    {formatEventTime(event.start)}
                    {event.end ? ` – ${formatEventTime(event.end)}` : ''}
                  </p>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
                style={{
                  ...glassCard,
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <p
                  style={{
                    color: 'var(--color-on-surface-variant)',
                    fontFamily: 'var(--font-label)',
                    fontSize: '0.875rem',
                    margin: 0,
                  }}
                >
                  No events today
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Weather + AI Summary ── */}
        <div className="flex flex-col gap-3 overflow-hidden">
          {/* Section label */}
          <p
            style={{
              color: 'var(--color-on-surface-variant)',
              fontFamily: 'var(--font-heading)',
              fontSize: '0.6875rem',
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            Weather Outlook
          </p>

          {/* Weather card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 1, 0.36, 1] as const }}
            style={{
              ...glassCard,
              padding: '1.25rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            {data?.weather?.temp != null ? (
              <>
                <p
                  style={{
                    color: '#e8e8e8',
                    fontFamily: 'var(--font-label)',
                    fontSize: 'clamp(2.5rem, 6vw, 4rem)',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                    margin: 0,
                  }}
                >
                  {data.weather.temp}°C
                </p>
                <p
                  style={{
                    color: 'var(--color-on-surface-variant)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '1rem',
                    margin: 0,
                  }}
                >
                  {data.weather.condition_main ?? 'Almaty'}
                </p>
              </>
            ) : (
              <p
                style={{
                  color: 'var(--color-on-surface-variant)',
                  fontFamily: 'var(--font-label)',
                  fontSize: '0.875rem',
                  margin: 0,
                }}
              >
                Weather data unavailable
              </p>
            )}
          </motion.div>

          {/* AI-generated summary card */}
          {data?.summary && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] as const }}
              style={{
                ...glassCard,
                padding: '1.25rem 1.5rem',
                flex: 1,
              }}
            >
              <p
                style={{
                  color: 'var(--color-on-surface-variant)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1rem',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {data.summary}
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── BOTTOM: Inspirational quote spanning full width ── */}
      {data?.quote && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] as const }}
          style={{
            margin: '0 2rem 1.5rem',
            padding: '1rem 1.5rem',
            ...glassCard,
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            // Primary color glow edge — not a 1px border
            boxShadow: '-6px 0 24px -4px rgba(133, 173, 255, 0.25), 0 0 30px rgba(133, 173, 255, 0.05)',
          }}
        >
          {/* Wide glow accent instead of a 1px line */}
          <div
            style={{
              width: '4px',
              minWidth: '4px',
              height: '100%',
              background: 'linear-gradient(180deg, rgba(133, 173, 255, 0.8) 0%, rgba(173, 137, 255, 0.4) 100%)',
              borderRadius: '4px',
              filter: 'blur(2px)',
            }}
          />
          <p
            style={{
              color: 'var(--color-on-surface-variant)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.9375rem',
              fontStyle: 'italic',
              textAlign: 'center',
              flex: 1,
              margin: 0,
            }}
          >
            {data.quote}
          </p>
        </motion.div>
      )}

      {/* ── FloatingMic — bottom right (per D-19) ── */}
      {onStartListening && onStopListening && (
        <FloatingMic
          onStartListening={onStartListening}
          onStopListening={onStopListening}
        />
      )}
    </motion.div>
  )
}

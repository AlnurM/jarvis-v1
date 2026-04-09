/**
 * CalendarMode — Week view calendar with event cards and voice-to-event creation.
 * Stitch screen: CAL-01 / CAL-02
 *
 * Design:
 * - Top half: 7-column week grid (Mon–Sun) with event chips in day columns
 * - Bottom half: scrollable glassmorphism event cards
 * - Current day highlighted with primary color at low opacity
 * - Created event confirmation with primary accent color
 * - FloatingMic at bottom right for voice interaction (D-13)
 * - Fills AppShell content area (w-full h-full, NOT w-screen h-screen)
 * - No pure white text — #e8e8e8 or var(--color-on-surface-variant) (D-10)
 * - No 1px borders — glassmorphism via backdrop-blur + rgba only (No-Line Rule)
 * - Custom easing: [0.22, 1, 0.36, 1] (D-07)
 */
import { motion } from 'motion/react'
import { useAssistantStore } from '../store/assistantStore'
import { FloatingMic } from '../components/FloatingMic'

// ─── Type definitions ─────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
}

interface CalendarData {
  events: CalendarEvent[]
  week_start?: string
  error?: string
  created_event?: { id: string; title: string; start: string; end: string }
}

interface CalendarModeProps {
  onStartListening?: () => void
  onStopListening?: () => void
}

// ─── Helper functions ─────────────────────────────────────────────────────────

/** Parse ISO datetime string and return "HH:MM" in local time. */
function formatEventTime(isoString: string): string {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString('ru', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Almaty',
    })
  } catch {
    return ''
  }
}

/** Format date to short weekday abbreviation in Russian. */
function formatDayAbbr(date: Date): string {
  return date.toLocaleDateString('ru', { weekday: 'short' }).toUpperCase()
}

/** Return YYYY-MM-DD string from a Date object. */
function toDateKey(date: Date): string {
  return date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Almaty' })
}

/** Get Monday of the week containing the given ISO date string (or today). */
function getWeekDays(weekStart?: string): Date[] {
  let monday: Date
  if (weekStart) {
    monday = new Date(weekStart)
  } else {
    const now = new Date()
    const day = now.getDay()
    const diff = day === 0 ? -6 : 1 - day
    monday = new Date(now)
    monday.setDate(now.getDate() + diff)
    monday.setHours(0, 0, 0, 0)
  }
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

// ─── Glassmorphism card style (per D-09, shared pattern) ─────────────────────

const glassCard: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%), rgba(32, 31, 31, 0.4)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  boxShadow: '0 0 30px rgba(133, 173, 255, 0.05)',
  borderRadius: 'var(--radius-xl)',
}

// ─── Motion variants for stagger animation (same as SearchMode) ───────────────

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CalendarMode({ onStartListening, onStopListening }: CalendarModeProps = {}) {
  const modeData = useAssistantStore(s => s.modeData)
  const data = modeData as CalendarData | null

  // ── Not authorized state ────────────────────────────────────────────────────
  if (data?.error === 'calendar_not_authorized') {
    return (
      <div
        className="w-full h-full flex items-center justify-center relative"
        style={{ background: 'var(--color-background)' }}
      >
        <div style={{ ...glassCard, padding: '2rem 3rem', textAlign: 'center' }}>
          <p
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.875rem',
              letterSpacing: '0.1em',
              color: 'var(--color-on-surface-variant)',
              marginBottom: '0.5rem',
            }}
          >
            CALENDAR NOT CONNECTED
          </p>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.85rem',
              color: 'var(--color-on-surface-variant)',
            }}
          >
            Visit <span style={{ color: '#85adff' }}>/api/auth/google</span> to connect Google Calendar
          </p>
        </div>
        {onStartListening && onStopListening && (
          <FloatingMic onStartListening={onStartListening} onStopListening={onStopListening} />
        )}
      </div>
    )
  }

  const events: CalendarEvent[] = data?.events ?? []
  const weekDays = getWeekDays(data?.week_start)
  const todayKey = toDateKey(new Date())

  // Build a map: date key -> list of events on that day
  const eventsByDay: Record<string, CalendarEvent[]> = {}
  for (const day of weekDays) {
    eventsByDay[toDateKey(day)] = []
  }
  for (const event of events) {
    const key = (event.start ?? '').slice(0, 10)
    if (key in eventsByDay) {
      eventsByDay[key].push(event)
    }
  }

  return (
    <motion.div
      className="w-full h-full flex flex-col overflow-hidden relative"
      style={{ background: 'var(--color-background)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* ── Created event confirmation banner ── */}
      {data?.created_event && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: 'linear-gradient(135deg, rgba(133,173,255,0.15) 0%, rgba(133,173,255,0.05) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: 'var(--radius-xl)',
            margin: '0.75rem 1rem 0',
            padding: '0.5rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span style={{ color: '#85adff', fontSize: '1rem' }}>+</span>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.85rem',
              color: '#85adff',
            }}
          >
            Event created: {data.created_event.title} at {formatEventTime(data.created_event.start)}
          </p>
        </motion.div>
      )}

      {/* ── Top half — Week grid (CAL-01) ── */}
      <div className="flex-1 px-4 pt-4 pb-2 overflow-hidden">
        {/* Week grid header */}
        <p
          style={{
            fontFamily: 'var(--font-label)',
            fontSize: '0.7rem',
            letterSpacing: '0.12em',
            color: 'var(--color-on-surface-variant)',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
          }}
        >
          THIS WEEK
        </p>

        {/* 7-column grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px',
            height: 'calc(100% - 2rem)',
          }}
        >
          {weekDays.map(day => {
            const key = toDateKey(day)
            const isToday = key === todayKey
            const dayEvents = eventsByDay[key] ?? []

            return (
              <div
                key={key}
                style={{
                  ...glassCard,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '0.5rem 0.25rem',
                  background: isToday
                    ? 'linear-gradient(135deg, rgba(133,173,255,0.12) 0%, rgba(133,173,255,0.04) 100%), rgba(32,31,31,0.5)'
                    : glassCard.background,
                }}
              >
                {/* Day abbreviation */}
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: isToday ? '#85adff' : 'var(--color-on-surface-variant)',
                    letterSpacing: '0.05em',
                    marginBottom: '0.25rem',
                  }}
                >
                  {formatDayAbbr(day)}
                </span>
                {/* Day number */}
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: isToday ? '#e8e8e8' : 'var(--color-on-surface-variant)',
                    marginBottom: '0.25rem',
                  }}
                >
                  {day.getDate()}
                </span>
                {/* Event chips */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    width: '100%',
                    overflow: 'hidden',
                  }}
                >
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      style={{
                        background: isToday ? 'rgba(133,173,255,0.3)' : 'rgba(133,173,255,0.15)',
                        borderRadius: '3px',
                        padding: '1px 4px',
                        overflow: 'hidden',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.55rem',
                          color: '#e8e8e8',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'block',
                        }}
                      >
                        {event.title}
                      </span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.5rem',
                        color: 'var(--color-on-surface-variant)',
                        textAlign: 'center',
                      }}
                    >
                      +{dayEvents.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Bottom half — Events list (CAL-02) ── */}
      <div className="flex-1 px-4 pb-6 overflow-y-auto">
        <p
          style={{
            fontFamily: 'var(--font-label)',
            fontSize: '0.7rem',
            letterSpacing: '0.12em',
            color: 'var(--color-on-surface-variant)',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
          }}
        >
          EVENTS
        </p>

        {events.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.9rem',
                color: 'var(--color-on-surface-variant)',
              }}
            >
              No events this week
            </p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
          >
            {events.map(event => (
              <motion.div
                key={event.id}
                variants={cardVariants}
                style={{
                  ...glassCard,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  gap: '1rem',
                }}
              >
                {/* Time range — left side */}
                <div
                  style={{
                    minWidth: '5rem',
                    textAlign: 'center',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'var(--font-label)',
                      fontSize: '0.7rem',
                      color: '#85adff',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {formatEventTime(event.start)}
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-label)',
                      fontSize: '0.65rem',
                      color: 'var(--color-on-surface-variant)',
                    }}
                  >
                    {formatEventTime(event.end)}
                  </p>
                </div>

                {/* Divider line (luminous depth — not a border) */}
                <div
                  style={{
                    width: 1,
                    height: '2rem',
                    background: 'rgba(133, 173, 255, 0.2)',
                    flexShrink: 0,
                  }}
                />

                {/* Title — right side */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.9rem',
                      color: '#e8e8e8',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {event.title}
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.75rem',
                      color: 'var(--color-on-surface-variant)',
                    }}
                  >
                    {new Date(event.start).toLocaleDateString('ru', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      timeZone: 'Asia/Almaty',
                    })}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* ── FloatingMic — bottom right (D-13) ── */}
      {onStartListening && onStopListening && (
        <FloatingMic onStartListening={onStartListening} onStopListening={onStopListening} />
      )}
    </motion.div>
  )
}

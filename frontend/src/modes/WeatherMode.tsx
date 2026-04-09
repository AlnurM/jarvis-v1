/**
 * WeatherMode — Stitch-fidelity weather display
 * Stitch screen ID: 46d9c2600c1948658c68a31705074ca7
 *
 * Design:
 * - 2-column hero: large temp+condition left, large weather emoji right
 * - TEMPORAL PROJECTION — HOURLY section label above hourly cards
 * - Bottom stats row: 4 glassmorphism cards (Wind Direction, Humidity, Visibility, UV Index)
 * - Circular mic button bottom-right (absolute)
 * - Fills AppShell content area (w-full h-full, NOT w-screen h-screen)
 * - No pure white text — #e8e8e8 or var(--color-on-surface-variant) (D-10)
 * - No 1px borders — glassmorphism via backdrop-blur + rgba only (No-Line Rule)
 * - Custom easing: [0.22, 1, 0.36, 1] (D-07)
 */
import { motion } from 'motion/react'
import { useAssistantStore } from '../store/assistantStore'

// ─── Type definitions ─────────────────────────────────────────────────────────

interface HourlyItem {
  dt: number    // UTC unix timestamp
  temp: number  // integer °C
  icon: string  // OWM icon code e.g. "01d", "02n"
}

interface WeatherData {
  temp: number           // integer °C
  condition_id: number   // OWM code: 800=clear, 801-804=clouds, 500-531=rain, 200-232=storm, 600-622=snow
  condition_main: string // "Clear", "Clouds", "Rain", etc.
  icon: string           // OWM icon code
  hourly: HourlyItem[]   // up to 24 items
  // Optional stats — may not be present in backend response yet
  humidity?: number      // percentage 0-100
  wind_speed?: number    // km/h
  wind_deg?: number      // degrees 0-360
  visibility?: number    // km
  uv_index?: number      // 0-11+
}

// ─── Helper functions ─────────────────────────────────────────────────────────

/** Background color per condition code (D-10) */
function getConditionBg(id: number): string {
  if (id === 800) return '#0d1b2a'              // clear sky — deep blue
  if (id >= 801 && id <= 804) return '#1a1a1f'  // clouds — gray tint
  if (id >= 500 && id <= 531) return '#111418'  // rain — darker
  if (id >= 200 && id <= 232) return '#0e0e14'  // storm
  if (id >= 600 && id <= 622) return '#12161c'  // snow
  return '#0e0e0e'                              // fallback — design background token
}

/** Emoji icon per condition ID (main icon only) */
function getConditionEmoji(id: number): string {
  if (id === 800) return '☀️'
  if (id >= 801 && id <= 804) return '☁️'
  if (id >= 500 && id <= 531) return '🌧'
  if (id >= 200 && id <= 232) return '⛈'
  if (id >= 600 && id <= 622) return '❄️'
  if (id >= 700 && id <= 781) return '🌫'
  return '🌡'
}

/** Emoji icon per OWM icon code (for hourly items) */
function iconToEmoji(iconCode: string): string {
  // OWM icon codes: 01=clear, 02-04=clouds, 09-10=rain, 11=storm, 13=snow, 50=mist
  const prefix = iconCode.slice(0, 2)
  const map: Record<string, string> = {
    '01': '☀️',
    '02': '🌤',
    '03': '⛅',
    '04': '☁️',
    '09': '🌧',
    '10': '🌦',
    '11': '⛈',
    '13': '❄️',
    '50': '🌫',
  }
  return map[prefix] ?? '🌡'
}

/** Format UTC unix timestamp to HH:MM in Asia/Almaty timezone (Pitfall 6) */
function formatHour(dt: number): string {
  return new Date(dt * 1000).toLocaleTimeString('ru', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Almaty',
  })
}

// ─── Reusable glassmorphism card style ────────────────────────────────────────

const glassCard: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%), rgba(32, 31, 31, 0.4)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  boxShadow: '0 0 30px rgba(133, 173, 255, 0.05)',
  borderRadius: 'var(--radius-xl)',
}

// ─── Component ────────────────────────────────────────────────────────────────

// Props: onStartListening / onStopListening wired in Plan 05-03 (FloatingMic integration)
interface WeatherModeProps {
  onStartListening?: () => void
  onStopListening?: () => void
}

export function WeatherMode(_props: WeatherModeProps = {}) {
  const modeData = useAssistantStore(s => s.modeData)
  const data = modeData as WeatherData | null

  if (!data) {
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
          Weather data unavailable
        </p>
      </div>
    )
  }

  return (
    <motion.div
      className="w-full h-full flex flex-col overflow-hidden relative"
      style={{ background: getConditionBg(data.condition_id) }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* ── Hero section — 2-column layout ── */}
      <div className="flex-1 flex items-center justify-center px-12 gap-12">

        {/* Left column: temp + condition name + location */}
        <div className="flex flex-col gap-3">
          {/* Large temperature */}
          <div className="flex items-start">
            <span
              style={{
                fontFamily: 'var(--font-label)',
                fontSize: 'clamp(5rem, 12vw, 9rem)',
                fontWeight: 700,
                color: '#e8e8e8',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {data.temp}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-label)',
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                color: 'var(--color-on-surface-variant)',
                marginTop: '0.5rem',
              }}
            >
              °C
            </span>
          </div>

          {/* Condition name — Space Grotesk display weight */}
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              fontWeight: 600,
              color: 'var(--color-on-surface)',
              letterSpacing: '0.02em',
            }}
          >
            {data.condition_main}
          </p>

          {/* Location subtitle */}
          <p
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.625rem',
              color: 'var(--color-on-surface-variant)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              opacity: 0.7,
            }}
          >
            ALMATY, KAZAKHSTAN
          </p>
        </div>

        {/* Right column: large animated weather emoji */}
        <motion.div
          style={{ fontSize: 'clamp(6rem, 15vw, 10rem)', lineHeight: 1 }}
          animate={{ scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 4, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }}
          className="select-none"
        >
          {getConditionEmoji(data.condition_id)}
        </motion.div>
      </div>

      {/* ── TEMPORAL PROJECTION section label ── */}
      <div className="px-8 mb-3">
        <p
          style={{
            fontFamily: 'var(--font-label)',
            fontSize: '0.5rem',
            color: 'var(--color-on-surface-variant)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            opacity: 0.6,
          }}
        >
          TEMPORAL PROJECTION — HOURLY
        </p>
      </div>

      {/* ── Hourly forecast horizontal scroll ── */}
      <div
        className="px-8 mb-4"
        style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex gap-3" style={{ width: 'max-content' }}>
          {data.hourly.slice(0, 8).map((h) => (
            <div
              key={h.dt}
              className="flex flex-col items-center gap-2 px-4 py-3"
              style={{
                ...glassCard,
                minWidth: '70px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-label)',
                  fontSize: '0.75rem',
                  color: 'var(--color-on-surface-variant)',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatHour(h.dt)}
              </span>
              <span className="text-2xl select-none">{iconToEmoji(h.icon)}</span>
              <span
                style={{
                  fontFamily: 'var(--font-label)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#e8e8e8',
                }}
              >
                {h.temp}°
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom stats row — 4 glassmorphism cards ── */}
      <div className="px-8 pb-6 flex gap-3">

        {/* Wind Direction card */}
        <div style={{ ...glassCard, flex: 1, padding: '1rem' }}>
          <span
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.5rem',
              color: 'var(--color-on-surface-variant)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              opacity: 0.6,
            }}
          >
            WIND DIRECTION
          </span>
          <p
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--color-on-surface)',
              marginTop: 8,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {data.wind_deg != null ? `${data.wind_deg}°` : '--'}
          </p>
          <p
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.625rem',
              color: 'var(--color-on-surface-variant)',
              marginTop: 2,
            }}
          >
            {data.wind_speed != null ? `${data.wind_speed} km/h` : '--'}
          </p>
        </div>

        {/* Humidity card */}
        <div style={{ ...glassCard, flex: 1, padding: '1rem' }}>
          <span
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.5rem',
              color: 'var(--color-on-surface-variant)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              opacity: 0.6,
            }}
          >
            HUMIDITY
          </span>
          <p
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--color-on-surface)',
              marginTop: 8,
            }}
          >
            {data.humidity != null ? `${data.humidity}%` : '--%'}
          </p>
        </div>

        {/* Visibility card */}
        <div style={{ ...glassCard, flex: 1, padding: '1rem' }}>
          <span
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.5rem',
              color: 'var(--color-on-surface-variant)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              opacity: 0.6,
            }}
          >
            VISIBILITY
          </span>
          <p
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--color-on-surface)',
              marginTop: 8,
            }}
          >
            {data.visibility != null ? `${data.visibility} km` : '-- km'}
          </p>
        </div>

        {/* UV Index card */}
        <div style={{ ...glassCard, flex: 1, padding: '1rem' }}>
          <span
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '0.5rem',
              color: 'var(--color-on-surface-variant)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              opacity: 0.6,
            }}
          >
            UV INDEX
          </span>
          <p
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--color-on-surface)',
              marginTop: 8,
            }}
          >
            {data.uv_index != null ? data.uv_index.toFixed(1) : '--'}
          </p>
        </div>
      </div>

      {/* ── Circular mic button — absolute bottom-right ── */}
      <div
        className="absolute bottom-6 right-6"
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #85adff 0%, #6c9fff 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(133, 173, 255, 0.3)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0e0e0e" strokeWidth="2">
          <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z" />
          <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
        </svg>
      </div>
    </motion.div>
  )
}

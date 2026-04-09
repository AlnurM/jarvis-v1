/**
 * WeatherMode — Full-screen weather display with animated condition icon and hourly forecast
 * Stitch screen ID: 46d9c2600c1948658c68a31705074ca7
 *
 * Design:
 * - Background shifts based on weather condition code (D-10)
 * - Center: animated condition emoji + large temperature in Space Grotesk (D-11)
 * - Bottom: horizontal scrollable hourly forecast row with glassmorphism cards (D-12)
 * - No pure white text — #e8e8e8 or var(--color-on-surface-variant)
 * - No 1px borders — glassmorphism via backdrop-blur + rgba only
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

// ─── Component ────────────────────────────────────────────────────────────────

export function WeatherMode() {
  const modeData = useAssistantStore(s => s.modeData)
  const data = modeData as WeatherData | null

  if (!data) {
    return (
      <div
        className="w-screen h-screen flex items-center justify-center"
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
      className="w-screen h-screen flex flex-col items-center justify-between overflow-hidden"
      style={{ background: getConditionBg(data.condition_id) }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* ── Center: condition icon + temperature ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">

        {/* Animated condition emoji icon */}
        <motion.div
          className="text-8xl select-none"
          animate={{ scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 4, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }}
        >
          {getConditionEmoji(data.condition_id)}
        </motion.div>

        {/* Large temperature — Space Grotesk, not pure white (D-11) */}
        <div className="flex items-start">
          <span
            style={{
              fontFamily: 'var(--font-label)',  /* Space Grotesk — technical readout */
              fontSize: 'clamp(5rem, 15vw, 10rem)',
              fontWeight: 700,
              color: '#e8e8e8',  /* near-white, not pure #FFFFFF */
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            {data.temp}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: 'clamp(2rem, 5vw, 4rem)',
              color: 'var(--color-on-surface-variant)',
              marginTop: '0.5rem',
            }}
          >
            °C
          </span>
        </div>

        {/* Condition label — Inter, on-surface-variant, spaced uppercase */}
        <p
          style={{
            fontFamily: 'var(--font-display)',  /* Inter — body text */
            fontSize: '1.125rem',
            color: 'var(--color-on-surface-variant)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          {data.condition_main}
        </p>
      </div>

      {/* ── Bottom: hourly forecast horizontal scroll (D-12) ── */}
      <div
        className="w-full pb-8 px-4"
        style={{
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',  /* Pitfall 8: smooth momentum scroll on iPad */
        }}
      >
        <div
          className="flex gap-3 pb-2"
          style={{ width: 'max-content' }}
        >
          {data.hourly.slice(0, 12).map((h) => (
            <div
              key={h.dt}
              className="flex flex-col items-center gap-2 px-4 py-3"
              style={{
                /* Glassmorphism card — D-11 top-left gradient + backdrop-blur, no borders (No-Line Rule) */
                background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%), rgba(32, 31, 31, 0.4)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                /* Ambient shadow — primary-dim at 5% opacity per D-12, never black */
                boxShadow: '0 0 30px rgba(133, 173, 255, 0.05)',
                borderRadius: 'var(--radius-xl)',  /* 1.5rem per Stitch */
                minWidth: '70px',
              }}
            >
              {/* Hour label — Space Grotesk, on-surface-variant */}
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

              {/* Condition emoji for this hour */}
              <span className="text-2xl select-none">{iconToEmoji(h.icon)}</span>

              {/* Temperature — Space Grotesk, near-white */}
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
    </motion.div>
  )
}

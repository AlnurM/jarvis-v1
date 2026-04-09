/**
 * SearchMode — Brave Search results displayed as glassmorphism cards.
 * Stitch design: up to 3 result cards with favicon, source, title, snippet.
 *
 * Design rules:
 * - Fills AppShell content area (w-full h-full, NOT w-screen h-screen)
 * - glassCard pattern from WeatherMode — no 1px borders (No-Line Rule)
 * - Cards animate in with staggered bottom-up entrance (D-07)
 * - No onClick on cards — read-only display in PWA (D-05)
 * - FloatingMic at bottom right (D-06)
 * - Text: #e8e8e8 for titles, var(--color-on-surface-variant) for meta/snippets
 */
import { motion } from 'motion/react'
import { useAssistantStore } from '../store/assistantStore'
import { FloatingMic } from '../components/FloatingMic'

// ─── Type definitions ─────────────────────────────────────────────────────────

interface SearchResult {
  title: string
  url: string
  description: string
  favicon: string
  source: string
}

interface SearchData {
  results: SearchResult[]
}

interface SearchModeProps {
  onStartListening?: () => void
  onStopListening?: () => void
}

// ─── Glassmorphism card style (shared with WeatherMode/PrayerMode) ─────────────

const glassCard: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%), rgba(32, 31, 31, 0.4)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  boxShadow: '0 0 30px rgba(133, 173, 255, 0.05)',
  borderRadius: 'var(--radius-xl)',
}

// ─── Motion variants for staggered card entrance ──────────────────────────────

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SearchMode({ onStartListening, onStopListening }: SearchModeProps) {
  const { modeData } = useAssistantStore()
  const data = modeData as SearchData | null

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center px-8 py-6"
      style={{ background: 'var(--color-background)' }}
    >
      {/* Results list */}
      {!data || !data.results || data.results.length === 0 ? (
        <p
          className="text-sm tracking-widest uppercase"
          style={{ color: 'var(--color-on-surface-variant)', fontFamily: 'var(--font-label)' }}
        >
          No results found
        </p>
      ) : (
        <motion.div
          className="w-full max-w-2xl flex flex-col"
          style={{ gap: '1rem' }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {data.results.slice(0, 3).map((result, i) => (
            <motion.div
              key={i}
              style={{ ...glassCard, padding: '1.25rem 1.5rem' }}
              variants={cardVariants}
            >
              {/* Top row: favicon + source domain */}
              <div className="flex items-center gap-2 mb-2">
                {result.favicon ? (
                  <img
                    src={result.favicon}
                    alt=""
                    width={24}
                    height={24}
                    style={{ borderRadius: 4, flexShrink: 0 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : null}
                <span
                  className="text-xs tracking-wide uppercase truncate"
                  style={{ color: 'var(--color-on-surface-variant)', fontFamily: 'var(--font-label)' }}
                >
                  {result.source}
                </span>
              </div>

              {/* Title */}
              <p
                className="font-semibold mb-1 leading-snug"
                style={{
                  color: '#e8e8e8',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {result.title}
              </p>

              {/* Snippet */}
              <p
                className="text-sm leading-relaxed"
                style={{
                  color: 'var(--color-on-surface-variant)',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {result.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* FloatingMic overlay */}
      {onStartListening && onStopListening && (
        <FloatingMic onStartListening={onStartListening} onStopListening={onStopListening} />
      )}
    </div>
  )
}

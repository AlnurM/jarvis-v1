/**
 * ModeRouter — Switches between mode components with AnimatePresence transitions.
 *
 * Voice states take priority: listening → thinking → speaking each render their
 * full-screen mode component. On 'idle', renders the idle/orb view.
 *
 * AnimatePresence mode="wait" ensures exit animation completes before next mounts.
 * Custom easing cubic-bezier(0.22, 1, 0.36, 1) from design.md (D-38).
 *
 * AppShell wraps Listening, Speaking, Weather, and Prayer modes (per Stitch screens).
 * ThinkingMode and idle orb remain full-screen WITHOUT AppShell.
 */
import { AnimatePresence, motion } from 'motion/react'
import { useAssistantStore } from '../store/assistantStore'
import type { AssistantMode } from '../store/assistantStore'
import { ListeningMode } from '../modes/ListeningMode'
import { ThinkingMode } from '../modes/ThinkingMode'
import { SpeakingMode } from '../modes/SpeakingMode'
import { OrbAnimation } from './OrbAnimation'
import { WeatherMode } from '../modes/WeatherMode'
import { PrayerMode } from '../modes/PrayerMode'
import { SearchMode } from '../modes/SearchMode'
import { CalendarMode } from '../modes/CalendarMode'
import { BriefingMode } from '../modes/BriefingMode'
import { AppShell } from './AppShell'
import { ErrorBoundary } from './ErrorBoundary'
import type { RefObject } from 'react'

// Content modes: these screens stay visible during all voice states (LOOP-02)
// FloatingMic overlays the content screen; ModeRouter does NOT switch away on listening/thinking/speaking
const CONTENT_MODES = new Set<AssistantMode>(['weather', 'prayer', 'search', 'calendar', 'briefing'])

// Shared motion variants — crossfade (no black frame between modes)
// Both old and new are present simultaneously during transition.
// position:absolute + inset:0 ensures they overlap perfectly.
const modeVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
}

// Mode label map — defines AppShell chrome for modes that use it
// Keys match the `key` values assigned in ModeRouter logic below
const MODE_LABELS: Record<string, { label: string; status?: string }> = {
  listening: { label: 'LISTENING PROTOCOL V3.0', status: 'SYSTEM SECURE' },
  speaking: { label: 'JARVIS CORE: SPEAKING', status: 'VOICE MODE' },
  'content-weather': { label: 'ATMOSPHERIC ANALYSIS', status: 'LIVE DATA' },
  'content-prayer': { label: 'SPIRITUAL PATTERNS: ALMATY', status: 'PRAYER TIMES' },
  'content-search': { label: 'WEB INTELLIGENCE', status: 'LIVE RESULTS' },
  'content-calendar': { label: 'SCHEDULE MATRIX', status: 'GOOGLE CALENDAR' },
  'content-briefing': { label: 'MORNING PROTOCOL', status: 'BRIEFING ACTIVE' },
}

interface ModeRouterProps {
  analyserRef: RefObject<AnalyserNode | null>
  onStopSpeaking: () => void
  onStartListening: () => void  // NEW — passed to FloatingMic in content modes
  onStopListening: () => void   // NEW — passed to FloatingMic in content modes
}

export function ModeRouter({ analyserRef, onStopSpeaking, onStartListening, onStopListening }: ModeRouterProps) {
  const { state, mode } = useAssistantStore()

  // Determine which key/component to show
  let key: string
  let content: React.ReactNode

  // PRIORITY: Content modes stay visible regardless of voice state (LOOP-02, D-12/D-13)
  // The FloatingMic button overlays the content screen to handle listening/thinking/speaking states.
  // Key = content-${mode} ensures AnimatePresence re-triggers transition on mode change (Pitfall 1 — LOOP-03)
  if (CONTENT_MODES.has(mode)) {
    key = `content-${mode}`
    let contentComponent: React.ReactNode = null
    if (mode === 'weather') {
      contentComponent = <WeatherMode onStartListening={onStartListening} onStopListening={onStopListening} />
    } else if (mode === 'prayer') {
      contentComponent = <PrayerMode onStartListening={onStartListening} onStopListening={onStopListening} />
    } else if (mode === 'search') {
      contentComponent = <SearchMode onStartListening={onStartListening} onStopListening={onStopListening} />
    } else if (mode === 'calendar') {
      contentComponent = <CalendarMode onStartListening={onStartListening} onStopListening={onStopListening} />
    } else if (mode === 'briefing') {
      contentComponent = <BriefingMode onStartListening={onStartListening} onStopListening={onStopListening} />
    }
    content = contentComponent
  } else if (state === 'listening') {
    key = 'listening'
    content = <ListeningMode analyserRef={analyserRef} />
  } else if (state === 'thinking') {
    key = 'thinking'
    content = <ThinkingMode />
  } else if (state === 'speaking') {
    key = 'speaking'
    content = <SpeakingMode analyserRef={analyserRef} onTap={onStopSpeaking} />
  } else {
    // 'idle' with chat/other mode — orb landing screen (full-screen, no AppShell)
    key = `idle-${mode}`
    content = (
      <div
        className="w-screen h-screen flex flex-col items-center justify-center"
        style={{ background: 'var(--color-background)' }}
      >
        <OrbAnimation />
        <p
          className="mt-8 text-sm tracking-widest uppercase"
          style={{
            color: 'var(--color-on-surface-variant)',
            fontFamily: 'var(--font-label)',
            letterSpacing: '0.15em',
          }}
        >
          Tap to speak
        </p>
      </div>
    )
  }

  // Determine if this mode needs AppShell chrome (sidebar + top bar)
  const shellInfo = MODE_LABELS[key]
  const needsShell = !!shellInfo

  // Crossfade wrapper — both old and new mode are mounted simultaneously.
  // absolute + inset-0 makes them overlap; opacity handles the blend.
  const inner = needsShell ? (
    <AppShell modeLabel={shellInfo!.label} statusLabel={shellInfo!.status}>
      {content}
    </AppShell>
  ) : content

  return (
    <div className="w-screen h-screen relative" style={{ background: 'var(--color-background)' }}>
      <AnimatePresence>
        <motion.div
          key={key}
          className="absolute inset-0"
          variants={modeVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <ErrorBoundary>
            {inner}
          </ErrorBoundary>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

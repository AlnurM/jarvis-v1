/**
 * ModeRouter — Switches between mode components with AnimatePresence transitions.
 *
 * Voice states take priority: listening → thinking → speaking each render their
 * full-screen mode component. On 'idle', renders the idle/orb view.
 *
 * AnimatePresence mode="wait" ensures exit animation completes before next mounts.
 * Custom easing cubic-bezier(0.22, 1, 0.36, 1) from design.md (D-38).
 */
import { AnimatePresence, motion } from 'motion/react'
import { useAssistantStore } from '../store/assistantStore'
import { ListeningMode } from '../modes/ListeningMode'
import { ThinkingMode } from '../modes/ThinkingMode'
import { SpeakingMode } from '../modes/SpeakingMode'
import { OrbAnimation } from './OrbAnimation'
import type { RefObject } from 'react'

// Shared motion variants for all mode transitions (per D-38)
const modeVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
  },
}

interface ModeRouterProps {
  analyserRef: RefObject<AnalyserNode | null>
  onStopSpeaking: () => void
}

export function ModeRouter({ analyserRef, onStopSpeaking }: ModeRouterProps) {
  const { state, mode } = useAssistantStore()

  // Determine which key/component to show
  let key: string
  let content: React.ReactNode

  if (state === 'listening') {
    key = 'listening'
    content = <ListeningMode analyserRef={analyserRef} />
  } else if (state === 'thinking') {
    key = 'thinking'
    content = <ThinkingMode />
  } else if (state === 'speaking') {
    key = 'speaking'
    content = <SpeakingMode analyserRef={analyserRef} onTap={onStopSpeaking} />
  } else {
    // 'idle' — show orb landing screen (original Phase 1 idle view)
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

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        className="w-screen h-screen"
        variants={modeVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {content}
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * FloatingMic — Floating microphone button with four visual states.
 *
 * Renders in content modes (weather, prayer) over the content screen so the
 * screen stays visible during listening/thinking/speaking (LOOP-02).
 *
 * Visual states (per D-08):
 *   idle     — static blue mic button
 *   listening — pulsing blue glow ring
 *   thinking  — rotating spinner replaces mic icon
 *   speaking  — pulsing purple glow
 *
 * Tap handling:
 *   idle      → calls onStartListening() synchronously (iOS AudioContext policy — Pitfall 3)
 *   listening → calls onStopListening()
 *   thinking / speaking → ignored (no interaction during these states)
 *
 * e.stopPropagation() prevents bubble to App.tsx handleTap (Pitfall 2 — double-fire guard).
 */
import { motion } from 'motion/react'
import { useAssistantStore } from '../store/assistantStore'

interface FloatingMicProps {
  onStartListening: () => void  // MUST be sync — iOS AudioContext policy
  onStopListening: () => void
}

// SVG mic icon — used for idle, listening, and speaking states
const MicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0e0e0e" strokeWidth="2">
    <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z" />
    <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
  </svg>
)

export function FloatingMic({ onStartListening, onStopListening }: FloatingMicProps) {
  const { state } = useAssistantStore()

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()  // Prevent bubble to App.tsx handleTap (Pitfall 2)

    if (state === 'idle') {
      // Synchronous call — iOS AudioContext requires gesture-in-progress (Pitfall 3)
      onStartListening()
    } else if (state === 'listening') {
      onStopListening()
    }
    // 'thinking' and 'speaking' — ignore tap
  }

  // ── Shared container style ──────────────────────────────────────────────────
  const containerStyle: React.CSSProperties = {
    width: 48,
    height: 48,
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  }

  // ── Idle state — static blue mic button ────────────────────────────────────
  if (state === 'idle') {
    return (
      <div
        className="absolute bottom-6 right-6"
        style={{
          ...containerStyle,
          background: 'linear-gradient(135deg, #85adff 0%, #6c9fff 100%)',
          boxShadow: '0 0 20px rgba(133, 173, 255, 0.3)',
        }}
        onClick={handleTap}
        onTouchEnd={(e) => { e.preventDefault(); handleTap(e) }}
      >
        <MicIcon />
      </div>
    )
  }

  // ── Listening state — pulsing blue glow ring ────────────────────────────────
  if (state === 'listening') {
    return (
      <motion.div
        className="absolute bottom-6 right-6"
        style={{
          ...containerStyle,
          background: 'linear-gradient(135deg, #85adff 0%, #6c9fff 100%)',
        }}
        animate={{
          boxShadow: [
            '0 0 10px rgba(133, 173, 255, 0.4)',
            '0 0 30px rgba(133, 173, 255, 0.4)',
            '0 0 10px rgba(133, 173, 255, 0.4)',
          ],
        }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        onClick={handleTap}
        onTouchEnd={(e) => { e.preventDefault(); handleTap(e) }}
      >
        <MicIcon />
      </motion.div>
    )
  }

  // ── Thinking state — rotating spinner replaces mic icon ─────────────────────
  if (state === 'thinking') {
    return (
      <div
        className="absolute bottom-6 right-6"
        style={{
          ...containerStyle,
          background: 'linear-gradient(135deg, #85adff 0%, #6c9fff 100%)',
          boxShadow: '0 0 20px rgba(133, 173, 255, 0.3)',
        }}
        onClick={handleTap}
        onTouchEnd={(e) => { e.preventDefault(); handleTap(e) }}
      >
        <motion.div
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: '#0e0e0e',
            borderRightColor: '#0e0e0e',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    )
  }

  // ── Speaking state — pulsing purple glow ────────────────────────────────────
  return (
    <motion.div
      className="absolute bottom-6 right-6"
      style={{
        ...containerStyle,
        background: 'linear-gradient(135deg, #ad89ff 0%, #8b6fd8 100%)',
      }}
      animate={{
        boxShadow: [
          '0 0 10px rgba(173, 137, 255, 0.5)',
          '0 0 30px rgba(173, 137, 255, 0.5)',
          '0 0 10px rgba(173, 137, 255, 0.5)',
        ],
      }}
      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      onClick={handleTap}
      onTouchEnd={(e) => { e.preventDefault(); handleTap(e) }}
    >
      <MicIcon />
    </motion.div>
  )
}

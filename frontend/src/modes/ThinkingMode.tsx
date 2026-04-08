/**
 * ThinkingMode — Morphing particle orb, blue→purple, no text (per THINK-01 to THINK-04)
 * Stitch screen ID: c121cc95f2e149a0873accbd6c47d7bd
 *
 * Design: "AI Pulse" multi-layered orb from design.md §5 Components.
 * Color animates from primary (#85adff) to secondary (#ad89ff) to signal active thinking.
 * No text displayed — pure animation conveys "processing intelligence".
 */
import { motion } from 'motion/react'
import { OrbAnimation } from '../components/OrbAnimation'

// THINK-02: Blue → purple color transition during thinking
const THINKING_PRIMARY = '#85adff'   // var(--color-primary)
const THINKING_SECONDARY = '#ad89ff' // var(--color-secondary)

export function ThinkingMode() {
  return (
    <div
      className="w-screen h-screen flex items-center justify-center overflow-hidden"
      style={{ background: '#0a0a0a' }}
    >
      {/* Outer ambient glow — adds depth per design.md Elevation principle */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 400,
          height: 400,
          background: `radial-gradient(circle, ${THINKING_SECONDARY}40 0%, transparent 60%)`,
          filter: 'blur(60px)',
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: [0.22, 1, 0.36, 1],  // per D-38, design.md Do's and Don'ts
        }}
      />

      {/* Core orb with blue→purple color cycling (per THINK-02, D-30) */}
      <motion.div
        animate={{
          // Animate the filter hue-rotate to shift from blue to purple
          filter: [
            'hue-rotate(0deg) brightness(1)',
            'hue-rotate(40deg) brightness(1.1)',
            'hue-rotate(0deg) brightness(1)',
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <OrbAnimation
          primaryColor={THINKING_PRIMARY}
          secondaryColor={THINKING_SECONDARY}
          scale={1.2}
        />
      </motion.div>

      {/* THINK-03: No text displayed */}
    </div>
  )
}

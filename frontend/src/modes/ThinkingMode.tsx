/**
 * ThinkingMode — Morphing particle orb, blue→purple, with status text and floating particles
 * Stitch screen ID: c121cc95f2e149a0873accbd6c47d7bd
 *
 * Design: "AI Pulse" multi-layered orb from design.md §5 Components.
 * Color animates from primary (#85adff) to secondary (#ad89ff) to signal active thinking.
 * Status text top-left + floating particles around orb + status text bottom-right per Stitch.
 */
import { motion } from 'motion/react'
import { OrbAnimation } from '../components/OrbAnimation'

export function ThinkingMode() {
  return (
    <div
      className="w-screen h-screen flex items-center justify-center overflow-hidden relative"
      style={{ background: 'var(--color-background)' }}
    >
      {/* Top-left status text — "JARVIS PROCESSING QUERY..." per Stitch spec */}
      <p
        className="absolute top-8 left-8"
        style={{
          fontFamily: 'var(--font-label)',
          fontSize: '0.625rem',
          color: 'var(--color-on-surface-variant)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          opacity: 0.5,
        }}
      >
        JARVIS PROCESSING QUERY...
      </p>

      {/* Outer ambient glow — adds depth per design.md Elevation principle */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(173, 137, 255, 0.15) 0%, transparent 60%)',
          filter: 'blur(60px)',
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: [0.22, 1, 0.36, 1],
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
        transition={{ duration: 3, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }}
      >
        <OrbAnimation scale={1.2} />
      </motion.div>

      {/* Floating particles around orb — primary (#85adff) and secondary (#ad89ff) per Stitch */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2
        const radius = 180 + (i % 3) * 30  // vary distance: 180, 210, 240px
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius
        const size = 2 + (i % 3)  // 2-4px
        const duration = 3 + (i % 4) * 0.5  // 3-5s
        const delay = i * 0.3

        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              background: i % 2 === 0 ? '#85adff' : '#ad89ff',
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: 'translate(-50%, -50%)',
            }}
            animate={{
              opacity: [0.1, 0.5, 0.1],
              scale: [0.8, 1.2, 0.8],
              x: [0, (i % 2 === 0 ? 10 : -10), 0],
              y: [0, (i % 2 === 0 ? -8 : 8), 0],
            }}
            transition={{
              duration: duration,
              repeat: Infinity,
              delay: delay,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        )
      })}

      {/* Bottom-right subtle status text per Stitch spec */}
      <p
        className="absolute bottom-8 right-8"
        style={{
          fontFamily: 'var(--font-label)',
          fontSize: '0.5rem',
          color: 'var(--color-on-surface-variant)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          opacity: 0.3,
        }}
      >
        NEURAL PROCESSING ACTIVE
      </p>
    </div>
  )
}

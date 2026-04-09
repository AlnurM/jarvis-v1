import { motion } from 'motion/react'

interface OrbAnimationProps {
  // Color for the inner bright layer (default: primary-container)
  primaryColor?: string
  // Color for the outer atmospheric glow (default: secondary-container)
  secondaryColor?: string
  // Scale multiplier for the orb size (default: 1)
  scale?: number
}

export function OrbAnimation({
  primaryColor: _primaryColor = 'var(--color-primary-container)',
  secondaryColor: _secondaryColor = 'var(--color-secondary-container)',
  scale = 1,
}: OrbAnimationProps) {
  const outerSize = 240 * scale
  const innerSize = 160 * scale

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: outerSize,
        height: outerSize,
        perspective: 1000,
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
      }}
    >
      {/* Outer atmospheric glow — breathes slowly, blend mode screen per Stitch */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: outerSize,
          height: outerSize,
          background: 'radial-gradient(circle, rgba(133, 173, 255, 0.8) 0%, rgba(173, 137, 255, 0.2) 70%, transparent 100%)',
          filter: 'blur(80px)',
          mixBlendMode: 'screen',
          boxShadow: '0 0 100px rgba(133, 173, 255, 0.4)',
        }}
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }}
      />
      {/* Inner bright core — morphs scale, blend mode screen */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: innerSize,
          height: innerSize,
          background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.03) 0%, transparent 70%)',
          filter: 'blur(40px)',
          mixBlendMode: 'screen',
        }}
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 4, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  )
}

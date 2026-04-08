import { motion } from 'motion/react'

interface OrbAnimationProps {
  // Color for the inner bright layer (default: primary #85adff)
  primaryColor?: string
  // Color for the outer atmospheric glow (default: secondary #ad89ff)
  secondaryColor?: string
  // Scale multiplier for the orb size (default: 1)
  scale?: number
}

export function OrbAnimation({
  primaryColor = 'var(--color-primary)',
  secondaryColor = 'var(--color-secondary)',
  scale = 1,
}: OrbAnimationProps) {
  const outerSize = 240 * scale
  const innerSize = 160 * scale

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: outerSize, height: outerSize }}
    >
      {/* Outer atmospheric glow — breathes slowly */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: outerSize,
          height: outerSize,
          background: `radial-gradient(circle, ${secondaryColor} 0%, transparent 70%)`,
          filter: 'blur(80px)',
        }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Inner bright core — morphs scale */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: innerSize,
          height: innerSize,
          background: `radial-gradient(circle, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          filter: 'blur(40px)',
        }}
        animate={{ opacity: [0.6, 1, 0.6], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

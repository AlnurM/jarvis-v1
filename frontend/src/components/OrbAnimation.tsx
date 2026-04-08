import { motion } from 'motion/react'

export function OrbAnimation() {
  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 240, height: 240,
          background: 'radial-gradient(circle, var(--color-secondary) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 160, height: 160,
          background: 'radial-gradient(circle, var(--color-primary) 0%, var(--color-secondary) 100%)',
          filter: 'blur(40px)',
        }}
        animate={{ opacity: [0.6, 1, 0.6], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

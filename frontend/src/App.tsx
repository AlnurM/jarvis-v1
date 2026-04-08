import { useEffect } from 'react'
import { OrbAnimation } from './components/OrbAnimation'

function App() {
  useEffect(() => {
    document.addEventListener('contextmenu', (e) => e.preventDefault())
  }, [])

  return (
    <div
      className="w-screen h-screen overflow-hidden flex flex-col items-center justify-center"
      style={{ background: 'var(--color-background)' }}
    >
      <OrbAnimation />
      <p
        className="mt-8 text-sm tracking-widest uppercase"
        style={{ color: 'var(--color-on-surface-variant)', fontFamily: 'var(--font-label)' }}
      >
        Tap to speak
      </p>
    </div>
  )
}

export default App

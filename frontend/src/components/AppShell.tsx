/**
 * AppShell — Shared chrome layout for Listening, Speaking, Weather, and Prayer modes.
 *
 * Renders a left sidebar (60px wide: JARVIS logo, ACTIVE label, nav icons) and
 * a top bar (48px tall: JARVIS brand, mode label, settings icon) around children.
 *
 * ThinkingMode and idle orb views do NOT use AppShell — they remain full-screen.
 * Per Stitch screens: No 1px borders (D-09). No pure white text (D-10).
 */
import React from 'react'

interface AppShellProps {
  modeLabel: string      // e.g. "LISTENING PROTOCOL V3.0", "ATMOSPHERIC ANALYSIS"
  statusLabel?: string   // e.g. "SYSTEM SECURE", optional
  children: React.ReactNode
}

export function AppShell({ modeLabel, statusLabel, children }: AppShellProps) {
  return (
    <div
      className="w-screen h-screen flex overflow-hidden"
      style={{ background: 'var(--color-background)' }}
    >
      {/* Left sidebar — 60px wide, full height */}
      <aside
        className="flex flex-col items-center py-6 gap-8"
        style={{
          width: '60px',
          minWidth: '60px',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {/* JARVIS logo — small "J" in a circle with primary glow */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #85adff 0%, #ad89ff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(133, 173, 255, 0.3)',
            fontFamily: 'var(--font-label)',
            fontSize: '0.875rem',
            fontWeight: 700,
            color: '#0e0e0e',
          }}
        >
          J
        </div>

        {/* "ACTIVE" status text, vertical, tiny */}
        <span
          style={{
            fontFamily: 'var(--font-label)',
            fontSize: '0.5rem',
            color: 'var(--color-on-surface-variant)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            opacity: 0.6,
          }}
        >
          ACTIVE
        </span>

        {/* Nav icons — 4 simple SVG icons stacked vertically */}
        {/* Each icon: 20x20, color on-surface-variant, opacity 0.5, decorative */}
        <nav className="flex flex-col gap-6 mt-4">
          {/* Mic / ASSISTANT icon */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-on-surface-variant)"
            strokeWidth="1.5"
            style={{ opacity: 0.5 }}
          >
            <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z" />
            <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" />
          </svg>

          {/* Cloud / WEATHER icon */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-on-surface-variant)"
            strokeWidth="1.5"
            style={{ opacity: 0.5 }}
          >
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
          </svg>

          {/* Calendar / SCHEDULE icon */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-on-surface-variant)"
            strokeWidth="1.5"
            style={{ opacity: 0.5 }}
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>

          {/* Compass / PATH icon */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-on-surface-variant)"
            strokeWidth="1.5"
            style={{ opacity: 0.5 }}
          >
            <circle cx="12" cy="12" r="10" />
            <polygon
              points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"
              fill="var(--color-on-surface-variant)"
              fillOpacity={0.3}
            />
          </svg>
        </nav>
      </aside>

      {/* Main content area — fills remaining width */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top bar — 48px tall */}
        <header
          className="flex items-center justify-between px-6"
          style={{
            height: '48px',
            minHeight: '48px',
          }}
        >
          {/* Left: brand + mode label */}
          <div className="flex items-center gap-4">
            <span
              style={{
                fontFamily: 'var(--font-label)',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--color-on-surface)',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              JARVIS
            </span>
            <span
              style={{
                fontFamily: 'var(--font-label)',
                fontSize: '0.625rem',
                color: 'var(--color-on-surface-variant)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                opacity: 0.7,
              }}
            >
              {modeLabel}
            </span>
          </div>

          {/* Right: status label + settings icon (decorative) */}
          <div className="flex items-center gap-3">
            {statusLabel && (
              <span
                style={{
                  fontFamily: 'var(--font-label)',
                  fontSize: '0.5rem',
                  color: 'var(--color-on-surface-variant)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  opacity: 0.5,
                }}
              >
                {statusLabel}
              </span>
            )}
            {/* Settings gear icon — decorative, non-interactive */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-on-surface-variant)"
              strokeWidth="1.5"
              style={{ opacity: 0.4 }}
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
        </header>

        {/* Mode content fills remaining space */}
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  )
}

---
phase: 04-design-audit-rebuild
plan: "08"
subsystem: frontend-ui
tags: [speaking-mode, equalizer-bars, glassmorphism, stitch-fidelity, tab-bar]
dependency_graph:
  requires: [04-06]
  provides: [speaking-mode-stitch-layout]
  affects: [frontend/src/modes/SpeakingMode.tsx]
tech_stack:
  added: []
  patterns: [audio-reactive-bars, glassmorphism-card, tab-bar-chrome]
key_files:
  created: []
  modified:
    - frontend/src/modes/SpeakingMode.tsx
decisions:
  - "Replaced canvas waveform with 10 purple CSS div bars driven by analyserRef or static pulsing fallback — matches Stitch vertical equalizer spec"
  - "Response text card uses 3-line clamp at 0.9375rem with quotes wrapping — positioned above bars in flex-col center"
  - "Weather widget shows '--' placeholder values — decorative Stitch chrome, not wired to data"
metrics:
  duration: 94s
  completed: "2026-04-09T11:26:49Z"
  tasks_completed: 1
  files_modified: 1
---

# Phase 04 Plan 08: SpeakingMode Stitch Layout Rebuild Summary

**One-liner:** Replaced canvas waveform with purple vertical equalizer bars and added Stitch top tab bar, glassmorphism response card above bars, weather widget, and avatar button.

## What Was Built

Rebuilt `SpeakingMode.tsx` to match the Stitch speaking screen (8554ef1a3efa42f9a07ad8774a690a7d):

- **Top tab bar** — DIAGNOSTICS / VOICE MODE (active, primary color, weight 600) / PROTOCOLS. Each tab uses `var(--font-label)`, 0.625rem, 0.15em letter-spacing.
- **Mini weather widget** — absolute top-right, glassmorphism card with blur(24px) gradient, shows "--° --" placeholder values (decorative chrome matching Stitch).
- **Response text card** — glassmorphism card (`linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)` + blur(24px)), positioned ABOVE bars in flex column. Text wrapped in quotes, 3-line clamp, `var(--color-on-surface-variant)` (never pure white).
- **Purple vertical equalizer bars** — 10 bars, `linear-gradient(to top, #ad89ff, #d4b8ff)`, 6px wide, items-end container, animate height via `motion.div` with `[0.22, 1, 0.36, 1]` easing. Audio-reactive via analyserRef; static pulsing fallback if no analyser.
- **Circular avatar button** — bottom-left, 40x40px, primary gradient (#85adff to #6c9fff), glow shadow.
- **Tap hint** — bottom center, fades from 0.6 to 0 after 2s, purple #ad89ff40 color.
- **Root container** — `w-full h-full` (was `w-screen h-screen`) for AppShell compatibility.

## Removed

- `useWaveVisualizer` import and hook
- `canvas` element and canvas-drawing code
- `useRef` for canvas (no longer needed)
- All refs to `stopVisualization` / `startVisualization`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- **Weather widget temperature/condition** — `frontend/src/modes/SpeakingMode.tsx`, lines ~95-107. Shows "--° --" hardcoded. Decorative chrome matching Stitch layout. Weather data wiring is out of scope for this plan — SpeakingMode does not consume weather data in this user flow.

## Self-Check: PASSED

- SpeakingMode.tsx: FOUND
- 04-08-SUMMARY.md: FOUND
- Commit 08e0449: FOUND

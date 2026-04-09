---
phase: 05-voice-loop-weather-polish
plan: "02"
subsystem: frontend
tags: [voice-loop, floating-mic, content-modes, mode-router, ios-audio, animation]
dependency_graph:
  requires: []
  provides: [FloatingMic component, CONTENT_MODES routing, content-mode-aware handleTap]
  affects: [frontend/src/components/FloatingMic.tsx, frontend/src/components/ModeRouter.tsx, frontend/src/App.tsx, frontend/src/modes/WeatherMode.tsx, frontend/src/modes/PrayerMode.tsx]
tech_stack:
  added: []
  patterns: [CONTENT_MODES priority routing, stopPropagation double-fire guard, iOS AudioContext sync call chain]
key_files:
  created:
    - frontend/src/components/FloatingMic.tsx
  modified:
    - frontend/src/components/ModeRouter.tsx
    - frontend/src/App.tsx
    - frontend/src/modes/WeatherMode.tsx
    - frontend/src/modes/PrayerMode.tsx
decisions:
  - FloatingMic uses stopPropagation to prevent bubble to App.tsx handleTap (Pitfall 2 guard)
  - CONTENT_MODES checked FIRST in ModeRouter — content screens stay during listening/thinking/speaking
  - key=content-${mode} (not idle-${mode}) ensures AnimatePresence re-triggers on weather→prayer transition (LOOP-03)
  - WeatherMode/PrayerMode get optional onStartListening/onStopListening props now; Plan 03 will wire FloatingMic fully
  - App.tsx CONTENT_MODES_SET guard prevents full-screen tap from double-firing with FloatingMic tap
metrics:
  duration: 2 minutes
  completed: "2026-04-09"
  tasks_completed: 2
  files_changed: 5
---

# Phase 5 Plan 02: FloatingMic + CONTENT_MODES Routing Summary

## One-liner

FloatingMic button with 4 visual states overlays content screens; ModeRouter checks CONTENT_MODES first so weather/prayer stay visible during all voice states.

## What Was Built

### Task 1: FloatingMic Component
Created `frontend/src/components/FloatingMic.tsx` — a floating mic button that adapts its visual appearance to the current voice FSM state:

- **idle** — static blue mic button (`linear-gradient(135deg, #85adff 0%, #6c9fff 100%)`) matching WeatherMode's existing button pixel-for-pixel
- **listening** — same blue button with pulsing glow ring animation (1.2s repeat, easeInOut)
- **thinking** — rotating spinner replaces mic icon (0.8s linear repeat)
- **speaking** — pulsing purple glow (`linear-gradient(135deg, #ad89ff 0%, #8b6fd8 100%)`)

iOS-safe tap handling: `e.stopPropagation()` prevents bubble to `App.tsx`, `onTouchEnd` with `preventDefault()` suppresses ghost click. `onStartListening` is called synchronously (required for iOS AudioContext policy).

### Task 2: ModeRouter + App.tsx Refactor

**ModeRouter.tsx:**
- Added `CONTENT_MODES = new Set(['weather', 'prayer', 'search', 'calendar', 'briefing'])` at module level
- Routing priority changed: `CONTENT_MODES.has(mode)` is checked FIRST — content screen renders regardless of `state` value
- `key = content-${mode}` replaces old `idle-weather`/`idle-prayer` keys — ensures AnimatePresence re-triggers when switching between content modes (LOOP-03 direct content-to-content transition)
- MODE_LABELS updated: `content-weather` / `content-prayer` keys replace `idle-weather` / `idle-prayer`
- New props `onStartListening` / `onStopListening` added to `ModeRouterProps` and passed through to content mode components

**App.tsx:**
- `CONTENT_MODES_SET` constant added at module level
- `mode` destructured from `useAssistantStore()`
- `handleTap` guard added: if `CONTENT_MODES_SET.has(mode) && state !== 'idle'` → return early (Pitfall 2, D-20)
- `mode` added to `handleTap` dependency array (Pitfall 4)
- `ModeRouter` JSX updated with `onStartListening` and `onStopListening` props

**WeatherMode.tsx / PrayerMode.tsx:**
- Optional `WeatherModeProps`/`PrayerModeProps` interfaces added (`onStartListening?`, `onStopListening?`) — allows ModeRouter to pass props without TypeScript errors; Plan 03 will wire FloatingMic inside these modes

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| CONTENT_MODES checked before voice state | Core LOOP-02 fix: content screens stay visible during listening/thinking/speaking |
| key=content-${mode} not idle-${mode} | Different key format ensures AnimatePresence re-triggers on weather→prayer transition (LOOP-03) |
| stopPropagation in FloatingMic | Prevents double-fire: FloatingMic and App.tsx both listen to tap events |
| Optional props in WeatherMode/PrayerMode | Avoids TypeScript errors now; Plan 03 will replace optional with required when FloatingMic is wired into the content components |
| mode added to handleTap deps | Stale closure bug prevention — mode value must be current when guard evaluates |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Added optional props to WeatherMode and PrayerMode**
- **Found during:** Task 2, when ModeRouter passes onStartListening/onStopListening to WeatherMode/PrayerMode
- **Issue:** Both components accepted no props; TypeScript would error when ModeRouter passed new props
- **Fix:** Added `WeatherModeProps`/`PrayerModeProps` interfaces with optional props; Plan 03 will make them required when FloatingMic is wired inside the modes
- **Files modified:** `frontend/src/modes/WeatherMode.tsx`, `frontend/src/modes/PrayerMode.tsx`
- **Commit:** d3574bc

## Known Stubs

- `WeatherMode` receives `onStartListening`/`onStopListening` props but doesn't use them yet — FloatingMic integration deferred to Plan 05-03
- `PrayerMode` same stub pattern — FloatingMic overlay wired in Plan 05-03

## Commits

| Hash | Message |
|------|---------|
| 6386405 | feat(05-02): create FloatingMic component with four visual states |
| d3574bc | feat(05-02): refactor ModeRouter CONTENT_MODES priority + update App.tsx handleTap |

## Self-Check: PASSED

---
phase: "03"
plan: "04"
subsystem: frontend/integration
tags: [ModeRouter, auto-listen, weather, prayer, voice-loop, typescript, react]
dependency_graph:
  requires:
    - "03-03 (WeatherMode + PrayerMode components)"
    - "03-02 (modeData store field + backend fetch pipeline)"
    - "03-01 (backend weather/prayer dispatch in chat route)"
  provides:
    - "ModeRouter: routes idle state to WeatherMode or PrayerMode based on store mode"
    - "speak() with optional onComplete callback for auto-listen wiring"
    - "App.tsx: auto-listen FSM with 500ms timer, cancel on tap, success-only activation"
  affects:
    - "Phase 4 (all future modes can reuse auto-listen + ModeRouter extension pattern)"
tech_stack:
  added: []
  patterns:
    - "autoListenTimerRef pattern: ReturnType<typeof setTimeout> ref for cross-render timer cancel"
    - "onComplete optional callback appended to useVoiceOutput.speak() — backward-compatible"
    - "ModeRouter idle branch split: mode-specific idle states trigger AnimatePresence re-animation"
key_files:
  created: []
  modified:
    - "frontend/src/components/ModeRouter.tsx"
    - "frontend/src/hooks/useVoiceOutput.ts"
    - "frontend/src/App.tsx"
decisions:
  - "Auto-listen is success-path only: onComplete passed only in speak() call inside runChat() try block; catch block uses setState('idle') with no timer"
  - "handleTap cancels autoListenTimer before state check: prevents Pitfall 3 double-start when user taps within 500ms window"
  - "idle-weather / idle-prayer as distinct AnimatePresence keys: re-triggers animation on Speaking->idle-weather transition (Pitfall 7 avoidance)"
metrics:
  duration: "~5 minutes"
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_created: 0
  files_modified: 3
---

# Phase 3 Plan 04: ModeRouter + Auto-Listen Integration Summary

**One-liner:** WeatherMode and PrayerMode wired into ModeRouter via idle-weather/idle-prayer branches; auto-listen FSM using 500ms timer + autoListenTimerRef added to App.tsx with tap-cancel guard; speak() extended with optional onComplete callback.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wire WeatherMode/PrayerMode into ModeRouter + auto-listen | e533f03 | ModeRouter.tsx, useVoiceOutput.ts, App.tsx |
| 2 | End-to-end verification checkpoint | auto-approved | — |

## What Was Built

### ModeRouter.tsx — WeatherMode/PrayerMode Branches

Two new imports added at top of file:
```typescript
import { WeatherMode } from '../modes/WeatherMode'
import { PrayerMode } from '../modes/PrayerMode'
```

Two new `else if` branches inserted before the final orb fallback:
- `state === 'idle' && mode === 'weather'` → key `'idle-weather'`, content `<WeatherMode />`
- `state === 'idle' && mode === 'prayer'` → key `'idle-prayer'`, content `<PrayerMode />`

Distinct keys (`idle-weather`, `idle-prayer`) ensure AnimatePresence re-triggers the fade/scale transition when transitioning from Speaking mode into these idle states — avoiding the Pitfall 7 key collision where `idle-${mode}` would equal `idle-chat` for both chat and weather if mode hadn't changed yet.

### useVoiceOutput.ts — onComplete Callback

`speak()` signature extended with optional third parameter:
```typescript
const speak = useCallback((text: string, assistantText?: string, onComplete?: () => void) => {
```

Called after `setState('idle')` in `utterance.onend`:
```typescript
utterance.onend = () => {
  if (assistantText) addToHistory('assistant', assistantText)
  setState('idle')
  onComplete?.()  // Phase 3 LOOP-01
}
```

Backward-compatible — all existing callers without `onComplete` are unaffected.

### App.tsx — Auto-Listen FSM

**autoListenTimerRef added** alongside thinkingAbortRef:
```typescript
const autoListenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
```

**handleTap updated** — timer cancellation at the very top, before state check:
```typescript
const handleTap = useCallback(() => {
  if (autoListenTimerRef.current !== null) {
    clearTimeout(autoListenTimerRef.current)
    autoListenTimerRef.current = null
  }
  if (state === 'idle') { ... }
  ...
})
```

**speak() call in runChat() updated** — passes onComplete for auto-listen:
```typescript
speak(envelope.text, envelope.text, () => {
  autoListenTimerRef.current = setTimeout(() => {
    autoListenTimerRef.current = null
    setState('listening')
    startRecording()
  }, 500)
})
```

Auto-listen fires only in the `try` success path. The `catch` block still calls `setState('idle')` with no timer — errors do not trigger auto-listen (D-23).

## Verification Results

All acceptance criteria passed:

| Check | Result |
|-------|--------|
| WeatherMode imported in ModeRouter | PASS |
| PrayerMode imported in ModeRouter | PASS |
| idle-weather branch exists | PASS |
| idle-prayer branch exists | PASS |
| speak() has onComplete param | PASS |
| autoListenTimerRef in App.tsx | PASS |
| clearTimeout in handleTap | PASS |
| 500ms setTimeout in runChat | PASS |
| TypeScript compiles clean (0 errors) | PASS |
| Backend test suite (22 tests) | PASS |

## Deviations from Plan

None — plan executed exactly as written. Three surgical edits, no wholesale rewrites.

## Known Stubs

None — all three modified files wire to live data and runtime state. No hardcoded placeholder values.

## Self-Check: PASSED

- `frontend/src/components/ModeRouter.tsx` — modified, FOUND
- `frontend/src/hooks/useVoiceOutput.ts` — modified, FOUND
- `frontend/src/App.tsx` — modified, FOUND
- Commit `e533f03` — FOUND (feat(03-04): wire WeatherMode/PrayerMode in ModeRouter + auto-listen FSM)
- TypeScript compiles clean (0 errors confirmed)
- 22 backend tests pass

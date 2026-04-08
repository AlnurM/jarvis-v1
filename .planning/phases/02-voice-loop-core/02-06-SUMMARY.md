---
phase: 02-voice-loop-core
plan: "06"
subsystem: frontend-integration
tags: [voice-fsm, mode-routing, animation, orchestration, app-wiring]
dependency_graph:
  requires: ["02-02", "02-04", "02-05"]
  provides: ["complete-voice-loop", "mode-transitions"]
  affects: ["frontend/src/App.tsx", "frontend/src/components/ModeRouter.tsx"]
tech_stack:
  added: []
  patterns:
    - "AnimatePresence mode='wait' for sequential exit/enter mode transitions"
    - "AbortController to cancel in-flight API calls on FSM state change"
    - "Backend mode name mapping (speak→chat) in App.tsx before dispatching to store"
    - "Synchronous tap handler wrapping async startRecording() for iOS AudioContext"
key_files:
  created:
    - frontend/src/components/ModeRouter.tsx
  modified:
    - frontend/src/App.tsx
decisions:
  - "mode key includes mode name (idle-chat, idle-weather) to re-trigger AnimatePresence on mode changes in idle state"
  - "setMode cast uses Parameters<typeof setMode>[0] for type-safe enum mapping without 'any'"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-08"
  tasks_completed: 2
  files_changed: 2
---

# Phase 02 Plan 06: Voice Loop Integration Summary

**One-liner:** Full voice FSM wired end-to-end with AnimatePresence ModeRouter — tap → ListeningMode → ThinkingMode + Claude API → SpeakingMode + TTS → idle.

## What Was Built

### ModeRouter.tsx (new)
Routes between the four voice states using AnimatePresence:
- `listening` → `ListeningMode` (audio waveform canvas)
- `thinking` → `ThinkingMode` (morphing orb)
- `speaking` → `SpeakingMode` (purple wave + subtitle)
- `idle` → OrbAnimation landing screen

`AnimatePresence mode="wait"` ensures exit animation completes before the next component mounts, producing smooth cross-fades. Shared `modeVariants` apply the custom cubic-bezier easing `[0.22, 1, 0.36, 1]` (D-38) to all transitions.

### App.tsx (rewritten)
Root FSM orchestrator:
- Tap on idle → `setState('listening')` + `startRecording()` (synchronous, per iOS AudioContext constraint)
- Tap on listening → `stopRecording()` + `setState('thinking')` (manual early stop)
- Tap on speaking → `stopSpeaking()` (interrupts TTS, FSM returns to idle inside hook)
- `useEffect([state, currentTranscript])` detects thinking entry → calls `chatWithJarvis()`
- API response → `setMode()` + `setResponse()` + `setState('speaking')` + `speak()`
- `AbortController` cancels in-flight API calls if state changes before response

## FSM Transition Map

```
idle ──(tap)──→ listening ──(silence)──→ thinking ──(API response)──→ speaking ──(TTS end)──→ idle
                    └──(tap)──────────────────────────────────────────────┘
                                      manual stop                    tap-to-stop
```

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create ModeRouter.tsx with AnimatePresence | f294f21 | frontend/src/components/ModeRouter.tsx |
| 2 | Replace App.tsx with full FSM orchestration | b248cdd | frontend/src/App.tsx |

## Verification

- `npx tsc --noEmit` — exits 0 (both tasks)
- `npm run build` — exits 0, 334KB bundle, PWA service worker generated
- `pytest tests/ -x -q` — 15 passed, 0 failed
- No boolean flags (`isListening`, `isThinking`, `isSpeaking`) in App.tsx or assistantStore.ts
- `AnimatePresence mode="wait"` present in ModeRouter
- Custom easing `[0.22, 1, 0.36, 1]` applied to all transitions

## Deviations from Plan

**1. [Rule 1 - Bug] Type-safe mode cast in modeMap lookup**
- **Found during:** Task 2
- **Issue:** Plan used `as any` cast for `setMode()`. Avoiding `any` improves type safety.
- **Fix:** Changed to `as Parameters<typeof setMode>[0]` which resolves to `AssistantMode`.
- **Files modified:** frontend/src/App.tsx
- **Commit:** b248cdd

No other deviations — plan executed as written.

## Known Stubs

None. All data flows are wired:
- `chatWithJarvis` sends real transcript and receives real envelope
- `speak()` receives `envelope.text` for TTS
- `setModeData(null)` is intentional — Phase 3 plans add weather/prayer data fetch
- The `null` for `modeData` does not affect the voice loop goal of this plan

## Self-Check: PASSED

- `frontend/src/components/ModeRouter.tsx` — EXISTS
- `frontend/src/App.tsx` — EXISTS (rewritten)
- Commit f294f21 — FOUND (`feat(02-06): create ModeRouter...`)
- Commit b248cdd — FOUND (`feat(02-06): replace App.tsx...`)

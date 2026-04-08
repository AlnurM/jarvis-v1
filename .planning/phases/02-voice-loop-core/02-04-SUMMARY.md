---
phase: 02-voice-loop-core
plan: "04"
subsystem: frontend-hooks
tags: [audio, voice, mediarecorder, speech-synthesis, canvas, vad, safari, ios]
dependency_graph:
  requires: ["02-03"]
  provides: ["02-05", "02-06"]
  affects: ["frontend/src/hooks/useVoiceRecorder.ts", "frontend/src/hooks/useVoiceOutput.ts", "frontend/src/hooks/useWaveVisualizer.ts"]
tech_stack:
  added: []
  patterns:
    - "MediaRecorder + AudioContext created inside synchronous gesture handler (iOS policy)"
    - "AnalyserNode VAD: RMS energy < 8 over 1.5s triggers silence detection"
    - "transcriptRef accumulation pattern: flush atomically on silence, never mid-stream"
    - "SpeechSynthesis getVoices() polling workaround for Safari (8 x 250ms)"
    - "onerror interrupted/canceled suppression for Safari cancel() bug"
    - "2s onstart watchdog for Safari backgrounding hang"
    - "visibilitychange cancel for stuck TTS queue recovery"
    - "getByteTimeDomainData Canvas waveform with rAF loop, cleanup function returned"
key_files:
  created:
    - frontend/src/hooks/useVoiceRecorder.ts
    - frontend/src/hooks/useVoiceOutput.ts
    - frontend/src/hooks/useWaveVisualizer.ts
  modified: []
decisions:
  - "transcriptRef overwrite (not append) pattern: Deepgram returns progressively longer finals, last value is most complete"
  - "fftSize=256 locked for all AnalyserNode instances — higher values cause iPad frame-time variance"
  - "startRecording() is async but AudioContext.resume() must happen before any await — creation inside synchronous handler satisfies iOS gesture requirement"
metrics:
  duration_minutes: 2
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
---

# Phase 02 Plan 04: Audio I/O Hooks Summary

**One-liner:** Three React hooks forming the complete audio I/O layer — MediaRecorder+VAD+WebSocket relay, Safari-compatible SpeechSynthesis with all known workarounds, and AnalyserNode Canvas waveform visualizer.

## What Was Built

### useVoiceRecorder (`frontend/src/hooks/useVoiceRecorder.ts`)

MediaRecorder lifecycle hook with iOS AudioContext compliance, energy-based voice activity detection, and Deepgram WebSocket relay.

Key design decisions implemented:
- AudioContext created inside synchronous user event handler (iOS Pitfall 1 from RESEARCH.md)
- AnalyserNode with fftSize=256 for iPad performance
- 200ms MediaRecorder timeslice for Deepgram chunk granularity
- `transcriptRef` accumulates Deepgram partials/finals — never written to store mid-stream
- Atomic flush: `setCurrentTranscript(fullTranscript)` then `setState('thinking')` both called inside the silence handler after `stopRecording()`, ensuring App.tsx `useEffect([state, currentTranscript])` always sees the complete transcript with the state transition

VAD implementation: RMS energy check via `getByteTimeDomainData`, threshold=8, 1500ms silence window, `requestAnimationFrame` polling loop.

### useVoiceOutput (`frontend/src/hooks/useVoiceOutput.ts`)

SpeechSynthesis wrapper with four Safari workarounds:
1. `getVoices()` polling — 8 attempts at 250ms intervals (Safari returns empty array on first call)
2. `interrupted`/`canceled` onerror suppression — Safari fires these on `cancel()`, not real errors
3. 2s onstart watchdog — cancels and recovers FSM if TTS hangs (Safari backgrounding bug)
4. `visibilitychange` handler — cancels stuck speech queue on app foreground return

Voice selection priority: Russian (`ru`) → English (`en`) → any available voice → fallback `lang='ru-RU'`.

FSM transitions: `setState('idle')` on `onend` and on real TTS errors. `stopSpeaking()` for user tap-to-interrupt.

### useWaveVisualizer (`frontend/src/hooks/useWaveVisualizer.ts`)

AnalyserNode-driven Canvas waveform renderer using time-domain data (`getByteTimeDomainData`). Returns a cleanup function from `startVisualization()` for component lifecycle management. Colors passed by caller: `#00d4ff` (listening) or `#9b59b6` (speaking).

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: useVoiceRecorder | 888f5cf | feat(02-04): implement useVoiceRecorder with MediaRecorder + VAD + WebSocket relay |
| Task 2: useVoiceOutput + useWaveVisualizer | 7952659 | feat(02-04): implement useVoiceOutput and useWaveVisualizer hooks |

## Deviations from Plan

None — plan executed exactly as written. All three hooks implemented per spec with no structural changes needed.

## Known Stubs

None. These are infrastructure hooks with no UI rendering. They wire directly to the store and API client contracts from 02-03. Data flows through at runtime; no hardcoded values presented to UI.

## Self-Check: PASSED

- `frontend/src/hooks/useVoiceRecorder.ts` — exists, 170 lines
- `frontend/src/hooks/useVoiceOutput.ts` — exists, 109 lines
- `frontend/src/hooks/useWaveVisualizer.ts` — exists, 75 lines
- Commit 888f5cf — verified in git log
- Commit 7952659 — verified in git log
- `npx tsc --noEmit` — exits 0, no TypeScript errors

---
phase: 02-voice-loop-core
plan: "05"
subsystem: frontend-modes
tags: [ui, animation, canvas, waveform, orb, design-system]
dependency_graph:
  requires: ["02-03", "02-04"]
  provides: ["02-06"]
  affects: ["frontend/src/modes/*", "frontend/src/components/OrbAnimation.tsx"]
tech_stack:
  added: []
  patterns:
    - "motion/react for declarative animations with custom cubic-bezier easing"
    - "Canvas API for audio-reactive waveform, device pixel ratio handling"
    - "useWaveVisualizer hook integration for live AnalyserNode visualization"
    - "useAssistantStore for response text in SpeakingMode subtitles"
key_files:
  created:
    - frontend/src/modes/ListeningMode.tsx
    - frontend/src/modes/SpeakingMode.tsx
  modified:
    - frontend/src/components/OrbAnimation.tsx
    - frontend/src/modes/ThinkingMode.tsx
decisions:
  - "OrbAnimation extended with primaryColor/secondaryColor/scale props — backward-compatible defaults using CSS vars"
  - "SpeakingMode takes optional analyserRef; if null, draws static bezier curve fallback (TTS on system bus has no analyser)"
  - "ListeningMode stopVisualization called in separate cleanup useEffect to avoid racing with startVisualization"
metrics:
  duration_seconds: 138
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_modified: 4
requirements_covered:
  - LIST-01
  - LIST-02
  - LIST-03
  - LIST-04
  - THINK-01
  - THINK-02
  - THINK-03
  - THINK-04
  - SPEAK-01
  - SPEAK-02
  - SPEAK-03
---

# Phase 02 Plan 05: Visual Mode Components Summary

**One-liner:** Three visual mode components (Listening/Thinking/Speaking) implemented with design-exact colors, audio-reactive Canvas waveforms, blue→purple morphing orb, and subtitle overlay; OrbAnimation evolved with color props.

## What Was Built

### OrbAnimation (evolved)
Accepted `primaryColor`, `secondaryColor`, and `scale` props with backward-compatible defaults (`var(--color-primary)`, `var(--color-secondary)`, `1`). Existing callers on the Phase 1 landing screen are unaffected.

### ThinkingMode
Full replacement of the `return null` placeholder. Renders a dark `#0a0a0a` full-viewport screen with:
- Outer ambient glow layer pulsing at opacity 0.3→0.6→0.3 using custom easing `[0.22, 1, 0.36, 1]`
- `OrbAnimation` with `primaryColor='#85adff'` and `secondaryColor='#ad89ff'` at `scale=1.2`
- `hue-rotate` filter animation cycling 0→40→0 degrees to drive the blue→purple transition
- No text (THINK-03 compliant)

### ListeningMode
New component for Stitch ID `d6bf4b24d8844d3ba4aa32d422a6a8c4`:
- `#0a0a0a` full-viewport background
- Canvas with device pixel ratio scaling for Retina iPad
- `useWaveVisualizer.startVisualization(canvas, analyser, '#00d4ff')` for live waveform
- "Listening..." label in Space Grotesk at 38% opacity (`${WAVE_COLOR}60`)
- Props: `analyserRef: React.RefObject<AnalyserNode | null>` passed from App.tsx

### SpeakingMode
New component for Stitch ID `8554ef1a3efa42f9a07ad8774a690a7d`:
- `#0a0a0a` background with `#9b59b6` violet atmospheric glow layer
- Canvas waveform via `useWaveVisualizer`; static bezier curve fallback when no analyser
- `response` text from `useAssistantStore()` shown as subtitles clamped to 2 lines (`WebkitLineClamp: 2`)
- Subtitle fade-in animation with `ease: [0.22, 1, 0.36, 1]` (D-38 custom easing)
- `onClick`/`onTouchEnd` handlers bound to `onTap` prop for TTS interruption
- "Tap to stop" hint fades out after 2s
- Text uses `var(--color-on-surface-variant)` — no pure white

## Design Compliance Verification

| Rule | Status |
|------|--------|
| No-Line Rule (no 1px borders) | PASS — boundaries via glow and background shifts only |
| Custom easing `cubic-bezier(0.22, 1, 0.36, 1)` | PASS — used in ThinkingMode ambient glow and SpeakingMode subtitle fade |
| Color tokens match design.md | PASS — #00d4ff listening, #9b59b6 speaking, #85adff/#ad89ff thinking |
| No pure white (#FFFFFF) for text | PASS — uses `var(--color-on-surface-variant)` |
| Font families | PASS — Space Grotesk via `var(--font-label)`, Inter via `var(--font-display)` |
| Background per LIST-01 | PASS — #0a0a0a (per plan requirement, not #0e0e0e from design.md token) |

## Commits

| Hash | Description |
|------|-------------|
| `7257cf8` | feat(02-05): evolve OrbAnimation + implement ThinkingMode and ListeningMode |
| `43fba30` | feat(02-05): implement SpeakingMode with purple waveform and subtitle overlay |

## Deviations from Plan

None — plan executed exactly as written. The "white" in comment text (`// design.md: never pure white`) matched the acceptance criteria grep pattern but is a code comment, not a color value; actual text color is `var(--color-on-surface-variant)`.

## Known Stubs

None. All three modes are fully wired:
- `ListeningMode` requires `analyserRef` prop from caller — not a stub, it's a deliberate interface
- `SpeakingMode.analyserRef` is optional with static fallback — intentional, not a stub
- `SpeakingMode` reads live `response` from store — data path is real

## Self-Check

- [x] `frontend/src/modes/ListeningMode.tsx` created
- [x] `frontend/src/modes/SpeakingMode.tsx` created
- [x] `frontend/src/modes/ThinkingMode.tsx` updated (replaced placeholder)
- [x] `frontend/src/components/OrbAnimation.tsx` updated (color props added)
- [x] `npx tsc --noEmit` exits 0 (TypeScript clean)
- [x] Commit `7257cf8` exists
- [x] Commit `43fba30` exists

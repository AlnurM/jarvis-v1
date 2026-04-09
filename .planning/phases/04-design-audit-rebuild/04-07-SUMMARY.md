---
phase: 04-design-audit-rebuild
plan: "07"
subsystem: frontend/modes
tags: [listening-mode, equalizer, glassmorphism, audio-reactive, stitch-fidelity]
dependency_graph:
  requires: ["04-06"]
  provides: ["ListeningMode-stitch-layout"]
  affects: ["frontend/src/modes/ListeningMode.tsx"]
tech_stack:
  added: []
  patterns: ["audio-reactive equalizer bars via requestAnimationFrame", "glassmorphism status panels", "idle animation fallback"]
key_files:
  created: []
  modified:
    - frontend/src/modes/ListeningMode.tsx
decisions:
  - "Removed canvas waveform and useWaveVisualizer hook entirely — equalizer bars replace canvas; hook no longer needed in this component"
  - "Used idle interval animation (300ms random heights) when analyserRef.current is null — ensures bars animate in dev/test without live audio"
  - "barHeights state drives 14 div heights via inline styles; transition 0.1s cubic-bezier(0.22, 1, 0.36, 1) for smooth bar movement"
metrics:
  duration: "57 seconds"
  completed: "2026-04-09"
  tasks_completed: 1
  files_modified: 1
---

# Phase 04 Plan 07: ListeningMode Stitch Rebuild Summary

Rebuilt ListeningMode to full Stitch-screen fidelity: circular gradient mic icon, 14 audio-reactive equalizer bars, status labels, glassmorphism status panels, and protocol text in the correct AppShell-compatible layout.

## What Was Built

**ListeningMode.tsx** completely rewritten from a simple canvas waveform to a rich Stitch-fidelity layout:

1. **Circular mic icon** — 120x120px, `borderRadius: '50%'`, `linear-gradient(135deg, #85adff 0%, #ad89ff 100%)` with glow `boxShadow`
2. **14 audio-reactive equalizer bars** — reads `getByteFrequencyData` from `analyserRef`, samples 14 evenly-spaced frequency bins, normalizes to 0-100 height range; every 3rd bar gets a gradient fill
3. **Idle fallback** — when no analyser connected, `setInterval(300ms)` drives random subtle bar movement
4. **"Listening..." text** — Inter, 1.25rem, font-weight 600, `var(--color-on-surface)`
5. **"AUDIO STREAM ACTIVE" label** — Space Grotesk, 0.625rem, uppercase, 0.7 opacity
6. **Bottom-right glassmorphism panels** — AMBIENT NOISE + CONFIDENCE with `backdrop-filter: blur(24px)` and `WebkitBackdropFilter`; `var(--radius-xl)` border-radius
7. **Bottom-left protocol text** — "CORE PROCESSING UNIT 01 // LISTENING PROTOCOL V3.0"
8. **Root container** — `w-full h-full` for AppShell compatibility (not `w-screen h-screen`)

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Out-of-scope notes

The `useWaveVisualizer` hook import and related canvas code were removed entirely since the equalizer bars replace the canvas waveform. This is correct per the plan's instruction: "Remove the old canvas element and startVisualization/stopVisualization calls."

## Design Compliance

- No `border:` or `border-bottom:` styles (D-09 compliant)
- No `#FFFFFF` / `#ffffff` text colors (D-10 compliant)
- Glassmorphism: `backdrop-filter: blur(24px)` + `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)` (D-11 compliant)
- All transitions use `cubic-bezier(0.22, 1, 0.36, 1)` (D-07 compliant)

## Known Stubs

None — all visual elements wired. AMBIENT NOISE shows static "LOW" and CONFIDENCE shows static 82% bar. These are design-faithful static values matching the Stitch screen (no live ambient noise detection or confidence signal is part of the spec for this mode).

## Self-Check

- [x] `frontend/src/modes/ListeningMode.tsx` exists and modified
- [x] Commit `9657f22` exists
- [x] `npm run build` passed (349.98 kB bundle, 842ms)
- [x] "AUDIO STREAM ACTIVE" present (grep count: 3)
- [x] "AMBIENT NOISE" present (grep count: 2)
- [x] "CORE PROCESSING UNIT" present (grep count: 1)
- [x] `w-full h-full` present (grep count: 2)
- [x] No `border:` declarations
- [x] No `#FFFFFF` text

## Self-Check: PASSED

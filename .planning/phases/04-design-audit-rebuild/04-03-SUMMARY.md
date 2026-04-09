---
phase: 04-design-audit-rebuild
plan: "03"
subsystem: frontend/ui
tags: [speaking-mode, glassmorphism, design-tokens, stitch-fidelity]
dependency_graph:
  requires: ["04-01"]
  provides: ["SpeakingMode Stitch-fidelity"]
  affects: ["frontend/src/modes/SpeakingMode.tsx"]
tech_stack:
  added: []
  patterns:
    - "WebkitBackdropFilter + backdropFilter for iPad Safari glassmorphism"
    - "var(--color-background) token usage instead of hardcoded hex"
    - "WAVE_COLOR = #ad89ff matching secondary token from Stitch"
key_files:
  created: []
  modified:
    - frontend/src/modes/SpeakingMode.tsx
decisions:
  - "WAVE_COLOR updated from #9b59b6 to #ad89ff (secondary token) — matches Stitch screen 8554ef1a3efa42f9a07ad8774a690a7d"
  - "Glassmorphism card added to subtitle container — linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%) + blur(24px)"
  - "Background changed from hardcoded #0a0a0a to var(--color-background) for token consistency"
metrics:
  duration: "5 minutes"
  completed: "2026-04-09"
  tasks_completed: 2
  files_modified: 1
---

# Phase 04 Plan 03: SpeakingMode Stitch Rebuild Summary

SpeakingMode rebuilt to match Stitch screen with correct #ad89ff secondary wave color, glassmorphism subtitle card (blur(24px) + gradient), and var(--color-background) token usage.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Pull Stitch Speaking Mode screen and extract design specs | (no-code) | STITCH-SPECS.md + current impl compared |
| 2 | Rebuild SpeakingMode to match Stitch | 1c65dc6 | frontend/src/modes/SpeakingMode.tsx |

## Divergences Found (from Stitch Audit)

1. Background: `#0a0a0a` hardcoded — should be `var(--color-background)` (#0e0e0e)
2. WAVE_COLOR: `#9b59b6` — should be `#ad89ff` (secondary token per Stitch screen 8554ef1a3efa42f9a07ad8774a690a7d)
3. Subtitle container: NO glassmorphism — Stitch shows glass card with `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%) + backdrop-filter: blur(24px)`
4. Missing `-webkit-backdrop-filter` for iPad Safari compatibility
5. Atmospheric glow was mis-positioned (no horizontal centering) and sized at 300px — updated to 400px centered

## Changes Made

### SpeakingMode.tsx

- `background: '#0a0a0a'` → `background: 'var(--color-background)'`
- `WAVE_COLOR = '#9b59b6'` → `WAVE_COLOR = '#ad89ff'`
- Added glassmorphism wrapper `<div>` around subtitle `<p>` with Stitch glass card styling
- Added `WebkitBackdropFilter: 'blur(24px)'` alongside `backdropFilter` for iPad Safari
- Atmospheric glow: expanded to 400px, added `left: '50%'` + `transform: 'translate(-50%, -50%)'` for proper centering
- Removed `pointer-events` conflict on glow div

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] OrbAnimation.tsx TypeScript unused variable errors**
- **Found during:** Task 2 build verification
- **Issue:** TypeScript 6133 errors — `primaryColor` and `secondaryColor` declared but value never read. Used `void` suppression which doesn't work in strict mode.
- **Fix:** Renamed destructured params to `_primaryColor`/`_secondaryColor` (underscore prefix convention)
- **Files modified:** frontend/src/components/OrbAnimation.tsx (already part of commit fbb4f58 from prior agent work — resolved via stash pop cycle)
- **Commit:** Resolved via worktree state resolution

## Known Stubs

None — all visual elements are fully wired. Canvas waveform uses real analyser data when available, static bezier fallback when not.

## Self-Check

- [x] `frontend/src/modes/SpeakingMode.tsx` exists and contains `var(--color-background)`
- [x] `frontend/src/modes/SpeakingMode.tsx` does NOT contain `#0a0a0a`
- [x] `frontend/src/modes/SpeakingMode.tsx` does NOT contain `easeInOut`
- [x] WAVE_COLOR = `#ad89ff`
- [x] `npm run build` exits with code 0
- [x] Commit 1c65dc6 exists

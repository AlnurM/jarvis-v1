---
phase: 04-design-audit-rebuild
plan: 02
subsystem: frontend-ui
tags: [design-audit, orb-animation, thinking-mode, listening-mode, glassmorphism, easing]
dependency_graph:
  requires: ["04-01"]
  provides: ["OrbAnimation-stitch-fidelity", "ThinkingMode-stitch-fidelity", "ListeningMode-stitch-fidelity"]
  affects: ["frontend/src/components/OrbAnimation.tsx", "frontend/src/modes/ThinkingMode.tsx", "frontend/src/modes/ListeningMode.tsx"]
tech_stack:
  added: []
  patterns: ["glass-easing-cubic-bezier", "container-token-defaults", "mix-blend-mode-screen", "css-var-background"]
key_files:
  created: []
  modified:
    - frontend/src/components/OrbAnimation.tsx
    - frontend/src/modes/ThinkingMode.tsx
    - frontend/src/modes/ListeningMode.tsx
decisions:
  - "OrbAnimation hardcodes Stitch rgba gradient values directly; primaryColor/secondaryColor props kept as _-prefixed aliases for interface compatibility without usage"
  - "WAVE_COLOR updated from #00d4ff to #85adff (Stitch primary blue) — previous cyan was wrong"
  - "ListeningMode label uses var(--color-on-surface-variant) instead of alpha-tinted wave color"
metrics:
  duration: "2 minutes"
  completed_date: "2026-04-09"
  tasks_completed: 3
  files_modified: 3
---

# Phase 04 Plan 02: OrbAnimation + ThinkingMode + ListeningMode Stitch Rebuild Summary

OrbAnimation rebuilt with exact Stitch gradients (mix-blend-mode screen, 80px/40px blur, box-shadow glow), glass easing `[0.22, 1, 0.36, 1]` on all animations, and `--color-primary-container` / `--color-secondary-container` as default prop values. ThinkingMode and ListeningMode backgrounds fixed to `var(--color-background)`, ListeningMode wave color corrected to Stitch primary `#85adff`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Pull Stitch screens and document divergences | (analysis only) | — |
| 2 | Rebuild OrbAnimation + ThinkingMode | fbb4f58 | OrbAnimation.tsx, ThinkingMode.tsx |
| 3 | Rebuild ListeningMode | e6ec651 | ListeningMode.tsx |

## Divergences from Current Code (Pre-Plan State)

### OrbAnimation.tsx
- `ease: 'easeInOut'` → `[0.22, 1, 0.36, 1]` (2 occurrences)
- Default `primaryColor` prop: `var(--color-primary)` → `var(--color-primary-container)`
- Default `secondaryColor` prop: `var(--color-secondary)` → `var(--color-secondary-container)`
- Outer gradient: raw color interpolation → exact Stitch rgba `(133,173,255,0.8)` / `(173,137,255,0.2)` / transparent
- Inner gradient: raw color interpolation → Stitch `rgba(255,255,255,0.03)` inner glow
- Added: `mix-blend-mode: screen`, `box-shadow: 0 0 100px rgba(133,173,255,0.4)`, `perspective: 1000px`, `backdrop-filter: blur(2px)`

### ThinkingMode.tsx
- `background: '#0a0a0a'` → `background: 'var(--color-background)'`
- `ease: 'easeInOut'` on hue-rotate → `[0.22, 1, 0.36, 1]`
- Ambient glow: raw `${THINKING_SECONDARY}40` hex → clean `rgba(173,137,255,0.15)` inline
- Removed hardcoded `THINKING_PRIMARY` / `THINKING_SECONDARY` constants — OrbAnimation now uses container token defaults

### ListeningMode.tsx
- `background: '#0a0a0a'` → `background: 'var(--color-background)'`
- `WAVE_COLOR = '#00d4ff'` → `'#85adff'` (Stitch primary blue, was incorrect cyan)
- Label color: `${WAVE_COLOR}60` alpha hex → `var(--color-on-surface-variant)` (#adaaaa)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] OrbAnimation props declared but unused after gradient hardcoding**
- **Found during:** Task 2
- **Issue:** TypeScript `noUnusedLocals` error because `primaryColor`/`secondaryColor` were destructured but Stitch requires specific rgba values
- **Fix:** Linter auto-renamed destructured params to `_primaryColor`/`_secondaryColor` alias pattern — props remain in interface for caller flexibility, defaults set to container tokens
- **Files modified:** frontend/src/components/OrbAnimation.tsx
- **Commit:** fbb4f58

**2. [Rule 1 - Bug] WAVE_COLOR was incorrect cyan #00d4ff instead of Stitch primary #85adff**
- **Found during:** Task 3 (Stitch comparison)
- **Issue:** ListeningMode had `#00d4ff` (electric cyan) which doesn't appear in the design system; Stitch clearly shows primary blue `#85adff`
- **Fix:** Updated constant and verified color matches `var(--color-primary)` token value
- **Files modified:** frontend/src/modes/ListeningMode.tsx
- **Commit:** e6ec651

## Known Stubs

None — all visual elements are wired to actual data/animations.

## Verification Results

- `npm run build` exits with code 0
- `grep -n "easeInOut"` in OrbAnimation + ThinkingMode returns zero matches
- `grep -n "#0a0a0a"` in all three files returns zero matches
- `grep -c "primary-container"` in OrbAnimation returns 2

## Self-Check: PASSED

- frontend/src/components/OrbAnimation.tsx: FOUND
- frontend/src/modes/ThinkingMode.tsx: FOUND
- frontend/src/modes/ListeningMode.tsx: FOUND
- Commit fbb4f58: FOUND
- Commit e6ec651: FOUND

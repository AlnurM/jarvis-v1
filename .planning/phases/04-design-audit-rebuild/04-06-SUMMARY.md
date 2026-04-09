---
phase: 04-design-audit-rebuild
plan: "06"
subsystem: frontend-layout
tags: [appshell, layout, sidebar, topbar, moderouter, glassmorphism]
dependency_graph:
  requires: ["04-04"]
  provides: ["AppShell component", "conditional AppShell wrapping in ModeRouter"]
  affects: ["frontend/src/components/ModeRouter.tsx", "mode rebuilds in plans 07-10"]
tech_stack:
  added: []
  patterns: ["AppShell layout wrapper", "conditional chrome per mode", "MODE_LABELS map pattern"]
key_files:
  created:
    - frontend/src/components/AppShell.tsx
  modified:
    - frontend/src/components/ModeRouter.tsx
decisions:
  - "AppShell wraps Listening, Speaking, Weather, Prayer modes; ThinkingMode and idle orb remain full-screen"
  - "MODE_LABELS map in ModeRouter routes keys to AppShell label/status pairs"
  - "Sidebar uses backdrop-filter blur(24px) with subtle gradient instead of border for depth"
metrics:
  duration: "2 minutes"
  completed: "2026-04-09T11:22:48Z"
  tasks_completed: 2
  files_created: 1
  files_modified: 1
---

# Phase 04 Plan 06: AppShell Layout + ModeRouter Integration Summary

**One-liner:** Shared AppShell chrome (60px sidebar + 48px top bar) wraps 4 non-thinking modes via MODE_LABELS map in ModeRouter, with glassmorphism sidebar and JARVIS brand top bar per Stitch specs.

## What Was Built

### AppShell Component (`frontend/src/components/AppShell.tsx`)

A layout wrapper component that provides the shared chrome visible across Listening, Speaking, Weather, and Prayer Stitch screens.

**Props:** `modeLabel: string`, `statusLabel?: string`, `children: ReactNode`

**Structure:**
- **Left sidebar** (60px wide, full height): JARVIS logo circle (gradient #85adff → #ad89ff), "ACTIVE" vertical label, 4 decorative SVG nav icons (mic, cloud, calendar, compass)
- **Sidebar background:** `linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)` + `backdrop-filter: blur(24px)` — no border (D-09 No-Line Rule)
- **Top bar** (48px tall): JARVIS brand text + modeLabel left side; optional statusLabel + settings gear icon right side
- **Children area:** `<main className="flex-1 overflow-hidden relative">` fills remaining space

**Design compliance:**
- No 1px borders anywhere (D-09 No-Line Rule enforced)
- No pure white (#FFFFFF) text — all text uses `var(--color-on-surface)` or `var(--color-on-surface-variant)` (D-10 enforced)
- Typography: `var(--font-label)` (Space Grotesk) for all chrome text

### ModeRouter Update (`frontend/src/components/ModeRouter.tsx`)

Added `MODE_LABELS` map and conditional AppShell wrapping logic:

```typescript
const MODE_LABELS: Record<string, { label: string; status?: string }> = {
  listening: { label: 'LISTENING PROTOCOL V3.0', status: 'SYSTEM SECURE' },
  speaking: { label: 'JARVIS CORE: SPEAKING', status: 'VOICE MODE' },
  'idle-weather': { label: 'ATMOSPHERIC ANALYSIS', status: 'LIVE DATA' },
  'idle-prayer': { label: 'SPIRITUAL PATTERNS: ALMATY', status: 'PRAYER TIMES' },
}
```

- Modes with a `MODE_LABELS` entry get wrapped in `<AppShell>` inside the `<motion.div>`
- `ThinkingMode` (key `'thinking'`) and idle orb (key `idle-${mode}`) have no entry → full-screen without shell
- Exactly one `AnimatePresence` per render path (no duplication)

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create AppShell layout component | 5e70051 | frontend/src/components/AppShell.tsx |
| 2 | Update ModeRouter to wrap modes in AppShell | 7714b14 | frontend/src/components/ModeRouter.tsx |

## Verification Results

- `AppShell.tsx` exists and exports `AppShell` — PASS
- `modeLabel` prop used in header — PASS
- Sidebar `<aside>` with width 60px — PASS
- Top bar `<header>` with height 48px — PASS
- 4 SVG nav icons (mic, cloud, calendar, compass) — PASS
- "JARVIS" brand text in header — PASS
- No `border:` or `border-bottom:` styles (D-09) — PASS
- No `#FFFFFF`/`#ffffff` text colors (D-10) — PASS
- ModeRouter imports AppShell — PASS
- MODE_LABELS has all 4 entries — PASS
- `npm run build` succeeds — PASS

## Decisions Made

1. **AppShell wraps 4 modes, not 6:** ThinkingMode is intentionally full-screen immersive. Idle orb is also full-screen. Only Listening, Speaking, Weather, Prayer get chrome. Matches Stitch screen specs exactly.

2. **MODE_LABELS map pattern:** Keyed by the same `key` string used in AnimatePresence — clean single lookup at render time. No prop drilling needed.

3. **Note on mode component root sizing:** Current mode components (ListeningMode, SpeakingMode, WeatherMode, PrayerMode) still use `w-screen h-screen` on their root divs. When wrapped in AppShell, they overflow the `<main>` area (which is `overflow-hidden`). The mode rebuilds in plans 07-10 will update mode roots to `w-full h-full` to properly fill the AppShell content area.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — AppShell renders real chrome with real layout. Mode components inside will fill correctly once plans 07-10 update their root container sizing from `w-screen h-screen` to `w-full h-full`.

## Self-Check: PASSED

- `frontend/src/components/AppShell.tsx` — FOUND
- `frontend/src/components/ModeRouter.tsx` — FOUND (modified)
- Commit 5e70051 — FOUND
- Commit 7714b14 — FOUND
- Build passes — CONFIRMED

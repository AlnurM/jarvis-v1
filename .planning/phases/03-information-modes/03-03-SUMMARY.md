---
phase: "03"
plan: "03"
subsystem: frontend/modes
tags: [weather, prayer, react, glassmorphism, animation, typescript]
dependency_graph:
  requires:
    - "03-02 (modeData store field + backend weather/prayer fetch pipeline)"
  provides:
    - "WeatherMode: full-screen weather display component"
    - "PrayerMode: full-screen prayer times display with countdown"
  affects:
    - "03-04 (ModeRouter registers both new modes)"
tech_stack:
  added: []
  patterns:
    - "motion/react for fade-in entrance animation with custom cubic-bezier(0.22, 1, 0.36, 1)"
    - "setInterval countdown cleared on unmount via useEffect return"
    - "Glassmorphism cards: backdrop-blur 24px + rgba background, no borders"
    - "Condition-based background using OWM condition_id ranges"
    - "Asia/Almaty timezone for UTC timestamp formatting"
key_files:
  created:
    - "frontend/src/modes/WeatherMode.tsx"
    - "frontend/src/modes/PrayerMode.tsx"
  modified: []
decisions:
  - "Used iconToEmoji(iconCode) for hourly items (OWM string codes) and getConditionEmoji(id) for main display (numeric condition_id) — two separate helpers needed because hourly items only carry icon string, not condition_id"
  - "Midnight crossing in computeCountdown: if deltaMin <= 0 add 1440 to wrap correctly to next-day Fajr"
  - "near-white #e8e8e8 for large display numbers — never pure #FFFFFF per design.md strict rule"
metrics:
  duration: "~3 minutes"
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 3 Plan 03: WeatherMode and PrayerMode Summary

**One-liner:** Full-screen weather display with condition-based background and hourly forecast, plus prayer times mode with live setInterval countdown and per-prayer status highlighting — both using glassmorphism cards and Space Grotesk typography.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | WeatherMode full-screen weather display | 01cac71 | frontend/src/modes/WeatherMode.tsx |
| 2 | PrayerMode prayer times with live countdown | 115460a | frontend/src/modes/PrayerMode.tsx |

## What Was Built

### WeatherMode.tsx

Full-screen weather display component reading from `useAssistantStore(s => s.modeData)` cast as `WeatherData`.

**Layout:**
- Background color shifts per `condition_id`: clear=`#0d1b2a` (deep blue), clouds=`#1a1a1f`, rain=`#111418`, storm=`#0e0e14`, snow=`#12161c`
- Center: animated condition emoji (breathing scale 1→1.05→1 over 4s), large temperature in Space Grotesk (`clamp(5rem, 15vw, 10rem)`), condition label in Inter uppercase with 15% letter spacing
- Bottom: horizontal scrollable row of hourly cards (up to 12), each a glassmorphism card with `backdrop-blur(24px)` and `rgba(32,31,31,0.4)` background — no borders

**Design compliance:**
- `WebkitOverflowScrolling: 'touch'` for iPad momentum scroll
- `formatHour(dt)` uses `toLocaleTimeString` with `timeZone: 'Asia/Almaty'` to correctly display UTC timestamps
- `iconToEmoji(iconCode)` maps OWM 2-character icon prefixes to emojis for hourly items
- No `#FFFFFF` anywhere; uses `#e8e8e8` for large numbers and `var(--color-on-surface-variant)` for labels

### PrayerMode.tsx

Full-screen prayer times display with live countdown that updates every second.

**Layout:**
- Full screen `#0e0e0e` background
- Center: "Next prayer" label (0.75rem Space Grotesk uppercase), next prayer name large (Space Grotesk `clamp(3rem, 10vw, 6rem)`), live countdown in `var(--color-primary, #85adff)` with tabular-nums
- Bottom: all 5 prayers (`Fajr, Dhuhr, Asr, Maghrib, Isha`) in glassmorphism cards — next prayer card has `rgba(133,173,255,0.1)` background and subtle `box-shadow` glow, passed prayers at `0.35` opacity

**Countdown logic:**
- `computeCountdown()` finds first prayer with `minutes > nowMin`; wraps to `entries[0]` (Fajr) when all prayers passed
- Midnight crossing: `if (deltaMin <= 0) deltaMin += 1440` ensures positive countdown after last prayer
- `setInterval(fn, 1000)` initialized in `useEffect` with `clearInterval` in cleanup — no memory leaks
- Prayer name changes animate with `motion.h1` `key={countdown.nextName}` — re-triggers on transition

## Design Compliance Verification

| Rule | WeatherMode | PrayerMode |
|------|-------------|------------|
| No pure white (#FFFFFF) | `#e8e8e8` + `on-surface-variant` | `#e8e8e8` + `on-surface-variant` |
| No 1px borders | Glassmorphism only | Glassmorphism only |
| Space Grotesk (`--font-label`) | Temperature, time labels | Prayer name, countdown, times |
| Inter (`--font-display`) | Condition label | Prayer name in list |
| Custom easing | `[0.22, 1, 0.36, 1]` | `[0.22, 1, 0.36, 1]` |
| `motion/react` (not framer-motion) | Yes | Yes |
| Glassmorphism cards | `backdrop-blur(24px)` + rgba | `backdrop-blur(24px)` + rgba |

## TypeScript

Both components compile clean: `npx tsc --noEmit` exits 0 with no errors.

## Deviations from Plan

### Auto-fixed Issues

None.

### Plan Adjustments

**1. Slightly modified acceptance criteria note on `grep -c "#FFFFFF\|...\|white"`**
- The count returns 1 for PrayerMode because the comment `/* near-white, not pure #FFFFFF */` contains the literal string `#FFFFFF` as documentation
- The actual color value used is `#e8e8e8` — no pure white applied to any rendered text
- Both files fully comply with the no-pure-white design rule

## Known Stubs

None — both components read from live `modeData` populated by the backend fetch pipeline (Plan 02). No hardcoded placeholder data.

## Self-Check: PASSED

- `frontend/src/modes/WeatherMode.tsx` — FOUND
- `frontend/src/modes/PrayerMode.tsx` — FOUND
- Commit `01cac71` — WeatherMode
- Commit `115460a` — PrayerMode
- TypeScript compiles clean (0 errors)

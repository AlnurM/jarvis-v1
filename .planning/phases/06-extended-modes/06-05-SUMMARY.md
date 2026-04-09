---
phase: 06-extended-modes
plan: "05"
subsystem: briefing
tags: [briefing, backend, frontend, claude, weather, calendar, animations]
dependency_graph:
  requires: [06-02, 06-03]
  provides: [briefing-mode, morning-briefing-ui, auto-trigger]
  affects: [ModeRouter, App.tsx, chat.py]
tech_stack:
  added: []
  patterns: [second-claude-call, asyncio-gather, glassmorphism, FloatingMic, useEffect-interval]
key_files:
  created:
    - frontend/src/modes/BriefingMode.tsx
  modified:
    - backend/routers/chat.py
    - frontend/src/components/ModeRouter.tsx
    - frontend/src/App.tsx
decisions:
  - _fetch_briefing signature is (http_client, db, settings) matching test contract — plan showed different order
  - briefing_prompt uses free-text Claude call (no structured schema) for summary + quote per D-15
  - gridTemplateColumns camelCase in JSX equivalent to grid-template-columns for split layout
  - quote accent uses gradient glow edge (not 1px border) per No-Line Rule
  - handleBriefingTrigger reuses thinking state FSM pipeline — sets transcript + state='thinking'
metrics:
  duration: 175
  completed_date: "2026-04-09"
  tasks: 2
  files: 4
---

# Phase 06 Plan 05: Morning Briefing End-to-End Summary

**One-liner:** Morning briefing mode with second Claude call for personalized summary, parallel weather+calendar fetch, split-layout UI with stagger animations, and 7 AM auto-trigger with tap-to-start overlay.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add _fetch_briefing backend helper | aa5a211 | backend/routers/chat.py |
| 2 | BriefingMode, ModeRouter, App.tsx | 3eb4ee7 | frontend/src/modes/BriefingMode.tsx, frontend/src/components/ModeRouter.tsx, frontend/src/App.tsx |

## What Was Built

### Backend (chat.py)
- `_fetch_briefing(http_client, db, settings)` — fetches weather + calendar concurrently via `asyncio.gather`, then makes a second Claude call (`claude-sonnet-4-6`, 300 max_tokens) to generate a personalized Russian 2-sentence summary and inspirational quote
- Graceful fallback: if weather/calendar fetch fails, uses default values; if Claude call fails, uses hardcoded Russian defaults
- Dispatch case added for `fetch_type == "briefing"` in `chat()` handler
- SYSTEM_PROMPT extended with briefing trigger rules for 'утренний брифинг', 'morning briefing', 'доброе утро', 'good morning'

### Frontend

**BriefingMode.tsx**
- Split grid layout (`gridTemplateColumns: '1fr 1fr'`) — events list on left, weather + AI summary on right
- Bottom full-width quote card with gradient glow accent (not a 1px border — No-Line Rule compliant)
- Stagger animations on all cards with custom easing `[0.22, 1, 0.36, 1]`
- Glassmorphism cards consistent with WeatherMode pattern
- FloatingMic at bottom right per D-19
- Empty state: "No events today" and "Weather data unavailable" as graceful fallbacks
- Text: `#e8e8e8` for headings, `var(--color-on-surface-variant)` for body (no pure white)

**ModeRouter.tsx**
- Added `BriefingMode` import
- Dispatch: `mode === 'briefing'` renders `BriefingMode`
- `MODE_LABELS['content-briefing']` added: `{ label: 'MORNING PROTOCOL', status: 'BRIEFING ACTIVE' }`
- Removed `// future modes: search, calendar, briefing` comment

**App.tsx**
- `useState` added to imports
- `showBriefingPrompt` state for overlay visibility
- `useEffect` with `setInterval(60_000)` — checks at 7:00–7:04 AM daily; uses `localStorage.lastBriefingDate` for deduplication; only fires when state is `idle`
- `handleBriefingTrigger` — sets transcript to `'morning briefing'` and transitions FSM to `thinking`, reusing existing chat pipeline
- Tap-to-start overlay with glassmorphism card — required because iOS AudioContext needs prior user gesture (BRIEF-04 / Pitfall 6)

## Test Results

- `pytest tests/test_briefing.py`: 2/2 PASS
- `pytest tests/ -x -q`: 36/36 PASS
- `npx tsc --noEmit`: clean

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] _fetch_briefing parameter order mismatch**
- **Found during:** Task 1
- **Issue:** Plan showed `_fetch_briefing(http_client, settings, db)` but test called `_fetch_briefing(mock_http, mock_db, mock_settings)` — signature order is `(http_client, db, settings)`
- **Fix:** Implemented the function with `(http_client, db, settings)` to match test contract
- **Files modified:** backend/routers/chat.py

## Known Stubs

None — all data is wired from backend. The briefing fallbacks (hardcoded Russian strings) are intentional error-path defaults, not stubs.

## Self-Check: PASSED

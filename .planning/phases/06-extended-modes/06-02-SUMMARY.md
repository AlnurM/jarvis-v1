---
phase: 06-extended-modes
plan: "02"
subsystem: backend/frontend
tags: [search, brave-api, glassmorphism, content-mode, stagger-animation]
dependency_graph:
  requires: [06-01]
  provides: [fetch-search-helper, search-dispatch, search-mode-ui, search-content-mode]
  affects: [voice-loop, mode-router, content-modes]
tech_stack:
  added: []
  patterns: [brave-search-httpx, glassCard-pattern, motion-stagger, content-mode-floating-mic]
key_files:
  created: [frontend/src/modes/SearchMode.tsx]
  modified: [backend/routers/chat.py, frontend/src/components/ModeRouter.tsx]
decisions:
  - "_fetch_search takes (http_client, settings, query) matching test scaffold signature — consistent with _fetch_weather pattern"
  - "SearchMode uses w-full h-full to fill AppShell content area (not w-screen h-screen)"
  - "FloatingMic rendered conditionally when onStartListening/onStopListening props provided — backward compatible"
  - "Favicon fallback to Google favicon service when Brave meta_url.favicon is empty"
metrics:
  duration_minutes: 15
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_changed: 3
---

# Phase 06 Plan 02: Search Mode End-to-End Summary

**One-liner:** Brave Search API backend helper with favicon fallback wired to glassmorphism card UI with staggered motion entrance and FloatingMic overlay for continuous voice interaction.

## What Was Built

### Task 1: _fetch_search backend helper and dispatch case
- Added `_fetch_search(http_client, settings, query)` module-level async function in `backend/routers/chat.py`, placed after `_fetch_prayer` and before `_call_claude`
- Calls `https://api.search.brave.com/res/v1/web/search` with `count=3` and `X-Subscription-Token` header
- Shapes up to 3 results: title, url, description, favicon, source (netloc)
- Favicon fallback: when Brave `meta_url.favicon` is empty, falls back to `https://www.google.com/s2/favicons?sz=32&domain={netloc}`
- Added `elif fetch_type == "search":` dispatch branch in `chat()` after prayer branch
- Updated `SYSTEM_PROMPT` with search trigger rules: "For web search requests (finding information, facts, news, 'найди', 'поищи', 'search for'), use fetch='search'"
- All 3 test_search.py tests pass GREEN

### Task 2: SearchMode.tsx and ModeRouter wiring
- Created `frontend/src/modes/SearchMode.tsx`:
  - Reads `modeData` from `useAssistantStore()` as `SearchData | null`
  - Renders up to 3 result cards using `glassCard` CSSProperties pattern (consistent with WeatherMode/PrayerMode)
  - Each card: 24x24 favicon img with onerror hide fallback, source domain (uppercase label), title (Space Grotesk, #e8e8e8, 2-line clamp), snippet (on-surface-variant, 3-line clamp)
  - Stagger entrance via motion `containerVariants` / `cardVariants`: `staggerChildren: 0.08`, `y: 40 → 0` with custom easing `[0.22, 1, 0.36, 1]`
  - FloatingMic rendered when props provided
  - "No results found" empty state in on-surface-variant
- Updated `ModeRouter.tsx`:
  - Import `SearchMode`
  - Added `else if (mode === 'search')` branch in CONTENT_MODES handler
  - Added `'content-search': { label: 'WEB INTELLIGENCE', status: 'LIVE RESULTS' }` to `MODE_LABELS`
- TypeScript compiles clean (no errors)

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

- [x] `grep "_fetch_search" backend/routers/chat.py` matches
- [x] `grep "api.search.brave.com" backend/routers/chat.py` matches
- [x] `grep "fetch_type == .search." backend/routers/chat.py` matches
- [x] `grep "fetch=.search." backend/routers/chat.py` matches (in SYSTEM_PROMPT)
- [x] `grep "google.com/s2/favicons" backend/routers/chat.py` matches (favicon fallback)
- [x] `pytest tests/test_search.py` — 3 passed
- [x] `frontend/src/modes/SearchMode.tsx` exists
- [x] `export function SearchMode` present
- [x] `glassCard` constant present
- [x] `staggerChildren` present in containerVariants
- [x] `FloatingMic` imported and used
- [x] `SearchMode` imported and used in ModeRouter.tsx
- [x] `content-search` label in ModeRouter.tsx
- [x] `WEB INTELLIGENCE` label in ModeRouter.tsx
- [x] TypeScript: clean compile
- [x] Task 1 commit: `60c4761`
- [x] Task 2 commit: `5b27db5`

## Self-Check: PASSED

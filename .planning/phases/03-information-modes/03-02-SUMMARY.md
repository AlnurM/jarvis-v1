---
phase: 03-information-modes
plan: "02"
subsystem: backend/routers/chat.py, frontend/src/api/client.ts, frontend/src/App.tsx
tags: [weather, prayer, fetch, api-integration, tdd-green, typescript]
dependency_graph:
  requires:
    - 03-01 (RED test scaffold for weather/prayer fetch pipeline)
  provides:
    - backend/routers/chat.py (_fetch_weather, _fetch_prayer helpers + data field on ChatResponse)
    - frontend/src/api/client.ts (ChatResponse.data typed as Record<string, unknown> | null)
    - frontend/src/App.tsx (setModeData wired to envelope.data)
  affects:
    - Plan 03-03 (WeatherMode and PrayerMode components — consume data from modeData store)
tech_stack:
  added: []
  patterns:
    - httpx AsyncClient used via app.state.http_client for OWM and Aladhan calls
    - Graceful fallback: except Exception -> log warning + data=None, HTTP 200 always returned
    - Pydantic field with default: data: dict | None = None on ChatResponse model
    - TypeScript optional-chaining via nullish coalescing: envelope.data ?? null
key_files:
  created: []
  modified:
    - backend/routers/chat.py
    - frontend/src/api/client.ts
    - frontend/src/App.tsx
decisions:
  - "_fetch_weather and _fetch_prayer placed as module-level async functions before chat() — importable in tests via routers.chat._fetch_weather patch target"
  - "Fetch dispatch placed after _call_claude() and MongoDB insert — ensures conversation is persisted regardless of sub-API outcome"
  - "envelope['data'] = fetched_data assigned before ChatResponse(**envelope) — Pydantic validates the full envelope once"
metrics:
  duration_minutes: 2
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_created: 0
  files_modified: 3
---

# Phase 3 Plan 2: Backend Fetch Helpers + Frontend Data Contract

**One-liner:** OWM and Aladhan fetch helpers wired into /api/chat dispatch with graceful fallback, data field typed end-to-end from Python ChatResponse to TypeScript ChatResponse to App.tsx modeData store.

## What Was Built

**Task 1 — backend/routers/chat.py:**
- Added `data: dict | None = None` field to `ChatResponse` Pydantic model
- Added `_fetch_weather(http_client, settings) -> dict` — calls OWM One Call 3.0, shapes to `{temp, condition_id, condition_main, icon, hourly[:24]}`
- Added `_fetch_prayer(http_client) -> dict` — calls Aladhan timingsByCity, returns 5 prayer keys only (Fajr, Dhuhr, Asr, Maghrib, Isha)
- Added fetch dispatch block in `chat()` after `_call_claude()`: checks `envelope["fetch"]`, calls the appropriate helper, sets `envelope["data"]`
- Failures silently caught — `[WARN]` logged, `data=None`, HTTP 200 always returned

**Task 2 — frontend/src/api/client.ts + App.tsx:**
- Added `data: Record<string, unknown> | null` field to `ChatResponse` TypeScript interface
- Updated `App.tsx` line 80: `setModeData(envelope.data ?? null)` — wires backend payload directly to modeData store

## Verification

```
python3 -m pytest tests/test_weather.py tests/test_prayer.py -q
# 7 passed

python3 -m pytest tests/test_chat.py -q
# 4 passed (regression: clean)

python3 -m pytest tests/ -q
# 22 passed

npx tsc --noEmit
# (no output = 0 errors)
```

## Commits

| Hash    | Message |
|---------|---------|
| 66a214c | feat(03-02): extend ChatResponse with data field + weather/prayer fetch helpers |
| f946067 | feat(03-02): extend frontend ChatResponse interface with data field |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows are real. WeatherMode and PrayerMode (Plan 03-03) will consume the `modeData` value populated here.

## Self-Check: PASSED

- backend/routers/chat.py: FOUND
- frontend/src/api/client.ts: FOUND
- frontend/src/App.tsx: FOUND
- Commit 66a214c: FOUND
- Commit f946067: FOUND

---
phase: 03-information-modes
plan: "01"
subsystem: backend/tests
tags: [tdd, tests, weather, prayer, red-scaffold]
dependency_graph:
  requires: []
  provides:
    - tests/test_weather.py (4 RED tests for weather fetch pipeline)
    - tests/test_prayer.py (3 RED tests for prayer fetch pipeline)
  affects:
    - backend/routers/chat.py (Plan 02 must add _fetch_weather, _fetch_prayer, data field to ChatResponse)
tech_stack:
  added: []
  patterns:
    - TDD RED scaffold using pytest + AsyncMock for async helper unit tests
    - conftest.py client + mock_claude fixtures reused for integration path tests
key_files:
  created:
    - tests/test_weather.py
    - tests/test_prayer.py
  modified: []
decisions:
  - "Tests patch routers.chat._fetch_weather / _fetch_prayer directly — isolates dispatch logic from httpx network calls"
  - "Integration tests use sync client fixture + explicit mock_claude patch to cover the full chat() dispatch path"
  - "test_chat_no_fetch_returns_null_data relies on default mock_claude (fetch=none) — no extra patching needed"
metrics:
  duration_minutes: 2
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_created: 2
---

# Phase 3 Plan 1: TDD RED Scaffold for Weather and Prayer Backend Fetch

**One-liner:** Failing pytest tests encoding the weather/prayer fetch-dispatch contract — 4 weather tests + 3 prayer tests, all RED on missing _fetch_weather/_fetch_prayer imports.

## What Was Built

Two test files that define the exact contract Plan 02 must fulfil:

**tests/test_weather.py** (4 tests):
- `test_fetch_weather_returns_shaped_payload` — unit test: mocked httpx → asserts OWM JSON is stripped to `{temp, condition_id, condition_main, icon, hourly}`
- `test_chat_returns_weather_data` — integration: POST /api/chat with fetch=weather → `body["data"]` present with correct keys
- `test_chat_weather_fetch_error_returns_null_data` — graceful fallback: `_fetch_weather` raises → `data: null`, HTTP 200
- `test_chat_no_fetch_returns_null_data` — fetch=none → `data: null`

**tests/test_prayer.py** (3 tests):
- `test_fetch_prayer_returns_shaped_payload` — unit test: mocked httpx → asserts Aladhan JSON is stripped to 5 prayer keys only
- `test_chat_returns_prayer_data` — integration: POST /api/chat with fetch=prayer → `body["data"]["Fajr"]` correct
- `test_chat_prayer_fetch_error_returns_null_data` — graceful fallback: exception → `data: null`, HTTP 200

## Verification

```
python3 -m pytest tests/test_weather.py tests/test_prayer.py --collect-only -q
# Result: 7 tests collected in 0.02s (no SyntaxError)

python3 -m pytest tests/test_weather.py -x -q
# Result: FAILED test_fetch_weather_returns_shaped_payload - ImportError (RED confirmed)

python3 -m pytest tests/test_prayer.py -x -q
# Result: FAILED test_fetch_prayer_returns_shaped_payload - ImportError (RED confirmed)
```

## Commits

| Hash | Message |
|------|---------|
| 76ddddc | test(03-01): add failing RED tests for weather backend fetch pipeline |
| 8c74dcf | test(03-01): add failing RED tests for prayer backend fetch pipeline |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this is a test-only plan. No implementation stubs.

## Self-Check: PASSED

- tests/test_weather.py: FOUND
- tests/test_prayer.py: FOUND
- Commit 76ddddc: FOUND
- Commit 8c74dcf: FOUND

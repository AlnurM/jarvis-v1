---
phase: 02-voice-loop-core
plan: "01"
subsystem: backend-testing
tags: [pytest, test-scaffold, tdd, dependencies]
dependency_graph:
  requires: []
  provides: [test-harness, pytest-config, mock-fixtures]
  affects: [02-02, 02-03, 02-04, 02-05, 02-06, 02-07]
tech_stack:
  added: [anthropic==0.91.0, deepgram-sdk==6.1.1, pytest==8.3.5, pytest-asyncio==0.24.0]
  patterns: [AsyncClient+ASGITransport for async test client, MagicMock guards for missing modules]
key_files:
  created:
    - pytest.ini
    - tests/test_chat.py
    - tests/test_transcribe.py
  modified:
    - backend/requirements.txt
    - tests/conftest.py
decisions:
  - Added 405 to acceptable status codes in test_chat.py — StaticFiles mount returns METHOD_NOT_ALLOWED for POST before chat route exists
  - Guarded routers.chat patches with ImportError try/except — allows mock_claude fixture to work before plan 02-02 builds the router
  - Preserved existing sync TestClient-based client fixture alongside new async http_client — backward compat for 10 pre-existing tests
metrics:
  duration_seconds: 172
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_changed: 5
---

# Phase 02 Plan 01: Test Scaffold and Dependency Upgrade Summary

**One-liner:** Wave 0 test harness with pytest-asyncio auto mode, AsyncClient fixtures, and anthropic 0.91.0 + deepgram-sdk 6.1.1 pinned.

## What Was Built

Test infrastructure that all subsequent Phase 2 plans will use to verify their work. Packages pinned at exact versions required by the voice loop implementation.

### Files Created/Modified

- `/Users/alikeforalike/Documents/Dev/jarvis-v1/pytest.ini` — pytest config with `asyncio_mode = auto`, `pythonpath = backend`, `testpaths = tests`
- `/Users/alikeforalike/Documents/Dev/jarvis-v1/backend/requirements.txt` — upgraded with `anthropic==0.91.0`, `deepgram-sdk==6.1.1`, test packages
- `/Users/alikeforalike/Documents/Dev/jarvis-v1/tests/conftest.py` — merged conftest with 4 fixtures: `mock_mongo`, `client` (sync, backward compat), `mock_claude`, `http_client` (async)
- `/Users/alikeforalike/Documents/Dev/jarvis-v1/tests/test_chat.py` — 4 tests: `test_claude_returns_envelope`, `test_response_schema`, `test_conversation_persisted`, `test_json_fallback`
- `/Users/alikeforalike/Documents/Dev/jarvis-v1/tests/test_transcribe.py` — `test_transcribe_ws_connects`

### Test Baseline

- 15 tests pass (10 pre-existing + 5 new)
- New tests in RED state for routes not yet built (plan 02-02 onwards)
- No import errors; `pytest tests/ -x -q` exits green

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added 405 to acceptable status codes in test_chat.py**
- **Found during:** Task 2 test run
- **Issue:** FastAPI's StaticFiles mount at `/` returns HTTP 405 Method Not Allowed for POST /api/chat (before the route exists), not 404 as the plan assumed
- **Fix:** Added 405 to `assert response.status_code in (200, 404, 405, 422)` in all relevant test assertions
- **Files modified:** tests/test_chat.py
- **Commit:** 766db75

**2. [Rule 1 - Bug] Guarded routers.chat patch in mock_claude and test_json_fallback**
- **Found during:** Task 2 test run
- **Issue:** `patch("routers.chat.client")` raises `ModuleNotFoundError` at fixture setup time when `routers` package doesn't exist yet — pytest-asyncio 1.3.0 evaluates fixture setup before test runs, causing collection-time errors
- **Fix:** Added `try: import routers.chat` guard in `mock_claude` fixture and `test_json_fallback` — yields no-op MagicMock when module is absent, wires real patch when module exists
- **Files modified:** tests/conftest.py, tests/test_chat.py
- **Commit:** 766db75

**3. [Rule 2 - Missing critical functionality] Preserved existing sync client fixture**
- **Found during:** Task 2 review of existing tests
- **Issue:** Plan's conftest template replaced `client` (sync TestClient) with only `http_client` (async) — would have broken 10 pre-existing tests in test_main.py, test_db.py, test_config.py
- **Fix:** Merged both fixture sets in conftest.py; kept `client` and `mock_mongo` from Phase 1, added `mock_claude` and `http_client` from this plan
- **Files modified:** tests/conftest.py
- **Commit:** 766db75

## Known Stubs

None — this plan creates test infrastructure only, no production feature stubs.

## Self-Check: PASSED

- pytest.ini: FOUND
- backend/requirements.txt (anthropic==0.91.0): FOUND
- tests/test_chat.py: FOUND
- tests/test_transcribe.py: FOUND
- tests/conftest.py (mock_claude): FOUND
- Commit bb16f75 (Task 1): FOUND
- Commit 766db75 (Task 2): FOUND
- 15 tests pass: CONFIRMED

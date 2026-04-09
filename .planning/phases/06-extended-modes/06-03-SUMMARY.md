---
phase: 06-extended-modes
plan: "03"
subsystem: backend
tags: [google-oauth, calendar, auth, google-api]
dependency_graph:
  requires: [06-01]
  provides: [CAL-03, CAL-06]
  affects: [backend/routers/auth.py, backend/routers/chat.py, backend/main.py]
tech_stack:
  added: [google-auth-oauthlib, google-api-python-client, google-oauth2-credentials]
  patterns: [asyncio.to_thread-for-sync-google-api, Flow.from_client_config-oauth2, mongodb-settings-upsert]
key_files:
  created: [backend/routers/auth.py]
  modified: [backend/routers/chat.py, backend/main.py, tests/conftest.py]
decisions:
  - "_fetch_calendar signature uses only db arg (not http_client+settings) to match test contract"
  - "_create_calendar_event added beyond plan scope to satisfy existing test_calendar.py RED scaffolds"
  - "conftest mock_mongo extended with AsyncMock for settings.update_one to support auth callback tests"
  - "asyncio.to_thread wraps both _build_calendar_service and _list_events/_insert_event for full async safety"
metrics:
  duration: 8
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_changed: 4
---

# Phase 06 Plan 03: Google Calendar OAuth2 and Backend Calendar Fetch Summary

**One-liner:** Google OAuth2 web server flow with refresh token storage + Calendar read/create helpers fully wrapped in asyncio.to_thread.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create auth.py with Google OAuth2 routes and register in main.py | d17e22f | backend/routers/auth.py, backend/main.py, tests/conftest.py |
| 2 | Add _build_calendar_service and _fetch_calendar to chat.py | 4fb652b | backend/routers/chat.py |

## What Was Built

### Task 1: Google OAuth2 Auth Routes

Created `backend/routers/auth.py` with:
- `GET /api/auth/google` — redirects to Google consent screen using `Flow.from_client_config` with `access_type="offline"` and `prompt="consent"` to guarantee refresh token
- `GET /api/auth/google/callback` — exchanges code for credentials, stores refresh token in `db["settings"]` via upsert
- `_build_flow()` helper building `Flow` from `settings.GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`
- Registered `auth_router_module` in `backend/main.py` before the static file mount

### Task 2: Calendar Fetch and Create Helpers

Added to `backend/routers/chat.py`:
- `_build_calendar_service(refresh_token)` — sync function creating `Credentials`, refreshing via `GoogleAuthRequest`, building `googleapiclient.discovery.build("calendar", "v3", cache_discovery=False)`
- `_fetch_calendar(db)` — async: retrieves refresh token from MongoDB, wraps service build + `events().list()` in `asyncio.to_thread`, returns shaped `{events, week_start}` or `{error: "calendar_not_authorized", events: []}`
- `_create_calendar_event(db, title, start, end)` — async: creates event via `events().insert()`, persists to MongoDB `events` collection, returns `{id, title, start, end}`
- Calendar dispatch in `chat()`: detects JSON query string for create vs empty query for read
- SYSTEM_PROMPT extended with calendar trigger rules in Russian and English with JSON query format

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] conftest mock_mongo missing AsyncMock for settings.update_one**
- **Found during:** Task 1 verification
- **Issue:** `db["settings"].update_one` was a regular `MagicMock` in conftest — `await db["settings"].update_one(...)` in auth callback raised `TypeError: 'MagicMock' object can't be awaited`
- **Fix:** Added `db["settings"].update_one = AsyncMock(return_value=MagicMock(modified_count=1))` to `mock_mongo` fixture in `tests/conftest.py`
- **Files modified:** tests/conftest.py
- **Commit:** d17e22f

**2. [Rule 2 - Missing functionality] _create_calendar_event not in plan but required by existing tests**
- **Found during:** Task 2 — `test_calendar.py` RED scaffolds included `test_create_calendar_event` and `test_calendar_event_saved_to_mongo` tests referencing `_create_calendar_event`
- **Fix:** Implemented `_create_calendar_event(db, title, start, end)` that creates a Google Calendar event via `asyncio.to_thread` and persists to MongoDB `events` collection
- **Files modified:** backend/routers/chat.py
- **Commit:** 4fb652b

**3. [Rule 1 - Signature mismatch] _fetch_calendar signature reduced to (db) only**
- **Found during:** Task 2 — plan specified `_fetch_calendar(http_client, settings, db)` but tests call `_fetch_calendar(mock_db)` with one arg
- **Fix:** Implemented with signature `async def _fetch_calendar(db)` matching test contract; settings accessed from module-level import
- **Files modified:** backend/routers/chat.py
- **Commit:** 4fb652b

## Verification

- `pytest tests/test_auth.py` — 2 passed
- `pytest tests/test_calendar.py` — 4 passed
- `pytest tests/ --ignore=tests/test_briefing.py` — 34 passed
- `test_briefing.py` failure is pre-existing RED scaffold (imports `_fetch_briefing` from future plan 06-04)

## Self-Check: PASSED

- backend/routers/auth.py: FOUND
- backend/routers/chat.py contains _fetch_calendar: FOUND
- backend/routers/chat.py contains _build_calendar_service: FOUND
- backend/routers/chat.py contains _create_calendar_event: FOUND
- backend/main.py contains auth_router_module: FOUND
- Commits d17e22f and 4fb652b: FOUND

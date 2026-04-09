---
phase: 06-extended-modes
plan: "01"
subsystem: backend/tests
tags: [google-auth, testing, tdd, scaffold]
dependency_graph:
  requires: []
  provides: [google-packages-installed, oauth-config-fields, test-scaffolds-search, test-scaffolds-calendar, test-scaffolds-auth, test-scaffolds-briefing]
  affects: [06-02-search, 06-03-calendar, 06-04-auth, 06-05-briefing]
tech_stack:
  added: [google-api-python-client==2.194.0, google-auth==2.49.1, google-auth-oauthlib==1.3.1, google-auth-httplib2==0.2.0]
  patterns: [tdd-red-scaffold, asyncmock-isolation, import-inside-test-body]
key_files:
  created: [tests/test_search.py, tests/test_calendar.py, tests/test_auth.py, tests/test_briefing.py]
  modified: [backend/requirements.txt, backend/config.py]
decisions:
  - "Import _fetch_search/_fetch_calendar etc inside test function body (not module level) so test files are valid Python even before functions exist — consistent with test_weather.py pattern"
  - "google-auth-oauthlib required at test collection time for test_auth.py; package already installed as part of Task 1"
metrics:
  duration_minutes: 8
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_changed: 6
---

# Phase 06 Plan 01: Wave 0 Foundation — Google Packages and Test Scaffolds Summary

**One-liner:** Google Calendar OAuth packages installed with three config fields, plus 11 RED test stubs across search/calendar/auth/briefing covering all Phase 06 backend contracts.

## What Was Built

### Task 1: Google packages and OAuth config
- Appended 4 Google packages to `backend/requirements.txt`: `google-api-python-client==2.194.0`, `google-auth==2.49.1`, `google-auth-oauthlib==1.3.1`, `google-auth-httplib2==0.2.0`
- Extended `Settings` class in `backend/config.py` with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` — all default to empty string, safe for existing deployment
- Installed packages in `.venv` — all installed successfully

### Task 2: RED test scaffolds (TDD Wave 0)
- `tests/test_search.py` — 3 tests: shaped payload, empty results, chat dispatch integration
- `tests/test_calendar.py` — 4 tests: week events, not-authorized error, create event, Mongo persistence
- `tests/test_auth.py` — 2 tests: OAuth redirect to Google, callback stores refresh token
- `tests/test_briefing.py` — 2 tests: shaped payload (weather+events+summary+quote), chat dispatch

All 11 new tests collected by pytest. All 11 fail RED with `ImportError` (functions don't exist yet) or `404` (routes don't exist yet). This is the expected state for Wave 0 scaffolding.

Existing 14 tests (test_chat.py, test_weather.py, test_prayer.py) remain GREEN.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

- [x] `backend/requirements.txt` contains all 4 Google packages
- [x] `backend/config.py` contains `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- [x] `.venv/bin/pip show google-api-python-client` exits 0, version 2.194.0
- [x] 4 test files created with 11 test functions total
- [x] `pytest --co` collects all 11 tests without syntax errors
- [x] 14 existing tests pass unbroken
- [x] Task 1 commit: `a0d0d6c`
- [x] Task 2 commit: `0d673f6`

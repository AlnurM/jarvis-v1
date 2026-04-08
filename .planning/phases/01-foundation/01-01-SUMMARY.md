---
phase: 01-foundation
plan: 01
subsystem: backend
tags: [fastapi, mongodb, pydantic-settings, pymongo-async, config, health-check]
dependency_graph:
  requires: []
  provides: [backend-scaffold, mongodb-connection, health-endpoint, pydantic-config]
  affects: [01-02, 01-03, 01-04]
tech_stack:
  added: [fastapi==0.135.3, uvicorn==0.44.0, pydantic-settings==2.13.1, pymongo[srv]==4.16.0, httpx]
  patterns: [asynccontextmanager-lifespan, pydantic-settings-config, async-mongodb-stateless-init]
key_files:
  created:
    - backend/main.py
    - backend/config.py
    - backend/db.py
    - backend/requirements.txt
    - .env.example
    - .gitignore
    - static/.gitkeep
    - tests/__init__.py
    - tests/conftest.py
    - tests/test_main.py
    - tests/test_db.py
    - tests/test_config.py
  modified: []
decisions:
  - "Use AsyncMongoClient (pymongo 4.16) not Motor — Motor EOL May 2026"
  - "StaticFiles mount at '/' is the last registration in main.py — prevents API route swallowing"
  - "AsyncMongoClient initialized only inside lifespan context manager — not at module level"
  - "httpx.AsyncClient initialized in lifespan and stored on app.state for reuse across routes"
metrics:
  duration_minutes: 15
  completed: "2026-04-08"
  tasks_completed: 2
  files_created: 12
---

# Phase 1 Plan 1: FastAPI Backend Scaffold Summary

FastAPI backend foundation with pydantic-settings config, PyMongo Async (AsyncMongoClient) lifespan connection, /api/health endpoint, and StaticFiles mount — with 10 passing TDD tests.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Backend project structure and config | 4b3c54c | backend/requirements.txt, backend/config.py, .env.example, .gitignore, tests/__init__.py, tests/test_config.py |
| 2 | FastAPI app, MongoDB lifespan, health endpoint | 1073ede | backend/main.py, backend/db.py, static/.gitkeep, tests/conftest.py, tests/test_main.py, tests/test_db.py |

## What Was Built

### backend/main.py
FastAPI application with asynccontextmanager lifespan that:
- Creates AsyncMongoClient (PyMongo Async, not Motor) from settings.MONGO_URL
- Stores mongo, db, and http_client on app.state for route access
- Touches all 3 collections (conversations, events, settings) on startup to verify connection
- Exposes GET /api/health endpoint that returns `{"status": "ok", "mongo": "connected"}` or error dict (never 500)
- Mounts StaticFiles at "/" as the very last line — prevents swallowing API routes

### backend/config.py
pydantic-settings Settings class loading all env vars from environment / .env file:
- MONGO_URL (required, no default — raises ValidationError if missing)
- MONGODB_DB (default: "jarvis"), PORT (default: 8080)
- CLAUDE_API_KEY, OPENWEATHER_API_KEY, BRAVE_SEARCH_API_KEY (optional, empty string defaults)
- LATITUDE=43.2220, LONGITUDE=76.8512 (Almaty, Kazakhstan)

### backend/db.py
get_db(request) helper to extract app.state.db for use as a FastAPI dependency in routes.

### Test Suite (10 tests, all passing)
- test_config.py: 4 tests validating pydantic-settings behavior (missing MONGO_URL, defaults)
- test_main.py: 3 tests covering /api/health happy path, JSON content-type guard, and error path
- test_db.py: 3 tests covering get_db helper, mongo connection confirmation, collection initialization

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed httpx.AsyncClient mock missing async aclose()**
- **Found during:** Task 2 test execution teardown
- **Issue:** `patch("main.httpx.AsyncClient")` returned plain MagicMock but lifespan calls `await app.state.http_client.aclose()` on shutdown. MagicMock is not awaitable, causing TypeError on TestClient teardown.
- **Fix:** Changed conftest.py to create `mock_http_client = MagicMock()` with `mock_http_client.aclose = AsyncMock(return_value=None)` and passed it as the return value of the httpx.AsyncClient patch.
- **Files modified:** tests/conftest.py
- **Commit:** 1073ede (included in Task 2 commit)

## Success Criteria Verification

- [x] pytest tests/ -x -q exits 0 with all 10 tests passing
- [x] backend/main.py contains no Motor imports (grep confirmed empty)
- [x] No hardcoded connection strings in backend/ (grep confirmed clean)
- [x] StaticFiles mount is the last line in main.py (line 39 of 39)
- [x] .env.example exists and documents all env vars
- [x] .gitignore contains ".env" entry

## Known Stubs

None — plan goal fully achieved. The backend scaffold is complete with all real implementations wired up. The `static/` directory holds only a `.gitkeep` placeholder intentionally — the frontend Vite build will populate it in plan 01-02.

## Self-Check: PASSED

Files created:
- backend/main.py: FOUND
- backend/config.py: FOUND
- backend/db.py: FOUND
- backend/requirements.txt: FOUND
- .env.example: FOUND
- .gitignore: FOUND
- static/.gitkeep: FOUND
- tests/conftest.py: FOUND
- tests/test_main.py: FOUND
- tests/test_db.py: FOUND

Commits:
- 4b3c54c: FOUND (feat(01-01): backend project structure and config)
- 1073ede: FOUND (feat(01-01): FastAPI app, MongoDB lifespan, health endpoint, and tests)

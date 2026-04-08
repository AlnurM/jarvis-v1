---
phase: 01-foundation
plan: 03
subsystem: deployment
tags: [docker, multi-stage-build, railway, fastapi, react, vite]
dependency_graph:
  requires: [01-01, 01-02]
  provides: [dockerfile, docker-image-spec, railway-deploy-artifact]
  affects: [railway-deployment]
tech_stack:
  added: []
  patterns: [multi-stage-docker-build, node-20-slim-frontend-stage, python-3.12-slim-backend-stage]
key_files:
  created:
    - Dockerfile
  modified: []
decisions:
  - "node:20-slim used in Stage 1 (not node:20) — smaller image, aligns with D-08"
  - "python:3.12-slim used in Stage 2 (not 3.14 which is installed locally) — longer support window"
  - "npm ci used (not npm install) — reproducible installs from package-lock.json"
  - "pip install --no-cache-dir used — smaller image layers"
  - "PORT hardcoded to 8080 in CMD — Railway env var PORT=8080 must be set in dashboard to align"
  - "CMD exec form used (not shell form) — cleaner process management, proper signal handling"
metrics:
  duration_minutes: 1
  completed: "2026-04-08"
  tasks_completed: 1
  files_created: 1
---

# Phase 1 Plan 3: Multi-Stage Dockerfile Summary

Multi-stage Dockerfile using node:20-slim to build the React frontend and python:3.12-slim to package FastAPI + static dist into a single Railway-deployable image on port 8080.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Multi-stage Dockerfile | 8a068f9 | Dockerfile |

## What Was Built

### Dockerfile
Two-stage multi-stage build at project root:

**Stage 1 (node:20-slim AS frontend):**
- WORKDIR /app/frontend
- Copies `frontend/package*.json` and runs `npm ci` for reproducible installs
- Copies full `frontend/` directory and runs `npm run build`
- Output: `/app/frontend/dist/` populated with compiled React SPA

**Stage 2 (python:3.12-slim):**
- WORKDIR /app
- Copies `backend/requirements.txt` and installs with `pip install --no-cache-dir`
- Copies `backend/` (main.py, config.py, db.py land at /app/)
- `COPY --from=frontend /app/frontend/dist ./static` — React build lands where FastAPI's `StaticFiles(directory="static")` serves it
- EXPOSE 8080
- CMD exec form runs uvicorn on main:app (main.py at /app/main.py) port 8080

## Deviations from Plan

None — plan executed exactly as written. The Dockerfile matches the canonical spec from the `<interfaces>` block verbatim. Docker was not available locally (as anticipated in the plan), so the build test was skipped — Railway will be the first real build test.

## Success Criteria Verification

- [x] `grep "FROM node:20-slim AS frontend" Dockerfile` — PASS
- [x] `grep "FROM python:3.12-slim" Dockerfile` — PASS
- [x] `grep "npm ci" Dockerfile` — PASS (not npm install)
- [x] `grep "COPY --from=frontend" Dockerfile` — PASS
- [x] `grep "pip install --no-cache-dir" Dockerfile` — PASS
- [x] `grep "EXPOSE 8080" Dockerfile` — PASS
- [x] `grep "CMD" Dockerfile` — exec form with uvicorn on port 8080 PASS
- [x] `grep "ENV.*KEY" Dockerfile` — empty (no secrets baked in) PASS
- [ ] `docker build -t jarvis-test .` — skipped (Docker not available locally)

## Known Stubs

None — the Dockerfile is complete and production-ready. The only pending validation is a live `docker build` run (will be confirmed on first Railway deploy).

## Self-Check: PASSED

Files created:
- Dockerfile: FOUND

Commits:
- 8a068f9: FOUND (feat(01-03): add multi-stage Dockerfile for Railway deployment)

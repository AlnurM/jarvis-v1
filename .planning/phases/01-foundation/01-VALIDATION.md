---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (greenfield — Wave 0 installs) |
| **Config file** | none — Wave 0 creates |
| **Quick run command** | `pytest tests/ -x -q` |
| **Full suite command** | `pytest tests/ -v` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pytest tests/ -x -q`
- **After every plan wave:** Run `pytest tests/ -v`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | 01 | 0 | API-01 | smoke | `curl -s http://localhost:8080/ \| grep -q "JARVIS"` | ❌ W0 | ⬜ pending |
| TBD | 01 | 0 | API-02 | unit | `pytest tests/test_main.py::test_api_routes_not_swallowed -x` | ❌ W0 | ⬜ pending |
| TBD | 01 | 0 | DB-01 | unit | `pytest tests/test_db.py::test_mongo_connection -x` | ❌ W0 | ⬜ pending |
| TBD | 01 | 0 | DB-03 | unit | `pytest tests/test_db.py::test_collections_initialized -x` | ❌ W0 | ⬜ pending |
| TBD | 01 | 0 | DEPLOY-04 | lint | `grep -r "MONGO_URL\s*=\s*['\"]mongo" . --include="*.py"` (should be empty) | ❌ W0 | ⬜ pending |
| TBD | 01 | 0 | PWA-01 | smoke | `curl -s http://localhost:8080/manifest.webmanifest \| python3 -m json.tool` | ❌ W0 | ⬜ pending |
| TBD | 01 | 0 | PWA-02 | smoke | `curl -s http://localhost:8080/ \| grep "apple-mobile-web-app-capable"` | ❌ W0 | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `tests/__init__.py` — package init
- [ ] `tests/conftest.py` — pytest fixtures (TestClient, mock MongoDB)
- [ ] `tests/test_main.py` — health endpoint + static file serving tests
- [ ] `tests/test_db.py` — MongoDB connection + collection init tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No scrollbars, no browser UI | PWA-03 | Visual inspection on iPad | Open app on iPad, verify no scrollbars, no address bar |
| Landscape optimized layout | PWA-04 | Real device required | Open app on iPad in landscape, verify layout fills screen |
| Railway deployment works | DEPLOY-01, DEPLOY-02, DEPLOY-03 | Requires Railway deploy | Push to main, verify Railway builds, access URL |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

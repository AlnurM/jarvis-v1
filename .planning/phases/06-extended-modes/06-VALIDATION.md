---
phase: 6
slug: extended-modes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.3.5 |
| **Config file** | `pytest.ini` (project root) |
| **Quick run command** | `python3 -m pytest tests/ -x -q` |
| **Full suite command** | `python3 -m pytest tests/ -v` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `python3 -m pytest tests/ -x -q`
- **After every plan wave:** Run `python3 -m pytest tests/ -v`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-xx-01 | 01 | 0 | SRCH-04 | unit | `pytest tests/test_search.py -x -q` | W0 | pending |
| 06-xx-02 | 01 | 0 | SRCH-05 | integration | `pytest tests/test_search.py -x -q` | W0 | pending |
| 06-xx-03 | xx | x | CAL-03 | unit | `pytest tests/test_calendar.py -x -q` | W0 | pending |
| 06-xx-04 | xx | x | CAL-04 | unit | `pytest tests/test_calendar.py -x -q` | W0 | pending |
| 06-xx-05 | xx | x | CAL-05 | integration | `pytest tests/test_calendar.py -x -q` | W0 | pending |
| 06-xx-06 | xx | x | CAL-06 | integration | `pytest tests/test_auth.py -x -q` | W0 | pending |
| 06-xx-07 | xx | x | BRIEF-01 | unit | `pytest tests/test_briefing.py -x -q` | W0 | pending |
| 06-xx-08 | xx | x | BRIEF-05 | integration | `pytest tests/test_briefing.py -x -q` | W0 | pending |
| 06-xx-xx | xx | x | SRCH-01/02/03 | manual | iPad device test | N/A | pending |
| 06-xx-xx | xx | x | CAL-01/02/07 | manual | iPad device test | N/A | pending |
| 06-xx-xx | xx | x | BRIEF-02/03/04 | manual | iPad device test | N/A | pending |

---

## Wave 0 Requirements

- [ ] `tests/test_search.py` — stubs for SRCH-04, SRCH-05
- [ ] `tests/test_calendar.py` — stubs for CAL-03, CAL-04, CAL-05
- [ ] `tests/test_auth.py` — stubs for CAL-06 OAuth routes
- [ ] `tests/test_briefing.py` — stubs for BRIEF-01, BRIEF-05
- [ ] Google packages installed: `google-api-python-client google-auth google-auth-oauthlib google-auth-httplib2`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Search cards animate from bottom | SRCH-01/02/03 | Browser animation | Ask factual question, verify 3 cards appear with staggered animation |
| Calendar week view displays | CAL-01/02 | Browser layout | Say "what's on my calendar" — verify week view + event cards |
| Voice-to-event creation | CAL-04/07 | Claude + Calendar API E2E | Say "add dentist Thursday 3pm" — verify event created in Google Calendar |
| Briefing split layout | BRIEF-01/02/03 | Browser layout | Say "morning briefing" — verify weather right, events left, quote bottom |
| Auto-trigger at 7 AM | BRIEF-04 | Time-dependent behavior | Set device time to 7:00 AM, verify briefing prompt appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

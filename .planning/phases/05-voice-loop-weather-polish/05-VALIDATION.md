---
phase: 5
slug: voice-loop-weather-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.3.5 + pytest-asyncio 0.24.0 |
| **Config file** | `pytest.ini` (project root) |
| **Quick run command** | `cd /Users/alikeforalike/Documents/Dev/jarvis-v1 && python -m pytest tests/test_weather.py -x -q` |
| **Full suite command** | `cd /Users/alikeforalike/Documents/Dev/jarvis-v1 && python -m pytest tests/ -x -q` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `python -m pytest tests/test_weather.py -x -q`
- **After every plan wave:** Run `python -m pytest tests/ -x -q`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 0 | WEATH-06 | unit | `pytest tests/test_weather.py::test_fetch_weather_returns_shaped_payload -x -q` | ✅ (extend) | ⬜ pending |
| 05-01-02 | 01 | 0 | WEATH-07 | unit | `pytest tests/test_weather.py::test_fetch_weather_default_city -x -q` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 0 | WEATH-08 | unit | `pytest tests/test_weather.py::test_fetch_weather_with_city -x -q` | ❌ W0 | ⬜ pending |
| 05-01-04 | 01 | 0 | WEATH-08 | unit | `pytest tests/test_weather.py::test_fetch_weather_geocoding_failure -x -q` | ❌ W0 | ⬜ pending |
| 05-xx-xx | xx | x | LOOP-02 | manual | iPad device test | N/A | ⬜ pending |
| 05-xx-xx | xx | x | LOOP-03 | manual | iPad device test | N/A | ⬜ pending |
| 05-xx-xx | xx | x | LOOP-04 | manual | iPad device test | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_weather.py::test_fetch_weather_default_city` — stubs for WEATH-07
- [ ] `tests/test_weather.py::test_fetch_weather_with_city` — stubs for WEATH-08
- [ ] `tests/test_weather.py::test_fetch_weather_geocoding_failure` — stubs for WEATH-08 fallback
- [ ] `tests/test_weather.py::test_fetch_weather_returns_shaped_payload` — extend to assert humidity, wind_speed, wind_deg, visibility, uv_index fields (WEATH-06)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Background listening on content screen | LOOP-02 | Browser FSM + iPad Safari PWA | 1. Ask "покажи погоду" 2. After TTS ends, verify WeatherMode stays 3. FloatingMic pulses blue 4. Speak again — verify response without screen change |
| Direct content-to-content transition | LOOP-03 | Browser FSM animation | 1. On WeatherMode say "а намаз?" 2. Verify PrayerMode appears directly 3. No intermediate ListeningMode flash |
| Dismiss to idle orb | LOOP-04 | Browser FSM + Claude intent | 1. On any content screen say "домой" 2. Verify idle orb appears 3. No auto-timeout |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

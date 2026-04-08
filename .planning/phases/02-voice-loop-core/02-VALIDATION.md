---
phase: 2
slug: voice-loop-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + pytest-asyncio (Wave 0 installs) |
| **Config file** | pytest.ini (Wave 0 creates) |
| **Quick run command** | `pytest tests/ -x -q` |
| **Full suite command** | `pytest tests/ -v` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pytest tests/ -x -q`
- **After every plan wave:** Run `pytest tests/ -v`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | VOICE-03 | integration | `pytest tests/test_transcribe.py -x` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | CONV-01 | unit | `pytest tests/test_chat.py::test_claude_returns_envelope -x` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | CONV-04 | integration | `pytest tests/test_chat.py::test_conversation_persisted -x` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | CONV-05 | unit | `pytest tests/test_chat.py::test_response_schema -x` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | MODE-03 | unit | `pytest tests/test_chat.py::test_json_fallback -x` | ❌ W0 | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `tests/conftest.py` — fixtures: test MongoDB client, mock Deepgram, mock Claude
- [ ] `tests/test_chat.py` — covers CONV-01, CONV-04, CONV-05, MODE-03
- [ ] `tests/test_transcribe.py` — covers VOICE-03 (mock Deepgram WebSocket)
- [ ] pytest-asyncio installed (backend test deps)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| MediaRecorder sends binary chunks via WebSocket | VOICE-02 | Requires real iPad Safari + microphone | Open app on iPad, tap to speak, verify audio captured |
| Voice polling returns voices within 2s | TTS-04 | SpeechSynthesis not available in Node | Open app on iPad Safari, check console for voice list |
| AnalyserNode waveform data non-zero during recording | LIST-02 | Canvas visual inspection | Open app, speak, verify waveform reacts to voice |
| Subtitle text limited to 2 lines | SPEAK-02 | Visual check | Ask a long question, verify subtitles show max 2 lines |
| Complete voice loop on iPad | All | End-to-end on real device | Tap → speak → see listening → thinking → speaking modes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

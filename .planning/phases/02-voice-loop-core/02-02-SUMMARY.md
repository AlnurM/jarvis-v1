---
phase: 02-voice-loop-core
plan: "02"
subsystem: backend-api
tags: [fastapi, claude, anthropic, deepgram, mongodb, websocket, structured-outputs]
dependency_graph:
  requires: [02-01]
  provides: [POST-api-chat, WS-api-ws-transcribe, claude-integration, conversation-persistence]
  affects: [02-03, 02-04, 02-05, 02-06, 02-07]
tech_stack:
  added: []
  patterns:
    - AsyncAnthropic module-level client (not per-request)
    - Claude output_config.format json_schema for structured outputs (D-17)
    - deque(maxlen=20) for bounded in-memory session history (D-21)
    - MongoDB insert_one for full conversation persistence (D-22)
    - deepgram-sdk 6.x asynccontextmanager + EventType.MESSAGE pattern
    - Nova-3 multilingual without encoding/sample_rate for Safari audio/mp4
key_files:
  created:
    - backend/routers/__init__.py
    - backend/routers/chat.py
    - backend/routers/transcribe.py
  modified:
    - backend/config.py
    - backend/main.py
    - tests/conftest.py
decisions:
  - Use deepgram-sdk 6.x Fern-generated API — client.listen.v1.connect() asynccontextmanager replaces old LiveOptions/asyncwebsocket pattern
  - Set app.state.db directly in http_client fixture — ASGITransport does not trigger lifespan in httpx 0.28.x
  - ListenV1Results isinstance check in on_message callback — sdk 6.x emits mixed types (metadata, utterance-end) on same EventType.MESSAGE
metrics:
  duration_seconds: 600
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_changed: 6
---

# Phase 02 Plan 02: Claude + Deepgram Backend Routes Summary

**One-liner:** POST /api/chat with AsyncAnthropic structured output (json_schema), 20-message history, MongoDB persistence, and WS /api/ws/transcribe with Deepgram Nova-3 multilingual relay.

## What Was Built

Two FastAPI router files that power the voice loop backend. The frontend can now make real API calls.

### Files Created/Modified

- `/Users/alikeforalike/Documents/Dev/jarvis-v1/backend/config.py` — added `DEEPGRAM_API_KEY: str = ""`
- `/Users/alikeforalike/Documents/Dev/jarvis-v1/backend/routers/__init__.py` — empty package marker
- `/Users/alikeforalike/Documents/Dev/jarvis-v1/backend/routers/chat.py` — POST /api/chat: AsyncAnthropic client, RESPONSE_SCHEMA (json_schema), SYSTEM_PROMPT, deque(maxlen=20) session history, MongoDB insert_one persistence, speak-mode fallback on any exception
- `/Users/alikeforalike/Documents/Dev/jarvis-v1/backend/routers/transcribe.py` — WS /api/ws/transcribe: deepgram-sdk 6.x asynccontextmanager, Nova-3 multilingual, EventType.MESSAGE handler, no encoding/sample_rate for Safari audio/mp4
- `/Users/alikeforalike/Documents/Dev/jarvis-v1/backend/main.py` — app.include_router(chat), app.include_router(transcribe) before StaticFiles mount
- `/Users/alikeforalike/Documents/Dev/jarvis-v1/tests/conftest.py` — added `app.state.db = mock_mongo` to http_client fixture so async route tests have db access

### Architecture

```
Browser (Safari PWA)
  │
  ├── POST /api/chat ──► routers/chat.py
  │     ├── AsyncAnthropic.messages.create (output_config json_schema)
  │     ├── deque(maxlen=20) in-memory history per session_id
  │     └── MongoDB conversations.insert_one
  │
  └── WS /api/ws/transcribe ──► routers/transcribe.py
        ├── DeepgramClient.listen.v1.connect() (asynccontextmanager)
        ├── Nova-3 + language="multi" (ru/en auto-detect)
        └── EventType.MESSAGE → send_json to browser
```

### Response Schema

```json
{
  "mode": "speak|weather|prayer|search|calendar|briefing",
  "text": "...",
  "fetch": "none|weather|prayer|search|calendar|briefing",
  "query": "..."
}
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] deepgram-sdk 6.x uses new Fern-generated API — LiveOptions/LiveTranscriptionEvents not available**
- **Found during:** Task 2 (transcribe.py import)
- **Issue:** Plan code used old deepgram SDK (<3.x) API: `from deepgram import DeepgramClient, LiveTranscriptionEvents, LiveOptions` — these do not exist in deepgram-sdk 6.1.1 which uses a Fern-generated SDK with completely different interface
- **Fix:** Rewrote transcribe.py using SDK 6.x API: `dg_client.listen.v1.connect()` as asynccontextmanager, `EventType.MESSAGE` for transcript events, `connection.send_media(bytes)` for audio, `connection.start_listening()` for receive loop, `ListenV1Results` isinstance check to filter non-transcript messages
- **Files modified:** backend/routers/transcribe.py
- **Commit:** b059f6c

**2. [Rule 1 - Bug] ASGITransport does not trigger FastAPI lifespan in httpx 0.28.x — app.state.db not set**
- **Found during:** Task 2 test run (test_claude_returns_envelope)
- **Issue:** Tests using `AsyncClient(transport=ASGITransport(app=app))` raised `AttributeError: 'State' object has no attribute 'db'` because lifespan startup never ran, so `app.state.db` was never assigned. In httpx 0.28.x, `ASGITransport` does not dispatch lifespan events.
- **Fix:** Added `app.state.db = mock_mongo` directly in the `http_client` fixture before yielding — same approach used by the existing sync `client` fixture
- **Files modified:** tests/conftest.py
- **Commit:** b059f6c

## Known Stubs

None — all routes are fully wired. Claude integration uses real AsyncAnthropic client (API key required at runtime). Deepgram relay connects to real Deepgram WebSocket (API key required at runtime). Both work correctly in test with mocks.

## Self-Check: PASSED

- backend/config.py (DEEPGRAM_API_KEY): FOUND
- backend/routers/__init__.py: FOUND
- backend/routers/chat.py (RESPONSE_SCHEMA, output_config, conversations.insert_one, AsyncAnthropic, deque, claude-sonnet-4-6, mode speak fallback): FOUND
- backend/routers/transcribe.py (nova-3, language=multi, no encoding=, no sample_rate=): FOUND
- backend/main.py (include_router chat, include_router transcribe, StaticFiles last): FOUND
- Commit 0c2886a (Task 1): FOUND
- Commit b059f6c (Task 2): FOUND
- 15 tests pass (pytest tests/ -x -q): CONFIRMED

# Phase 2: Voice Loop Core - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 2-Voice Loop Core
**Areas discussed:** STT strategy, Voice FSM, Claude streaming, Canvas waveform
**Mode:** Auto (--auto flag, all recommended defaults selected)

---

## STT Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Deepgram WebSocket relay | Handles Safari audio/mp4, sub-300ms, ru+en native | ✓ |
| Whisper REST API | Documented problems with Safari audio/mp4 output | |
| Web Speech API | Broken in iPadOS standalone PWA mode | |

**User's choice:** [auto] Deepgram WebSocket relay (recommended default)
**Notes:** Research confirmed Deepgram handles Safari's audio/mp4 format correctly. Whisper has known issues with this format.

---

## Voice FSM

| Option | Description | Selected |
|--------|-------------|----------|
| Zustand single-state FSM | One state field, prevents impossible UI combinations | ✓ |
| Boolean flags | isListening, isSpeaking — risk of conflicting states | |
| useReducer | More ceremony than needed for 4 states | |

**User's choice:** [auto] Zustand single-state FSM (recommended default)
**Notes:** Architecture research strongly recommended single-state approach. Safari's unreliable onend events make boolean flags catastrophically hard to debug.

---

## Claude Streaming

| Option | Description | Selected |
|--------|-------------|----------|
| Two-phase (mode first, then stream text) | Prevents 2+ second buffering delay | ✓ |
| Full JSON buffer then TTS | Simpler but adds noticeable latency | |
| Streaming partial JSON parse | Complex, fragile | |

**User's choice:** [auto] Two-phase approach (recommended default)
**Notes:** Using Claude structured outputs (json_schema) for guaranteed valid JSON. Mode routing resolved before TTS begins.

---

## Canvas Waveform

| Option | Description | Selected |
|--------|-------------|----------|
| Canvas + AnalyserNode (audio-reactive) | Real audio data drives visualization | ✓ |
| Simulated sine wave | Looks nice but disconnected from actual audio | |
| Three.js orb | Heavy dependency for a waveform | |

**User's choice:** [auto] Canvas API with AnalyserNode (recommended default)
**Notes:** Web Audio API AnalyserNode provides real frequency data from MediaRecorder stream. Design.md specifies electric blue #00d4ff for listening, purple #9b59b6 for speaking.

---

## Claude's Discretion

- WebSocket message format details
- Deepgram API configuration (sample rate, encoding, model)
- Canvas waveform rendering algorithm
- Subtitle animation timing
- Conversation session management
- FastAPI router structure

## Deferred Ideas

None — discussion stayed within phase scope

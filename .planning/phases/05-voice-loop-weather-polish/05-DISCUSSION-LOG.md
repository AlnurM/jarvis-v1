# Phase 5: Voice Loop & Weather Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 05-voice-loop-weather-polish
**Areas discussed:** FloatingMic visual states, City extraction, "Go home" intent, Background transition behavior
**Mode:** --auto (all decisions auto-selected with recommended defaults)

---

## FloatingMic Visual States

| Option | Description | Selected |
|--------|-------------|----------|
| Pulsing glow ring | Blue glow ring for listening, spinner for thinking, purple pulse for speaking | auto |
| Dot indicator | Small pulsing dot, minimal | |
| Full animation | Mini waveform in the mic area | |

**User's choice:** [auto] Pulsing glow ring (recommended default)
**Notes:** User explicitly noted the corner mic already exists in WeatherMode and just needs enhancement. Three visual states cover the full FSM. FloatingMic is tappable to toggle listening.

---

## City Extraction from Voice

| Option | Description | Selected |
|--------|-------------|----------|
| Claude extracts city in query field | Claude puts city name in JSON `query` field, backend geocodes | auto |
| Frontend location picker | User selects city from UI | |
| Always Almaty | No dynamic city support | |

**User's choice:** [auto] Claude extracts city in query field (recommended default)
**Notes:** User explicitly said: default Almaty, never ask which city, but support other cities when specified. The `query` field in the JSON envelope already exists and is perfect for this.

---

## "Go Home" Intent Recognition

| Option | Description | Selected |
|--------|-------------|----------|
| Backend only — Claude returns mode: 'speak' | All dismiss logic in Claude system prompt | auto |
| Frontend keyword detection | Frontend listens for "домой" in transcript | |
| Hybrid | Both backend and frontend | |

**User's choice:** [auto] Backend only — Claude returns mode: 'speak' (recommended default)
**Notes:** Centralized in Claude keeps logic simple. User said content should persist until they explicitly say "домой". No timeout.

---

## Background Transition Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Content stays, FloatingMic shows state | Content screen persists through all voice states, only FloatingMic indicates activity | auto |
| Overlay thinking animation | Show thinking orb as overlay on content | |
| Split screen | Content shrinks, voice UI appears alongside | |

**User's choice:** [auto] Content stays, FloatingMic shows state (recommended default)
**Notes:** Direct content-to-content transitions (weather -> prayer) without intermediate screens. If Claude responds with general text while on content, TTS speaks and content stays. Only "go home" exits to idle orb.

---

## Claude's Discretion

- FloatingMic animation timing and easing details
- UV index data source approach
- Geocoding failure handling
- City name display position on WeatherMode

## Deferred Ideas

None — discussion stayed within phase scope

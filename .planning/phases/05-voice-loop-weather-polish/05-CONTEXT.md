# Phase 5: Voice Loop & Weather Polish - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the voice loop seamless on content screens. After JARVIS shows weather or prayer, the mic keeps listening in the background — the content screen stays visible. User can talk freely ("а намаз?", "а погода в Москве?") and content switches directly without returning to the mic screen. Only an explicit dismiss command ("домой") returns to idle orb. Also: complete the weather stats widgets (wind, humidity, visibility, UV) and support dynamic city weather requests.

</domain>

<decisions>
## Implementation Decisions

### Background Voice Loop on Content Screens
- **D-01:** Content modes = `weather`, `prayer`, `search`, `calendar`, `briefing`. The `chat` mode is NOT content — it uses normal mic screen flow.
- **D-02:** When `state === 'listening'` and mode is a content mode, ModeRouter keeps showing the content screen (not ListeningMode). FloatingMic component indicates listening state.
- **D-03:** When `state === 'thinking'` and mode is a content mode, content screen stays visible. FloatingMic shows spinner/thinking state.
- **D-04:** When `state === 'speaking'` and mode is a content mode, content screen stays visible. TTS plays audio. FloatingMic shows speaking state (pulsing purple).
- **D-05:** After TTS completes on a content screen, auto-listen starts immediately (500ms delay preserved) — screen stays on content, FloatingMic pulses to indicate listening.
- **D-06:** No silence timeout — content screen persists indefinitely until user says "домой" or similar dismiss phrase.

### FloatingMic Component
- **D-07:** Extract the existing mic button from WeatherMode.tsx (lines 385-403) into a shared `FloatingMic.tsx` component.
- **D-08:** Three visual states:
  - **idle:** Static mic icon with blue gradient (existing style from WeatherMode)
  - **listening:** Pulsing blue glow ring animation around the mic
  - **thinking:** Rotating spinner replaces mic icon
  - **speaking:** Pulsing purple glow (matches secondary color)
- **D-09:** FloatingMic is tappable: tap during listening → stop recording + enter thinking. Tap during idle → start listening.
- **D-10:** Position: absolute bottom-right (same as current WeatherMode mic). Used by all content mode components.
- **D-11:** FloatingMic receives voice `state` from Zustand store and renders accordingly.

### ModeRouter Priority Change
- **D-12:** Current priority: `listening > thinking > speaking > idle+mode`. New priority for content modes: content mode screen stays visible regardless of voice state. Only for non-content mode (`chat`), the old priority applies.
- **D-13:** Implementation: check if current `mode` is in CONTENT_MODES set. If yes, render the content mode component (WeatherMode, PrayerMode, etc.) regardless of voice state. If no, use existing FSM-priority logic.
- **D-14:** Direct content-to-content transitions: "покажи погоду" → WeatherMode → user says "а намаз?" → Claude returns mode=prayer → PrayerMode replaces WeatherMode directly. No intermediate ListeningMode/ThinkingMode screen flashes.

### "Go Home" Intent — Backend Only
- **D-15:** Claude recognizes dismiss phrases: "домой", "спасибо", "хватит", "назад", "хорошо", "home", "thanks", "enough", "go back".
- **D-16:** When dismiss intent detected, Claude returns `mode: "speak"` → frontend maps to `chat` → ModeRouter shows idle orb.
- **D-17:** System prompt addition: "When user says домой/спасибо/хватит or similar dismiss intent, return mode='speak' and a brief acknowledgment. Never ask for confirmation."
- **D-18:** No frontend phrase detection — all routing through Claude. This keeps logic centralized.

### App.tsx FSM Changes
- **D-19:** Auto-listen callback in `speak()` must NOT switch to ListeningMode screen when on a content mode. It still calls `setState('listening')` + `startRecording()`, but ModeRouter handles the visual (D-12/D-13).
- **D-20:** `handleTap` behavior on content screens: tap should trigger FloatingMic action (toggle listening), NOT switch to idle orb. The whole-screen tap handler needs to be scoped — taps on content area could still be handled by FloatingMic onClick.

### Weather Data Completion (WEATH-06)
- **D-21:** Backend `_fetch_weather()` extracts additional fields from OWM response: `humidity` (from `main.humidity`), `wind_speed` (from `wind.speed`), `wind_deg` (from `wind.deg`), `visibility` (from `visibility`, convert to km), `uv_index` (requires separate OWM UV endpoint OR use 3.0 One Call if available — researcher to determine best approach).
- **D-22:** Frontend WeatherMode already has the UI widgets and TypeScript interface for these fields — they show '--' when null. Backend just needs to send the data.

### Dynamic City Support (WEATH-07, WEATH-08)
- **D-23:** Default city is Almaty — Claude NEVER asks "какой город?" when user says "покажи погоду" without specifying a city.
- **D-24:** Claude uses the `query` field in JSON envelope to pass city name when user specifies one (e.g., "погода в Москве" → `query: "Москва"`). Empty query = use default Almaty coords.
- **D-25:** Backend receives city name in `query` → calls OWM Geocoding API (`/geo/1.0/direct?q={city}`) to get lat/lon → fetches weather for those coords.
- **D-26:** System prompt update: "For weather requests, set query to the city name if the user specifies one. Leave query empty for default location (Almaty). Never ask the user which city — default to Almaty."
- **D-27:** City name shown in weather mode UI (optional — displayed somewhere on the WeatherMode screen so user knows which city they're seeing).

### Claude's Discretion
- FloatingMic animation timing and easing details
- Exact UV index data source (OWM UV endpoint vs One Call 3.0 vs alternative)
- How to handle geocoding failures (fallback to Almaty with error text)
- Weather city name display position on screen

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `design.md` — Full design system + Stitch screen IDs for all modes
- `CLAUDE.md` §Design Compliance — Mandatory 6-point design verification checklist

### Existing Code (critical for this phase)
- `frontend/src/App.tsx` — FSM orchestration, auto-listen logic (lines 86-95), handleTap (lines 116-138). Core file to modify.
- `frontend/src/components/ModeRouter.tsx` — Mode routing priority logic. Core file to modify.
- `frontend/src/store/assistantStore.ts` — Zustand store with state/mode. May need new helpers.
- `frontend/src/modes/WeatherMode.tsx` — Contains existing mic button (lines 385-403) to extract into FloatingMic. Stats widgets (lines 263-383) with placeholder data.
- `frontend/src/modes/PrayerMode.tsx` — Needs FloatingMic integration.
- `frontend/src/hooks/useVoiceRecorder.ts` — startRecording/stopRecording for FloatingMic.
- `frontend/src/hooks/useVoiceOutput.ts` — speak/stopSpeaking, onComplete callback.
- `backend/routers/chat.py` — _fetch_weather (lines 65-98, missing fields), SYSTEM_PROMPT (line 39-46), RESPONSE_SCHEMA (lines 20-36).
- `backend/config.py` — LATITUDE/LONGITUDE defaults, settings.

### Project Specification
- `.planning/PROJECT.md` — Core value, Almaty coordinates, API constraints
- `.planning/REQUIREMENTS.md` — Phase 5: LOOP-02/03/04, WEATH-06/07/08

### Prior Phase Context
- `.planning/phases/03-information-modes/03-CONTEXT.md` — Original voice loop decisions (D-19 through D-26)
- `.planning/phases/04-design-audit-rebuild/04-CONTEXT.md` — Design rules (D-09 through D-12)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `WeatherMode.tsx` mic button (lines 385-403) — exact design to extract into FloatingMic
- `ModeRouter.tsx` MODE_LABELS map — extend with content mode detection
- `assistantStore.ts` mode type already includes all content modes
- `App.tsx` auto-listen timer pattern — modify, don't rewrite
- `useVoiceRecorder` startRecording/stopRecording — pass to FloatingMic via props or store

### Established Patterns
- Voice FSM: single `AssistantState` enum, no boolean flags
- Mode routing: AnimatePresence with custom easing `[0.22, 1, 0.36, 1]`
- AppShell wraps content modes (Listening, Speaking, Weather, Prayer)
- iOS gesture constraint: startRecording must be called from synchronous event handler

### Integration Points
- `ModeRouter.tsx`: change priority logic — content mode > voice state
- `App.tsx`: modify auto-listen to not change visual on content modes
- `App.tsx`: handleTap needs content-mode-aware behavior (FloatingMic handles taps on content)
- `chat.py _fetch_weather()`: add humidity, wind_speed, wind_deg, visibility, uv_index
- `chat.py _fetch_weather()`: accept optional city param, geocode if provided
- `chat.py SYSTEM_PROMPT`: add city extraction and dismiss intent instructions
- `WeatherMode.tsx`: remove inline mic button, add FloatingMic component
- `PrayerMode.tsx`: add FloatingMic component

### iOS Constraints
- `startRecording()` MUST be called from synchronous gesture handler (AudioContext policy)
- FloatingMic tap handler must respect this constraint — cannot be async-gated
- touchend/click ghost-click guard pattern from App.tsx may need to be applied to FloatingMic

</code_context>

<specifics>
## Specific Ideas

- User explicitly said: "после того как он показал экран — звуковой контакт продолжался на фоне, не переходя на экран микрофона"
- User explicitly said: "оставаться пока не скажу домой" — no timeout, content persists indefinitely
- User noted the corner mic already exists in WeatherMode — "его надо просто доработать"
- Default city Almaty — "я не хочу чтоб он переспрашивал меня в каком городе"
- Dynamic city support — "если я попрошу другой город то пусть вытащет другой город"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-voice-loop-weather-polish*
*Context gathered: 2026-04-09*

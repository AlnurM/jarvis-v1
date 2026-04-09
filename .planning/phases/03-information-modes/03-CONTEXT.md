# Phase 3: Information Modes - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver Weather mode and Prayer Times mode with live data from Almaty, plus auto-listen after response. Backend fetches sub-API data during the /api/chat call when Claude requests it. Frontend renders two new specialized visual modes. After JARVIS finishes speaking, microphone auto-reactivates for continuous conversation.

</domain>

<decisions>
## Implementation Decisions

### Backend Data Fetch Pipeline
- **D-01:** When Claude returns `fetch: "weather"`, chat router calls OpenWeatherMap API before responding to frontend
- **D-02:** When Claude returns `fetch: "prayer"`, chat router calls Aladhan API before responding
- **D-03:** Fetched data included in response JSON as `data` field alongside `mode`, `text`, `fetch`, `query`
- **D-04:** Use existing `app.state.http_client` (httpx AsyncClient, lifespan-scoped) for all external API calls
- **D-05:** OpenWeatherMap One Call API 3.0 — current + 48h hourly, Almaty coords from config (43.2220, 76.8512)
- **D-06:** Aladhan API — `/v1/timingsByCity` with city=Almaty, country=KZ, method=1 (University of Islamic Sciences, Karachi)

### Weather Mode (Visual)
- **D-07:** Large temperature display center screen (current temp in °C)
- **D-08:** Animated weather icon based on condition code (map OpenWeatherMap codes to icons/animations)
- **D-09:** Hourly forecast as horizontal scrollable row at bottom
- **D-10:** Background color subtly shifts based on weather condition (clear=deep blue, cloudy=gray tint, rain=darker)
- **D-11:** Design tokens from design.md — glassmorphism cards for hourly items, Space Grotesk for temperature, Inter for labels
- **D-12:** Stitch screen ID `46d9c2600c1948658c68a31705074ca7` is source of truth for layout

### Prayer Times Mode (Visual)
- **D-13:** Next prayer name displayed large center screen
- **D-14:** Live countdown timer to next prayer (updates every second)
- **D-15:** All 5 daily prayers listed at bottom (Fajr, Dhuhr, Asr, Maghrib, Isha)
- **D-16:** Current/next prayer visually highlighted with primary glow
- **D-17:** Passed prayers dimmed, future prayers in on-surface-variant color
- **D-18:** Stitch screen ID `b9c8cef5cb4b4a9db5931e80797efe16` is source of truth for layout

### Auto-Listen After Response (LOOP-01)
- **D-19:** After TTS finishes (onend callback), wait 500ms then auto-start recording
- **D-20:** FSM transition: speaking → idle → listening (with 500ms delay between idle and listening)
- **D-21:** Visual cue: orb briefly pulses in idle state before waveform appears
- **D-22:** If user taps during the 500ms delay, cancel auto-listen (user takes control)
- **D-23:** Auto-listen only activates after a successful voice response, not after errors

### Mode Transition from Speaking
- **D-24:** When Claude responds with mode=weather or mode=prayer, show Speaking mode first (TTS reads response), then transition to the data mode
- **D-25:** Data mode (Weather/Prayer) persists until user taps to speak again → returns to idle → listening
- **D-26:** Framer Motion (motion/react) animated transition from Speaking → Weather/Prayer mode

### Claude's Discretion
- Weather icon mapping algorithm (condition code → SVG/animation)
- Hourly forecast card count and scroll behavior details
- Prayer times calculation edge cases (midnight crossing, etc.)
- Exact auto-listen delay tuning (500ms is starting point)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `design.md` — Full design system + Stitch screen IDs for Weather (`46d9c2600c1948658c68a31705074ca7`) and Prayer Times (`b9c8cef5cb4b4a9db5931e80797efe16`)
- `CLAUDE.md` §Design Compliance — Mandatory 6-point design verification checklist

### Project Specification
- `task.md` — Weather mode spec (§App Modes #5), Prayer Times mode spec (§App Modes #6)
- `.planning/PROJECT.md` — Core value, Almaty coordinates, API constraints
- `.planning/REQUIREMENTS.md` — Phase 3: WEATH-01–05, PRAY-01–06, LOOP-01

### Research
- `.planning/research/STACK.md` — httpx for API calls, PyMongo Async
- `.planning/research/FEATURES.md` — Weather/Prayer feature complexity notes
- `.planning/research/ARCHITECTURE.md` — Backend fetch pattern (sub-API data in same /api/chat call)

### Existing Code (from Phase 1-2)
- `backend/routers/chat.py` — Chat router to extend with fetch pipeline
- `backend/config.py` — Config with OPENWEATHER_API_KEY, coordinates
- `frontend/src/store/assistantStore.ts` — Zustand store with modeData field
- `frontend/src/components/ModeRouter.tsx` — Mode router to add Weather/Prayer cases
- `frontend/src/App.tsx` — FSM orchestration, auto-listen hooks here
- `frontend/src/hooks/useVoiceOutput.ts` — TTS hook, onend callback for auto-listen
- `frontend/src/hooks/useVoiceRecorder.ts` — startRecording for auto-listen trigger
- `frontend/src/modes/` — Existing modes directory, add WeatherMode.tsx and PrayerMode.tsx

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ModeRouter.tsx` — AnimatePresence router, needs Weather/Prayer cases added
- `assistantStore.ts` — has `modeData` field ready for weather/prayer data
- `chat.py` — has `fetch` and `query` fields in Claude response schema
- `config.py` — has LATITUDE, LONGITUDE, OPENWEATHER_API_KEY fields
- `useVoiceOutput.ts` — has onend callback where auto-listen can be triggered

### Established Patterns
- Mode components: full-screen, dark background, motion/react animations
- API calls: backend proxies everything, frontend never calls external APIs
- Design: glassmorphism, no borders, custom easing, no pure white text

### Integration Points
- `chat.py`: after Claude responds, check `fetch` field → call weather/prayer API → add `data` to response
- `ModeRouter.tsx`: add `weather` and `prayer` mode cases rendering new components
- `App.tsx`: after speaking ends, implement auto-listen with 500ms delay
- New backend routes: none needed (data fetched inside /api/chat)

</code_context>

<specifics>
## Specific Ideas

- Weather should feel like looking out a window — immersive, not a data dashboard
- Prayer times should feel respectful and calm — no flashy animations
- Auto-listen should feel natural — like JARVIS is waiting for your next thought
- Hourly forecast cards should have glassmorphism effect matching design.md
- Temperature in °C with ° symbol, not "degrees" text

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-information-modes*
*Context gathered: 2026-04-09*

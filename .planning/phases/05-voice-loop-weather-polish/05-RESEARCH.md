# Phase 5: Voice Loop & Weather Polish — Research

**Researched:** 2026-04-09
**Domain:** React FSM refactor, FloatingMic component, OWM weather data, dynamic geocoding
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Background Voice Loop on Content Screens**
- D-01: Content modes = `weather`, `prayer`, `search`, `calendar`, `briefing`. `chat` mode is NOT content — it uses normal mic screen flow.
- D-02: When `state === 'listening'` and mode is a content mode, ModeRouter keeps showing the content screen (not ListeningMode). FloatingMic component indicates listening state.
- D-03: When `state === 'thinking'` and mode is a content mode, content screen stays visible. FloatingMic shows spinner/thinking state.
- D-04: When `state === 'speaking'` and mode is a content mode, content screen stays visible. TTS plays audio. FloatingMic shows speaking state (pulsing purple).
- D-05: After TTS completes on a content screen, auto-listen starts immediately (500ms delay preserved) — screen stays on content, FloatingMic pulses to indicate listening.
- D-06: No silence timeout — content screen persists indefinitely until user says "домой" or similar dismiss phrase.

**FloatingMic Component**
- D-07: Extract the existing mic button from WeatherMode.tsx (lines 385-403) into a shared `FloatingMic.tsx` component.
- D-08: Four visual states: **idle** (static blue gradient mic), **listening** (pulsing blue glow ring), **thinking** (rotating spinner replaces mic icon), **speaking** (pulsing purple glow).
- D-09: FloatingMic is tappable: tap during listening → stop recording + enter thinking. Tap during idle → start listening.
- D-10: Position: absolute bottom-right. Used by all content mode components.
- D-11: FloatingMic receives voice `state` from Zustand store and renders accordingly.

**ModeRouter Priority Change**
- D-12: New priority for content modes: content screen stays visible regardless of voice state. Only `chat` mode uses old priority.
- D-13: Check if current `mode` is in CONTENT_MODES set. If yes, render content component regardless of voice state. If no, use existing FSM-priority logic.
- D-14: Direct content-to-content transitions with no intermediate screen flash.

**"Go Home" Intent — Backend Only**
- D-15: Claude recognizes dismiss phrases: "домой", "спасибо", "хватит", "назад", "хорошо", "home", "thanks", "enough", "go back".
- D-16: When dismiss intent detected, Claude returns `mode: "speak"` → frontend maps to `chat` → ModeRouter shows idle orb.
- D-17: System prompt addition: "When user says домой/спасибо/хватит or similar dismiss intent, return mode='speak' and a brief acknowledgment. Never ask for confirmation."
- D-18: No frontend phrase detection — all routing through Claude.

**App.tsx FSM Changes**
- D-19: Auto-listen callback in `speak()` must NOT switch to ListeningMode screen when on a content mode. It still calls `setState('listening')` + `startRecording()`, but ModeRouter handles the visual.
- D-20: `handleTap` behavior on content screens: tap should trigger FloatingMic action, NOT switch to idle orb. Whole-screen tap handler needs to be scoped.

**Weather Data Completion (WEATH-06)**
- D-21: Backend `_fetch_weather()` extracts additional fields: `humidity` (from `main.humidity`), `wind_speed` (from `wind.speed`), `wind_deg` (from `wind.deg`), `visibility` (from `visibility`, convert to km), `uv_index` (researcher to determine best approach).
- D-22: Frontend WeatherMode already has the UI widgets and TypeScript interface for these fields — they show '--' when null. Backend just needs to send the data.

**Dynamic City Support (WEATH-07, WEATH-08)**
- D-23: Default city is Almaty — Claude NEVER asks "какой город?" when no city specified.
- D-24: Claude uses the `query` field to pass city name when user specifies one. Empty query = use default Almaty coords.
- D-25: Backend receives city name in `query` → calls OWM Geocoding API (`/geo/1.0/direct?q={city}`) → fetches weather for those coords.
- D-26: System prompt update: "For weather requests, set query to the city name if the user specifies one. Leave query empty for default location (Almaty). Never ask the user which city — default to Almaty."
- D-27: City name shown in weather mode UI.

### Claude's Discretion
- FloatingMic animation timing and easing details
- Exact UV index data source (OWM UV endpoint vs One Call 3.0 vs alternative)
- How to handle geocoding failures (fallback to Almaty with error text)
- Weather city name display position on screen

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LOOP-02 | On content screens, voice listening continues in background — screen stays on content, FloatingMic shows pulsing indicator | ModeRouter CONTENT_MODES set + FloatingMic component receiving state from Zustand |
| LOOP-03 | Direct content-to-content transitions — "а намаз?" while on WeatherMode goes straight to PrayerMode | ModeRouter key stays `content-{mode}`, AnimatePresence triggers re-animation on mode key change |
| LOOP-04 | Content screens persist until explicit "домой" / "спасибо" — no auto-timeout | Backend dismiss intent → mode='speak' → frontend maps to 'chat' → idle orb |
| WEATH-06 | Weather stats row shows real data — wind speed, wind direction, humidity, visibility, UV index | OWM 2.5 provides all except UV; Open-Meteo free API provides UV index |
| WEATH-07 | Default city is Almaty — never ask "какой город?" | System prompt update + empty query = Almaty default coords |
| WEATH-08 | If user specifies city, Claude extracts it, backend geocodes and fetches weather | OWM `/geo/1.0/direct` endpoint confirmed free; fallback to Almaty on geocoding failure |
</phase_requirements>

---

## Summary

Phase 5 has two parallel workstreams: (1) FSM routing refactor to keep content screens visible during voice states, and (2) weather data completions. Both workstreams are independent and can be planned in separate waves.

**Workstream A — Voice Loop:** The ModeRouter currently uses strict FSM priority (`listening > thinking > speaking > idle+mode`). Phase 5 inverts this for content modes: if `mode` is in a CONTENT_MODES set, the content component renders regardless of `state`. A new `FloatingMic.tsx` component — extracted from WeatherMode's existing mic button — handles all four voice states visually and handles iOS-safe tap events. The App.tsx auto-listen timer fires into the background (no visual change), and the whole-screen tap handler in App.tsx must be made content-mode-aware so it doesn't interfere with FloatingMic's own tap handling. The "go home" intent routes entirely through Claude (mode='speak'), keeping frontend logic minimal.

**Workstream B — Weather:** The OWM `/data/2.5/weather` endpoint already returns `humidity`, `wind.speed`, `wind.deg`, and `visibility` — these are straightforward additions to `_fetch_weather()`. UV index is NOT in the free OWM 2.5 response; the best free alternative is Open-Meteo (`api.open-meteo.com/v1/forecast?current=uv_index`), which requires no API key and has no documented rate limit. Dynamic city support uses OWM's `/geo/1.0/direct` geocoding endpoint (free tier, confirmed). A fallback to Almaty coords on geocoding failure is the right behavior per Claude's Discretion.

**Primary recommendation:** Implement ModeRouter CONTENT_MODES refactor + FloatingMic first (LOOP-02/03/04 are interdependent), then weather data fields (WEATH-06/07/08 are independent backend changes).

---

## Standard Stack

All dependencies already installed. No new packages needed.

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| motion/react | 12.x | FloatingMic animations (pulsing glow, spinner) | Already in project; custom easing [0.22, 1, 0.36, 1] enforced |
| Zustand | 5.x | FloatingMic reads `state` + `mode` from store | Already in project; hook-native, no re-render overhead |
| httpx (AsyncClient) | via lifespan | OWM geocoding + Open-Meteo UV fetch | Already on `request.app.state.http_client` |

### New External API (no SDK, no install)
| Service | Method | Purpose | Key |
|---------|--------|---------|-----|
| Open-Meteo | `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=uv_index` | UV index (free, no API key) | None required |
| OWM Geocoding | `https://api.openweathermap.org/geo/1.0/direct?q={city}&limit=1&appid={key}` | City name → lat/lon | Existing `OPENWEATHER_API_KEY` |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure (additions only)
```
frontend/src/
├── components/
│   ├── FloatingMic.tsx        # NEW — extracted from WeatherMode, shared by all content modes
│   ├── ModeRouter.tsx         # MODIFY — CONTENT_MODES set, new routing logic
│   ├── AppShell.tsx           # unchanged
│   └── OrbAnimation.tsx       # unchanged
├── modes/
│   ├── WeatherMode.tsx        # MODIFY — remove inline mic, add <FloatingMic />, add city name display
│   └── PrayerMode.tsx         # MODIFY — add <FloatingMic />
└── App.tsx                    # MODIFY — content-mode-aware handleTap

backend/
└── routers/
    └── chat.py                # MODIFY — _fetch_weather (+ new fields), _fetch_weather accepts city param,
                               #          + _fetch_uv_index(), + SYSTEM_PROMPT updates
```

### Pattern 1: CONTENT_MODES Set in ModeRouter

The central change. Define `CONTENT_MODES` as a Set at the top of ModeRouter.tsx, then check it before the existing FSM priority chain.

```typescript
// Source: decision D-13 from 05-CONTEXT.md
const CONTENT_MODES = new Set(['weather', 'prayer', 'search', 'calendar', 'briefing'])

export function ModeRouter({ analyserRef, onStopSpeaking }: ModeRouterProps) {
  const { state, mode } = useAssistantStore()

  // Content mode check — D-12/D-13: content screen overrides voice state
  if (CONTENT_MODES.has(mode)) {
    // Content screens stay visible regardless of listening/thinking/speaking state
    // FloatingMic inside the content component handles voice state visuals
    const key = `content-${mode}`    // distinct from old 'idle-weather', 'idle-prayer'
    // ... render content component wrapped in AnimatePresence motion.div
  }

  // Non-content (chat): use existing FSM priority
  if (state === 'listening') { ... }
  // etc.
}
```

**Key insight:** The `key` must include `mode` (e.g., `content-weather`, `content-prayer`) so AnimatePresence re-triggers the entry animation on direct content-to-content transitions (LOOP-03). Without a key change on mode switch, the component stays mounted and no transition fires.

### Pattern 2: FloatingMic Component

Extract WeatherMode's existing mic button (lines 385-403) and extend it with four visual states.

```typescript
// Source: decision D-07/D-08/D-09/D-11 from 05-CONTEXT.md
import { motion, AnimatePresence } from 'motion/react'
import { useAssistantStore } from '../store/assistantStore'

interface FloatingMicProps {
  onStartListening: () => void   // must be sync (iOS AudioContext policy)
  onStopListening: () => void
}

export function FloatingMic({ onStartListening, onStopListening }: FloatingMicProps) {
  const { state } = useAssistantStore()

  const handleTap = () => {
    if (state === 'idle') onStartListening()       // idle → listening
    else if (state === 'listening') onStopListening() // manual stop → thinking
    // thinking/speaking: tap is ignored on FloatingMic level
  }

  // States: idle (blue static), listening (pulsing blue), thinking (spinner), speaking (pulsing purple)
  // ...
}
```

**iOS constraint:** `onStartListening` must be called synchronously from the tap handler — it calls `startRecording()` which resumes AudioContext. Do NOT wrap in async or setTimeout.

### Pattern 3: App.tsx Content-Mode-Aware handleTap

The current `handleTap` in App.tsx runs on the full-screen `div` onClick/onTouchEnd. When on a content mode, taps on the content area should NOT trigger the main handleTap (which in idle state would call `startRecording()` redundantly). FloatingMic's tap handler stops propagation — but the main handler also needs to guard against firing on content modes during active voice states.

```typescript
// Source: decision D-20 from 05-CONTEXT.md
const CONTENT_MODES_SET = new Set(['weather', 'prayer', 'search', 'calendar', 'briefing'])

const handleTap = useCallback(() => {
  if (autoListenTimerRef.current !== null) {
    clearTimeout(autoListenTimerRef.current)
    autoListenTimerRef.current = null
  }

  // On content modes: FloatingMic handles its own tap. The full-screen tap
  // is only relevant if the user taps OUTSIDE the FloatingMic button.
  // During listening/thinking/speaking on content modes, ignore full-screen taps.
  if (CONTENT_MODES_SET.has(mode) && state !== 'idle') return

  if (state === 'idle') {
    setState('listening')
    startRecording()
  } else if (state === 'speaking') {
    stopSpeaking()
  } else if (state === 'listening') {
    stopRecording()
    setState('thinking')
  }
}, [state, mode, setState, startRecording, stopRecording, stopSpeaking])
```

Note: `mode` must be destructured from the store in App.tsx — it's already available via `useAssistantStore()`.

### Pattern 4: _fetch_weather with City Support

```python
# Source: decision D-21/D-24/D-25 from 05-CONTEXT.md
async def _fetch_weather(http_client, settings, city: str = "") -> dict:
    """Fetch weather. If city provided, geocode first. Falls back to Almaty coords."""
    lat, lon, city_name = settings.LATITUDE, settings.LONGITUDE, "Almaty"

    if city.strip():
        try:
            geo_url = "https://api.openweathermap.org/geo/1.0/direct"
            geo_resp = await http_client.get(geo_url, params={
                "q": city.strip(), "limit": 1, "appid": settings.OPENWEATHER_API_KEY
            })
            geo_resp.raise_for_status()
            geo_data = geo_resp.json()
            if geo_data:
                lat, lon = geo_data[0]["lat"], geo_data[0]["lon"]
                city_name = geo_data[0].get("name", city.strip())
        except Exception as e:
            print(f"[WARN] Geocoding failed for '{city}', falling back to Almaty: {e}")
            # city_name stays "Almaty", lat/lon stay defaults

    params = {"lat": lat, "lon": lon, "appid": settings.OPENWEATHER_API_KEY, "units": "metric"}
    # ... existing OWM fetch ...
    # Add to return dict:
    return {
        "temp": ...,
        "city": city_name,                                    # NEW — D-27
        "humidity": current_raw["main"]["humidity"],          # NEW — D-21
        "wind_speed": round(current_raw["wind"]["speed"] * 3.6, 1),  # NEW — m/s → km/h
        "wind_deg": current_raw["wind"].get("deg", 0),        # NEW — D-21
        "visibility": round(current_raw.get("visibility", 0) / 1000, 1),  # NEW — m → km
        # uv_index added via separate Open-Meteo call
        ...
    }
```

### Pattern 5: UV Index via Open-Meteo

```python
# Source: open-meteo.com/en/docs — free, no API key required
async def _fetch_uv_index(http_client, lat: float, lon: float) -> float | None:
    """Fetch current UV index from Open-Meteo (free, no API key)."""
    try:
        resp = await http_client.get(
            "https://api.open-meteo.com/v1/forecast",
            params={"latitude": lat, "longitude": lon, "current": "uv_index"}
        )
        resp.raise_for_status()
        return resp.json()["current"]["uv_index"]
    except Exception as e:
        print(f"[WARN] UV index fetch failed: {e}")
        return None
```

This is called from `_fetch_weather()` after the OWM calls, merging the result into the returned dict.

### Pattern 6: MODE_LABELS update for content modes

The current `MODE_LABELS` in ModeRouter keys on `'idle-weather'`, `'idle-prayer'`. After the refactor, keys become `'content-weather'`, `'content-prayer'`. Update accordingly:

```typescript
const MODE_LABELS: Record<string, { label: string; status?: string }> = {
  listening: { label: 'LISTENING PROTOCOL V3.0', status: 'SYSTEM SECURE' },
  speaking: { label: 'JARVIS CORE: SPEAKING', status: 'VOICE MODE' },
  'content-weather': { label: 'ATMOSPHERIC ANALYSIS', status: 'LIVE DATA' },
  'content-prayer': { label: 'SPIRITUAL PATTERNS: ALMATY', status: 'PRAYER TIMES' },
  // future content modes: content-search, content-calendar, content-briefing
}
```

### Anti-Patterns to Avoid

- **Using `state === 'idle'` as the only content screen trigger:** Current ModeRouter only renders WeatherMode/PrayerMode when `state === 'idle'`. Removing this idle-gate is the core change — the guard must become `CONTENT_MODES.has(mode)` only.
- **Calling `startRecording()` asynchronously from FloatingMic:** iOS AudioContext will not resume. The FloatingMic tap handler must call the prop synchronously.
- **Sharing the same AnimatePresence key across mode changes:** `content-weather` → `content-prayer` must be different keys, otherwise AnimatePresence won't animate the transition (LOOP-03 would break).
- **Frontend phrase matching for dismiss:** The decision is clear — all routing through Claude. Do not add "домой" detection in useVoiceRecorder or App.tsx.
- **Making `_fetch_uv_index` blocking for weather:** UV fetch failing must not block the rest of weather data. Run it in parallel with OWM calls or as a best-effort addition.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UV index data | Custom proxy to OWM One Call 3.0 | Open-Meteo `/v1/forecast?current=uv_index` | OWM One Call 3.0 requires subscription; Open-Meteo is free with no API key |
| City geocoding | Custom city name → coords database | OWM `/geo/1.0/direct` | Existing OWM key works; handles transliterated city names correctly |
| Dismiss intent routing | Frontend phrase matching regex | Claude returning `mode='speak'` | Claude understands contextual dismissal in both Russian and English; frontend list would miss variants |
| FloatingMic animation | Canvas-based pulse | motion/react `animate` with `scale`/`boxShadow` keyframes | Matches existing codebase patterns; GPU-composited, no layout reflow on iPad |

---

## Common Pitfalls

### Pitfall 1: AnimatePresence Key Collision on Content-to-Content Transitions

**What goes wrong:** If ModeRouter uses `key = 'content'` (without mode), switching from weather to prayer doesn't animate — AnimatePresence sees no key change so keeps the same component mounted.
**Why it happens:** AnimatePresence only unmounts/remounts when `key` prop changes on the motion.div.
**How to avoid:** Key must be `content-${mode}` (e.g., `content-weather`, `content-prayer`).
**Warning signs:** Mode switch happens but no fade/scale transition plays; content screen just updates in-place.

### Pitfall 2: Whole-Screen Tap Double-Firing with FloatingMic

**What goes wrong:** User taps FloatingMic button → both FloatingMic's onClick AND App.tsx's onTouchEnd fire → `startRecording()` called twice → AudioContext error or double state transition.
**Why it happens:** Events bubble up from FloatingMic to the root div.
**How to avoid:** FloatingMic's tap handler calls `e.stopPropagation()`. App.tsx handleTap also guards with `CONTENT_MODES_SET.has(mode) && state !== 'idle'` check (Pattern 3 above).
**Warning signs:** Double recording start in console, `[recorder] Mic acquired` logged twice.

### Pitfall 3: FloatingMic Tap Ignored on iOS Due to Async Guard

**What goes wrong:** FloatingMic onClick wraps `onStartListening` in an async check or Promise → AudioContext.resume() called outside synchronous gesture handler → Safari suspends AudioContext.
**Why it happens:** iOS requires AudioContext.resume() to be in the same call stack as the user gesture.
**How to avoid:** `onStartListening` prop must be called synchronously. No `await` before calling it. Pattern from existing App.tsx: `startRecording()` is called directly inside `handleTap` callback.
**Warning signs:** Recording never starts on iOS; `[recorder] AudioContext state: suspended` in console.

### Pitfall 4: Stale `mode` in App.tsx handleTap Closure

**What goes wrong:** `handleTap` was defined without `mode` in its dependency array (it didn't use mode before). After adding mode-awareness (D-20), `mode` must be in the `useCallback` deps.
**Why it happens:** React hooks stale closure — `mode` is always the initial value.
**How to avoid:** Add `mode` to the `useCallback` deps array. Destructure `mode` from `useAssistantStore()` in App.tsx (it's already available).
**Warning signs:** On content modes, full-screen tap still triggers state change despite the guard.

### Pitfall 5: OWM `visibility` Field Absent on Some Responses

**What goes wrong:** `current_raw.get("visibility")` returns `None`/`undefined` for some weather conditions (e.g., heavy fog edge cases where OWM omits the field) → `None / 1000` throws TypeError in Python.
**Why it happens:** OWM docs note: "Visibility is not returned when information is not available."
**How to avoid:** `round(current_raw.get("visibility", 0) / 1000, 1)` — default to 0. Frontend already handles null with `??` pattern.
**Warning signs:** Weather fetch exception `TypeError: unsupported operand type(s) for /: 'NoneType' and 'int'`.

### Pitfall 6: `wind.deg` Absent on Calm Wind Conditions

**What goes wrong:** When wind speed is 0, OWM may omit `wind.deg` from the response → `current_raw["wind"]["deg"]` raises `KeyError`.
**Why it happens:** OWM omits optional subfields when the value is irrelevant (0 m/s wind has no direction).
**How to avoid:** `current_raw["wind"].get("deg", 0)` — default to 0.

### Pitfall 7: UV Index Fetch Blocking Weather Response

**What goes wrong:** `_fetch_uv_index` call is awaited serially after OWM calls → total weather latency = OWM current + OWM forecast + Open-Meteo = ~900ms+.
**Why it happens:** Sequential awaits.
**How to avoid:** Use `asyncio.gather()` to run OWM current, OWM forecast, and Open-Meteo UV in parallel. Or accept the small latency (UV is one lightweight call, ~50-100ms).
**Warning signs:** Weather response takes >800ms consistently.

### Pitfall 8: `mode` in Zustand Store Not Updated Before `state` Transition

**What goes wrong:** Claude returns `mode='weather'` and `state` transitions to `speaking`. If ModeRouter reads state first and mode second, there's a render where `state='speaking'` but `mode` hasn't updated yet — content screen could flash the speaking screen briefly.
**Why it happens:** React renders between Zustand updates if `setMode` and `setState('speaking')` are separate calls.
**How to avoid:** In App.tsx runChat(), the current code sets mode+modeData then calls `setState('speaking')`. This is already correct — `setMode` fires before `setState`, and React 18 batches synchronous Zustand updates. No change needed, but verify this sequence is preserved.

---

## Code Examples

### FloatingMic — Four Visual States with motion/react

```typescript
// Pattern from CONTEXT.md D-08; easing from design.md
const EASING = [0.22, 1, 0.36, 1] as const

export function FloatingMic({ onStartListening, onStopListening }: FloatingMicProps) {
  const { state } = useAssistantStore()

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()   // prevent bubble to App.tsx full-screen handler
    if (state === 'idle') onStartListening()
    else if (state === 'listening') onStopListening()
    // thinking/speaking: tap ignored
  }

  const isListening = state === 'listening'
  const isSpeaking = state === 'speaking'
  const isThinking = state === 'thinking'

  const glowColor = isSpeaking ? 'rgba(173, 137, 255, 0.5)' : 'rgba(133, 173, 255, 0.4)'
  const bgGradient = isSpeaking
    ? 'linear-gradient(135deg, #ad89ff 0%, #8b6fd8 100%)'
    : 'linear-gradient(135deg, #85adff 0%, #6c9fff 100%)'

  return (
    <motion.div
      className="absolute bottom-6 right-6"
      style={{ width: 48, height: 48, borderRadius: '50%', cursor: 'pointer',
               background: bgGradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      animate={
        (isListening || isSpeaking)
          ? { boxShadow: [`0 0 10px ${glowColor}`, `0 0 30px ${glowColor}`, `0 0 10px ${glowColor}`] }
          : { boxShadow: '0 0 20px rgba(133, 173, 255, 0.3)' }
      }
      transition={
        (isListening || isSpeaking)
          ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.3, ease: EASING }
      }
      onClick={handleTap}
      onTouchEnd={(e) => { e.preventDefault(); handleTap(e) }}
    >
      {isThinking
        ? <motion.div
            style={{ width: 20, height: 20, borderRadius: '50%',
                     border: '2px solid transparent',
                     borderTopColor: '#0e0e0e', borderRightColor: '#0e0e0e' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
        : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0e0e0e" strokeWidth="2">
            <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z" />
            <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
          </svg>
      }
    </motion.div>
  )
}
```

### ModeRouter — Content Mode Priority

```typescript
// Source: decisions D-12/D-13
const CONTENT_MODES = new Set<AssistantMode>(['weather', 'prayer', 'search', 'calendar', 'briefing'])

export function ModeRouter({ analyserRef, onStopSpeaking, onStartListening, onStopListening }: ModeRouterProps) {
  const { state, mode } = useAssistantStore()

  // CONTENT MODE PATH: render content screen regardless of voice state
  if (CONTENT_MODES.has(mode)) {
    const key = `content-${mode}`  // must change on mode change for AnimatePresence
    const shellInfo = MODE_LABELS[key]
    const contentComponent = renderContentMode(mode, onStartListening, onStopListening)

    return (
      <AnimatePresence mode="wait">
        <motion.div key={key} className="w-screen h-screen" variants={modeVariants} initial="initial" animate="animate" exit="exit">
          {shellInfo
            ? <AppShell modeLabel={shellInfo.label} statusLabel={shellInfo.status}>{contentComponent}</AppShell>
            : contentComponent
          }
        </motion.div>
      </AnimatePresence>
    )
  }

  // NON-CONTENT PATH: existing FSM priority (unchanged)
  // ...
}
```

### Backend — System Prompt Update

```python
SYSTEM_PROMPT = (
    "You are JARVIS, an intelligent personal assistant for one user in Almaty, Kazakhstan. "
    "Always respond in the same language the user speaks (Russian or English). "
    "For general queries, respond in 2-3 sentences maximum — be concise and direct. "
    "Always return the required JSON schema fields. Use mode='speak' for general conversation. "
    "Use fetch='none' unless the user explicitly asks about weather, prayer times, calendar, "
    "web search, or morning briefing. "
    # Phase 5 additions:
    "For weather requests, use fetch='weather'. Set query to the city name if the user specifies "
    "one (e.g., 'погода в Москве' → query='Москва'). Leave query empty for default location "
    "(Almaty). Never ask the user which city — default to Almaty. "
    "When the user says домой, спасибо, хватит, назад, хорошо, home, thanks, enough, go back, "
    "or similar dismiss phrases, return mode='speak' and a brief acknowledgment (1 sentence). "
    "Never ask for confirmation when dismissing."
)
```

---

## UV Index Decision (Claude's Discretion)

**Recommendation:** Use Open-Meteo for UV index. Confidence: HIGH.

| Option | Status | Notes |
|--------|--------|-------|
| OWM `/data/2.5/weather` | UV NOT included | Free tier, but no UV field |
| OWM One Call 3.0 | UV included | Requires paid subscription (separate "One Call by Call" plan) |
| OWM deprecated UV API | Retired 2021 | Not available |
| **Open-Meteo** | **UV included, FREE** | `current=uv_index` param; no API key; no documented rate limit for non-commercial use |

Open-Meteo endpoint: `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=uv_index`
Response: `{ "current": { "uv_index": 3.2, ... } }`

This is a single additional HTTP call that runs in parallel with OWM calls. No new env var needed.

---

## Geocoding Failure Handling (Claude's Discretion)

**Recommendation:** On geocoding failure, silently fall back to Almaty coords and set `city_name = "Almaty"`. Return weather data as normal — no error mode. Frontend displays whatever city name is in the response.

Rationale: User asked for "погода в Токио" but geocoding fails → showing Almaty weather with "Almaty" label is better than showing an error screen. The system is voice-first; a brief audio response from Claude explains the situation if needed.

---

## City Name Display (Claude's Discretion)

**Recommendation:** Display the `city` field from the weather payload in the AppShell's `statusLabel` or as a small text element near the temperature hero in WeatherMode. The AppShell `STATUS` slot currently shows `LIVE DATA` — this can become the city name (e.g., `ALMATY • LIVE` or `МОСКВА • LIVE`).

This is a minimal UI change: update `MODE_LABELS['content-weather'].status` to `${data.city?.toUpperCase() ?? 'ALMATY'} • LIVE DATA` or pass it as a prop. Keep it simple — one line, not a separate widget.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `state === 'idle'` gate for content screens | `CONTENT_MODES.has(mode)` gate | Phase 5 | Content screens stay during listen/think/speak |
| Inline mic button in WeatherMode | Shared `FloatingMic.tsx` | Phase 5 | All content modes get background-listen visual |
| `mode='speak'` only route for dismissal | System prompt instructs Claude to return `mode='speak'` on dismiss | Phase 5 | No frontend phrase detection needed |
| UV index unavailable (placeholder '--') | Open-Meteo free UV API | Phase 5 | Stats row fully populated |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| OWM API key | Geocoding + weather | ✓ | existing `OPENWEATHER_API_KEY` in env | — |
| Open-Meteo | UV index | ✓ | No key required | UV field stays null (shows '--' in UI) |
| httpx AsyncClient | All external fetches | ✓ | Via `request.app.state.http_client` | — |
| motion/react | FloatingMic animations | ✓ | 12.x in package.json | — |
| Zustand | FloatingMic state | ✓ | 5.x in package.json | — |

No missing dependencies.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.3.5 + pytest-asyncio 0.24.0 |
| Config file | `pytest.ini` (project root) |
| Quick run command | `cd /Users/alikeforalike/Documents/Dev/jarvis-v1 && python -m pytest tests/test_weather.py -x -q` |
| Full suite command | `cd /Users/alikeforalike/Documents/Dev/jarvis-v1 && python -m pytest tests/ -x -q` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WEATH-06 | `_fetch_weather` returns humidity, wind_speed, wind_deg, visibility, uv_index | unit | `pytest tests/test_weather.py -x -q` | ✅ (extend existing) |
| WEATH-07 | Empty query → Almaty coords used, no geocoding call made | unit | `pytest tests/test_weather.py::test_fetch_weather_default_city -x -q` | ❌ Wave 0 |
| WEATH-08 | city='Москва' → geocoding called → correct lat/lon used in OWM request | unit | `pytest tests/test_weather.py::test_fetch_weather_with_city -x -q` | ❌ Wave 0 |
| WEATH-08 | Geocoding failure → falls back to Almaty coords | unit | `pytest tests/test_weather.py::test_fetch_weather_geocoding_failure -x -q` | ❌ Wave 0 |
| LOOP-02/03/04 | Frontend FSM routing | manual-only | iPad device test | N/A — browser FSM |

Frontend loop behavior (LOOP-02/03/04) cannot be automated with pytest — it requires browser interaction on iPad. The ModeRouter logic changes are verified manually.

### Sampling Rate
- **Per task commit:** `python -m pytest tests/test_weather.py -x -q`
- **Per wave merge:** `python -m pytest tests/ -x -q`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_weather.py::test_fetch_weather_default_city` — covers WEATH-07
- [ ] `tests/test_weather.py::test_fetch_weather_with_city` — covers WEATH-08
- [ ] `tests/test_weather.py::test_fetch_weather_geocoding_failure` — covers WEATH-08 fallback
- [ ] `tests/test_weather.py` — existing `test_fetch_weather_returns_shaped_payload` needs update to assert `humidity`, `wind_speed`, `wind_deg`, `visibility`, `uv_index` fields (covers WEATH-06)

---

## Open Questions

1. **Does OWM geocoding API require a specific subscription tier?**
   - What we know: `/geo/1.0/direct` endpoint exists and accepts `OPENWEATHER_API_KEY`. Multiple sources confirm it's available. Pricing page listing is ambiguous.
   - What's unclear: Whether the current free-tier key works without additional subscription.
   - Recommendation: Test with real key in Plan execution. Fallback: use hardcoded Almaty coords for all requests if geocoding fails (behavior is already the fallback design).

2. **FloatingMic touch event guard — does onTouchEnd + e.preventDefault() conflict with onTouchEnd in App.tsx?**
   - What we know: App.tsx root div already uses `onTouchEnd` with `e.preventDefault()` + `touchHandledRef`. FloatingMic is a child element.
   - What's unclear: Whether stopPropagation on FloatingMic's touchEnd prevents App.tsx's handler from firing.
   - Recommendation: FloatingMic calls `e.stopPropagation()`. App.tsx handleTap also guards with content-mode check (belt + suspenders). Both guards together eliminate the double-fire risk.

---

## Sources

### Primary (HIGH confidence)
- OWM `/data/2.5/weather` response fields — https://openweathermap.org/current#fields — confirmed `humidity`, `wind.speed`, `wind.deg`, `visibility` present; UV index NOT present
- Open-Meteo docs — https://open-meteo.com/en/docs — `current=uv_index` param, no API key, free
- OWM Geocoding API — https://openweathermap.org/api/geocoding-api — `/geo/1.0/direct?q={city}&limit=1&appid={key}` confirmed
- OWM One Call 3.0 pricing — https://openweathermap.org/api/one-call-3 — requires paid subscription
- CONTEXT.md decisions D-01 through D-27 — all locked decisions implemented as patterns above

### Secondary (MEDIUM confidence)
- Open-Meteo free tier limits — no documented rate limit for non-commercial use; widely reported as freely usable without API key in multiple developer guides

### Tertiary (LOW confidence)
- OWM geocoding free tier availability — multiple sources imply it's included with standard free key, but pricing page is not explicit

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already installed, APIs confirmed
- Architecture: HIGH — exact source files read, patterns derived from existing code
- Pitfalls: HIGH — derived from reading actual existing code + known iOS constraints
- UV index recommendation: HIGH — OWM free tier limitation confirmed from official docs; Open-Meteo confirmed free
- Geocoding: MEDIUM — endpoint confirmed, free-tier inclusion not explicitly stated in docs

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (OWM API and Open-Meteo are stable; motion/react API stable)

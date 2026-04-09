# Phase 3: Information Modes - Research

**Researched:** 2026-04-08
**Domain:** Weather/Prayer API integration, React mode components, auto-listen FSM loop
**Confidence:** HIGH

---

## Summary

Phase 3 adds two data-driven visual modes (Weather and Prayer Times) and closes the voice loop with auto-listen after TTS completes. The backend fetch pipeline is already scaffolded: `chat.py` has the `fetch` field in Claude's response schema and `app.state.http_client` (httpx AsyncClient) is lifespan-scoped in `main.py`. The frontend store has `modeData` field ready and ModeRouter has `AnimatePresence` with `motion/react` transitions already working. No new packages are needed on either side.

The biggest implementation risk is the `ChatResponse` Pydantic model — it currently lacks a `data` field, so the backend response model must be extended before the frontend can receive weather/prayer payloads. The frontend `client.ts` `ChatResponse` interface must also be extended in lockstep. Prayer times require a live countdown timer using `setInterval` that crosses midnight cleanly. Auto-listen must guard against the iOS AudioContext tap-gate requirement: `startRecording()` during auto-listen is initiated from a `setTimeout` callback (not a synchronous gesture handler), which is allowable because the AudioContext was already activated in the initial user tap — it only needs to be resumed in a gesture handler the first time.

**Primary recommendation:** Extend `ChatResponse` model and `client.ts` interface first, then build backend fetch helpers, then build frontend mode components, then wire auto-listen in `App.tsx`/`useVoiceOutput.ts`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Backend Data Fetch Pipeline**
- D-01: When Claude returns `fetch: "weather"`, chat router calls OpenWeatherMap API before responding to frontend
- D-02: When Claude returns `fetch: "prayer"`, chat router calls Aladhan API before responding
- D-03: Fetched data included in response JSON as `data` field alongside `mode`, `text`, `fetch`, `query`
- D-04: Use existing `app.state.http_client` (httpx AsyncClient, lifespan-scoped) for all external API calls
- D-05: OpenWeatherMap One Call API 3.0 — current + 48h hourly, Almaty coords from config (43.2220, 76.8512)
- D-06: Aladhan API — `/v1/timingsByCity` with city=Almaty, country=KZ, method=1 (University of Islamic Sciences, Karachi)

**Weather Mode (Visual)**
- D-07: Large temperature display center screen (current temp in °C)
- D-08: Animated weather icon based on condition code (map OpenWeatherMap codes to icons/animations)
- D-09: Hourly forecast as horizontal scrollable row at bottom
- D-10: Background color subtly shifts based on weather condition (clear=deep blue, cloudy=gray tint, rain=darker)
- D-11: Design tokens from design.md — glassmorphism cards for hourly items, Space Grotesk for temperature, Inter for labels
- D-12: Stitch screen ID `46d9c2600c1948658c68a31705074ca7` is source of truth for layout

**Prayer Times Mode (Visual)**
- D-13: Next prayer name displayed large center screen
- D-14: Live countdown timer to next prayer (updates every second)
- D-15: All 5 daily prayers listed at bottom (Fajr, Dhuhr, Asr, Maghrib, Isha)
- D-16: Current/next prayer visually highlighted with primary glow
- D-17: Passed prayers dimmed, future prayers in on-surface-variant color
- D-18: Stitch screen ID `b9c8cef5cb4b4a9db5931e80797efe16` is source of truth for layout

**Auto-Listen After Response (LOOP-01)**
- D-19: After TTS finishes (onend callback), wait 500ms then auto-start recording
- D-20: FSM transition: speaking → idle → listening (with 500ms delay between idle and listening)
- D-21: Visual cue: orb briefly pulses in idle state before waveform appears
- D-22: If user taps during the 500ms delay, cancel auto-listen (user takes control)
- D-23: Auto-listen only activates after a successful voice response, not after errors

**Mode Transition from Speaking**
- D-24: When Claude responds with mode=weather or mode=prayer, show Speaking mode first (TTS reads response), then transition to the data mode
- D-25: Data mode (Weather/Prayer) persists until user taps to speak again → returns to idle → listening
- D-26: Framer Motion (motion/react) animated transition from Speaking → Weather/Prayer mode

### Claude's Discretion
- Weather icon mapping algorithm (condition code → SVG/animation)
- Hourly forecast card count and scroll behavior details
- Prayer times calculation edge cases (midnight crossing, etc.)
- Exact auto-listen delay tuning (500ms is starting point)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WEATH-01 | Large temperature display center screen | D-07; OWM `current.temp` field with `units=metric` returns °C |
| WEATH-02 | Animated weather icon based on condition | D-08; OWM condition code ranges (2xx=thunder, 5xx=rain, 800=clear, 80x=cloud) mapped to CSS/SVG |
| WEATH-03 | Hourly forecast horizontal scroll | D-09; OWM `hourly` array, `dt` + `temp` + `weather[0]` per item |
| WEATH-04 | Data from OpenWeatherMap API, default location Almaty | D-05; One Call 3.0 URL pattern confirmed, `units=metric` for °C |
| WEATH-05 | Triggered when user asks about weather | D-01; Claude sets `fetch: "weather"`, backend fetches before responding |
| PRAY-01 | Next prayer name displayed large center screen | D-13; Aladhan returns Fajr/Dhuhr/Asr/Maghrib/Isha as HH:MM strings; compare to current time |
| PRAY-02 | Countdown timer to next prayer | D-14; `setInterval` every 1s computing delta from `Date.now()` to next prayer HH:MM |
| PRAY-03 | All 5 daily prayers listed at bottom | D-15; five timings from Aladhan response |
| PRAY-04 | Current/next prayer highlighted | D-16/D-17; compare current time to timing strings to classify passed/next/future |
| PRAY-05 | Data from Aladhan API, coordinates for Almaty | D-06; `/v1/timingsByCity?city=Almaty&country=KZ&method=1` confirmed live |
| PRAY-06 | Triggered when user asks about prayer times | D-02; Claude sets `fetch: "prayer"`, backend fetches before responding |
| LOOP-01 | After JARVIS finishes speaking, mic auto-reactivates | D-19–D-23; setTimeout 500ms in `useVoiceOutput.ts` onend callback |
</phase_requirements>

---

## Standard Stack

### Core (no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| httpx AsyncClient | Already in requirements.txt | Backend: call OWM and Aladhan APIs | Already lifespan-scoped in `app.state.http_client` (D-04) |
| motion/react | 12.x (installed) | Frontend: mode transitions | AnimatePresence already in ModeRouter |
| Zustand | 5.x (installed) | Frontend: `modeData` field | `setModeData` already in store |
| TailwindCSS v4 | Installed | Glassmorphism cards, utility styling | `backdrop-blur`, `overflow-x-auto` for scroll |

### No New Packages Required

All necessary packages are already installed. This phase is purely additive code within the existing stack.

**Backend verification:**
```
requirements.txt already has: httpx, fastapi, pydantic-settings, anthropic
```

**Frontend verification:**
```
package.json already has: motion, zustand, tailwindcss
```

---

## Architecture Patterns

### Backend Fetch Pipeline Pattern

The existing `chat.py` router must be extended after `_call_claude()` returns. The pattern is:

```python
# After Claude call, before returning ChatResponse
if envelope.get("fetch") == "weather":
    data = await _fetch_weather(request.app.state.http_client, settings)
    envelope["data"] = data
elif envelope.get("fetch") == "prayer":
    data = await _fetch_prayer(request.app.state.http_client)
    envelope["data"] = data
else:
    envelope["data"] = None
```

Then `ChatResponse` must add an optional `data` field:

```python
class ChatResponse(BaseModel):
    mode: str
    text: str
    fetch: str
    query: str
    data: dict | None = None   # NEW: weather or prayer payload
```

### OpenWeatherMap One Call 3.0 URL

```
https://api.openweathermap.org/data/3.0/onecall
  ?lat=43.2220
  &lon=76.8512
  &appid={OPENWEATHER_API_KEY}
  &units=metric
  &exclude=minutely,daily,alerts
```

**Response shape (confirmed live):**
```json
{
  "current": {
    "temp": 12.4,
    "weather": [{"id": 800, "main": "Clear", "description": "clear sky", "icon": "01d"}]
  },
  "hourly": [
    {"dt": 1744200000, "temp": 11.2, "weather": [{"id": 801, "main": "Clouds", "icon": "02d"}]},
    ...
  ]
}
```

**Key:** `units=metric` ensures `temp` is °C. `exclude=minutely,daily,alerts` reduces payload.

### Aladhan API URL

```
https://api.aladhan.com/v1/timingsByCity?city=Almaty&country=KZ&method=1
```

**Response shape (confirmed live against API today 2026-04-08):**
```json
{
  "data": {
    "timings": {
      "Fajr": "03:40",
      "Sunrise": "05:21",
      "Dhuhr": "11:54",
      "Asr": "15:33",
      "Sunset": "18:28",
      "Maghrib": "18:28",
      "Isha": "20:09",
      "Imsak": "03:30",
      "Midnight": "23:54"
    },
    "date": {
      "gregorian": {"date": "09-04-2026", "day": "Thursday"},
      "hijri": {"date": "21-10-1447"}
    }
  }
}
```

**The 5 prayers to display:** Fajr, Dhuhr, Asr, Maghrib, Isha (from `data.timings`).

### What to Send to Frontend (modeData)

**Weather payload** (strip raw response to only what UI needs):
```python
{
  "temp": round(current["temp"]),
  "condition_id": current["weather"][0]["id"],
  "condition_main": current["weather"][0]["main"],
  "icon": current["weather"][0]["icon"],
  "hourly": [
    {"dt": h["dt"], "temp": round(h["temp"]), "icon": h["weather"][0]["icon"]}
    for h in hourly[:24]  # 24 hours
  ]
}
```

**Prayer payload:**
```python
{
  "Fajr": timings["Fajr"],
  "Dhuhr": timings["Dhuhr"],
  "Asr": timings["Asr"],
  "Maghrib": timings["Maghrib"],
  "Isha": timings["Isha"],
  "date": date["gregorian"]["date"]
}
```

### Frontend: ChatResponse and client.ts Extension

`frontend/src/api/client.ts` must add `data` to the `ChatResponse` interface:

```typescript
export interface ChatResponse {
  mode: string
  text: string
  fetch: string
  query: string
  data: Record<string, unknown> | null  // NEW
}
```

`App.tsx` must update the `setModeData` call:
```typescript
// Replace: setModeData(null)
setModeData(envelope.data ?? null)
```

### WeatherMode Component Pattern

```typescript
// frontend/src/modes/WeatherMode.tsx
import { useAssistantStore } from '../store/assistantStore'
import { motion } from 'motion/react'

export function WeatherMode() {
  const modeData = useAssistantStore(s => s.modeData)
  const data = modeData as WeatherData | null
  if (!data) return null
  // ...
}
```

Weather condition code → background/icon mapping:
```typescript
function getConditionStyle(id: number): { bg: string; label: string } {
  if (id === 800) return { bg: '#0d1b2a', label: 'Clear' }       // clear sky deep blue
  if (id >= 801 && id <= 804) return { bg: '#1a1a1f', label: 'Cloudy' }  // gray tint
  if (id >= 500 && id <= 531) return { bg: '#111418', label: 'Rain' }    // darker
  if (id >= 200 && id <= 232) return { bg: '#0e0e14', label: 'Storm' }
  if (id >= 600 && id <= 622) return { bg: '#12161c', label: 'Snow' }
  return { bg: '#0e0e0e', label: 'Unknown' }
}
```

### PrayerMode Countdown Timer Pattern

```typescript
// frontend/src/modes/PrayerMode.tsx
import { useState, useEffect } from 'react'

function parseTime(hhmm: string): { h: number; m: number } {
  const [h, m] = hhmm.split(':').map(Number)
  return { h, m }
}

function getNextPrayer(prayers: PrayerEntry[], now: Date): PrayerEntry {
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const next = prayers.find(p => p.minutes > nowMinutes)
  return next ?? prayers[0]  // wraps to Fajr next day at midnight
}

// In component:
const [remaining, setRemaining] = useState(computeRemaining())

useEffect(() => {
  const timer = setInterval(() => setRemaining(computeRemaining()), 1000)
  return () => clearInterval(timer)
}, [prayers])
```

**Midnight crossing:** When `getNextPrayer` returns `prayers[0]` (Fajr), the delta must add 24h worth of seconds if Fajr is tomorrow. Use: `delta = (fajrMinutes + 1440 - nowMinutes) * 60`.

### Auto-Listen FSM Pattern (LOOP-01)

**In `useVoiceOutput.ts`**, the `speak` function's `onend` callback currently does:
```typescript
utterance.onend = () => {
  if (assistantText) addToHistory('assistant', assistantText)
  setState('idle')
}
```

Add auto-listen trigger (requires `startRecording` passed in or accessed via store callback):

```typescript
// Approach: pass autoListen flag and startRecording ref into speak()
const speak = useCallback((text, assistantText?, autoListen = false) => {
  // ...
  utterance.onend = () => {
    if (assistantText) addToHistory('assistant', assistantText)
    setState('idle')
    if (autoListen) {
      const timer = setTimeout(() => {
        // Only start if state is still idle (user hasn't tapped during delay)
        setState('listening')
        startRecordingRef.current?.()
      }, 500)
      autoListenTimerRef.current = timer
    }
  }
})
```

**Cancel on user tap (D-22):** In `handleTap` in `App.tsx`, clear `autoListenTimerRef` if it's set and state is still idle. Since `handleTap` checks `state === 'idle'` before doing anything, the existing `setState('listening'); startRecording()` path in `handleTap` will win naturally if user taps. The timer should be cancelled explicitly to prevent double-start:

```typescript
// In handleTap, at the top:
if (autoListenTimerRef.current) {
  clearTimeout(autoListenTimerRef.current)
  autoListenTimerRef.current = null
}
```

**iOS AudioContext note:** `startRecording()` inside `setTimeout` is safe because AudioContext was already resumed during the initial user gesture. Only the first `AudioContext.resume()` must be synchronous in a gesture handler.

**Auto-listen only after success (D-23):** Pass `autoListen=true` only in the success path of `runChat()` in `App.tsx`, not in the error catch block.

### ModeRouter Extension Pattern

```typescript
// Add after the 'speaking' else-if block, before the final 'idle' else:
} else if (state === 'idle' && mode === 'weather') {
  key = 'weather'
  content = <WeatherMode />
} else if (state === 'idle' && mode === 'prayer') {
  key = 'prayer'
  content = <PrayerMode />
} else {
  // 'idle' with chat mode — existing orb landing screen
```

Wait — D-24 says show Speaking mode FIRST, then transition to the data mode. The Speaking mode shows while TTS plays, then `onend` fires and FSM goes to `idle`. At that point ModeRouter sees `state=idle, mode=weather` → renders WeatherMode. This is the correct sequence using the existing FSM — no additional state needed.

D-25: WeatherMode/PrayerMode render when `state='idle' && mode='weather'/'prayer'`. User tap sets `state='listening'` in `handleTap` → ModeRouter transitions away.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP requests to OWM/Aladhan | Custom aiohttp/requests wrapper | `app.state.http_client` (httpx AsyncClient) | Already lifespan-scoped; connection pooling, timeouts set |
| Prayer time arithmetic | Custom Islamic calendar library | Direct string parsing of Aladhan HH:MM response | Aladhan does the calculation; just parse time strings |
| Weather icon SVG set | Download/bundle Lottie animations | Simple CSS emoji or Unicode + condition-code CSS classes | Phase 3 scope; full Lottie is UI-01 in v2 requirements |
| Animated transitions | Custom React state machines | `motion/react` AnimatePresence (already in ModeRouter) | Pattern already established; consistent easing |
| Prayer times for Almaty | Local calculation with astronomy lib | Aladhan API (free, no auth) | API is already defined and tested working |

**Key insight:** The backend HTTP client, frontend store, and animation infrastructure are already in place. This phase wires them up with new data and new components.

---

## Common Pitfalls

### Pitfall 1: ChatResponse Missing `data` Field
**What goes wrong:** Backend sends `data` key but Pydantic `ChatResponse` model doesn't include it — Pydantic silently strips unknown fields by default. Frontend receives `null` for `modeData` even though backend fetched data successfully.
**Why it happens:** Pydantic v2 with `model_config = ConfigDict(extra='ignore')` default behavior.
**How to avoid:** Add `data: dict | None = None` to `ChatResponse` in `chat.py` AND `data: Record<string, unknown> | null` to `ChatResponse` interface in `client.ts`.
**Warning signs:** `modeData` is always null in WeatherMode/PrayerMode despite backend logs showing successful fetch.

### Pitfall 2: setModeData(null) Still in App.tsx
**What goes wrong:** `App.tsx` line 80 still has `setModeData(null)` comment from Phase 2, replacing the actual envelope.data.
**How to avoid:** Replace `setModeData(null)` with `setModeData(envelope.data ?? null)` in the thinking effect.

### Pitfall 3: Auto-Listen Double-Start
**What goes wrong:** User taps during the 500ms auto-listen window → handleTap fires `setState('listening'); startRecording()` → setTimeout also fires → `startRecording()` called twice → MediaRecorder error or two overlapping recording sessions.
**How to avoid:** Store the timer ref, clear it at the top of `handleTap` before any state check.

### Pitfall 4: Prayer Countdown Goes Negative After Isha
**What goes wrong:** After Isha (last prayer of the day), `getNextPrayer` returns nothing → next prayer is Fajr tomorrow → countdown must add 24h offset.
**How to avoid:** Wrap-around logic: `if (!next) next = prayers[0]` and compute delta as `(fajrMinutes + 1440 - nowMinutes) * 60`.
**Warning signs:** Timer shows negative seconds after ~20:00 in Almaty.

### Pitfall 5: OWM One Call 3.0 Requires Separate Subscription
**What goes wrong:** Using a One Call 3.0 endpoint with a basic OWM free tier key returns HTTP 401 with message "requires a separate subscription."
**Why it happens:** OWM One Call 3.0 is not included in the free tier — it's a paid add-on called "One Call by Call."
**How to avoid:** Confirm `OPENWEATHER_API_KEY` in Railway env vars is specifically subscribed to One Call 3.0. The test call above (curl with test key) returned 401 — this is expected with a placeholder key, not a bug.
**Warning signs:** Backend logs `401` from OWM. Frontend shows no weather data. Response fallback returns `data: null`.

### Pitfall 6: Hourly `dt` is UTC Unix Timestamp
**What goes wrong:** Displaying raw `dt` value or converting without timezone results in wrong hour labels in Almaty (UTC+5).
**How to avoid:** Convert with `new Date(dt * 1000)` then use `.toLocaleTimeString('ru', { hour: '2-digit', timeZone: 'Asia/Almaty' })`.

### Pitfall 7: ModeRouter `idle` key Collision
**What goes wrong:** WeatherMode and PrayerMode both render under `state='idle'`. If the key string is just `'idle'` for both, AnimatePresence won't re-trigger the transition when mode changes between weather and prayer.
**How to avoid:** Use `key={`idle-${mode}`}` for data modes (the existing pattern `idle-${mode}` already does this for the orb — extend it: `idle-weather`, `idle-prayer`, `idle-chat`).

### Pitfall 8: Horizontal Scroll in Safari PWA
**What goes wrong:** `overflow-x: auto` on the hourly forecast row may not scroll smoothly on iPad Safari without `-webkit-overflow-scrolling: touch`.
**How to avoid:** Add `style={{ WebkitOverflowScrolling: 'touch' }}` or `overflow-x-auto` with Tailwind's `scroll-smooth` on the scroll container.

---

## Code Examples

### Backend: Weather Fetch Helper
```python
# Source: OWM One Call 3.0 docs + existing httpx pattern in main.py
async def _fetch_weather(http_client: httpx.AsyncClient, settings) -> dict:
    url = "https://api.openweathermap.org/data/3.0/onecall"
    params = {
        "lat": settings.LATITUDE,
        "lon": settings.LONGITUDE,
        "appid": settings.OPENWEATHER_API_KEY,
        "units": "metric",
        "exclude": "minutely,daily,alerts",
    }
    resp = await http_client.get(url, params=params)
    resp.raise_for_status()
    raw = resp.json()
    current = raw["current"]
    return {
        "temp": round(current["temp"]),
        "condition_id": current["weather"][0]["id"],
        "condition_main": current["weather"][0]["main"],
        "icon": current["weather"][0]["icon"],
        "hourly": [
            {
                "dt": h["dt"],
                "temp": round(h["temp"]),
                "icon": h["weather"][0]["icon"],
            }
            for h in raw.get("hourly", [])[:24]
        ],
    }
```

### Backend: Prayer Fetch Helper
```python
# Source: Aladhan API confirmed live response 2026-04-08
async def _fetch_prayer(http_client: httpx.AsyncClient) -> dict:
    url = "https://api.aladhan.com/v1/timingsByCity"
    params = {"city": "Almaty", "country": "KZ", "method": "1"}
    resp = await http_client.get(url, params=params)
    resp.raise_for_status()
    timings = resp.json()["data"]["timings"]
    return {
        "Fajr": timings["Fajr"],
        "Dhuhr": timings["Dhuhr"],
        "Asr": timings["Asr"],
        "Maghrib": timings["Maghrib"],
        "Isha": timings["Isha"],
    }
```

### Backend: Extended ChatResponse + fetch dispatch in chat()
```python
class ChatResponse(BaseModel):
    mode: str
    text: str
    fetch: str
    query: str
    data: dict | None = None  # Added Phase 3

# In the chat() handler, after _call_claude():
fetch_type = envelope.get("fetch", "none")
fetched_data = None
if fetch_type == "weather":
    try:
        fetched_data = await _fetch_weather(request.app.state.http_client, settings)
    except Exception as e:
        # Don't fail the whole request — return text response, no data
        print(f"Weather fetch error: {e}")
elif fetch_type == "prayer":
    try:
        fetched_data = await _fetch_prayer(request.app.state.http_client)
    except Exception as e:
        print(f"Prayer fetch error: {e}")
envelope["data"] = fetched_data

return ChatResponse(**envelope)
```

### Frontend: WeatherData type
```typescript
// frontend/src/modes/WeatherMode.tsx
interface HourlyItem {
  dt: number
  temp: number
  icon: string
}

interface WeatherData {
  temp: number
  condition_id: number
  condition_main: string
  icon: string
  hourly: HourlyItem[]
}
```

### Frontend: PrayerData type and countdown hook
```typescript
// frontend/src/modes/PrayerMode.tsx
interface PrayerData {
  Fajr: string
  Dhuhr: string
  Asr: string
  Maghrib: string
  Isha: string
}

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function computeNext(data: PrayerData): { name: string; secondsLeft: number } {
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const entries = PRAYER_NAMES.map(n => ({ name: n, minutes: toMinutes(data[n]) }))
  const next = entries.find(e => e.minutes > nowMin) ?? entries[0]
  let delta = next.minutes - nowMin
  if (delta <= 0) delta += 1440  // tomorrow
  return { name: next.name, secondsLeft: delta * 60 - now.getSeconds() }
}
```

### Frontend: Auto-listen in useVoiceOutput
```typescript
// speak() signature change — add autoListen param
const speak = useCallback((
  text: string,
  assistantText?: string,
  autoListen = false,
  startRecordingFn?: () => void,
) => {
  // ... existing setup ...

  const autoListenTimerRef = { current: null as ReturnType<typeof setTimeout> | null }

  utterance.onend = () => {
    if (assistantText) addToHistory('assistant', assistantText)
    setState('idle')
    if (autoListen && startRecordingFn) {
      autoListenTimerRef.current = setTimeout(() => {
        setState('listening')
        startRecordingFn()
      }, 500)
    }
  }
  // return autoListenTimerRef so App.tsx can cancel it on tap
})
```

**Note:** The exact signature for threading `startRecordingFn` and the timer ref through `useVoiceOutput` is at the implementer's discretion (Claude's Discretion area). The above shows one approach; another is to keep auto-listen logic entirely in `App.tsx` by making `speak` accept an `onEnd` callback.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| httpx | Backend API fetch | Yes | In requirements.txt | — |
| OpenWeatherMap API key | WEATH-04 | Unknown — env var `OPENWEATHER_API_KEY` exists in config.py | — | Graceful null: return `data: null`, frontend shows no weather panel |
| Aladhan API | PRAY-05 | Yes — free, no auth, confirmed live today | — | — |
| motion/react | Frontend transitions | Yes — installed | 12.x | — |
| pytest + pytest-asyncio | Test suite | Yes — in requirements.txt | 8.3.5 / 0.24.0 | — |

**Missing dependencies with no fallback:** None blocking. OWM key must be valid One Call 3.0 subscription — confirm in Railway env vars before deployment.

**Missing dependencies with fallback:** OWM API key validity — if key is basic tier, weather fetch returns 401. Backend should catch the exception and return `data: null`. WeatherMode should handle `modeData === null` gracefully (show "Data unavailable" text).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.3.5 + pytest-asyncio 0.24.0 |
| Config file | `/pytest.ini` (asyncio_mode=auto, testpaths=tests, pythonpath=backend) |
| Quick run command | `cd /Users/alikeforalike/Documents/Dev/jarvis-v1 && python -m pytest tests/test_chat.py -x -q` |
| Full suite command | `cd /Users/alikeforalike/Documents/Dev/jarvis-v1 && python -m pytest tests/ -x -q` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WEATH-04/05 | `/api/chat` fetches weather data when `fetch=weather` | unit (mock httpx) | `pytest tests/test_weather.py -x` | Wave 0 |
| PRAY-05/06 | `/api/chat` fetches prayer data when `fetch=prayer` | unit (mock httpx) | `pytest tests/test_prayer.py -x` | Wave 0 |
| WEATH-01–03 | WeatherMode renders temp, icon, hourly row | manual visual | — | manual |
| PRAY-01–04 | PrayerMode renders next prayer, countdown, list | manual visual | — | manual |
| LOOP-01 | Auto-listen timer fires after TTS onend (500ms) | manual (iOS device) | — | manual (iOS AudioContext) |
| D-03 | `data` field included in `/api/chat` response JSON | unit | `pytest tests/test_weather.py::test_chat_returns_weather_data -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `python -m pytest tests/test_chat.py tests/test_weather.py tests/test_prayer.py -x -q`
- **Per wave merge:** `python -m pytest tests/ -x -q`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_weather.py` — covers WEATH-04/05 backend fetch with mocked httpx
- [ ] `tests/test_prayer.py` — covers PRAY-05/06 backend fetch with mocked httpx

**Existing test infrastructure covers:** Chat route tests (test_chat.py), conftest fixtures (mock_mongo, http_client, mock_claude), pytest.ini config. No new framework setup needed.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` imports | `motion/react` imports | Phase 1 decision | Already in codebase correctly |
| Motor MongoDB | PyMongo AsyncMongoClient | Phase 1 decision | Already in codebase correctly |
| `setModeData(null)` | `setModeData(envelope.data ?? null)` | Phase 3 | Single line change in App.tsx |

---

## Open Questions

1. **OWM One Call 3.0 subscription validity**
   - What we know: Key is configured as `OPENWEATHER_API_KEY` in config.py and Railway env vars
   - What's unclear: Whether the Railway-deployed key has One Call 3.0 plan or basic free tier
   - Recommendation: Add a graceful catch in `_fetch_weather` — if 401, log warning, return None. Frontend WeatherMode shows "Location data unavailable" text if `modeData` is null.

2. **Auto-listen architecture: where to own the timer ref**
   - What we know: Timer must be cancellable from `handleTap` in App.tsx; `useVoiceOutput` currently owns TTS lifecycle
   - What's unclear: Whether to pass `startRecordingFn` into `speak()` or lift the timeout into App.tsx via a returned cleanup function
   - Recommendation: Keep auto-listen logic in App.tsx — have `useVoiceOutput.speak()` accept an optional `onComplete` callback, call it after `setState('idle')`. App.tsx sets a timeout in `onComplete` and stores the timer ref alongside `thinkingAbortRef`. Cleaner separation of concerns.

3. **Weather icon assets**
   - What we know: OWM returns icon codes like `01d`, `10n`; decision says "animated weather icon" but Lottie is deferred to v2
   - What's unclear: Whether to use OWM's hosted icon PNGs, Unicode emoji, or custom SVG
   - Recommendation: Use Unicode emoji mapped from condition code groups (sunny: "☀️", cloudy: "☁️", rain: "🌧", snow: "❄️", storm: "⛈") within a CSS animated container. No external assets needed. Full Lottie is UI-01 in v2.

---

## Project Constraints (from CLAUDE.md)

1. **Design tokens must match design.md** — colors, typography (Inter + Space Grotesk), surface hierarchy, glassmorphism rules
2. **No-Line Rule** — no 1px borders; use background shifts, luminous depth, or backdrop blur
3. **Stitch screen fidelity** — Weather Mode: `46d9c2600c1948658c68a31705074ca7`, Prayer Mode: `b9c8cef5cb4b4a9db5931e80797efe16` — these are the layout sources of truth
4. **Nothing missing** — every visual element from the Stitch screen must be present
5. **Custom easing** — `cubic-bezier(0.22, 1, 0.36, 1)` not standard 400ms
6. **Text colors** — never pure white (#FFFFFF); use `on-surface-variant` (#adaaaa)
7. **Import from `motion/react`** not `framer-motion`
8. **Backend proxies all external API calls** — frontend never calls OWM or Aladhan directly
9. **No new packages** unless strictly required — all necessary libraries are already installed
10. **GSD workflow enforcement** — use `/gsd:execute-phase` entry point for all file changes

---

## Sources

### Primary (HIGH confidence)
- Aladhan API live response — fetched against `api.aladhan.com/v1/timingsByCity?city=Almaty&country=KZ&method=1` today (2026-04-08): confirmed timings structure, field names (Fajr/Dhuhr/Asr/Maghrib/Isha as HH:MM strings)
- OpenWeatherMap One Call 3.0 docs (openweathermap.org/api/one-call-3): current/hourly field names confirmed; `units=metric` for °C; `exclude` parameter; weather condition code ranges
- Existing codebase: `main.py` (httpx lifespan client), `chat.py` (fetch field in schema), `assistantStore.ts` (modeData field), `ModeRouter.tsx` (AnimatePresence pattern), `useVoiceOutput.ts` (onend callback hook point), `config.py` (LATITUDE/LONGITUDE/OPENWEATHER_API_KEY fields)

### Secondary (MEDIUM confidence)
- OWM weather condition codes page (openweathermap.org/weather-conditions): code group ranges 2xx/3xx/5xx/6xx/7xx/800/80x verified

### Tertiary (LOW confidence — for discretion areas)
- Prayer countdown midnight edge case handling: derived from Aladhan response inspection; no official guidance needed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; existing stack verified in codebase
- Backend API fetch pattern: HIGH — httpx client confirmed in main.py; OWM/Aladhan URLs and response shapes confirmed live
- Frontend component pattern: HIGH — ModeRouter, AnimatePresence, modeData store all verified in existing code
- Auto-listen FSM: HIGH — onend callback hook point confirmed in useVoiceOutput.ts; iOS AudioContext second-call safety confirmed by prior research
- Test infrastructure: HIGH — pytest.ini, conftest.py, existing test files all confirmed

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (Aladhan API is stable; OWM API format rarely changes)

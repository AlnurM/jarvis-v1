# Architecture Research

**Domain:** AI Voice Assistant PWA (React + Vite + FastAPI monolith)
**Researched:** 2026-04-08
**Confidence:** HIGH (for patterns) / MEDIUM (for Safari-specific workarounds)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (iPad Safari PWA)                  │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ Voice Loop │  │  Mode Layer  │  │  Visual Feedback   │   │
│  │ (STT/TTS)  │  │  (8 modes)   │  │  (Framer Motion)   │   │
│  └─────┬──────┘  └──────┬───────┘  └────────┬───────────┘   │
│        │                │                    │               │
│  ┌─────┴────────────────┴────────────────────┴───────────┐   │
│  │              Global Assistant State (Zustand)          │   │
│  │    idle → listening → thinking → speaking → [mode]     │   │
│  └────────────────────────────┬──────────────────────────┘   │
├───────────────────────────────┼─────────────────────────────┤
│                    API Layer  │                               │
│  ┌────────────────────────────▼──────────────────────────┐   │
│  │              fetch("/api/...")  — same-origin          │   │
│  └────────────────────────────┬──────────────────────────┘   │
└───────────────────────────────┼─────────────────────────────┘
                                │ HTTP (Docker internal)
┌───────────────────────────────▼─────────────────────────────┐
│                    FastAPI Backend                            │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │  /api/chat │  │ /api/weather │  │  /api/calendar     │   │
│  │  (Claude)  │  │ /api/prayer  │  │  /api/search       │   │
│  └─────┬──────┘  └──────┬───────┘  └────────┬───────────┘   │
│        │                │                    │               │
│  ┌─────┴────────────────┴────────────────────┴───────────┐   │
│  │           httpx.AsyncClient (shared, lifespan-scoped)  │   │
│  └────────────────────────────┬──────────────────────────┘   │
│                                │                              │
│  ┌─────────────────────────────▼──────────────────────────┐  │
│  │              Motor (async MongoDB driver)               │  │
│  └─────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│  app.mount("/", StaticFiles)  ← Vite build output            │
│  catch-all: serve index.html  ← SPA routing                  │
└──────────────────────────────────────────────────────────────┘
                    │
    ┌───────────────┼───────────────────────────────┐
    ▼               ▼               ▼               ▼
 Claude API   OpenWeatherMap    Aladhan API    Google Calendar
              Brave Search
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| VoiceEngine | STT via Web Speech API, silence detection, TTS playback | AssistantStore (state transitions), fetch API |
| AssistantStore (Zustand) | Global FSM: idle/listening/thinking/speaking/[mode] | All UI components (subscribe), VoiceEngine |
| ModeRouter | Reads `mode` from Claude JSON envelope, renders correct mode view | AssistantStore |
| ModeViews (8x) | Renders mode-specific UI: weather data, prayer times, search cards, calendar events | AssistantStore, mode-specific data slices |
| AnimationLayer | Framer Motion driven by FSM state — orb, waveform, subtitle overlay | AssistantStore |
| FastAPI `/api/chat` | Calls Claude with conversation history, returns JSON envelope, persists to MongoDB | Claude API, Motor |
| FastAPI `/api/weather` | Calls OpenWeatherMap, caches result, returns shaped data | OpenWeatherMap, Motor (optional cache) |
| FastAPI `/api/prayer` | Calls Aladhan for Almaty prayer times | Aladhan API |
| FastAPI `/api/calendar` | Read/write Google Calendar | Google Calendar API |
| FastAPI `/api/search` | Brave Search proxy | Brave Search API |
| FastAPI static mount | Serves Vite build output at `/`, SPA catch-all | filesystem |
| Motor / MongoDB | Conversation history (last 20), events, settings | All FastAPI routes that persist |

---

## Recommended Project Structure

```
jarvis-v1/
├── frontend/
│   ├── src/
│   │   ├── store/
│   │   │   └── assistantStore.ts       # Zustand FSM — the single source of truth
│   │   ├── engine/
│   │   │   ├── VoiceEngine.ts          # Web Speech API STT + silence detection
│   │   │   └── SpeechSynthesis.ts      # TTS wrapper, voice selection
│   │   ├── api/
│   │   │   └── client.ts              # fetch wrappers for /api/* routes
│   │   ├── modes/
│   │   │   ├── WeatherMode.tsx
│   │   │   ├── PrayerMode.tsx
│   │   │   ├── SearchMode.tsx
│   │   │   ├── CalendarMode.tsx
│   │   │   ├── BriefingMode.tsx
│   │   │   ├── ListeningMode.tsx       # Animated waveform
│   │   │   ├── ThinkingMode.tsx        # Morphing orb
│   │   │   └── SpeakingMode.tsx        # Purple wave + subtitles
│   │   ├── components/
│   │   │   └── ModeRouter.tsx         # Renders correct mode based on store
│   │   ├── animations/
│   │   │   └── variants.ts            # Framer Motion transition definitions
│   │   └── App.tsx                    # Root, PWA meta, orientation lock
│   ├── index.html
│   └── vite.config.ts
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app, lifespan, static mount
│   │   ├── routers/
│   │   │   ├── chat.py                # /api/chat — Claude + MongoDB
│   │   │   ├── weather.py             # /api/weather
│   │   │   ├── prayer.py              # /api/prayer
│   │   │   ├── calendar.py            # /api/calendar
│   │   │   └── search.py              # /api/search
│   │   ├── services/
│   │   │   ├── claude_service.py      # Claude API calls, system prompt, JSON schema
│   │   │   ├── mongo_service.py       # Motor client, conversation CRUD
│   │   │   └── http_client.py         # Shared httpx.AsyncClient (lifespan-scoped)
│   │   └── models/
│   │       └── schemas.py             # Pydantic models for all request/response
│   └── requirements.txt
├── Dockerfile                         # Multi-stage: build frontend, copy into Python image
└── docker-compose.yml                 # Local dev
```

### Structure Rationale

- **store/**: Centralizing all FSM state in one Zustand store makes mode transitions atomic and debuggable. All components are subscribers, not owners.
- **engine/**: VoiceEngine is a plain TypeScript class (not a React component) because it runs continuously and should not re-render. It communicates with the store via `setState`.
- **modes/**: Each mode is isolated — it receives only what it needs from the store. This makes phased development clean: build one mode, ship it, build the next.
- **routers/ + services/**: FastAPI routers handle HTTP concerns (validation, error codes). Services contain business logic. This lets tests mock the service layer without HTTP.
- **http_client.py**: One `httpx.AsyncClient` instance per app lifecycle (not per request). Critical for performance — connection pooling across all external API calls.

---

## Architectural Patterns

### Pattern 1: Voice FSM (Finite State Machine)

**What:** The assistant is always in exactly one state. Transitions are explicit and predictable.

**States:**
```
idle ──[user taps]──► listening ──[silence detected]──► thinking
                                                           │
                                                    [API responds]
                                                           │
                                                        speaking ──[TTS ends]──► idle
                                                           │
                                                    [mode in envelope]
                                                           │
                                                      [mode view]  (persists until next interaction)
```

**When to use:** Always for voice assistants. Single-state guarantee prevents impossible combinations (e.g., speaking + listening simultaneously).

**Trade-offs:** Slightly more setup than ad-hoc booleans. Pays off immediately when debugging Safari STT quirks.

**Implementation pattern:**
```typescript
// assistantStore.ts
type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking'
type AssistantMode = 'chat' | 'weather' | 'prayer' | 'search' | 'calendar' | 'briefing'

interface AssistantStore {
  state: AssistantState
  mode: AssistantMode
  transcript: string
  response: string
  modeData: Record<string, unknown> | null
  setState: (s: AssistantState) => void
  setMode: (m: AssistantMode, data?: Record<string, unknown>) => void
  setTranscript: (t: string) => void
  setResponse: (r: string) => void
}
```

### Pattern 2: Claude JSON Envelope for Mode Routing

**What:** Claude's response always returns a structured JSON envelope. The frontend never decides which mode to show — Claude does.

**When to use:** When LLM intelligence should drive UI state. Eliminates brittle keyword matching.

**Implementation:** Use Claude's structured outputs with `output_config.format` (type: `json_schema`). This compiles a grammar that constrains decoding — guaranteed valid JSON, no parsing errors, no retries.

```python
# claude_service.py
RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "mode": {
            "type": "string",
            "enum": ["chat", "weather", "prayer", "search", "calendar", "briefing"]
        },
        "text": {"type": "string"},          # spoken aloud by TTS
        "fetch": {
            "type": "string",
            "enum": ["weather", "prayer", "search", "calendar", "none"]
        },
        "query": {"type": "string"}          # search query if fetch == "search"
    },
    "required": ["mode", "text", "fetch"],
    "additionalProperties": False
}
```

**Schema cache note:** First request with a new schema incurs 100-300ms overhead for grammar compilation. After that, it's cached for 24 hours. Schema should be defined at module import time, not per-request.

### Pattern 3: FastAPI Proxy with Lifespan-Scoped HTTP Client

**What:** All external API calls go through FastAPI routes. One shared `httpx.AsyncClient` is created at startup and closed at shutdown.

**When to use:** Always in this architecture. Never create a new client per request — it kills connection pooling.

```python
# main.py
from contextlib import asynccontextmanager
import httpx

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http_client = httpx.AsyncClient(timeout=10.0)
    yield
    await app.state.http_client.aclose()

app = FastAPI(lifespan=lifespan)
```

**Trade-offs:** Slightly more wiring (pass client via `Request` or dependency injection). Eliminates connection overhead on every API call.

### Pattern 4: Safari STT Silence Detection Workaround

**What:** Web Speech API's `continuous` mode is unreliable on Safari/iOS. The workaround uses `interimResults` + a timer instead of relying on the `onend` event.

**When to use:** Required for Safari PWA. Chrome/desktop would work fine with `continuous = true`.

```typescript
// VoiceEngine.ts
let silenceTimer: ReturnType<typeof setTimeout>

recognition.onresult = (e) => {
  clearTimeout(silenceTimer)
  transcript = Array.from(e.results).map(r => r[0].transcript).join('')
  silenceTimer = setTimeout(() => {
    recognition.stop()
    onSilenceDetected(transcript)
  }, 1500) // 1.5s of no new results = end of utterance
}

recognition.onend = () => {
  // Safari fires onend prematurely — restart if still in listening state
  if (store.getState().state === 'listening') {
    recognition.start()
  }
}
```

**Trade-offs:** 1.5s silence threshold adds latency but is the only reliable approach on Safari. Threshold is configurable.

### Pattern 5: Optimistic State Transitions (Perceived Speed)

**What:** Transition to `thinking` state immediately when silence is detected — before the API call returns. The orb animation starts before latency is experienced by the user.

**When to use:** Always. The voice loop target is under 1.5s perceived latency. Animations during the thinking phase absorb most of the actual LLM latency.

**Latency budget for this stack:**
- STT (on-device, Safari): 0ms extra — already in transcript
- Silence detection threshold: 1.5s (configurable)
- FastAPI routing overhead: ~10ms
- Claude Sonnet 4.6 TTFB: ~400-800ms
- TTS synthesis (Web Speech API, on-device): ~50ms startup
- **Total perceived gap:** ~0.5-1.5s in thinking state

---

## Data Flow

### Voice Loop (Primary Flow)

```
User speaks
    │
    ▼
Web Speech API (onresult, interimResults)
    │  transcript builds up, silence timer resets
    ▼
Silence timer fires (1500ms no new results)
    │
    ▼
AssistantStore: state → 'thinking'
    │  AnimationLayer shows morphing orb
    ▼
fetch('/api/chat', { transcript, history })
    │
    ▼
FastAPI /api/chat
    ├── Load conversation history from MongoDB (last 20 msgs)
    ├── Call Claude API with structured output schema
    │     └── Returns JSON envelope: { mode, text, fetch, query }
    ├── Persist user message + assistant response to MongoDB
    │
    └── If envelope.fetch != 'none':
          └── Call relevant sub-API (weather/prayer/search/calendar)
              and attach data to response
    │
    ▼
Frontend receives { mode, text, fetch, data }
    │
    ▼
AssistantStore: mode → envelope.mode, modeData → envelope.data
AssistantStore: state → 'speaking', response → envelope.text
    │
    ▼
SpeechSynthesis.speak(envelope.text)
    │  AnimationLayer shows purple wave + subtitle
    ▼
TTS onend fires
    │
    ▼
AssistantStore: state → 'idle'
ModeRouter: keeps mode view visible until next interaction
```

### Mode Data Flow (Secondary Data Fetches)

```
Claude envelope: { mode: 'weather', fetch: 'weather', text: "Here's the weather..." }
    │
    ▼
FastAPI already fetched weather during /api/chat processing
    │  (single round-trip — backend fetches sub-data before responding)
    ▼
Frontend receives { mode: 'weather', data: { current, hourly, ... } }
    │
    ▼
WeatherMode renders with data immediately on mode switch
    (no second fetch required from frontend)
```

### Morning Briefing Auto-Trigger

```
Frontend: setInterval checks current time every 60s
    │
    ▼
7:00 AM local time detected
    │
    ▼
AssistantStore: state → 'thinking' (auto-triggered)
fetch('/api/briefing')
    │
    ▼
FastAPI /api/briefing:
    ├── Parallel: OpenWeatherMap + Aladhan + MongoDB (today's events)
    └── Claude generates briefing text
    │
    ▼
Response flows through same mode → speaking → idle path
```

### State Management

```
AssistantStore (Zustand — single global store)
    │
    ├── state: AssistantState     ← drives AnimationLayer
    ├── mode: AssistantMode       ← drives ModeRouter
    ├── transcript: string        ← drives subtitle in SpeakingMode
    ├── response: string          ← spoken by TTS
    └── modeData: object | null   ← consumed by active ModeView

VoiceEngine (external class, not React)
    └── calls store.setState(), store.setTranscript()

API responses
    └── call store.setMode(), store.setState('speaking')

All ModeViews
    └── useAssistantStore(s => s.modeData)  ← subscribe only to what they need
```

---

## Scaling Considerations

This is a single-user personal assistant. Scaling is not a concern. Notes below are for operational awareness only.

| Scale | Notes |
|-------|-------|
| 1 user (target) | Monolith on Railway is perfectly sized. No optimization needed. |
| If opened on 2+ devices | MongoDB shared state means conversation history is consistent across devices. No code changes needed. |
| If multi-user added later | Add user_id to all MongoDB documents. FastAPI routes already structured for this extension. |

---

## Anti-Patterns

### Anti-Pattern 1: Multiple STT Instances

**What people do:** Create a new `SpeechRecognition` object on every React render or inside a `useEffect`.

**Why it's wrong:** Safari doesn't garbage-collect these reliably. Multiple active recognizers cause microphone permission errors and ghost transcripts.

**Do this instead:** Create one `SpeechRecognition` instance in `VoiceEngine.ts` at module load time. Treat it as a singleton. Start/stop it — never recreate it.

### Anti-Pattern 2: Booleans Instead of FSM

**What people do:** `const [isListening, setIsListening] = useState(false)` + `const [isThinking, setIsThinking] = useState(false)` + `const [isSpeaking, setIsSpeaking] = useState(false)`

**Why it's wrong:** These can be simultaneously true, creating impossible UI states (e.g., orb + waveform both visible). Debug surface grows exponentially. Safari's unreliable `onend` makes this especially error-prone.

**Do this instead:** Single `state: AssistantState` enum in Zustand. Impossible combinations are impossible by construction.

### Anti-Pattern 3: Per-Request httpx Client

**What people do:** `async with httpx.AsyncClient() as client: response = await client.get(...)` inside every FastAPI route.

**Why it's wrong:** Creates a new TCP connection for every voice turn. Claude Sonnet 4.6 calls are already 400-800ms — adding TCP handshake time on top makes the 1.5s budget impossible.

**Do this instead:** Lifespan-scoped shared client (Pattern 3 above). Connection pool reuse means Claude calls start immediately.

### Anti-Pattern 4: Frontend Decides the Mode

**What people do:** Keyword matching in the frontend — `if (response.includes('weather')) setMode('weather')`.

**Why it's wrong:** Language is ambiguous. Russian + English mixed utterances break simple keyword matching. Mode logic must be updated in two places (prompt + frontend).

**Do this instead:** Claude's JSON envelope is the single source of truth for mode selection. Frontend is a dumb renderer — it reads `envelope.mode` and switches. All routing intelligence lives in the system prompt and schema.

### Anti-Pattern 5: Sequential Sub-API Fetches

**What people do:** Frontend receives Claude's response, reads `mode: 'weather'`, then makes a second fetch to `/api/weather`.

**Why it's wrong:** Two sequential round-trips. The user hears TTS start before weather data arrives, creating a flash of empty weather UI.

**Do this instead:** FastAPI fetches sub-API data during the same `/api/chat` call (before responding). The response envelope includes both the text and the mode data. Frontend renders the complete weather view immediately on mode switch.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Claude API (claude-sonnet-4-6) | httpx.AsyncClient POST, structured output JSON schema | 100-300ms schema compile on first call, then cached 24h. System prompt defines JARVIS persona. |
| OpenWeatherMap | httpx GET, Almaty hardcoded (lat: 43.2220, lon: 76.8512) | Cache response for 10 min in MongoDB to avoid rate limits |
| Aladhan Prayer Times | httpx GET, Almaty coordinates, Hanafi method | Responses are day-stable — cache in MongoDB with date key |
| Google Calendar | google-auth-oauthlib + googleapiclient; credentials stored in MongoDB as settings document | Service account or OAuth2; read + write. Most complex integration — build last. |
| Brave Search | httpx GET with X-Subscription-Token header | Returns web results; FastAPI shapes them to cards format |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| VoiceEngine ↔ AssistantStore | Direct Zustand setState calls (no React) | VoiceEngine is a plain TS class — this is intentional. Keeps STT lifecycle outside React's render cycle. |
| React components ↔ AssistantStore | Zustand `useAssistantStore` hook, selector per component | Each ModeView subscribes only to its slice — prevents unnecessary re-renders during state transitions |
| Frontend ↔ FastAPI | fetch() to same-origin `/api/*` routes — no CORS needed | Same-origin because FastAPI serves the static frontend. No preflight overhead. |
| FastAPI routes ↔ Services | Dependency injection (`Depends`) or direct import | httpx client passed via `request.app.state.http_client` |
| FastAPI ↔ MongoDB | Motor AsyncIOMotorClient — async throughout | Connection string from `MONGO_URL` env var (Railway-injected) |

---

## Build Order (Phase Dependency Graph)

The architecture has clear dependency layers. Build bottom-up.

```
Phase 1: Foundation
├── FastAPI project structure + health check
├── Vite + React scaffold, served by FastAPI
├── Docker multi-stage build working on Railway
└── MongoDB connection via Motor

Phase 2: Voice Loop Core
├── AssistantStore FSM (idle/listening/thinking/speaking)
├── VoiceEngine (STT + Safari silence detection workaround)
├── /api/chat → Claude with JSON envelope + structured outputs
├── SpeechSynthesis TTS wrapper
└── AnimationLayer (3 states: waveform, orb, wave+subtitles)
    ^ This is the critical path. Everything else is additive.

Phase 3: Mode Views (can be built in any order after Phase 2)
├── WeatherMode + /api/weather
├── PrayerMode + /api/prayer
├── SearchMode + /api/search
└── BriefingMode + /api/briefing (orchestrates weather + prayer + calendar)

Phase 4: Calendar (last — most complex OAuth flow)
└── CalendarMode + /api/calendar (read + write)

Phase 5: Polish
├── Morning briefing auto-trigger (7 AM scheduler)
├── Conversation history persistence (last 20 msgs)
├── Settings persistence in MongoDB
└── PWA manifest, apple-mobile-web-app-capable meta
```

**Why this order:**
- Phase 2 is the core product loop. If it works, JARVIS works. Everything else is mode content.
- Mode views (Phase 3) are independent after Phase 2. They can be built, tested, and shipped incrementally without blocking each other.
- Calendar (Phase 4) is last because Google OAuth is the only integration requiring multi-step credential setup. Don't let it block voice loop delivery.
- Phase 5 items are "nice to have" that don't affect the core voice experience.

---

## Sources

- [Web Speech API MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) — HIGH confidence
- [SpeechRecognition continuous property — MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/continuous) — HIGH confidence
- [Safari iOS SpeechRecognition issues — WebKit/Documentation #120](https://github.com/WebKit/Documentation/issues/120) — HIGH confidence (known platform bug)
- [Claude Structured Outputs — Anthropic Docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) — HIGH confidence
- [FastAPI Async / httpx Best Practices — orchestrator.dev 2025](https://orchestrator.dev/blog/2025-1-30-fastapi-production-patterns/) — MEDIUM confidence
- [HTTPX AsyncClient with FastAPI lifespan — Medium](https://medium.com/@benshearlaw/how-to-use-httpx-request-client-with-fastapi-16255a9984a4) — MEDIUM confidence
- [FastAPI Static Files — Official Docs](https://fastapi.tiangolo.com/tutorial/static-files/) — HIGH confidence
- [Voice AI Pipeline Latency Budget — Chanl Blog](https://www.channel.tel/blog/voice-ai-pipeline-stt-tts-latency-budget) — MEDIUM confidence
- [Taming the Web Speech API (Safari workarounds)](https://webreflection.medium.com/taming-the-web-speech-api-ef64f5a245e1) — MEDIUM confidence
- [React State Management 2025 — Makers Den](https://makersden.io/blog/react-state-management-in-2025) — MEDIUM confidence

---
*Architecture research for: AI Voice Assistant PWA (JARVIS)*
*Researched: 2026-04-08*

# Technology Stack

**Project:** JARVIS — AI Voice Assistant PWA
**Researched:** 2026-04-08
**Target:** iPad Safari (landscape), standalone PWA

---

## Recommended Stack

### Frontend Core

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 19.x (latest: 19.2.1) | UI framework | Stable, Hooks-mature, required by Motion/other libs |
| Vite | 6.x | Build tool + dev server | Native ESM, fastest HMR, excellent PWA plugin |
| TypeScript | 5.x | Type safety | Catches audio state bugs early; worth the overhead |
| vite-plugin-pwa | Latest (0.21.x) | PWA manifest + service worker | Zero-config Workbox integration; standard for Vite PWA |

### Animation & UI

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| motion | 12.x (was framer-motion) | Mode transitions, wave animations | Package renamed from `framer-motion` to `motion`; import from `motion/react`. Same API, but `framer-motion` is no longer actively developed. Use `motion` |
| TailwindCSS | 4.x | Utility styling, glassmorphism | v4 has first-class `backdrop-blur` / `backdrop-filter` support needed for glassmorphism. Eliminates custom CSS for 90% of the UI |
| Canvas API | Native browser | Particle orb (thinking mode), sound wave (listening mode) | Built-in, zero dependency. iPad Safari supports `requestAnimationFrame` but has documented frame-time variance (~70ms/frame on iPad 10). Keep particle count low (<200) |

### Voice I/O — CRITICAL SECTION

| Technology | Version | Purpose | Why / Caveats |
|------------|---------|---------|-----|
| MediaRecorder API | Native browser | Capture microphone audio | **Use this instead of SpeechRecognition.** Works in Safari PWA standalone mode. Safari records as `audio/mp4` (not `audio/webm`) |
| Deepgram Streaming API | WebSocket (via backend proxy) | Real-time STT with Russian + English | Works via WebSocket relayed through FastAPI backend. Avoids CORS and exposes no API key client-side. Supports both `ru` and `en` natively. Sub-300ms latency |
| Web Speech API (SpeechSynthesis) | Native browser | TTS (voice output) | SpeechSynthesis **does work** in Safari PWA standalone; SpeechRecognition does **not**. Use SpeechSynthesis for all voice output |

**DO NOT USE:** `window.SpeechRecognition` / `webkitSpeechRecognition` for the primary STT path. This API is broken in standalone PWA mode on iPadOS — the API may be detectable but audio is never captured. Multiple developers have confirmed this is a WebKit limitation, not a configuration issue.

**Safari audio format gotcha:** Safari's `MediaRecorder` outputs `audio/mp4`, not `audio/webm`. OpenAI Whisper has documented problems with Safari's mp4 output (wrong transcriptions). Deepgram handles `audio/mp4` correctly. If using Whisper as a fallback, convert to wav on the backend first.

### State Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zustand | 5.x | Global app state (mode, conversation, voice loop) | ~1KB gzipped, no Provider wrapper, hook-native. Redux is overkill for a single-user app with ~5 global states. React Context would cause excessive re-renders in the voice loop |

### Backend Core

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Python | 3.12 | Runtime | 3.12 recommended for FastAPI in 2026; longer support window, best performance |
| FastAPI | 0.135.3 | API server + static file server | Async-native, serves React static build via `StaticFiles`, validates with Pydantic v2 |
| Uvicorn | 0.29.x | ASGI server | Standard for FastAPI; use with `--workers 1` in single-container Railway deployment |
| Pydantic | 2.x | Request/response validation | Bundled with FastAPI 0.100+; v2 is 5-50x faster than v1 |

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| MongoDB | 7.0 (Railway plugin) | Conversations, events, settings | Flexible schema suits conversation history (variable message shapes). Railway plugin auto-injects `MONGO_URL` |
| PyMongo Async (`AsyncMongoClient`) | 4.x (latest: 4.10.x) | Async MongoDB driver | **Use this instead of Motor.** Motor was deprecated May 14, 2025. Motor reaches end-of-life May 14, 2026. PyMongo Async is the official replacement, same API, better latency (true asyncio vs thread pool delegation) |

**DO NOT USE:** `motor` for new projects. It is officially deprecated. The migration is a near-drop-in: replace `MotorClient` with `AsyncMongoClient` from `pymongo`. `AsyncMongoClient` is not thread-safe — it must only be used from a single asyncio event loop (which is the case in a single-worker Uvicorn deployment).

### External API Integrations (Backend)

| Service | SDK / Method | Notes |
|---------|-------------|-------|
| Anthropic Claude | `anthropic` Python SDK 0.91.0 | Use `AsyncAnthropic` client for non-blocking FastAPI routes; streaming via SSE |
| Deepgram | WebSocket relay in FastAPI | Backend opens WebSocket to Deepgram, relays audio from client; hides API key |
| OpenWeatherMap | `httpx` (async HTTP) | Simple REST call; no official SDK needed |
| Aladhan Prayer Times | `httpx` | Free REST API, no auth |
| Google Calendar | `google-api-python-client` + `google-auth` | OAuth2 for calendar read/write; service account recommended for single-user |
| Brave Search | `httpx` | REST API with `X-Subscription-Token` header |

### Deployment

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Docker | Latest (python:3.12-slim base) | Container | `python:3.12-slim` minimizes image size. Multi-stage: build React in Node, copy dist into Python image |
| Railway | — | Hosting + MongoDB plugin | Auto-injects `PORT`, `MONGO_URL`; zero-config TLS |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| STT | Deepgram (via backend WebSocket) | Web Speech API SpeechRecognition | **Broken in iPadOS standalone PWA.** Not a Safari bug that will be fixed soon — fundamental WebKit architecture limitation |
| STT | Deepgram | OpenAI Whisper API | Whisper has documented problems with Safari's `audio/mp4` output format; Deepgram handles it correctly |
| MongoDB driver | PyMongo Async (`AsyncMongoClient`) | Motor | Motor officially deprecated May 2025, EOL May 2026 |
| Animation | motion (`motion/react`) | framer-motion | `framer-motion` package is no longer maintained; `motion` is the rename |
| Animation | motion | GSAP | GSAP is better for timeline animations; motion has better React integration and declarative API for the mode-switching use case here |
| State | Zustand | Redux Toolkit | Redux is overkill for a single-user, ~5-state app; Zustand is lighter and hook-native |
| State | Zustand | React Context | Context triggers full-tree re-renders; voice loop state changes frequently |
| Styling | TailwindCSS | CSS Modules | Tailwind v4 has direct glassmorphism utilities; less switching context for a UI-heavy project |
| Runtime | Python 3.12 | Python 3.11 | Both work; 3.12 preferred for longer support horizon |

---

## Installation

### Frontend

```bash
# Create project
npm create vite@latest jarvis-frontend -- --template react-ts

# Core
npm install motion zustand

# PWA
npm install -D vite-plugin-pwa

# Styling
npm install tailwindcss @tailwindcss/vite
```

### Backend

```bash
# Core
pip install fastapi==0.135.3 uvicorn[standard] pydantic-settings

# Database — use PyMongo Async, NOT motor
pip install "pymongo[srv]>=4.10"

# AI / External
pip install anthropic httpx google-api-python-client google-auth
```

### Docker (python:3.12-slim)

```dockerfile
# Stage 1: Build frontend
FROM node:20-slim AS frontend
WORKDIR /app
COPY frontend/ .
RUN npm ci && npm run build

# Stage 2: Backend + static
FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
COPY --from=frontend /app/dist ./static
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "${PORT:-8000}"]
```

---

## Version Confidence Summary

| Component | Version | Confidence | Source |
|-----------|---------|------------|--------|
| React | 19.2.1 | HIGH | react.dev official releases |
| Vite | 6.x | HIGH | vite.dev official releases |
| FastAPI | 0.135.3 | HIGH | pypi.org/project/fastapi verified |
| anthropic SDK | 0.91.0 | HIGH | pypi.org/project/anthropic verified |
| motion (Framer) | 12.x | HIGH | motion.dev official, npm |
| PyMongo Async | 4.10.x | MEDIUM | MongoDB docs + deprecation notice verified |
| Motor deprecation | — | HIGH | pypi.org/project/motor: EOL May 2026 confirmed |
| SpeechRecognition broken in PWA | — | HIGH | Multiple developer reports + WebKit issue tracker |
| Deepgram iPad Safari | MEDIUM | MEDIUM | WebSocket-based approach documented; not tested on iPadOS PWA specifically in research |
| TailwindCSS v4 glassmorphism | HIGH | HIGH | Official Tailwind docs |

---

## Critical Risks

### Risk 1: STT in Standalone PWA — HIGH SEVERITY

`SpeechRecognition` does not function in iPadOS standalone (home screen) PWA mode. This is not a configuration issue. The approach:

1. Use `MediaRecorder` to capture raw audio chunks
2. Stream chunks over WebSocket to FastAPI backend
3. Backend relays to Deepgram's streaming API
4. Return transcript text over a response WebSocket or SSE

This adds one extra API dependency (Deepgram) and a backend WebSocket relay, but it is the only reliable cross-mode approach for the target device.

### Risk 2: Motor Deprecation — MEDIUM SEVERITY

If Motor is used today, it will reach end-of-life before this project's expected lifespan. Start with PyMongo Async. Migration later is a find-and-replace, but avoiding the debt is better.

### Risk 3: Canvas Particle Performance on iPad — LOW SEVERITY

iPad 10 Safari has documented ~70ms per-frame paint times. Keep particle count below 150 in the thinking-mode orb. Use `requestAnimationFrame`, avoid per-frame style recalculation, and test on the actual target device early.

---

## Sources

- React versions: https://react.dev/versions
- Vite releases: https://vite.dev/releases
- FastAPI PyPI: https://pypi.org/project/fastapi/
- anthropic PyPI: https://pypi.org/project/anthropic/
- Motor deprecation: https://pypi.org/project/motor/ + https://www.mongodb.com/docs/drivers/motor/
- PyMongo Async FastAPI integration: https://www.mongodb.com/docs/languages/python/pymongo-driver/current/integrations/fastapi-integration/
- Motion (formerly Framer Motion): https://motion.dev + https://www.npmjs.com/package/motion
- vite-plugin-pwa: https://github.com/vite-pwa/vite-plugin-pwa
- SpeechRecognition broken in iOS PWA: https://github.com/WebKit/Documentation/issues/120 + https://discussions.apple.com/thread/255492924
- iOS STT workaround (MediaRecorder): https://www.xjavascript.com/blog/add-ios-speech-recognition-support-for-web-app/
- Deepgram WebSocket streaming: https://deepgram.com/learn/live-transcription-mic-browser
- Safari audio/mp4 + Whisper problem: https://community.openai.com/t/whisper-problem-with-audio-mp4-blobs-from-safari/322252
- Canvas performance on iPad: https://developer.apple.com/forums/thread/768404
- TailwindCSS glassmorphism: https://tailwindcss.com/docs/backdrop-filter-blur
- Zustand state management 2025: https://medium.com/@mernstackdevbykevin/state-management-in-2025-why-developers-are-ditching-redux-for-zustand-and-react-query-b5ecad4ff497
- PWA iOS limitations 2026: https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide

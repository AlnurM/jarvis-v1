<!-- GSD:project-start source:PROJECT.md -->
## Project

**JARVIS — AI Voice Assistant**

A full-screen PWA voice assistant for iPad (Safari, landscape). The user speaks, JARVIS listens, thinks, and responds with voice + rich visual feedback across 8 specialized modes. Personal assistant for a single user in Almaty, Kazakhstan — supports Russian and English with auto-detection.

**Core Value:** Voice in → intelligent response out, with the right visual mode automatically selected. The voice loop (listen → think → speak) must feel seamless and fast.

### Constraints

- **Tech stack**: React + Vite frontend, Python FastAPI backend — specified by user
- **Deployment**: Railway monolith with Docker — single container serves everything
- **Device**: iPad Safari landscape — must work flawlessly in this specific environment
- **APIs**: Claude (claude-sonnet-4-6), OpenWeatherMap, Aladhan, Google Calendar, Brave Search — all specified
- **Database**: MongoDB via Motor — async driver required for FastAPI
- **No auth**: Single user, no login flow — simplifies architecture significantly
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

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
## Installation
### Frontend
# Create project
# Core
# PWA
# Styling
### Backend
# Core
# Database — use PyMongo Async, NOT motor
# AI / External
### Docker (python:3.12-slim)
# Stage 1: Build frontend
# Stage 2: Backend + static
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
## Critical Risks
### Risk 1: STT in Standalone PWA — HIGH SEVERITY
### Risk 2: Motor Deprecation — MEDIUM SEVERITY
### Risk 3: Canvas Particle Performance on iPad — LOW SEVERITY
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## Design Compliance

**MANDATORY:** Before implementing any UI component or mode, read `design.md` and cross-reference the Stitch screens. After implementation, verify:

1. **Design tokens match** — colors, typography (Inter + Space Grotesk), surface hierarchy, glassmorphism rules
2. **No-Line Rule enforced** — no 1px borders for sectioning; use background shifts, luminous depth, or backdrop blur
3. **Stitch screen fidelity** — compare implemented UI against the Stitch screen for that mode (IDs in `design.md`). Layout, spacing, colors, and animations must match
4. **Nothing missing** — every visual element from the Stitch screen is accounted for; no shortcuts or omissions
5. **Custom easing** — use `cubic-bezier(0.22, 1, 0.36, 1)` not standard 400ms easing
6. **Text colors** — never use pure white (#FFFFFF) for body text; use `on-surface-variant` (#adaaaa)

If a Stitch screen exists for the mode being built, it is the source of truth. Code that doesn't match the design is not done.

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

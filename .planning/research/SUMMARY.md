# Project Research Summary

**Project:** JARVIS — AI Voice Assistant PWA
**Domain:** AI voice assistant, iPad Safari PWA, single-user personal tool
**Researched:** 2026-04-08
**Confidence:** HIGH (stack and pitfalls), MEDIUM (architecture edge cases)

## Executive Summary

JARVIS is a personal AI voice assistant built as a Progressive Web App targeting iPad Safari in landscape mode. The core design challenge is not the AI integration — it is the Safari PWA environment, which silently breaks the standard Web Speech API for speech recognition in standalone (home screen) mode. This is not a bug that will be fixed soon; it is a deliberate WebKit architecture decision. The research is unanimous: the voice input pipeline must be built on `MediaRecorder` + a backend STT service (Deepgram, which handles Safari's `audio/mp4` format correctly), with `SpeechSynthesis` used for output where it works, but defended with multiple iOS-specific workarounds.

The recommended architecture is a React + Vite frontend deployed as a static SPA served by a FastAPI backend in a single Docker container on Railway. Claude drives mode routing via a structured JSON envelope — the frontend is a "dumb renderer" that switches between 8 specialized full-screen views based on what Claude returns. State is managed as a finite state machine via Zustand with exactly one active state at all times, preventing impossible UI combinations that are especially risky given Safari's unreliable audio event sequencing. All external APIs (weather, prayer times, search, calendar) are proxied through FastAPI, which keeps API keys server-side and enables the single round-trip pattern where Claude's response and the mode-specific data arrive together.

The biggest risks are concentrated in Phase 1 and Phase 2: Safari's STT constraints must be validated on the real target device from the very first voice sprint, and the Claude JSON envelope must be designed for streaming from the start — buffering the full JSON response before starting TTS adds 2-3 seconds of unnecessary latency that destroys the voice loop experience. Every other risk has a known, implementable mitigation documented in the pitfalls research.

---

## Key Findings

### Recommended Stack

The stack is a TypeScript/Python monolith with a deliberate bias toward "least new technology" — most choices are the obvious stable pick for their category, with two notable forced decisions due to Safari PWA constraints.

The Safari STT constraint forces Deepgram over Whisper (Deepgram handles Safari's `audio/mp4` correctly; Whisper has documented transcription failures with it) and forces MediaRecorder over the Web Speech API SpeechRecognition. The Motor-to-PyMongo-Async migration is a one-time forced deprecation; Motor is EOL May 2026 and must not be used for new code. Everything else is a straightforward recommendation.

**Core technologies:**
- React 19 + Vite 6 + TypeScript 5: frontend framework — stable, required by Motion library, best HMR for iPad debug cycle
- motion 12.x (import from `motion/react`, NOT `framer-motion`): animations — package renamed; `framer-motion` is no longer maintained
- TailwindCSS 4.x: styling — v4 has first-class `backdrop-filter` support needed for glassmorphism
- Zustand 5.x: state — lightweight FSM for ~5 global states; Context causes excessive re-renders in the voice loop
- vite-plugin-pwa: PWA manifest + service worker — zero-config Workbox integration
- FastAPI 0.135.3 + Python 3.12 + Uvicorn: backend — async-native, serves React static build, Railway-compatible
- PyMongo Async (AsyncMongoClient) 4.10.x: database driver — Motor is deprecated (EOL May 2026); this is the official replacement
- MongoDB 7.0 (Railway plugin): storage — flexible schema suits conversation history
- Deepgram (WebSocket via backend relay): STT — handles `audio/mp4`, sub-300ms latency, bilingual ru+en
- Web Speech API SpeechSynthesis: TTS — works in Safari PWA with workarounds; no backend dependency
- Anthropic Claude claude-sonnet-4-6: AI core — structured outputs for guaranteed JSON envelope
- Docker multi-stage build (Node + python:3.12-slim): deployment — Railway auto-injects PORT and MONGO_URL

### Expected Features

The feature set has a clear two-tier structure. The voice loop (STT + FSM + Claude + TTS + 3 core visual states) is the product. Everything else is mode content layered on top after the loop is proven. The feature dependency graph makes this non-negotiable: Weather mode and Prayer Times mode require the core loop; Search and Calendar require the core loop; Morning Briefing requires all of the above.

**Must have (table stakes — v1):**
- MediaRecorder + Deepgram STT (backend relay) — gates everything; Safari PWA constraint
- Energy/timer-based VAD silence detection — user needs to know when to stop; can't use Web Speech API's built-in
- Claude integration with JSON envelope mode routing — the intelligence core; drives all mode switching
- SpeechSynthesis TTS with iOS quirk workarounds — voice output; workarounds are well-documented
- Listening mode (animated waveform), Thinking mode (animated orb), Speaking mode (wave + subtitles)
- Conversation history (last 20 turns, MongoDB) — context quality
- Weather mode (Almaty, OpenWeatherMap) — first specialized mode, high value
- Prayer Times mode (Aladhan, Almaty, countdown) — high personal value, trivial API (free, no auth)

**Should have (v1.x — after core loop validated):**
- Search mode (Brave Search, glassmorphism cards)
- Calendar read events (Google Calendar, OAuth2 setup deferred until core is stable)
- Voice event creation (NL parsing by Claude; validate Calendar read first)
- Morning Briefing mode (composite: weather + calendar + Claude text; requires both)
- Tap-to-interrupt TTS (quality of life, add when Speaking mode is stable)

**Defer to v2+:**
- Wake word detection — technically blocked by Safari PWA constraints; Apple does not expose continuous microphone access
- Push notifications — Safari 18.4+ supports Declarative Web Push but setup is non-trivial infrastructure
- Additional cities / location switching — hardcoded Almaty serves the use case
- Offline-cached prayer times — marginal value

### Architecture Approach

The architecture is a monolith with a clean internal layer boundary: the frontend is a pure FSM renderer, the backend is a proxy hub. The Zustand store holds exactly one `AssistantState` at any time (`idle | listening | thinking | speaking`) and one `AssistantMode` (`chat | weather | prayer | search | calendar | briefing`). The VoiceEngine is a plain TypeScript class (not a React component) to keep the microphone lifecycle outside React's render cycle. FastAPI handles all external API calls server-side in a single `/api/chat` round-trip, attaching mode-specific data to the Claude response before returning — this eliminates the two-round-trip pattern that would cause a flash of empty mode UI.

**Major components:**
1. VoiceEngine (TypeScript class) — MediaRecorder audio capture, WebSocket relay to backend Deepgram proxy, silence detection via energy/timer; calls Zustand store directly, never re-renders
2. AssistantStore (Zustand) — single FSM; drives all UI; prevents impossible state combinations
3. ModeRouter (React) — reads `mode` from store, renders one of 8 mode views with AnimationLayer transitions
4. FastAPI `/api/chat` — receives transcript, loads history, calls Claude with structured output schema, fetches sub-API data if needed, returns combined envelope; single round-trip
5. FastAPI WebSocket proxy — relays audio chunks from MediaRecorder to Deepgram streaming API; returns transcript text
6. MongoDB (PyMongo Async) — conversation history (last 20), mode data cache, settings

### Critical Pitfalls

1. **SpeechRecognition silently fails in standalone PWA mode** — use MediaRecorder + Deepgram backend relay instead; test on real iPad in standalone mode from day one of voice implementation
2. **Claude JSON envelope blocks streaming, adding 2-3s latency** — use Claude structured outputs with streaming and partial JSON parsing to begin TTS as soon as the `text` field tokens arrive; do not buffer the full JSON before starting TTS
3. **AudioContext permanently suspended until user gesture** — unlock via `audioContext.resume()` in the first tap handler; maintain a singleton; morning briefing auto-trigger cannot produce audio on a cold load without prior user interaction
4. **speechSynthesis quirks (empty voice list, cancel fires onerror, background suspension)** — poll getVoices() every 250ms; treat `error.error === 'interrupted'` as non-error; add visibility change watchdog that cancels and resets TTS queue on foreground resume
5. **Railway container sleep kills first-request voice latency** — send a health-check ping from frontend on app load to wake the container; use always-on Railway plan; initialize MongoDB connection at startup, not on first request

---

## Implications for Roadmap

Based on the combined research, 5 phases are recommended. The dependency graph is strict through Phase 2 (voice loop); Phases 3-4 are additive and can be partially parallelized.

### Phase 1: Project Foundation + Infrastructure
**Rationale:** Nothing can be built or tested without working deployment. The multi-stage Docker build, Railway setup, MongoDB connection, and FastAPI static file serving are prerequisites for every phase. PWA manifest and safe-area CSS must be established now — retrofitting fullscreen layout is painful.
**Delivers:** Working deployment pipeline; FastAPI health check; React scaffold served from FastAPI; MongoDB connection via PyMongo Async; PWA manifest with `apple-mobile-web-app-status-bar-style: black-translucent`; Docker multi-stage build passing on Railway
**Avoids:** Motor deprecation debt (use PyMongo Async from the start); Railway cold-start latency (health-check ping established early); PWA status bar layout issues (safe area insets from day one)
**Research flag:** Standard patterns — skip research-phase

### Phase 2: Voice Loop Core (Critical Path)
**Rationale:** This is the entire product. If the voice loop works, JARVIS works. All 8 modes are additive after this. This phase must be built and validated on the real target iPad in standalone mode before anything else — the STT constraint can invalidate the entire architecture if discovered late.
**Delivers:** MediaRecorder audio capture; WebSocket relay to Deepgram; energy/timer-based VAD silence detection; Zustand FSM (idle/listening/thinking/speaking); Claude `/api/chat` with structured JSON envelope and streaming; SpeechSynthesis TTS with iOS workarounds (voice polling, cancel guard, visibility watchdog); Listening + Thinking + Speaking mode animations; conversation history in MongoDB
**Addresses:** P1 features — STT, VAD, Claude routing, TTS, 3 core visual modes, conversation memory
**Avoids:** SpeechRecognition standalone failure; JSON buffering latency; AudioContext suspension; speechSynthesis quirks
**Research flag:** Needs research-phase — Deepgram WebSocket relay in FastAPI on iPadOS PWA not confirmed end-to-end; partial JSON streaming with Claude structured outputs needs implementation validation

### Phase 3: Information Modes (Weather + Prayer Times)
**Rationale:** These are the two lowest-complexity specialized modes with the highest personal value. Both use simple REST APIs (no OAuth, no auth for Aladhan). Build them after the voice loop is stable. They validate the full mode switching pipeline with minimal integration risk.
**Delivers:** WeatherMode + `/api/weather` (OpenWeatherMap, Almaty hardcoded, 10-min cache); PrayerMode + `/api/prayer` (Aladhan, Almaty, countdown to next prayer, all 5 prayers); full mode switching animation confirmed working end-to-end
**Addresses:** P1 features — Weather mode, Prayer Times mode
**Avoids:** Sequential sub-API fetch pattern (data arrives with Claude response in single round-trip)
**Research flag:** Standard patterns — skip research-phase

### Phase 4: Search + Calendar + Morning Briefing
**Rationale:** These three modes form a natural second tier. Search is low-complexity (Brave Search REST, no OAuth). Calendar is the most complex integration (Google OAuth2 offline flow) and is deferred until the core loop is proven. Morning Briefing is composite — requires both Weather and Calendar working.
**Delivers:** SearchMode + `/api/search` (Brave Search, glassmorphism card grid, Claude summary); CalendarMode + `/api/calendar` (Google Calendar OAuth2, read events, voice event creation via Claude NL parsing); BriefingMode + `/api/briefing` (parallel weather + prayer + calendar fetch, Claude-generated briefing text, 7AM auto-trigger via setInterval + visibility check)
**Addresses:** P2 features — Search, Calendar read, voice event creation, Morning Briefing
**Avoids:** Google OAuth token refresh failure (pre-authorize offline, store refresh token in Railway env var); Morning Briefing AudioContext suspension (show visual prompt if no prior user gesture)
**Research flag:** Needs research-phase for Calendar — Google OAuth offline flow + Railway env var token storage needs step-by-step validation

### Phase 5: Polish + Hardening
**Rationale:** Quality-of-life features and edge case handling that make the voice loop feel production-quality. These do not change the architecture but fill in gaps identified during earlier phases.
**Delivers:** Tap-to-interrupt TTS (cancel guard implemented); animation performance tuning (GPU-composited CSS for waveform, profiled on real iPad); Canvas particle count validated below 150 for thinking orb; SSE keepalive heartbeat if streaming used; settings persistence in MongoDB; Railway always-on plan confirmed
**Avoids:** Framer Motion iOS jank (offload to CSS transforms); Railway sleep on first request; Canvas frame-time variance on iPad 10
**Research flag:** Standard patterns — skip research-phase

### Phase Ordering Rationale

- Phase 1 before everything: no infrastructure means no testable surface on the target device
- Phase 2 is the only non-negotiable order constraint: voice loop must be proven before building mode content; the STT constraint is a potential project-stopper and must be validated early
- Phase 3 before Phase 4: Weather and Prayer Times are required by Morning Briefing; also serves as low-risk mode switching validation before OAuth complexity of Calendar
- Phase 5 after all features: polish applied to a complete system, not a moving target
- Calendar is intentionally last within Phase 4: OAuth setup is a one-time cost best paid when the rest of the system is stable

### Research Flags

Phases needing deeper research during planning:
- **Phase 2 (Voice Loop):** Deepgram WebSocket relay in FastAPI on iPadOS standalone PWA not confirmed end-to-end in research; partial JSON streaming with Claude structured outputs needs an implementation prototype
- **Phase 4 (Calendar):** Google OAuth2 offline flow + Railway env var token storage needs explicit step-by-step validation; token refresh simulation should be part of the sprint plan

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Docker multi-stage + Railway + FastAPI static serving + PyMongo Async lifespan — all verified with official sources
- **Phase 3 (Weather + Prayer):** Simple REST APIs, no auth, standard FastAPI proxy pattern
- **Phase 5 (Polish):** Known iOS quirks are all documented with specific code patterns in PITFALLS.md

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All major version decisions verified against official sources (PyPI, npm, official docs); Motor deprecation confirmed; SpeechRecognition standalone failure confirmed via WebKit bug tracker |
| Features | HIGH | Safari PWA SpeechRecognition constraint confirmed via caniuse.com; feature prioritization grounded in confirmed API capabilities and known iOS constraints |
| Architecture | HIGH (patterns) / MEDIUM (edge cases) | FSM, JSON envelope, lifespan-scoped HTTP client are well-established patterns; Deepgram WebSocket relay on iPadOS PWA is documented but not confirmed on the exact target environment |
| Pitfalls | HIGH | Majority backed by WebKit bug tracker entries, Apple Developer Forum threads, and official MongoDB deprecation announcements |

**Overall confidence:** HIGH

### Gaps to Address

- **Deepgram WebSocket relay on iPadOS standalone PWA:** Research confirms the approach is sound but no source confirms end-to-end testing on this exact combination. Validate in Phase 2 sprint 1 before building mode views.
- **Partial JSON streaming with Claude structured outputs:** Architecturally clear but the exact implementation needs a prototype before committing. Two-phase call (fast mode detection + streaming text) is the documented fallback if partial parsing proves too complex.
- **Russian VAD silence threshold:** The 1.5s silence timer is the recommended default, but Russian words are longer on average. Threshold may need tuning to 2.0s. Validate with real Russian speech in Phase 2.
- **Deepgram Russian transcription accuracy:** Confirmed to handle `audio/mp4` format; Russian transcription accuracy on Deepgram has not been independently benchmarked. Test early with representative Russian utterances.

---

## Sources

### Primary (HIGH confidence)
- https://bugs.webkit.org/show_bug.cgi?id=225298 — SpeechRecognition blocked in standalone PWA (WebKit bug)
- https://caniuse.com/speech-recognition — SpeechRecognition availability confirmation
- https://pypi.org/project/motor/ — Motor deprecation announcement
- https://www.mongodb.com/docs/drivers/motor/ — Motor EOL timeline
- https://www.mongodb.com/docs/languages/python/pymongo-driver/current/integrations/fastapi-integration/ — PyMongo Async + FastAPI
- https://pypi.org/project/fastapi/ — FastAPI 0.135.3 version
- https://pypi.org/project/anthropic/ — anthropic SDK 0.91.0
- https://react.dev/versions — React 19.x
- https://motion.dev — motion 12.x (formerly framer-motion)
- https://tailwindcss.com/docs/backdrop-filter-blur — TailwindCSS v4 glassmorphism
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs — Claude structured outputs schema
- https://platform.claude.com/docs/en/build-with-claude/streaming — Claude streaming

### Secondary (MEDIUM confidence)
- https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide — PWA iOS 2026 constraints overview
- https://deepgram.com/learn/live-transcription-mic-browser — Deepgram WebSocket streaming pattern
- https://community.openai.com/t/whisper-problem-with-audio-mp4-blobs-from-safari/322252 — Whisper + Safari audio/mp4 failures
- https://developer.apple.com/forums/thread/723503 — speechSynthesis getVoices() Safari quirk
- https://developer.apple.com/forums/thread/49875 — TTS backgrounding issues on iOS
- https://webreflection.medium.com/taming-the-web-speech-api-ef64f5a245e1 — Safari Web Speech API workarounds
- https://weboutloud.io/bulletin/speech_synthesis_in_safari/ — speechSynthesis Safari state
- https://picovoice.ai/blog/complete-guide-voice-activity-detection-vad/ — VAD approaches
- https://livekit.com/blog/turn-detection-voice-agents-vad-endpointing-model-based-detection — utterance end detection patterns
- https://developer.apple.com/forums/thread/768404 — Canvas performance on iPad

### Tertiary (LOW confidence)
- https://www.framer.community/c/support/really-slow-motion-in-ios — Framer Motion iOS jank (community report, not benchmarked)
- https://medium.com/@developer_89726/dark-glassmorphism-the-aesthetic-that-will-define-ui-in-2026-93aa4153088f — glassmorphism aesthetic direction

---
*Research completed: 2026-04-08*
*Ready for roadmap: yes*

# Phase 2: Voice Loop Core - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the complete voice loop: user taps → microphone captures audio → backend transcribes (STT) → Claude generates response with mode routing → TTS speaks response with visual feedback. Three core visual modes (Listening, Thinking, Speaking) with animated transitions. Conversation history persisted to MongoDB. This is the entire product in its simplest form.

</domain>

<decisions>
## Implementation Decisions

### STT (Speech-to-Text)
- **D-01:** Use MediaRecorder API to capture audio on frontend (Safari PWA compatible — Web Speech API SpeechRecognition is broken in standalone PWA mode)
- **D-02:** Backend relays audio to Deepgram via WebSocket for real-time transcription (not Whisper — Deepgram handles Safari's audio/mp4 format correctly, sub-300ms latency)
- **D-03:** FastAPI WebSocket endpoint `/api/ws/transcribe` receives audio chunks from frontend, relays to Deepgram, returns transcript
- **D-04:** Deepgram configured for both Russian and English (auto-detect language per utterance)

### Voice Activity Detection (VAD)
- **D-05:** Frontend-side silence detection using audio energy analysis from MediaRecorder stream
- **D-06:** 1.5-2 second silence threshold triggers end-of-speech (may need tuning for Russian speech patterns)
- **D-07:** Visual indicator (waveform goes flat) when silence detection triggers

### TTS (Text-to-Speech)
- **D-08:** Use Web Speech API SpeechSynthesis (works in Safari PWA standalone mode — only STT is broken)
- **D-09:** Voice selection: prefer Russian voice (e.g., Milena) on iOS, best available English voice as fallback
- **D-10:** Polling workaround for Safari getVoices() quirk (returns empty on first call, needs retry loop at 250ms intervals up to 2s)
- **D-11:** User can tap anywhere to interrupt/stop TTS mid-speech via speechSynthesis.cancel()

### Voice State Machine (FSM)
- **D-12:** Zustand store manages a single `voiceState` field: `'idle' | 'listening' | 'thinking' | 'speaking'` — NO boolean flags
- **D-13:** State transitions are strictly ordered: idle → listening → thinking → speaking → idle (or back to listening)
- **D-14:** Only one state active at a time — prevents impossible UI combinations
- **D-15:** Tap-to-speak triggers idle → listening. Silence detection triggers listening → thinking. API response triggers thinking → speaking. TTS end triggers speaking → idle.

### Claude Integration
- **D-16:** Claude API via Anthropic Python SDK (`AsyncAnthropic`), model: claude-sonnet-4-6
- **D-17:** Structured JSON output using Claude's `output_config.format` with `type: json_schema` for guaranteed valid JSON (no parse errors, no retries)
- **D-18:** JSON envelope schema: `{ mode: "search|weather|prayer|calendar|briefing|speak", text: "spoken response text", data: {} }`
- **D-19:** Backend fetches all sub-API data during the same `/api/chat` call — frontend never does a second fetch after receiving the mode
- **D-20:** System prompt sets JARVIS persona: concise (2-3 sentences for general queries), helpful, responds in user's detected language (ru/en)

### Conversation History
- **D-21:** Last 20 messages maintained in memory per session
- **D-22:** Full conversation history persisted to MongoDB `conversations` collection
- **D-23:** Each conversation has a session ID, messages array with role/content/timestamp
- **D-24:** Claude receives conversation history for context-aware follow-up responses

### Listening Mode (Visual)
- **D-25:** Dark background #0a0a0a with animated sound wave in electric blue #00d4ff
- **D-26:** Canvas API with Web Audio API AnalyserNode for audio-reactive waveform visualization
- **D-27:** "Listening..." text faded below wave
- **D-28:** No other UI elements visible — fully immersive

### Thinking Mode (Visual)
- **D-29:** Evolve existing OrbAnimation.tsx from Phase 1 for thinking state
- **D-30:** Color transitions blue → purple during thinking
- **D-31:** No text displayed — pure animation
- **D-32:** Activates immediately when silence detection triggers (listening → thinking transition)

### Speaking Mode (Visual)
- **D-33:** Wave animation in purple/violet #9b59b6
- **D-34:** AI response text as subtitles at bottom (max 2 lines visible at a time)
- **D-35:** Subtitle text fades in synchronized with speech progress
- **D-36:** Tap anywhere stops TTS and returns to idle state

### Mode Transitions
- **D-37:** Framer Motion (motion package) for animated transitions between modes
- **D-38:** Custom easing cubic-bezier(0.22, 1, 0.36, 1) per design.md — no standard 400ms easing
- **D-39:** Fallback to Speaking mode (text only) if Claude JSON parse fails somehow

### Claude's Discretion
- Exact WebSocket message format for audio streaming
- Deepgram API configuration details (sample rate, encoding, model)
- Exact Canvas waveform rendering algorithm (sine wave, frequency bars, etc.)
- Subtitle text animation timing details
- Conversation session management (when to start a new session vs continue)
- FastAPI router structure (single file vs routers/ directory)

### Folded Todos
None

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `design.md` — Full design system including per-mode UI details, the "AI Pulse" orb component spec, animation easing, glassmorphism rules, and Stitch screen IDs for Listening/Thinking/Speaking modes
- `CLAUDE.md` §Design Compliance — Mandatory 6-point design verification checklist

### Project Specification
- `task.md` — Original spec: conversation system JSON envelope, voice pipeline, mode descriptions
- `.planning/PROJECT.md` — Core value, constraints, key decisions
- `.planning/REQUIREMENTS.md` — Phase 2 requirements: VOICE-01–05, TTS-01–04, CONV-01–06, MODE-01–03, LIST-01–04, THINK-01–04, SPEAK-01–03

### Research (Critical)
- `.planning/research/STACK.md` — Deepgram vs Whisper comparison, MediaRecorder API details, motion package (not framer-motion)
- `.planning/research/ARCHITECTURE.md` — Voice FSM pattern, Claude structured outputs, backend fetch pattern, httpx lifespan
- `.planning/research/PITFALLS.md` — Safari STT broken in PWA, AudioContext user gesture requirement, speechSynthesis.getVoices() quirk, JSON envelope buffering latency

### Existing Code (from Phase 1)
- `frontend/src/store/assistantStore.ts` — Zustand store to extend with voice FSM state
- `frontend/src/components/OrbAnimation.tsx` — Orb animation to evolve for Thinking mode
- `frontend/src/modes/ThinkingMode.tsx` — Thinking mode placeholder to implement
- `frontend/src/api/client.ts` — API client to extend with chat and WebSocket endpoints
- `backend/main.py` — FastAPI app to add /api/chat and /api/ws/transcribe routes
- `backend/config.py` — Config to add DEEPGRAM_API_KEY, CLAUDE_API_KEY
- `backend/db.py` — MongoDB helper to extend for conversation persistence

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `OrbAnimation.tsx` — breathing orb animation with motion/react, can evolve for Thinking mode state
- `assistantStore.ts` — Zustand store skeleton, needs voice FSM state fields added
- `client.ts` — API client with base URL config, extend for /api/chat endpoint
- `backend/main.py` — FastAPI lifespan with MongoDB, add routers for chat/transcribe
- `backend/config.py` — pydantic-settings, add new API key fields

### Established Patterns
- Tailwind v4 CSS-first with @theme tokens (no tailwind.config.js)
- motion/react for animations (not framer-motion)
- PyMongo Async AsyncMongoClient (not Motor)
- StaticFiles mount as last line in main.py

### Integration Points
- New FastAPI routes: POST /api/chat, WebSocket /api/ws/transcribe
- Zustand store: add voiceState, conversationHistory, currentTranscript
- New mode components: ListeningMode.tsx, SpeakingMode.tsx (ThinkingMode.tsx exists)
- New hooks: useVoiceRecorder (MediaRecorder), useVoiceOutput (SpeechSynthesis), useWaveVisualizer (Canvas)

</code_context>

<specifics>
## Specific Ideas

- The voice loop must feel seamless on iPad — tap → listen → think → speak should be under 3-4 seconds total for a simple query
- Waveform should react to actual audio levels, not be a canned animation
- Thinking orb should feel like "processing intelligence" — not a loading spinner
- Subtitles during Speaking mode should feel like a conversation, not a transcript dump
- Russian language must work as well as English — this is the primary use language

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-voice-loop-core*
*Context gathered: 2026-04-08*

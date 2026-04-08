# Feature Research

**Domain:** AI Voice Assistant PWA (single-user, iPad-first)
**Researched:** 2026-04-08
**Confidence:** HIGH for core voice/PWA constraints, MEDIUM for visual patterns, HIGH for API capabilities

---

## CRITICAL CONSTRAINT: Safari PWA Speech Recognition

**This affects the entire feature set and must inform the roadmap.**

SpeechRecognition (Web Speech API) is **explicitly unavailable** in Safari installed PWAs (apps added to Home Screen). This is confirmed by caniuse.com: "Not available in SafariViewController and web apps added to Home Screen." Requires Siri to be enabled even in regular Safari tabs.

**Consequence:** If JARVIS runs as an installed PWA (full-screen, `apple-mobile-web-app-capable`), the Web Speech API STT path is broken from day one. The standard Web Speech API plan documented in PROJECT.md will not work as-is.

**Required workaround:** Use `MediaRecorder` API (which *does* work in Safari PWAs) to capture audio, send audio blob to backend, transcribe with OpenAI Whisper or equivalent. This adds latency and cost but is the only viable path.

**SpeechSynthesis (TTS) status:** Partially works in Safari PWAs. Known issues: `getVoices()` returns empty on first call (needs `onvoiceschanged` event), synthesis stops when app is backgrounded. Both are solvable with workarounds.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Voice input (STT) | Core premise — voice-first assistant | HIGH | **Critical**: Web Speech API blocked in Safari PWA. Must use MediaRecorder + backend Whisper. Adds ~0.5-2s latency per utterance. |
| Voice output (TTS) | Core premise — assistant speaks back | MEDIUM | Web Speech Synthesis works in Safari PWA with workarounds. `getVoices()` quirk requires async pattern. Best Russian voice is `Milena` on iOS. |
| Silence/end-of-speech detection | User must know when to stop talking vs keep talking | HIGH | VAD (Voice Activity Detection) needed. MediaRecorder approach requires manual energy-based or Silero VAD. Can't use Web Speech API's built-in pause detection. |
| Clear "listening" state indicator | Without visual feedback, users re-speak or go silent | LOW | Animated waveform or pulsing indicator. This is the Listening mode. |
| Clear "thinking" state indicator | Users need to know input was received and processing | LOW | Animation between STT complete and TTS start. This is the Thinking mode. |
| Clear "speaking" state indicator | Users need to know the assistant is responding | LOW | Wave/subtitle animation. This is the Speaking mode. |
| Tap-to-stop speaking | Users want to interrupt mid-response | LOW | `speechSynthesis.cancel()` on tap. Essential for long responses. |
| Tap-to-start listening | Fallback if push-to-talk feels safer than auto-listen | LOW | Button as explicit trigger, handles the iOS "requires user gesture for audio" constraint. |
| Concise responses | Voice responses over 30 seconds feel like lectures | LOW | System prompt constraint. Claude instructed to respond in 2-3 sentences for general queries. |
| Conversation memory | Context across turns — "what did I just say?" | MEDIUM | Last 20 messages in MongoDB. Already scoped in PROJECT.md. |
| Full-screen immersive UI | iPad landscape, no browser chrome visible | LOW | `apple-mobile-web-app-capable` + `apple-mobile-web-app-status-bar-style`. Works well. |
| Dark background, readable text | Voice UIs in dim environments (morning, night) | LOW | Dark theme is already specified in design system. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI-driven mode routing via JSON envelope | No manual intent parsing — Claude decides what to display | MEDIUM | Claude returns `{"mode": "weather", "response": "..."}`. Elegant, flexible, extensible. Risk: JSON parsing errors need graceful fallback. |
| 8 specialized visual modes | Each information domain gets a purpose-built display | HIGH | Listening, Thinking, Speaking, Weather, Prayer Times, Search, Calendar, Morning Briefing. Each mode is a separate full-screen component. |
| Prayer Times mode | Niche but high-value for Muslim users in Almaty | LOW | Aladhan API is free, well-documented, REST. Countdown to next prayer is simple time math. |
| Bilingual Russian/English auto-detection | Seamless for a Russian speaker who code-switches | MEDIUM | Claude auto-detects per utterance and responds in kind. Whisper handles Russian well. System prompt handles bilingual persona. No per-utterance lang param needed if Whisper `language=None`. |
| Morning Briefing mode (auto-trigger at 7AM) | Replaces morning phone-checking ritual | MEDIUM | Requires `setInterval`/page-visibility check since no background execution in PWAs. Works if app is open at 7AM. Cannot wake the app — out of scope. |
| Glassmorphism dark aesthetic with animated orbs | Premium feel matching Apple's own iOS 26 direction | MEDIUM | Framer Motion for transitions. Particle orb for Thinking mode. Purple wave for Speaking mode. These are achievable with CSS + canvas or Three.js lite. |
| Brave Search results as cards | Web search without leaving the assistant | MEDIUM | Brave Search API returns structured results. Glassmorphism card grid. User can hear summary or tap cards. |
| Weather with animated icons, hourly forecast | Context-aware weather in Almaty without app switching | LOW | OpenWeatherMap One Call API 3.0 returns current + 48h hourly. Animated icon mapping via weather condition codes. |
| Google Calendar read + voice event creation | Natural language event management | HIGH | OAuth2 flow needed even for single user. `gcsa` (google-calendar-simple-api) simplifies Python side. NL parsing ("add dentist Thursday 3pm") requires Claude to extract event fields from utterance. |
| Location hardcoded to Almaty | Zero setup friction for single-user personal tool | LOW | lat: 43.2220, lon: 76.8512 in environment config. No geo-permission prompts needed. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Wake word detection ("Hey JARVIS") | Hands-free activation feels magical | Not feasible in Safari PWA — continuous microphone access requires background processes that iOS kills. Also requires always-on audio processing which drains battery. Apple explicitly restricts this. | Tap-to-activate button. Place iPad in always-on landscape mount. Tap is reliable and doesn't fight iOS. |
| Continuous listening loop | No need to re-tap after each exchange | iOS Safari cuts microphone after ~30s of silence, and background audio is unreliable. Creates confusing half-connected states. | After TTS response ends, show "tap to speak" UI state clearly. Fast tap → listen flow feels natural. |
| Offline mode | Works without internet | Every feature (Claude, Weather, Calendar, Search, Prayer Times) requires network. Caching prayer times is possible but marginal value. | Show clear "offline" error state. No silent failures. |
| Multi-user / auth system | "What if others use it?" | Adds OAuth flows, user isolation, security surface. Single user is the entire design premise. | Hard-code single user. Settings in MongoDB without user ID. |
| Video/image generation | "Can it show me images?" | Out of stated scope. Adds latency, cost, complex display modes. | Brave Search cards can show thumbnails. Keep visual modes abstract/animated, not content-image based. |
| Push notifications | "Remind me at 3pm" | Safari PWA push support is improving (Safari 18.4+ added Declarative Web Push) but setup is non-trivial and requires server-side push infrastructure. | In-app visual reminder if app is open. Defer push to v2. |
| Real-time voice streaming (bidirectional) | Lower latency conversation | Requires WebRTC or WebSocket audio streaming. Significantly more complex. Current architecture (record → send → respond) is sufficient for use case. | Implement MediaRecorder → backend → Whisper → Claude → TTS pipeline. Optimize for speed, not streaming. |
| Native app (iOS) | More reliable access to Speech APIs | User explicitly ruled out. PWA is the constraint. | Accept the MediaRecorder workaround for STT. TTS limitations managed via known patterns. |

---

## Feature Dependencies

```
Voice Input (MediaRecorder)
    └──requires──> Backend STT (Whisper or equivalent)
                       └──requires──> FastAPI backend running
                                          └──requires──> Claude API integration
                                                             └──enables──> Mode routing (JSON envelope)
                                                                               └──enables──> All 8 visual modes

Silence Detection (VAD)
    └──required by──> Voice Input (know when user stopped speaking)

Voice Output (TTS)
    └──requires──> iOS user gesture constraint handled (first interaction unlocks audio)
    └──enhances──> Speaking mode (subtitle overlay syncs with speech)

Morning Briefing mode
    └──requires──> Weather mode (weather data)
    └──requires──> Calendar mode (today's events)
    └──requires──> Time-based trigger (JS interval or page focus check)
    └──enhances──> Speaking mode (reads the briefing aloud)

Calendar mode
    └──requires──> Google Calendar OAuth2 (service account or user OAuth)
    └──requires──> Voice event creation (NL parsing by Claude)

Search mode
    └──requires──> Brave Search API key
    └──enhances──> Speaking mode (Claude summarizes top results aloud)

Weather mode
    └──requires──> OpenWeatherMap One Call API key

Prayer Times mode
    └──requires──> Aladhan API (free, no key)
    └──requires──> Location hardcoded (Almaty coordinates)

Mode switching
    └──requires──> Claude JSON envelope format
    └──requires──> Frontend state machine (8 modes as React state)
    └──conflicts──> Multiple modes active simultaneously (one mode at a time)
```

### Dependency Notes

- **Voice Input requires MediaRecorder workaround:** The standard Web Speech API STT path is blocked in Safari PWAs. This dependency gates everything. Must be resolved in Phase 1.
- **TTS requires user gesture first:** iOS Safari requires a user interaction (tap) before any audio plays. The initial tap-to-listen interaction satisfies this constraint automatically.
- **Morning Briefing requires Weather + Calendar:** Don't build Morning Briefing before both are working. It's a composite mode.
- **Mode switching conflicts with simultaneous modes:** The UI is a state machine — exactly one mode is active. Transitioning must be animated but instant from data perspective.
- **Google Calendar requires OAuth2:** Even for single-user personal use, Google Calendar API requires OAuth2 with a refresh token. This is a setup cost, not a runtime cost. Service account won't work for personal calendars.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the core voice loop.

- [ ] MediaRecorder-based audio capture + backend Whisper STT — without this, nothing works in Safari PWA
- [ ] Silence/end-of-utterance detection (energy-based VAD or 1.5s silence timer) — user needs to know when to stop
- [ ] Claude integration with JSON envelope mode routing — the intelligence core
- [ ] TTS response playback (SpeechSynthesis with iOS quirk workarounds) — voice output
- [ ] Listening mode (animated waveform) — visual state during recording
- [ ] Thinking mode (animated orb) — visual state during processing
- [ ] Speaking mode (wave + subtitle) — visual state during playback
- [ ] Conversation history (last 20 turns, MongoDB) — context across exchanges
- [ ] Weather mode (Almaty, current + hourly) — first specialized mode
- [ ] Prayer Times mode (Aladhan, countdown, all 5) — second specialized mode, high personal value

### Add After Validation (v1.x)

Features to add once the core voice loop is proven.

- [ ] Search mode (Brave Search, glassmorphism cards) — useful but not core to voice loop
- [ ] Calendar mode (read events) — adds setup complexity (OAuth2), defer until core is stable
- [ ] Voice event creation — natural language event parsing is complex, validate read-only Calendar first
- [ ] Morning Briefing mode (composite: weather + calendar + AI quote) — requires both weather and calendar to work first
- [ ] Tap-to-interrupt TTS — quality of life, add when Speaking mode is stable

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Wake word detection — technically blocked by Safari PWA constraints, revisit if Apple lifts restrictions
- [ ] Push notifications for reminders — Safari 18.4+ supports Declarative Web Push, non-trivial infrastructure
- [ ] Additional cities / location switching — hardcoded Almaty serves the use case well
- [ ] Offline-cached prayer times — marginal value, minor complexity
- [ ] More visual modes (e.g., Stocks, News, Fitness) — extensible via Claude JSON envelope, add as needed

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| MediaRecorder + Whisper STT | HIGH | HIGH | P1 — blocks everything |
| Claude JSON envelope routing | HIGH | MEDIUM | P1 — architecture foundation |
| TTS (SpeechSynthesis + iOS fixes) | HIGH | MEDIUM | P1 — voice output |
| Silence detection (VAD) | HIGH | MEDIUM | P1 — UX quality gate |
| Listening / Thinking / Speaking modes | HIGH | MEDIUM | P1 — core visual loop |
| Conversation memory (MongoDB) | MEDIUM | LOW | P1 — context quality |
| Weather mode | HIGH | LOW | P1 — first specialized mode |
| Prayer Times mode | HIGH | LOW | P1 — high personal value, trivial API |
| Search mode (Brave) | MEDIUM | LOW | P2 — after core loop |
| Calendar read | MEDIUM | HIGH | P2 — OAuth2 setup cost |
| Voice event creation | MEDIUM | HIGH | P2 — after Calendar read |
| Morning Briefing mode | HIGH | MEDIUM | P2 — after Weather + Calendar |
| Tap-to-interrupt | LOW | LOW | P2 — polish |
| Wake word detection | HIGH | BLOCKED | P3 — Safari PWA constraint |
| Push notifications | MEDIUM | HIGH | P3 — infrastructure overhead |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Google Assistant | Alexa | Apple Siri | JARVIS Approach |
|---------|-----------------|-------|------------|-----------------|
| Voice activation | Wake word "Hey Google" | Wake word "Alexa" | Wake word "Hey Siri" | Tap to activate (Safari PWA constraint) |
| STT engine | Google Cloud STT | Amazon Transcribe | Apple Speech | Whisper via backend (Safari PWA workaround) |
| Mode/skill routing | Intent classification | Alexa Skills routing | Shortcuts/Intents | Claude JSON envelope (AI-decided, not rule-based) |
| Visual feedback | Basic animated orb | Echo Show display | Watch/HomePod minimalism | 8 full-screen specialized modes |
| Morning routine | Routines feature | Alexa Routines | Not native | Auto-trigger at 7AM with composite briefing |
| Calendar | Google Calendar native | Alexa Calendar (limited) | Apple Calendar | Google Calendar via OAuth2 + voice creation |
| Prayer times | Not native | Via skill | Not native | Native mode with Aladhan API |
| Bilingual | Single language per session | Single language | Detect via Siri language settings | Per-utterance auto-detection (Russian/English) |
| Location awareness | Dynamic via GPS | Dynamic via GPS | Dynamic via GPS | Hardcoded Almaty (single user) |

---

## Sources

- [caniuse.com — SpeechRecognition API support](https://caniuse.com/speech-recognition): Confirmed "Not available in SafariViewController and web apps added to Home Screen" — HIGH confidence
- [MagicBell — PWA iOS Limitations 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide): General PWA constraint landscape — MEDIUM confidence
- [Build with Matija — MediaRecorder + iPhone Safari](https://www.buildwithmatija.com/blog/iphone-safari-mediarecorder-audio-recording-transcription): MediaRecorder workaround pattern — MEDIUM confidence
- [WebFetch: The State of Speech Synthesis in Safari](https://weboutloud.io/bulletin/speech_synthesis_in_safari/): `getVoices()` quirk, backgrounding issues — MEDIUM confidence
- [Picovoice — VAD Complete Guide 2026](https://picovoice.ai/blog/complete-guide-voice-activity-detection-vad/): VAD options (WebRTC, Silero, Cobra) — HIGH confidence
- [OpenWeatherMap One Call API 3.0](https://openweathermap.org/api/one-call-3): Current + 48h hourly, 1000 free calls/day — HIGH confidence
- [Aladhan API](https://aladhan.com/prayer-times-api): Free, RESTful, coordinate-based prayer times — HIGH confidence
- [VUI Design Guide 2026 — FuseLabCreative](https://fuselabcreative.com/voice-user-interface-design-guide-2026/): Brevity, confirmation, frustration detection patterns — MEDIUM confidence
- [Dark Glassmorphism 2026 — Medium](https://medium.com/@developer_89726/dark-glassmorphism-the-aesthetic-that-will-define-ui-in-2026-93aa4153088f): Purple/blue ambient orbs behind dark glass — MEDIUM confidence
- [Gladia — Multilingual Voice Agents](https://www.gladia.io/blog/multilingual-voice-agents): Auto language detection, code-switching accuracy stats — MEDIUM confidence
- [LiveKit — Turn Detection for Voice Agents](https://livekit.com/blog/turn-detection-voice-agents-vad-endpointing-model-based-detection): Semantic VAD, utterance end patterns — MEDIUM confidence

---

*Feature research for: JARVIS AI Voice Assistant PWA (iPad Safari)*
*Researched: 2026-04-08*

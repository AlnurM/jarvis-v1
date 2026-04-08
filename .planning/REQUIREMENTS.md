# Requirements: JARVIS — AI Voice Assistant

**Defined:** 2026-04-08
**Core Value:** Voice in → intelligent response out, with the right visual mode automatically selected

## v1 Requirements

### Voice Input

- [ ] **VOICE-01**: User can tap to activate microphone and speak
- [ ] **VOICE-02**: Audio captured via MediaRecorder API (Safari PWA compatible)
- [ ] **VOICE-03**: Audio sent to backend for STT transcription (Deepgram or Whisper)
- [ ] **VOICE-04**: Silence detection (VAD) automatically ends recording after 1.5-2s of silence
- [ ] **VOICE-05**: User can tap to stop recording early

### Voice Output

- [ ] **TTS-01**: AI response spoken via SpeechSynthesis API
- [ ] **TTS-02**: Best available voice selected (prefer Russian voice on iOS, e.g. Milena)
- [ ] **TTS-03**: User can tap to interrupt/stop speaking
- [ ] **TTS-04**: Voice list loaded with polling workaround for Safari getVoices() quirk

### Conversation

- [ ] **CONV-01**: Claude API integration with JARVIS persona (concise, helpful)
- [ ] **CONV-02**: Bilingual ru/en auto-detection — responds in user's language
- [ ] **CONV-03**: Conversation history maintained (last 20 messages)
- [ ] **CONV-04**: Conversation history persisted to MongoDB
- [ ] **CONV-05**: Claude returns structured JSON envelope with mode + text + data
- [ ] **CONV-06**: System prompt enforces concise responses (2-3 sentences for general queries)

### Mode Routing

- [ ] **MODE-01**: App auto-switches visual mode based on Claude's JSON envelope response
- [ ] **MODE-02**: Smooth animated transitions between modes via Framer Motion (motion package)
- [ ] **MODE-03**: Fallback to Speaking mode if JSON parse fails

### Listening Mode

- [ ] **LIST-01**: Dark background (#0a0a0a) with animated sound wave in electric blue (#00d4ff)
- [ ] **LIST-02**: Canvas-based wave visualization reacting to audio input
- [ ] **LIST-03**: "Listening..." text faded below wave
- [ ] **LIST-04**: No other UI elements visible

### Thinking Mode

- [ ] **THINK-01**: Morphing particle orb animation (CSS/Canvas)
- [ ] **THINK-02**: Color transitions blue → purple
- [ ] **THINK-03**: No text displayed
- [ ] **THINK-04**: Activates after user stops speaking, while API call is in flight

### Speaking Mode

- [ ] **SPEAK-01**: Wave animation in purple/violet (#9b59b6)
- [ ] **SPEAK-02**: AI response text as subtitles at bottom (max 2 lines visible)
- [ ] **SPEAK-03**: Subtitle text fades in synchronized with speech

### Weather Mode

- [ ] **WEATH-01**: Large temperature display center screen
- [ ] **WEATH-02**: Animated weather icon based on condition
- [ ] **WEATH-03**: Hourly forecast horizontal scroll
- [ ] **WEATH-04**: Data from OpenWeatherMap API, default location Almaty
- [ ] **WEATH-05**: Triggered when user asks about weather

### Prayer Times Mode

- [ ] **PRAY-01**: Next prayer name displayed large center screen
- [ ] **PRAY-02**: Countdown timer to next prayer
- [ ] **PRAY-03**: All 5 daily prayers listed at bottom
- [ ] **PRAY-04**: Current/next prayer highlighted
- [ ] **PRAY-05**: Data from Aladhan API, coordinates for Almaty
- [ ] **PRAY-06**: Triggered when user asks about prayer times

### Search Mode

- [ ] **SRCH-01**: Floating glassmorphism cards (max 3 visible)
- [ ] **SRCH-02**: Each card shows: favicon + source name, title, snippet
- [ ] **SRCH-03**: Cards animate in from bottom
- [ ] **SRCH-04**: Data from Brave Search API
- [ ] **SRCH-05**: Triggered when Claude determines web search is needed

### Calendar Mode

- [ ] **CAL-01**: Week view displayed in top half of screen
- [ ] **CAL-02**: Events list in bottom half with glassmorphism cards
- [ ] **CAL-03**: Read events from Google Calendar API
- [ ] **CAL-04**: Voice-to-event creation ("add dentist Thursday 3pm")
- [ ] **CAL-05**: Created events saved to MongoDB events collection
- [ ] **CAL-06**: Google OAuth2 authentication flow for calendar access
- [ ] **CAL-07**: Triggered when user asks about schedule or says "add to calendar"

### Morning Briefing Mode

- [ ] **BRIEF-01**: Split layout — tasks/events left, weather right
- [ ] **BRIEF-02**: AI-generated personalized morning summary via Claude
- [ ] **BRIEF-03**: AI quote displayed at bottom
- [ ] **BRIEF-04**: Auto-triggers at 7:00 AM if app is open (requires user gesture for audio)
- [ ] **BRIEF-05**: Can be triggered manually by user request

### PWA & Infrastructure

- [ ] **PWA-01**: Full-screen PWA with manifest.json and service worker
- [ ] **PWA-02**: apple-mobile-web-app-capable meta tag for Safari fullscreen
- [ ] **PWA-03**: 100vw x 100vh viewport, no scrollbars, no browser UI
- [ ] **PWA-04**: iPad landscape optimized layout

### Backend

- [ ] **API-01**: FastAPI server serving static frontend via StaticFiles
- [ ] **API-02**: Backend proxies all external API calls (Claude, Weather, Prayer, Search, Calendar)
- [ ] **API-03**: Single httpx.AsyncClient for app lifetime (lifespan-scoped)
- [ ] **API-04**: Backend fetches sub-API data during /api/chat call (no double round-trips)

### Database

- [ ] **DB-01**: MongoDB connected via PyMongo Async (not Motor — deprecated)
- [ ] **DB-02**: Collections: conversations, events, settings
- [ ] **DB-03**: Collections initialized on startup
- [ ] **DB-04**: Settings persistence (location, language, preferences)

### Deployment

- [ ] **DEPLOY-01**: Multi-stage Dockerfile (Node build + Python runtime)
- [ ] **DEPLOY-02**: Railway deployment with all config via environment variables
- [ ] **DEPLOY-03**: MONGO_URL from Railway MongoDB plugin
- [ ] **DEPLOY-04**: No hardcoded API keys or secrets

## v2 Requirements

### Notifications

- **NOTIF-01**: Prayer time push notification when app is open
- **NOTIF-02**: Calendar event reminders

### Advanced Voice

- **ADVV-01**: Streaming TTS (start speaking before full Claude response)
- **ADVV-02**: Continuous listening loop (auto-restart after response)
- **ADVV-03**: Voice activity detection tuning for Russian speech patterns

### Enhanced UI

- **UI-01**: Animated weather icons (Lottie or custom SVG)
- **UI-02**: Gesture controls (swipe between modes)
- **UI-03**: Settings screen accessible via tap gesture

## Out of Scope

| Feature | Reason |
|---------|--------|
| Wake word ("Hey JARVIS") | Technically blocked by Safari PWA — iOS kills background audio processes |
| Multi-user / auth system | Single personal user, no login needed |
| Native mobile app | PWA-only per user decision |
| Video/image generation | Out of stated scope, adds latency and cost |
| Offline mode | Every feature requires network (Claude, Weather, Calendar, Search, Prayer) |
| Real-time bidirectional voice streaming | Adds significant complexity; record→send→respond is sufficient |
| Push notifications (v1) | Safari PWA push setup is non-trivial; defer to v2 |
| Continuous listening | iOS Safari cuts mic after ~30s silence; creates confusing states |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VOICE-01 | — | Pending |
| VOICE-02 | — | Pending |
| VOICE-03 | — | Pending |
| VOICE-04 | — | Pending |
| VOICE-05 | — | Pending |
| TTS-01 | — | Pending |
| TTS-02 | — | Pending |
| TTS-03 | — | Pending |
| TTS-04 | — | Pending |
| CONV-01 | — | Pending |
| CONV-02 | — | Pending |
| CONV-03 | — | Pending |
| CONV-04 | — | Pending |
| CONV-05 | — | Pending |
| CONV-06 | — | Pending |
| MODE-01 | — | Pending |
| MODE-02 | — | Pending |
| MODE-03 | — | Pending |
| LIST-01 | — | Pending |
| LIST-02 | — | Pending |
| LIST-03 | — | Pending |
| LIST-04 | — | Pending |
| THINK-01 | — | Pending |
| THINK-02 | — | Pending |
| THINK-03 | — | Pending |
| THINK-04 | — | Pending |
| SPEAK-01 | — | Pending |
| SPEAK-02 | — | Pending |
| SPEAK-03 | — | Pending |
| WEATH-01 | — | Pending |
| WEATH-02 | — | Pending |
| WEATH-03 | — | Pending |
| WEATH-04 | — | Pending |
| WEATH-05 | — | Pending |
| PRAY-01 | — | Pending |
| PRAY-02 | — | Pending |
| PRAY-03 | — | Pending |
| PRAY-04 | — | Pending |
| PRAY-05 | — | Pending |
| PRAY-06 | — | Pending |
| SRCH-01 | — | Pending |
| SRCH-02 | — | Pending |
| SRCH-03 | — | Pending |
| SRCH-04 | — | Pending |
| SRCH-05 | — | Pending |
| CAL-01 | — | Pending |
| CAL-02 | — | Pending |
| CAL-03 | — | Pending |
| CAL-04 | — | Pending |
| CAL-05 | — | Pending |
| CAL-06 | — | Pending |
| CAL-07 | — | Pending |
| BRIEF-01 | — | Pending |
| BRIEF-02 | — | Pending |
| BRIEF-03 | — | Pending |
| BRIEF-04 | — | Pending |
| BRIEF-05 | — | Pending |
| PWA-01 | — | Pending |
| PWA-02 | — | Pending |
| PWA-03 | — | Pending |
| PWA-04 | — | Pending |
| API-01 | — | Pending |
| API-02 | — | Pending |
| API-03 | — | Pending |
| API-04 | — | Pending |
| DB-01 | — | Pending |
| DB-02 | — | Pending |
| DB-03 | — | Pending |
| DB-04 | — | Pending |
| DEPLOY-01 | — | Pending |
| DEPLOY-02 | — | Pending |
| DEPLOY-03 | — | Pending |
| DEPLOY-04 | — | Pending |

**Coverage:**
- v1 requirements: 65 total
- Mapped to phases: 0
- Unmapped: 65 ⚠️

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-08 after initial definition*

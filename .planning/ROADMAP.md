# Roadmap: JARVIS — AI Voice Assistant

## Overview

JARVIS is built in five phases that follow a strict dependency graph. Phase 1 proves the deployment pipeline before any voice work begins. Phase 2 builds and validates the voice loop on the real target iPad — this is the critical path because the entire product is the loop. Phase 3 adds the two simplest specialized modes (Weather and Prayer Times) to validate end-to-end mode switching with zero auth complexity. Phase 4 adds the three remaining modes (Search, Calendar, Morning Briefing), with Google OAuth saved for last. Phase 5 hardens the system quality: single round-trip optimization, settings persistence, iOS edge case handling, and animation performance on real iPad hardware.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Project scaffold, deployment pipeline, and database — everything needed to ship code to the target device (completed 2026-04-08)
- [ ] **Phase 2: Voice Loop Core** - The complete voice loop (listen → think → speak) with Claude integration and 3 core visual modes — the entire product in its simplest form
- [ ] **Phase 3: Information Modes** - Weather and Prayer Times modes — first specialized modes validating end-to-end mode switching with simple REST APIs
- [ ] **Phase 4: Extended Modes** - Search, Calendar (with Google OAuth), and Morning Briefing — full feature set complete
- [ ] **Phase 5: Polish & Hardening** - Single round-trip optimization, settings persistence, animation performance, iOS edge case hardening

## Phase Details

### Phase 1: Foundation
**Goal**: The project can be deployed to Railway and accessed on the target iPad as a fullscreen PWA, with FastAPI serving the React scaffold and MongoDB connected
**Depends on**: Nothing (first phase)
**Requirements**: PWA-01, PWA-02, PWA-03, PWA-04, API-01, API-02, DB-01, DB-02, DB-03, DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04
**Success Criteria** (what must be TRUE):
  1. User can add the app to iPad home screen and open it in full-screen landscape with no browser chrome
  2. The Railway deployment URL serves the React scaffold without errors, confirmed via browser on iPad
  3. FastAPI health check endpoint responds; MongoDB collections initialize on startup (no errors in Railway logs)
  4. All API keys and secrets are loaded from environment variables — no hardcoded values exist in the codebase
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — FastAPI backend scaffold with MongoDB lifespan, /api/health endpoint, and pydantic-settings config
- [x] 01-02-PLAN.md — React/Vite PWA frontend with Tailwind v4 design tokens, Apple PWA meta tags, Zustand store, and JARVIS orb landing screen
- [x] 01-03-PLAN.md — Multi-stage Dockerfile (node:20-slim build + python:3.12-slim runtime)
- [x] 01-04-PLAN.md — Git commit, Railway deploy, and iPad fullscreen PWA smoke test checkpoint

**UI hint**: yes

### Phase 2: Voice Loop Core
**Goal**: User can speak to JARVIS on iPad and receive an intelligent spoken response with the correct visual mode automatically selected — the complete voice loop works end-to-end on the real target device
**Depends on**: Phase 1
**Requirements**: VOICE-01, VOICE-02, VOICE-03, VOICE-04, VOICE-05, TTS-01, TTS-02, TTS-03, TTS-04, CONV-01, CONV-02, CONV-03, CONV-04, CONV-05, CONV-06, MODE-01, MODE-02, MODE-03, LIST-01, LIST-02, LIST-03, LIST-04, THINK-01, THINK-02, THINK-03, THINK-04, SPEAK-01, SPEAK-02, SPEAK-03
**Success Criteria** (what must be TRUE):
  1. User taps the screen, speaks a question in Russian or English, and JARVIS responds in the same language with spoken audio on real iPad in standalone PWA mode
  2. The listening animation (blue waveform) is visible while the user speaks and disappears when silence is detected after 1.5–2 seconds
  3. The thinking animation (morphing particle orb, blue-to-purple) plays while the API call is in flight
  4. The speaking animation (purple wave with subtitle text) plays while JARVIS speaks, and the user can tap to stop it early
  5. Conversation history persists — a follow-up question in the same session uses context from previous turns
**Plans**: 7 plans

Plans:
- [x] 02-01-PLAN.md — Test scaffold (Wave 0): pytest fixtures, mock Claude/Deepgram, requirements.txt upgrade to anthropic 0.91.0 + deepgram-sdk 6.1.1
- [x] 02-02-PLAN.md — Backend routes: POST /api/chat (Claude structured output + MongoDB) and WebSocket /api/ws/transcribe (Deepgram relay)
- [x] 02-03-PLAN.md — Frontend contracts: extend Zustand store with voice FSM + conversation history; extend API client with chatWithJarvis() and createTranscribeWS()
- [x] 02-04-PLAN.md — Frontend hooks: useVoiceRecorder (MediaRecorder + VAD), useVoiceOutput (SpeechSynthesis + Safari workarounds), useWaveVisualizer (Canvas AnalyserNode)
- [x] 02-05-PLAN.md — Visual modes: ListeningMode (blue waveform), ThinkingMode (blue→purple orb), SpeakingMode (purple waveform + subtitles)
- [x] 02-06-PLAN.md — App wiring: ModeRouter with AnimatePresence transitions + App.tsx FSM orchestration
- [ ] 02-07-PLAN.md — iPad deployment + end-to-end validation checkpoint on real device

**UI hint**: yes

### Phase 3: Information Modes
**Goal**: User can ask about the weather or prayer times and see the correct specialized visual mode with real data from Almaty
**Depends on**: Phase 2
**Requirements**: WEATH-01, WEATH-02, WEATH-03, WEATH-04, WEATH-05, PRAY-01, PRAY-02, PRAY-03, PRAY-04, PRAY-05, PRAY-06
**Success Criteria** (what must be TRUE):
  1. User asks "what's the weather?" and sees a full-screen weather display with current temperature, animated condition icon, and hourly forecast for Almaty
  2. User asks about prayer times and sees a full-screen display with the next prayer name large center-screen, a live countdown timer, and all 5 prayers listed
  3. The current or next prayer is visually highlighted in the prayer list
  4. Mode switching animation plays smoothly when transitioning from Speaking mode to Weather or Prayer mode
**Plans**: TBD
**UI hint**: yes

### Phase 4: Extended Modes
**Goal**: User can search the web, manage their Google Calendar by voice, and receive a morning briefing — all specialized modes are complete
**Depends on**: Phase 3
**Requirements**: SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05, CAL-01, CAL-02, CAL-03, CAL-04, CAL-05, CAL-06, CAL-07, BRIEF-01, BRIEF-02, BRIEF-03, BRIEF-04, BRIEF-05
**Success Criteria** (what must be TRUE):
  1. User asks a factual question triggering web search, and up to 3 glassmorphism result cards animate in from the bottom with favicon, title, and snippet
  2. User says "what's on my calendar this week?" and sees a week view with events from Google Calendar
  3. User says "add dentist Thursday 3pm" and the event is created in Google Calendar and saved to MongoDB
  4. User says "morning briefing" (or app is open at 7:00 AM after prior user gesture) and sees the split layout with weather, events, Claude-generated summary, and a quote
**Plans**: TBD
**UI hint**: yes

### Phase 5: Polish & Hardening
**Goal**: The voice loop and all modes feel production-quality on the target iPad — latency is minimized, animations are smooth, settings persist, and iOS edge cases are handled gracefully
**Depends on**: Phase 4
**Requirements**: API-03, API-04, DB-04
**Success Criteria** (what must be TRUE):
  1. Sub-API data (weather, prayer, calendar) arrives with the Claude response in a single round-trip — no visible flash of empty mode UI
  2. User settings (location, language preference) persist across app restarts
  3. Animations run without jank on iPad — waveform and particle orb maintain smooth frame rate under load
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/4 | Complete   | 2026-04-08 |
| 2. Voice Loop Core | 6/7 | In Progress|  |
| 3. Information Modes | 0/TBD | Not started | - |
| 4. Extended Modes | 0/TBD | Not started | - |
| 5. Polish & Hardening | 0/TBD | Not started | - |

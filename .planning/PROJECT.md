# JARVIS — AI Voice Assistant

## What This Is

A full-screen PWA voice assistant for iPad (Safari, landscape). The user speaks, JARVIS listens, thinks, and responds with voice + rich visual feedback across 8 specialized modes. Personal assistant for a single user in Almaty, Kazakhstan — supports Russian and English with auto-detection.

## Core Value

Voice in → intelligent response out, with the right visual mode automatically selected. The voice loop (listen → think → speak) must feel seamless and fast.

## Requirements

### Validated

- ✓ Full-screen PWA with iPad Safari support (apple-mobile-web-app-capable) — Phase 1
- ✓ FastAPI backend proxying all API calls (scaffold) — Phase 1
- ✓ MongoDB via PyMongo Async for conversations, events, settings (scaffold) — Phase 1
- ✓ Railway deployment — single Docker container (FastAPI + static frontend) — Phase 1
- ✓ Voice input via MediaRecorder + backend STT (Deepgram) — Phase 2
- ✓ Voice output via Web Speech API (TTS) with best available voice — Phase 2
- ✓ Claude API integration with JARVIS persona (concise, helpful, ru/en auto-detect) — Phase 2
- ✓ Conversation history maintained (last 20 messages, stored in MongoDB) — Phase 2
- ✓ Mode auto-switching based on Claude's JSON envelope response — Phase 2
- ✓ Listening/Thinking/Speaking modes with design-compliant animations — Phase 2-4
- ✓ Weather mode — full stats (wind, humidity, visibility, UV), dynamic city support — Phase 3-5
- ✓ Prayer times mode — Aladhan API, countdown, all 5 prayers — Phase 3-4
- ✓ Continuous background voice on content screens (FloatingMic) — Phase 5
- ✓ Direct content-to-content transitions without mic screen — Phase 5
- ✓ Dismiss intent ("домой") to return to idle orb — Phase 5

### Active

- [ ] Search mode — Brave Search API results as glassmorphism cards
- [ ] Search mode — Brave Search API results as glassmorphism cards
- [ ] Calendar mode — Google Calendar read + voice-to-event creation
- [ ] Morning briefing mode — tasks/weather/AI quote, auto-triggers at 7:00 AM
- [ ] MongoDB via Motor for conversations, events, settings
- [ ] Railway deployment — single Docker container (FastAPI + static frontend)
- [ ] Settings persistence (location, language, preferences) in MongoDB

### Out of Scope

- Multi-user / auth system — single personal user, no login needed
- Wake word detection ("Hey JARVIS") — stretch goal, not v1
- Native mobile app — web PWA only
- Video/image generation — voice + text + visual modes only
- Offline mode — requires network for all API calls

## Context

- Target device: iPad in landscape, Safari browser, full-screen PWA
- Location: Almaty, Kazakhstan (lat: 43.2220, lon: 76.8512)
- Languages: Russian (primary) and English, auto-detected per utterance
- All API keys provided via environment variables, never hardcoded
- MongoDB provided by Railway plugin (MONGO_URL auto-injected)
- Frontend built by Vite, served as static files by FastAPI
- Design system defined in separate design.md (glassmorphism, dark theme, specific color palette)

## Constraints

- **Tech stack**: React + Vite frontend, Python FastAPI backend — specified by user
- **Deployment**: Railway monolith with Docker — single container serves everything
- **Device**: iPad Safari landscape — must work flawlessly in this specific environment
- **APIs**: Claude (claude-sonnet-4-6), OpenWeatherMap, Aladhan, Google Calendar, Brave Search — all specified
- **Database**: MongoDB via Motor — async driver required for FastAPI
- **No auth**: Single user, no login flow — simplifies architecture significantly

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Monolith (FastAPI + static frontend) | Simplest deployment, one container on Railway | — Pending |
| MongoDB for all persistence | Flexible schema for conversations/events/settings, Railway plugin available | — Pending |
| Web Speech API for STT/TTS | No additional service costs, works in Safari | — Pending |
| Claude JSON envelope for mode routing | AI decides which mode to show, no manual routing logic | — Pending |
| Framer Motion for transitions | Smooth mode switching animations, React-native | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-09 after Phase 5 completion*

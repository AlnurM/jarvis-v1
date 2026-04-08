# JARVIS — AI Voice Assistant

## What This Is

A full-screen PWA voice assistant for iPad (Safari, landscape). The user speaks, JARVIS listens, thinks, and responds with voice + rich visual feedback across 8 specialized modes. Personal assistant for a single user in Almaty, Kazakhstan — supports Russian and English with auto-detection.

## Core Value

Voice in → intelligent response out, with the right visual mode automatically selected. The voice loop (listen → think → speak) must feel seamless and fast.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Full-screen PWA with iPad Safari support (apple-mobile-web-app-capable)
- [ ] Voice input via Web Speech API (STT) with silence detection
- [ ] Voice output via Web Speech API (TTS) with best available voice
- [ ] Claude API integration with JARVIS persona (concise, helpful, ru/en auto-detect)
- [ ] Conversation history maintained (last 20 messages, stored in MongoDB)
- [ ] Mode auto-switching based on Claude's JSON envelope response
- [ ] Listening mode — animated sound wave on dark background
- [ ] Thinking mode — morphing particle orb animation
- [ ] Speaking mode — purple wave animation with subtitle overlay
- [ ] Weather mode — OpenWeatherMap data for Almaty, animated icons, hourly forecast
- [ ] Prayer times mode — Aladhan API, countdown to next prayer, all 5 listed
- [ ] Search mode — Brave Search API results as glassmorphism cards
- [ ] Calendar mode — Google Calendar read + voice-to-event creation
- [ ] Morning briefing mode — tasks/weather/AI quote, auto-triggers at 7:00 AM
- [ ] FastAPI backend proxying all API calls
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
*Last updated: 2026-04-08 after initialization*

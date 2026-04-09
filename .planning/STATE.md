---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 06-06-PLAN.md
last_updated: "2026-04-09T14:38:00.153Z"
last_activity: 2026-04-09
progress:
  total_phases: 7
  completed_phases: 5
  total_plans: 35
  completed_plans: 34
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-08)

**Core value:** Voice in → intelligent response out, with the right visual mode automatically selected
**Current focus:** Phase 06 — extended-modes

## Current Position

Phase: 06 (extended-modes) — EXECUTING
Plan: 5 of 6
Status: Ready to execute
Last activity: 2026-04-09

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01-foundation P01 | 5 | 2 tasks | 12 files |
| Phase 01-foundation P02 | 8 | 2 tasks | 13 files |
| Phase 01-foundation P03 | 1 | 1 tasks | 1 files |
| Phase 01-foundation P04 | 3 | 1 tasks | 6 files |
| Phase 02-voice-loop-core P01 | 172 | 2 tasks | 5 files |
| Phase 02-voice-loop-core P02 | 600 | 2 tasks | 6 files |
| Phase 02-voice-loop-core P03 | 80 | 2 tasks | 2 files |
| Phase 02-voice-loop-core P04 | 2 | 2 tasks | 3 files |
| Phase 02-voice-loop-core P05 | 138 | 2 tasks | 4 files |
| Phase 02-voice-loop-core P06 | 10 | 2 tasks | 2 files |
| Phase 02-voice-loop-core P07 | 30 | 1 tasks | 1 files |
| Phase 03-information-modes P01 | 2 | 2 tasks | 2 files |
| Phase 03-information-modes P02 | 2 | 2 tasks | 3 files |
| Phase 03-information-modes P03 | 3 | 2 tasks | 2 files |
| Phase 03 P04 | 5 | 2 tasks | 3 files |
| Phase 04-design-audit-rebuild P01 | 1 | 2 tasks | 2 files |
| Phase 04-design-audit-rebuild P03 | 141 | 2 tasks | 1 files |
| Phase 04-design-audit-rebuild P04 | 10 | 2 tasks | 2 files |
| Phase 04-design-audit-rebuild P02 | 2 | 3 tasks | 3 files |
| Phase 04 P06 | 2 | 2 tasks | 2 files |
| Phase 04 P11 | 5 | 1 tasks | 1 files |
| Phase 04-design-audit-rebuild P10 | 8 | 1 tasks | 1 files |
| Phase 04-design-audit-rebuild P09 | 3 | 1 tasks | 1 files |
| Phase 05-voice-loop-weather-polish P02 | 2 | 2 tasks | 5 files |
| Phase 05-voice-loop-weather-polish P01 | 3 | 2 tasks | 2 files |
| Phase 05-voice-loop-weather-polish P03 | 5 | 2 tasks | 2 files |
| Phase 06-extended-modes P01 | 8 | 2 tasks | 6 files |
| Phase 06-extended-modes P03 | 8 | 2 tasks | 4 files |
| Phase 06-extended-modes P05 | 175 | 2 tasks | 4 files |
| Phase 06-extended-modes P06 | 5 | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: Web Speech API STT is broken in iPadOS standalone PWA — must use MediaRecorder + Deepgram backend relay
- Roadmap: Motor is deprecated (EOL May 2026) — use PyMongo Async (AsyncMongoClient) from day one
- Roadmap: Claude JSON envelope must be designed for streaming from the start — buffering adds 2-3s latency
- Roadmap: Google OAuth is highest complexity — intentionally last within Phase 4
- Roadmap: AudioContext requires prior user gesture — morning briefing auto-play shows visual prompt if no gesture yet
- [Phase 01-foundation]: Use AsyncMongoClient (pymongo 4.16) not Motor — Motor EOL May 2026; StaticFiles mount at '/' must be last registration in main.py
- [Phase 01-foundation]: Downgraded vite to 6.4.2 and vite-plugin-pwa to 0.21.2 for Node 20.11 compatibility — crypto.hash() missing in Node <20.12
- [Phase 01-foundation]: Import from motion/react not framer-motion — framer-motion no longer maintained
- [Phase 01-foundation]: Tailwind v4 CSS-first via @tailwindcss/vite plugin — no tailwind.config.js
- [Phase 01-foundation]: node:20-slim + python:3.12-slim multi-stage Dockerfile; npm ci for reproducibility; port 8080 hardcoded in CMD; Railway PORT=8080 must be set in dashboard
- [Phase 01-foundation]: Git repo already initialized from prior plans — remaining scaffold files committed to complete repo state for Railway deploy
- [Phase 02-voice-loop-core]: Wave 0 test scaffold uses AsyncClient+ASGITransport for async fixtures; mock_claude guards routers.chat import to work before plan 02-02
- [Phase 02-voice-loop-core]: deepgram-sdk 6.x uses Fern-generated API — client.listen.v1.connect() asynccontextmanager replaces old LiveOptions/asyncwebsocket pattern
- [Phase 02-voice-loop-core]: ASGITransport does not trigger FastAPI lifespan in httpx 0.28.x — set app.state.db directly in test fixtures
- [Phase 02-voice-loop-core]: Claude output_config.format with type json_schema (D-17) — not the deprecated output_format parameter
- [Phase 02-voice-loop-core]: crypto.randomUUID() for session IDs — no uuid package needed; available in Safari iOS 14.5+
- [Phase 02-voice-loop-core]: AssistantState enum as single voice FSM source of truth — no boolean flags per D-12
- [Phase 02-voice-loop-core]: transcriptRef overwrite pattern: Deepgram returns progressively longer finals — last value is most complete, overwrite not append
- [Phase 02-voice-loop-core]: fftSize=256 locked for all AnalyserNode instances — higher values cause iPad frame-time variance per RESEARCH.md
- [Phase 02-voice-loop-core]: OrbAnimation extended with primaryColor/secondaryColor/scale props — backward-compatible defaults using CSS vars
- [Phase 02-voice-loop-core]: SpeakingMode takes optional analyserRef with static bezier curve fallback when TTS on system audio bus
- [Phase 02-voice-loop-core]: ModeRouter idle key includes mode name (idle-chat, idle-weather) to re-trigger AnimatePresence on mode changes in idle state
- [Phase 02-voice-loop-core]: App.tsx modeMap uses Parameters<typeof setMode>[0] cast for type-safe enum mapping instead of any
- [Phase 02-voice-loop-core]: backend/static/ excluded from git — Dockerfile COPY --from=frontend handles dist copy at build time
- [Phase 03-information-modes]: Tests patch routers.chat._fetch_weather/_fetch_prayer directly to isolate dispatch logic; integration tests use sync client fixture with explicit mock_claude patch
- [Phase 03-information-modes]: _fetch_weather/_fetch_prayer placed as module-level async functions before chat() — importable in tests via routers.chat patch target
- [Phase 03-information-modes]: Fetch dispatch placed after MongoDB insert in chat() — ensures conversation persisted regardless of sub-API outcome
- [Phase 03-information-modes]: iconToEmoji(iconCode) for hourly OWM icon strings vs getConditionEmoji(id) for main display — two separate helpers needed since hourly items carry icon code string, not numeric condition_id
- [Phase 03-information-modes]: PrayerMode midnight crossing: deltaMin <= 0 adds 1440 to wrap countdown correctly to next-day Fajr
- [Phase 03]: Auto-listen is success-path only: onComplete passed only in speak() call inside runChat() try block; catch block uses setState('idle') with no timer
- [Phase 03]: handleTap cancels autoListenTimer before state check to prevent double-start when user taps within 500ms window
- [Phase 03]: idle-weather / idle-prayer as distinct AnimatePresence keys to re-trigger animation on Speaking->idle-weather transition (Pitfall 7 avoidance)
- [Phase 04-design-audit-rebuild]: Token values sourced from design.md section 7 + plan fallbacks; primary-dim/secondary-dim set to full brand colors (usage sites apply alpha for glow); primary-container (#1a2540) and secondary-container (#1e1530) as dark tinted AI Pulse variants
- [Phase 04-design-audit-rebuild]: WAVE_COLOR updated from #9b59b6 to #ad89ff (secondary token) matching Stitch screen 8554ef1a3efa42f9a07ad8774a690a7d
- [Phase 04-design-audit-rebuild]: Glassmorphism card added to SpeakingMode subtitle with linear-gradient(135deg) + blur(24px) + WebkitBackdropFilter for iPad Safari
- [Phase 04-design-audit-rebuild]: WeatherMode/PrayerMode hourly/row cards use var(--radius-xl) (1.5rem) not rounded-2xl — matches Stitch border-radius spec
- [Phase 04-design-audit-rebuild]: OrbAnimation hardcodes Stitch rgba gradient values; primaryColor/secondaryColor props kept as _-prefixed aliases; defaults map to container tokens
- [Phase 04-design-audit-rebuild]: WAVE_COLOR corrected from #00d4ff (cyan) to #85adff (primary blue per Stitch Listening screen)
- [Phase 04-design-audit-rebuild]: AppShell wraps Listening/Speaking/Weather/Prayer modes; ThinkingMode and idle orb remain full-screen without shell
- [Phase 04-design-audit-rebuild]: MODE_LABELS map in ModeRouter keyed by AnimatePresence key string enables clean per-mode AppShell label routing
- [Phase 04-design-audit-rebuild]: ThinkingMode: 8 floating particles (primary/secondary colors) added around orb with staggered animation; status text uses on-surface-variant at reduced opacity per D-10
- [Phase 04-design-audit-rebuild]: Removed canvas waveform and useWaveVisualizer from ListeningMode — 14 equalizer bar divs replace canvas; idle interval animation drives bars when no analyser connected
- [Phase 04-design-audit-rebuild]: Removed formatCountdown in favour of splitCountdown for segmented HOURS/MINUTES/SECONDS display in PrayerMode
- [Phase 04-design-audit-rebuild]: Islamic date and Golden Hour in PrayerMode are stub placeholders — future plan to wire real data
- [Phase 04-design-audit-rebuild]: WeatherData extended with optional humidity/wind/visibility/UV fields — stats row shows '--' placeholders until backend provides data
- [Phase 04-design-audit-rebuild]: glassCard shared CSSProperties const for DRY glassmorphism across WeatherMode stat and hourly cards
- [Phase 05-voice-loop-weather-polish]: CONTENT_MODES checked first in ModeRouter so content screens stay visible during all voice states (LOOP-02)
- [Phase 05-voice-loop-weather-polish]: key=content-${mode} ensures AnimatePresence re-triggers on weather→prayer transition (LOOP-03)
- [Phase 05-voice-loop-weather-polish]: FloatingMic stopPropagation prevents double-fire with App.tsx handleTap (Pitfall 2)
- [Phase 05-voice-loop-weather-polish]: _fetch_weather geocoding uses OWM /geo/1.0/direct; falls back silently to Almaty on any failure
- [Phase 05-voice-loop-weather-polish]: UV index uses Open-Meteo free API (no key required); returns None on failure non-blocking
- [Phase 05-voice-loop-weather-polish]: _fetch_prayer switched from MuslimSalat to Aladhan API to match test expectations
- [Phase 05-voice-loop-weather-polish]: WeatherMode/PrayerMode accept onStartListening/onStopListening as optional props — backward-compatible if rendered without ModeRouter
- [Phase 05-voice-loop-weather-polish]: Old inline mic button in WeatherMode removed; replaced with shared FloatingMic component (Plan 05-03)
- [Phase 06-extended-modes]: Import helper functions inside test body (not module level) for RED scaffold validity — consistent with test_weather.py pattern
- [Phase 06-extended-modes]: _fetch_calendar signature uses only db arg to match test contract; _create_calendar_event added beyond plan scope to satisfy RED scaffold tests; asyncio.to_thread wraps all sync Google API calls
- [Phase 06-extended-modes]: _fetch_briefing signature (http_client, db, settings) matches test contract; plan order was different
- [Phase 06-extended-modes]: handleBriefingTrigger reuses thinking state FSM pipeline — sets transcript + state='thinking' to trigger existing runChat effect
- [Phase 06-extended-modes]: SearchMode.tsx and CalendarMode.tsx were lost during parallel worktree merge — restore from original commits when this happens in future parallel execution

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 2 risk: Deepgram WebSocket relay on iPadOS standalone PWA not confirmed end-to-end — validate on real device in Phase 2 sprint 1 before building mode views
- Phase 2 risk: Partial JSON streaming with Claude structured outputs needs implementation prototype — two-phase call (fast mode detection + streaming text) is the documented fallback
- Phase 4 risk: Google OAuth2 offline flow + Railway env var token storage needs explicit validation — plan step-by-step during Phase 4 planning

## Session Continuity

Last session: 2026-04-09T14:38:00.150Z
Stopped at: Completed 06-06-PLAN.md
Resume file: None

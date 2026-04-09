# Phase 6: Extended Modes - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the three remaining specialized modes: Search (Brave Search API with glassmorphism result cards), Calendar (Google Calendar with OAuth, voice-to-event creation), and Morning Briefing (split layout with weather + events + AI summary + quote, auto-trigger at 7 AM). After this phase, all 8 visual modes are functional.

</domain>

<decisions>
## Implementation Decisions

### Search Mode (SRCH-01 to SRCH-05)
- **D-01:** Backend calls Brave Search API via `_fetch_search(http_client, query)` when Claude returns `fetch: "search"`. Uses `X-Subscription-Token` header with `BRAVE_SEARCH_API_KEY` from config.
- **D-02:** Returns up to 3 results, each with: `title`, `url`, `description`, `favicon` (from Brave's `thumbnail` or constructed from domain).
- **D-03:** Frontend SearchMode.tsx: full-screen dark background, up to 3 stacked glassmorphism cards animating in from bottom with staggered delay.
- **D-04:** Each card shows: favicon + source domain, title (bold), snippet (on-surface-variant color).
- **D-05:** Cards are read-only (no tap-to-open in PWA — no external navigation). JARVIS reads the answer via TTS.
- **D-06:** SearchMode is a content mode — FloatingMic active, background listening, dismiss with "домой".

### Calendar Mode (CAL-01 to CAL-07)
- **D-07:** Google OAuth2 with offline refresh token. First-time setup: user visits `/api/auth/google` → Google consent → callback stores refresh token in MongoDB `settings` collection.
- **D-08:** Railway env vars needed: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
- **D-09:** Backend uses `google-api-python-client` + `google-auth` + `google-auth-oauthlib` for Calendar API access.
- **D-10:** `_fetch_calendar(http_client, settings, db)` loads refresh token from MongoDB, builds credentials, fetches events for the current week.
- **D-11:** Voice-to-event: Claude extracts event details (title, date, time, duration) from user speech → backend creates event via Calendar API → saves to MongoDB `events` collection.
- **D-12:** Frontend CalendarMode.tsx: week view in top half, events list with glassmorphism cards in bottom half.
- **D-13:** CalendarMode is a content mode — FloatingMic active, background listening.

### Morning Briefing Mode (BRIEF-01 to BRIEF-05)
- **D-14:** Backend `_fetch_briefing(http_client, settings, db)` fetches: current weather (Almaty), today's calendar events, then sends both to Claude to generate a personalized morning summary + inspirational quote.
- **D-15:** Two Claude calls for briefing: first the standard envelope call (detects intent), then a dedicated briefing call that receives weather + events data and returns summary text + quote.
- **D-16:** Frontend BriefingMode.tsx: split layout — events/tasks on left, weather summary on right. AI quote at bottom.
- **D-17:** Auto-trigger: frontend `setInterval` checks time every 60 seconds. If 7:00-7:05 AM, app is open, and briefing not shown today → display a tap-to-start prompt (iOS AudioContext requires gesture before TTS). Store `lastBriefingDate` in localStorage.
- **D-18:** Manual trigger: user says "утренний брифинг" / "morning briefing" / "доброе утро" → Claude returns `fetch: "briefing"`.
- **D-19:** BriefingMode is a content mode — FloatingMic active, background listening.

### Backend Fetch Dispatch Extension
- **D-20:** Extend `chat()` endpoint fetch dispatch: `search` → `_fetch_search()`, `calendar` → `_fetch_calendar()`, `briefing` → `_fetch_briefing()`.
- **D-21:** Claude RESPONSE_SCHEMA already has all modes in the enum — no schema changes needed.
- **D-22:** System prompt additions: search trigger rules, calendar voice-to-event extraction, briefing trigger phrases.

### Claude's Discretion
- Search result card animation timing and stagger values
- Calendar week view layout details (grid vs list)
- Briefing split layout proportions
- Quote style/source (Claude generates, no external API)
- Calendar event duration defaults when user doesn't specify

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `design.md` — Full design system, glassmorphism rules, Stitch screen IDs
- `CLAUDE.md` §Design Compliance — Mandatory 6-point verification checklist

### Existing Code (extend these)
- `backend/routers/chat.py` — Chat endpoint with fetch dispatch pattern (add search/calendar/briefing cases)
- `backend/config.py` — Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
- `frontend/src/components/ModeRouter.tsx` — CONTENT_MODES already includes search/calendar/briefing, add component rendering
- `frontend/src/App.tsx` — CONTENT_MODES_SET already includes search/calendar/briefing
- `frontend/src/store/assistantStore.ts` — AssistantMode type already includes search/calendar/briefing
- `frontend/src/api/client.ts` — ChatResponse interface, modeMap already handles all modes
- `frontend/src/modes/` — Add SearchMode.tsx, CalendarMode.tsx, BriefingMode.tsx
- `frontend/src/components/FloatingMic.tsx` — Reuse in all new content modes
- `frontend/src/components/AppShell.tsx` — Add MODE_LABELS for search/calendar/briefing in ModeRouter

### Project Specification
- `.planning/PROJECT.md` — Core value, API constraints
- `.planning/REQUIREMENTS.md` — Phase 6: SRCH-01–05, CAL-01–07, BRIEF-01–05

### Prior Phase Patterns
- `.planning/phases/03-information-modes/03-CONTEXT.md` — Weather/Prayer fetch pattern (model for search/calendar/briefing)
- `.planning/phases/05-voice-loop-weather-polish/05-CONTEXT.md` — FloatingMic + content mode behavior

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FloatingMic.tsx` — Drop into all new content modes (4 visual states, iOS-safe)
- `AppShell.tsx` — Wraps content modes with sidebar + top bar (add MODE_LABELS entries)
- `ModeRouter.tsx` — CONTENT_MODES set already includes search/calendar/briefing
- `chat.py` fetch dispatch — Pattern established: `if fetch_type == "X": fetched_data = await _fetch_X(...)` — extend with 3 new cases
- `config.py` Settings — Add Google OAuth fields with defaults
- Glassmorphism card pattern — Used in WeatherMode hourly cards + PrayerMode prayer cards

### Established Patterns
- Backend: fetch helper functions at module level, called from chat() endpoint
- Frontend: mode components are full-screen, receive optional onStartListening/onStopListening props
- Content modes: show FloatingMic, persist until "домой"
- Design: glassmorphism cards with `backdrop-filter: blur(24px)`, no borders, custom easing

### Integration Points
- `ModeRouter.tsx`: add SearchMode/CalendarMode/BriefingMode component imports and rendering cases
- `chat.py`: add _fetch_search, _fetch_calendar, _fetch_briefing + dispatch cases
- `config.py`: add Google OAuth settings
- New route: `/api/auth/google` + `/api/auth/google/callback` for OAuth flow
- MongoDB `settings` collection: store Google refresh token
- MongoDB `events` collection: store created calendar events

</code_context>

<specifics>
## Specific Ideas

- Search cards should feel like floating information panels — not a search engine results page
- Calendar should feel calm and organized — week at a glance, not cluttered
- Morning briefing is the "good morning" experience — warm, personal, not a dashboard dump
- Google OAuth is one-time setup — after that, it's invisible to the user
- All three modes follow the established content mode pattern (FloatingMic, background listening, dismiss with "домой")

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-extended-modes*
*Context gathered: 2026-04-09*

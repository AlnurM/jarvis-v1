---
phase: 06-extended-modes
verified: 2026-04-09T00:00:00Z
status: human_needed
score: 17/17 must-haves verified
re_verification: false
human_verification:
  - test: "Ask a factual question on iPad Safari standalone PWA (e.g. 'who won the World Cup') and verify 3 glassmorphism cards animate in from bottom with favicon, source name, title, and snippet"
    expected: "SearchMode renders with stagger animation, each card shows favicon + source + title + snippet, FloatingMic visible"
    why_human: "Visual layout and animation fidelity cannot be verified programmatically; requires real Brave API key on device"
  - test: "Ask 'что на моём календаре?' after authorising via /api/auth/google. Verify week grid (Mon–Sun, 7 columns) appears in top half and event cards in bottom half"
    expected: "CalendarMode shows 7-column week grid with today highlighted, events in correct day columns, event list below"
    why_human: "Google OAuth credential setup and real Calendar API response required; layout fidelity (top/bottom split) cannot be checked statically"
  - test: "Say 'добавь дантист в четверг в 15:00' and verify event created in Google Calendar and confirmation shows in UI"
    expected: "created_event card appears in CalendarMode, event visible in Google Calendar"
    why_human: "Requires live Google Calendar credentials and real write call"
  - test: "Say 'утренний брифинг' and verify split layout: events left, weather+summary right, quote at bottom, FloatingMic active"
    expected: "BriefingMode renders correct split layout; AI-generated Russian summary displayed; quote shown at bottom in italic glassmorphism card"
    why_human: "Real Claude second call and live weather/calendar data required; AI summary quality is subjective"
  - test: "At 7:00 AM on iPad with app open in idle state, verify tap-to-start overlay appears and triggers briefing on tap"
    expected: "showBriefingPrompt overlay shown, tap calls handleBriefingTrigger, briefing loads"
    why_human: "Requires real-time test at 7 AM; cannot simulate time-of-day trigger programmatically without modifying code"
  - test: "While on SearchMode/CalendarMode/BriefingMode, say 'домой' and verify return to idle state"
    expected: "Content mode dismissed, FloatingMic disappears, app returns to idle"
    why_human: "Voice loop dismiss behavior requires real device with microphone"
---

# Phase 6: Extended Modes Verification Report

**Phase Goal:** User can search the web, manage their Google Calendar by voice, and receive a morning briefing — all specialized modes are complete
**Verified:** 2026-04-09
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Brave Search API called with user query, up to 3 results returned with favicon/source/title/snippet | ✓ VERIFIED | `_fetch_search` at chat.py:195 calls `api.search.brave.com`, shapes results with favicon fallback to Google s2 service |
| 2 | SearchMode renders glassmorphism cards with stagger animation and FloatingMic | ✓ VERIFIED | SearchMode.tsx: `staggerChildren: 0.08`, `glassCard` CSSProperties, `FloatingMic` import and render confirmed |
| 3 | SearchMode is wired in ModeRouter under `mode === 'search'` with AppShell label | ✓ VERIFIED | ModeRouter.tsx:84 renders `<SearchMode>`, label `'content-search': { label: 'WEB INTELLIGENCE' }` at line 54 |
| 4 | Google OAuth2 flow: /api/auth/google redirects to Google, callback stores refresh_token in MongoDB | ✓ VERIFIED | auth.py: `google_auth_start` with `access_type="offline"` + `prompt="consent"`, `google_refresh_token` upserted to `db["settings"]` |
| 5 | _fetch_calendar reads this week's events from Google Calendar via asyncio.to_thread | ✓ VERIFIED | chat.py:238 uses `asyncio.to_thread(_build_calendar_service)`, returns not-authorized error when no refresh token (line 242) |
| 6 | _create_calendar_event creates event via Calendar API and saves to MongoDB events collection | ✓ VERIFIED | chat.py:273, `asyncio.to_thread(_insert_event)` then `db["events"].insert_one` at line 303 |
| 7 | Calendar dispatch handles both read (empty query) and write (JSON query) intents | ✓ VERIFIED | chat.py:437–459: branch on `query_str.strip().startswith("{")` for write vs read |
| 8 | CalendarMode renders week grid (7 columns) in top half, event cards in bottom half, with not-authorized handling | ✓ VERIFIED | CalendarMode.tsx: `gridTemplateColumns: 'repeat(7, 1fr)'` at line 233; `calendar_not_authorized` error state at line 123; FloatingMic at line 455 |
| 9 | CalendarMode is wired in ModeRouter with AppShell label | ✓ VERIFIED | ModeRouter.tsx:86 renders `<CalendarMode>`, label `'content-calendar': { label: 'SCHEDULE MATRIX' }` at line 55 |
| 10 | _fetch_briefing composes weather + calendar in parallel and makes a second Claude call for summary + quote | ✓ VERIFIED | chat.py:317–319: `asyncio.gather(weather_task, calendar_task)`; second `client.messages.create` at line 339 with briefing_prompt |
| 11 | BriefingMode renders split layout (1fr 1fr): events left, weather+summary right, quote at bottom | ✓ VERIFIED | BriefingMode.tsx:91 `gridTemplateColumns: '1fr 1fr'`; quote section at line 283; FloatingMic at line 327 |
| 12 | BriefingMode is wired in ModeRouter with AppShell label | ✓ VERIFIED | ModeRouter.tsx:88 renders `<BriefingMode>`, label `'content-briefing': { label: 'MORNING PROTOCOL' }` at line 56 |
| 13 | App.tsx has 7 AM auto-trigger with tap-to-start overlay and localStorage dedup | ✓ VERIFIED | App.tsx:50 `showBriefingPrompt`, line 67 `lastBriefingDate` localStorage check, line 69 `h === 7 && m < 5` condition, line 208 overlay render |
| 14 | SYSTEM_PROMPT instructs Claude to trigger correct fetch type for all 3 new modes | ✓ VERIFIED | chat.py:56 `fetch='search'`, line 59 `fetch='calendar'`, line 67/68 `fetch='briefing'` with Russian phrases; `duration_minutes` JSON format at line 62 |
| 15 | All new backend tests pass (search, calendar, auth, briefing — 11+ tests) | ✓ VERIFIED | `pytest tests/ -v` reports 36 passed, 0 failures |
| 16 | TypeScript compiles without errors | ✓ VERIFIED | `npx tsc --noEmit` exits 0 with no output |
| 17 | Dockerfile builds with Google packages via requirements.txt pip install | ✓ VERIFIED | Dockerfile:13–14 `COPY backend/requirements.txt` + `pip install -r requirements.txt`; requirements.txt:12–15 lists all 4 Google packages |

**Score:** 17/17 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/requirements.txt` | Google API packages added | ✓ VERIFIED | Lines 12–15: all 4 Google packages at pinned versions |
| `backend/config.py` | Google OAuth config fields | ✓ VERIFIED | Lines 12–14: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI with empty string defaults |
| `tests/test_search.py` | Search fetch tests | ✓ VERIFIED | 3 tests: test_fetch_search_returns_shaped_payload, test_fetch_search_empty_results, test_chat_returns_search_data — all PASS |
| `tests/test_calendar.py` | Calendar fetch tests | ✓ VERIFIED | 4 tests: fetch_week_events, not_authorized, create_event, event_saved_to_mongo — all PASS |
| `tests/test_auth.py` | OAuth route tests | ✓ VERIFIED | 2 tests: google_auth_redirects, google_callback_stores_token — all PASS |
| `tests/test_briefing.py` | Briefing fetch tests | ✓ VERIFIED | 2 tests: fetch_briefing_returns_shaped_payload, chat_returns_briefing_data — all PASS |
| `backend/routers/auth.py` | Google OAuth2 routes | ✓ VERIFIED | google_auth_start, google_auth_callback, Flow.from_client_config, refresh_token stored |
| `backend/routers/chat.py` | All fetch helpers + dispatch | ✓ VERIFIED | _fetch_search, _build_calendar_service, _fetch_calendar, _create_calendar_event, _fetch_briefing — all present; 5 dispatch cases confirmed |
| `frontend/src/modes/SearchMode.tsx` | Search result cards UI | ✓ VERIFIED | glassCard, staggerChildren, FloatingMic, modeData consumption — substantive implementation |
| `frontend/src/modes/CalendarMode.tsx` | Calendar week view + events | ✓ VERIFIED | repeat(7, 1fr) week grid, event cards, calendar_not_authorized handling, FloatingMic |
| `frontend/src/modes/BriefingMode.tsx` | Morning briefing split layout | ✓ VERIFIED | 1fr 1fr grid, events left, weather+summary right, quote bottom, FloatingMic |
| `frontend/src/components/ModeRouter.tsx` | All 3 new modes wired | ✓ VERIFIED | Imports + renders SearchMode, CalendarMode, BriefingMode; MODE_LABELS entries present |
| `frontend/src/App.tsx` | 7 AM auto-trigger | ✓ VERIFIED | showBriefingPrompt, lastBriefingDate, 7 AM interval check, overlay render |
| `backend/main.py` | Auth router registered | ✓ VERIFIED | `from routers import auth as auth_router_module` + `app.include_router(auth_router_module.router)` before static mount |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `backend/routers/chat.py` | Brave Search API | `_fetch_search` httpx GET | ✓ WIRED | `api.search.brave.com` at chat.py:198; favicon fallback to Google s2 at line 210 |
| `frontend/src/components/ModeRouter.tsx` | `SearchMode.tsx` | import + CONTENT_MODES render | ✓ WIRED | Import at line 22; render at line 84 |
| `frontend/src/modes/SearchMode.tsx` | `assistantStore.ts` | `useAssistantStore().modeData` | ✓ WIRED | `modeData` consumed at SearchMode.tsx:61–62 |
| `backend/routers/auth.py` | `google_auth_oauthlib.flow.Flow` | `Flow.from_client_config` | ✓ WIRED | auth.py:14 |
| `backend/routers/auth.py` | MongoDB settings collection | `db["settings"].update_one` stores refresh_token | ✓ WIRED | auth.py:52 upserts `google_refresh_token` |
| `backend/routers/chat.py` | `googleapiclient.discovery.build` | `asyncio.to_thread` wraps sync Calendar API | ✓ WIRED | chat.py:235, 245, 280, 291 |
| `backend/routers/chat.py` | MongoDB events collection | `db["events"].insert_one` after Calendar API success | ✓ WIRED | chat.py:303 |
| `frontend/src/components/ModeRouter.tsx` | `CalendarMode.tsx` | import + CONTENT_MODES render | ✓ WIRED | Import at line 23; render at line 86 |
| `backend/routers/chat.py` | Anthropic Claude API (second call) | `_fetch_briefing` second `client.messages.create` | ✓ WIRED | chat.py:339 inside `_fetch_briefing` |
| `backend/routers/chat.py` | `_fetch_weather` + `_fetch_calendar` | `_fetch_briefing` composes both via `asyncio.gather` | ✓ WIRED | chat.py:317–319 |
| `frontend/src/App.tsx` | `BriefingMode.tsx` | `setInterval` 7 AM trigger via `handleBriefingTrigger` | ✓ WIRED | App.tsx:50 `showBriefingPrompt`, line 67–71 interval logic |
| `frontend/src/components/ModeRouter.tsx` | `BriefingMode.tsx` | import + CONTENT_MODES render | ✓ WIRED | Import at line 24; render at line 88 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `SearchMode.tsx` | `modeData as SearchData` | `_fetch_search` → `envelope.data` → `setModeData` in App.tsx:117 | Yes — Brave API results shaped with title/url/description/favicon/source | ✓ FLOWING |
| `CalendarMode.tsx` | `modeData as CalendarData` | `_fetch_calendar` / `_create_calendar_event` → `envelope.data` → `setModeData` | Yes — Google Calendar API events; MongoDB insert confirmed | ✓ FLOWING |
| `BriefingMode.tsx` | `modeData as BriefingData` | `_fetch_briefing` → parallel weather+calendar gather + Claude call → `envelope.data` → `setModeData` | Yes — real weather + calendar + Claude-generated summary/quote | ✓ FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite (36 tests) | `pytest tests/ -v` | 36 passed, 0 failures | ✓ PASS |
| TypeScript compile | `npx tsc --noEmit` | No errors | ✓ PASS |
| 5 dispatch cases in chat() | `grep 'fetch_type ==' backend/routers/chat.py` | weather, prayer, search, calendar, briefing (5 matches) | ✓ PASS |
| Google packages installed | `grep google backend/requirements.txt` | 4 packages at pinned versions | ✓ PASS |
| Auth router registered in main.py | `grep auth_router_module backend/main.py` | Imported and included | ✓ PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SRCH-01 | 06-02 | Floating glassmorphism cards (max 3 visible) | ✓ SATISFIED | SearchMode.tsx: up to 3 cards with glassCard CSSProperties |
| SRCH-02 | 06-02 | Each card: favicon + source name, title, snippet | ✓ SATISFIED | SearchMode.tsx renders favicon img, source domain, title, description |
| SRCH-03 | 06-02 | Cards animate in from bottom | ✓ SATISFIED | cardVariants: `hidden: { y: 40 }` → `visible: { y: 0 }` with staggerChildren |
| SRCH-04 | 06-01, 06-02 | Data from Brave Search API | ✓ SATISFIED | `_fetch_search` calls `api.search.brave.com` at chat.py:198 |
| SRCH-05 | 06-01, 06-02 | Triggered when Claude determines web search needed | ✓ SATISFIED | SYSTEM_PROMPT line 56 instructs `fetch='search'` for web search requests; dispatch at chat.py:432 |
| CAL-01 | 06-04 | Week view displayed in top half of screen | ✓ SATISFIED | CalendarMode.tsx: `gridTemplateColumns: 'repeat(7, 1fr)'` renders 7-column week grid |
| CAL-02 | 06-04 | Events list in bottom half with glassmorphism cards | ✓ SATISFIED | CalendarMode.tsx: event list below week grid with glassCard pattern |
| CAL-03 | 06-01, 06-03 | Read events from Google Calendar API | ✓ SATISFIED | `_fetch_calendar` at chat.py:238 uses Calendar API via asyncio.to_thread |
| CAL-04 | 06-01, 06-04 | Voice-to-event creation ("add dentist Thursday 3pm") | ✓ SATISFIED | `_create_calendar_event` at chat.py:273; JSON query dispatch at line 437 |
| CAL-05 | 06-01, 06-04 | Created events saved to MongoDB events collection | ✓ SATISFIED | chat.py:303 `db["events"].insert_one` after successful Calendar API insert |
| CAL-06 | 06-01, 06-03 | Google OAuth2 authentication flow | ✓ SATISFIED | auth.py: /api/auth/google → Google consent → /api/auth/google/callback stores refresh_token |
| CAL-07 | 06-04 | Triggered when user asks about schedule or "add to calendar" | ✓ SATISFIED | SYSTEM_PROMPT lines 59–63 with calendar fetch rules and JSON query format |
| BRIEF-01 | 06-05 | Split layout — tasks/events left, weather right | ✓ SATISFIED | BriefingMode.tsx:91 `gridTemplateColumns: '1fr 1fr'` |
| BRIEF-02 | 06-05 | AI-generated personalized morning summary via Claude | ✓ SATISFIED | `_fetch_briefing` second Claude call at chat.py:339; summary placed in return dict |
| BRIEF-03 | 06-05 | AI quote displayed at bottom | ✓ SATISFIED | BriefingMode.tsx:282–325: full-width quote card spanning both columns |
| BRIEF-04 | 06-05 | Auto-triggers at 7:00 AM if app is open | ✓ SATISFIED | App.tsx:50,67,69,71,208: interval check at 7 AM, localStorage dedup, tap-to-start overlay |
| BRIEF-05 | 06-01, 06-05 | Can be triggered manually by user request | ✓ SATISFIED | SYSTEM_PROMPT lines 67–68 instructs `fetch='briefing'` for "утренний брифинг" / "morning briefing" |

**All 17 requirements satisfied by implementation evidence.**

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | No stub patterns found | — | — |

No TODOs, empty handlers, placeholder returns, or hardcoded empty data detected in the phase's modified files. All `useState`, `useEffect`, and fetch calls are substantive.

---

### Human Verification Required

The automated checks all pass. Six items require device-level verification:

#### 1. Search Mode Visual Fidelity

**Test:** Deploy to Railway with `BRAVE_SEARCH_API_KEY` set. Say a factual question and verify 3 glassmorphism cards animate in from below with stagger timing.
**Expected:** Cards appear with favicon image, source domain, bold title, snippet text. Backdrop blur visible. FloatingMic pulsing at bottom-right.
**Why human:** Requires real Brave API key; visual blur/glassmorphism fidelity cannot be verified from static code.

#### 2. Calendar Week View + Event Display

**Test:** Authorize Google Calendar via `/api/auth/google`. Ask "что на моём календаре?" and verify the 7-column week grid displays with events in the correct day columns.
**Expected:** Mon–Sun header, today's column highlighted, event chips in correct day slots, event list below with time + title cards.
**Why human:** Requires live Google OAuth credentials; week grid day-placement logic needs real data to confirm.

#### 3. Voice-to-Event Creation

**Test:** Say "добавь дантист в четверг в 15:00". Verify the event appears in Google Calendar and the UI shows a "created_event" confirmation.
**Expected:** Event in Google Calendar with correct time; CalendarMode re-renders with created_event card highlighted.
**Why human:** Requires live Google Calendar write permission.

#### 4. Morning Briefing Split Layout + AI Content

**Test:** Say "утренний брифинг". Verify split layout renders with today's events left, weather + AI summary right, and an AI-generated Russian quote at the bottom.
**Expected:** Two-column layout, meaningful Russian summary, inspirational quote in italic glassmorphism card. FloatingMic visible.
**Why human:** Requires live Claude API call and real weather/calendar data; AI-generated content quality is subjective.

#### 5. 7 AM Auto-Trigger Overlay

**Test:** Set device clock to 7:00 AM with app open in idle state. Verify "Good Morning / Tap to start your morning briefing" overlay appears and tap triggers briefing.
**Expected:** Overlay with glassmorphism card appears; tap dismisses overlay and loads briefing mode.
**Why human:** Cannot simulate time-of-day condition in automated test.

#### 6. Content Mode Voice Loop Behavior

**Test:** While on any of the three new content modes (search/calendar/briefing), say "домой" and verify app returns to idle.
**Expected:** Content mode dismissed, app returns to idle state without FloatingMic.
**Why human:** Requires microphone + voice recognition on real device; dismiss behavior is voice-driven.

---

### Summary

Phase 6 automated verification passed completely. All 17 observable truths are confirmed against actual code:

- **Search mode (SRCH-01–05):** `_fetch_search` calls Brave API with up to 3 results, favicon fallback implemented. `SearchMode.tsx` renders glassmorphism cards with stagger animation. ModeRouter wires it under `content-search` with "WEB INTELLIGENCE" label.

- **Calendar mode (CAL-01–07):** OAuth2 flow in `auth.py` with offline access and consent prompt. `_fetch_calendar` wraps Google Calendar API in `asyncio.to_thread`. `_create_calendar_event` writes to Calendar and persists to MongoDB. `CalendarMode.tsx` has 7-column week grid and event list. Dispatch handles both read/write intents via JSON query detection.

- **Briefing mode (BRIEF-01–05):** `_fetch_briefing` gathers weather + calendar in parallel then makes a second Claude call for Russian summary + inspirational quote. `BriefingMode.tsx` has `1fr 1fr` split layout, quote card at bottom. `App.tsx` 7 AM auto-trigger with `localStorage` dedup and tap-to-start overlay.

- **Integration:** 36/36 tests pass. TypeScript compiles clean. Dockerfile picks up Google packages via `requirements.txt`. All 5 fetch dispatch cases present in `chat()`. SYSTEM_PROMPT covers all 3 new fetch triggers in Russian and English.

The only items not verifiable programmatically are visual fidelity, real API calls, and the 7 AM time-based trigger — all requiring device testing.

---

_Verified: 2026-04-09_
_Verifier: Claude (gsd-verifier)_

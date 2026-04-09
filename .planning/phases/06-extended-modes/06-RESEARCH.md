# Phase 6: Extended Modes - Research

**Researched:** 2026-04-09
**Domain:** Brave Search API, Google Calendar OAuth2, Morning Briefing orchestration, React glassmorphism modes
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Search Mode (SRCH-01 to SRCH-05)**
- D-01: Backend calls Brave Search API via `_fetch_search(http_client, query)` when Claude returns `fetch: "search"`. Uses `X-Subscription-Token` header with `BRAVE_SEARCH_API_KEY` from config.
- D-02: Returns up to 3 results, each with: `title`, `url`, `description`, `favicon` (from Brave's `thumbnail` or constructed from domain).
- D-03: Frontend SearchMode.tsx: full-screen dark background, up to 3 stacked glassmorphism cards animating in from bottom with staggered delay.
- D-04: Each card shows: favicon + source domain, title (bold), snippet (on-surface-variant color).
- D-05: Cards are read-only (no tap-to-open in PWA — no external navigation). JARVIS reads the answer via TTS.
- D-06: SearchMode is a content mode — FloatingMic active, background listening, dismiss with "домой".

**Calendar Mode (CAL-01 to CAL-07)**
- D-07: Google OAuth2 with offline refresh token. First-time setup: user visits `/api/auth/google` → Google consent → callback stores refresh token in MongoDB `settings` collection.
- D-08: Railway env vars needed: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
- D-09: Backend uses `google-api-python-client` + `google-auth` + `google-auth-oauthlib` for Calendar API access.
- D-10: `_fetch_calendar(http_client, settings, db)` loads refresh token from MongoDB, builds credentials, fetches events for the current week.
- D-11: Voice-to-event: Claude extracts event details (title, date, time, duration) from user speech → backend creates event via Calendar API → saves to MongoDB `events` collection.
- D-12: Frontend CalendarMode.tsx: week view in top half, events list with glassmorphism cards in bottom half.
- D-13: CalendarMode is a content mode — FloatingMic active, background listening.

**Morning Briefing Mode (BRIEF-01 to BRIEF-05)**
- D-14: Backend `_fetch_briefing(http_client, settings, db)` fetches: current weather (Almaty), today's calendar events, then sends both to Claude to generate a personalized morning summary + inspirational quote.
- D-15: Two Claude calls for briefing: first the standard envelope call (detects intent), then a dedicated briefing call that receives weather + events data and returns summary text + quote.
- D-16: Frontend BriefingMode.tsx: split layout — events/tasks on left, weather summary on right. AI quote at bottom.
- D-17: Auto-trigger: frontend `setInterval` checks time every 60 seconds. If 7:00-7:05 AM, app is open, and briefing not shown today → display a tap-to-start prompt (iOS AudioContext requires gesture before TTS). Store `lastBriefingDate` in localStorage.
- D-18: Manual trigger: user says "утренний брифинг" / "morning briefing" / "доброе утро" → Claude returns `fetch: "briefing"`.
- D-19: BriefingMode is a content mode — FloatingMic active, background listening.

**Backend Fetch Dispatch Extension**
- D-20: Extend `chat()` endpoint fetch dispatch: `search` → `_fetch_search()`, `calendar` → `_fetch_calendar()`, `briefing` → `_fetch_briefing()`.
- D-21: Claude RESPONSE_SCHEMA already has all modes in the enum — no schema changes needed.
- D-22: System prompt additions: search trigger rules, calendar voice-to-event extraction, briefing trigger phrases.

### Claude's Discretion
- Search result card animation timing and stagger values
- Calendar week view layout details (grid vs list)
- Briefing split layout proportions
- Quote style/source (Claude generates, no external API)
- Calendar event duration defaults when user doesn't specify

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SRCH-01 | Floating glassmorphism cards (max 3 visible) | glassCard pattern from WeatherMode; motion stagger variant |
| SRCH-02 | Each card shows: favicon + source name, title, snippet | Brave API `meta_url.favicon` + `meta_url.netloc` + `title` + `description` fields confirmed |
| SRCH-03 | Cards animate in from bottom | motion `variants` with `staggerChildren` and `y: 40 → 0` per-card |
| SRCH-04 | Data from Brave Search API | `GET https://api.search.brave.com/res/v1/web/search` with `X-Subscription-Token` header; `count=3` param |
| SRCH-05 | Triggered when Claude determines web search is needed | Existing `fetch: "search"` dispatch in chat.py; extend with `_fetch_search()` case |
| CAL-01 | Week view displayed in top half of screen | CSS grid 7-column for days; start-of-week is Monday (Almaty locale) |
| CAL-02 | Events list in bottom half with glassmorphism cards | Same glassCard pattern; one card per event |
| CAL-03 | Read events from Google Calendar API | `service.events().list(calendarId='primary', timeMin=..., timeMax=..., singleEvents=True)` |
| CAL-04 | Voice-to-event creation ("add dentist Thursday 3pm") | Claude extracts JSON with title/date/time/duration; backend calls `service.events().insert()` |
| CAL-05 | Created events saved to MongoDB events collection | `db["events"].insert_one()` after Calendar API success |
| CAL-06 | Google OAuth2 authentication flow for calendar access | `Flow.from_client_config()` → `/api/auth/google` + `/api/auth/google/callback`; `access_type=offline&prompt=consent` mandatory |
| CAL-07 | Triggered when user asks about schedule or adds to calendar | `fetch: "calendar"` in Claude envelope; system prompt handles both read and write intents |
| BRIEF-01 | Split layout — tasks/events left, weather right | CSS `display: grid; grid-template-columns: 1fr 1fr` for landscape iPad |
| BRIEF-02 | AI-generated personalized morning summary via Claude | Second Claude call inside `_fetch_briefing()` using free-text format (not JSON schema) |
| BRIEF-03 | AI quote displayed at bottom | Returned from second Claude call as `{"summary": "...", "quote": "..."}` |
| BRIEF-04 | Auto-triggers at 7:00 AM if app is open (requires user gesture for audio) | `setInterval` in App.tsx; stores `lastBriefingDate` in localStorage; shows tap-to-start overlay |
| BRIEF-05 | Can be triggered manually by user request | `fetch: "briefing"` in Claude envelope on phrases "утренний брифинг" / "morning briefing" |
</phase_requirements>

---

## Summary

Phase 6 adds three content modes (Search, Calendar, Briefing) that are entirely new surface area but follow the established pattern precisely: backend fetch helper → dispatch in `chat()` → frontend content mode component with `FloatingMic`. The architectural plumbing is already 80% done — `RESPONSE_SCHEMA`, `AssistantMode` type, `CONTENT_MODES` set, and `ModeRouter` skeleton all reference these modes.

The highest-complexity item is Google Calendar OAuth2. The OAuth flow requires two new FastAPI routes (`/api/auth/google`, `/api/auth/google/callback`), three new env vars on Railway, and a one-time user visit to authorize. The refresh token is stored in MongoDB `settings` and used by `_fetch_calendar()` on every subsequent call. The `google-api-python-client` library handles the synchronous Calendar API, but must be wrapped in `asyncio.to_thread()` to avoid blocking the FastAPI event loop.

Search and Briefing are low-risk: Brave Search is a single GET request with a well-documented response shape, and Briefing is a composition of already-wired fetches (weather + calendar) plus a second Claude call. The frontend for all three modes follows the existing `glassCard` pattern exactly.

**Primary recommendation:** Implement in order — Search (simplest), then Calendar (OAuth complexity), then Briefing (depends on both). Each wave is independently releasable and testable.

---

## Standard Stack

### Backend (New Dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| google-api-python-client | 2.194.0 (latest) | Google Calendar REST client | Official Google library; auto-handles token refresh |
| google-auth | 2.49.1 (latest) | Google credential management | Required by google-api-python-client |
| google-auth-oauthlib | 1.3.1 (latest) | OAuth2 flow implementation | Required for web server OAuth2 callback flow |
| google-auth-httplib2 | 0.2.0 | HTTP transport for google-auth | Required by google-api-python-client |

**Version verification:** Confirmed against PyPI on 2026-04-09.

**No new frontend packages needed.** All new modes use existing dependencies: `motion/react`, `zustand`, Tailwind v4.

### Frontend (Existing — Reuse)
| Library | Version | Purpose | Already in use |
|---------|---------|---------|--------------|
| motion | ^12.38.0 | Card stagger animations | Yes — all modes |
| zustand | ^5.0.12 | `modeData` from store | Yes — all modes |
| Tailwind v4 | ^4.2.2 | Utility classes | Yes — all modes |

**Installation (backend only):**
```bash
pip install google-api-python-client==2.194.0 google-auth==2.49.1 google-auth-oauthlib==1.3.1 google-auth-httplib2==0.2.0
```

Add to `backend/requirements.txt`:
```
google-api-python-client==2.194.0
google-auth==2.49.1
google-auth-oauthlib==1.3.1
google-auth-httplib2==0.2.0
```

---

## Architecture Patterns

### Recommended Project Structure (New Files Only)
```
backend/
├── routers/
│   ├── chat.py           # Extend: add _fetch_search, _fetch_calendar, _fetch_briefing + auth routes
│   └── auth.py           # NEW: /api/auth/google + /api/auth/google/callback OAuth routes
├── config.py             # Extend: add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI

frontend/src/
├── modes/
│   ├── SearchMode.tsx    # NEW
│   ├── CalendarMode.tsx  # NEW
│   └── BriefingMode.tsx  # NEW
└── components/
    └── ModeRouter.tsx    # Extend: wire SearchMode/CalendarMode/BriefingMode + MODE_LABELS entries
```

### Pattern 1: Backend Fetch Helper Extension (Established Pattern)
**What:** Module-level async function called from `chat()` dispatch. Same as `_fetch_weather` and `_fetch_prayer`.
**When to use:** Every new data source.

```python
# Source: established pattern in backend/routers/chat.py
async def _fetch_search(http_client, query: str) -> dict:
    resp = await http_client.get(
        "https://api.search.brave.com/res/v1/web/search",
        params={"q": query, "count": 3},
        headers={"X-Subscription-Token": settings.BRAVE_SEARCH_API_KEY, "Accept": "application/json"}
    )
    resp.raise_for_status()
    raw = resp.json()
    results = []
    for item in raw.get("web", {}).get("results", [])[:3]:
        results.append({
            "title": item.get("title", ""),
            "url": item.get("url", ""),
            "description": item.get("description", ""),
            "favicon": item.get("meta_url", {}).get("favicon", ""),
            "source": item.get("meta_url", {}).get("netloc", ""),
        })
    return {"results": results}

# Dispatch in chat():
elif fetch_type == "search":
    try:
        fetched_data = await _fetch_search(request.app.state.http_client, envelope.get("query", ""))
    except Exception as e:
        print(f"[WARN] Search fetch failed: {e}")
```

### Pattern 2: Google Calendar Fetch Helper
**What:** Loads refresh token from MongoDB → builds Credentials → calls Calendar API synchronously via `asyncio.to_thread()`.
**When to use:** Both read (week events) and write (create event) calendar operations.

```python
# Source: google-api-python-client docs + Google OAuth2 web server flow docs
import asyncio
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar"]

def _build_calendar_service(refresh_token: str, settings) -> object:
    """Sync helper — must be called via asyncio.to_thread()."""
    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        token_uri="https://oauth2.googleapis.com/token",
        scopes=CALENDAR_SCOPES,
    )
    creds.refresh(Request())  # Fetch a fresh access token
    return build("calendar", "v3", credentials=creds)

async def _fetch_calendar(http_client, settings, db) -> dict:
    """Fetch this week's events from Google Calendar."""
    settings_doc = await db["settings"].find_one({"key": "google_refresh_token"})
    if not settings_doc:
        return {"error": "calendar_not_authorized", "events": []}

    refresh_token = settings_doc["value"]
    # Calendar API is synchronous — wrap in thread to avoid blocking event loop
    service = await asyncio.to_thread(_build_calendar_service, refresh_token, settings)

    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=7)

    def _list_events():
        result = service.events().list(
            calendarId="primary",
            timeMin=week_start.isoformat(),
            timeMax=week_end.isoformat(),
            singleEvents=True,
            orderBy="startTime",
            maxResults=20,
        ).execute()
        return result.get("items", [])

    raw_events = await asyncio.to_thread(_list_events)
    events = []
    for e in raw_events:
        start = e["start"].get("dateTime", e["start"].get("date", ""))
        end = e["end"].get("dateTime", e["end"].get("date", ""))
        events.append({"id": e["id"], "title": e.get("summary", ""), "start": start, "end": end})

    return {"events": events, "week_start": week_start.isoformat()}
```

### Pattern 3: Create Calendar Event
**What:** Claude extracts structured event data from voice transcript → backend inserts via Calendar API → saves to MongoDB.

```python
# Source: Google Calendar API docs — events.insert
async def _create_calendar_event(settings, db, title: str, start_dt: str, end_dt: str) -> dict:
    """Create a single event. start_dt/end_dt are ISO 8601 strings with timezone."""
    settings_doc = await db["settings"].find_one({"key": "google_refresh_token"})
    if not settings_doc:
        return {"error": "calendar_not_authorized"}

    service = await asyncio.to_thread(_build_calendar_service, settings_doc["value"], settings)
    event_body = {
        "summary": title,
        "start": {"dateTime": start_dt, "timeZone": "Asia/Almaty"},
        "end": {"dateTime": end_dt, "timeZone": "Asia/Almaty"},
    }

    def _insert():
        return service.events().insert(calendarId="primary", body=event_body).execute()

    created = await asyncio.to_thread(_insert)
    return {"id": created["id"], "title": title, "start": start_dt, "end": end_dt}
```

### Pattern 4: Google OAuth2 Web Server Flow (FastAPI Routes)
**What:** Two routes implement the OAuth2 callback flow. The refresh token is stored once in MongoDB.

```python
# Source: Google OAuth2 web server flow docs + google-auth-oauthlib docs
# Place in backend/routers/auth.py (new file)
from google_auth_oauthlib.flow import Flow

CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar"]

@router.get("/api/auth/google")
async def google_auth_start(request: Request):
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=CALENDAR_SCOPES,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
    )
    auth_url, state = flow.authorization_url(
        access_type="offline",     # REQUIRED for refresh token
        prompt="consent",          # REQUIRED to always get refresh token (not just first time)
        include_granted_scopes="true",
    )
    return RedirectResponse(auth_url)

@router.get("/api/auth/google/callback")
async def google_auth_callback(request: Request, code: str, state: str = ""):
    flow = Flow.from_client_config(...)  # same config as above
    flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
    flow.fetch_token(code=code)
    creds = flow.credentials
    db = request.app.state.db
    await db["settings"].update_one(
        {"key": "google_refresh_token"},
        {"$set": {"value": creds.refresh_token}},
        upsert=True,
    )
    return {"status": "authorized"}
```

**Critical:** `prompt="consent"` is mandatory. Without it, Google only returns the refresh token on the first authorization, not on re-authorizations. If skipped, the token will be `None` on reuse.

### Pattern 5: Briefing Second Claude Call
**What:** `_fetch_briefing()` makes a second call to Claude using free-text format (not JSON schema) to generate personalized summary + quote.

```python
async def _fetch_briefing(http_client, settings, db) -> dict:
    weather = await _fetch_weather(http_client, settings)
    calendar = await _fetch_calendar(http_client, settings, db)

    # Second Claude call — free text, not structured JSON schema
    briefing_prompt = (
        f"Weather in Almaty: {weather['temp']}°C, {weather['condition_main']}. "
        f"Today's events: {[e['title'] for e in calendar.get('events', [])[:5]]}. "
        "Write a warm, personal 2-sentence morning summary in Russian. "
        "Then write one short inspirational quote. "
        'Reply ONLY as JSON: {"summary": "...", "quote": "..."}'
    )
    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=300,
        messages=[{"role": "user", "content": briefing_prompt}],
    )
    briefing_text = json.loads(response.content[0].text)
    return {
        "weather": weather,
        "events": calendar.get("events", []),
        "summary": briefing_text.get("summary", ""),
        "quote": briefing_text.get("quote", ""),
    }
```

### Pattern 6: Frontend Mode Component Structure (Established Pattern)
**What:** All three new modes follow WeatherMode/PrayerMode exactly.

```typescript
// Source: established pattern from WeatherMode.tsx + PrayerMode.tsx
// SearchMode.tsx skeleton
import { motion } from 'motion/react'
import { useAssistantStore } from '../store/assistantStore'
import { FloatingMic } from '../components/FloatingMic'

interface SearchResult { title: string; url: string; description: string; favicon: string; source: string }
interface SearchData { results: SearchResult[] }

interface SearchModeProps {
  onStartListening?: () => void
  onStopListening?: () => void
}

export function SearchMode({ onStartListening, onStopListening }: SearchModeProps) {
  const { modeData } = useAssistantStore()
  const data = modeData as SearchData | null
  // ...render 3 glassmorphism cards with stagger
}
```

### Pattern 7: ModeRouter Extension (Three New Entries)
**What:** Add three `else if` blocks inside the `CONTENT_MODES.has(mode)` branch in ModeRouter.tsx, plus three MODE_LABELS entries.

```typescript
// Source: existing ModeRouter.tsx pattern
// In the CONTENT_MODES branch:
} else if (mode === 'search') {
  contentComponent = <SearchMode onStartListening={onStartListening} onStopListening={onStopListening} />
} else if (mode === 'calendar') {
  contentComponent = <CalendarMode onStartListening={onStartListening} onStopListening={onStopListening} />
} else if (mode === 'briefing') {
  contentComponent = <BriefingMode onStartListening={onStartListening} onStopListening={onStopListening} />
}

// In MODE_LABELS:
'content-search': { label: 'WEB INTELLIGENCE', status: 'LIVE RESULTS' },
'content-calendar': { label: 'SCHEDULE MATRIX', status: 'GOOGLE CALENDAR' },
'content-briefing': { label: 'MORNING PROTOCOL', status: 'BRIEFING ACTIVE' },
```

### Pattern 8: Auto-Trigger Morning Briefing (Frontend)
**What:** `setInterval` in `App.tsx` (or a `useEffect` in `BriefingMode`/a dedicated hook) checks time every 60 seconds.

```typescript
// Source: D-17, iOS AudioContext constraint (must show tap-to-start, not auto-play)
useEffect(() => {
  const interval = setInterval(() => {
    const now = new Date()
    const h = now.getHours()
    const m = now.getMinutes()
    const today = now.toDateString()
    const lastBriefing = localStorage.getItem('lastBriefingDate')
    if (h === 7 && m < 5 && lastBriefing !== today && state === 'idle') {
      // Show tap-to-start overlay — iOS requires user gesture for AudioContext/TTS
      setShowBriefingPrompt(true)
      localStorage.setItem('lastBriefingDate', today)
    }
  }, 60_000)
  return () => clearInterval(interval)
}, [state])
// On tap: call chatWithJarvis with transcript "morning briefing"
```

### Anti-Patterns to Avoid
- **Calling googleapiclient.build() directly in async context:** The `build()` function and all API calls are synchronous. Always wrap in `asyncio.to_thread()` to avoid blocking uvicorn's event loop.
- **Omitting `prompt="consent"` from OAuth URL:** Google only issues a refresh token on first authorization if `prompt="consent"` is absent. The second auth attempt returns `refresh_token: None`. Store will fail silently.
- **Calling `prompt="consent"` without `access_type="offline"`:** `access_type="offline"` is what actually triggers the refresh token. Both parameters are required together.
- **Auto-playing TTS on briefing auto-trigger:** iOS Safari requires user gesture before any AudioContext or SpeechSynthesis call. The auto-trigger must show a tap-to-start overlay; never call TTS programmatically without a preceding user gesture.
- **Using `InstalledAppFlow` for server OAuth:** `InstalledAppFlow.run_local_server()` opens a browser on the server machine. Use `Flow.from_client_config()` with manual callback handling instead.
- **Embedding Google client secret in frontend:** OAuth must be server-side only. The client secret must never reach the browser.
- **Assuming refresh token persists between Railway deployments:** The `settings` MongoDB collection persists through Railway redeploys (MongoDB plugin is separate). But test this assumption in verification — if using ephemeral volumes, token would be lost.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calendar API auth + token refresh | Custom httpx OAuth2 flow | `google-auth` + `google-api-python-client` | Token refresh, retry, scope management all handled; edge cases in manual refresh are complex |
| Calendar event time parsing from voice | Custom NLP date parser | Claude structured output | Claude already understands "Thursday 3pm" in Russian and English; date/time extraction via JSON schema |
| Favicon from URL | Fetch `<link rel="icon">` from page HTML | Brave API `meta_url.favicon` field | Brave already provides this; parsing HTML for favicons is fragile |
| Search result deduplication | Custom URL matching | `count=3` from Brave | Brave handles deduplication server-side |
| Briefing quote generation | External quotes API | Second Claude call | No API key needed; Claude generates contextually relevant quotes; simpler |

---

## Common Pitfalls

### Pitfall 1: Google OAuth Refresh Token Returns None
**What goes wrong:** `creds.refresh_token` is `None` after the OAuth callback. Calendar auth appears to succeed but `_build_calendar_service()` fails with a `RefreshError` on every call.
**Why it happens:** Google only returns the refresh token when `prompt="consent"` is set in the authorization URL. On subsequent authorizations of the same Google account without `prompt="consent"`, Google assumes you already have the refresh token and doesn't resend it.
**How to avoid:** Always include `access_type="offline"` AND `prompt="consent"` in the auth URL. Before storing, validate `creds.refresh_token is not None` and return an error if so.
**Warning signs:** `db["settings"].find_one({"key": "google_refresh_token"})` returns a document but the value is `None` or empty.

### Pitfall 2: Blocking the FastAPI Event Loop with Calendar API
**What goes wrong:** `service.events().list().execute()` called directly in an `async def` function blocks uvicorn for 1-3 seconds. All other requests queue up. On Railway with a single worker, this blocks TTS audio playback.
**Why it happens:** `google-api-python-client` is a synchronous library built on `httplib2`. `asyncio.to_thread()` is required.
**How to avoid:** Wrap every `service.*.execute()` call in `await asyncio.to_thread(lambda: service.events().list(...).execute())`.
**Warning signs:** Calendar fetch works but takes >1s; other routes appear slow during calendar operations.

### Pitfall 3: Brave Search Favicon Field May Be Empty
**What goes wrong:** `meta_url.favicon` is an empty string `""` for some results. The frontend renders a broken image or empty box.
**Why it happens:** Not all sites have favicons indexed by Brave. The field is present but empty.
**How to avoid:** In `_fetch_search()`, fall back to `https://www.google.com/s2/favicons?sz=32&domain={netloc}` when `favicon` is empty. This Google service is free and works without an API key.
**Warning signs:** Cards show broken image icons.

### Pitfall 4: System Prompt Not Updated for New Fetch Types
**What goes wrong:** User says "найди информацию о..." (find info about...) and Claude returns `mode: "speak"` with `fetch: "none"` instead of `fetch: "search"`.
**Why it happens:** `SYSTEM_PROMPT` in `chat.py` does not yet mention search, calendar, or briefing trigger conditions. Claude defaults to general conversation.
**How to avoid:** Add explicit trigger rules to `SYSTEM_PROMPT` for all three new `fetch` types: what phrases trigger each, and in the calendar case, how to extract structured event data into the `query` field.
**Warning signs:** Manual trigger phrases don't switch to the correct mode.

### Pitfall 5: Calendar Voice-to-Event Query Field Ambiguity
**What goes wrong:** Claude puts the search query in the `query` field for search mode, but calendar event creation needs a richer payload (title + date + time + duration). The `query` field is a single string.
**Why it happens:** The JSON schema has `"query": {"type": "string"}` — not enough structure for event creation.
**How to avoid:** Use the `query` field as a JSON-encoded string for calendar event creation. The system prompt instructs Claude: `For calendar event creation, set query to a JSON string: {"title": "...", "date": "YYYY-MM-DD", "time": "HH:MM", "duration_minutes": 60}`. The backend JSON-parses `query` when `fetch="calendar"` and the intent is event creation.
**Warning signs:** Event titles are wrong or dates are malformed.

### Pitfall 6: Auto-Briefing Fires Multiple Times at 7 AM
**What goes wrong:** The 60-second interval fires at 7:00 and 7:01 and 7:02, triggering the prompt 5 times if the user hasn't interacted.
**Why it happens:** The `lastBriefingDate` check only prevents the prompt from showing on subsequent days, not within the same 5-minute window.
**How to avoid:** Use a local `hasBriefingFiredToday` boolean state that is set to `true` the first time the prompt is shown. Reset it at midnight (or on page reload). localStorage stores the date for cross-session persistence.
**Warning signs:** Multiple overlapping briefing prompts appear at 7 AM.

### Pitfall 7: ModeRouter Renders Null for New Modes
**What goes wrong:** User triggers search mode; the mode switches but the screen is blank because `contentComponent` is never assigned for search/calendar/briefing.
**Why it happens:** The existing ModeRouter comment says `// future modes: search, calendar, briefing` — the `if/else if` chain is incomplete. The variable remains `null`.
**How to avoid:** Add the three `else if` blocks inside `CONTENT_MODES.has(mode)` before Phase 6 work is considered done. Verify by checking `content` is non-null before rendering.
**Warning signs:** White/blank screen after voice triggers search/calendar/briefing mode.

### Pitfall 8: `googleapiclient.discovery.build()` Makes Network Request
**What goes wrong:** `build("calendar", "v3", credentials=creds)` makes a network call to fetch the API discovery document on first call.
**Why it happens:** The `build()` function fetches the Google API discovery document by default.
**How to avoid:** Pass `cache_discovery=False` to disable the local cache (no filesystem on Railway ephemerally) or pre-fetch once. Alternatively: `build("calendar", "v3", credentials=creds, cache_discovery=False)`. This is a minor performance concern, not a blocking issue.

---

## Code Examples

### Brave Search API — Verified Response Shape
```python
# Source: https://api-dashboard.search.brave.com/api-reference/web/search/get
# GET https://api.search.brave.com/res/v1/web/search
# Headers: X-Subscription-Token: <key>, Accept: application/json
# Params: q=<query>, count=3

# Response shape (web.results array):
{
  "web": {
    "results": [
      {
        "title": "...",
        "url": "https://...",
        "description": "...",
        "meta_url": {
          "scheme": "https",
          "netloc": "example.com",
          "hostname": "example.com",      # optional
          "favicon": "https://...",        # may be empty string
          "path": "..."
        },
        "thumbnail": {                     # optional, may be absent
          "src": "https://..."
        }
      }
    ]
  }
}
```

### Google Calendar Events List — Verified Shape
```python
# Source: https://developers.google.com/workspace/calendar/api/guides/create-events
# events.list() returns items array, each event:
{
  "id": "abc123",
  "summary": "Dentist",
  "start": {"dateTime": "2026-04-10T15:00:00+06:00", "timeZone": "Asia/Almaty"},
  "end": {"dateTime": "2026-04-10T16:00:00+06:00", "timeZone": "Asia/Almaty"},
}
```

### Google Calendar Create Event — Verified
```python
# Source: https://developers.google.com/workspace/calendar/api/guides/create-events
event_body = {
    "summary": "Dentist",
    "start": {"dateTime": "2026-04-10T15:00:00", "timeZone": "Asia/Almaty"},
    "end": {"dateTime": "2026-04-10T16:00:00", "timeZone": "Asia/Almaty"},
}
created = service.events().insert(calendarId="primary", body=event_body).execute()
# created["htmlLink"] — URL to event, created["id"] — event ID
```

### Frontend Search Card Stagger Animation
```typescript
// Source: motion/react docs + existing modeVariants pattern in ModeRouter.tsx
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}
const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
}

// Usage:
<motion.div variants={containerVariants} initial="hidden" animate="visible">
  {results.map((r, i) => (
    <motion.div key={i} variants={cardVariants} style={glassCard}>...</motion.div>
  ))}
</motion.div>
```

### Frontend glassCard Pattern (Copy from WeatherMode)
```typescript
// Source: frontend/src/modes/WeatherMode.tsx line 94
const glassCard: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%), rgba(32, 31, 31, 0.4)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  boxShadow: '0 0 30px rgba(133, 173, 255, 0.05)',
  borderRadius: 'var(--radius-xl)',
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `token.json` file for Google creds | MongoDB `settings` collection | This phase | Survives Railway redeploys; no filesystem dependency |
| `InstalledAppFlow.run_local_server()` | `Flow.from_client_config()` + callback route | This phase | Works in server environment without opening a browser |
| `Motor` async MongoDB | `PyMongo Async` (`AsyncMongoClient`) | Phase 1 | Already established — `db["settings"]` is the correct pattern |

---

## Open Questions

1. **Calendar write intent detection in Claude**
   - What we know: The `query` field is a string; event creation needs title + date + time + duration.
   - What's unclear: Whether to use `query` as JSON-encoded string or add a new field to `ChatResponse`.
   - Recommendation: Use `query` as JSON-encoded string for Phase 6. This requires no schema changes (`RESPONSE_SCHEMA` and `ChatResponse` are unchanged per D-21). System prompt instructs Claude to JSON-encode event details into `query` when `fetch="calendar"`.

2. **Duration default when user doesn't specify**
   - What we know: User says "add dentist Thursday 3pm" — no duration.
   - What's unclear: Should default be 30 min, 60 min, or ask Claude to infer from event type?
   - Recommendation (Claude's Discretion): Default to 60 minutes. Claude can override in the extracted JSON if context implies shorter (e.g., "quick call") or longer (e.g., "half-day workshop").

3. **Calendar not authorized state in CalendarMode**
   - What we know: `_fetch_calendar()` returns `{"error": "calendar_not_authorized", "events": []}` if no refresh token in MongoDB.
   - What's unclear: What should CalendarMode show when not authorized?
   - Recommendation: Show a card with "Visit /api/auth/google to authorize Google Calendar" message. This is a one-time setup.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python | All backend | ✓ | 3.14.3 (system) / venv uses it | — |
| pytest | Test suite | ✓ | 8.3.5 | — |
| google-api-python-client | CAL-03, CAL-04, CAL-06 | ✗ (not in venv) | — | Add to requirements.txt — Wave 0 install |
| google-auth | CAL-06 | ✗ (not in venv) | — | Add to requirements.txt |
| google-auth-oauthlib | CAL-06 | ✗ (not in venv) | — | Add to requirements.txt |
| BRAVE_SEARCH_API_KEY | SRCH-04 | ✓ (in config.py) | — | Already in Settings; Railway env var required |
| GOOGLE_CLIENT_ID | CAL-06 | ✗ (not in config.py) | — | Add to config.py + Railway env vars |
| GOOGLE_CLIENT_SECRET | CAL-06 | ✗ (not in config.py) | — | Add to config.py + Railway env vars |
| GOOGLE_REDIRECT_URI | CAL-06 | ✗ (not in config.py) | — | Add to config.py + Railway env vars |

**Missing dependencies with no fallback:**
- Google Calendar packages (google-api-python-client, google-auth, google-auth-oauthlib) — must be added to requirements.txt in Wave 0
- GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI env vars — must be set in Railway before calendar mode works

**Missing dependencies with fallback:**
- None — all critical paths have a clear install path

**Existing test infrastructure health:** 25 tests pass as of 2026-04-09. The venv was missing `anthropic` (requirements.txt packages not installed); after `pip install -r backend/requirements.txt` all 25 pass.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.3.5 |
| Config file | none (tests/ directory auto-discovered) |
| Quick run command | `.venv/bin/python -m pytest tests/ -q` |
| Full suite command | `.venv/bin/python -m pytest tests/ -v` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SRCH-04 | `_fetch_search()` returns shaped payload | unit | `.venv/bin/python -m pytest tests/test_search.py::test_fetch_search_returns_shaped_payload -x` | ❌ Wave 0 |
| SRCH-04 | `_fetch_search()` handles empty results | unit | `.venv/bin/python -m pytest tests/test_search.py::test_fetch_search_empty_results -x` | ❌ Wave 0 |
| SRCH-05 | `/api/chat` with `fetch=search` dispatches correctly | integration | `.venv/bin/python -m pytest tests/test_search.py::test_chat_returns_search_data -x` | ❌ Wave 0 |
| CAL-03 | `_fetch_calendar()` returns events for the week | unit | `.venv/bin/python -m pytest tests/test_calendar.py::test_fetch_calendar_returns_week_events -x` | ❌ Wave 0 |
| CAL-03 | `_fetch_calendar()` returns not-authorized error when no token | unit | `.venv/bin/python -m pytest tests/test_calendar.py::test_fetch_calendar_not_authorized -x` | ❌ Wave 0 |
| CAL-04 | `_create_calendar_event()` calls events.insert correctly | unit | `.venv/bin/python -m pytest tests/test_calendar.py::test_create_calendar_event -x` | ❌ Wave 0 |
| CAL-05 | Created event saved to MongoDB events collection | integration | `.venv/bin/python -m pytest tests/test_calendar.py::test_calendar_event_saved_to_mongo -x` | ❌ Wave 0 |
| CAL-06 | `/api/auth/google` redirects to Google consent URL | integration | `.venv/bin/python -m pytest tests/test_auth.py::test_google_auth_redirects -x` | ❌ Wave 0 |
| CAL-06 | `/api/auth/google/callback` stores refresh token in MongoDB | integration | `.venv/bin/python -m pytest tests/test_auth.py::test_google_callback_stores_token -x` | ❌ Wave 0 |
| BRIEF-01 | `_fetch_briefing()` returns weather + events + summary + quote | unit | `.venv/bin/python -m pytest tests/test_briefing.py::test_fetch_briefing_returns_shaped_payload -x` | ❌ Wave 0 |
| BRIEF-05 | `/api/chat` with `fetch=briefing` dispatches correctly | integration | `.venv/bin/python -m pytest tests/test_briefing.py::test_chat_returns_briefing_data -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `.venv/bin/python -m pytest tests/ -q`
- **Per wave merge:** `.venv/bin/python -m pytest tests/ -v`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_search.py` — covers SRCH-04, SRCH-05
- [ ] `tests/test_calendar.py` — covers CAL-03, CAL-04, CAL-05
- [ ] `tests/test_auth.py` — covers CAL-06 OAuth routes
- [ ] `tests/test_briefing.py` — covers BRIEF-01, BRIEF-05
- [ ] Google packages installed: `.venv/bin/pip install google-api-python-client google-auth google-auth-oauthlib google-auth-httplib2`

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 6 |
|-----------|-------------------|
| Use `AsyncMongoClient` not Motor | All `db["settings"]` and `db["events"]` calls use existing `request.app.state.db` pattern |
| FastAPI + Python backend | All new fetch helpers are FastAPI route extensions; no alternative frameworks |
| `google-api-python-client` + `google-auth` + `google-auth-oauthlib` for Calendar | Locked by CLAUDE.md stack; do not use `httpx` to call Calendar API directly |
| No auth system (single user) | Google OAuth is app-level (one user), not user auth. The OAuth callback stores one global refresh token |
| Railway monolith with Docker | No filesystem persistence; Google creds must be stored in MongoDB, not `token.json` |
| Design: No-Line Rule, glassmorphism, `cubic-bezier(0.22, 1, 0.36, 1)`, `on-surface-variant` for body text | All new mode components must use `glassCard` pattern, no 1px borders, custom easing |
| Stitch screen IDs are source of truth | Search: `3e95776a0f2243ceb2bd8c966ab8c368`, Calendar: `a1675c55d4ab4f849786518aae336d11`, Briefing: `92bd7c820b7e4ed59a30e490b0de8eac` |
| `motion` (not `framer-motion`) | Import `from 'motion/react'` |
| Tailwind v4 CSS-first | No `tailwind.config.js`; use `@apply` or inline styles for glassmorphism |
| `BRAVE_SEARCH_API_KEY` already in config.py | No config change needed for search; Railway env var must be set |

---

## Sources

### Primary (HIGH confidence)
- Brave Search API reference — endpoint URL, headers, response shape (meta_url.favicon, netloc, title, description) — https://api-dashboard.search.brave.com/api-reference/web/search/get
- Google Calendar API create events guide — event body structure, events.insert, events.list — https://developers.google.com/workspace/calendar/api/guides/create-events
- Google OAuth2 web server flow — auth URL params (access_type, prompt), token exchange, refresh token — https://developers.google.com/identity/protocols/oauth2/web-server
- google-api-python-client Python quickstart — credential flow, Credentials class usage — https://developers.google.com/workspace/calendar/api/quickstart/python
- Existing codebase: `backend/routers/chat.py` — established fetch pattern; `frontend/src/modes/WeatherMode.tsx` — glassCard, modeProps, FloatingMic pattern; `frontend/src/components/ModeRouter.tsx` — CONTENT_MODES, MODE_LABELS extension points

### Secondary (MEDIUM confidence)
- google-auth-oauthlib `Flow.from_client_config()` for web server OAuth vs `InstalledAppFlow` — https://googleapis.dev/python/google-auth-oauthlib/latest/reference/google_auth_oauthlib.flow.html
- PyPI version verification: google-api-python-client 2.194.0, google-auth 2.49.1, google-auth-oauthlib 1.3.1 — confirmed 2026-04-09

### Tertiary (LOW confidence)
- None — all critical claims verified with official sources

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — PyPI versions verified 2026-04-09; Google packages are official
- Architecture: HIGH — patterns copied from verified existing codebase + official Google docs
- Pitfalls: HIGH — OAuth `prompt=consent` pitfall is documented in official Google OAuth2 docs; `asyncio.to_thread()` requirement is a known pattern for sync libraries in async FastAPI

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (Google API versioning is stable; Brave API endpoint stable)

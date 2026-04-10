"""POST /api/chat — Claude integration with structured output + MongoDB conversation persistence."""
import asyncio
import json
import uuid
from collections import deque
from datetime import datetime, UTC, timezone, timedelta
from typing import Any

import anthropic
from fastapi import APIRouter, Request
from pydantic import BaseModel
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleAuthRequest
from googleapiclient.discovery import build as build_google_service

from config import settings

router = APIRouter()

# Instantiate once at module level — never per request (anti-pattern per RESEARCH.md)
client = anthropic.AsyncAnthropic(api_key=settings.CLAUDE_API_KEY)

# JSON envelope schema — compiled once, cached by Claude for 24h (per D-17, D-18)
RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "mode": {
            "type": "string",
            "enum": ["speak", "weather", "prayer", "search", "calendar", "briefing"]
        },
        "text": {"type": "string"},
        "fetch": {
            "type": "string",
            "enum": ["none", "weather", "prayer", "search", "calendar", "briefing"]
        },
        "query": {"type": "string"}
    },
    "required": ["mode", "text", "fetch", "query"],
    "additionalProperties": False
}

# Per D-20: JARVIS persona, concise, bilingual ru/en
# Per D-15/D-16/D-17: dismiss phrases return mode='speak' so frontend maps to chat mode -> idle orb
# Per D-23/D-24/D-26: city extraction into query field, never ask which city, default Almaty
def _build_system_prompt() -> str:
    """Build system prompt with current date/time context for Claude."""
    now_almaty = datetime.now(timezone(timedelta(hours=6)))  # Almaty is UTC+6
    today_str = now_almaty.strftime("%Y-%m-%d (%A)")
    time_str = now_almaty.strftime("%H:%M")
    return _SYSTEM_PROMPT_BASE + f"\nCurrent date in Almaty: {today_str}. Current time: {time_str}."


_SYSTEM_PROMPT_BASE = (
    "You are JARVIS, an intelligent personal assistant for one user in Almaty, Kazakhstan. "
    "Always respond in the same language the user speaks (Russian or English). "
    "For general queries, respond in 2-3 sentences maximum — be concise and direct. "
    "Always return the required JSON schema fields. Use mode='speak' for general conversation. "
    "Use fetch='none' unless the user explicitly asks about weather, prayer times, calendar, "
    "web search, or morning briefing. "
    "For weather requests, use fetch='weather'. Set query to the city name if the user specifies "
    "one (e.g., 'погода в Москве' → query='Москва'). Leave query empty for default location "
    "(Almaty). Never ask the user which city — default to Almaty. "
    "For web search requests (finding information, facts, news, 'найди', 'поищи', 'search for'), "
    "use fetch='search' and set query to the search terms. "
    "For prayer time requests, use fetch='prayer'. "
    "For calendar requests (schedule, events, 'что на календаре', 'what's on my calendar'), "
    "use fetch='calendar' and leave query empty for reading. "
    "For adding calendar events ('добавь в календарь', 'add to calendar', 'запланируй'), "
    "use fetch='calendar' and set query to a JSON string: "
    '{"title": "event name", "date": "YYYY-MM-DD", "time": "HH:MM", "duration_minutes": 60}. '
    "Default duration is 60 minutes unless context implies otherwise. "
    "When the user says домой, спасибо, хватит, назад, хорошо, home, thanks, enough, go back, "
    "or similar dismiss phrases, return mode='speak' and a brief acknowledgment (1 sentence). "
    "Never ask for confirmation when dismissing. "
    "For morning briefing requests ('утренний брифинг', 'morning briefing', 'доброе утро', 'good morning'), "
    "use fetch='briefing' and leave query empty. "
)

# In-memory session history: session_id -> deque of last 20 messages (per D-21)
_session_history: dict[str, deque] = {}


class ChatRequest(BaseModel):
    transcript: str
    session_id: str = ""


class ChatResponse(BaseModel):
    mode: str
    text: str
    fetch: str
    query: str
    data: dict | None = None  # Phase 3: weather or prayer payload (D-03)


async def _fetch_uv_index(http_client, lat: float, lon: float) -> float | None:
    """Fetch UV index from Open-Meteo (free, no API key required)."""
    try:
        resp = await http_client.get(
            "https://api.open-meteo.com/v1/forecast",
            params={"latitude": lat, "longitude": lon, "current": "uv_index"}
        )
        resp.raise_for_status()
        return resp.json()["current"]["uv_index"]
    except Exception as e:
        print(f"[WARN] UV index fetch failed: {e}")
        return None


async def _fetch_weather(http_client, settings, city: str = "") -> dict:
    """Fetch weather from OpenWeatherMap free API (2.5).

    If city is provided, geocodes via OWM /geo/1.0/direct to get lat/lon.
    Falls back silently to Almaty defaults on geocoding failure or empty city.
    """
    # Default to Almaty coordinates
    lat = settings.LATITUDE
    lon = settings.LONGITUDE
    city_name = "Almaty"

    # Geocode if city provided
    if city.strip():
        try:
            geo_resp = await http_client.get(
                "https://api.openweathermap.org/geo/1.0/direct",
                params={"q": city.strip(), "limit": 1, "appid": settings.OPENWEATHER_API_KEY}
            )
            geo_resp.raise_for_status()
            geo_data = geo_resp.json()
            if geo_data:
                lat = geo_data[0]["lat"]
                lon = geo_data[0]["lon"]
                city_name = geo_data[0]["name"]
        except Exception as e:
            print(f"[WARN] Geocoding failed for '{city}', falling back to Almaty: {e}")

    # Current weather
    current_url = "https://api.openweathermap.org/data/2.5/weather"
    current_params = {
        "lat": lat,
        "lon": lon,
        "appid": settings.OPENWEATHER_API_KEY,
        "units": "metric",
    }
    current_resp = await http_client.get(current_url, params=current_params)
    current_resp.raise_for_status()
    current_raw = current_resp.json()

    # 5-day / 3-hour forecast (free tier)
    forecast_url = "https://api.openweathermap.org/data/2.5/forecast"
    forecast_resp = await http_client.get(forecast_url, params=current_params)
    forecast_resp.raise_for_status()
    forecast_raw = forecast_resp.json()

    # UV index from Open-Meteo (non-blocking; None on failure)
    uv_result = await _fetch_uv_index(http_client, lat, lon)

    return {
        "temp": round(current_raw["main"]["temp"]),
        "condition_id": current_raw["weather"][0]["id"],
        "condition_main": current_raw["weather"][0]["main"],
        "icon": current_raw["weather"][0]["icon"],
        "hourly": [
            {
                "dt": h["dt"],
                "temp": round(h["main"]["temp"]),
                "icon": h["weather"][0]["icon"],
            }
            for h in forecast_raw.get("list", [])[:12]
        ],
        "city": city_name,
        "humidity": current_raw["main"]["humidity"],
        "wind_speed": round(current_raw["wind"]["speed"] * 3.6, 1),
        "wind_deg": current_raw["wind"].get("deg", 0),
        "visibility": round(current_raw.get("visibility", 0) / 1000, 1),
        "uv_index": uv_result,
    }


async def _fetch_prayer(http_client) -> dict:
    """Fetch Almaty prayer times from Aladhan API (returns 24h timings)."""
    url = "https://api.aladhan.com/v1/timingsByCity"
    params = {
        "city": "Almaty",
        "country": "KZ",
        "method": 2,
    }
    resp = await http_client.get(url, params=params)
    resp.raise_for_status()
    data = resp.json()
    timings = data["data"]["timings"]

    # Strip timezone suffix e.g. "04:23 (ALMT)" → "04:23"
    def clean_time(t: str) -> str:
        return t.split(" ")[0].strip()

    return {
        "Fajr": clean_time(timings["Fajr"]),
        "Dhuhr": clean_time(timings["Dhuhr"]),
        "Asr": clean_time(timings["Asr"]),
        "Maghrib": clean_time(timings["Maghrib"]),
        "Isha": clean_time(timings["Isha"]),
    }


async def _fetch_search(http_client, settings, query: str) -> dict:
    """Fetch web search results from Brave Search API (per D-01)."""
    resp = await http_client.get(
        "https://api.search.brave.com/res/v1/web/search",
        params={"q": query, "count": 3},
        headers={"X-Subscription-Token": settings.BRAVE_SEARCH_API_KEY, "Accept": "application/json"}
    )
    resp.raise_for_status()
    raw = resp.json()
    results = []
    for item in raw.get("web", {}).get("results", [])[:3]:
        favicon = item.get("meta_url", {}).get("favicon", "")
        netloc = item.get("meta_url", {}).get("netloc", "")
        # Pitfall 3: Brave favicon may be empty — fall back to Google favicon service
        if not favicon and netloc:
            favicon = f"https://www.google.com/s2/favicons?sz=32&domain={netloc}"
        results.append({
            "title": item.get("title", ""),
            "url": item.get("url", ""),
            "description": item.get("description", ""),
            "favicon": favicon,
            "source": netloc,
        })
    return {"results": results}


CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar"]


def _build_calendar_service(refresh_token: str):
    """Build Google Calendar API service (sync — call via asyncio.to_thread). Per Pitfall 2."""
    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        token_uri="https://oauth2.googleapis.com/token",
        scopes=CALENDAR_SCOPES,
    )
    creds.refresh(GoogleAuthRequest())
    return build_google_service("calendar", "v3", credentials=creds, cache_discovery=False)


async def _fetch_calendar(db) -> dict:
    """Fetch this week's events from Google Calendar (per D-10, CAL-03)."""
    settings_doc = await db["settings"].find_one({"key": "google_refresh_token"})
    if not settings_doc or not settings_doc.get("value"):
        return {"error": "calendar_not_authorized", "events": []}

    refresh_token = settings_doc["value"]
    service = await asyncio.to_thread(_build_calendar_service, refresh_token)

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
        return result

    raw_result = await asyncio.to_thread(_list_events)
    raw_events = raw_result.get("items", []) if isinstance(raw_result, dict) else raw_result
    events = []
    for e in raw_events:
        start = e["start"].get("dateTime", e["start"].get("date", ""))
        end = e["end"].get("dateTime", e["end"].get("date", ""))
        events.append({"id": e["id"], "title": e.get("summary", ""), "start": start, "end": end})

    return {"events": events, "week_start": week_start.isoformat()}


async def _create_calendar_event(db, title: str, start: str, end: str) -> dict:
    """Create a Google Calendar event and persist to MongoDB (per CAL-03)."""
    settings_doc = await db["settings"].find_one({"key": "google_refresh_token"})
    if not settings_doc or not settings_doc.get("value"):
        return {"error": "calendar_not_authorized"}

    refresh_token = settings_doc["value"]
    service = await asyncio.to_thread(_build_calendar_service, refresh_token)

    event_body = {
        "summary": title,
        "start": {"dateTime": start},
        "end": {"dateTime": end},
    }

    def _insert_event():
        return service.events().insert(calendarId="primary", body=event_body).execute()

    created = await asyncio.to_thread(_insert_event)

    created_start = created["start"].get("dateTime", created["start"].get("date", ""))
    created_end = created["end"].get("dateTime", created["end"].get("date", ""))
    result = {
        "id": created["id"],
        "title": created.get("summary", title),
        "start": created_start,
        "end": created_end,
    }

    # Persist to MongoDB events collection
    await db["events"].insert_one({
        "gcal_id": result["id"],
        "title": result["title"],
        "start": result["start"],
        "end": result["end"],
        "created_at": datetime.now(UTC).isoformat(),
    })

    return result


async def _fetch_briefing(http_client, db, settings) -> dict:
    """Fetch morning briefing: weather + calendar + AI summary + quote (per D-14, D-15)."""
    # Fetch weather and calendar in parallel
    weather_task = _fetch_weather(http_client, settings, city="")
    calendar_task = _fetch_calendar(db)
    weather, calendar = await asyncio.gather(weather_task, calendar_task, return_exceptions=True)

    # Handle fetch errors gracefully
    if isinstance(weather, Exception):
        weather = {"temp": "N/A", "condition_main": "unavailable"}
    if isinstance(calendar, Exception):
        calendar = {"events": []}

    events = calendar.get("events", [])
    event_titles = [e.get("title", "Untitled") for e in events[:5]]

    # Second Claude call — free text, not structured JSON schema (per D-15)
    briefing_prompt = (
        f"Weather in Almaty: {weather.get('temp', 'N/A')}°C, {weather.get('condition_main', 'unknown')}. "
        f"Today's events: {event_titles if event_titles else 'No events'}. "
        "Write a warm, personal 2-sentence morning summary in Russian. "
        "Then write one short inspirational quote. "
        'Reply ONLY as JSON: {"summary": "...", "quote": "..."}'
    )
    try:
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=300,
            messages=[{"role": "user", "content": briefing_prompt}],
        )
        briefing_text = json.loads(response.content[0].text)
        summary = briefing_text.get("summary", "")
        quote = briefing_text.get("quote", "")
    except Exception as e:
        print(f"[WARN] Briefing Claude call failed: {e}")
        summary = "Доброе утро! Новый день — новые возможности."
        quote = "Будущее принадлежит тем, кто верит в красоту своей мечты."

    return {
        "weather": weather if isinstance(weather, dict) else {},
        "events": events,
        "summary": summary,
        "quote": quote,
    }


async def _call_claude(transcript: str, history: list[dict]) -> dict[str, Any]:
    """Call Claude with structured output. Returns parsed envelope dict."""
    messages = list(history) + [{"role": "user", "content": transcript}]

    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=_build_system_prompt(),
        messages=messages,
        output_config={
            "format": {
                "type": "json_schema",
                "schema": RESPONSE_SCHEMA
            }
        }
    )
    # output_config json_schema guarantees valid JSON — response.content[0].text is always parseable
    return json.loads(response.content[0].text)


@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: Request, body: ChatRequest) -> ChatResponse:
    """Voice loop chat endpoint: transcript in -> JSON envelope out."""
    # Assign session ID if not provided
    session_id = body.session_id or str(uuid.uuid4())

    # Get or create in-memory history for this session (per D-21: last 20 messages)
    if session_id not in _session_history:
        _session_history[session_id] = deque(maxlen=20)
    history = list(_session_history[session_id])

    # Call Claude with structured output (per D-16, D-17)
    try:
        envelope = await _call_claude(body.transcript, history)
    except (json.JSONDecodeError, KeyError, Exception):
        # MODE-03: Fallback to speak mode if anything goes wrong
        envelope = {
            "mode": "speak",
            "text": "I'm sorry, I had trouble processing that. Please try again.",
            "fetch": "none",
            "query": ""
        }

    # Update in-memory history
    _session_history[session_id].append({"role": "user", "content": body.transcript})
    _session_history[session_id].append({"role": "assistant", "content": envelope["text"]})

    # Persist to MongoDB (per D-22, D-23, CONV-04)
    db = request.app.state.db
    await db["conversations"].insert_one({
        "session_id": session_id,
        "timestamp": datetime.now(UTC).isoformat(),
        "user": body.transcript,
        "assistant": envelope["text"],
        "mode": envelope["mode"],
        "fetch": envelope.get("fetch", "none"),
        "query": envelope.get("query", "")
    })

    # Phase 3: fetch sub-API data if Claude requested it (D-01, D-02, D-03)
    fetch_type = envelope.get("fetch", "none")
    fetched_data = None
    if fetch_type == "weather":
        try:
            fetched_data = await _fetch_weather(request.app.state.http_client, settings, city=envelope.get("query", ""))
        except Exception as e:
            print(f"[WARN] Weather fetch failed: {e}")
    elif fetch_type == "prayer":
        try:
            fetched_data = await _fetch_prayer(request.app.state.http_client)
        except Exception as e:
            print(f"[WARN] Prayer fetch failed: {e}")
    elif fetch_type == "search":
        try:
            fetched_data = await _fetch_search(request.app.state.http_client, settings, envelope.get("query", ""))
        except Exception as e:
            print(f"[WARN] Search fetch failed: {e}")
    elif fetch_type == "calendar":
        query_str = envelope.get("query", "")
        print(f"[INFO] Calendar dispatch — query: {query_str!r}")
        if query_str.strip().startswith("{"):
            # Create calendar event — query is a JSON string with event details
            try:
                event_params = json.loads(query_str)
                print(f"[INFO] Parsed event params: {event_params}")
                date_str = event_params.get("date", "")
                time_str = event_params.get("time", "00:00")
                duration_min = int(event_params.get("duration_minutes", 60))
                start_dt = datetime.fromisoformat(f"{date_str}T{time_str}:00+06:00")
                end_dt = start_dt + timedelta(minutes=duration_min)
                created = await _create_calendar_event(
                    request.app.state.db,
                    title=event_params.get("title", ""),
                    start=start_dt.isoformat(),
                    end=end_dt.isoformat(),
                )
                print(f"[INFO] Calendar event created: {created}")
                # After create, fetch week view so frontend shows updated schedule + confirmation
                week_view = await _fetch_calendar(request.app.state.db)
                if isinstance(week_view, dict) and "error" not in week_view:
                    week_view["created_event"] = created
                    fetched_data = week_view
                else:
                    fetched_data = {"created_event": created, "events": [], "week_start": ""}
            except Exception as e:
                import traceback
                print(f"[ERROR] Calendar event creation failed: {e}")
                traceback.print_exc()
                fetched_data = {"error": "calendar_create_failed", "message": str(e), "events": []}
        else:
            try:
                fetched_data = await _fetch_calendar(request.app.state.db)
            except Exception as e:
                print(f"[ERROR] Calendar fetch failed: {e}")
                fetched_data = {"error": "calendar_fetch_failed", "events": []}
    elif fetch_type == "briefing":
        try:
            fetched_data = await _fetch_briefing(request.app.state.http_client, request.app.state.db, settings)
        except Exception as e:
            print(f"[WARN] Briefing fetch failed: {e}")
    envelope["data"] = fetched_data

    return ChatResponse(**envelope)

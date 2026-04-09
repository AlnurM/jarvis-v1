"""POST /api/chat — Claude integration with structured output + MongoDB conversation persistence."""
import json
import uuid
from collections import deque
from datetime import datetime, UTC
from typing import Any

import anthropic
from fastapi import APIRouter, Request
from pydantic import BaseModel

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
SYSTEM_PROMPT = (
    "You are JARVIS, an intelligent personal assistant for one user in Almaty, Kazakhstan. "
    "Always respond in the same language the user speaks (Russian or English). "
    "For general queries, respond in 2-3 sentences maximum — be concise and direct. "
    "Always return the required JSON schema fields. Use mode='speak' for general conversation. "
    "Use fetch='none' unless the user explicitly asks about weather, prayer times, calendar, "
    "web search, or morning briefing. "
    "For weather requests, use fetch='weather'. Set query to the city name if the user specifies "
    "one (e.g., 'погода в Москве' → query='Москва'). Leave query empty for default location "
    "(Almaty). Never ask the user which city — default to Almaty. "
    "When the user says домой, спасибо, хватит, назад, хорошо, home, thanks, enough, go back, "
    "or similar dismiss phrases, return mode='speak' and a brief acknowledgment (1 sentence). "
    "Never ask for confirmation when dismissing."
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

    # Return only the 5 canonical prayers (timings already in 24h format)
    return {
        "Fajr": timings["Fajr"],
        "Dhuhr": timings["Dhuhr"],
        "Asr": timings["Asr"],
        "Maghrib": timings["Maghrib"],
        "Isha": timings["Isha"],
    }


async def _call_claude(transcript: str, history: list[dict]) -> dict[str, Any]:
    """Call Claude with structured output. Returns parsed envelope dict."""
    messages = list(history) + [{"role": "user", "content": transcript}]

    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
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
    envelope["data"] = fetched_data

    return ChatResponse(**envelope)

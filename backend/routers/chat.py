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
SYSTEM_PROMPT = (
    "You are JARVIS, an intelligent personal assistant for one user in Almaty, Kazakhstan. "
    "Always respond in the same language the user speaks (Russian or English). "
    "For general queries, respond in 2-3 sentences maximum — be concise and direct. "
    "Always return the required JSON schema fields. Use mode='speak' for general conversation. "
    "Use fetch='none' unless the user explicitly asks about weather, prayer times, calendar, "
    "web search, or morning briefing."
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


async def _fetch_weather(http_client, settings) -> dict:
    """Fetch Almaty weather from OpenWeatherMap free API (2.5)."""
    # Current weather
    current_url = "https://api.openweathermap.org/data/2.5/weather"
    current_params = {
        "lat": settings.LATITUDE,
        "lon": settings.LONGITUDE,
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
    }


async def _fetch_prayer(http_client) -> dict:
    """Fetch Almaty prayer times from MuslimSalat (Aladhan is unreliable)."""
    url = "https://muslimsalat.com/almaty.json"
    params = {"key": "free"}
    resp = await http_client.get(url, params=params)
    resp.raise_for_status()
    data = resp.json()
    item = data["items"][0]

    def to_24h(t: str) -> str:
        """Convert '4:40 am' → '04:40', '7:37 pm' → '19:37'."""
        parts = t.strip().split()
        time_parts = parts[0].split(":")
        h, m = int(time_parts[0]), time_parts[1]
        if parts[1].lower() == "pm" and h != 12:
            h += 12
        elif parts[1].lower() == "am" and h == 12:
            h = 0
        return f"{h:02d}:{m}"

    return {
        "Fajr": to_24h(item["fajr"]),
        "Dhuhr": to_24h(item["dhuhr"]),
        "Asr": to_24h(item["asr"]),
        "Maghrib": to_24h(item["maghrib"]),
        "Isha": to_24h(item["isha"]),
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
            fetched_data = await _fetch_weather(request.app.state.http_client, settings)
        except Exception as e:
            print(f"[WARN] Weather fetch failed: {e}")
    elif fetch_type == "prayer":
        try:
            fetched_data = await _fetch_prayer(request.app.state.http_client)
        except Exception as e:
            print(f"[WARN] Prayer fetch failed: {e}")
    envelope["data"] = fetched_data

    return ChatResponse(**envelope)

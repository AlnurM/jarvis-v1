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

    return ChatResponse(**envelope)

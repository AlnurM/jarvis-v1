"""Tests for backend briefing fetch pipeline (Plan 06-01 TDD RED scaffold).

These tests import _fetch_briefing from routers.chat — will fail RED
until Plan 06-05 adds the function.
"""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# --- Unit test for _fetch_briefing helper ---

@pytest.mark.asyncio
async def test_fetch_briefing_returns_shaped_payload():
    """_fetch_briefing returns shaped payload with weather, events, summary, quote."""
    from routers.chat import _fetch_briefing

    mock_db = MagicMock()
    mock_http = AsyncMock()

    mock_settings = MagicMock()
    mock_settings.OPENWEATHER_API_KEY = "test-key"
    mock_settings.LATITUDE = 43.2220
    mock_settings.LONGITUDE = 76.8512

    canned_weather = {
        "temp": 15,
        "condition_id": 800,
        "condition_main": "Clear",
        "icon": "01d",
        "hourly": [],
        "city": "Almaty",
    }
    canned_calendar = {
        "events": [
            {"id": "e1", "title": "Morning Standup", "start": "2026-04-09T09:00:00+06:00", "end": "2026-04-09T09:30:00+06:00"}
        ],
        "week_start": "2026-04-07",
    }

    mock_briefing_response = MagicMock()
    mock_briefing_response.content = [MagicMock(text="Good morning! Today is a clear day in Almaty.")]

    with patch("routers.chat._fetch_weather", new_callable=AsyncMock, return_value=canned_weather):
        with patch("routers.chat._fetch_calendar", new_callable=AsyncMock, return_value=canned_calendar):
            with patch("routers.chat.client.messages.create", new_callable=AsyncMock, return_value=mock_briefing_response):
                result = await _fetch_briefing(mock_http, mock_db, mock_settings)

    assert "weather" in result
    assert "events" in result
    assert "summary" in result
    assert "quote" in result
    assert isinstance(result["weather"], dict)
    assert isinstance(result["events"], list)
    assert isinstance(result["summary"], str)
    assert isinstance(result["quote"], str)


def test_chat_returns_briefing_data(client, mock_claude, mock_mongo):
    """POST /api/chat with fetch='briefing' includes briefing data in response."""
    briefing_envelope = {
        "mode": "briefing",
        "text": "Good morning! Here is your briefing.",
        "fetch": "briefing",
        "query": "",
    }
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=json.dumps(briefing_envelope))]

    briefing_payload = {
        "weather": {"temp": 15, "condition_main": "Clear", "icon": "01d", "city": "Almaty"},
        "events": [{"id": "e1", "title": "Standup", "start": "09:00", "end": "09:30"}],
        "summary": "Good morning! Today will be clear.",
        "quote": "The secret of getting ahead is getting started.",
    }

    with patch("routers.chat.client.messages.create", new_callable=AsyncMock, return_value=mock_response):
        with patch("routers.chat._fetch_briefing", new_callable=AsyncMock, return_value=briefing_payload):
            resp = client.post("/api/chat", json={"transcript": "morning briefing", "session_id": "s1"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["mode"] == "briefing"
    assert body["data"] is not None
    assert "weather" in body["data"]
    assert "events" in body["data"]
    assert "summary" in body["data"]
    assert "quote" in body["data"]

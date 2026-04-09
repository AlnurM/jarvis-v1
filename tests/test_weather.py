"""Tests for backend weather fetch pipeline (Plan 03-01 TDD RED scaffold).

These tests import _fetch_weather from routers.chat and reference body["data"] —
both will fail RED until Plan 02 adds them.
"""
import json
import pytest
import httpx
from unittest.mock import AsyncMock, MagicMock, patch


# --- Unit test for _fetch_weather helper ---

@pytest.mark.asyncio
async def test_fetch_weather_returns_shaped_payload():
    """_fetch_weather strips OWM raw response to the UI payload shape."""
    from routers.chat import _fetch_weather  # will fail RED until Plan 02 creates it

    raw_owm = {
        "current": {
            "temp": 12.4,
            "weather": [{"id": 800, "main": "Clear", "description": "clear sky", "icon": "01d"}]
        },
        "hourly": [
            {"dt": 1744200000, "temp": 11.2, "weather": [{"id": 801, "main": "Clouds", "icon": "02d"}]},
            {"dt": 1744203600, "temp": 10.8, "weather": [{"id": 800, "main": "Clear", "icon": "01d"}]},
        ]
    }
    mock_resp = MagicMock()
    mock_resp.json.return_value = raw_owm
    mock_resp.raise_for_status = MagicMock()

    mock_http = AsyncMock()
    mock_http.get = AsyncMock(return_value=mock_resp)

    result = await _fetch_weather(mock_http, MagicMock(
        LATITUDE=43.2220, LONGITUDE=76.8512, OPENWEATHER_API_KEY="test-key"
    ))

    assert result["temp"] == 12        # round(12.4)
    assert result["condition_id"] == 800
    assert result["condition_main"] == "Clear"
    assert result["icon"] == "01d"
    assert isinstance(result["hourly"], list)
    assert len(result["hourly"]) == 2
    assert result["hourly"][0] == {"dt": 1744200000, "temp": 11, "icon": "02d"}


# --- Integration tests for /api/chat dispatch ---

def test_chat_returns_weather_data(client, mock_claude, mock_mongo):
    """POST /api/chat with fetch=weather returns shaped weather data in response."""
    weather_envelope = {"mode": "weather", "text": "В Алматы сейчас ясно, 12°C", "fetch": "weather", "query": ""}
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=json.dumps(weather_envelope))]

    weather_payload = {
        "temp": 12, "condition_id": 800, "condition_main": "Clear", "icon": "01d",
        "hourly": [{"dt": 1744200000, "temp": 11, "icon": "02d"}]
    }

    with patch("routers.chat.client.messages.create", new_callable=AsyncMock, return_value=mock_response):
        with patch("routers.chat._fetch_weather", new_callable=AsyncMock, return_value=weather_payload):
            resp = client.post("/api/chat", json={"transcript": "What is the weather?", "session_id": "s1"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["mode"] == "weather"
    assert body["data"] is not None
    assert body["data"]["temp"] == 12
    assert body["data"]["condition_id"] == 800
    assert "hourly" in body["data"]


def test_chat_weather_fetch_error_returns_null_data(client, mock_claude, mock_mongo):
    """When OWM fetch raises HTTPStatusError, /api/chat still returns 200 with data: null."""
    weather_envelope = {"mode": "weather", "text": "Погода недоступна", "fetch": "weather", "query": ""}
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=json.dumps(weather_envelope))]

    with patch("routers.chat.client.messages.create", new_callable=AsyncMock, return_value=mock_response):
        with patch("routers.chat._fetch_weather", new_callable=AsyncMock, side_effect=Exception("401 Unauthorized")):
            resp = client.post("/api/chat", json={"transcript": "Weather?", "session_id": "s1"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"] is None


def test_chat_no_fetch_returns_null_data(client, mock_claude, mock_mongo):
    """When fetch=none, /api/chat returns data: null."""
    resp = client.post("/api/chat", json={"transcript": "Hello", "session_id": "s1"})
    assert resp.status_code == 200
    assert resp.json()["data"] is None

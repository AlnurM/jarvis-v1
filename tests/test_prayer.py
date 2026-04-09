"""Tests for backend prayer fetch pipeline (Plan 03-01 TDD RED scaffold).

These tests import _fetch_prayer from routers.chat and reference body["data"] —
both will fail RED until Plan 02 adds them.
"""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


ALADHAN_RAW = {
    "data": {
        "timings": {
            "Fajr": "03:40", "Sunrise": "05:21", "Dhuhr": "11:54",
            "Asr": "15:33", "Sunset": "18:28", "Maghrib": "18:28",
            "Isha": "20:09", "Imsak": "03:30", "Midnight": "23:54"
        },
        "date": {"gregorian": {"date": "09-04-2026", "day": "Thursday"}}
    }
}


# --- Unit test for _fetch_prayer helper ---

@pytest.mark.asyncio
async def test_fetch_prayer_returns_shaped_payload():
    """_fetch_prayer strips Aladhan raw response to 5-prayer payload shape."""
    from routers.chat import _fetch_prayer  # will fail RED until Plan 02 creates it

    mock_resp = MagicMock()
    mock_resp.json.return_value = ALADHAN_RAW
    mock_resp.raise_for_status = MagicMock()

    mock_http = AsyncMock()
    mock_http.get = AsyncMock(return_value=mock_resp)

    result = await _fetch_prayer(mock_http)

    # Only the 5 prayer keys — no Sunrise, Imsak, Midnight, Sunset
    assert result["Fajr"] == "03:40"
    assert result["Dhuhr"] == "11:54"
    assert result["Asr"] == "15:33"
    assert result["Maghrib"] == "18:28"
    assert result["Isha"] == "20:09"
    assert "Sunrise" not in result
    assert "Imsak" not in result
    assert "Midnight" not in result
    assert len(result) == 5


# --- Integration tests for /api/chat dispatch ---

def test_chat_returns_prayer_data(client, mock_claude, mock_mongo):
    """POST /api/chat with fetch=prayer returns shaped prayer data in response."""
    prayer_envelope = {"mode": "prayer", "text": "Следующий намаз — Фаджр в 03:40", "fetch": "prayer", "query": ""}
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=json.dumps(prayer_envelope))]

    prayer_payload = {
        "Fajr": "03:40", "Dhuhr": "11:54", "Asr": "15:33",
        "Maghrib": "18:28", "Isha": "20:09"
    }

    with patch("routers.chat.client.messages.create", new_callable=AsyncMock, return_value=mock_response):
        with patch("routers.chat._fetch_prayer", new_callable=AsyncMock, return_value=prayer_payload):
            resp = client.post("/api/chat", json={"transcript": "What are the prayer times?", "session_id": "s2"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["mode"] == "prayer"
    assert body["data"] is not None
    assert body["data"]["Fajr"] == "03:40"
    assert body["data"]["Dhuhr"] == "11:54"
    assert body["data"]["Isha"] == "20:09"


def test_chat_prayer_fetch_error_returns_null_data(client, mock_claude, mock_mongo):
    """When Aladhan fetch raises Exception, /api/chat still returns 200 with data: null."""
    prayer_envelope = {"mode": "prayer", "text": "Время намаза недоступно", "fetch": "prayer", "query": ""}
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=json.dumps(prayer_envelope))]

    with patch("routers.chat.client.messages.create", new_callable=AsyncMock, return_value=mock_response):
        with patch("routers.chat._fetch_prayer", new_callable=AsyncMock, side_effect=Exception("API error")):
            resp = client.post("/api/chat", json={"transcript": "Prayer times?", "session_id": "s2"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"] is None

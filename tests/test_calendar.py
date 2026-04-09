"""Tests for backend calendar fetch pipeline (Plan 06-01 TDD RED scaffold).

These tests import _fetch_calendar / _create_calendar_event from routers.chat —
will fail RED until Plan 06-03 adds the functions.
"""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# --- Unit tests for _fetch_calendar helper ---

@pytest.mark.asyncio
async def test_fetch_calendar_returns_week_events():
    """_fetch_calendar returns shaped payload with events list and week_start."""
    from routers.chat import _fetch_calendar

    mock_db = MagicMock()
    mock_db["settings"].find_one = AsyncMock(
        return_value={"key": "google_refresh_token", "value": "fake-token"}
    )

    fake_events = [
        {
            "id": "event-1",
            "summary": "Team Meeting",
            "start": {"dateTime": "2026-04-10T10:00:00+06:00"},
            "end": {"dateTime": "2026-04-10T11:00:00+06:00"},
        }
    ]

    with patch("asyncio.to_thread", new_callable=AsyncMock, return_value={"items": fake_events}):
        result = await _fetch_calendar(mock_db)

    assert "events" in result
    assert "week_start" in result
    assert isinstance(result["events"], list)
    assert len(result["events"]) == 1
    event = result["events"][0]
    assert "id" in event
    assert "title" in event
    assert "start" in event
    assert "end" in event


@pytest.mark.asyncio
async def test_fetch_calendar_not_authorized():
    """_fetch_calendar returns error dict when no refresh token stored."""
    from routers.chat import _fetch_calendar

    mock_db = MagicMock()
    mock_db["settings"].find_one = AsyncMock(return_value=None)

    result = await _fetch_calendar(mock_db)

    assert result.get("error") == "calendar_not_authorized"
    assert result.get("events") == []


@pytest.mark.asyncio
async def test_create_calendar_event():
    """_create_calendar_event creates event and returns {id, title, start, end}."""
    from routers.chat import _create_calendar_event

    mock_db = MagicMock()
    mock_db["settings"].find_one = AsyncMock(
        return_value={"key": "google_refresh_token", "value": "fake-token"}
    )
    mock_db["events"].insert_one = AsyncMock(return_value=MagicMock(inserted_id="mongo-id"))

    fake_created = {
        "id": "gcal-event-1",
        "summary": "Doctor Appointment",
        "start": {"dateTime": "2026-04-11T14:00:00+06:00"},
        "end": {"dateTime": "2026-04-11T15:00:00+06:00"},
    }

    with patch("asyncio.to_thread", new_callable=AsyncMock, return_value=fake_created):
        result = await _create_calendar_event(
            mock_db,
            title="Doctor Appointment",
            start="2026-04-11T14:00:00+06:00",
            end="2026-04-11T15:00:00+06:00",
        )

    assert result["id"] == "gcal-event-1"
    assert result["title"] == "Doctor Appointment"
    assert "start" in result
    assert "end" in result


@pytest.mark.asyncio
async def test_calendar_event_saved_to_mongo():
    """Created calendar event is also inserted into db["events"]."""
    from routers.chat import _create_calendar_event

    mock_db = MagicMock()
    mock_db["settings"].find_one = AsyncMock(
        return_value={"key": "google_refresh_token", "value": "fake-token"}
    )
    mock_db["events"].insert_one = AsyncMock(return_value=MagicMock(inserted_id="mongo-id"))

    fake_created = {
        "id": "gcal-event-2",
        "summary": "Dentist",
        "start": {"dateTime": "2026-04-12T09:00:00+06:00"},
        "end": {"dateTime": "2026-04-12T10:00:00+06:00"},
    }

    with patch("asyncio.to_thread", new_callable=AsyncMock, return_value=fake_created):
        await _create_calendar_event(
            mock_db,
            title="Dentist",
            start="2026-04-12T09:00:00+06:00",
            end="2026-04-12T10:00:00+06:00",
        )

    mock_db["events"].insert_one.assert_called_once()

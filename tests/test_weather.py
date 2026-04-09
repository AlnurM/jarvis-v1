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
    """_fetch_weather strips OWM raw response to the UI payload shape including new fields."""
    from routers.chat import _fetch_weather

    # OWM current weather response (with new fields)
    raw_current = {
        "main": {"temp": 12.4, "humidity": 65},
        "weather": [{"id": 800, "main": "Clear", "description": "clear sky", "icon": "01d"}],
        "wind": {"speed": 3.5, "deg": 180},
        "visibility": 8500,
    }
    # OWM forecast response
    raw_forecast = {
        "list": [
            {"dt": 1744200000, "main": {"temp": 11.2}, "weather": [{"id": 801, "main": "Clouds", "icon": "02d"}]},
            {"dt": 1744203600, "main": {"temp": 10.8}, "weather": [{"id": 800, "main": "Clear", "icon": "01d"}]},
        ]
    }
    # Open-Meteo UV response
    raw_uv = {"current": {"uv_index": 4.2}}

    mock_current_resp = MagicMock()
    mock_current_resp.json.return_value = raw_current
    mock_current_resp.raise_for_status = MagicMock()

    mock_forecast_resp = MagicMock()
    mock_forecast_resp.json.return_value = raw_forecast
    mock_forecast_resp.raise_for_status = MagicMock()

    mock_uv_resp = MagicMock()
    mock_uv_resp.json.return_value = raw_uv
    mock_uv_resp.raise_for_status = MagicMock()

    def get_side_effect(url, **kwargs):
        if "open-meteo" in url:
            return mock_uv_resp
        elif "forecast" in url:
            return mock_forecast_resp
        else:
            return mock_current_resp

    mock_http = AsyncMock()
    mock_http.get = AsyncMock(side_effect=get_side_effect)

    mock_settings = MagicMock()
    mock_settings.LATITUDE = 43.2220
    mock_settings.LONGITUDE = 76.8512
    mock_settings.OPENWEATHER_API_KEY = "test-key"

    result = await _fetch_weather(mock_http, mock_settings, city="")

    assert result["temp"] == 12        # round(12.4)
    assert result["condition_id"] == 800
    assert result["condition_main"] == "Clear"
    assert result["icon"] == "01d"
    assert isinstance(result["hourly"], list)
    assert len(result["hourly"]) == 2
    assert result["hourly"][0] == {"dt": 1744200000, "temp": 11, "icon": "02d"}
    # New fields
    assert result["humidity"] == 65
    assert result["wind_speed"] == 12.6  # 3.5 * 3.6 = 12.6 km/h
    assert result["wind_deg"] == 180
    assert result["visibility"] == 8.5   # 8500 / 1000 = 8.5 km
    assert result["uv_index"] == 4.2
    assert result["city"] == "Almaty"


@pytest.mark.asyncio
async def test_fetch_weather_default_city():
    """_fetch_weather with empty city uses Almaty default coords, no geocoding call."""
    from routers.chat import _fetch_weather

    called_urls = []

    raw_current = {
        "main": {"temp": 10.0, "humidity": 70},
        "weather": [{"id": 800, "main": "Clear", "icon": "01d"}],
        "wind": {"speed": 2.0, "deg": 90},
        "visibility": 10000,
    }
    raw_forecast = {"list": []}
    raw_uv = {"current": {"uv_index": 3.0}}

    def get_side_effect(url, **kwargs):
        called_urls.append(url)
        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        if "open-meteo" in url:
            mock_resp.json.return_value = raw_uv
        elif "forecast" in url:
            mock_resp.json.return_value = raw_forecast
        else:
            mock_resp.json.return_value = raw_current
        return mock_resp

    mock_http = AsyncMock()
    mock_http.get = AsyncMock(side_effect=get_side_effect)

    mock_settings = MagicMock()
    mock_settings.LATITUDE = 43.2220
    mock_settings.LONGITUDE = 76.8512
    mock_settings.OPENWEATHER_API_KEY = "test-key"

    result = await _fetch_weather(mock_http, mock_settings, city="")

    # Geocoding must NOT have been called
    assert not any("geo/1.0/direct" in url for url in called_urls), \
        f"Geocoding should not be called for empty city, but called URLs: {called_urls}"
    assert result["city"] == "Almaty"


@pytest.mark.asyncio
async def test_fetch_weather_with_city():
    """_fetch_weather with city='Москва' geocodes via OWM and fetches that city's weather."""
    from routers.chat import _fetch_weather

    geocode_response = [{"name": "Moscow", "lat": 55.7558, "lon": 37.6173}]

    weather_called_lat = None
    weather_called_lon = None

    raw_current = {
        "main": {"temp": 5.0, "humidity": 80},
        "weather": [{"id": 801, "main": "Clouds", "icon": "02d"}],
        "wind": {"speed": 5.0, "deg": 270},
        "visibility": 7000,
    }
    raw_forecast = {"list": []}
    raw_uv = {"current": {"uv_index": 1.5}}

    def get_side_effect(url, params=None, **kwargs):
        nonlocal weather_called_lat, weather_called_lon
        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        if "geo/1.0/direct" in url:
            mock_resp.json.return_value = geocode_response
        elif "open-meteo" in url:
            mock_resp.json.return_value = raw_uv
        elif "forecast" in url:
            weather_called_lat = params.get("lat") if params else None
            weather_called_lon = params.get("lon") if params else None
            mock_resp.json.return_value = raw_forecast
        else:
            # current weather
            weather_called_lat = params.get("lat") if params else None
            weather_called_lon = params.get("lon") if params else None
            mock_resp.json.return_value = raw_current
        return mock_resp

    mock_http = AsyncMock()
    mock_http.get = AsyncMock(side_effect=get_side_effect)

    mock_settings = MagicMock()
    mock_settings.LATITUDE = 43.2220
    mock_settings.LONGITUDE = 76.8512
    mock_settings.OPENWEATHER_API_KEY = "test-key"

    result = await _fetch_weather(mock_http, mock_settings, city="Москва")

    # Verify geocoding was called
    geocode_call = None
    for call in mock_http.get.call_args_list:
        url = call[0][0] if call[0] else call[1].get("url", "")
        if "geo/1.0/direct" in url:
            geocode_call = call
            break
    assert geocode_call is not None, "Geocoding should have been called for city='Москва'"

    # Verify correct coordinates used
    assert weather_called_lat == 55.7558
    assert weather_called_lon == 37.6173

    assert result["city"] == "Moscow"


@pytest.mark.asyncio
async def test_fetch_weather_geocoding_failure():
    """_fetch_weather geocoding failure falls back silently to Almaty."""
    from routers.chat import _fetch_weather

    raw_current = {
        "main": {"temp": 10.0, "humidity": 60},
        "weather": [{"id": 800, "main": "Clear", "icon": "01d"}],
        "wind": {"speed": 1.0, "deg": 45},
        "visibility": 10000,
    }
    raw_forecast = {"list": []}
    raw_uv = {"current": {"uv_index": 2.0}}

    def get_side_effect(url, params=None, **kwargs):
        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        if "geo/1.0/direct" in url:
            raise Exception("Geocoding API error")
        elif "open-meteo" in url:
            mock_resp.json.return_value = raw_uv
        elif "forecast" in url:
            mock_resp.json.return_value = raw_forecast
        else:
            mock_resp.json.return_value = raw_current
        return mock_resp

    mock_http = AsyncMock()
    mock_http.get = AsyncMock(side_effect=get_side_effect)

    mock_settings = MagicMock()
    mock_settings.LATITUDE = 43.2220
    mock_settings.LONGITUDE = 76.8512
    mock_settings.OPENWEATHER_API_KEY = "test-key"

    # Should NOT raise an exception
    result = await _fetch_weather(mock_http, mock_settings, city="NonexistentPlace")

    assert result is not None
    assert result["city"] == "Almaty"


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

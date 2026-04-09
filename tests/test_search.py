"""Tests for backend search fetch pipeline (Plan 06-01 TDD RED scaffold).

These tests import _fetch_search from routers.chat — will fail RED
until Plan 06-02 adds the function.
"""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# --- Unit test for _fetch_search helper ---

@pytest.mark.asyncio
async def test_fetch_search_returns_shaped_payload():
    """_fetch_search returns shaped payload with results list."""
    from routers.chat import _fetch_search

    raw_brave = {"web": {"results": [
        {
            "title": "Result 1",
            "url": "https://example.com",
            "description": "A description",
            "meta_url": {"favicon": "https://example.com/favicon.ico", "netloc": "example.com"},
        }
    ]}}

    mock_resp = MagicMock()
    mock_resp.json.return_value = raw_brave
    mock_resp.raise_for_status = MagicMock()

    mock_http = AsyncMock()
    mock_http.get = AsyncMock(return_value=mock_resp)

    mock_settings = MagicMock()
    mock_settings.BRAVE_SEARCH_API_KEY = "test-brave-key"

    result = await _fetch_search(mock_http, mock_settings, query="test query")

    assert "results" in result
    assert isinstance(result["results"], list)
    assert len(result["results"]) == 1
    item = result["results"][0]
    assert "title" in item
    assert "url" in item
    assert "description" in item
    assert "favicon" in item
    assert "source" in item
    assert item["title"] == "Result 1"
    assert item["url"] == "https://example.com"


@pytest.mark.asyncio
async def test_fetch_search_empty_results():
    """_fetch_search returns {"results": []} when Brave returns no results."""
    from routers.chat import _fetch_search

    raw_brave = {"web": {"results": []}}

    mock_resp = MagicMock()
    mock_resp.json.return_value = raw_brave
    mock_resp.raise_for_status = MagicMock()

    mock_http = AsyncMock()
    mock_http.get = AsyncMock(return_value=mock_resp)

    mock_settings = MagicMock()
    mock_settings.BRAVE_SEARCH_API_KEY = "test-brave-key"

    result = await _fetch_search(mock_http, mock_settings, query="something with no results")

    assert result == {"results": []}


def test_chat_returns_search_data(client, mock_claude, mock_mongo):
    """POST /api/chat with Claude returning fetch='search' includes search data in response."""
    search_envelope = {
        "mode": "search",
        "text": "Here are the search results",
        "fetch": "search",
        "query": "test query",
    }
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=json.dumps(search_envelope))]

    search_payload = {
        "results": [
            {
                "title": "Result 1",
                "url": "https://example.com",
                "description": "A description",
                "favicon": "https://example.com/favicon.ico",
                "source": "example.com",
            }
        ]
    }

    with patch("routers.chat.client.messages.create", new_callable=AsyncMock, return_value=mock_response):
        with patch("routers.chat._fetch_search", new_callable=AsyncMock, return_value=search_payload):
            resp = client.post("/api/chat", json={"transcript": "search for test query", "session_id": "s1"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["mode"] == "search"
    assert body["data"] is not None
    assert "results" in body["data"]
    assert len(body["data"]["results"]) == 1

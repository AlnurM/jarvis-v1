import pytest
from unittest.mock import AsyncMock, MagicMock


def test_get_db_helper():
    """db.get_db extracts db from request.app.state."""
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
    from db import get_db
    mock_request = MagicMock()
    mock_request.app.state.db = MagicMock()
    result = get_db(mock_request)
    assert result is mock_request.app.state.db


def test_mongo_connection(client):
    """MongoDB connection is established on startup via lifespan — health endpoint confirms."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    # "connected" proves AsyncMongoClient was initialized and db is reachable
    assert data["mongo"] == "connected"


def test_collections_initialized(client, mock_mongo):
    """Startup lifespan touches all three collections (conversations, events, settings)."""
    # Verify find_one was called on each collection during lifespan startup
    mock_mongo["conversations"].find_one.assert_called()
    mock_mongo["events"].find_one.assert_called()
    mock_mongo["settings"].find_one.assert_called()

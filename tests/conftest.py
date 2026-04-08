import pytest
import sys
import os
from unittest.mock import AsyncMock, MagicMock, patch

# Add backend to path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))


@pytest.fixture
def mock_mongo():
    """Mock MongoDB database for tests. Avoids real connection."""
    db = MagicMock()
    db.list_collection_names = AsyncMock(return_value=["conversations", "events", "settings"])
    db["conversations"].find_one = AsyncMock(return_value=None)
    db["events"].find_one = AsyncMock(return_value=None)
    db["settings"].find_one = AsyncMock(return_value=None)
    return db


@pytest.fixture
def client(mock_mongo):
    """TestClient with mocked MongoDB."""
    # Remove cached main module to allow fresh import with patched dependencies
    for mod in list(sys.modules.keys()):
        if mod == "main" or mod.startswith("main."):
            del sys.modules[mod]

    with patch("main.AsyncMongoClient") as mock_client_cls:
        mock_mongo_client = MagicMock()
        mock_mongo_client.__getitem__ = MagicMock(return_value=mock_mongo)
        mock_client_cls.return_value = mock_mongo_client
        mock_http_client = MagicMock()
        mock_http_client.aclose = AsyncMock(return_value=None)
        with patch("main.httpx.AsyncClient", return_value=mock_http_client):
            from main import app
            app.state.db = mock_mongo
            from fastapi.testclient import TestClient
            with TestClient(app) as c:
                yield c

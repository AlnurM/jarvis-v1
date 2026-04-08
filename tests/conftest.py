import pytest
import sys
import os
from unittest.mock import AsyncMock, MagicMock, patch

# Override settings before app import — required for AsyncClient-based fixtures
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("CLAUDE_API_KEY", "test-key")

# Add backend to path so imports work (kept for backward compat with existing tests)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from main import app


@pytest.fixture
def mock_mongo():
    """Mock MongoDB database for tests. Avoids real connection."""
    db = MagicMock()
    db.list_collection_names = AsyncMock(return_value=["conversations", "events", "settings"])
    db["conversations"].find_one = AsyncMock(return_value=None)
    db["events"].find_one = AsyncMock(return_value=None)
    db["settings"].find_one = AsyncMock(return_value=None)
    db["conversations"].insert_one = AsyncMock(return_value=MagicMock(inserted_id="test-id"))
    return db


@pytest.fixture
def client(mock_mongo):
    """Sync TestClient with mocked MongoDB — used by existing tests."""
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
            from main import app as fresh_app
            fresh_app.state.db = mock_mongo
            from fastapi.testclient import TestClient
            with TestClient(fresh_app) as c:
                yield c


@pytest.fixture
def mock_claude():
    """Mock AsyncAnthropic client — returns valid JSON envelope.

    Uses create=True so the fixture works before routers.chat is implemented
    (plan 02-02). When routers.chat exists, it patches the real client.
    """
    import json
    envelope = {"mode": "speak", "text": "Hello from JARVIS", "fetch": "none", "query": ""}
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=json.dumps(envelope))]

    try:
        import routers.chat  # noqa: F401 — check if module exists
        target = "routers.chat.client"
    except ImportError:
        # routers.chat not yet implemented (plan 02-02) — yield a no-op mock
        yield MagicMock()
        return

    with patch(target) as mock:
        mock.messages.create = AsyncMock(return_value=mock_response)
        yield mock


@pytest.fixture
async def http_client(mock_mongo):
    """Async HTTP test client with app lifespan (httpx AsyncClient + ASGITransport)."""
    from httpx import AsyncClient, ASGITransport

    with patch("main.AsyncMongoClient") as mock_client_cls:
        mock_mongo_client = MagicMock()
        mock_mongo_client.__getitem__ = MagicMock(return_value=mock_mongo)
        mock_client_cls.return_value = mock_mongo_client
        mock_http_client_obj = MagicMock()
        mock_http_client_obj.aclose = AsyncMock(return_value=None)
        with patch("main.httpx.AsyncClient", return_value=mock_http_client_obj):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                yield ac

import pytest


def test_health_endpoint_ok(client):
    """GET /api/health returns 200 with status=ok when MongoDB responds."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["mongo"] == "connected"


def test_api_routes_not_swallowed(client):
    """API routes must resolve before StaticFiles mount catches them."""
    response = client.get("/api/health")
    # If static mount swallowed this, it would return HTML not JSON
    assert response.headers["content-type"].startswith("application/json")


def test_health_endpoint_mongo_error(client, mock_mongo):
    """GET /api/health returns error dict (not 500) when MongoDB fails."""
    from unittest.mock import AsyncMock
    mock_mongo.list_collection_names = AsyncMock(side_effect=Exception("Connection refused"))
    response = client.get("/api/health")
    data = response.json()
    assert data["status"] == "error"
    assert "mongo" in data

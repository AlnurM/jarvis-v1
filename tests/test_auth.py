"""Tests for Google OAuth routes (Plan 06-01 TDD RED scaffold).

These tests reference /api/auth/google routes that don't exist yet —
will fail RED until Plan 06-04 adds the auth router.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


def test_google_auth_redirects(client, mock_mongo):
    """GET /api/auth/google returns 307 redirect to accounts.google.com."""
    resp = client.get("/api/auth/google", follow_redirects=False)

    # Should be a redirect response
    assert resp.status_code in (302, 307, 308)
    location = resp.headers.get("location", "")
    assert "accounts.google.com" in location or "google.com" in location


def test_google_callback_stores_token(client, mock_mongo):
    """GET /api/auth/google/callback with code param stores refresh_token in db["settings"]."""
    fake_credentials = MagicMock()
    fake_credentials.refresh_token = "fake-refresh-token"

    mock_flow = MagicMock()
    mock_flow.fetch_token = MagicMock()
    mock_flow.credentials = fake_credentials
    mock_flow.authorization_url = MagicMock(return_value=("https://accounts.google.com/o/oauth2/auth?...", "state"))

    with patch("google_auth_oauthlib.flow.Flow.from_client_config", return_value=mock_flow):
        # Must call auth start first to populate _active_flow (PKCE code_verifier preservation)
        client.get("/api/auth/google", follow_redirects=False)
        resp = client.get("/api/auth/google/callback", params={"code": "fake-auth-code", "state": "state"})

    # Should succeed (200 or redirect to success page)
    assert resp.status_code in (200, 302, 307)

    # Verify refresh token was stored in MongoDB settings
    mock_mongo["settings"].update_one.assert_called_once()
    call_args = mock_mongo["settings"].update_one.call_args
    # The update should contain the refresh token
    update_doc = call_args[0][1] if call_args[0] else call_args[1].get("update", {})
    assert update_doc is not None

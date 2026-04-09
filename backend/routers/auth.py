"""Google OAuth2 routes for Calendar access (per D-07, CAL-06)."""
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from config import settings

router = APIRouter()

CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar"]


def _build_flow() -> Flow:
    """Build OAuth2 flow from config settings."""
    return Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=CALENDAR_SCOPES,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
    )


@router.get("/api/auth/google")
async def google_auth_start():
    """Redirect to Google consent screen for Calendar access."""
    flow = _build_flow()
    auth_url, _state = flow.authorization_url(
        access_type="offline",     # REQUIRED for refresh token
        prompt="consent",          # REQUIRED to always get refresh token (Pitfall 1)
        include_granted_scopes="true",
    )
    return RedirectResponse(auth_url)


@router.get("/api/auth/google/callback")
async def google_auth_callback(request: Request, code: str, state: str = ""):
    """Handle Google OAuth2 callback — store refresh token in MongoDB."""
    flow = _build_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials

    if not creds.refresh_token:
        return {"status": "error", "message": "No refresh token received. Revoke app access in Google account and retry."}

    db = request.app.state.db
    await db["settings"].update_one(
        {"key": "google_refresh_token"},
        {"$set": {"value": creds.refresh_token}},
        upsert=True,
    )
    return {"status": "authorized", "message": "Google Calendar connected successfully."}

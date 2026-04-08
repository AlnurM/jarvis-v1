from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from pymongo import AsyncMongoClient
import httpx
from config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — initialize stateful resources once (per D-10)
    app.state.mongo = AsyncMongoClient(settings.MONGO_URL)
    app.state.db = app.state.mongo[settings.MONGODB_DB]
    app.state.http_client = httpx.AsyncClient(timeout=10.0)
    # Touch collections on startup to verify connection + initialize (per DB-02, DB-03)
    await app.state.db["conversations"].find_one({})
    await app.state.db["events"].find_one({})
    await app.state.db["settings"].find_one({})
    yield
    # Shutdown
    app.state.mongo.close()
    await app.state.http_client.aclose()


app = FastAPI(title="JARVIS", lifespan=lifespan)


@app.get("/api/health")
async def health(request: Request):
    """Health check — verifies MongoDB is reachable (per D-11, API-02)."""
    try:
        await request.app.state.db.list_collection_names()
        return {"status": "ok", "mongo": "connected"}
    except Exception as e:
        return {"status": "error", "mongo": str(e)}


# MUST be last — StaticFiles at "/" swallows everything above it (anti-pattern per PITFALL-1)
app.mount("/", StaticFiles(directory="static", html=True), name="static")

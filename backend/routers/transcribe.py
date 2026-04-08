"""Transcription endpoints — Deepgram STT relay.

Two modes:
1. POST /api/transcribe — REST fallback. Browser records full audio, uploads as file.
   Deepgram pre-recorded API transcribes it. Simpler, works everywhere.
2. WebSocket /api/ws/transcribe — Streaming relay (lower latency when supported).

Uses raw websockets/httpx instead of deepgram-sdk to avoid SDK version issues.
"""
import asyncio
import json
import logging

import httpx
import websockets
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File

from config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

DEEPGRAM_WS_URL = (
    "wss://api.deepgram.com/v1/listen"
    "?model=nova-2"
    "&language=ru"
    "&smart_format=true"
    "&interim_results=true"
    "&endpointing=300"
)


DEEPGRAM_REST_URL = "https://api.deepgram.com/v1/listen?model=nova-2&language=ru&smart_format=true"


@router.post("/api/transcribe")
async def transcribe_rest(file: UploadFile = File(...)):
    """REST fallback: upload recorded audio, get transcript back."""
    logger.info("REST transcribe: received file %s (%s)", file.filename, file.content_type)
    audio_bytes = await file.read()
    logger.info("Audio size: %d bytes", len(audio_bytes))

    content_type = file.content_type or "audio/mp4"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            DEEPGRAM_REST_URL,
            headers={
                "Authorization": f"Token {settings.DEEPGRAM_API_KEY}",
                "Content-Type": content_type,
            },
            content=audio_bytes,
        )

    if resp.status_code != 200:
        logger.error("Deepgram REST error %d: %s", resp.status_code, resp.text)
        return {"type": "error", "text": ""}

    data = resp.json()
    transcript = (
        data.get("results", {})
        .get("channels", [{}])[0]
        .get("alternatives", [{}])[0]
        .get("transcript", "")
    )
    logger.info("REST transcript: %s", transcript)
    return {"type": "transcript", "text": transcript}


@router.websocket("/api/ws/transcribe")
async def transcribe(websocket: WebSocket) -> None:
    """Relay binary audio from browser -> Deepgram -> transcript JSON back to browser."""
    await websocket.accept()
    logger.info("WS accepted, connecting to Deepgram...")

    headers = {"Authorization": f"Token {settings.DEEPGRAM_API_KEY}"}

    try:
        async with websockets.connect(DEEPGRAM_WS_URL, additional_headers=headers) as dg_ws:
            logger.info("Deepgram connected")

            async def forward_transcripts():
                """Read Deepgram responses and forward final transcripts to browser."""
                try:
                    async for msg in dg_ws:
                        data = json.loads(msg)
                        if data.get("type") == "Results" and data.get("is_final"):
                            transcript = (
                                data.get("channel", {})
                                .get("alternatives", [{}])[0]
                                .get("transcript", "")
                            )
                            if transcript:
                                logger.info("Transcript: %s", transcript)
                                await websocket.send_json(
                                    {"type": "transcript", "text": transcript}
                                )
                except websockets.ConnectionClosed:
                    pass
                except Exception as e:
                    logger.error("Deepgram recv error: %s", e)

            # Run Deepgram listener in background
            listener = asyncio.create_task(forward_transcripts())

            try:
                while True:
                    audio_chunk = await websocket.receive_bytes()
                    await dg_ws.send(audio_chunk)
            except WebSocketDisconnect:
                logger.info("Client disconnected")
            except Exception as e:
                logger.error("Audio relay error: %s", e)
            finally:
                listener.cancel()
                try:
                    await listener
                except asyncio.CancelledError:
                    pass
                # Signal Deepgram to finalize
                try:
                    await dg_ws.send(json.dumps({"type": "CloseStream"}))
                except Exception:
                    pass

    except Exception as e:
        logger.error("Deepgram relay error: %s", e, exc_info=True)
    finally:
        try:
            await websocket.close()
        except Exception:
            pass

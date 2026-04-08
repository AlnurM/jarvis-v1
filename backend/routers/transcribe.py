"""WebSocket /api/ws/transcribe — Deepgram live transcription relay.

Receives binary audio chunks from browser MediaRecorder (Safari audio/mp4),
relays to Deepgram Nova-2, streams transcript text back.

Uses raw websockets instead of deepgram-sdk to avoid SDK version issues.
Deepgram WebSocket API: wss://api.deepgram.com/v1/listen?model=nova-2&language=ru&...
"""
import asyncio
import json
import logging

import websockets
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

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


@router.websocket("/api/ws/transcribe")
async def transcribe(websocket: WebSocket) -> None:
    """Relay binary audio from browser -> Deepgram -> transcript JSON back to browser."""
    await websocket.accept()
    logger.info("WS accepted, connecting to Deepgram...")

    headers = {"Authorization": f"Token {settings.DEEPGRAM_API_KEY}"}

    try:
        async with websockets.connect(DEEPGRAM_WS_URL, extra_headers=headers) as dg_ws:
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

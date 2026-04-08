"""WebSocket /api/ws/transcribe — Deepgram live transcription relay.

Receives binary audio chunks from browser MediaRecorder (Safari audio/mp4),
relays to Deepgram Nova-3 Multilingual, streams transcript text back.

CRITICAL: Do NOT set encoding or sample_rate for containerized Safari audio/mp4.
Deepgram reads the container header automatically. Setting these causes empty/garbage transcripts.

SDK note: deepgram-sdk 6.x uses a new Fern-generated API.
  - client.listen.v1.connect() is an asynccontextmanager yielding AsyncV1SocketClient
  - EventType.MESSAGE receives ListenV1Results (or metadata/utterance-end objects)
  - connection.send_media(bytes) sends audio
  - connection.start_listening() runs the receive loop
"""
import asyncio
import logging

from deepgram import DeepgramClient

logger = logging.getLogger(__name__)
from deepgram.core.events import EventType
from deepgram.listen.v1.socket_client import ListenV1Results
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from config import settings

router = APIRouter()


@router.websocket("/api/ws/transcribe")
async def transcribe(websocket: WebSocket) -> None:
    """Relay binary audio from browser -> Deepgram -> transcript JSON back to browser."""
    await websocket.accept()

    logger.info("WS accepted, connecting to Deepgram...")
    dg_client = DeepgramClient(api_key=settings.DEEPGRAM_API_KEY)

    try:
        async with dg_client.listen.v1.connect(
            model="nova-3",
            language="multi",       # Multilingual mode for ru/en auto-detect (per D-04, CONV-02)
            smart_format=True,
            interim_results=True,
            endpointing=300,        # ms of silence before Deepgram finalizes an utterance
            # DO NOT set encoding or sample_rate — Safari audio/mp4 is containerized (Pitfall 2)
        ) as connection:

            async def on_message(result) -> None:
                """Forward final transcripts to the browser WebSocket."""
                try:
                    # Only process transcript results (not metadata/utterance-end events)
                    if not isinstance(result, ListenV1Results):
                        return
                    sentence = result.channel.alternatives[0].transcript
                    if sentence and result.is_final:
                        await websocket.send_json({"type": "transcript", "text": sentence})
                except Exception:
                    pass  # Ignore send errors if client disconnected

            connection.on(EventType.MESSAGE, on_message)
            logger.info("Deepgram connection established, starting listener...")

            # Start listener task in background, send audio in foreground loop
            listen_task = asyncio.create_task(connection.start_listening())

            try:
                while True:
                    audio_chunk = await websocket.receive_bytes()
                    await connection.send_media(audio_chunk)
            except WebSocketDisconnect:
                pass
            except Exception:
                pass
            finally:
                listen_task.cancel()
                try:
                    await listen_task
                except (asyncio.CancelledError, Exception):
                    pass

    except Exception as e:
        logger.error("Deepgram relay error: %s", e, exc_info=True)
    finally:
        # websocket is already closed on disconnect; suppress double-close errors
        try:
            await websocket.close()
        except Exception:
            pass

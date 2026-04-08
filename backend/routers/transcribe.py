"""WebSocket /api/ws/transcribe — Deepgram live transcription relay.

Receives binary audio chunks from browser MediaRecorder (Safari audio/mp4),
relays to Deepgram Nova-3 Multilingual, streams transcript text back.

CRITICAL: Do NOT set encoding or sample_rate for containerized Safari audio/mp4.
Deepgram reads the container header automatically.

SDK note: deepgram-sdk 6.x uses synchronous context manager and synchronous methods.
  - dg_client.listen.v1.connect() returns Iterator[V1SocketClient] (use `with`, not `async with`)
  - connection.send_media(bytes) is synchronous
  - connection.start_listening() is synchronous (blocks, runs receive loop)
  - connection.on(event, callback) registers sync callbacks
We run the Deepgram blocking receive loop in a background thread.
"""
import asyncio
import logging
import threading

from deepgram import DeepgramClient
from deepgram.core.events import EventType
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/api/ws/transcribe")
async def transcribe(websocket: WebSocket) -> None:
    """Relay binary audio from browser -> Deepgram -> transcript JSON back to browser."""
    await websocket.accept()
    logger.info("WS accepted, connecting to Deepgram...")

    dg_client = DeepgramClient(api_key=settings.DEEPGRAM_API_KEY)
    loop = asyncio.get_event_loop()

    try:
        # Synchronous context manager — NOT async
        with dg_client.listen.v1.connect(
            model="nova-3",
            language="multi",
            smart_format=True,
            interim_results=True,
            endpointing=300,
        ) as connection:
            logger.info("Deepgram connection established")

            def on_message(result, **kwargs) -> None:
                """Forward final transcripts to the browser WebSocket."""
                try:
                    # result can be dict or object depending on event type
                    if isinstance(result, dict):
                        channel = result.get("channel", {})
                        alternatives = channel.get("alternatives", [])
                        is_final = result.get("is_final", False)
                    else:
                        channel = getattr(result, "channel", None)
                        if channel is None:
                            return
                        alternatives = getattr(channel, "alternatives", [])
                        is_final = getattr(result, "is_final", False)

                    if not alternatives:
                        return

                    if isinstance(alternatives[0], dict):
                        sentence = alternatives[0].get("transcript", "")
                    else:
                        sentence = getattr(alternatives[0], "transcript", "")

                    if sentence and is_final:
                        logger.info("Deepgram transcript: %s", sentence)
                        # Schedule async send from sync callback
                        asyncio.run_coroutine_threadsafe(
                            websocket.send_json({"type": "transcript", "text": sentence}),
                            loop,
                        )
                except Exception as e:
                    logger.error("on_message error: %s", e)

            connection.on(EventType.Transcript, on_message)

            # Run blocking Deepgram receive loop in a thread
            listen_thread = threading.Thread(
                target=connection.start_listening, daemon=True
            )
            listen_thread.start()
            logger.info("Deepgram listener thread started")

            try:
                while True:
                    audio_chunk = await websocket.receive_bytes()
                    # send_media is synchronous but fast (just queues data)
                    connection.send_media(audio_chunk)
            except WebSocketDisconnect:
                logger.info("Client disconnected")
            except Exception as e:
                logger.error("Audio relay error: %s", e)
            finally:
                try:
                    connection.send_finalize()
                except Exception:
                    pass

    except Exception as e:
        logger.error("Deepgram relay error: %s", e, exc_info=True)
    finally:
        try:
            await websocket.close()
        except Exception:
            pass

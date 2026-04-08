# Phase 2: Voice Loop Core - Research

**Researched:** 2026-04-08
**Domain:** Voice pipeline (MediaRecorder → Deepgram → Claude → SpeechSynthesis) + Canvas audio visualization + Zustand FSM
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**STT**
- D-01: MediaRecorder API to capture audio (Safari PWA compatible — Web Speech API SpeechRecognition is broken in standalone PWA mode)
- D-02: Backend relays audio to Deepgram via WebSocket for real-time transcription (not Whisper)
- D-03: FastAPI WebSocket endpoint `/api/ws/transcribe` receives audio chunks, relays to Deepgram, returns transcript
- D-04: Deepgram configured for both Russian and English (auto-detect per utterance)

**Voice Activity Detection (VAD)**
- D-05: Frontend-side silence detection using audio energy analysis from MediaRecorder stream
- D-06: 1.5-2 second silence threshold triggers end-of-speech
- D-07: Waveform goes flat when silence detection triggers

**TTS**
- D-08: Web Speech API SpeechSynthesis (works in Safari PWA standalone)
- D-09: Voice selection — prefer Russian voice (Milena) on iOS, best available English fallback
- D-10: Polling workaround for Safari getVoices() (retry at 250ms intervals up to 2s)
- D-11: Tap anywhere to interrupt/stop TTS via speechSynthesis.cancel()

**Voice FSM**
- D-12: Zustand store manages `voiceState: 'idle' | 'listening' | 'thinking' | 'speaking'` — NO boolean flags
- D-13: State transitions strictly ordered: idle → listening → thinking → speaking → idle (or back to listening)
- D-14: Only one state active at a time
- D-15: Tap-to-speak: idle → listening. Silence: listening → thinking. API response: thinking → speaking. TTS end: speaking → idle

**Claude Integration**
- D-16: AsyncAnthropic, model: claude-sonnet-4-6
- D-17: Structured JSON output via `output_config.format` with `type: json_schema`
- D-18: JSON envelope: `{ mode: "search|weather|prayer|calendar|briefing|speak", text: "...", data: {} }`
- D-19: Backend fetches all sub-API data during same `/api/chat` call
- D-20: System prompt: JARVIS persona, concise (2-3 sentences), responds in user's detected language (ru/en)

**Conversation History**
- D-21: Last 20 messages in memory per session
- D-22: Full history persisted to MongoDB `conversations` collection
- D-23: Each conversation: session ID, messages array with role/content/timestamp
- D-24: Claude receives history for context-aware follow-up responses

**Visual Modes**
- D-25–D-28: Listening Mode — #0a0a0a background, electric blue #00d4ff sound wave, Canvas + AnalyserNode, "Listening..." text, fully immersive
- D-29–D-32: Thinking Mode — evolve OrbAnimation.tsx, blue → purple, no text, activates immediately on silence
- D-33–D-36: Speaking Mode — purple/violet #9b59b6 wave, subtitles at bottom (max 2 lines), fade in with speech, tap to stop
- D-37–D-39: Framer Motion (motion package) transitions, cubic-bezier(0.22, 1, 0.36, 1), fallback to Speaking if JSON fails

### Claude's Discretion
- Exact WebSocket message format for audio streaming
- Deepgram API configuration details (sample rate, encoding, model)
- Exact Canvas waveform rendering algorithm (sine wave, frequency bars, etc.)
- Subtitle text animation timing details
- Conversation session management (when to start a new session vs continue)
- FastAPI router structure (single file vs routers/ directory)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VOICE-01 | User can tap to activate microphone and speak | FSM idle→listening transition, tap handler on App.tsx |
| VOICE-02 | Audio captured via MediaRecorder API (Safari PWA compatible) | MediaRecorder pattern, audio/mp4 format, AudioContext unlock |
| VOICE-03 | Audio sent to backend for STT transcription (Deepgram) | WebSocket relay pattern: frontend WS → FastAPI → Deepgram |
| VOICE-04 | Silence detection (VAD) automatically ends recording after 1.5-2s | AnalyserNode RMS energy analysis, 1.5s timer pattern |
| VOICE-05 | User can tap to stop recording early | Tap handler calls mediaRecorder.stop(), FSM → thinking |
| TTS-01 | AI response spoken via SpeechSynthesis API | SpeechSynthesisUtterance pattern, onend → FSM idle |
| TTS-02 | Best available voice selected (prefer Russian on iOS) | getVoices() polling loop, language tag matching ru-RU/en-US |
| TTS-03 | User can tap to interrupt/stop speaking | speechSynthesis.cancel() in tap handler, interrupted error guard |
| TTS-04 | Voice list loaded with polling workaround for Safari getVoices() quirk | 250ms polling up to 2s, onvoiceschanged fallback |
| CONV-01 | Claude API integration with JARVIS persona | AsyncAnthropic, system prompt, claude-sonnet-4-6 |
| CONV-02 | Bilingual ru/en auto-detection — responds in user's language | System prompt instruction + Nova-3 multilingual language detection |
| CONV-03 | Conversation history maintained (last 20 messages) | In-memory deque in session state, 20-message cap |
| CONV-04 | Conversation history persisted to MongoDB | AsyncMongoClient conversations collection, session ID keying |
| CONV-05 | Claude returns structured JSON envelope with mode + text + data | output_config.format json_schema, RESPONSE_SCHEMA defined at module level |
| CONV-06 | System prompt enforces concise responses (2-3 sentences for general queries) | System prompt wording |
| MODE-01 | App auto-switches visual mode based on Claude JSON envelope | ModeRouter reads store.mode, renders correct component |
| MODE-02 | Smooth animated transitions between modes via motion package | AnimatePresence + motion.div with custom easing variant |
| MODE-03 | Fallback to Speaking mode if JSON parse fails | try/except around json.loads, default envelope with mode='speak' |
| LIST-01 | Dark background (#0a0a0a) with animated sound wave in electric blue (#00d4ff) | Canvas fillStyle, --color-background token |
| LIST-02 | Canvas-based wave visualization reacting to audio input | AnalyserNode getByteTimeDomainData, requestAnimationFrame loop |
| LIST-03 | "Listening..." text faded below wave | Tailwind opacity class, Space Grotesk label font |
| LIST-04 | No other UI elements visible | Conditional render — ListeningMode covers full viewport |
| THINK-01 | Morphing particle orb animation | Evolve OrbAnimation.tsx — multi-layer motion.div with blur |
| THINK-02 | Color transitions blue → purple | Animate from --color-primary (#85adff) to --color-secondary (#ad89ff) |
| THINK-03 | No text displayed | ThinkingMode returns orb only |
| THINK-04 | Activates after user stops speaking, while API call is in flight | FSM listening→thinking on silence; fetch runs concurrently |
| SPEAK-01 | Wave animation in purple/violet (#9b59b6) | Canvas wave, fillStyle #9b59b6 |
| SPEAK-02 | AI response text as subtitles at bottom (max 2 lines visible) | Windowed text slice with overflow hidden |
| SPEAK-03 | Subtitle text fades in synchronized with speech | Word-by-word opacity animation keyed to utterance boundary events |
</phase_requirements>

---

## Summary

Phase 2 builds the complete voice loop — the product's core value — by wiring together five subsystems: audio capture (MediaRecorder), speech transcription (Deepgram WebSocket relay), LLM routing (Claude structured outputs), text-to-speech (SpeechSynthesis), and audio-reactive Canvas visualizations, all orchestrated by a Zustand FSM.

The most technically complex piece is the MediaRecorder → FastAPI WebSocket → Deepgram relay chain. Safari outputs `audio/mp4` from MediaRecorder; Deepgram handles it natively without specifying an encoding parameter (it reads the container header). Nova-3 Multilingual is the correct Deepgram model — it supports real-time Russian/English code-switching and is generally available as of 2025.

Claude structured outputs are now GA (no beta headers required) and use `output_config.format` with `type: json_schema`. The SDK version on the machine (0.86.0) is behind the latest (0.91.0) — the requirements.txt must pin to 0.91.0 to get `output_config` support. The deepgram-sdk Python package 6.1.1 is the latest and is already installed locally.

**Primary recommendation:** Build and validate the Deepgram WebSocket relay on a real iPad PWA before implementing any mode views. This is the single highest-risk path — everything else is additive once the voice loop proves out end-to-end.

---

## Standard Stack

### New Packages Required for Phase 2

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| deepgram-sdk (Python) | 6.1.1 | Deepgram WebSocket client in FastAPI relay | Official SDK, handles async WebSocket lifecycle |
| anthropic (Python) | 0.91.0 | Claude API with structured outputs | Latest; `output_config.format` requires ≥0.88 |

**Already installed (from Phase 1 — no change needed):**

| Library | Version | Purpose |
|---------|---------|---------|
| motion (npm) | ^12.38.0 | Mode transitions (motion/react) |
| zustand (npm) | ^5.0.12 | Voice FSM global state |
| fastapi | 0.135.3 | Backend + WebSocket endpoint |
| pymongo[srv] | 4.16.0 | Conversation persistence |
| httpx | latest | External API calls |

**Version verification:**
```bash
# Python
pip show anthropic       # want 0.91.0
pip show deepgram-sdk    # want 6.1.1

# These are on the local machine already:
# anthropic: 0.86.0 — MUST UPGRADE to 0.91.0 in requirements.txt
# deepgram-sdk: 6.1.1 — already latest
```

**Frontend — no new npm packages needed.** MediaRecorder, Web Audio API, SpeechSynthesis, and Canvas are all native browser APIs.

**Backend installation:**
```bash
pip install "anthropic==0.91.0" "deepgram-sdk==6.1.1"
```

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| deepgram-sdk Python | raw websockets lib | SDK handles auth headers, reconnect, result parsing — no reason to avoid it |
| output_config.format | tool_use for mode routing | Tool use also works but json_schema is simpler for a fixed envelope schema |
| Nova-3 Multilingual | Nova-3 (English only) | Nova-3 Multilingual is required — Russian must work in the same stream |

---

## Architecture Patterns

### Recommended File Structure (Phase 2 additions)

```
frontend/src/
├── store/
│   └── assistantStore.ts          # EXTEND: add modeData, conversationHistory, sessionId
├── hooks/
│   ├── useVoiceRecorder.ts        # NEW: MediaRecorder lifecycle + audio chunk streaming
│   ├── useVoiceOutput.ts          # NEW: SpeechSynthesis wrapper with Safari workarounds
│   └── useWaveVisualizer.ts       # NEW: AnalyserNode + Canvas rAF loop
├── modes/
│   ├── ListeningMode.tsx          # NEW: Canvas waveform, "Listening..." text
│   ├── ThinkingMode.tsx           # IMPLEMENT: evolve OrbAnimation for thinking state
│   └── SpeakingMode.tsx           # NEW: purple wave + subtitle overlay
├── components/
│   ├── ModeRouter.tsx             # NEW: AnimatePresence switching between mode components
│   └── OrbAnimation.tsx           # EVOLVE: accept color/state props for ThinkingMode
└── App.tsx                        # REPLACE: tap handler, FSM boot, ModeRouter

backend/
├── main.py                        # EXTEND: add routers/include_router calls before StaticFiles
├── config.py                      # EXTEND: add DEEPGRAM_API_KEY field
├── db.py                          # UNCHANGED
└── routers/
    ├── chat.py                    # NEW: POST /api/chat — Claude + MongoDB
    └── transcribe.py              # NEW: WebSocket /api/ws/transcribe — Deepgram relay
```

### Pattern 1: Deepgram WebSocket Relay

**What:** FastAPI accepts binary audio bytes from browser WebSocket, relays to Deepgram, streams transcript back to browser.

**When to use:** Always for this architecture — hides API key, handles Safari's audio/mp4 correctly.

**Key discovery:** For containerized audio (Safari's audio/mp4), do NOT set `encoding` or `sample_rate` parameters. Deepgram reads the container header automatically. Setting these incorrectly causes transcription failure.

**Example:**
```python
# Source: Deepgram docs + deepgram-sdk 6.x API
# backend/routers/transcribe.py

from fastapi import APIRouter, WebSocket
from deepgram import DeepgramClient, LiveTranscriptionEvents, LiveOptions

router = APIRouter()

@router.websocket("/api/ws/transcribe")
async def transcribe(websocket: WebSocket):
    await websocket.accept()
    dg_client = DeepgramClient(settings.DEEPGRAM_API_KEY)

    options = LiveOptions(
        model="nova-3",           # Nova-3 Multilingual — supports ru + en code-switching
        language="multi",         # Multilingual mode for ru/en auto-detection
        smart_format=True,
        interim_results=True,
        endpointing=300,          # ms of silence before Deepgram finalizes utterance
        # DO NOT set encoding or sample_rate for containerized audio/mp4
    )

    connection = dg_client.listen.asyncwebsocket.v("1")

    async def on_message(self, result, **kwargs):
        sentence = result.channel.alternatives[0].transcript
        if sentence and result.is_final:
            await websocket.send_json({"type": "transcript", "text": sentence})

    connection.on(LiveTranscriptionEvents.Transcript, on_message)
    await connection.start(options)

    try:
        while True:
            audio_chunk = await websocket.receive_bytes()
            await connection.send(audio_chunk)
    except Exception:
        pass
    finally:
        await connection.finish()
        await websocket.close()
```

### Pattern 2: MediaRecorder + VAD (Frontend)

**What:** Capture audio with MediaRecorder, connect to AnalyserNode for energy-based silence detection, stream chunks to backend WebSocket.

**When to use:** Required for Safari PWA — SpeechRecognition is broken in standalone mode.

**Key facts:**
- Safari outputs `audio/mp4` — pass it directly, do not try to convert
- `AudioContext` must be created and `.resume()`d inside a synchronous user event handler (tap)
- MediaRecorder `timeslice` of 100-250ms gives good chunk granularity without excess overhead
- Connect MediaRecorder stream to AnalyserNode via `createMediaStreamSource` for real-time energy data

```typescript
// Source: MDN Web Audio API docs + implementation pattern
// hooks/useVoiceRecorder.ts

const startRecording = async () => {
  // MUST be called directly from user tap handler — iOS AudioContext policy
  if (!audioContextRef.current) {
    audioContextRef.current = new AudioContext()
  }
  await audioContextRef.current.resume()

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

  // Connect to AnalyserNode for VAD + waveform visualization
  const source = audioContextRef.current.createMediaStreamSource(stream)
  analyserRef.current = audioContextRef.current.createAnalyser()
  analyserRef.current.fftSize = 256
  source.connect(analyserRef.current)

  // Open WebSocket relay BEFORE starting MediaRecorder
  wsRef.current = new WebSocket(`wss://${location.host}/api/ws/transcribe`)

  const recorder = new MediaRecorder(stream)  // Safari uses audio/mp4 automatically
  recorder.ondataavailable = (e) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && e.data.size > 0) {
      wsRef.current.send(e.data)
    }
  }
  recorder.start(200)  // 200ms chunks

  // Start VAD energy polling
  startVAD()
}

const startVAD = () => {
  const dataArray = new Uint8Array(analyserRef.current!.frequencyBinCount)
  let silenceMs = 0

  const checkEnergy = () => {
    analyserRef.current!.getByteTimeDomainData(dataArray)
    // RMS energy: values are 0-255, centered at 128
    const rms = Math.sqrt(
      dataArray.reduce((sum, v) => sum + Math.pow(v - 128, 2), 0) / dataArray.length
    )
    const isSilent = rms < SILENCE_THRESHOLD  // ~5-10

    silenceMs = isSilent ? silenceMs + 50 : 0
    if (silenceMs >= 1500) {
      onSilenceDetected()  // triggers FSM: listening → thinking
      return
    }
    vadRafRef.current = requestAnimationFrame(checkEnergy)
  }
  vadRafRef.current = requestAnimationFrame(checkEnergy)
}
```

### Pattern 3: Claude Structured Outputs (GA, No Beta Headers)

**What:** Use `output_config.format` with `type: json_schema` for guaranteed JSON envelope. No beta headers required as of SDK 0.91.0.

**Key discovery:** The old `output_format` parameter (from beta) is deprecated. Current API shape is `output_config.format`. Both work during transition period, but new code should use `output_config`.

```python
# Source: Anthropic official docs (verified 2026-04-08)
# backend/routers/chat.py

import anthropic
import json

client = anthropic.AsyncAnthropic(api_key=settings.CLAUDE_API_KEY)

# Define at module level — schema is compiled once and cached 24h
RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "mode": {
            "type": "string",
            "enum": ["speak", "weather", "prayer", "search", "calendar", "briefing"]
        },
        "text": {"type": "string"},        # Spoken aloud by TTS
        "fetch": {
            "type": "string",
            "enum": ["none", "weather", "prayer", "search", "calendar", "briefing"]
        },
        "query": {"type": "string"}        # Search query if fetch == "search"; "" otherwise
    },
    "required": ["mode", "text", "fetch", "query"],
    "additionalProperties": False
}

SYSTEM_PROMPT = """You are JARVIS, an intelligent personal assistant for one user in Almaty, Kazakhstan.
Always respond in the same language the user speaks (Russian or English). 
For general queries, respond in 2-3 sentences maximum — be concise and direct.
Always return the required JSON schema fields. Use mode='speak' for general conversation.
Use fetch='none' unless the user asks about weather, prayer times, calendar, search, or briefing."""

async def call_claude(transcript: str, history: list[dict]) -> dict:
    messages = history + [{"role": "user", "content": transcript}]
    
    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=messages,
        output_config={
            "format": {
                "type": "json_schema",
                "schema": RESPONSE_SCHEMA
            }
        }
    )
    # response.content[0].text is always valid JSON — no parse errors possible
    return json.loads(response.content[0].text)
```

### Pattern 4: SpeechSynthesis with Safari Workarounds

**What:** TTS wrapper that handles Safari's getVoices() empty-on-first-call bug, interrupted error on cancel(), and backgrounding suspension.

```typescript
// hooks/useVoiceOutput.ts

const loadVoices = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices()
    if (voices.length > 0) { resolve(voices); return }

    // Safari: poll because onvoiceschanged doesn't fire reliably
    let attempts = 0
    const poll = setInterval(() => {
      const v = speechSynthesis.getVoices()
      if (v.length > 0 || attempts++ > 8) {
        clearInterval(poll)
        resolve(v)
      }
    }, 250)  // up to 2s (8 * 250ms)
  })
}

const selectVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
  // Priority: Russian → English → any
  return (
    voices.find(v => v.lang.startsWith('ru')) ||
    voices.find(v => v.lang.startsWith('en')) ||
    voices[0] || null
  )
}

const speak = (text: string, onEnd: () => void) => {
  speechSynthesis.cancel()  // clear any stuck queue

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.voice = selectedVoice
  utterance.lang = selectedVoice?.lang ?? 'en-US'

  utterance.onend = onEnd  // FSM → idle

  utterance.onerror = (e) => {
    // Safari fires onerror with 'interrupted' or 'canceled' on cancel() — treat as non-error
    if (e.error === 'interrupted' || e.error === 'canceled') return
    console.error('TTS error:', e.error)
    onEnd()  // recover FSM
  }

  // Watchdog: if onstart doesn't fire in 2s, assume stuck (backgrounding bug)
  const watchdog = setTimeout(() => {
    speechSynthesis.cancel()
    onEnd()
  }, 2000)
  utterance.onstart = () => clearTimeout(watchdog)

  speechSynthesis.speak(utterance)
}

// Background suspension recovery
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    speechSynthesis.cancel()  // clear any stuck queue on foreground return
  }
})
```

### Pattern 5: Zustand Store Extension

**What:** Extend the existing assistantStore with conversation history, modeData, and sessionId fields for Phase 2.

```typescript
// store/assistantStore.ts — Phase 2 additions
interface AssistantStore {
  // Existing (Phase 1)
  state: AssistantState
  mode: AssistantMode
  transcript: string
  response: string
  setState: (s: AssistantState) => void
  setMode: (m: AssistantMode) => void
  setTranscript: (t: string) => void
  setResponse: (r: string) => void

  // NEW in Phase 2
  modeData: Record<string, unknown> | null
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  sessionId: string
  setModeData: (d: Record<string, unknown> | null) => void
  addToHistory: (role: 'user' | 'assistant', content: string) => void
  resetSession: () => void
}
```

### Pattern 6: Canvas Waveform Visualization

**What:** Two AnalyserNode-driven Canvas animations — electric blue for Listening, purple for Speaking.

**Key constraint:** Keep `fftSize` at 256 or 512. iPad 10 has ~70ms frame-time variance — large FFT sizes cause visible stutter.

```typescript
// hooks/useWaveVisualizer.ts
const drawWave = (
  canvas: HTMLCanvasElement,
  analyser: AnalyserNode,
  color: string  // '#00d4ff' for listening, '#9b59b6' for speaking
) => {
  const ctx = canvas.getContext('2d')!
  const dataArray = new Uint8Array(analyser.frequencyBinCount)

  const draw = () => {
    rafRef.current = requestAnimationFrame(draw)
    analyser.getByteTimeDomainData(dataArray)

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 2

    const sliceWidth = canvas.width / dataArray.length
    let x = 0

    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0  // normalize 0-255 to 0-2
      const y = (v * canvas.height) / 2
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      x += sliceWidth
    }
    ctx.lineTo(canvas.width, canvas.height / 2)
    ctx.stroke()
  }

  draw()
  return () => cancelAnimationFrame(rafRef.current!)
}
```

### Pattern 7: ModeRouter with AnimatePresence

**What:** Smooth mode transitions using motion/react AnimatePresence. Custom easing from design.md applied.

```typescript
// components/ModeRouter.tsx
import { AnimatePresence, motion } from 'motion/react'
import { useAssistantStore } from '../store/assistantStore'

const modeVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }
}

export function ModeRouter() {
  const { state, mode } = useAssistantStore()

  // Voice states take priority over mode views
  if (state === 'listening') return <AnimatePresence mode="wait"><motion.div key="listening" {...modeVariants}><ListeningMode /></motion.div></AnimatePresence>
  if (state === 'thinking') return <AnimatePresence mode="wait"><motion.div key="thinking" {...modeVariants}><ThinkingMode /></motion.div></AnimatePresence>
  if (state === 'speaking') return <AnimatePresence mode="wait"><motion.div key="speaking" {...modeVariants}><SpeakingMode /></motion.div></AnimatePresence>

  // idle: show last mode view (or default orb)
  return <AnimatePresence mode="wait"><motion.div key={`idle-${mode}`} {...modeVariants}><IdleView mode={mode} /></motion.div></AnimatePresence>
}
```

### Anti-Patterns to Avoid

- **Multiple MediaRecorder instances:** Create one at hook initialization. Stop/start it — never recreate. Safari leaks resources on multiple instances.
- **Setting encoding on containerized audio:** Do NOT pass `encoding` or `sample_rate` to Deepgram for Safari's audio/mp4. It reads the container header automatically.
- **Creating AudioContext outside user gesture:** iOS suspends it permanently. Must call `new AudioContext()` and `.resume()` inside the tap event handler.
- **Using `onvoiceschanged` alone:** Doesn't fire in Safari. Always pair with 250ms polling fallback.
- **Per-request anthropic.AsyncAnthropic():** Instantiate once at module import. The client manages connection pooling internally.
- **Inline boolean flags for voice state:** No `isListening`, `isThinking` booleans. Only `voiceState: AssistantState` enum in Zustand.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deepgram WebSocket client | Raw websockets + auth + keepalive | deepgram-sdk 6.x | SDK handles reconnect, auth headers, event routing, KeepAlive protocol |
| JSON schema enforcement | try/except + regex on LLM output | Claude `output_config.format` json_schema | Constrained decoding — token-level guarantee, zero parse errors |
| Audio format detection | Custom mp4 parser | Let Deepgram auto-detect container | Deepgram reads container headers; manual detection is fragile |
| Voice selection logic | Platform detection + name matching | Language tag prefix matching (`ru`, `en`) | Voice names differ across iOS versions; language codes are stable |
| Animation orchestration | CSS transitions + JS timers | motion/react AnimatePresence | Exit animations require AnimatePresence — impossible to replicate cleanly in pure CSS |

**Key insight:** The Deepgram SDK eliminates ~200 lines of WebSocket lifecycle code (keepalive, reconnect, binary framing, auth headers). The Claude structured outputs API eliminates all JSON validation retry logic.

---

## Common Pitfalls

### Pitfall 1: AudioContext Suspended on Tap
**What goes wrong:** `new AudioContext()` created at module load returns `state: 'suspended'`. AnalyserNode data is all zeros. Waveform is flat.
**Why it happens:** iOS enforces audio activation only inside synchronous user gesture handlers.
**How to avoid:** Create AudioContext + call `.resume()` inside the `touchend`/`click` handler that starts recording. Maintain as a singleton — never recreate.
**Warning signs:** `audioContext.state === 'suspended'` after construction; waveform data array all 128s (center).

### Pitfall 2: Deepgram encoding Parameter Breaks mp4
**What goes wrong:** Setting `encoding: 'linear16'` or similar causes Deepgram to misparse Safari's containerized mp4 audio. Transcriptions are garbage or empty.
**Why it happens:** Encoding parameters are for raw PCM streams. Containerized audio (mp4, webm) carries its own header that Deepgram uses for detection.
**How to avoid:** For Safari, pass no `encoding` or `sample_rate` to `LiveOptions`. Test: if transcription works on Chrome (webm) but not Safari (mp4), this is the cause.
**Warning signs:** Empty transcripts from Deepgram when audio chunks are confirmed sent.

### Pitfall 3: speechSynthesis.cancel() Fires onerror
**What goes wrong:** User taps to interrupt. `cancel()` fires `utterance.onerror` with `error: 'interrupted'`. Error handler runs recovery logic, breaking the FSM.
**Why it happens:** Safari bug — cancel() is treated as an error on the current utterance.
**How to avoid:** In `onerror` handler, check `e.error === 'interrupted' || e.error === 'canceled'` and return early (no-op).
**Warning signs:** FSM enters unexpected state immediately after user tap-to-stop.

### Pitfall 4: Silence Threshold Too Tight for Russian
**What goes wrong:** 1.5s silence threshold cuts off Russian sentences that have natural mid-speech pauses. User's query is submitted incomplete.
**Why it happens:** Russian words are morphologically longer with longer phoneme sequences. Natural pause between clauses may exceed the threshold.
**How to avoid:** Start at 2.0s threshold for Russian, or make it configurable. Watch actual usage. Deepgram's `endpointing: 300` parameter on the backend provides a secondary signal.
**Warning signs:** Partial sentences submitted ("я хочу узнать пого-" instead of "я хочу узнать погоду").

### Pitfall 5: TTS Stuck After Backgrounding
**What goes wrong:** User switches apps mid-speech. On return, `speechSynthesis.speak()` queues but `onstart` never fires. JARVIS is visually in thinking/speaking state forever.
**Why it happens:** iOS suspends the speech synthesis audio session during backgrounding. Safari doesn't recover it automatically.
**How to avoid:** Listen to `visibilitychange`. When `document.hidden` becomes false, call `speechSynthesis.cancel()`. Add a 2s watchdog timer from `speak()` call to `onstart` — if it doesn't fire, cancel and recover FSM.
**Warning signs:** `speechSynthesis.speaking === true` after `speak()` but `onstart` never fires.

### Pitfall 6: Nova-3 "multi" Language vs. Specific Language Code
**What goes wrong:** Setting `language: 'ru'` in Deepgram options transcribes only Russian. English phrases get mangled. Setting `language: 'en'` breaks Russian.
**Why it happens:** Single language codes disable multilingual mode.
**How to avoid:** Use `language: 'multi'` with Nova-3 model — this enables the multilingual code-switching mode. Do not specify individual language codes.
**Warning signs:** Russian words transcribed as phonetic English, or English words skipped entirely.

### Pitfall 7: Schema Not Defined at Module Level
**What goes wrong:** First Claude request with a new schema takes 100-300ms extra for grammar compilation. If the schema dict is created per-request, this overhead hits every single call.
**Why it happens:** Constrained decoding requires compiling the JSON schema into a token-level grammar. This is cached after first use if the schema object is identical.
**How to avoid:** Define `RESPONSE_SCHEMA` as a module-level constant in `claude_service.py`. Never construct it inside the request handler.
**Warning signs:** First Claude call is consistently 200-400ms slower than subsequent calls.

---

## Code Examples

### FastAPI: Adding Routers Before StaticFiles

```python
# backend/main.py — Phase 2 extension
from routers import chat, transcribe

# ADD THESE before the StaticFiles mount:
app.include_router(chat.router)
app.include_router(transcribe.router)

# MUST remain last:
app.mount("/", StaticFiles(directory="static", html=True), name="static")
```

### Conversation Persistence to MongoDB

```python
# Append a turn to the conversations collection
async def save_message(db, session_id: str, role: str, content: str):
    await db["conversations"].update_one(
        {"session_id": session_id},
        {
            "$push": {
                "messages": {
                    "$each": [{"role": role, "content": content, "ts": datetime.utcnow()}],
                    "$slice": -40  # keep last 40 raw (20 turns = 20 user + 20 assistant)
                }
            },
            "$setOnInsert": {"session_id": session_id, "created_at": datetime.utcnow()}
        },
        upsert=True
    )
```

### Frontend WebSocket Transcript Reception

```typescript
// hooks/useVoiceRecorder.ts — WebSocket message handler
wsRef.current.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  if (msg.type === 'transcript' && msg.text) {
    setTranscript(msg.text)  // update Zustand store
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `output_format` beta header | `output_config.format` GA | Nov 2025 → GA 2026 | No beta headers needed; claude-sonnet-4-6 fully supported |
| Motor async MongoDB driver | PyMongo Async AsyncMongoClient | May 2025 (already done in Phase 1) | No change needed |
| framer-motion | motion/react | 2024 rename | Already done in Phase 1 |
| Deepgram Nova-2 | Nova-3 Multilingual | 2025 GA | Russian + English code-switching in single stream |
| SpeechRecognition STT | MediaRecorder + backend relay | Project decision | Only working path for Safari standalone PWA |
| webm (Chrome default) | audio/mp4 (Safari default) | Safari 14+ MediaRecorder | No conversion needed — Deepgram handles both |

**Deprecated/outdated:**
- `output_format` beta parameter: replaced by `output_config.format` (old syntax still works during transition, new code must use `output_config`)
- Deepgram Nova-2: succeeded by Nova-3 — no reason to use Nova-2 for new projects
- `anthropic-beta: structured-outputs-2025-11-13` header: no longer required

---

## Open Questions

1. **Deepgram Nova-3 "multi" endpointing behavior with Russian**
   - What we know: `endpointing: 300` is recommended for English; Russian has longer phoneme sequences
   - What's unclear: Whether 300ms endpointing causes premature sentence splits for Russian speech
   - Recommendation: Start at 500ms endpointing for Russian, or combine with frontend 2.0s VAD threshold as the primary gate

2. **Safari 18.4 audio/webm support**
   - What we know: Safari 18.4 reportedly returns `true` for `MediaRecorder.isTypeSupported('audio/webm; codecs=opus')`, enabling webm
   - What's unclear: Whether this applies to iPadOS 18.4 in standalone PWA mode or only browser mode
   - Recommendation: Default to audio/mp4 (always works); optionally detect webm support at runtime with `isTypeSupported`

3. **Subtitle synchronization approach**
   - What we know: SpeechSynthesis doesn't expose word-boundary events reliably on Safari
   - What's unclear: Best approach to fade-in subtitles "synchronized with speech" without word events
   - Recommendation: Reveal full response text at TTS start, or use character-count-based timing estimate (approximate words/sec rate)

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend build | ✓ | v20.11.0 | — |
| Python | Backend | ✓ | 3.14.3 | — |
| anthropic SDK | Claude integration | ✓ | 0.86.0 (NEEDS UPGRADE to 0.91.0) | — |
| deepgram-sdk | STT relay | ✓ | 6.1.1 | — |
| motion (npm) | Mode transitions | ✓ | ^12.38.0 | — |
| zustand (npm) | FSM state | ✓ | ^5.0.12 | — |
| Web Audio API | VAD + waveform | Browser native | All modern Safari | — |
| MediaRecorder API | Audio capture | Browser native | Safari 14+ | — |
| SpeechSynthesis | TTS | Browser native | Safari (all) | — |
| Canvas API | Visualization | Browser native | Safari (all) | — |
| DEEPGRAM_API_KEY | STT transcription | ✗ (env var) | — | Must be set in .env and Railway |
| CLAUDE_API_KEY | LLM | ✗ (env var) | — | Already in config.py; must be set in .env and Railway |

**Missing dependencies with no fallback:**
- `DEEPGRAM_API_KEY` — must be added to `.env` locally and Railway env vars before testing transcription
- `anthropic` must be upgraded to 0.91.0 in `requirements.txt` (current: 0.86.0 — `output_config` may not exist)

**Missing dependencies with fallback:**
- None

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no test files, no pytest.ini, no jest.config |
| Config file | Wave 0 creates `backend/tests/conftest.py` + `pytest.ini` |
| Quick run command | `cd backend && pytest tests/ -x -q` |
| Full suite command | `cd backend && pytest tests/ -v` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VOICE-02 | MediaRecorder sends binary chunks to WebSocket | manual | Test on real iPad — no automated substitute | ❌ Manual only |
| VOICE-03 | `/api/ws/transcribe` accepts binary, forwards to Deepgram, returns transcript JSON | integration | `pytest tests/test_transcribe.py -x` | ❌ Wave 0 |
| CONV-01 | `/api/chat` calls Claude and returns valid JSON envelope | unit | `pytest tests/test_chat.py::test_claude_returns_envelope -x` | ❌ Wave 0 |
| CONV-04 | Conversation saved to MongoDB on each turn | integration | `pytest tests/test_chat.py::test_conversation_persisted -x` | ❌ Wave 0 |
| CONV-05 | Claude response always matches JSON schema | unit | `pytest tests/test_chat.py::test_response_schema -x` | ❌ Wave 0 |
| MODE-03 | JSON parse failure falls back to Speaking mode | unit | `pytest tests/test_chat.py::test_json_fallback -x` | ❌ Wave 0 |
| TTS-04 | Voice polling returns non-empty voices list within 2s | manual | Test on Safari — SpeechSynthesis not available in Node | ❌ Manual only |
| LIST-02 | AnalyserNode waveform data is non-zero during recording | manual | Visual inspection on device | ❌ Manual only |
| SPEAK-02 | Subtitle text limited to 2 lines | unit | `pytest tests/test_subtitle.py -x` (component test) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && pytest tests/ -x -q`
- **Per wave merge:** `cd backend && pytest tests/ -v`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/tests/__init__.py` — makes tests a package
- [ ] `backend/pytest.ini` — test discovery config
- [ ] `backend/tests/conftest.py` — fixtures: test MongoDB client, mock Deepgram, mock Claude
- [ ] `backend/tests/test_chat.py` — covers CONV-01, CONV-04, CONV-05, MODE-03
- [ ] `backend/tests/test_transcribe.py` — covers VOICE-03 (mock Deepgram WS)
- [ ] Framework install: `pip install pytest pytest-asyncio httpx[test]` (backend test deps)

---

## Project Constraints (from CLAUDE.md)

All implementers MUST follow these before writing any UI component:

1. **Design Compliance (mandatory 6-point checklist):**
   - Design tokens match — colors, typography (Inter + Space Grotesk), surface hierarchy, glassmorphism
   - No-Line Rule enforced — no 1px borders; use background shifts, luminous depth, or backdrop blur
   - Stitch screen fidelity — implemented UI must match Stitch screens (IDs in design.md)
   - Nothing missing — every visual element from Stitch screen accounted for
   - Custom easing — use `cubic-bezier(0.22, 1, 0.36, 1)`, NOT standard 400ms easing
   - Text colors — never use pure white (#FFFFFF) for body text; use `on-surface-variant` (#adaaaa)

2. **Tailwind v4 CSS-first** — no tailwind.config.js; use `@theme` tokens in index.css

3. **motion/react** — import from `motion/react`, not `framer-motion`

4. **AsyncMongoClient (pymongo 4.16)** — not Motor; already in use in Phase 1

5. **StaticFiles mount MUST be last** in main.py — all routers must be registered before `app.mount("/"...)`

6. **GSD workflow** — use `/gsd:execute-phase` as entry point; no direct repo edits outside GSD

**Stitch screen IDs for Phase 2 modes (from design.md):**
- Listening Mode: `d6bf4b24d8844d3ba4aa32d422a6a8c4`
- Thinking Mode: `c121cc95f2e149a0873accbd6c47d7bd`
- Speaking Mode: `8554ef1a3efa42f9a07ad8774a690a7d`

---

## Sources

### Primary (HIGH confidence)
- Anthropic structured outputs docs (verified 2026-04-08) — `output_config.format` GA, claude-sonnet-4-6 supported
- MDN Web Audio API — AnalyserNode, getByteTimeDomainData, createMediaStreamSource
- MDN MediaRecorder API — mimeType, timeslice, ondataavailable
- MDN SpeechSynthesis — getVoices(), SpeechSynthesisUtterance, onerror event codes
- Deepgram live streaming docs — container format auto-detection, Nova-3 Multilingual support
- Project PITFALLS.md (2026-04-08) — Safari-specific bugs and workarounds (HIGH — project-specific research)
- Project STACK.md (2026-04-08) — technology selection and version verification (HIGH)
- Project ARCHITECTURE.md (2026-04-08) — FSM patterns, data flow, anti-patterns (HIGH)

### Secondary (MEDIUM confidence)
- Deepgram blog: Live Transcription with FastAPI — WebSocket relay pattern (verified against official SDK)
- Deepgram changelog: Nova-3 Multilingual GA — Russian/English code-switching (verified)
- buildwithmatija.com: iPhone Safari MediaRecorder + Deepgram (single source, pattern consistent with official docs)
- Deepgram encoding docs — omit encoding for containerized audio (verified against official docs)

### Tertiary (LOW confidence)
- Safari 18.4 audio/webm support claim — single web search result, unverified on iPadOS standalone PWA

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified against PyPI and npm registry; deepgram-sdk 6.1.1 and anthropic 0.91.0 confirmed latest
- Architecture: HIGH — patterns from existing project ARCHITECTURE.md plus official Deepgram + Anthropic docs verification
- Pitfalls: HIGH — project PITFALLS.md is based on documented WebKit bugs with issue tracker references; Safari SpeechSynthesis bugs are multi-source verified
- Claude structured outputs: HIGH — verified directly against official Anthropic docs; GA confirmed for claude-sonnet-4-6

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (30 days — APIs are stable; Safari behavior may change with iOS updates)

// API client — backend proxy routes
// All external API calls go through the FastAPI backend (no direct calls from frontend)

const API_BASE = '/api'

// ── Health ──────────────────────────────────────────────────────────────────

export async function healthCheck(): Promise<{ status: string; mongo: string }> {
  const res = await fetch(`${API_BASE}/health`)
  return res.json()
}

// ── Chat ────────────────────────────────────────────────────────────────────

export interface ChatRequest {
  transcript: string
  session_id: string
}

export interface ChatResponse {
  mode: string    // 'speak' | 'weather' | 'prayer' | 'search' | 'calendar' | 'briefing'
  text: string    // Spoken aloud by TTS
  fetch: string   // 'none' | 'weather' | 'prayer' | 'search' | 'calendar' | 'briefing'
  query: string   // Search query if fetch === 'search', empty string otherwise
}

/**
 * Send transcript to JARVIS backend → receive JSON envelope.
 * Returns ChatResponse or throws on network/HTTP error.
 */
export async function chatWithJarvis(request: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!res.ok) {
    throw new Error(`Chat API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

// ── Transcription WebSocket ──────────────────────────────────────────────────

export interface TranscriptMessage {
  type: 'transcript'
  text: string
}

/**
 * Open a WebSocket connection to the Deepgram relay endpoint.
 *
 * Usage:
 *   const ws = createTranscribeWS(
 *     (text) => console.log('transcript:', text),
 *     () => console.log('closed')
 *   )
 *   ws.send(audioBlob)    // Send binary audio chunks
 *   ws.close()            // Close when done
 *
 * Protocol: send binary Blob chunks → receive JSON { type: 'transcript', text: string }
 */
export function createTranscribeWS(
  onTranscript: (text: string) => void,
  onClose?: () => void
): WebSocket {
  // Use wss:// in production (Railway TLS), ws:// in local dev
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const ws = new WebSocket(`${protocol}//${location.host}/api/ws/transcribe`)

  ws.onmessage = (event) => {
    try {
      const msg: TranscriptMessage = JSON.parse(event.data as string)
      if (msg.type === 'transcript' && msg.text) {
        onTranscript(msg.text)
      }
    } catch {
      // Ignore malformed messages
    }
  }

  ws.onclose = () => {
    onClose?.()
  }

  ws.onerror = (err) => {
    console.error('TranscribeWS error:', err)
  }

  return ws
}

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

// ── Transcription (REST) ────────────────────────────────────────────────────

export interface TranscriptResult {
  type: string
  text: string
}

/**
 * Upload recorded audio blob to backend for Deepgram transcription.
 * Returns the transcript text.
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData()
  formData.append('file', audioBlob, 'recording.mp4')

  const res = await fetch(`${API_BASE}/transcribe`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`Transcribe error: ${res.status}`)
  }

  const data: TranscriptResult = await res.json()
  return data.text || ''
}

// ── Transcription WebSocket (kept for future low-latency mode) ──────────────

export function createTranscribeWS(
  onTranscript: (text: string) => void,
  onClose?: () => void
): WebSocket {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const ws = new WebSocket(`${protocol}//${location.host}/api/ws/transcribe`)

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string)
      if (msg.type === 'transcript' && msg.text) {
        onTranscript(msg.text)
      }
    } catch { /* ignore */ }
  }

  ws.onclose = () => onClose?.()
  ws.onerror = (err) => console.error('TranscribeWS error:', err)
  return ws
}

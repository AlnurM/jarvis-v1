import { create } from 'zustand'

// Voice FSM states — strictly ordered per D-12, D-13, D-14
// Transitions: idle → listening → thinking → speaking → idle
// NO boolean flags (isListening, isThinking, etc.) — only this enum
export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking'

// Visual display modes — determined by Claude JSON envelope
export type AssistantMode = 'chat' | 'weather' | 'prayer' | 'search' | 'calendar' | 'briefing'

// Claude JSON envelope shape (matches backend ChatResponse)
export interface JarvisEnvelope {
  mode: string
  text: string
  fetch: string
  query: string
}

// Conversation history message shape
export interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AssistantStore {
  // Voice FSM — single source of truth (per D-12)
  state: AssistantState
  setState: (s: AssistantState) => void

  // Visual mode — set from Claude envelope
  mode: AssistantMode
  setMode: (m: AssistantMode) => void

  // Current transcript from Deepgram
  currentTranscript: string
  setCurrentTranscript: (t: string) => void

  // Current Claude response text (shown as subtitle in Speaking mode)
  response: string
  setResponse: (r: string) => void

  // Additional mode data (weather data, prayer times, etc.) from Claude envelope
  modeData: Record<string, unknown> | null
  setModeData: (d: Record<string, unknown> | null) => void

  // Conversation history — last 20 messages in memory (per D-21)
  conversationHistory: HistoryMessage[]
  addToHistory: (role: 'user' | 'assistant', content: string) => void

  // Session ID — persists for the lifetime of the page session (per D-23)
  sessionId: string
  resetSession: () => void
}

export const useAssistantStore = create<AssistantStore>((set) => ({
  // Voice FSM
  state: 'idle',
  setState: (s) => set({ state: s }),

  // Visual mode
  mode: 'chat',
  setMode: (m) => set({ mode: m }),

  // Transcript
  currentTranscript: '',
  setCurrentTranscript: (t) => set({ currentTranscript: t }),

  // Response text
  response: '',
  setResponse: (r) => set({ response: r }),

  // Mode data
  modeData: null,
  setModeData: (d) => set({ modeData: d }),

  // Conversation history — capped at 20 messages (per D-21)
  conversationHistory: [],
  addToHistory: (role, content) =>
    set((s) => {
      const updated = [...s.conversationHistory, { role, content }]
      // Keep last 20 messages
      return { conversationHistory: updated.slice(-20) }
    }),

  // Session ID — using crypto.randomUUID() (available in all modern browsers including Safari iOS 14.5+)
  sessionId: crypto.randomUUID(),
  resetSession: () =>
    set({ sessionId: crypto.randomUUID(), conversationHistory: [], modeData: null }),
}))

import { create } from 'zustand'

type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking'
type AssistantMode = 'chat' | 'weather' | 'prayer' | 'search' | 'calendar' | 'briefing'

interface AssistantStore {
  state: AssistantState
  mode: AssistantMode
  transcript: string
  response: string
  setState: (s: AssistantState) => void
  setMode: (m: AssistantMode) => void
  setTranscript: (t: string) => void
  setResponse: (r: string) => void
}

export const useAssistantStore = create<AssistantStore>((set) => ({
  state: 'idle',
  mode: 'chat',
  transcript: '',
  response: '',
  setState: (s) => set({ state: s }),
  setMode: (m) => set({ mode: m }),
  setTranscript: (t) => set({ transcript: t }),
  setResponse: (r) => set({ response: r }),
}))

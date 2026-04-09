/**
 * useVoiceOutput — SpeechSynthesis wrapper with Safari workarounds
 *
 * Workarounds implemented (per RESEARCH.md Pattern 4):
 * 1. getVoices() polling — Safari returns empty list on first call
 * 2. 'interrupted'/'canceled' onerror suppression — cancel() triggers onerror in Safari
 * 3. 2s onstart watchdog — backgrounding bug causes speak() to hang forever
 * 4. visibilitychange cancel — clears stuck queue on app foreground return
 */
import { useRef, useCallback, useEffect } from 'react'
import { useAssistantStore } from '../store/assistantStore'

const VOICE_POLL_INTERVAL_MS = 250
const VOICE_POLL_MAX_ATTEMPTS = 8  // 8 * 250ms = 2s max wait (per D-10)
const TTS_WATCHDOG_MS = 2000

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices()
    if (voices.length > 0) {
      resolve(voices)
      return
    }
    // Poll because onvoiceschanged doesn't fire reliably in Safari (per D-10)
    let attempts = 0
    const poll = setInterval(() => {
      const v = speechSynthesis.getVoices()
      if (v.length > 0 || attempts++ >= VOICE_POLL_MAX_ATTEMPTS) {
        clearInterval(poll)
        resolve(v)
      }
    }, VOICE_POLL_INTERVAL_MS)
  })
}

function selectVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  // Priority: Russian → English → any available (per D-09)
  return (
    voices.find((v) => v.lang.startsWith('ru')) ||
    voices.find((v) => v.lang.startsWith('en')) ||
    voices[0] ||
    null
  )
}

export function useVoiceOutput() {
  const { setState, addToHistory } = useAssistantStore()
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null)

  // Load voices on mount
  useEffect(() => {
    loadVoices().then((voices) => {
      selectedVoiceRef.current = selectVoice(voices)
    })

    // Background suspension recovery (Pitfall 5 from RESEARCH.md)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        speechSynthesis.cancel()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  /**
   * Speak text aloud. Handles Safari bugs and triggers FSM → idle on completion.
   * @param text — The text to speak
   * @param assistantText — Optional: add to conversation history as assistant message
   */
  const speak = useCallback((text: string, assistantText?: string, onComplete?: () => void) => {
    // Cancel any existing speech to clear the queue
    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)

    if (selectedVoiceRef.current) {
      utterance.voice = selectedVoiceRef.current
      utterance.lang = selectedVoiceRef.current.lang
    } else {
      utterance.lang = 'ru-RU'  // Default to Russian (primary use language per project spec)
    }

    utterance.onend = () => {
      if (assistantText) addToHistory('assistant', assistantText)
      setState('idle')  // FSM: speaking → idle (per D-15)
      onComplete?.()    // Phase 3: auto-listen hook (D-19, LOOP-01)
    }

    utterance.onerror = (e) => {
      // Safari fires onerror with 'interrupted' or 'canceled' on cancel() — NOT a real error
      // Treat as non-error and let FSM recover (Pitfall 3 from RESEARCH.md)
      if (e.error === 'interrupted' || e.error === 'canceled') return
      console.error('TTS error:', e.error)
      setState('idle')  // Recover FSM on real errors
    }

    // Watchdog: if onstart doesn't fire in 2s, assume stuck (backgrounding bug — Pitfall 5)
    const watchdog = setTimeout(() => {
      speechSynthesis.cancel()
      setState('idle')
    }, TTS_WATCHDOG_MS)

    utterance.onstart = () => clearTimeout(watchdog)

    speechSynthesis.speak(utterance)
  }, [setState, addToHistory])

  /**
   * Stop speaking immediately — called on user tap-to-interrupt (per D-11, TTS-03)
   * Note: triggers onerror('interrupted') in Safari — suppressed in utterance.onerror above
   */
  const stopSpeaking = useCallback(() => {
    speechSynthesis.cancel()
    setState('idle')
  }, [setState])

  return { speak, stopSpeaking }
}

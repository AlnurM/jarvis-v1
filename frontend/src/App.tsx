/**
 * App.tsx — Root component + Voice FSM orchestration
 *
 * FSM transition map (per D-15):
 *   idle → listening: user taps (handleTap when state is 'idle')
 *   listening → thinking: silence detected (inside useVoiceRecorder)
 *   thinking → speaking: chatWithJarvis response received
 *   speaking → idle: TTS ends (inside useVoiceOutput.speak onEnd)
 *
 * CRITICAL: startRecording() must be called from a synchronous event handler
 * to satisfy iOS AudioContext activation policy (Pitfall 1 from RESEARCH.md).
 * The handleTap function is called directly from onClick/onTouchEnd.
 */
import { useEffect, useCallback, useRef } from 'react'
import { useAssistantStore } from './store/assistantStore'
import { useVoiceRecorder } from './hooks/useVoiceRecorder'
import { useVoiceOutput } from './hooks/useVoiceOutput'
import { chatWithJarvis } from './api/client'
import { ModeRouter } from './components/ModeRouter'

function App() {
  const {
    state,
    setState,
    currentTranscript,
    sessionId,
    setResponse,
    setMode,
    setModeData,
  } = useAssistantStore()

  const { startRecording, stopRecording, analyserRef } = useVoiceRecorder()
  const { speak, stopSpeaking } = useVoiceOutput()

  // Track the current thinking state to cancel if user taps early
  const thinkingAbortRef = useRef<AbortController | null>(null)
  const autoListenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)  // Phase 3: LOOP-01

  // iOS ghost-click guard: touchend fires first, then click fires ~300ms later.
  // e.preventDefault() on touchend is not reliable in all Safari versions for suppressing click.
  // This ref prevents handleTap from firing twice on a single physical tap.
  const touchHandledRef = useRef(false)

  // Prevent context menu on long press (iPad)
  useEffect(() => {
    document.addEventListener('contextmenu', (e) => e.preventDefault())
  }, [])

  /**
   * Handle Claude API call when state enters 'thinking'.
   * This effect runs whenever currentTranscript changes AND state is 'thinking'.
   * The transcript is set by useVoiceRecorder when Deepgram returns a final result.
   */
  useEffect(() => {
    if (state !== 'thinking' || !currentTranscript) return

    const abortController = new AbortController()
    thinkingAbortRef.current = abortController

    const runChat = async () => {
      try {
        const envelope = await chatWithJarvis({
          transcript: currentTranscript,
          session_id: sessionId,
        })

        if (abortController.signal.aborted) return

        // Apply envelope to store
        setResponse(envelope.text)
        // Map backend mode names to store AssistantMode type
        const modeMap: Record<string, string> = {
          speak: 'chat',
          weather: 'weather',
          prayer: 'prayer',
          search: 'search',
          calendar: 'calendar',
          briefing: 'briefing',
        }
        setMode((modeMap[envelope.mode] ?? 'chat') as Parameters<typeof setMode>[0])
        setModeData(envelope.data ?? null)  // Phase 3: use weather/prayer data from backend (D-03)

        // Transition to speaking and start TTS (per D-15)
        setState('speaking')
        // Phase 3 LOOP-01: auto-listen after success (D-19, D-20, D-23)
        speak(envelope.text, envelope.text, () => {
          // onComplete fires after setState('idle') in useVoiceOutput
          // D-21: 500ms delay — orb shows in idle state briefly before waveform
          autoListenTimerRef.current = setTimeout(() => {
            autoListenTimerRef.current = null
            // Only start if still idle (D-22 guard — handleTap clears timer if user taps first)
            setState('listening')
            startRecording()
          }, 500)
        })
      } catch (err) {
        if (abortController.signal.aborted) return
        console.error('Chat API error:', err)
        // Fallback: recover FSM to idle on error
        setState('idle')
      }
    }

    runChat()

    return () => {
      abortController.abort()
    }
  }, [state, currentTranscript]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Main tap handler — synchronous entry point for iOS AudioContext.
   * MUST remain synchronous and call startRecording() directly.
   * (AudioContext.resume() must be called inside synchronous gesture handler — Pitfall 1)
   */
  const handleTap = useCallback(() => {
    // Phase 3: Cancel pending auto-listen timer if user taps during 500ms window (D-22)
    if (autoListenTimerRef.current !== null) {
      clearTimeout(autoListenTimerRef.current)
      autoListenTimerRef.current = null
    }

    if (state === 'idle') {
      // idle → listening (per D-15)
      setState('listening')
      startRecording()  // This is async internally but called here synchronously
    } else if (state === 'speaking') {
      // User taps during speech → stop TTS and return to idle (per D-11, TTS-03, D-36)
      stopSpeaking()
      // setState('idle') is called inside stopSpeaking()
    } else if (state === 'listening') {
      // User manually stops recording early (VOICE-05)
      stopRecording()
      setState('thinking')
    }
    // 'thinking' state taps are ignored — abort would require canceling the API call
    // which is handled by the AbortController above if a new session starts
  }, [state, setState, startRecording, stopRecording, stopSpeaking])

  return (
    <div
      className="w-screen h-screen overflow-hidden"
      onClick={() => {
        // Only handle click if NOT already handled by touchend (iOS ghost-click guard)
        if (touchHandledRef.current) {
          touchHandledRef.current = false
          return
        }
        handleTap()
      }}
      onTouchEnd={(e) => {
        // Prevent scroll/zoom on tap and suppress the ghost click that follows
        e.preventDefault()
        touchHandledRef.current = true
        handleTap()
      }}
      style={{ touchAction: 'none', userSelect: 'none' }}
    >
      <ModeRouter analyserRef={analyserRef} onStopSpeaking={stopSpeaking} />
    </div>
  )
}

export default App

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
import { useEffect, useCallback, useRef, useState } from 'react'
import { useAssistantStore } from './store/assistantStore'
import { useVoiceRecorder } from './hooks/useVoiceRecorder'
import { useVoiceOutput } from './hooks/useVoiceOutput'
import { chatWithJarvis } from './api/client'
import { ModeRouter } from './components/ModeRouter'

// Content modes: on these modes, FloatingMic handles its own tap.
// Full-screen tap is ignored during active voice states to prevent double-fire (Pitfall 2, D-20).
const CONTENT_MODES_SET = new Set(['weather', 'prayer', 'search', 'calendar', 'briefing'])

function App() {
  const {
    state,
    setState,
    mode,
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

  // Morning briefing auto-trigger state (per D-17, BRIEF-04)
  const [showBriefingPrompt, setShowBriefingPrompt] = useState(false)

  // Prevent context menu on long press (iPad)
  useEffect(() => {
    document.addEventListener('contextmenu', (e) => e.preventDefault())
  }, [])

  // Morning briefing auto-trigger at 7 AM (per D-17, BRIEF-04, Pitfall 6)
  // iOS AudioContext requires prior user gesture — show tap-to-start overlay instead of auto-playing
  useEffect(() => {
    let hasFiredThisSession = false
    const interval = setInterval(() => {
      if (hasFiredThisSession) return
      const now = new Date()
      const h = now.getHours()
      const m = now.getMinutes()
      const today = now.toDateString()
      const lastBriefingDate = localStorage.getItem('lastBriefingDate')
      const { state: currentState } = useAssistantStore.getState()
      if (h === 7 && m < 5 && lastBriefingDate !== today && currentState === 'idle') {
        hasFiredThisSession = true
        localStorage.setItem('lastBriefingDate', today)
        setShowBriefingPrompt(true)
      }
    }, 60_000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger briefing via the same chat pipeline as voice (reuses runChat in thinking effect)
  const handleBriefingTrigger = useCallback(() => {
    const { setCurrentTranscript, setState } = useAssistantStore.getState()
    setCurrentTranscript('morning briefing')
    setState('thinking')
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

    // On content modes: FloatingMic handles its own tap. Full-screen tap is ignored
    // during active voice states to prevent double-fire (Pitfall 2, D-20).
    if (CONTENT_MODES_SET.has(mode) && state !== 'idle') return

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
  }, [state, mode, setState, startRecording, stopRecording, stopSpeaking])

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
      <ModeRouter
        analyserRef={analyserRef}
        onStopSpeaking={stopSpeaking}
        onStartListening={() => { setState('listening'); startRecording() }}
        onStopListening={() => { stopRecording(); setState('thinking') }}
      />

      {/* Morning briefing auto-trigger overlay (per D-17, BRIEF-04) */}
      {/* iOS AudioContext requires user gesture — this overlay is the gesture (Pitfall 6) */}
      {showBriefingPrompt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onClick={() => {
            setShowBriefingPrompt(false)
            handleBriefingTrigger()
          }}
          onTouchEnd={(e) => {
            e.stopPropagation()
            setShowBriefingPrompt(false)
            handleBriefingTrigger()
          }}
        >
          <div
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%), rgba(32, 31, 31, 0.4)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 0 30px rgba(133, 173, 255, 0.05)',
              borderRadius: 'var(--radius-xl)',
              padding: '2rem 3rem',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: '1.5rem',
                color: '#e8e8e8',
                fontFamily: 'var(--font-heading)',
                marginBottom: '0.5rem',
              }}
            >
              Good Morning
            </p>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-on-surface-variant)',
                fontFamily: 'var(--font-body)',
                margin: 0,
              }}
            >
              Tap to start your morning briefing
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

/**
 * useVoiceRecorder — MediaRecorder + VAD + Deepgram WebSocket relay hook
 *
 * CRITICAL CONSTRAINT: startRecording() MUST be called from a synchronous
 * user tap event handler. iOS suspends AudioContext permanently if created
 * outside a gesture handler. (Pitfall 1 from RESEARCH.md)
 *
 * RACE CONDITION GUARD: Deepgram may deliver multiple onTranscript callbacks
 * (partials + finals) while state is still 'listening'. We accumulate these in
 * a local ref and flush to setCurrentTranscript + setState('thinking') ONCE,
 * atomically, only when silence is detected. This prevents App.tsx's
 * useEffect([state, currentTranscript]) from firing with an empty or partial
 * transcript before Deepgram delivers the final result.
 *
 * Usage:
 *   const { startRecording, stopRecording, analyserRef } = useVoiceRecorder()
 *   // Call startRecording() in onClick/onTouchEnd handler
 */
import { useRef, useCallback } from 'react'
import { createTranscribeWS } from '../api/client'
import { useAssistantStore } from '../store/assistantStore'

// Silence detection threshold — RMS energy below this = silence
// Values are 0-255, centered at 128. Start at 8 for testing, tune for Russian if needed.
const SILENCE_THRESHOLD = 8
// Silence duration before triggering end-of-speech (per D-06: 1.5-2s)
const SILENCE_MS = 1500

export function useVoiceRecorder() {
  const { setState, setCurrentTranscript, addToHistory } = useAssistantStore()

  // Singleton refs — NEVER recreate (Safari leaks resources on multiple instances)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const vadRafRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Accumulates Deepgram transcript fragments during a single recording session.
  // NEVER written to store mid-stream — flushed atomically on silence detection.
  const transcriptRef = useRef<string>('')

  const stopVAD = useCallback(() => {
    if (vadRafRef.current !== null) {
      cancelAnimationFrame(vadRafRef.current)
      vadRafRef.current = null
    }
  }, [])

  const stopRecording = useCallback(() => {
    stopVAD()
    recorderRef.current?.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    wsRef.current?.close()
    wsRef.current = null
    recorderRef.current = null
  }, [stopVAD])

  const startVAD = useCallback(() => {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    let silenceMs = 0
    let lastTime = performance.now()
    let hasDetectedSpeech = false  // Grace period: don't trigger silence until speech is detected

    const checkEnergy = () => {
      if (!analyserRef.current) return

      const now = performance.now()
      const dt = now - lastTime
      lastTime = now

      analyserRef.current.getByteTimeDomainData(dataArray)

      // RMS energy: values 0-255 centered at 128
      const rms = Math.sqrt(
        dataArray.reduce((sum, v) => sum + Math.pow(v - 128, 2), 0) / dataArray.length
      )
      const isSilent = rms < SILENCE_THRESHOLD

      if (!isSilent) {
        hasDetectedSpeech = true
        silenceMs = 0
      } else if (hasDetectedSpeech) {
        // Only count silence AFTER speech has been detected
        silenceMs += dt
      }

      if (hasDetectedSpeech && silenceMs >= SILENCE_MS) {
        console.log('[VAD] Silence detected after speech, flushing transcript')
        // Silence detected — flush accumulated transcript and transition atomically.
        // setCurrentTranscript and setState('thinking') happen in the same call stack
        // so App.tsx useEffect([state, currentTranscript]) sees both changes together.
        stopRecording()
        const fullTranscript = transcriptRef.current
        transcriptRef.current = ''  // Reset for next session
        if (fullTranscript) {
          addToHistory('user', fullTranscript)
          setCurrentTranscript(fullTranscript)  // Store update 1
        }
        setState('thinking')  // Store update 2 — triggers App.tsx useEffect
        return
      }

      vadRafRef.current = requestAnimationFrame(checkEnergy)
    }

    vadRafRef.current = requestAnimationFrame(checkEnergy)
  }, [setState, setCurrentTranscript, addToHistory, stopRecording])

  /**
   * Start recording — MUST be called from a synchronous user event handler.
   * Creates AudioContext + resumes it inside the gesture event.
   */
  const startRecording = useCallback(async () => {
    // Reset transcript accumulator for this new session
    transcriptRef.current = ''

    // Create AudioContext singleton inside gesture handler (per Pitfall 1)
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    // Resume is required — iOS starts AudioContext in 'suspended' state
    await audioContextRef.current.resume()
    console.log('[recorder] AudioContext state:', audioContextRef.current.state)

    // Request microphone access
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch (err) {
      console.error('Microphone access denied:', err)
      setState('idle')
      return
    }
    console.log('[recorder] Mic stream acquired:', stream.getAudioTracks()[0]?.label)
    streamRef.current = stream

    // Connect stream to AnalyserNode for VAD + waveform visualization
    const source = audioContextRef.current.createMediaStreamSource(stream)
    analyserRef.current = audioContextRef.current.createAnalyser()
    analyserRef.current.fftSize = 256  // Keep low for iPad performance (Pitfall per RESEARCH.md)
    source.connect(analyserRef.current)

    // Open WebSocket relay BEFORE starting MediaRecorder (per D-03)
    wsRef.current = createTranscribeWS(
      (text) => {
        // Accumulate transcript in ref — do NOT call setCurrentTranscript here.
        // Deepgram sends multiple callbacks (partials + finals); we flush once on silence.
        // Overwrite rather than append since Deepgram returns progressively longer finals.
        console.log('[recorder] Deepgram transcript:', text)
        transcriptRef.current = text
      },
      () => {
        // WebSocket closed — no action needed (stopRecording already handles state)
      }
    )

    // Create MediaRecorder — Safari auto-selects audio/mp4 (correct for Deepgram)
    const recorder = new MediaRecorder(stream)
    recorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (wsRef.current?.readyState === WebSocket.OPEN && e.data.size > 0) {
        wsRef.current.send(e.data)
      }
    }

    // 200ms timeslice for good chunk granularity without excess overhead
    recorder.start(200)

    // Start VAD polling
    startVAD()
  }, [setState, setCurrentTranscript, addToHistory, startVAD])

  return {
    startRecording,
    stopRecording,
    analyserRef,  // Exposed for useWaveVisualizer
  }
}

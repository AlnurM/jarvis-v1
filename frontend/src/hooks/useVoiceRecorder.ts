/**
 * useVoiceRecorder — MediaRecorder + VAD + REST transcription hook
 *
 * Records audio via MediaRecorder, detects silence via AnalyserNode,
 * then uploads the full recording to POST /api/transcribe for Deepgram STT.
 *
 * CRITICAL: startRecording() MUST be called from a synchronous user tap handler.
 * iOS suspends AudioContext permanently if created outside a gesture handler.
 */
import { useRef, useCallback } from 'react'
import { transcribeAudio } from '../api/client'
import { useAssistantStore } from '../store/assistantStore'

const SILENCE_THRESHOLD = 8
const SILENCE_MS = 1500

export function useVoiceRecorder() {
  const { setState, setCurrentTranscript, addToHistory } = useAssistantStore()

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const vadRafRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

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
    recorderRef.current = null
  }, [stopVAD])

  const startVAD = useCallback(() => {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    let silenceMs = 0
    let lastTime = performance.now()
    let hasDetectedSpeech = false

    const checkEnergy = () => {
      if (!analyserRef.current) return

      const now = performance.now()
      const dt = now - lastTime
      lastTime = now

      analyserRef.current.getByteTimeDomainData(dataArray)

      const rms = Math.sqrt(
        dataArray.reduce((sum, v) => sum + Math.pow(v - 128, 2), 0) / dataArray.length
      )
      const isSilent = rms < SILENCE_THRESHOLD

      if (!isSilent) {
        hasDetectedSpeech = true
        silenceMs = 0
      } else if (hasDetectedSpeech) {
        silenceMs += dt
      }

      if (hasDetectedSpeech && silenceMs >= SILENCE_MS) {
        console.log('[VAD] Silence detected, stopping recording')
        // Stop recorder — onstop handler will do transcription
        stopRecording()
        return
      }

      vadRafRef.current = requestAnimationFrame(checkEnergy)
    }

    vadRafRef.current = requestAnimationFrame(checkEnergy)
  }, [stopRecording])

  const startRecording = useCallback(async () => {
    chunksRef.current = []

    // AudioContext inside gesture handler (iOS requirement)
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    await audioContextRef.current.resume()
    console.log('[recorder] AudioContext state:', audioContextRef.current.state)

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch (err) {
      console.error('Microphone access denied:', err)
      setState('idle')
      return
    }
    console.log('[recorder] Mic acquired:', stream.getAudioTracks()[0]?.label)
    streamRef.current = stream

    // AnalyserNode for VAD + waveform
    const source = audioContextRef.current.createMediaStreamSource(stream)
    analyserRef.current = audioContextRef.current.createAnalyser()
    analyserRef.current.fftSize = 256
    source.connect(analyserRef.current)

    // MediaRecorder — collect chunks
    const recorder = new MediaRecorder(stream)
    recorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data)
      }
    }

    recorder.onstop = async () => {
      console.log('[recorder] Stopped, chunks:', chunksRef.current.length)
      const audioBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/mp4' })
      console.log('[recorder] Audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type)

      if (audioBlob.size < 1000) {
        console.warn('[recorder] Audio too small, skipping transcription')
        setState('idle')
        return
      }

      // Transition to thinking BEFORE transcription
      setState('thinking')

      try {
        const transcript = await transcribeAudio(audioBlob)
        console.log('[recorder] Transcript:', transcript)

        if (transcript) {
          addToHistory('user', transcript)
          setCurrentTranscript(transcript)
        } else {
          console.warn('[recorder] Empty transcript')
          setState('idle')
        }
      } catch (err) {
        console.error('[recorder] Transcription failed:', err)
        setState('idle')
      }
    }

    recorder.start(200)  // 200ms timeslice for chunks
    startVAD()
  }, [setState, setCurrentTranscript, addToHistory, startVAD, stopRecording])

  return {
    startRecording,
    stopRecording,
    analyserRef,
  }
}

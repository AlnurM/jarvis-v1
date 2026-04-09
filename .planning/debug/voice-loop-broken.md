---
status: awaiting_human_verify
trigger: "voice-loop-broken — voice loop doesn't work end-to-end on Railway"
created: 2026-04-08T00:00:00Z
updated: 2026-04-08T00:00:00Z
---

## Current Focus

hypothesis: Multiple concrete issues found — plan vs implementation deviations + missing dependency
test: Read all source files and plans; ran pytest and npm run build
expecting: Fix all issues to make voice loop work end-to-end
next_action: Fix all identified issues:
  1. Missing python-multipart dep (REST transcribe breaks on import)
  2. useVoiceRecorder uses REST instead of WebSocket (deviates from plan)
  3. VAD in REST version doesn't guard against pre-speech silence (fixed already with hasDetectedSpeech)
  4. WebSocket relay backend uses raw `websockets` lib (correct, avoids SDK bug)
  5. Claude API uses output_config (may not be valid for current SDK version)

## Symptoms

expected: User taps → mic records → Deepgram transcribes → Claude responds → TTS speaks. Full voice loop on Railway.
actual: Screen flickering on tap. WebSocket approach had SDK issues + Railway WS uncertainty. REST fallback added but untested. VAD triggered silence immediately.
errors: |
  1. deepgram-sdk 6.x: '_GeneratorContextManager' object does not support async context manager
  2. Raw websockets: HTTP 400 from Deepgram (param issues)
  3. Railway may not properly proxy WebSocket connections
  4. VAD was triggering silence immediately (fixed with grace period)
  5. python-multipart not in requirements.txt (REST upload breaks)
reproduction: Deploy to Railway, open on iPad, tap "Tap to speak", speak
started: Phase 2 deployment testing

## Eliminated

- hypothesis: deepgram-sdk is usable
  evidence: SDK 6.x has '_GeneratorContextManager' async context manager bug. Raw websockets lib already adopted in transcribe.py as the fix.
  timestamp: 2026-04-08

## Evidence

- timestamp: 2026-04-08
  checked: backend/requirements.txt
  found: python-multipart is NOT listed — but POST /api/transcribe uses UploadFile (multipart form)
  implication: pytest fails with RuntimeError on import; REST transcription cannot work without this dep

- timestamp: 2026-04-08
  checked: frontend/src/hooks/useVoiceRecorder.ts (current) vs 02-04-PLAN.md (planned)
  found: PLAN specified WebSocket relay (createTranscribeWS); CURRENT uses REST (transcribeAudio). The plan's useVoiceRecorder had transcriptRef + WebSocket relay; current has REST-on-silence. This is the primary deviation.
  implication: REST approach works functionally but is higher latency; WebSocket is better but both can work

- timestamp: 2026-04-08
  checked: backend/routers/transcribe.py
  found: Has BOTH REST POST /api/transcribe AND WS /api/ws/transcribe. WS relay uses raw websockets lib (correct), REST uses httpx. REST endpoint uses UploadFile which requires python-multipart.
  implication: Both paths are coded but REST is broken due to missing dep

- timestamp: 2026-04-08
  checked: frontend/src/api/client.ts
  found: transcribeAudio() uploads to POST /api/transcribe — correctly calls REST endpoint. createTranscribeWS() also present for WS mode.
  implication: Client supports both modes; current hook uses REST only

- timestamp: 2026-04-08
  checked: frontend/src/App.tsx and store/assistantStore.ts
  found: FSM wiring matches plan — idle→listening→thinking→speaking→idle. useEffect on [state, currentTranscript] triggers chat API call. handleTap correctly synchronous.
  implication: App wiring is correct per plan

- timestamp: 2026-04-08
  checked: backend/routers/chat.py — output_config usage
  found: Uses output_config={"format": {"type": "json_schema", "schema": RESPONSE_SCHEMA}} which is the GA structured output API for anthropic SDK 0.91.0
  implication: This should be correct for SDK 0.91.0

- timestamp: 2026-04-08
  checked: frontend npm run build
  found: BUILD SUCCEEDS — 335KB bundle, no TypeScript errors
  implication: Frontend code is syntactically correct

- timestamp: 2026-04-08
  checked: python3 -m pytest
  found: FAILS at import — python-multipart not installed causes RuntimeError in FastAPI on UploadFile route
  implication: python-multipart must be added to requirements.txt

- timestamp: 2026-04-08
  checked: VAD logic in useVoiceRecorder.ts (REST version)
  found: hasDetectedSpeech flag present — VAD only starts counting silence after speech detected. Grace period implemented correctly.
  implication: VAD silence-immediately bug was already fixed

- timestamp: 2026-04-08
  checked: Deepgram WS URL params
  found: DEEPGRAM_WS_URL uses nova-2 + language=ru; plan called for nova-3 + language=multi (multilingual). This is a deviation — affects Russian+English code-switching support
  implication: Should use nova-3 + language=multi for proper bilingual support

- timestamp: 2026-04-08
  checked: Screen flickering on tap
  found: AnimatePresence mode="wait" causes exit+enter transitions on every state change. idle→listening transition: idle key is "idle-chat", listening key is "listening" — key changes triggers AnimatePresence mount/unmount. The 400ms enter + 250ms exit = visible transition. BUT "flickering" (rapid back-and-forth) suggests something else: tap triggers onClick AND onTouchEnd, causing handleTap to be called TWICE.
  implication: Double tap bug — onTouchEnd calls e.preventDefault() to prevent ghost click, but onClick may still fire in some iOS versions. Need to verify preventDefault actually works.

## Resolution

root_cause: |
  Four concrete bugs:
  1. python-multipart missing from requirements.txt — FastAPI raises RuntimeError at startup when
     UploadFile route is registered without this dep. REST transcription cannot work. pytest fails.
  2. Deepgram WS + REST URLs used nova-2 + language=ru instead of plan-specified nova-3 + language=multi.
     This breaks Russian/English code-switching transcription.
  3. Screen flickering / double-tap: iOS Safari fires both onTouchEnd AND onClick for every tap.
     e.preventDefault() on the synthetic React touchEnd event is not fully reliable for ghost-click
     suppression. Without a guard, handleTap fires twice: idle→listening (first), then listening→thinking
     (second) before any audio is captured.
  4. The REST useVoiceRecorder already had correct hasDetectedSpeech VAD guard and correct
     setState('thinking') before transcription + setCurrentTranscript after. The App.tsx effect
     correctly waits for both state='thinking' AND non-empty currentTranscript before calling chat.
     This sequencing is sound for REST mode.

fix: |
  1. Added python-multipart>=0.0.9 to backend/requirements.txt
  2. Updated DEEPGRAM_WS_URL and DEEPGRAM_REST_URL to use model=nova-3&language=multi
  3. Fixed double-tap: touchHandledRef in App.tsx — onTouchEnd sets the ref and calls handleTap;
     onClick checks the ref and skips if touchEnd already handled it (clears ref after skip)
  All verified: npm run build passes, pytest 15/15 GREEN

verification: npm run build — 335KB bundle, 0 TS errors. pytest — 15 passed, 0 failed.
files_changed:
  - backend/requirements.txt
  - backend/routers/transcribe.py
  - frontend/src/App.tsx

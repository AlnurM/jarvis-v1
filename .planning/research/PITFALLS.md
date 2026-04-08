# Domain Pitfalls

**Domain:** AI Voice Assistant PWA (iPad Safari, landscape)
**Researched:** 2026-04-08
**Project:** JARVIS

---

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

---

### Pitfall 1: SpeechRecognition Silently Fails in Standalone PWA Mode

**What goes wrong:** When JARVIS is installed to the iPad home screen and launched as a standalone PWA, `window.SpeechRecognition` (and its `webkitSpeechRecognition` alias) throws an error immediately on `.start()` without ever prompting for microphone permission. The app appears to load fine, the UI renders, but voice input never works. This is not a permissions issue the user can fix — Safari intentionally blocks SpeechRecognition in the standalone WebApp context.

**Why it happens:** Apple's implementation gates the Speech Recognition API on the Safari browser context. When the app is in `standalone` display mode (`apple-mobile-web-app-capable`), it runs in a stripped-down WebView that lacks the same API surface as Safari proper. WebKit bug [#225298](https://bugs.webkit.org/show_bug.cgi?id=225298) has been open for years. As of early 2026, this is unfixed.

**Consequences:** The entire value proposition of the app collapses. The user opens JARVIS from the home screen icon and cannot speak to it at all. There is no graceful degradation path without a significant architectural rethink.

**Prevention:**
- Test on a real iPad in both contexts (Safari browser tab AND home screen icon) from day one of voice implementation.
- Detect the display mode before initializing: `window.navigator.standalone === true` means standalone mode.
- If standalone mode is detected, gate the `SpeechRecognition` call and display a clear banner: "Open in Safari for voice features" with a link that re-opens in Safari.
- Do not assume "installed to home screen" is the primary use case. Design the UX so the app works well as a Safari browser tab — the user can bookmark and full-screen via the Share sheet without installing.
- Alternatively, evaluate whether a backend STT endpoint (Whisper API, Google Cloud STT) eliminates the browser API dependency entirely.

**Detection warning signs:**
- `SpeechRecognition` fires `onerror` immediately with `service-not-allowed` or `not-allowed`
- No microphone permission dialog ever appears
- `navigator.standalone` is `true`

**Phase:** Address in the very first voice implementation sprint. Do not build the full UI mode system before confirming this works on the actual target device.

---

### Pitfall 2: Audio Context Permanently Suspended Until User Gesture

**What goes wrong:** On iOS/iPadOS, the Web Audio API `AudioContext` starts in a `suspended` state and cannot be resumed programmatically. Any attempt to play TTS audio or run audio-reactive canvas visualizations before a user tap results in silence and/or broken animation states. This is true even in Safari (browser tab mode), not just standalone PWA.

**Why it happens:** Apple enforces a strict user-gesture policy for audio to prevent autoplay abuse and preserve battery. The `AudioContext` will only transition from `suspended` to `running` when `.resume()` is called inside a synchronous user event handler (click, touchend — not touchstart).

**Consequences:**
- The morning briefing that auto-triggers at 7:00 AM will produce no audio output on a locked/idle iPad.
- TTS initiated without a preceding user tap fails silently.
- Canvas waveform animations driven by an AudioContext analyser node produce flat-line output.

**Prevention:**
- On first meaningful user interaction (the initial tap to start listening), call `audioContext.resume()` in the event handler before any synthesis.
- Maintain a single shared `AudioContext` singleton created once and kept alive for the app session.
- For the auto-morning briefing: the briefing can only play audio if the user has already interacted since the app loaded. Show a visual prompt instead until the user taps.
- Use the `SpeechSynthesisUtterance` path (not a raw AudioContext decode path) for TTS — it has its own iOS quirks but does not require a pre-unlocked AudioContext.
- Never create and destroy `AudioContext` instances per-utterance; iOS takes seconds to initialize each one.

**Detection warning signs:**
- `audioContext.state === 'suspended'` after `new AudioContext()`
- TTS starts without error but produces no audio on first load
- Canvas animation renders but waveform data is always zero

**Phase:** Bootstrap / foundation phase. Must be solved before any audio feature is implemented.

---

### Pitfall 3: speechSynthesis.getVoices() Returns Empty Array on Safari

**What goes wrong:** On iOS/iPadOS Safari, `speechSynthesis.getVoices()` returns `[]` on the first call. The `onvoiceschanged` event — the standard way to detect when the voice list is ready — does not fire reliably on Safari (and may never fire). Code that waits for `onvoiceschanged` hangs indefinitely and never selects a voice, resulting in either no TTS or TTS using an unintended default voice.

**Why it happens:** Safari's implementation of the Speech Synthesis API is incomplete. The `onvoiceschanged` event is not implemented in Safari on iOS. Voice enumeration happens asynchronously, but there is no reliable notification mechanism.

**Consequences:**
- JARVIS speaks with an unintended voice (or not at all if the code guards on voice selection)
- Russian language voice selection fails, falling back to an incorrect voice
- "Best available voice" logic never runs

**Prevention:**
- Use a polling retry pattern: call `getVoices()` every 250ms up to 2000ms total; use the first non-empty result.
- Do not rely on `onvoiceschanged` as the sole trigger. Use it as a hint if present, but always pair with the polling fallback.
- Select voice by language tag (`ru-RU`, `en-US`) rather than by name — voice names differ across iOS versions.
- iPadOS 18 reduced the number of high-quality voices available. Test which Russian voices are present on the target device and have a priority list with fallbacks.
- Always call `speechSynthesis.cancel()` before a new utterance to clear any stuck queue.

**Detection warning signs:**
- `speechSynthesis.getVoices().length === 0` after DOM ready
- `onvoiceschanged` never fires in Safari devtools
- TTS uses a different accent/language than expected

**Phase:** Voice output implementation sprint.

---

### Pitfall 4: speechSynthesis.cancel() Triggers onerror on Current Utterance

**What goes wrong:** On iOS 14+ and Safari 14+, calling `speechSynthesis.cancel()` fires the `onerror` event on the utterance that was currently speaking. If the `onerror` handler treats this as a real error (logs it, shows an error state, enters a recovery flow), the app enters a broken error loop every time the user interrupts JARVIS mid-speech.

**Why it happens:** Safari's implementation incorrectly fires the error event on cancellation. This is a known WebKit bug. The error code reported is `interrupted` or similar, but the handler cannot easily distinguish it from a genuine synthesis failure.

**Consequences:**
- User taps the mic to interrupt JARVIS mid-sentence; the app shows an error indicator or logs a spurious error
- Error recovery logic re-tries the utterance instead of moving to listen mode
- If the listen flow is gated on error-free TTS, the voice loop breaks

**Prevention:**
- Set `utterance.onerror = null` before calling `speechSynthesis.cancel()`, or check the error type in the handler.
- In the `onerror` handler, check `event.error === 'interrupted'` or `event.error === 'canceled'` and treat these as non-errors.
- Build a state machine for the voice loop that explicitly handles the `interrupted` state as a normal transition to `listening`.

**Detection warning signs:**
- Error events fire immediately after calling `.cancel()`
- `event.error` value is `'interrupted'` or `'canceled'`

**Phase:** Voice loop state machine implementation.

---

### Pitfall 5: speechSynthesis Stops Working After Safari Goes to Background

**What goes wrong:** If the user switches apps or locks the screen while JARVIS is speaking, iOS suspends the process. When the user returns, `speechSynthesis` may be permanently broken for that session — new utterances queue but never start, and there is no error. The only fix is a page reload.

**Why it happens:** iOS process suspension interrupts the TTS audio session. Safari does not recover the speech synthesis queue when foregrounded again.

**Consequences:**
- JARVIS appears to "think" (shows thinking animation) but never starts speaking
- The user has no idea why nothing happens; there is no error indicator
- Session must be restarted

**Prevention:**
- Listen to `document.visibilitychange` events. When the page becomes visible again, call `speechSynthesis.cancel()` to clear any stuck queue before processing new responses.
- Display a "tap to resume" indicator when the app returns from background if TTS was interrupted.
- Implement a watchdog: if a `SpeechSynthesisUtterance` does not fire `onstart` within 2 seconds of being queued, assume the synthesis engine is stuck and reset it.

**Detection warning signs:**
- `speechSynthesis.speaking === true` indefinitely
- `onstart` never fires after `speak()` is called
- Page was backgrounded/locked recently

**Phase:** Voice loop hardening / edge case handling.

---

## Moderate Pitfalls

---

### Pitfall 6: PWA True Fullscreen is Not Achievable on iPadOS

**What goes wrong:** The `standalone` display mode removes the address bar but does not remove the status bar (showing time, battery, signal). The Fullscreen API (`element.requestFullscreen()`) is not available in Safari on iOS. Setting `display: fullscreen` in the web manifest is ignored on iOS — it falls back to `standalone`. There is no CSS or API escape hatch. The status bar is always visible.

**Why it happens:** Apple does not expose the Fullscreen API on iOS Safari and enforces a minimum visible chrome in standalone mode for user orientation.

**Consequences:**
- The "full-screen PWA" requirement in PROJECT.md cannot be met literally on iPadOS
- Design must account for the status bar (~20-44px depending on device and orientation)
- Canvas and glassmorphism backgrounds will not extend to the very top of the screen

**Prevention:**
- Use `env(safe-area-inset-top)` CSS variable for all top-edge padding/positioning.
- Set `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` to make the status bar overlay (transparent background) rather than push content down — this gets as close to edge-to-edge as possible.
- Design the dark background to extend behind the status bar visually; the status bar text (white on black-translucent) will blend in.
- Do not design any interactive elements or critical text in the top 44px safe area.

**Detection warning signs:**
- White or gray bar appears at top of app when launched from home screen
- Content is visually clipped at top
- `window.innerHeight` is less than `screen.height` by more than expected

**Phase:** UI/PWA setup phase — must be designed correctly from the start, not retrofitted.

---

### Pitfall 7: Claude JSON Envelope Breaks Streaming Perceived Latency

**What goes wrong:** The architecture plan uses Claude to return a JSON envelope (determining which mode to display alongside the voice response). If this JSON is parsed from the full response, the user sees the "thinking" animation for the entire duration of Claude's response generation before anything happens. Streaming the response does not help if the entire response must be received before the JSON envelope is parsed and TTS begins.

**Why it happens:** JSON is not streamable by default — you need the complete token sequence to parse a valid JSON object. If the voice text is inside the JSON (e.g., `{"mode": "weather", "response": "Here is today's weather..."}`), the entire JSON string must be buffered before TTS can begin.

**Consequences:**
- For a 150-token response at Claude Sonnet speeds (~60 tokens/sec), this adds 2.5 seconds of unnecessary latency before speech starts
- The "seamless voice loop" core value is directly undermined
- Users perceive JARVIS as slow even when the API is responding quickly

**Prevention:**
- Use streaming from the Claude API. Stream the response and use partial JSON parsing to extract the `response` field as tokens arrive, starting TTS as soon as the text content begins to stream.
- Alternatively, separate the mode-routing call from the response call: one fast call determines the mode, a second streaming call generates the voice response text. This adds one round-trip but enables streaming TTS.
- Prefer the tool_use / structured outputs pattern where mode is a tool call parameter (determined early) while the voice text streams freely.
- Target: TTS should begin within 500ms of the first Claude token arriving.

**Detection warning signs:**
- Long silence between user finishing speech and JARVIS starting to speak
- Claude API latency logs show fast TTFT but TTS starts much later
- "Thinking" animation runs for 3+ seconds consistently

**Phase:** Claude API integration / voice loop sprint.

---

### Pitfall 8: MongoDB Motor is Deprecated — Use PyMongo Async

**What goes wrong:** The project plan specifies Motor as the async MongoDB driver. As of May 14, 2025, MongoDB officially deprecated Motor in favor of the PyMongo Async API (GA released alongside Motor's deprecation). Motor will receive only bug fixes until May 2026, then only critical fixes until May 2027. Starting a new project on Motor in 2026 means inheriting a dead-end dependency.

**Why it happens:** MongoDB merged async support directly into PyMongo, making the separate Motor library redundant.

**Consequences:**
- Technical debt from day one
- No new features added to Motor
- Migration effort required when Motor reaches end of life

**Prevention:**
- Use `pymongo[async]` instead of `motor` for the MongoDB async client.
- The API surface is nearly identical: replace `AsyncIOMotorClient` with `pymongo.AsyncMongoClient`. Coroutine patterns are the same.
- MongoDB's official FastAPI integration tutorial now uses PyMongo Async.

**Detection warning signs:**
- Dependency list includes `motor` as primary async driver
- `from motor.motor_asyncio import AsyncIOMotorClient` appears in code

**Phase:** Backend setup / first sprint. Must be decided before any database code is written.

---

### Pitfall 9: Railway Service Sleep Kills First-Request Voice Latency

**What goes wrong:** Railway's free/hobby tier enables "App Sleeping" — the container sleeps after a period of inactivity and takes several seconds to wake on the next request. For a voice assistant, the first tap of the day may result in a 5-10 second cold-start pause before JARVIS responds.

**Why it happens:** Railway's sleep mode is designed to save resources. The container process is suspended and must restart, re-initialize the FastAPI app, reconnect to MongoDB, and re-establish any pooled connections before serving the request.

**Consequences:**
- The "seamless and fast" voice loop goal is destroyed on first use each day
- MongoDB connection is not pre-warmed; first database query adds additional latency
- User may tap again thinking nothing happened, causing duplicate requests

**Prevention:**
- Upgrade to a Railway plan with always-on containers, or use Railway's "Never Sleep" service option.
- Implement a lightweight health-check ping from the frontend (on app load) to wake the service before the user speaks for the first time.
- Use a MongoDB connection singleton initialized once at FastAPI startup (`lifespan` event), not on first request.
- Add a visible "connecting..." state in the UI that resolves before enabling the microphone button.

**Detection warning signs:**
- First request of the day takes 5-10x longer than subsequent requests
- FastAPI startup logs appear mid-session in Railway logs
- MongoDB driver logs show new connection being established on each "cold" request

**Phase:** Deployment setup and backend hardening.

---

### Pitfall 10: Web Speech API interimResults Silence Detection is Unreliable on iOS

**What goes wrong:** The standard approach to silence detection (knowing when the user has stopped speaking) uses `onresult` interim callbacks — if no interim result arrives for N milliseconds, assume silence. On iOS Safari, the event sequence is incomplete: only `audiostart` and `start` fire reliably; intermediate events like `soundstart`, `soundend`, and `speechend` may not fire at all. This makes the 750ms silence heuristic unreliable, causing JARVIS to either cut the user off mid-sentence or wait indefinitely.

**Why it happens:** WebKit's SpeechRecognition implementation fires a reduced event set compared to Chromium. This is a long-standing implementation gap (documented in WebKit issue [#120](https://github.com/WebKit/Documentation/issues/120)).

**Consequences:**
- JARVIS submits a partial sentence ("I want to know the weath-")
- Or JARVIS never submits, and the recognition session hangs
- User experience is unpredictable and feels broken

**Prevention:**
- Use `interimResults: true` and implement a timer-based silence detector: reset a 750ms timer every time any interim result arrives; when the timer fires without a new result, treat as end-of-speech.
- Set a hard maximum session duration (e.g., 15 seconds) as a fallback.
- Do not rely on `onspeechend`, `onsoundend`, or `onaudioend` for primary silence detection on iOS.
- Test specifically with Russian phrases — Russian words are longer on average and the 750ms threshold may be too aggressive.

**Detection warning signs:**
- Speech recognition submits mid-sentence on iOS
- `onspeechend` / `onsoundend` events never appear in the iOS console
- Recognition works correctly in Chrome desktop but cuts off in iOS Safari

**Phase:** Voice input implementation sprint.

---

## Minor Pitfalls

---

### Pitfall 11: Framer Motion on iOS Degrades Under Simultaneous Audio Processing

**What goes wrong:** Running a Framer Motion particle orb animation (the "thinking" mode) simultaneously with active SpeechRecognition and/or TTS can cause animation jank on the iPad. iOS throttles `requestAnimationFrame` in contexts it considers non-interactive, and the combination of microphone processing + DOM animation + JavaScript event handling competes for the main thread.

**Prevention:**
- Offload heavy animation math to CSS transforms (GPU-composited) rather than JavaScript-driven frame updates.
- Use `will-change: transform` on animated elements to hint compositing.
- Prefer CSS animations for the speaking waveform (pure GPU path); use Framer Motion only for entrance/exit transitions.
- Profile with Safari's Web Inspector Timeline on a real iPad before committing to any canvas-based particle system.
- Consider simpler animations than particle physics for the "thinking" state (e.g., a pulsing gradient) if performance data shows frame drops.

**Phase:** UI animation implementation sprint.

---

### Pitfall 12: FastAPI SSE Streaming Requires Careful CORS and Timeout Config

**What goes wrong:** Server-Sent Events (SSE) streaming from FastAPI to the browser frontend requires specific CORS headers (standard `CORSMiddleware` may need `expose_headers` configured). Infrastructure proxies (Railway's ingress) may apply idle timeouts that kill long-running SSE connections mid-stream, and the client receives a truncated response without an error.

**Prevention:**
- Send a heartbeat comment (`: keepalive\n\n`) every 15 seconds on all SSE streams to prevent proxy timeout.
- Configure Railway with appropriate timeout settings; test with a response that takes 10+ seconds to fully stream.
- Use `StreamingResponse` with `media_type="text/event-stream"` and explicitly set `Cache-Control: no-cache`.
- Validate CORS headers include `Content-Type` and `X-Accel-Buffering: no` (prevents Nginx buffering).

**Phase:** Backend API / streaming implementation sprint.

---

### Pitfall 13: Google Calendar OAuth Scope Blocks Non-Interactive Token Refresh

**What goes wrong:** Google Calendar API requires OAuth 2.0. In a single-user, no-auth app on Railway, the OAuth token must be pre-authorized and stored. Access tokens expire in 1 hour; refresh tokens require a client secret and a refresh flow. Storing a refresh token in a Railway environment variable is fine, but the initial authorization flow requires a redirect — which cannot happen in a headless Docker container.

**Prevention:**
- Run the OAuth authorization flow locally once, capture the refresh token, and store it in Railway environment variables.
- Use Google's `google-auth-oauthlib` offline flow to generate a long-lived refresh token that auto-refreshes.
- Never bake tokens into the Docker image; always use `GOOGLE_REFRESH_TOKEN` as an env var.
- Test token refresh explicitly (simulate expiry) before shipping.

**Phase:** Calendar mode implementation sprint.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| PWA / manifest setup | PWA standalone mode breaks SpeechRecognition | Test on real iPad immediately; design for Safari browser tab as primary mode |
| Voice input (STT) | Silent failure in standalone mode + unreliable silence detection on iOS | Implement standalone detection guard + timer-based silence heuristic |
| Voice output (TTS) | Empty voice list, cancel-triggers-onerror, background suspension | Polling voice retry + cancel guard + visibility watchdog |
| Audio context init | Context permanently suspended on load | Unlock AudioContext on first user tap, maintain singleton |
| Claude API integration | Full JSON buffering kills streaming latency | Partial JSON streaming or two-phase (mode + response) architecture |
| Animations + voice | RAF throttling and main thread contention on iPad | GPU-composited CSS animations; profile on real device |
| MongoDB setup | Motor is deprecated; use PyMongo Async | Switch dependency before first DB code |
| Railway deployment | Container sleep adds cold-start latency | Health-check ping on app load; always-on plan |
| Calendar mode | OAuth token refresh cannot be done interactively | Pre-authorize offline; store refresh token in env |
| Fullscreen UX | Status bar always visible on iPadOS | Use `black-translucent` status bar style + safe area insets |

---

## Sources

- WebKit Bug #225298 — Speech recognition service not available: https://bugs.webkit.org/show_bug.cgi?id=225298
- WebKit Documentation Issue #120 — Unclear interimResults implementation: https://github.com/WebKit/Documentation/issues/120
- "Taming the Web Speech API" (Andrea Giammarchi, Medium): https://webreflection.medium.com/taming-the-web-speech-api-ef64f5a245e1
- Apple Developer Forums — SpeechRecognition issues Safari v17.1: https://discussions.apple.com/thread/255492924
- Apple Developer Forums — Web Speech Synthesis API voices: https://developer.apple.com/forums/thread/723503
- Apple Developer Forums — TTS not working iOS Safari: https://developer.apple.com/forums/thread/49875
- WebKit Bug #237878 — AudioContext suspended when backgrounded: https://bugs.webkit.org/show_bug.cgi?id=237878
- "PWA iOS Limitations and Safari Support" (MagicBell, 2026): https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide
- "PWA on iOS - Current Status & Limitations" (Brainhub, 2025): https://brainhub.eu/library/pwa-on-ios
- Motor deprecation announcement (MongoDB Docs): https://www.mongodb.com/docs/drivers/motor/
- Railway — Is Railway serverless?: https://help.railway.com/questions/is-railway-serverless-does-mongo-db-con-d395f017
- Claude API — Streaming Messages: https://platform.claude.com/docs/en/build-with-claude/streaming
- Claude API — Structured Outputs: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- LiveKit — Reducing latency in voice agents: https://kb.livekit.io/articles/4490830410-how-can-i-reduce-latency-in-voice-pipeline-agents-using-stt-tts-and-llm
- "The State of Speech Synthesis in Safari" (WebOutLoud): https://weboutloud.io/bulletin/speech_synthesis_in_safari/
- Framer Motion iOS performance issues: https://www.framer.community/c/support/really-slow-motion-in-ios
- FastAPI SSE guide: https://fastapi.tiangolo.com/tutorial/server-sent-events/

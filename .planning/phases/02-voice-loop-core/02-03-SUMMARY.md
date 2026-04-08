---
phase: 02-voice-loop-core
plan: "03"
subsystem: frontend-state-api
tags: [zustand, typescript, api-client, voice-fsm, websocket]
dependency_graph:
  requires: ["02-01"]
  provides: ["useAssistantStore", "chatWithJarvis", "createTranscribeWS"]
  affects: ["02-04", "02-05"]
tech_stack:
  added: []
  patterns:
    - "crypto.randomUUID() for session IDs (no uuid package)"
    - "Zustand FSM with single AssistantState enum (no boolean flags)"
    - "WebSocket protocol detection: wss:// in production, ws:// in dev"
key_files:
  created: []
  modified:
    - frontend/src/store/assistantStore.ts
    - frontend/src/api/client.ts
decisions:
  - "Used crypto.randomUUID() instead of uuid npm package — available in Safari iOS 14.5+, zero extra dependency"
  - "Kept state field name (not voiceState) for backward compat with App.tsx and OrbAnimation.tsx per plan instruction"
metrics:
  duration: "1m 20s"
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_modified: 2
---

# Phase 02 Plan 03: Store + API Interface Contracts Summary

## One-liner

Extended Zustand store with voice FSM (single enum, no boolean flags), conversation history (last 20), session ID, and mode data; API client with chatWithJarvis() and createTranscribeWS() WebSocket factory.

## What Was Built

Two shared interface contracts that all hooks (plan 02-04) and components (plan 02-05) depend on:

**assistantStore.ts** — Extended Zustand store with:
- `state: AssistantState` — single enum source of truth (idle/listening/thinking/speaking), no boolean flags
- `conversationHistory: HistoryMessage[]` — capped at last 20 messages per D-21
- `sessionId: string` — generated via `crypto.randomUUID()` per D-23
- `modeData: Record<string, unknown> | null` — for weather/prayer/search data from Claude envelope
- `currentTranscript: string` — Deepgram live transcript field
- Exported types: `AssistantState`, `AssistantMode`, `JarvisEnvelope`, `HistoryMessage`

**api/client.ts** — Extended API client with:
- `chatWithJarvis(request: ChatRequest): Promise<ChatResponse>` — POST /api/chat
- `createTranscribeWS(onTranscript, onClose): WebSocket` — opens /api/ws/transcribe
- `ChatRequest`, `ChatResponse`, `TranscriptMessage` interfaces matching backend shapes
- Auto-detects `wss://` in production (Railway TLS) vs `ws://` in local dev

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Extend assistantStore with voice FSM | 596cf05 | frontend/src/store/assistantStore.ts |
| Task 2: Extend api/client.ts with chat + WebSocket | 34cf388 | frontend/src/api/client.ts |

## Deviations from Plan

### Auto-fixed Issues

None.

### Notes

- Plan explicitly recommended `crypto.randomUUID()` over the `uuid` package. Confirmed `uuid` was not in package.json. Used `crypto.randomUUID()` as recommended — documented as deviation type "preferred alternative" in plan guidance itself.

## Known Stubs

None — both files are fully wired interface contracts. No placeholder data. `chatWithJarvis()` and `createTranscribeWS()` are real implementations (not TODOs), and the store fields are all properly initialized.

## Self-Check: PASSED

Files exist:
- frontend/src/store/assistantStore.ts: FOUND
- frontend/src/api/client.ts: FOUND

Commits exist:
- 596cf05: FOUND (feat(02-03): extend assistantStore with voice FSM and conversation history)
- 34cf388: FOUND (feat(02-03): extend api/client.ts with chatWithJarvis and createTranscribeWS)

TypeScript compiles clean: npx tsc --noEmit exits 0.

# Phase 6: Extended Modes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 06-extended-modes
**Areas discussed:** Google Calendar OAuth, Search results layout, Morning Briefing trigger, Briefing content composition
**Mode:** --auto (all decisions auto-selected with recommended defaults)

---

## Google Calendar OAuth Flow

| Option | Description | Selected |
|--------|-------------|----------|
| User OAuth2 with offline refresh token in MongoDB | Standard OAuth2 flow, token stored in DB | auto |
| Service account with domain-wide delegation | Server-to-server auth | |
| Pre-configured token via env var | Manual token management | |

**User's choice:** [auto] User OAuth2 with offline refresh token in MongoDB (recommended default)
**Notes:** Personal calendar requires user consent. Service account won't work for personal Gmail calendar. One-time setup via `/api/auth/google`, then refresh token handles everything automatically.

---

## Search Results Visual Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Stacked glassmorphism cards from bottom | Max 3 cards, staggered animation, read-only | auto |
| Horizontal carousel | Swipeable cards | |
| Full-page list | Traditional search results | |

**User's choice:** [auto] Stacked glassmorphism cards from bottom (recommended default)
**Notes:** Per requirements SRCH-01/02/03. Cards are read-only — no tap-to-open (PWA limitation). JARVIS reads the answer via TTS.

---

## Morning Briefing Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| setInterval + visual prompt | Check every 60s, show tap prompt at 7 AM | auto |
| Push notification | Service worker notification | |
| Manual only | No auto-trigger | |

**User's choice:** [auto] setInterval + visual prompt (recommended default)
**Notes:** iOS Safari PWA has no reliable push notification support. setInterval with gesture prompt respects iOS AudioContext policy. localStorage tracks lastBriefingDate to prevent repeat triggers.

---

## Briefing Content Composition

| Option | Description | Selected |
|--------|-------------|----------|
| Weather + Calendar + Claude summary + quote | All data fetched server-side, Claude composes | auto |
| Weather + Claude only | No calendar integration in briefing | |
| Simple weather display | No AI composition | |

**User's choice:** [auto] Weather + Calendar + Claude summary + quote (recommended default)
**Notes:** Per BRIEF-01 through BRIEF-05. Two Claude calls: one for intent detection, one for briefing composition with weather + events data.

---

## Claude's Discretion

- Search card animation timing, Calendar layout details, Briefing layout proportions, Quote generation

## Deferred Ideas

None

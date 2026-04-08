# Phase 1: Foundation - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the project scaffold, deployment pipeline, and database connection — everything needed to ship code to the target iPad and confirm it works as a fullscreen PWA. No voice features, no AI integration, no visual modes beyond a placeholder landing screen.

</domain>

<decisions>
## Implementation Decisions

### PWA Scaffold
- **D-01:** Initial landing screen shows a centered JARVIS orb animation (from Thinking mode design in design.md) with a "Tap to speak" prompt. This gives immediate visual feedback and validates the design system early.
- **D-02:** Component structure follows task.md file structure: `modes/` directory with one file per mode, shared `hooks/` and `components/` directories, `api.js` for backend calls.
- **D-03:** Use Inter + Space Grotesk fonts as specified in design.md. Load via Google Fonts or self-host.
- **D-04:** Tailwind CSS v4 for styling with glassmorphism utilities. Dark theme (#0e0e0e background) from design system.
- **D-05:** Zustand for state management from the start, even though Phase 1 has minimal state.

### Deploy Pipeline
- **D-06:** Railway auto-deploy from main branch — push to main triggers build and deploy.
- **D-07:** Environment variables managed via Railway dashboard for production, local `.env` file for development.
- **D-08:** Multi-stage Dockerfile as specified in task.md: Node stage builds React, Python stage runs FastAPI + serves static files.

### MongoDB Schema
- **D-09:** Flexible schema — create collections on first write, no upfront schema validation. Collections: `conversations`, `events`, `settings`.
- **D-10:** PyMongo Async (`AsyncMongoClient`) — not Motor (deprecated). Connection initialized in FastAPI lifespan handler.
- **D-11:** Health check endpoint (`GET /api/health`) that verifies MongoDB connectivity.

### Dev Workflow
- **D-12:** Local development: Vite dev server (port 5173) + uvicorn (port 8080) running concurrently. Vite config proxies `/api/*` requests to the FastAPI backend.
- **D-13:** `.env` file at project root with all API keys. Added to `.gitignore`.
- **D-14:** `npm run dev` for frontend, `uvicorn main:app --reload` for backend.

### Claude's Discretion
- Exact Tailwind config and custom theme token mapping
- Service worker caching strategy (can be minimal for v1)
- Exact PWA manifest icon sizes and splash screens
- FastAPI project structure (single `main.py` vs routers/ from the start)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `design.md` — Full design system: colors, typography, surface hierarchy, glassmorphism rules, component specs, animation easing, per-mode UI details, and Stitch screen IDs
- `CLAUDE.md` §Design Compliance — Mandatory design verification checklist (6 rules)

### Project Specification
- `task.md` — Original project spec: file structure, Dockerfile, environment variables, implementation notes
- `.planning/PROJECT.md` — Project context, constraints, key decisions
- `.planning/REQUIREMENTS.md` — v1 requirements mapped to phases (Phase 1: PWA-01–04, API-01–02, DB-01–03, DEPLOY-01–04)

### Research
- `.planning/research/STACK.md` — Validated tech stack with versions (React 19.x, Vite 6.x, FastAPI 0.135.3, PyMongo Async 4.10.x, motion 12.x, Zustand 5.x, Tailwind 4.x)
- `.planning/research/ARCHITECTURE.md` — Component boundaries, data flow, build order
- `.planning/research/PITFALLS.md` — Safari PWA gotchas, AudioContext user gesture requirement

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None yet — Phase 1 establishes the foundational patterns

### Integration Points
- FastAPI `StaticFiles` mount serves the Vite build output from `static/` directory
- Vite proxy config connects frontend dev server to backend API
- MongoDB connection via FastAPI lifespan context manager

</code_context>

<specifics>
## Specific Ideas

- The placeholder landing screen should use the "AI Pulse" orb from design.md §Components — multi-layered orb with `primary-container` and `secondary-container` colors, Gaussian blur (40-80px), breathing opacity animation (40-100%)
- iPad must feel like a dedicated device — no scrollbars, no bounce, no pinch-to-zoom
- `apple-mobile-web-app-status-bar-style` set to `black-translucent` for true edge-to-edge

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-08*

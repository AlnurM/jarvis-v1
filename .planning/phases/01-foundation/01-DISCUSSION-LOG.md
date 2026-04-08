# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 1-Foundation
**Areas discussed:** PWA scaffold, Deploy pipeline, MongoDB schema, Dev workflow
**Mode:** Auto (--auto flag, all recommended defaults selected)

---

## PWA Scaffold

| Option | Description | Selected |
|--------|-------------|----------|
| Centered orb + "Tap to speak" | Matches Thinking mode design, validates design system early | ✓ |
| Blank dark screen | Minimal, but no visual validation | |
| Full mode switcher skeleton | Premature — modes don't exist yet | |

**User's choice:** [auto] Centered JARVIS orb animation with "Tap to speak" prompt (recommended default)
**Notes:** Validates the design system tokens and glassmorphism from Phase 1. Provides immediate visual feedback on iPad.

| Option | Description | Selected |
|--------|-------------|----------|
| Mode-per-file (modes/ directory) | Matches task.md spec exactly | ✓ |
| Single App component | Too monolithic for 8 modes | |

**User's choice:** [auto] Mode-per-file in modes/ directory (recommended default)
**Notes:** Follows the file structure specified in task.md.

---

## Deploy Pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| Railway auto-deploy from main | Simplest for single developer | ✓ |
| Manual deploy via Railway CLI | More control, more friction | |
| GitHub Actions CI/CD | Overkill for solo project | |

**User's choice:** [auto] Railway auto-deploy from main branch (recommended default)
**Notes:** Single developer workflow — push to main = deploy.

| Option | Description | Selected |
|--------|-------------|----------|
| Railway dashboard + local .env | Standard separation of concerns | ✓ |
| Shared .env.example | Adds sync burden for single dev | |

**User's choice:** [auto] Railway dashboard for prod, local .env for dev (recommended default)

---

## MongoDB Schema

| Option | Description | Selected |
|--------|-------------|----------|
| Flexible schema, collections on first write | MongoDB's strength, validation later | ✓ |
| Upfront JSON schema validation | Premature for v1 | |
| Mongoose-style ODM | Wrong ecosystem (Python backend) | |

**User's choice:** [auto] Flexible schema (recommended default)

---

## Dev Workflow

| Option | Description | Selected |
|--------|-------------|----------|
| Vite (5173) + uvicorn (8080) concurrent | Standard pattern, Vite proxies API calls | ✓ |
| Docker Compose for local dev | Heavier, slower iteration | |
| Single process (FastAPI serves Vite) | No HMR, slow dev experience | |

**User's choice:** [auto] Vite dev server + uvicorn concurrent with proxy (recommended default)

---

## Claude's Discretion

- Tailwind config and custom theme token mapping
- Service worker caching strategy
- PWA manifest icon sizes and splash screens
- FastAPI project structure (single main.py vs routers/)

## Deferred Ideas

None — discussion stayed within phase scope

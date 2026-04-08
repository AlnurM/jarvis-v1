# Phase 1: Foundation - Research

**Researched:** 2026-04-08
**Domain:** React/Vite PWA + FastAPI + MongoDB + Railway Docker deployment
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Initial landing screen shows a centered JARVIS orb animation (from Thinking mode design in design.md) with a "Tap to speak" prompt. This gives immediate visual feedback and validates the design system early.
- **D-02:** Component structure follows task.md file structure: `modes/` directory with one file per mode, shared `hooks/` and `components/` directories, `api.js` for backend calls.
- **D-03:** Use Inter + Space Grotesk fonts as specified in design.md. Load via Google Fonts or self-host.
- **D-04:** Tailwind CSS v4 for styling with glassmorphism utilities. Dark theme (#0e0e0e background) from design system.
- **D-05:** Zustand for state management from the start, even though Phase 1 has minimal state.
- **D-06:** Railway auto-deploy from main branch — push to main triggers build and deploy.
- **D-07:** Environment variables managed via Railway dashboard for production, local `.env` file for development.
- **D-08:** Multi-stage Dockerfile as specified in task.md: Node stage builds React, Python stage runs FastAPI + serves static files.
- **D-09:** Flexible schema — create collections on first write, no upfront schema validation. Collections: `conversations`, `events`, `settings`.
- **D-10:** PyMongo Async (`AsyncMongoClient`) — not Motor (deprecated). Connection initialized in FastAPI lifespan handler.
- **D-11:** Health check endpoint (`GET /api/health`) that verifies MongoDB connectivity.
- **D-12:** Local development: Vite dev server (port 5173) + uvicorn (port 8080) running concurrently. Vite config proxies `/api/*` requests to the FastAPI backend.
- **D-13:** `.env` file at project root with all API keys. Added to `.gitignore`.
- **D-14:** `npm run dev` for frontend, `uvicorn main:app --reload` for backend.

### Claude's Discretion

- Exact Tailwind config and custom theme token mapping
- Service worker caching strategy (can be minimal for v1)
- Exact PWA manifest icon sizes and splash screens
- FastAPI project structure (single `main.py` vs routers/ from the start)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PWA-01 | Full-screen PWA with manifest.json and service worker | vite-plugin-pwa 1.2.0 provides zero-config Workbox integration |
| PWA-02 | apple-mobile-web-app-capable meta tag for Safari fullscreen | Standard HTML meta + status-bar-style=black-translucent for edge-to-edge |
| PWA-03 | 100vw x 100vh viewport, no scrollbars, no browser UI | CSS `overflow: hidden` + `touch-action: none` + manifest `display: standalone` |
| PWA-04 | iPad landscape optimized layout | CSS `orientation: landscape` media query; `screen-orientation` lock not available in PWA |
| API-01 | FastAPI server serving static frontend via StaticFiles | `app.mount("/", StaticFiles(directory="static", html=True))` + catch-all for SPA |
| API-02 | Backend proxies all external API calls | Phase 1 only needs health check; proxy routes are shells for Phase 2+ |
| DB-01 | MongoDB connected via PyMongo Async (not Motor) | `pymongo[srv]>=4.10` — `AsyncMongoClient` initialized in FastAPI lifespan |
| DB-02 | Collections: conversations, events, settings | Created on first write — no migration step needed |
| DB-03 | Collections initialized on startup | `await db.list_collection_names()` in lifespan to verify connection |
| DEPLOY-01 | Multi-stage Dockerfile (Node build + Python runtime) | node:20-slim build stage + python:3.12-slim runtime stage |
| DEPLOY-02 | Railway deployment with all config via environment variables | Railway auto-injects PORT; MONGO_URL from MongoDB plugin |
| DEPLOY-03 | MONGO_URL from Railway MongoDB plugin | `AsyncMongoClient(os.environ["MONGO_URL"])` — Railway injects automatically |
| DEPLOY-04 | No hardcoded API keys or secrets | `pydantic-settings` loads all config from env; `.env` file gitignored |
</phase_requirements>

---

## Summary

Phase 1 is a greenfield scaffold build. The goal is a deployable monolith: a multi-stage Docker image that builds a React/Vite PWA frontend and serves it via FastAPI, with MongoDB connected and verified. The iPad-facing result is a fullscreen PWA landing screen showing the JARVIS orb animation.

The stack is fully locked (see User Constraints). All key technology choices have been validated in prior research (`.planning/research/STACK.md`). The primary planning risk is sequencing: certain steps have hard dependencies (Vite build output must exist before FastAPI can serve it; MongoDB must be reachable before health check passes; Dockerfile must work before Railway deploy can succeed). Getting the sequencing right in the plan is more important than any individual step.

The second risk is Safari/iPadOS PWA behavior. Phase 1 must lay the PWA foundation correctly from the start — `meta` tags, manifest, service worker, and viewport rules — because retrofitting these after the fact causes subtle bugs. The design system also must be wired in Phase 1 (Tailwind tokens, fonts), since every later phase builds on top of it.

**Primary recommendation:** Build in strict bottom-up order: repo structure → backend scaffold → frontend scaffold → Tailwind/fonts/design tokens → PWA manifest/service worker → Dockerfile → Railway deploy → iPad smoke test.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.4 | UI framework | Stable, hooks-mature; required by motion and ecosystem libs |
| Vite | 8.0.7 | Build tool + dev server | Native ESM, fastest HMR, excellent PWA plugin ecosystem |
| TypeScript | 5.x | Type safety | Catches state/audio bugs early; all later phases will thank us |
| vite-plugin-pwa | 1.2.0 | PWA manifest + service worker | Zero-config Workbox integration; standard for Vite-based PWAs |
| motion | 12.38.0 | Animations | Package renamed from `framer-motion`; same API, actively maintained |
| TailwindCSS | 4.2.2 | Utility styling | v4 first-class `backdrop-blur` support for glassmorphism |
| @tailwindcss/vite | 4.2.2 | Tailwind v4 Vite integration | Required for Tailwind v4 (replaces PostCSS plugin) |
| Zustand | 5.0.12 | State management | ~1KB, no Provider wrapper, hook-native; set up in Phase 1 even though minimal state exists now |
| FastAPI | 0.135.3 | Backend API + static file serving | Async-native, serves Vite build via StaticFiles |
| Uvicorn | 0.44.0 | ASGI server | Standard for FastAPI; use `--workers 1` in single-container Railway |
| pydantic-settings | 2.13.1 | Config from environment | Loads `.env` locally, Railway env vars in prod; no hardcoded values |
| pymongo[srv] | 4.16.0 | Async MongoDB driver | `AsyncMongoClient` replaces deprecated Motor; true asyncio |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Python | 3.12 | Runtime | 3.14.x is installed locally but 3.12 is specified for Docker; use `python:3.12-slim` in Dockerfile |
| node | 20 | Docker build stage | `node:20-slim` for React build stage in Dockerfile |
| httpx | latest | Async HTTP client | Phase 1: not yet needed; wire up in lifespan for Phase 2 readiness |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PyMongo Async | Motor | Motor EOL May 2026 — never use for new projects |
| motion | framer-motion | framer-motion no longer maintained; motion is the canonical rename |
| @tailwindcss/vite | tailwindcss PostCSS plugin | v4 dropped PostCSS-first in favor of Vite plugin; use the Vite plugin |
| pydantic-settings | python-dotenv | pydantic-settings validates types; simpler and safer |

**Installation:**

```bash
# Frontend
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install motion zustand
npm install -D vite-plugin-pwa
npm install tailwindcss @tailwindcss/vite

# Backend
pip install fastapi==0.135.3 "uvicorn[standard]" pydantic-settings "pymongo[srv]>=4.10" httpx
```

**Version verification (confirmed 2026-04-08 against npm and pip registries):**
- React: 19.2.4 (npm)
- Vite: 8.0.7 (npm)
- vite-plugin-pwa: 1.2.0 (npm)
- motion: 12.38.0 (npm)
- TailwindCSS: 4.2.2 (npm)
- Zustand: 5.0.12 (npm)
- FastAPI: 0.135.3 (pip, latest)
- Uvicorn: 0.44.0 (pip, latest)
- PyMongo: 4.16.0 (pip, latest)
- pydantic-settings: 2.13.1 (pip, latest)

---

## Architecture Patterns

### Recommended Project Structure

```
jarvis-v1/
├── Dockerfile                          # Multi-stage: node:20-slim build + python:3.12-slim runtime
├── .env                                # Local dev secrets — gitignored
├── .gitignore
├── frontend/
│   ├── index.html                      # PWA meta tags live here
│   ├── vite.config.ts                  # Vite + PWA plugin + /api proxy
│   ├── package.json
│   ├── tsconfig.json
│   ├── public/
│   │   ├── manifest.json               # OR generated by vite-plugin-pwa
│   │   └── icons/                      # PWA icons (192x192, 512x512 minimum)
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                     # Root: PWA orientation, viewport enforcement
│       ├── store/
│       │   └── assistantStore.ts       # Zustand store — set up now, expanded Phase 2
│       ├── components/
│       │   └── OrbAnimation.tsx        # "AI Pulse" orb — the Phase 1 landing screen
│       ├── modes/                      # One file per mode (Phase 2+ fills these out)
│       │   └── ThinkingMode.tsx        # Placeholder — orb lives here
│       ├── api/
│       │   └── client.ts              # fetch wrappers for /api/* routes
│       └── index.css                   # Tailwind v4 @import + CSS custom properties
├── backend/
│   ├── main.py                         # FastAPI app, lifespan, static mount, health route
│   ├── config.py                       # pydantic-settings Settings model
│   ├── db.py                           # AsyncMongoClient init + collection helpers
│   └── requirements.txt
```

**Note on task.md vs ARCHITECTURE.md structure:** task.md shows a flat structure (`main.py`, `db.py`, `routers/` at root). The locked decisions don't specify a subdirectory; follow task.md for the backend layout since it's the canonical spec.

### Pattern 1: FastAPI Lifespan for Stateful Resources

**What:** Initialize MongoDB client and httpx client once at startup, tear down at shutdown. Never create per-request clients.

**When to use:** Always. Required for connection pooling.

```python
# backend/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pymongo import AsyncMongoClient
import httpx
from config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.mongo = AsyncMongoClient(settings.MONGO_URL)
    app.state.db = app.state.mongo[settings.MONGODB_DB]
    app.state.http_client = httpx.AsyncClient(timeout=10.0)
    # Verify MongoDB connectivity
    await app.state.db.list_collection_names()
    yield
    # Shutdown
    app.state.mongo.close()
    await app.state.http_client.aclose()

app = FastAPI(lifespan=lifespan)

@app.get("/api/health")
async def health(request: Request):
    try:
        await request.app.state.db.list_collection_names()
        return {"status": "ok", "mongo": "connected"}
    except Exception as e:
        return {"status": "error", "mongo": str(e)}

# Serve React SPA — must come AFTER all /api routes
app.mount("/", StaticFiles(directory="static", html=True), name="static")
```

### Pattern 2: Tailwind v4 Setup with Design Tokens

**What:** Tailwind v4 uses CSS-first configuration. Design tokens from design.md are declared as CSS custom properties, then referenced as Tailwind utilities.

**When to use:** Phase 1 sets this up; all later phases consume it.

```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'JARVIS',
        short_name: 'JARVIS',
        display: 'standalone',
        background_color: '#0e0e0e',
        theme_color: '#0e0e0e',
        orientation: 'landscape',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
```

```css
/* frontend/src/index.css — Tailwind v4 with design tokens */
@import "tailwindcss";

@theme {
  --color-background: #0e0e0e;
  --color-surface-low: #131313;
  --color-surface-high: #201f1f;
  --color-primary: #85adff;
  --color-secondary: #ad89ff;
  --color-on-surface: #e6e1e5;
  --color-on-surface-variant: #adaaaa;
  --font-display: Inter, sans-serif;
  --font-label: "Space Grotesk", sans-serif;
  --ease-glass: cubic-bezier(0.22, 1, 0.36, 1);
}
```

### Pattern 3: Vite Proxy for Local Dev

**What:** Vite dev server proxies `/api/*` to the uvicorn backend. In production, FastAPI serves everything from the same origin — no proxy needed.

**When to use:** Local development only. Production is same-origin.

### Pattern 4: PWA Meta Tags in index.html

**What:** Apple-specific meta tags must be in `index.html` for Safari to honor fullscreen mode. `vite-plugin-pwa` handles `manifest.json` and service worker injection but does NOT inject these tags — they must be added manually.

```html
<!-- frontend/index.html -->
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />

  <!-- Apple PWA fullscreen -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="JARVIS" />

  <!-- Prevent bounce scroll and text resize on iOS -->
  <style>
    html, body { 
      overscroll-behavior: none;
      -webkit-text-size-adjust: 100%;
    }
  </style>

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet" />

  <title>JARVIS</title>
</head>
```

### Pattern 5: Multi-Stage Dockerfile

**What:** Node stage compiles Vite; Python stage runs FastAPI with the built static output. Based on task.md canonical spec with adjustments for env variable injection.

```dockerfile
# Stage 1 — Build React frontend
FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2 — Run FastAPI backend
FROM python:3.12-slim
WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY --from=frontend /app/frontend/dist ./static

EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

**Railway CMD note:** Railway injects `$PORT` as an environment variable. The Dockerfile CMD must either hardcode `8080` (matching the task.md spec) or use a shell-form CMD to expand the variable: `CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}`. Hardcoding 8080 and ensuring Railway's PORT is also 8080 is simpler.

### Pattern 6: pydantic-settings Config

```python
# backend/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGO_URL: str
    MONGODB_DB: str = "jarvis"
    PORT: int = 8080
    CLAUDE_API_KEY: str = ""
    OPENWEATHER_API_KEY: str = ""
    BRAVE_SEARCH_API_KEY: str = ""
    LATITUDE: float = 43.2220
    LONGITUDE: float = 76.8512

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
```

### Pattern 7: "AI Pulse" Orb (Phase 1 Landing Screen)

The orb is specified in design.md §5 "The AI Pulse" component. It is the landing screen for Phase 1 per D-01.

```tsx
// frontend/src/components/OrbAnimation.tsx
import { motion } from 'motion/react'

export function OrbAnimation() {
  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Outer glow layer */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 240,
          height: 240,
          background: 'radial-gradient(circle, var(--color-secondary) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Inner core layer */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 160,
          height: 160,
          background: 'radial-gradient(circle, var(--color-primary) 0%, var(--color-secondary) 100%)',
          filter: 'blur(40px)',
        }}
        animate={{ opacity: [0.6, 1, 0.6], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **StaticFiles before /api routes:** Mounting `StaticFiles` at "/" before defining `/api/*` routes causes the static mount to swallow all API requests. Always define API routes first, mount StaticFiles last.
- **Motor as MongoDB driver:** `from motor.motor_asyncio import AsyncIOMotorClient` — do not use. Motor is deprecated (EOL May 2026). Use `from pymongo import AsyncMongoClient`.
- **framer-motion import:** Import from `motion/react`, not `framer-motion`. The `framer-motion` package is no longer maintained.
- **Hardcoded PORT in CMD:** Railway injects `$PORT`. Use `${PORT:-8080}` or hardcode 8080 and set PORT=8080 in Railway.
- **1px borders in UI:** design.md explicitly prohibits 1px borders. Use background shifts, `backdrop-blur`, or `outline-variant` at 15% opacity for separation.
- **Pure white text:** Never use `#FFFFFF` for body text. Use `on-surface-variant` (`#adaaaa`).
- **Standard easing:** Use `cubic-bezier(0.22, 1, 0.36, 1)` not `ease-in-out` or `400ms` default.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PWA manifest + service worker | Manual `manifest.json` + custom SW | `vite-plugin-pwa` | Handles Workbox precaching, update lifecycle, Safari quirks automatically |
| Environment config loading | Manual `os.getenv()` with defaults | `pydantic-settings` | Type validation, `.env` support, clear errors on missing required vars |
| Async MongoDB client | Motor or custom thread-pool wrapper | `pymongo[srv]` AsyncMongoClient | Motor is deprecated; PyMongo 4.10+ is the official async path |
| CSS glassmorphism utilities | Custom CSS classes | Tailwind v4 `backdrop-blur-*` | v4 native support; no custom CSS needed for 90% of glass effects |
| Vite API proxy | CORS configuration or separate nginx | Vite `server.proxy` | Same-origin in prod (FastAPI serves frontend); proxy only needed in dev |

**Key insight:** This phase's "don't hand-roll" items are mostly about not solving already-solved problems: PWA tooling (vite-plugin-pwa), config management (pydantic-settings), and async database connectivity (PyMongo Async). Each has a well-maintained solution that handles the edge cases.

---

## Common Pitfalls

### Pitfall 1: StaticFiles Swallows API Routes

**What goes wrong:** `app.mount("/", StaticFiles(...))` mounted before `/api/*` routes causes FastAPI to route all requests — including `/api/health` — to the static file handler. The API becomes unreachable.

**Why it happens:** FastAPI processes mounts in registration order. A root mount at "/" matches everything.

**How to avoid:** Register ALL `@app.get`, `@app.post`, router `include_router` calls before the `app.mount("/", ...)` line. The static mount must always be the last line.

**Warning signs:** `curl http://localhost:8080/api/health` returns an HTML file instead of JSON.

### Pitfall 2: Safari PWA Fullscreen Limitations

**What goes wrong:** The status bar (time + battery) is always visible on iPadOS standalone PWA. `display: fullscreen` in manifest.json is silently downgraded to `standalone`. The `requestFullscreen()` API is not available in Safari iOS.

**Why it happens:** Apple enforces a minimum visible chrome for user orientation. The Fullscreen API is not exposed in Safari iOS.

**How to avoid:** Use `apple-mobile-web-app-status-bar-style: black-translucent` so the status bar overlays rather than pushes content down. Use `env(safe-area-inset-top)` for top padding on any fixed elements. Design backgrounds to extend behind the status bar visually.

**Warning signs:** White or gray bar at top when launched from home screen; content pushed down by ~20-44px.

### Pitfall 3: PyMongo AsyncMongoClient is Not Thread-Safe

**What goes wrong:** `AsyncMongoClient` must be used from a single asyncio event loop. Creating it outside the lifespan context (e.g., as a module-level global initialized at import time) can cause issues if the event loop changes.

**Why it happens:** PyMongo's async client is a true asyncio client, not thread-safe like the sync client.

**How to avoid:** Initialize `AsyncMongoClient` inside the FastAPI `lifespan` context manager, attach to `app.state`. Pass via `request.app.state.db` to route handlers.

**Warning signs:** `RuntimeError: Task attached to a different event loop` or intermittent connection failures.

### Pitfall 4: Tailwind v4 CSS-First Config — No tailwind.config.js

**What goes wrong:** Developers create `tailwind.config.js` expecting v3 behavior. In Tailwind v4, configuration has moved to CSS (`@theme` block in the stylesheet). A `tailwind.config.js` file is either ignored or causes unexpected behavior.

**Why it happens:** Tailwind v4 made a breaking change: configuration is CSS-first.

**How to avoid:** Put all theme customization in `index.css` under `@theme { ... }`. Use `@tailwindcss/vite` as the Vite plugin (not `@tailwindcss/postcss`). Do not create `tailwind.config.js`.

**Warning signs:** Custom colors not appearing; build warnings about config file being ignored.

### Pitfall 5: Railway Cold Start (App Sleeping)

**What goes wrong:** Railway's lower-tier plans enable "App Sleeping" — the container suspends after inactivity. The first request after sleep takes 5-10 seconds. For a voice assistant, this destroys the first-use experience.

**Why it happens:** Railway resource optimization on lower plans.

**How to avoid:** Use Railway's "Never Sleep" or upgrade to a plan that keeps the service always-on. As a defense-in-depth measure, have the frontend ping `/api/health` on app load to wake the container before the user speaks. Show a "Connecting..." indicator until health check passes.

**Warning signs:** First request each day is 5-10x slower than subsequent requests.

### Pitfall 6: vite-plugin-pwa Does NOT Inject Apple Meta Tags

**What goes wrong:** Developers assume `vite-plugin-pwa` handles all PWA setup including iOS meta tags. The plugin generates `manifest.json` and the service worker, but `apple-mobile-web-app-capable` and `apple-mobile-web-app-status-bar-style` must be manually added to `index.html`.

**Why it happens:** These are Apple-proprietary tags not part of the PWA standard; the plugin follows the W3C spec.

**How to avoid:** Manually add all `apple-mobile-web-app-*` meta tags to `frontend/index.html`. Check with Safari's "Add to Home Screen" flow on a real iPad before declaring Phase 1 complete.

**Warning signs:** App launches in Safari browser view with URL bar visible instead of standalone fullscreen.

### Pitfall 7: viewport-fit=cover Required for Edge-to-Edge

**What goes wrong:** Without `viewport-fit=cover` in the viewport meta tag, the app content is inset from the screen edges on devices with rounded corners or notches. The `env(safe-area-inset-*)` CSS variables also return 0 without this.

**Why it happens:** Opt-in behavior — Apple requires explicit permission to extend content into safe areas.

**How to avoid:** Use `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`.

---

## Code Examples

### FastAPI Health Check with MongoDB Verification

```python
# backend/main.py (Source: official FastAPI docs + PyMongo AsyncMongoClient docs)
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pymongo import AsyncMongoClient
import httpx
from config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.mongo = AsyncMongoClient(settings.MONGO_URL)
    app.state.db = app.state.mongo[settings.MONGODB_DB]
    app.state.http_client = httpx.AsyncClient(timeout=10.0)
    # Initialize collections (creates if not exist)
    await app.state.db["conversations"].find_one({})
    await app.state.db["events"].find_one({})
    await app.state.db["settings"].find_one({})
    yield
    app.state.mongo.close()
    await app.state.http_client.aclose()

app = FastAPI(lifespan=lifespan)

@app.get("/api/health")
async def health(request: Request):
    try:
        await request.app.state.db.list_collection_names()
        return {"status": "ok", "mongo": "connected"}
    except Exception as e:
        return {"status": "error", "mongo": str(e)}, 503

# MUST be last — after all /api/* routes
app.mount("/", StaticFiles(directory="static", html=True), name="static")
```

### Zustand Store Scaffold (Phase 1 Minimal Setup)

```typescript
// frontend/src/store/assistantStore.ts
import { create } from 'zustand'

type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking'
type AssistantMode = 'chat' | 'weather' | 'prayer' | 'search' | 'calendar' | 'briefing'

interface AssistantStore {
  state: AssistantState
  mode: AssistantMode
  transcript: string
  response: string
  setState: (s: AssistantState) => void
  setMode: (m: AssistantMode) => void
  setTranscript: (t: string) => void
  setResponse: (r: string) => void
}

export const useAssistantStore = create<AssistantStore>((set) => ({
  state: 'idle',
  mode: 'chat',
  transcript: '',
  response: '',
  setState: (s) => set({ state: s }),
  setMode: (m) => set({ mode: m }),
  setTranscript: (t) => set({ transcript: t }),
  setResponse: (r) => set({ response: r }),
}))
```

### Prevent iOS Scroll Bounce and Overscroll

```css
/* frontend/src/index.css */
html, body, #root {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  overscroll-behavior: none;
  -webkit-overflow-scrolling: auto;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
```

### App.tsx Root Layout

```tsx
// frontend/src/App.tsx
import { useEffect } from 'react'
import { OrbAnimation } from './components/OrbAnimation'

function App() {
  // Prevent context menu and double-tap zoom on iPad
  useEffect(() => {
    document.addEventListener('contextmenu', (e) => e.preventDefault())
  }, [])

  return (
    <div
      className="w-screen h-screen overflow-hidden flex flex-col items-center justify-center"
      style={{ background: 'var(--color-background)' }}
    >
      <OrbAnimation />
      <p
        className="mt-8 text-sm tracking-widest uppercase"
        style={{
          color: 'var(--color-on-surface-variant)',
          fontFamily: 'var(--font-label)',
        }}
      >
        Tap to speak
      </p>
    </div>
  )
}

export default App
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` package | `motion` package (import from `motion/react`) | 2024 | `framer-motion` is no longer maintained; same API, different package name |
| `motor` for async MongoDB | `pymongo[srv]` with `AsyncMongoClient` | May 2025 | Motor deprecated; PyMongo Async is the official replacement |
| Tailwind config via `tailwind.config.js` | Tailwind v4 CSS-first `@theme {}` in CSS | Tailwind v4.0 (2025) | Breaking change: no config file needed; theme in CSS |
| PostCSS plugin for Tailwind | `@tailwindcss/vite` Vite plugin | Tailwind v4 | v4 recommends Vite plugin over PostCSS for Vite projects |
| `vite-plugin-pwa` 0.x | `vite-plugin-pwa` 1.x | 2025 | 1.0 release aligned with Vite 6; API slightly changed |

**Deprecated/outdated (confirmed in research):**
- `motor`: EOL May 2026. Shows "deprecated" warning on install. Do not use.
- `framer-motion`: No new releases. npm points to `motion`. Do not import.
- Tailwind v3 `tailwind.config.js`: Still works in v3 but incompatible with v4.

---

## Open Questions

1. **PORT handling on Railway**
   - What we know: Railway injects `$PORT` as env var; task.md hardcodes 8080 in Dockerfile CMD
   - What's unclear: Whether Railway's port injection overrides the `EXPOSE 8080` declaration, or if PORT must match
   - Recommendation: Use shell-form CMD `uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}` and also set PORT=8080 in Railway dashboard to be explicit

2. **Font loading: Google Fonts vs self-hosted**
   - What we know: D-03 says "load via Google Fonts or self-host" — planner's discretion
   - What's unclear: Google Fonts adds an external dependency; iPad must be online anyway
   - Recommendation: Use Google Fonts for Phase 1 (simplest); self-hosting can be a Phase 5 polish item

3. **vite-plugin-pwa 1.x API changes from 0.x**
   - What we know: vite-plugin-pwa 1.2.0 is current; there was a 0.x → 1.x breaking change
   - What's unclear: Exact config property changes
   - Recommendation: Follow the 1.x migration guide at https://vite-pwa-org.netlify.app/ when writing the vite.config.ts

4. **Railway MongoDB plugin availability**
   - What we know: Railway offers a MongoDB plugin that auto-injects MONGO_URL
   - What's unclear: Whether the plugin is available on current Railway plans (Railway has been evolving its marketplace)
   - Recommendation: Plan includes a verification step to confirm MongoDB plugin is available in the Railway project before the deploy task

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend build, local dev | ✓ | 20.11.0 | — |
| npm | Package management | ✓ | 10.2.4 | — |
| Python 3 | Backend local dev | ✓ | 3.14.3 (local); 3.12 in Docker | Use Docker for production parity |
| Docker | Container build + Railway deploy | ✓ | 24.0.2 | — |
| Railway CLI | Deploy verification | ✗ | — | Use Railway dashboard web UI; CLI is optional |
| MongoDB (local) | Local dev DB | ✗ | — | Use Railway MongoDB plugin URL or local Docker: `docker run -p 27017:27017 mongo:7` |

**Missing dependencies with no fallback:**
- None that block phase execution.

**Missing dependencies with fallback:**
- Railway CLI: Not installed. Dashboard web UI covers all needed operations. Plan tasks should default to dashboard-based steps, not `railway` CLI commands.
- Local MongoDB: Not detected. Dev can either use Railway MongoDB URL directly (simplest), or run `docker run -d -p 27017:27017 mongo:7` locally. Plan should note both options.

**Python version note:** Local Python is 3.14.3; Dockerfile will use `python:3.12-slim`. Local development will work but the Dockerfile is the source of truth for runtime behavior. Where version-sensitive, test in Docker.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None yet — greenfield project, no test infrastructure exists |
| Config file | None — Wave 0 must create |
| Quick run command | `pytest backend/tests/ -x -q` (after Wave 0 setup) |
| Full suite command | `pytest backend/tests/ -v` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| API-01 | FastAPI serves static files at `/` | smoke | `curl -s http://localhost:8080/ \| grep -q "JARVIS"` | ❌ Wave 0 |
| API-02 | All `/api/*` routes return JSON, not HTML | unit | `pytest tests/test_main.py::test_api_routes_not_swallowed -x` | ❌ Wave 0 |
| DB-01 | MongoDB connects via AsyncMongoClient | unit | `pytest tests/test_db.py::test_mongo_connection -x` | ❌ Wave 0 |
| DB-03 | Collections initialized on startup | unit | `pytest tests/test_db.py::test_collections_initialized -x` | ❌ Wave 0 |
| DEPLOY-04 | No hardcoded secrets | lint | `grep -r "MONGO_URL\s*=\s*['\"]mongo" backend/` (should be empty) | ❌ Wave 0 |
| PWA-01 | manifest.json served at /manifest.webmanifest | smoke | `curl -s http://localhost:8080/manifest.webmanifest \| python3 -m json.tool` | ❌ Wave 0 |
| PWA-02 | apple-mobile-web-app-capable in HTML | smoke | `curl -s http://localhost:8080/ \| grep "apple-mobile-web-app-capable"` | ❌ Wave 0 |
| API-01 | /api/health returns `{"status":"ok"}` | unit | `pytest tests/test_main.py::test_health_endpoint -x` | ❌ Wave 0 |

**Manual-only tests:**
- PWA-03 (no scrollbars, no browser UI): requires visual inspection on iPad
- PWA-04 (landscape optimized layout): requires real iPad in landscape
- DEPLOY-01/02/03 (Railway deployment working): requires Railway deploy + browser check

### Sampling Rate

- **Per task commit:** `pytest backend/tests/ -x -q` (backend unit tests only, <10 seconds)
- **Per wave merge:** `pytest backend/tests/ -v` + manual smoke `curl` checks
- **Phase gate:** Full suite green + iPad visual verification before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `backend/tests/__init__.py` — package init
- [ ] `backend/tests/conftest.py` — pytest fixtures (TestClient, mock MongoDB)
- [ ] `backend/tests/test_main.py` — health endpoint + static file serving tests
- [ ] `backend/tests/test_db.py` — MongoDB connection + collection init tests
- [ ] Framework install: `pip install pytest pytest-asyncio httpx` — not yet in requirements.txt

---

## Project Constraints (from CLAUDE.md)

The following directives from `CLAUDE.md` are mandatory. Planner must verify all tasks comply.

1. **Design Compliance — MANDATORY before implementing any UI component:**
   - Read `design.md` and cross-reference Stitch screens before implementing
   - Design tokens must match: colors, typography (Inter + Space Grotesk), surface hierarchy, glassmorphism rules
   - No-Line Rule enforced: no 1px borders; use background shifts, luminous depth, or backdrop blur
   - Stitch screen fidelity: compare implemented UI against the Stitch screen for that mode
   - Custom easing: use `cubic-bezier(0.22, 1, 0.36, 1)` not standard 400ms easing
   - Text colors: never use pure white (#FFFFFF) for body text; use `on-surface-variant` (#adaaaa)

2. **GSD Workflow Enforcement:**
   - All file changes go through GSD commands
   - Entry points: `/gsd:quick`, `/gsd:debug`, `/gsd:execute-phase`
   - No direct repo edits outside GSD workflow unless user explicitly bypasses

3. **Tech stack constraints (locked):**
   - React + Vite frontend
   - Python FastAPI backend
   - Railway monolith with Docker
   - PyMongo Async (AsyncMongoClient) — NOT Motor
   - `motion` package — NOT `framer-motion`

---

## Sources

### Primary (HIGH confidence)

- npm registry (2026-04-08) — React 19.2.4, Vite 8.0.7, vite-plugin-pwa 1.2.0, motion 12.38.0, Zustand 5.0.12, TailwindCSS 4.2.2
- pip registry (2026-04-08) — FastAPI 0.135.3, Uvicorn 0.44.0, PyMongo 4.16.0, pydantic-settings 2.13.1
- `.planning/research/STACK.md` — validated stack with sources (react.dev, vite.dev, pypi.org/project/fastapi, etc.)
- `.planning/research/ARCHITECTURE.md` — component boundaries, FastAPI patterns, data flow
- `.planning/research/PITFALLS.md` — Safari PWA gotchas, AudioContext user gesture, Motor deprecation
- `task.md` — canonical project spec (Dockerfile, file structure, env vars)
- `design.md` — design system: tokens, typography, glassmorphism rules, "AI Pulse" component

### Secondary (MEDIUM confidence)

- FastAPI StaticFiles docs: https://fastapi.tiangolo.com/tutorial/static-files/
- PyMongo Async FastAPI integration: https://www.mongodb.com/docs/languages/python/pymongo-driver/current/integrations/fastapi-integration/
- vite-plugin-pwa: https://vite-pwa-org.netlify.app/
- Apple PWA meta tags: https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html
- Tailwind v4 CSS-first config: https://tailwindcss.com/docs/v4-upgrade

### Tertiary (LOW confidence — flag for validation)

- Railway PORT injection behavior with hardcoded Dockerfile CMD (needs live Railway test to confirm)
- vite-plugin-pwa 1.x migration changes from 0.x (exact API diff not verified)

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all versions verified against npm/pip registries on 2026-04-08
- Architecture: HIGH — confirmed against ARCHITECTURE.md and task.md canonical spec
- Pitfalls: HIGH — confirmed against PITFALLS.md which cites official WebKit and MongoDB sources
- PWA Safari behavior: HIGH — multiple sources in PITFALLS.md; well-documented WebKit limitations

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable stack; PyMongo, FastAPI, TailwindCSS release frequently — re-verify before install if delayed)

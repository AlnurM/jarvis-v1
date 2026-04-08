# JARVIS — AI Voice Assistant Web App

## Project Overview

Full-screen PWA web app for iPad (Safari, landscape). AI voice assistant with multiple visual modes. The user speaks — the app listens, thinks, and responds with voice + visual feedback.

---

## Tech Stack

**Frontend**
- React + Vite — component per mode, fast HMR in dev
- Framer Motion — animated transitions between modes
- Web Speech API — voice input (STT) + voice output (TTS)
- Canvas API — sound wave visualizations
- Full viewport: `100vw x 100vh`, no scrollbars, no browser UI
- Vite builds static dist/ → FastAPI serves it via StaticFiles

**Backend**
- Python FastAPI
- Proxies API calls (Claude, OpenWeatherMap, Aladhan, Google Search)
- Serves the static frontend via `StaticFiles`

**Database**
- MongoDB — provided by Railway MongoDB plugin (auto-injects `MONGO_URL`)
- Motor — async driver for FastAPI
- Collections: `conversations`, `events`, `settings`
- Stores: conversation history, calendar events, user preferences, prayer notification state

**Deployment**
- Railway — single monolith service
- Docker — one container serves everything (FastAPI + static frontend)
- `Dockerfile` in project root, Railway auto-detects and builds it
- MongoDB plugin added in Railway dashboard, `MONGO_URL` injected automatically

**APIs**
- Claude API — `claude-sonnet-4-6` model, conversational AI core
- OpenWeatherMap API — weather data (Almaty, KZ default)
- Aladhan API — Islamic prayer times by coordinates
- Google Calendar API — read + write events
- Brave Search API (or SerpAPI) — web search results

---

## App Modes

The app is always fullscreen. Mode switches automatically based on context or manually via tap.

### 1. LISTENING MODE
- Triggered: user starts speaking
- UI: dark background `#0a0a0a`, animated sound wave (Canvas) in electric blue `#00d4ff`
- Text: `"Listening..."` faded below wave
- No other UI elements

### 2. THINKING MODE
- Triggered: after user stops speaking, while Claude API call is in flight
- UI: morphing particle orb animation (CSS/Canvas), no text
- Color: transitioning blue → purple

### 3. SPEAKING MODE
- Triggered: AI response received, TTS playing
- UI: wave animation in purple/violet `#9b59b6`
- Subtitles: AI response text fades in at the bottom (max 2 lines visible at a time)

### 4. SEARCH MODE
- Triggered: Claude determines a web search is needed and returns search results
- UI: floating glassmorphism cards (3 max visible)
- Each card: favicon + source name, title, short snippet, optional thumbnail
- Cards animate in from bottom

### 5. WEATHER MODE
- Triggered: user asks about weather OR morning briefing
- UI: large temperature center screen, animated weather icon, hourly forecast horizontal scroll
- Data: OpenWeatherMap, location = Almaty by default

### 6. PRAYER TIMES MODE (Намаз)
- Triggered: user asks about prayer times OR automatic near prayer time
- UI: next prayer name large center, countdown timer, all 5 prayers listed at bottom
- Highlight current/next prayer
- Data: Aladhan API, coordinates for Almaty

### 7. CALENDAR MODE
- Triggered: user asks about schedule, events, or says "добавь в календарь"
- UI: week view top half, events list bottom half, glassmorphism cards
- "Add event" glowing button — user can speak the event details
- Data: Google Calendar API

### 8. MORNING BRIEFING MODE
- Triggered: automatically at 7:00 AM or on user request
- UI: split layout — tasks/events left, weather right, AI quote bottom
- AI generates personalized morning summary via Claude API

---

## Conversation System

- Maintain conversation history in memory (last 20 messages)
- System prompt sets JARVIS persona: concise, helpful, speaks in the user's language (ru/en auto-detect)
- Claude decides which mode to activate based on response type
- Response must include a JSON envelope:

```json
{
  "mode": "search|weather|prayer|calendar|briefing|speak",
  "text": "spoken response text",
  "data": {}
}
```

---

## File Structure

```
/
├── Dockerfile               # Multi-stage: builds React, then runs uvicorn
├── main.py                  # FastAPI app, routes
├── db.py                    # MongoDB Motor client, collection helpers
├── routers/
│   ├── claude.py            # Claude API proxy + mode routing
│   ├── weather.py           # OpenWeatherMap
│   ├── prayer.py            # Aladhan API
│   ├── calendar.py          # Google Calendar
│   └── search.py            # Web search
├── requirements.txt         # fastapi, uvicorn, httpx, motor, google-auth
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json         # react, framer-motion
│   └── src/
│       ├── main.jsx
│       ├── App.jsx          # Mode state, switching logic
│       ├── api.js           # Calls to FastAPI backend
│       ├── hooks/
│       │   ├── useVoice.js  # Web Speech API (STT + TTS)
│       │   └── useVisualizer.js  # Canvas wave animations
│       └── modes/
│           ├── Listening.jsx
│           ├── Thinking.jsx
│           ├── Speaking.jsx
│           ├── Weather.jsx
│           ├── Prayer.jsx
│           ├── Calendar.jsx
│           ├── Search.jsx
│           └── Briefing.jsx
├── .env                     # API keys (never commit)
└── CLAUDE.md                # This file
```

---

## Environment Variables

```env
CLAUDE_API_KEY=
OPENWEATHER_API_KEY=
GOOGLE_CALENDAR_CREDENTIALS=
BRAVE_SEARCH_API_KEY=
MONGO_URL=                   # auto-injected by Railway MongoDB plugin
MONGODB_DB=jarvis
PORT=8080
LATITUDE=43.2220
LONGITUDE=76.8512
```

---

## Dockerfile

```dockerfile
# Stage 1 — build React
FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2 — run FastAPI
FROM python:3.12-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
COPY --from=frontend /app/frontend/dist ./static

EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

---

## Design System

See `design.md` for full design specifications — colors, typography, animations, glassmorphism rules, and per-mode UI details.

---

## Implementation Notes

- PWA: add `manifest.json` + service worker for "Add to Home Screen" on iPad
- Set `<meta name="apple-mobile-web-app-capable" content="yes">` for fullscreen Safari
- Web Speech API: use `continuous: false`, restart on silence detection
- TTS: use `speechSynthesis.speak()`, pick best available voice (prefer Siri voices on iOS)
- Wake word: optional stretch goal — detect "Hey JARVIS" before activating mic

---

## Development Phases

## Implementation — Phase 1 (Full Build)

- [ ] `Dockerfile` — builds and runs uvicorn on port 8080
- [ ] FastAPI server serving static files via `StaticFiles`
- [ ] MongoDB connected via Motor using `MONGO_URL` env var
- [ ] Collections initialized on startup
- [ ] Voice input → Claude API → voice output
- [ ] Conversation history saved to `conversations` collection
- [ ] LISTENING / THINKING / SPEAKING modes
- [ ] Weather mode (OpenWeatherMap)
- [ ] Prayer times mode (Aladhan API)
- [ ] Search mode (Brave Search API)
- [ ] Google Calendar — read events
- [ ] Google Calendar — voice-to-event creation, saved to `events` collection
- [ ] Morning briefing mode
- [ ] PWA manifest + fullscreen Safari (`apple-mobile-web-app-capable`)
- [ ] Settings saved to `settings` collection (location, language, preferences)
- [ ] Railway-ready: all config via env vars, no hardcoded values
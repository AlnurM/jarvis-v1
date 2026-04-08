---
phase: 01-foundation
plan: 02
subsystem: frontend
tags: [vite, react, typescript, tailwind-v4, pwa, zustand, motion, ios-pwa, landscape]
dependency_graph:
  requires: [backend-scaffold]
  provides: [frontend-scaffold, pwa-manifest, design-tokens, orb-animation, assistant-store]
  affects: [01-03, 01-04]
tech_stack:
  added: [vite@6.4.2, react@19.x, typescript@5.x, tailwindcss@4.2.2, motion@12.38.0, zustand@5.0.12, vite-plugin-pwa@0.21.2]
  patterns: [tailwind-v4-css-first, motion-react-import, zustand-store-hook, pwa-apple-meta-tags]
key_files:
  created:
    - frontend/package.json
    - frontend/vite.config.ts
    - frontend/tsconfig.json
    - frontend/index.html
    - frontend/src/index.css
    - frontend/src/main.tsx
    - frontend/src/App.tsx
    - frontend/src/store/assistantStore.ts
    - frontend/src/components/OrbAnimation.tsx
    - frontend/src/modes/ThinkingMode.tsx
    - frontend/src/api/client.ts
    - frontend/public/icons/icon-192.png
    - frontend/public/icons/icon-512.png
  modified: []
decisions:
  - "Downgraded vite to 6.4.2 (from 7.x) and vite-plugin-pwa to 0.21.2 — Node 20.11 lacks crypto.hash() needed by Vite 7/rollup"
  - "Used @tailwindcss/vite plugin not @tailwindcss/postcss — Tailwind v4 CSS-first, no tailwind.config.js"
  - "Import from motion/react not framer-motion — framer-motion package no longer maintained"
metrics:
  duration_minutes: 8
  completed: "2026-04-08"
  tasks_completed: 2
  files_created: 13
---

# Phase 1 Plan 2: Frontend Scaffold & PWA Foundation Summary

Vite/React/TypeScript frontend with Tailwind v4 CSS design tokens, vite-plugin-pwa manifest, Apple PWA fullscreen meta tags, iOS scroll lock, landscape orientation layout, Zustand store skeleton, and the JARVIS landing screen (AI Pulse orb + "Tap to speak") — npm run build exits 0 producing dist/ with manifest.webmanifest.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Initialize Vite/React/TypeScript project and install dependencies | 99e8c96 | frontend/package.json, vite.config.ts, tsconfig.json, public/icons/ |
| 2 | PWA meta tags, design system, landscape layout, landing screen components | b8c0271 | frontend/index.html, src/index.css, src/App.tsx, src/components/OrbAnimation.tsx, src/store/assistantStore.ts, src/modes/ThinkingMode.tsx, src/api/client.ts |

## What Was Built

### frontend/vite.config.ts
Vite 6.4.2 config with:
- `@tailwindcss/vite` plugin (CSS-first, no tailwind.config.js)
- `vite-plugin-pwa` generating manifest.webmanifest with display=standalone, background_color=#0e0e0e, orientation=landscape
- Two PWA icons: icon-192.png and icon-512.png
- `/api` proxy to `http://localhost:8080` for local dev

### frontend/index.html
PWA-ready HTML with all required Apple PWA meta tags:
- `apple-mobile-web-app-capable` content=yes (fullscreen on iPad)
- `apple-mobile-web-app-status-bar-style` content=black-translucent
- `viewport` with `viewport-fit=cover` for edge-to-edge on iPad
- Google Fonts: Inter (display) + Space Grotesk (label)
- iOS overscroll-behavior:none and -webkit-text-size-adjust:100% inline style

### frontend/src/index.css
Tailwind v4 CSS-first configuration:
- `@import "tailwindcss"` (not @tailwind directives)
- `@theme` block with all 8 design tokens: --color-background, --color-surface-low/high, --color-primary/secondary, --color-on-surface/variant, --font-display/label, --ease-glass
- iOS scroll lock: `html, body, #root { overflow:hidden; overscroll-behavior:none; touch-action:none; user-select:none }`
- Landscape media query: flex-direction:row with `env(safe-area-inset-left/right)` padding for iPad notch

### frontend/src/App.tsx
Root layout: dark background via `var(--color-background)`, OrbAnimation centered with flexbox, "Tap to speak" in Space Grotesk font using `var(--color-on-surface-variant)`, contextmenu prevention in useEffect.

### frontend/src/components/OrbAnimation.tsx
AI Pulse orb using `motion` from `motion/react`:
- Outer glow: 240x240, radial-gradient with --color-secondary, blur(80px), opacity 0.4→1→0.4 over 3s
- Inner core: 160x160, primary→secondary gradient, blur(40px), opacity 0.6→1→0.6 + scale 0.95→1.05→0.95 over 4s

### frontend/src/store/assistantStore.ts
Zustand 5 store with `AssistantState` ('idle'|'listening'|'thinking'|'speaking') and `AssistantMode` ('chat'|'weather'|'prayer'|'search'|'calendar'|'briefing') types. Initial state: `{state:'idle', mode:'chat', transcript:'', response:''}`. Exports `useAssistantStore`.

### Stubs / Placeholders
- `src/modes/ThinkingMode.tsx` — returns null, full implementation in Phase 2
- `src/api/client.ts` — only `healthCheck()` stub, routes added in Phase 2
- `public/icons/icon-192.png` and `icon-512.png` — 1x1 pixel dark placeholder PNGs, to be replaced with real icons before launch

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Downgraded Vite from 7.x to 6.4.2 for Node 20.11 compatibility**
- **Found during:** Task 2 (`npm run build` failed)
- **Issue:** `create-vite@7.x` and `vite-plugin-pwa@1.2.0` both require Node >=20.19.0. The project runs Node 20.11.0 which lacks `crypto.hash()` used by Vite 7's bundled rollup for content hashing.
- **Fix:** Downgraded `vite` to `6.4.2` (engine: `^18.0.0 || ^20.0.0`) and `vite-plugin-pwa` to `0.21.2` (engine: `>=16.0.0`). Build now exits 0.
- **Files modified:** frontend/package.json, frontend/package-lock.json
- **Commit:** b8c0271

**2. [Rule 3 - Blocking] Used `create-vite@7.1.3` instead of `8.0.7` (does not exist)**
- **Found during:** Task 1 (`npm create vite@8.0.7` failed)
- **Issue:** Version 8.0.7 of create-vite does not exist on npm registry. Latest at time of execution is 9.0.4.
- **Fix:** Used `create-vite@7.1.3` which generates the same react-ts template. Vite version was then downgraded separately to 6.4.2 for Node compatibility.
- **Files modified:** frontend/package.json
- **Commit:** 99e8c96

## Success Criteria Verification

- [x] npm run build exits 0 — confirmed (vite v6.4.2, 430 modules transformed)
- [x] dist/manifest.webmanifest exists and is valid JSON with display=standalone, background_color=#0e0e0e
- [x] index.html contains apple-mobile-web-app-capable content=yes
- [x] index.html contains apple-mobile-web-app-status-bar-style content=black-translucent
- [x] index.html contains viewport meta with viewport-fit=cover
- [x] Inter and Space Grotesk loaded from Google Fonts in index.html
- [x] src/index.css has @theme block with --color-background: #0e0e0e
- [x] Landscape orientation media query with safe-area-inset padding in index.css
- [x] OrbAnimation.tsx imports from 'motion/react' not 'framer-motion'
- [x] No tailwind.config.js in frontend/
- [x] Zustand store exports useAssistantStore with correct state/mode types

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| frontend/src/modes/ThinkingMode.tsx | `return null` | Phase 2 full implementation |
| frontend/src/api/client.ts | Only healthCheck stub | Phase 2 routes added as needed |
| frontend/public/icons/icon-192.png | 1x1 dark PNG | Placeholder, real icons before launch |
| frontend/public/icons/icon-512.png | 1x1 dark PNG | Placeholder, real icons before launch |

These stubs do NOT prevent the plan's goal (PWA foundation + landing screen). The orb and "Tap to speak" screen render correctly.

## Self-Check: PASSED

Files created:
- frontend/package.json: FOUND
- frontend/vite.config.ts: FOUND
- frontend/index.html: FOUND
- frontend/src/index.css: FOUND
- frontend/src/main.tsx: FOUND
- frontend/src/App.tsx: FOUND
- frontend/src/store/assistantStore.ts: FOUND
- frontend/src/components/OrbAnimation.tsx: FOUND
- frontend/src/modes/ThinkingMode.tsx: FOUND
- frontend/src/api/client.ts: FOUND
- frontend/public/icons/icon-192.png: FOUND
- frontend/public/icons/icon-512.png: FOUND
- frontend/dist/index.html: FOUND
- frontend/dist/manifest.webmanifest: FOUND

Commits:
- 99e8c96: FOUND (feat(01-02): initialize Vite React TypeScript project with dependencies)
- b8c0271: FOUND (feat(01-02): PWA meta tags, design system, landscape layout, landing screen)

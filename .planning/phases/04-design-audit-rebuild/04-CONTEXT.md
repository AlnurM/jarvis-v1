# Phase 4: Design Audit & Rebuild - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Audit every existing visual mode and the design token layer against the Stitch design screens, then rebuild each to pixel-perfect fidelity. This phase does NOT add new features or modes — it brings existing UI to spec.

Scope: @theme tokens, ListeningMode, ThinkingMode (+ OrbAnimation/AI Pulse), SpeakingMode, WeatherMode, PrayerMode, ModeRouter transitions.

</domain>

<decisions>
## Implementation Decisions

### Stitch-First Workflow
- **D-01:** Pull each Stitch screen via MCP tools before any code changes. The Stitch screen is the source of truth — code that doesn't match the design is not done.
- **D-02:** For each mode: retrieve Stitch screen → compare against current implementation → identify gaps → rebuild to match.

### Token Completeness
- **D-03:** Expand `@theme` layer in `index.css` to include ALL tokens from design.md — currently missing: `primary-dim`, `secondary-dim`, `surface-container-lowest`, `surface-container-highest`, `primary-container`, `secondary-container`, `outline-variant`, `primary-fixed`, `rounded-xl`.
- **D-04:** Token values must match Stitch Design System screen (screen ID: `asset-stub-assets-12c7eab3ced040a3bf6965e467c9a5cf-1775654289866`). If design.md and Stitch conflict, Stitch wins.

### Mode Rebuild Scope
- **D-05:** Per-mode targeted rebuild, not full rewrite. Compare each mode against its Stitch screen, fix only what diverges. Minimize unnecessary churn.
- **D-06:** Rebuild order: tokens first → then modes in dependency order (OrbAnimation → ThinkingMode → ListeningMode → SpeakingMode → WeatherMode → PrayerMode).

### Animation Audit
- **D-07:** All mode transitions in ModeRouter must use `var(--ease-glass)` / `cubic-bezier(0.22, 1, 0.36, 1)`. No standard 400ms easing anywhere.
- **D-08:** AI Pulse (OrbAnimation) must match design.md spec: multi-layered orb with `primary-container` + `secondary-container`, Gaussian blur 40-80px, breathing opacity 40%-100%.

### Design Rules (carried from design.md)
- **D-09:** No-Line Rule — no 1px borders for sectioning. Use background shifts, luminous depth, or backdrop blur only.
- **D-10:** Body text uses `on-surface-variant` (#adaaaa), never pure white (#FFFFFF).
- **D-11:** Glassmorphism cards: `backdrop-filter: blur(24px)` + subtle top-left gradient `rgba(255,255,255,0.05)` to transparent.
- **D-12:** Shadows use diffused `primary-dim` or `secondary-dim` at 4-6% opacity, blur 30px+. Never black (#000) shadows.

### Claude's Discretion
- Token naming in CSS — Claude can choose CSS custom property names as long as they map clearly to design.md token names.
- Component internal structure — as long as visual output matches Stitch, internal component structure is flexible.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Specification
- `design.md` — Full design system document: colors, typography, surface hierarchy, glassmorphism rules, component specs, AI Pulse spec, do's and don'ts

### Stitch Design Screens (pull via MCP)
- Project ID: `7359010342585899885`
- Design System screen: `asset-stub-assets-12c7eab3ced040a3bf6965e467c9a5cf-1775654289866`
- Speaking Mode screen: `8554ef1a3efa42f9a07ad8774a690a7d`
- Listening Mode screen: `d6bf4b24d8844d3ba4aa32d422a6a8c4`
- Thinking Mode screen: `c121cc95f2e149a0873accbd6c47d7bd`
- Weather Mode screen: `46d9c2600c1948658c68a31705074ca7`
- Prayer Times Mode screen: `b9c8cef5cb4b4a9db5931e80797efe16`

### Existing CSS Tokens
- `frontend/src/index.css` — Current `@theme` layer (7 tokens — needs expansion)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/index.css` @theme layer — foundation exists, needs expansion
- `frontend/src/components/OrbAnimation.tsx` — AI Pulse orb, needs audit against spec
- `frontend/src/components/ModeRouter.tsx` — mode transitions, needs easing audit
- `frontend/src/modes/*.tsx` — all 5 mode components exist, need per-mode audit

### Established Patterns
- Tailwind v4 CSS-first via `@tailwindcss/vite` plugin — tokens in `@theme` block
- `motion/react` for AnimatePresence transitions in ModeRouter
- Canvas API for wave visualizations (ListeningMode, SpeakingMode)
- Canvas API for particle orb (ThinkingMode via OrbAnimation)

### Integration Points
- `@theme` tokens are consumed by all mode components via Tailwind utilities
- ModeRouter wraps all modes with AnimatePresence — transition easing defined there
- OrbAnimation is used by ThinkingMode and as idle state orb

</code_context>

<specifics>
## Specific Ideas

- Stitch MCP is now connected — this is the key difference from the previous (reverted) attempt which guessed at designs without consulting Stitch
- Each mode's Stitch screen ID is listed in design.md and in canonical_refs above
- The "AI Pulse" component is a signature element — multi-layered orb with specific blur and breathing animation specs

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-design-audit-rebuild*
*Context gathered: 2026-04-09*

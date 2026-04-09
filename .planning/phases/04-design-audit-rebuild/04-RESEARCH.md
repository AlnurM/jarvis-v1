# Phase 04: Design Audit & Rebuild — Research

**Researched:** 2026-04-09
**Domain:** UI design fidelity — Tailwind v4 CSS tokens, glassmorphism, motion/react animations, Stitch/Figma MCP design extraction
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Pull each Stitch screen via MCP tools before any code changes. The Stitch screen is the source of truth — code that doesn't match the design is not done.
- **D-02:** For each mode: retrieve Stitch screen → compare against current implementation → identify gaps → rebuild to match.
- **D-03:** Expand `@theme` layer in `index.css` to include ALL tokens from design.md — currently missing: `primary-dim`, `secondary-dim`, `surface-container-lowest`, `surface-container-highest`, `primary-container`, `secondary-container`, `outline-variant`, `primary-fixed`, `rounded-xl`.
- **D-04:** Token values must match Stitch Design System screen (`asset-stub-assets-12c7eab3ced040a3bf6965e467c9a5cf-1775654289866`). If design.md and Stitch conflict, Stitch wins.
- **D-05:** Per-mode targeted rebuild, not full rewrite. Compare each mode against its Stitch screen, fix only what diverges.
- **D-06:** Rebuild order: tokens first → then modes in dependency order: OrbAnimation → ThinkingMode → ListeningMode → SpeakingMode → WeatherMode → PrayerMode.
- **D-07:** All mode transitions in ModeRouter must use `var(--ease-glass)` / `cubic-bezier(0.22, 1, 0.36, 1)`. No standard 400ms easing anywhere.
- **D-08:** AI Pulse (OrbAnimation) must match design.md spec: multi-layered orb with `primary-container` + `secondary-container`, Gaussian blur 40-80px, breathing opacity 40%-100%.
- **D-09:** No-Line Rule — no 1px borders for sectioning. Use background shifts, luminous depth, or backdrop blur only.
- **D-10:** Body text uses `on-surface-variant` (#adaaaa), never pure white (#FFFFFF).
- **D-11:** Glassmorphism cards: `backdrop-filter: blur(24px)` + subtle top-left gradient `rgba(255,255,255,0.05)` to transparent.
- **D-12:** Shadows use diffused `primary-dim` or `secondary-dim` at 4-6% opacity, blur 30px+. Never black (#000) shadows.

### Claude's Discretion

- Token naming in CSS — Claude can choose CSS custom property names as long as they map clearly to design.md token names.
- Component internal structure — as long as visual output matches Stitch, internal component structure is flexible.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

## Summary

Phase 04 is a visual fidelity pass: every mode component and the CSS token layer must be brought to exact alignment with the Stitch design screens. The previous attempt at this phase was reverted because it executed without actually pulling design specs from Stitch — it guessed values from design.md text alone. This attempt MUST pull Stitch screens via the Figma MCP (`mcp__figma__get_design_context` + `mcp__figma__get_screenshot`) before changing any code.

The current codebase is already well-structured: Tailwind v4 `@theme` layer exists in `index.css` with 7 tokens, all 5 mode components exist and compile, `motion/react` AnimatePresence transitions are wired in ModeRouter. The gaps are: the `@theme` token set is incomplete (missing ~8 tokens), individual modes use some hardcoded inline values instead of CSS custom properties, and the OrbAnimation breathe animation uses `easeInOut` rather than `--ease-glass`. ModeRouter already uses `cubic-bezier(0.22, 1, 0.36, 1)` correctly.

The phase has no external service dependencies and no runtime state requiring migration. All changes are pure CSS/TSX edits. Validation is a build-pass check (`npm run build`) plus visual inspection on iPad Safari.

**Primary recommendation:** Start each plan wave with a mandatory `get_design_context` + `get_screenshot` call for the relevant Stitch screen IDs before writing any code. Stitch screen values override design.md text if they conflict.

---

## Stitch MCP Access — CRITICAL WORKFLOW

### How to Access Stitch Screens During Execution

The Stitch design tool is accessed through the Figma MCP server (`figma@claude-plugins-official` plugin, enabled in `.claude/settings.json`). The `figma-implement-design` skill is the correct skill to invoke for implementing Stitch screens into code.

**Mandatory pre-implementation step for every mode plan:**

```
Step 1: Load figma-implement-design skill
Step 2: mcp__figma__get_design_context(fileKey="7359010342585899885", nodeId="<screen-id>")
Step 3: mcp__figma__get_screenshot(fileKey="7359010342585899885", nodeId="<screen-id>")
Step 4: Diff Figma output vs current implementation
Step 5: Rebuild only diverging elements
```

**Screen IDs for each plan:**

| Screen | ID | Plan |
|--------|-----|------|
| Design System | `asset-stub-assets-12c7eab3ced040a3bf6965e467c9a5cf-1775654289866` | 04-01 (tokens) |
| Listening Mode | `d6bf4b24d8844d3ba4aa32d422a6a8c4` | 04-02 |
| Thinking Mode | `c121cc95f2e149a0873accbd6c47d7bd` | 04-02 |
| Speaking Mode | `8554ef1a3efa42f9a07ad8774a690a7d` | 04-03 |
| Weather Mode | `46d9c2600c1948658c68a31705074ca7` | 04-03 |
| Prayer Times Mode | `b9c8cef5cb4b4a9db5931e80797efe16` | 04-03 |

**Confidence:** HIGH — the figma plugin is listed as enabled in `.claude/settings.json` (`"figma@claude-plugins-official": true`). The previous phase 04 attempt used `use_figma` (Figma Plugin API for canvas writes). The correct tool for reading design specs to code is `get_design_context` + `get_screenshot` from the figma-implement-design skill workflow.

---

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `motion` | 12.x | Mode transitions, breathing animations | Installed; `motion/react` import confirmed in all mode files |
| TailwindCSS | 4.x | CSS-first `@theme` token layer | Installed via `@tailwindcss/vite`; CSS-first config in `index.css` |
| TypeScript | 5.x | Type safety | Already configured |
| React | 19.x | UI framework | Already configured |

### No new packages needed

All required libraries are already installed. This phase is CSS and TSX edits only.

---

## Architecture Patterns

### Token Architecture — Tailwind v4 CSS-First

```css
/* frontend/src/index.css */
@import "tailwindcss";

@theme {
  /* All custom properties here become Tailwind utilities */
  --color-background: #0e0e0e;
  --color-surface-container-low: #131313;
  /* etc. */
}
```

Tailwind v4 in CSS-first mode generates utilities automatically from `@theme` variables. A token `--color-primary-dim` becomes `bg-primary-dim`, `text-primary-dim`, `shadow-primary-dim` etc. **No `tailwind.config.js` file is used** — this project uses the `@tailwindcss/vite` plugin exclusively.

### Current Token Inventory vs Required

**Current `@theme` (7 tokens):**
```
--color-background, --color-surface-low, --color-surface-high,
--color-primary, --color-secondary, --color-on-surface,
--color-on-surface-variant, --font-display, --font-label, --ease-glass
```

**Missing tokens (from design.md + CONTEXT.md D-03):**
| Token | Purpose | Value (from design.md) |
|-------|---------|------------------------|
| `--color-surface-container-lowest` | Recessed "carved" look | TBD from Stitch |
| `--color-surface-container-highest` | Protruding "lifted" elements | TBD from Stitch |
| `--color-primary-container` | AI Pulse inner layer (D-08) | TBD from Stitch |
| `--color-secondary-container` | AI Pulse outer layer (D-08) | TBD from Stitch |
| `--color-primary-dim` | Ambient glow shadows (D-12) | `#85adff` at ~5% opacity |
| `--color-secondary-dim` | Ambient glow shadows (D-12) | `#ad89ff` at ~5% opacity |
| `--color-outline-variant` | Ghost border at 15% opacity | TBD from Stitch |
| `--color-primary-fixed` | Tertiary button text | TBD from Stitch |
| `--radius-xl` | Signature corner radius | `1.5rem` (confirmed in design.md) |

**Note:** `--color-surface-low` / `--color-surface-high` are the current short-form names. They need renaming to `--color-surface-container-low` / `--color-surface-container-high` to match design.md naming convention. **This rename will break all components that use `bg-surface-low` / `bg-surface-high` utilities** — find all usages before renaming.

### Naming Rename Impact Search

Before renaming surface tokens, scan these patterns in `frontend/src/`:
- `surface-low` (Tailwind utility class)
- `surface-high` (Tailwind utility class)
- `var(--color-surface-low)` (inline CSS)
- `var(--color-surface-high)` (inline CSS)

From audit of current code, the mode files use inline `style={{ background: '...' }}` with hardcoded hex values — they do NOT use the Tailwind `bg-surface-low` utilities. Only ModeRouter idle view uses `var(--color-background)`. The rename is LOW-RISK in the current codebase.

### Glassmorphism Pattern

Per design.md §4 and D-11:
```css
/* Standard glassmorphism card */
background: rgba(32, 31, 31, 0.4);  /* surface-container-high at ~40% alpha */
backdrop-filter: blur(24px);
-webkit-backdrop-filter: blur(24px); /* required for Safari/iPadOS */
/* Top-left gradient — no inline border */
background: linear-gradient(
  to bottom right,
  rgba(255,255,255,0.05),
  rgba(255,255,255,0)
);
/* Subtle ambient shadow — NEVER black */
box-shadow: 0 0 30px rgba(133, 173, 255, 0.05); /* primary-dim at 5% */
```

**iPad Safari note:** `-webkit-backdrop-filter` MUST accompany `backdrop-filter` — Safari requires the prefixed version. Current WeatherMode and PrayerMode already apply both. This pattern must be checked for ALL modes.

### AI Pulse / OrbAnimation Pattern

Per design.md §5 "The AI Pulse" and D-08:
```tsx
// Multi-layered orb: primary-container + secondary-container
// Gaussian blur: 40px (inner) to 80px (outer)
// Breathing: opacity 40% → 100%
<motion.div
  animate={{ opacity: [0.4, 1, 0.4] }}  // breathing range per design.md
  transition={{ duration: 3, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }}
  style={{ filter: 'blur(80px)' }}
/>
<motion.div
  animate={{ opacity: [0.6, 1, 0.6], scale: [0.95, 1.05, 0.95] }}
  transition={{ duration: 4, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }}
  style={{ filter: 'blur(40px)' }}
/>
```

**Current OrbAnimation gap:** The outer layer uses `easeInOut` string, not `[0.22, 1, 0.36, 1]` array. Per D-07 and D-08, all animations on AI Pulse MUST use the glass easing. Also, OrbAnimation uses `var(--color-primary)` / `var(--color-secondary)` — once `primary-container` and `secondary-container` tokens exist, OrbAnimation should use those tokens per design.md spec.

### ModeRouter Easing — Already Correct

Current ModeRouter `modeVariants` already uses `[0.22, 1, 0.36, 1]` in both `animate` and `exit` transitions. This satisfies D-07 with one caveat: the mode components themselves have some `motion` animations internally that may use `easeInOut` (e.g., OrbAnimation, ThinkingMode outer ambient glow).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Glassmorphism blur | Custom blur implementation | Native `backdrop-filter: blur(24px)` + `-webkit-backdrop-filter` | Browser-native, GPU-accelerated, correct on iPadOS |
| Token-based color system | Inline hardcoded hex values everywhere | CSS custom properties in `@theme` | Single source of truth, all modes stay in sync |
| Design spec extraction | Manually guessing values from design.md text | `mcp__figma__get_design_context` + `get_screenshot` | Stitch is the source of truth — never guess |
| Breathing animations | `requestAnimationFrame` canvas breathing | `motion` animate array syntax | Declarative, smooth, no frame-time variance on iPad |

**Key insight:** The entire point of this phase is to stop hand-rolling design interpretation. Pull the Stitch screens first, always.

---

## Common Pitfalls

### Pitfall 1: Skipping Stitch Pull (Root Cause of Phase Revert)
**What goes wrong:** Code looks reasonable against design.md text but fails visual review because specific pixel values, exact opacity levels, or layout details diverge from Stitch screen.
**Why it happens:** design.md is a text document — it describes design intent, not exact pixel spec.
**How to avoid:** Every plan wave MUST start with `get_design_context` + `get_screenshot` before touching any code.
**Warning signs:** If a plan task says "per design.md" without also saying "per Stitch screen", it's skipping Stitch.

### Pitfall 2: Token Rename Breaking Component Utilities
**What goes wrong:** Renaming `--color-surface-low` → `--color-surface-container-low` in `@theme` silently breaks any component using `bg-surface-low` Tailwind utility.
**Why it happens:** Tailwind v4 generates utilities from `@theme` names — renaming the token renames the utility class.
**How to avoid:** Search all `frontend/src/` for `surface-low` and `surface-high` before renaming. Update all references atomically.
**Warning signs:** `npm run build` passes but UI shows un-styled (transparent) backgrounds.

### Pitfall 3: Missing -webkit-backdrop-filter on iPadOS
**What goes wrong:** Glassmorphism cards appear as opaque dark boxes instead of blurred glass on iPad Safari.
**Why it happens:** Safari requires `-webkit-backdrop-filter` in addition to the standard `backdrop-filter` property.
**How to avoid:** Always pair both properties. Current WeatherMode and PrayerMode already do this correctly — use them as reference.

### Pitfall 4: OrbAnimation Using String Easing Instead of Array
**What goes wrong:** OrbAnimation breathing feels "generic" — snappy ease-in-out instead of the heavy-glass feel.
**Why it happens:** `ease: 'easeInOut'` (string) is used in OrbAnimation instead of `ease: [0.22, 1, 0.36, 1]` (cubic bezier array).
**How to avoid:** Per D-07, replace ALL string easing values (`'easeInOut'`, `'easeIn'`, `'linear'`) in animation objects with `[0.22, 1, 0.36, 1]` or `var(--ease-glass)`.

### Pitfall 5: `primary-dim` Token as Solid Color vs Alpha-Channel Color
**What goes wrong:** Using `--color-primary-dim: #85adff40` (hex with alpha) causes issues with some Tailwind utilities that don't expect alpha in the hex.
**Why it happens:** Tailwind's opacity utilities work differently with CSS color values that already contain alpha.
**How to avoid:** Define `--color-primary-dim` as an RGB triplet or use opacity utilities in Tailwind v4: `shadow-primary/5` (5% opacity of primary color). Alternatively define as `rgba(133, 173, 255, 0.05)` in the token and use it directly in `box-shadow`.

### Pitfall 6: Hardcoded `#0a0a0a` vs Design Token `#0e0e0e`
**What goes wrong:** ListeningMode, ThinkingMode, SpeakingMode use `background: '#0a0a0a'` hardcoded instead of `var(--color-background)` which is `#0e0e0e`. These are different values.
**Why it happens:** The modes were written before checking Stitch — `#0a0a0a` was a reasonable-looking dark color.
**How to avoid:** Pull the Stitch screens and confirm the correct background value. If Stitch shows `#0e0e0e`, update all modes to use `var(--color-background)` as a CSS custom property reference.

### Pitfall 7: `primary-container` / `secondary-container` Token Values
**What goes wrong:** OrbAnimation design spec references `primary-container` and `secondary-container` tokens (design.md §5), but these don't exist in current `@theme`. Using `primary` / `secondary` directly instead results in oversaturated orb layers.
**Why it happens:** Material Design 3 color system defines "container" variants as lighter, more muted versions of the primary/secondary colors used for container fills.
**How to avoid:** Pull the Stitch Design System screen and extract the exact `primary-container` and `secondary-container` hex values from it. Only add tokens that Stitch confirms.

---

## Code Examples

### Verified: Tailwind v4 @theme Extension Pattern
```css
/* Source: Tailwind v4 docs — CSS-first config */
@import "tailwindcss";

@theme {
  /* Tokens added here become Tailwind utilities automatically */
  --color-surface-container-lowest: #0b0b0b;
  --color-primary-container: <from-stitch>;
  --radius-xl: 1.5rem;
  --backdrop-glass: blur(24px);
}
```

### Verified: motion/react Breathing Animation with Glass Easing
```tsx
/* Source: current OrbAnimation.tsx — pattern to UPDATE with correct easing */
<motion.div
  animate={{ opacity: [0.4, 1, 0.4] }}
  transition={{
    duration: 3,
    repeat: Infinity,
    ease: [0.22, 1, 0.36, 1],  // D-07: glass easing, NOT 'easeInOut'
  }}
/>
```

### Verified: Glassmorphism Card (No-Line Rule compliant)
```tsx
/* Source: WeatherMode.tsx + PrayerMode.tsx — working pattern */
<div
  style={{
    background: 'rgba(32, 31, 31, 0.4)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',  // required for Safari iPadOS
    // No border property — use luminous depth instead:
    boxShadow: '0 0 30px rgba(133, 173, 255, 0.05)',
  }}
/>
```

### Verified: Subtitle Text Compliant with D-10
```tsx
/* Source: SpeakingMode.tsx — correct text color pattern */
<p style={{ color: 'var(--color-on-surface-variant)' }}>
  {/* #adaaaa — never pure white #FFFFFF */}
</p>
```

### Verified: ModeRouter Transition with Glass Easing
```tsx
/* Source: ModeRouter.tsx — already correct, use as reference */
const modeVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: {
    opacity: 1, scale: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0, scale: 0.98,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
  },
}
```

---

## Current Implementation Audit

### Files to Audit and Expected Gaps

| File | Key Gap | Fix Required |
|------|---------|-------------|
| `frontend/src/index.css` | 7 tokens; missing `primary-dim`, `secondary-dim`, `primary-container`, `secondary-container`, `surface-container-lowest`, `surface-container-highest`, `outline-variant`, `primary-fixed`, `radius-xl`; short-form token names | Expand @theme after Stitch Design System screen pull |
| `frontend/index.html` | Space Grotesk missing weight 700 (`wght@400;500;600` — should be `400;500;600;700`) | Add weight 700 to Google Fonts URL |
| `frontend/src/components/OrbAnimation.tsx` | Outer glow uses `ease: 'easeInOut'` string; inner core uses `ease: 'easeInOut'`; uses `primary`/`secondary` instead of `primary-container`/`secondary-container` | Switch to `[0.22, 1, 0.36, 1]` easing; update colors after tokens added |
| `frontend/src/modes/ThinkingMode.tsx` | Outer ambient glow uses `ease: [0.22, 1, 0.36, 1]` (correct) but inner hue-rotate animation uses `ease: 'easeInOut'`; background hardcoded `#0a0a0a` | Fix inner animation easing; verify background vs Stitch |
| `frontend/src/modes/ListeningMode.tsx` | Background hardcoded `#0a0a0a`; WAVE_COLOR `#00d4ff` may differ from Stitch | Verify against Stitch Listening Mode screen |
| `frontend/src/modes/SpeakingMode.tsx` | Background hardcoded `#0a0a0a`; WAVE_COLOR `#9b59b6` may differ; glassmorphism pattern missing the top-left gradient (D-11) | Verify against Stitch Speaking Mode screen |
| `frontend/src/modes/WeatherMode.tsx` | Hourly cards missing top-left gradient (D-11); animation uses `ease: 'easeInOut'` | Add gradient to glassmorphism cards; fix animation easing |
| `frontend/src/modes/PrayerMode.tsx` | Prayer row cards missing top-left gradient (D-11); transition uses `ease: 'opacity 0.3s ease'` CSS string | Add gradient; replace `ease` with custom easing |
| `frontend/src/components/ModeRouter.tsx` | Already correct — `[0.22, 1, 0.36, 1]` used for all transitions | Verify only |

### Token Rename Cross-Reference

Current `--color-surface-low` is used in these patterns (from audit):
- `ModeRouter.tsx` idle view: `var(--color-background)` — NOT surface-low (safe)
- No Tailwind `bg-surface-low` utilities found in mode files (all use inline styles)
- **Risk: LOW** — rename is safe in current codebase

---

## Environment Availability

Step 2.6: No external tool dependencies for this phase — all changes are CSS/TSX edits + Figma MCP reads. No new npm packages, no backend changes, no database migrations.

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| Figma MCP (`figma@claude-plugins-official`) | Stitch screen extraction | ✓ | Enabled in `.claude/settings.json` |
| `npm run build` | Verification step | ✓ | `frontend/` has `vite` configured |
| Stitch project `7359010342585899885` | All plans | ✓ (assumed) | Auth via Figma MCP — requires valid Figma session |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vite build check (no unit test framework for UI-only phase) |
| Config file | `frontend/vite.config.ts` |
| Quick run command | `cd /Users/alikeforalike/Documents/Dev/jarvis-v1/frontend && npm run build 2>&1 \| tail -20` |
| Full suite command | Same — build is the gate for TypeScript + CSS correctness |

### Phase Requirements → Test Map

| Req | Behavior | Test Type | Automated Command | Notes |
|-----|----------|-----------|-------------------|-------|
| Design tokens | `@theme` contains all required tokens | Build check | `npm run build` | TypeScript compile catches missing token references |
| No-Line Rule | No 1px border properties in mode files | Code grep | `grep -r "border:" frontend/src/modes/` | Manual pass if grep clean |
| Glass easing | No `'easeInOut'` string in animation objects | Code grep | `grep -rn "easeInOut" frontend/src/` | Zero results = pass |
| Token naming | No `surface-low` / `surface-high` in source | Code grep | `grep -rn "surface-low\|surface-high" frontend/src/` | Zero results = pass |
| iPad visual fidelity | Stitch screenshot matches rendered UI | Manual visual | iPad Safari standalone PWA | Human gate — cannot automate |

### Sampling Rate
- **Per task commit:** `npm run build` (TypeScript + Vite compile)
- **Per wave merge:** Build + grep checks (easing, borders, token names)
- **Phase gate:** Full suite green + manual iPad visual verification before `/gsd:verify-work`

### Wave 0 Gaps
None — existing `npm run build` covers TypeScript correctness. No new test files needed for this phase.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `framer-motion` import | `motion/react` import | Already correct in all files |
| Tailwind config JS | `@theme` CSS block | Already correct |
| Motor (MongoDB) | PyMongo Async | Not relevant to this phase |
| Phase 04 previous attempt (no Stitch) | Phase 04 this attempt (Stitch-first) | Key difference — pull screens before coding |

**Note from reverted phase analysis:** The previous Phase 04 execution (commits `b037ec0` through `3db789a`) made all the correct token expansions and component updates, but was marked as not using Stitch. Examining those commits shows the token values used (`#85adff`, `#ad89ff`, `1.5rem`, `blur(24px)`) match design.md text exactly — which is consistent with NOT having pulled Stitch screens. This phase must verify those values against actual Stitch output, not just re-apply the same values.

---

## Open Questions

1. **`primary-container` and `secondary-container` exact values**
   - What we know: design.md says OrbAnimation should use these tokens; they appear to be lighter/muted variants of primary/secondary.
   - What's unclear: Exact hex values — are they significantly different from `#85adff`/`#ad89ff`?
   - Recommendation: Pull Stitch Design System screen first and extract exact values before adding tokens.

2. **`#0a0a0a` vs `#0e0e0e` for mode backgrounds**
   - What we know: design.md says background is `#0e0e0e` ("The Void"). Listening/Thinking/Speaking modes use `#0a0a0a` hardcoded.
   - What's unclear: Whether Stitch mode screens show `#0a0a0a` or `#0e0e0e`.
   - Recommendation: Pull Stitch screens for all three modes and check. If Stitch shows `#0e0e0e`, switch to `var(--color-background)` — if `#0a0a0a`, keep inline or add a new token.

3. **Stitch screen access — `use_figma` vs `get_design_context`**
   - What we know: The previous phase 04 plan used `use_figma` (Figma Plugin API for canvas writes). The `figma-implement-design` skill uses `get_design_context` + `get_screenshot` for code implementation from designs.
   - What's unclear: Which approach correctly reads Stitch screen design specs.
   - Recommendation: Use `figma-implement-design` skill workflow — `get_design_context` is purpose-built for extracting design specs to translate into code. Load the skill before the first Figma MCP call in each plan.

---

## Sources

### Primary (HIGH confidence)
- `design.md` in project root — full design system specification
- `frontend/src/index.css` — current token state (7 tokens, audited directly)
- `frontend/src/components/OrbAnimation.tsx` — current AI Pulse state (audited directly)
- `frontend/src/components/ModeRouter.tsx` — current easing state (audited directly)
- `frontend/src/modes/*.tsx` — all 5 mode components (audited directly)
- `.planning/phases/04-design-audit-rebuild/04-CONTEXT.md` — locked decisions
- `~/.claude/plugins/cache/claude-plugins-official/figma/2.1.3/skills/figma-implement-design/SKILL.md` — Figma MCP workflow
- `~/.claude/plugins/cache/claude-plugins-official/figma/2.1.3/skills/figma-use/SKILL.md` — Figma Plugin API reference

### Secondary (MEDIUM confidence)
- Git history analysis: commits `b037ec0` through `3db789a` (reverted phase 04 execution) — confirms what the previous attempt did and what values it chose
- CLAUDE.md — project stack constraints (confirmed: TailwindCSS v4 CSS-first, motion/react, no tailwind.config.js)

### Tertiary (LOW confidence)
- design.md token values for missing tokens (`primary-container`, `secondary-container`, `outline-variant`, `primary-fixed`) — these are UNVERIFIED until Stitch screen is pulled. Do not implement these values without Stitch confirmation.

---

## Metadata

**Confidence breakdown:**
- Stitch MCP access workflow: HIGH — figma plugin enabled, `figma-implement-design` skill confirmed present
- Current implementation gaps: HIGH — all source files audited directly
- Missing token values: LOW — values depend on Stitch screen pull (primary-container, secondary-container, etc.)
- ModeRouter easing: HIGH — already correct, confirmed by code audit
- Glassmorphism patterns: HIGH — working pattern confirmed in WeatherMode and PrayerMode

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (stable tech domain, 30-day horizon)

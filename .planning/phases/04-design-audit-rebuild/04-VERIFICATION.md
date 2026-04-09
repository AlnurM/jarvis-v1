---
phase: 04-design-audit-rebuild
verified: 2026-04-09T00:00:00Z
status: gaps_found
score: 4/5 must-haves verified
re_verification: false
gaps:
  - truth: "Design tokens (@theme CSS layer) match Stitch design system — colors, typography (Inter + Space Grotesk), surface hierarchy, glassmorphism rules"
    status: partial
    reason: "surface-container-lowest token is missing from @theme — only surface-container-highest exists. Plan 01 acceptance criteria required both."
    artifacts:
      - path: "frontend/src/index.css"
        issue: "Missing --color-surface-container-lowest token; plan required it, it is absent from the @theme block"
    missing:
      - "Add --color-surface-container-lowest: #0b0b0b (or Stitch-derived value) to @theme in frontend/src/index.css"
  - truth: "WeatherMode and PrayerMode null/loading states use var(--color-background) for background"
    status: failed
    reason: "Both WeatherMode.tsx (line 91) and PrayerMode.tsx (line 104) use hardcoded '#0e0e0e' in their null/loading fallback divs instead of var(--color-background). The main rendered paths are correct, but the fallback paths are not token-referenced."
    artifacts:
      - path: "frontend/src/modes/WeatherMode.tsx"
        issue: "Line 91: style={{ background: '#0e0e0e' }} — should be var(--color-background)"
      - path: "frontend/src/modes/PrayerMode.tsx"
        issue: "Line 104: style={{ background: '#0e0e0e' }} — should be var(--color-background)"
    missing:
      - "Replace '#0e0e0e' with 'var(--color-background)' in WeatherMode.tsx null state (line 91)"
      - "Replace '#0e0e0e' with 'var(--color-background)' in PrayerMode.tsx null state (line 104)"
human_verification:
  - test: "Visual fidelity of all 5 modes against Stitch screens on iPad Safari"
    expected: "Each mode matches its Stitch screen pixel-for-pixel — colors, layout, easing feel, glassmorphism surfaces"
    why_human: "Visual appearance, mode transition feel (glass easing vs snappy), backdrop-blur rendering, and glassmorphism surface quality cannot be verified programmatically"
  - test: "Mode transition easing feel — cubic-bezier(0.22, 1, 0.36, 1) perceived as 'heavy glass'"
    expected: "Transitions feel weighted and natural, not the default snappy React transition"
    why_human: "Easing perception is subjective and requires real interaction on target device"
---

# Phase 04: Design Audit & Rebuild Verification Report

**Phase Goal:** Every existing visual mode matches its Stitch design screen pixel-for-pixel — correct design tokens, glassmorphism surfaces, typography, spacing, colors, and animation easing
**Verified:** 2026-04-09
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Design tokens (@theme CSS layer) match Stitch design system | PARTIAL | 17 tokens present; --color-surface-container-lowest missing |
| 2 | ListeningMode, ThinkingMode, SpeakingMode, WeatherMode, and PrayerMode each match their Stitch screen | VERIFIED | All modes rebuilt; main paths use correct tokens, easing, glassmorphism |
| 3 | No-Line Rule enforced — no 1px borders; background shifts/blur only | VERIFIED | grep returns zero border violations across all mode files |
| 4 | Custom easing cubic-bezier(0.22, 1, 0.36, 1) used for all mode transitions | VERIFIED | 11 array-form occurrences; zero string easing violations |
| 5 | Text colors use on-surface-variant (#adaaaa) for body text — never pure white | VERIFIED | 12 usages of var(--color-on-surface-variant); zero #FFFFFF occurrences in modes |

**Score:** 4/5 truths verified (Truth 1 partial; Truth 2 has minor gap in null states)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/index.css` | Complete @theme token layer | PARTIAL | 17/18 tokens present — surface-container-lowest absent |
| `frontend/index.html` | Space Grotesk wght@400;500;600;700 | VERIFIED | Line 26 confirmed |
| `frontend/src/components/OrbAnimation.tsx` | AI Pulse with correct tokens and easing | VERIFIED | Uses var(--color-primary-container), [0.22, 1, 0.36, 1] x2 |
| `frontend/src/modes/ThinkingMode.tsx` | Thinking mode matching Stitch | VERIFIED | var(--color-background), no easeInOut, [0.22, 1, 0.36, 1] x2 |
| `frontend/src/modes/ListeningMode.tsx` | Listening mode matching Stitch | VERIFIED | var(--color-background), WAVE_COLOR=#85adff, on-surface-variant label |
| `frontend/src/modes/SpeakingMode.tsx` | Speaking mode matching Stitch | VERIFIED | var(--color-background), WAVE_COLOR=#ad89ff, glassmorphism subtitle card |
| `frontend/src/modes/WeatherMode.tsx` | Weather mode matching Stitch | STUB (null path) | Main path verified; null state hardcodes '#0e0e0e' (line 91) |
| `frontend/src/modes/PrayerMode.tsx` | Prayer mode matching Stitch | STUB (null path) | Main path verified; null state hardcodes '#0e0e0e' (line 104) |
| `frontend/src/components/ModeRouter.tsx` | ModeRouter with correct easing | VERIFIED | [0.22, 1, 0.36, 1] x2, AnimatePresence, var(--color-background) in idle |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `OrbAnimation.tsx` | `index.css` | var(--color-primary-container) | WIRED | Pattern confirmed at line 13 |
| `ThinkingMode.tsx` | `OrbAnimation.tsx` | import + scale={1.2} | WIRED | Line 10 import, line 50 usage |
| `WeatherMode.tsx` | `index.css` | var(--color-*) references | WIRED | Multiple var() calls confirmed |
| `PrayerMode.tsx` | `index.css` | var(--color-*) references | WIRED | Multiple var() calls confirmed |
| `ModeRouter.tsx` | all mode components | AnimatePresence wrapping | WIRED | AnimatePresence mode="wait" confirmed |

---

### Data-Flow Trace (Level 4)

Not applicable — this phase is a design compliance audit, not a data-rendering feature phase. Mode components consume data from Zustand store (WeatherMode, PrayerMode) or props (ListeningMode, SpeakingMode); data plumbing is out of scope for Phase 04.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Frontend build compiles clean | `npm run build` | ✓ built in 910ms, 0 errors | PASS |
| No string easing violations | grep easeInOut across modes | 0 matches | PASS |
| No hardcoded #0a0a0a | grep #0a0a0a across modes | 0 matches | PASS |
| No pure white text | grep #FFFFFF across modes | 0 matches | PASS |
| No 1px border violations | grep "border:" across modes (excl. radius) | 0 matches | PASS |
| Old token names removed | grep "surface-low[^e]" | 0 matches | PASS |
| surface-container-lowest present | grep in index.css | NOT FOUND | FAIL |
| WeatherMode null state uses token | grep "#0e0e0e" in WeatherMode | Line 91 match | FAIL |
| PrayerMode null state uses token | grep "#0e0e0e" in PrayerMode | Line 104 match | FAIL |

---

### Requirements Coverage

No formal requirement IDs were declared in any of the 5 plan frontmatter blocks (all `requirements: []`). Phase 04 was structured as a cross-cutting design quality gate with success criteria from the roadmap rather than tracked requirement IDs.

| Success Criterion | Status | Evidence |
|-------------------|--------|---------|
| Design tokens match Stitch — colors, typography, surface hierarchy | PARTIAL | 17/18 tokens; surface-container-lowest missing |
| ListeningMode/ThinkingMode/SpeakingMode/WeatherMode/PrayerMode match Stitch | PARTIAL | Main paths match; null states have hardcoded #0e0e0e |
| No-Line Rule — no 1px borders | SATISFIED | Zero violations found |
| Custom easing cubic-bezier(0.22, 1, 0.36, 1) for all transitions | SATISFIED | 11 array-form usages; zero string easing |
| Text colors use on-surface-variant — never pure white | SATISFIED | Zero #FFFFFF; 12 on-surface-variant usages |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/src/modes/WeatherMode.tsx` | 91 | `background: '#0e0e0e'` hardcoded in null state | Warning | If token value ever changes, null state diverges visually |
| `frontend/src/modes/PrayerMode.tsx` | 104 | `background: '#0e0e0e'` hardcoded in null state | Warning | Same as above |
| `frontend/src/index.css` | (absent) | `--color-surface-container-lowest` not defined | Warning | Plan 01 acceptance criteria lists this as required; if any mode references it, renders transparent |

Note: The `#e8e8e8` near-white in WeatherMode (line 134) and PrayerMode (line 154) are intentional per design comments ("near-white, not pure #FFFFFF") and are NOT violations — they comply with the No-Pure-White rule.

---

### Human Verification Required

#### 1. Visual Fidelity Against Stitch Screens

**Test:** Deploy locally (`cd frontend && npm run dev`), open in iPad Safari (or desktop browser), navigate through each mode: Idle orb, Listening, Thinking, Speaking, Weather, Prayer.

**Expected:** Each matches its Stitch screen — OrbAnimation breathes with correct blue-to-purple shift; ListeningMode shows #85adff waveform on dark background; ThinkingMode shows breathing orb with ambient glow; SpeakingMode shows #ad89ff waveform with glassmorphism subtitle card; WeatherMode shows temperature in Space Grotesk with glassmorphism hourly cards; PrayerMode shows next prayer name large with glassmorphism rows.

**Why human:** Visual appearance, backdrop-blur rendering quality, and layout fidelity require eyes-on verification against the Stitch reference images.

#### 2. Mode Transition Easing Feel

**Test:** Trigger mode transitions by simulating voice states (idle → listening → thinking → speaking → idle).

**Expected:** Transitions feel weighted/glass-like, not the default snappy React fade. The cubic-bezier(0.22, 1, 0.36, 1) "heavy glass" easing should be perceptibly different from a standard ease-in-out.

**Why human:** Easing perception is subjective and requires real interaction; cannot be verified by code inspection alone.

---

### Gaps Summary

Two categories of gaps were found:

**Gap 1 — Missing token (minor, low-risk):** `--color-surface-container-lowest` is absent from the `@theme` block in `frontend/src/index.css`. Plan 01 explicitly listed this as a required acceptance criterion. The value `#0b0b0b` was proposed as fallback. No mode currently references this token by name, so the impact is limited — but it was a stated deliverable and is absent.

**Gap 2 — Hardcoded backgrounds in null states (minor, consistency):** Both `WeatherMode.tsx` (line 91) and `PrayerMode.tsx` (line 104) use the literal string `'#0e0e0e'` in their data-unavailable fallback renders. The value happens to match `--color-background`, so visually identical today, but this is inconsistent with the token-first pattern enforced everywhere else. The plan for PrayerMode explicitly stated "REPLACE `background: '#0e0e0e'` with `background: 'var(--color-background)'`" — meaning the main component path was fixed, but the null state was overlooked.

These are both minor consistency/completeness issues rather than blocking visual failures. The core goal — all 5 modes matching their Stitch screens with correct tokens, easing, and glassmorphism — is substantially achieved.

---

_Verified: 2026-04-09_
_Verifier: Claude (gsd-verifier)_

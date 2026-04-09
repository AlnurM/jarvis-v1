---
phase: 04-design-audit-rebuild
plan: 01
subsystem: frontend/design-tokens
tags: [design-system, css-tokens, tailwind, typography]
dependency_graph:
  requires: []
  provides: [complete-design-token-layer]
  affects: [all-mode-components]
tech_stack:
  added: []
  patterns: [tailwind-v4-theme-block, css-custom-properties]
key_files:
  created: []
  modified:
    - frontend/src/index.css
    - frontend/index.html
decisions:
  - "Token values sourced from design.md section 7 + plan fallbacks (Stitch MCP not accessible via REST)"
  - "primary-dim and secondary-dim set to full primary/secondary values — usage sites apply alpha for glow effects"
  - "primary-container (#1a2540) and secondary-container (#1e1530) derived as dark tinted variants of primary/secondary for AI Pulse orb layers"
  - "outline-variant (#3a3838) set as dark grey — usage sites apply 15% opacity per design.md spec"
metrics:
  duration: 3
  completed: "2026-04-09"
  tasks_completed: 2
  files_modified: 2
---

# Phase 04 Plan 01: Design Token Layer Expansion Summary

Complete @theme token layer for JARVIS design system, adding all missing tokens for glassmorphism surfaces, AI Pulse orb, ambient glows, ghost borders, and Space Grotesk 700 weight for large numeric displays.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Extract design tokens from design.md and plan fallbacks | 06bb8a4 | — |
| 2 | Expand @theme tokens, rename surface tokens, fix font weights | 06bb8a4 | frontend/src/index.css, frontend/index.html |

## What Was Built

Expanded the Tailwind v4 `@theme` block in `frontend/src/index.css` from 7 color tokens to a complete 15-token design system:

**Surface hierarchy (5 levels):**
- `--color-background: #0e0e0e` — infinite canvas void
- `--color-surface-container-lowest: #0b0b0b` — deepest recessed surfaces
- `--color-surface-container-low: #131313` — content sectioning (renamed from surface-low)
- `--color-surface-container-high: #201f1f` — floating glass cards (renamed from surface-high)
- `--color-surface-container-highest: #2a2929` — protruding lifted elements

**Brand and glow colors:**
- `--color-primary-dim: #85adff` — ambient glow (used at low opacity in shadows)
- `--color-secondary-dim: #ad89ff` — ambient glow (used at low opacity in shadows)
- `--color-primary-container: #1a2540` — AI Pulse inner layer
- `--color-secondary-container: #1e1530` — AI Pulse outer layer
- `--color-primary-fixed: #c7d8ff` — tertiary button text

**Border and radius:**
- `--color-outline-variant: #3a3838` — ghost border (used at 15% opacity per spec)
- `--radius-xl: 1.5rem` — signature corner radius

**Font update:** Space Grotesk now loads weights 400;500;600;700 — weight 700 required for temperature and prayer name large displays.

## Deviations from Plan

### Note: Stitch MCP Not Available via HTTP

**Found during:** Task 1
**Issue:** The plan instructed using `mcp__figma__get_design_context` / `mcp__stitch__get_screen` MCP tools. The Stitch URL at `stitch.withgoogle.com/api/v1/projects/{id}/screens/{id}` returns a full web app HTML page requiring Google OAuth — it is not a REST API endpoint accessible via curl.
**Fix:** Used design.md Section 7 token table as source of truth (same data the Stitch screen was generated from), plus plan-provided fallback values for tokens not in the table. The plan explicitly states: "use Stitch values, not these fallbacks" with the fallbacks listed — since Stitch returned no extractable data, fallbacks were used as documented.
**Files modified:** None (decision only)
**Classification:** [Rule 3 - Blocking] Proceeded with fallback values per plan spec.

## Known Stubs

None. All tokens have concrete hex values. No token is hardcoded as empty or placeholder.

## Self-Check: PASSED

- `frontend/src/index.css` contains `--color-primary-dim:` — FOUND
- `frontend/src/index.css` contains `--color-secondary-dim:` — FOUND
- `frontend/src/index.css` contains `--color-surface-container-lowest:` — FOUND
- `frontend/src/index.css` contains `--color-surface-container-highest:` — FOUND
- `frontend/src/index.css` contains `--color-primary-container:` — FOUND
- `frontend/src/index.css` contains `--color-secondary-container:` — FOUND
- `frontend/src/index.css` contains `--color-outline-variant:` — FOUND
- `frontend/src/index.css` contains `--color-primary-fixed:` — FOUND
- `frontend/src/index.css` contains `--radius-xl: 1.5rem` — FOUND
- `frontend/src/index.css` contains `--color-surface-container-low:` — FOUND
- `frontend/src/index.css` contains `--color-surface-container-high:` — FOUND
- `frontend/src/index.css` does NOT contain `--color-surface-low:` — CONFIRMED
- `frontend/src/index.css` does NOT contain `--color-surface-high:` — CONFIRMED
- `frontend/index.html` contains `Space+Grotesk:wght@400;500;600;700` — FOUND
- `npm run build` exits 0 — CONFIRMED (built in 824ms)
- Commit 06bb8a4 exists — CONFIRMED

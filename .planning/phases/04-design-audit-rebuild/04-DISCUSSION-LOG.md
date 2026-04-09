# Phase 4: Design Audit & Rebuild - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 04-design-audit-rebuild
**Areas discussed:** Stitch-first workflow, Token completeness, Mode rebuild scope, Animation audit
**Mode:** --auto (all decisions auto-selected)

---

## Stitch-First Workflow

| Option | Description | Selected |
|--------|-------------|----------|
| Pull each Stitch screen via MCP, compare, rebuild per-mode | Stitch screen is source of truth | ✓ |
| Use design.md text spec only | Rely on written spec without visual reference | |
| Screenshot current UI and compare manually | Manual visual diff | |

**User's choice:** [auto] Pull each Stitch screen via MCP, compare, rebuild per-mode (recommended default)
**Notes:** Key difference from reverted Phase 4 attempt — Stitch MCP is now connected

---

## Token Completeness

| Option | Description | Selected |
|--------|-------------|----------|
| Expand @theme to full design.md spec | Add all missing tokens before mode rebuilds | ✓ |
| Add tokens incrementally per mode | Only add tokens as each mode needs them | |
| Keep current tokens, override inline | Use inline styles for missing tokens | |

**User's choice:** [auto] Expand @theme to full design.md spec (recommended default)
**Notes:** Current @theme has 7 tokens; design.md specifies ~15+

---

## Mode Rebuild Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Per-mode targeted rebuild | Compare against Stitch screen, fix only divergences | ✓ |
| Full rewrite of all modes | Rebuild from scratch regardless of current state | |
| Batch all modes in one pass | Single large refactor across all files | |

**User's choice:** [auto] Per-mode targeted rebuild (recommended default)
**Notes:** Minimizes churn while ensuring Stitch fidelity

---

## Animation Audit

| Option | Description | Selected |
|--------|-------------|----------|
| Audit all transitions for --ease-glass + AI Pulse spec | Comprehensive easing and animation check | ✓ |
| Only check ModeRouter transitions | Limited to mode switching only | |
| Skip animation audit | Trust existing animations | |

**User's choice:** [auto] Audit all transitions for --ease-glass + AI Pulse spec (recommended default)
**Notes:** design.md explicitly prohibits standard 400ms easing

---

## Claude's Discretion

- CSS custom property naming (as long as they map to design.md tokens)
- Component internal structure (visual output must match Stitch)

## Deferred Ideas

None — discussion stayed within phase scope

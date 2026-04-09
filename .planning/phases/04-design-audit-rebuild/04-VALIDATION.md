---
phase: 4
slug: design-audit-rebuild
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend) + pytest 7.x (backend — not needed this phase) |
| **Config file** | `frontend/vite.config.ts` |
| **Quick run command** | `cd frontend && npx vitest run --reporter=verbose 2>&1 \| tail -20` |
| **Full suite command** | `cd frontend && npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | Design tokens | grep | `grep 'primary-container' frontend/src/index.css` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | ListeningMode match | visual | Stitch comparison | N/A | ⬜ pending |
| 04-02-02 | 02 | 2 | ThinkingMode match | grep+visual | `grep 'ease-glass' frontend/src/components/OrbAnimation.tsx` | ❌ W0 | ⬜ pending |
| 04-02-03 | 02 | 2 | SpeakingMode match | visual | Stitch comparison | N/A | ⬜ pending |
| 04-03-01 | 03 | 2 | WeatherMode match | visual | Stitch comparison | N/A | ⬜ pending |
| 04-03-02 | 03 | 2 | PrayerMode match | visual | Stitch comparison | N/A | ⬜ pending |
| 04-04-01 | 04 | 3 | Easing audit | grep | `grep -r 'easeInOut\|ease-in-out\|0.3s ease' frontend/src/` | ✅ | ⬜ pending |
| 04-04-02 | 04 | 3 | No-line rule | grep | `grep -r '1px solid\|border:' frontend/src/modes/ frontend/src/components/` | ✅ | ⬜ pending |
| 04-04-03 | 04 | 3 | Text color audit | grep | `grep -r '#FFFFFF\|#ffffff\|#FFF\|#fff' frontend/src/modes/` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements. This is primarily a visual/CSS rebuild phase — most validation is visual comparison against Stitch screens plus grep-based audits.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pixel-perfect mode match | SC-2 | Visual comparison requires human eye | Compare each mode screenshot against its Stitch screen side-by-side |
| Glassmorphism depth perception | SC-1 | Subjective visual quality | Verify glass cards feel "within" the screen, not "on" it |
| Animation smoothness | SC-4 | Frame rate perception | Watch mode transitions on iPad, confirm no jank |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

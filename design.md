## Stitch Instructions

Get the images and code for the following Stitch project's screens:

## Project

ID: 7359010342585899885

## Screens:
1. Design System
    ID: asset-stub-assets-12c7eab3ced040a3bf6965e467c9a5cf-1775654289866

2. Speaking Mode
    ID: 8554ef1a3efa42f9a07ad8774a690a7d

3. Listening Mode
    ID: d6bf4b24d8844d3ba4aa32d422a6a8c4

4. Search Results
    ID: 3e95776a0f2243ceb2bd8c966ab8c368

5. Thinking Mode
    ID: c121cc95f2e149a0873accbd6c47d7bd

6. Calendar Mode
    ID: a1675c55d4ab4f849786518aae336d11

7. Weather Mode
    ID: 46d9c2600c1948658c68a31705074ca7

8. Prayer Times Mode
    ID: b9c8cef5cb4b4a9db5931e80797efe16

9. Morning Briefing Mode
    ID: 92bd7c820b7e4ed59a30e490b0de8eac

Use a utility like `curl -L` to download the hosted URLs.



# Design System Document: High-Tech Editorial AI Interface

## 1. Overview & Creative North Star
**The Creative North Star: "The Ethereal Intelligence"**

This design system moves away from the rigid, boxy layouts of traditional dashboards toward a fluid, cinematic experience. It is designed to feel less like a "tool" and more like a "presence." By leveraging the iPad’s high-density display, we utilize expansive negative space, intentional asymmetry, and deep tonal layering to create an environment that feels expensive and infinitely deep.

The core philosophy is **Subtractive Sophistication**. We do not use lines to define space; we use light, blur, and shifts in matte depth. The interface should feel like a high-end physical glass console floating in a dark room, where information isn't "on" the screen, but "within" it.

---

## 2. Colors & Surface Philosophy

### The "No-Line" Rule
Traditional 1px borders are strictly prohibited for sectioning. They shatter the illusion of a seamless glass interface. Boundaries must be defined solely through:
1.  **Background Shifts:** Transitioning from `surface` to `surface-container-low`.
2.  **Luminous Depth:** Using `primary-dim` or `secondary-dim` glow to imply an edge.
3.  **Backdrop Blurs:** Using the glassmorphism technique to separate layers.

### Surface Hierarchy & Nesting
Treat the iPad screen as a 3D space. 
- **The Void:** Use `background` (#0e0e0e) for the deepest layer.
- **The Foundation:** Large content areas use `surface-container-low`.
- **The Interaction Layer:** Floating cards and active modules use `surface-container-high` with a 20% opacity alpha channel and a 20px–40px backdrop blur.
- **The "Glass & Gradient" Rule:** Main CTAs or active AI status indicators should never be flat. Use a linear gradient from `primary` (#85adff) to `secondary` (#ad89ff) at a 135-degree angle to provide "soul" and kinetic energy.

---

## 3. Typography
The system uses a dual-font approach to balance technical precision with editorial authority.

*   **Inter:** Used for all functional data, body text, and headlines. It provides a clean, neutral "system" feel.
*   **Space Grotesk:** Used for `label` styles to provide a "technical readout" aesthetic, reminiscent of high-tech instrumentation.

### Scale Strategy
- **Display (Large/Medium):** Used for AI personality prompts or key metrics. Keep tracking at -2% for a premium, tight look.
- **Headline (Small):** Used for card titles. Always in `on-surface`.
- **Labels:** Use `Space Grotesk` in `on-surface-variant` with 5% letter spacing to evoke a "NASA-spec" data visualization feel.

---

## 4. Elevation & Depth

### The Layering Principle
Depth is achieved through **Tonal Stacking**. An inner container must always be a tier "higher" than its parent. 
*Example:* A `surface-container-lowest` card sitting inside a `surface-container-low` section creates a recessed "carved" look. Conversely, `surface-container-highest` on `surface` creates a protruding "lifted" look.

### Ambient Shadows & Glows
- **Shadows:** Never use black (#000) for shadows. Use a diffused `primary-dim` or `secondary-dim` shadow at 4-6% opacity with a blur radius of 30px+. This mimics the light emitted from the glass itself.
- **The Ghost Border:** If a boundary is required for accessibility, use `outline-variant` at 15% opacity. It should be felt, not seen.
- **Glassmorphism:** All floating cards must utilize `backdrop-filter: blur(24px)` and a subtle `linear-gradient(top-left, rgba(255,255,255,0.05), rgba(255,255,255,0))`.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `secondary`). No border. `xl` roundedness.
- **Secondary:** Glass-filled (`surface-container-high` at 40% opacity) with a `Ghost Border`.
- **Tertiary:** Text only in `primary-fixed`, using `label-md` for a technical look.

### Input Fields
- **Design:** Forgo the "box." Use a `surface-container-highest` bottom-only highlight or a subtle inner-glow. 
- **States:** On focus, the background should transition from `surface-container-low` to `surface-container-highest` with a soft `primary` outer glow.

### Cards & Lists
- **Rule:** No dividers. Separate list items using 16px of vertical white space or by alternating between `surface-container-low` and `surface-container-lowest` backgrounds.
- **Interactivity:** On hover/touch, cards should scale slightly (1.02x) and increase the backdrop-blur intensity.

### The "AI Pulse" (Custom Component)
A signature element representing the 'JARVIS' state. A multi-layered orb using `primary-container` and `secondary-container` with varying levels of Gaussian blur (40px to 80px) and a slow "breathing" opacity animation (40% to 100%).

---

## 6. Do's and Don'ts

### Do
- **Do** use asymmetrical margins. A wider left margin for navigation and a tighter right margin for data creates a sophisticated, modern flow.
- **Do** lean into `surface-container-lowest` for "cut-out" search bars.
- **Do** use `primary` and `secondary` sparingly to draw the eye to high-value actions only.

### Don't
- **Don't** use pure white (#FFFFFF) for body text. Use `on-surface-variant` (#adaaaa) to reduce eye strain in the dark UI.
- **Don't** use standard 400ms easing. Use custom Cubic Bezier transitions `(0.22, 1, 0.36, 1)` for a "heavy" glass sliding feel.
- **Don't** use icons with varying line weights. Stick to 1.5pt stroke icons to match the `Inter` typography weight.

---

## 7. Token Reference Summary

| Token | Value | Role |
| :--- | :--- | :--- |
| `background` | #0e0e0e | The infinite canvas |
| `primary` | #85adff | Electric Blue (Action/Active) |
| `secondary` | #ad89ff | Deep Violet (Atmospheric/Secondary) |
| `surface-container-low` | #131313 | Content sectioning |
| `surface-container-high` | #201f1f | Floating glass cards |
| `rounded-xl` | 1.5rem | Signature corner radius |
| `font-display` | Inter | Bold, authoritative headlines |
| `font-label` | Space Grotesk | Technical metadata |
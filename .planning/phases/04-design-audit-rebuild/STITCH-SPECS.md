# Stitch Design Specs — Extracted from MCP

These are the EXACT values from Stitch screens. Use these, not guesses.

## Thinking Mode (screen: c121cc95f2e149a0873accbd6c47d7bd)

**AI Pulse Orb:**
- Outer layer: radial-gradient(circle, rgba(133, 173, 255, 0.8) 0%, rgba(173, 137, 255, 0.2) 70%, transparent 100%)
- Inner layer: radial-gradient(circle at center, rgba(255, 255, 255, 0.03) 0%, transparent 70%)
- Outer blur: filter: blur(80px)
- Inner blur: filter: blur(40px)
- Box shadow: 0 0 100px rgba(133, 173, 255, 0.4)
- Opacity layers: 0.8, 0.3
- Blend mode: screen
- Container perspective: 1000px
- Backdrop filter: blur(2px)
- Background: #0e0e0e (NOT #0a0a0a)

## Listening Mode (screen: d6bf4b24d8844d3ba4aa32d422a6a8c4)

- Background: #0e0e0e
- Wave color: primary #85adff
- "Listening..." text: on-surface-variant or similar muted
- Backdrop filter: blur(40px) on glass elements
- Orb glow: filter blur(60px)
- Background surface: rgba(32, 31, 31, 0.4) with backdrop-filter: blur(40px)

## Speaking Mode (screen: 8554ef1a3efa42f9a07ad8774a690a7d)

- Background: #0e0e0e
- Wave color: secondary #ad89ff
- Glass card for subtitles: background linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%) + backdrop-filter: blur(24px)
- No 1px borders

## Weather Mode (screen: 46d9c2600c1948658c68a31705074ca7)

- Background: #0e0e0e
- Glass card: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%) + backdrop-filter: blur(24px)
- Weather particle gradient: linear-gradient(to bottom, rgba(133, 173, 255, 0.4), transparent)
- Scale transform on hover/touch: 1.02
- Border radius: 1.5rem (xl)
- AI Pulse background: radial-gradient(circle, rgba(133,173,255,0.08) 0%, rgba(173,137,255,0.03) 50%, rgba(14,14,14,0) 70%) + filter blur(60px) + 600x600px

## Prayer Times Mode (screen: b9c8cef5cb4b4a9db5931e80797efe16)

- Background: #0e0e0e
- Glass card: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%) + backdrop-filter: blur(24px)
- Text font: Inter (headings), Space Grotesk (labels)
- Border radius: 1.5rem

## Common Design Rules

- Body text: on-surface-variant #adaaaa (NEVER pure white #FFFFFF)
- Headline text: on-surface #e6e1e5 or #ffffff for emphasis
- Glass card gradient: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0))
- Glass backdrop: backdrop-filter: blur(24px)
- No 1px borders anywhere
- Easing: cubic-bezier(0.22, 1, 0.36, 1)
- Shadows: diffused primary-dim or secondary-dim at 4-6% opacity, blur 30px+
- Never use black (#000) for shadows

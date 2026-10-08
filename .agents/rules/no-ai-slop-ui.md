# No AI Slop UI & Motion Design Rules

This is a permanent rule for all frontend and UI work in this repository.
The design standard is **Linear, Raycast, Stripe, GitHub**: functional, restrained, clean, honest, and grounded.

---

## 1. Visual Anti-Patterns (NEVER USE)

- **NO Glassmorphism / Frosted Panels**: Never use `backdrop-filter: blur(...)` on cards, headers, buttons, or dropdowns. Use solid, opaque or high-opacity neutral surfaces (`var(--s1)`, `var(--s2)`, `var(--s4)`).
- **NO Glowing or Saturated Shadows**: Never use neon/accent drop shadows (e.g. `box-shadow: 0 4px 14px color-mix(in srgb, var(--acc) 30%, transparent)`). Use crisp, subtle neutral drop shadows (`0 2px 8px rgba(0, 0, 0, 0.08)` or `0 4px 14px rgba(0, 0, 0, 0.18)`).
- **NO Pill Buttons Everywhere**: Never use `border-radius: 9999px` / `99px` on regular buttons, select triggers, or form fields. Keep radius disciplined: `4px–6px` (`var(--rad-sm)`) for controls, `8px–10px` (`var(--rad)`) for containers.
- **NO Gratuitous Gradients**: No gradient button fills, gradient borders, or gradient text. Use solid colors mapped through the project's CSS variables (`--acc`, `--tx`, `--bd`, `--s1`–`--s4`).
- **NO Detached Floating Panels**: Navigation bars, sidebars, and toolbars must be grounded with 1px solid borders (`var(--bd)`), not floating detached shells.
- **NO Eyebrow Labels**: Do not add decorative `<small>CATEGORY</small>` tags above headings or generic marketing copy like "Elevate your workflow".

---

## 2. Motion Anti-Patterns (NEVER USE)

- **NO Scale Transforms on Hover**: Never apply `transform: scale(1.02)` or `whileHover={{ scale: 1.02 }}` to cards, buttons, or list items. Hover feedback must be color/border-only.
- **NO Hover Lift / Jitter**: Never use `transform: translateY(-2px)` or `-4px` on hover for buttons or cards. Buttons must feel solidly grounded on the page.
- **NO Bouncy Spring Physics**: Avoid spring overshoots, elastic bounciness, and wobble. Micro-animations should be swift and decisive.
- **NO Sluggish Transitions (>200ms)**: UI controls (buttons, inputs, dropdown items) must transition in `100ms–160ms`. Never use `0.3s` or `0.4s` for simple hover states.
- **NO `transition: all`**: Always specify explicit transition properties: `background-color`, `border-color`, `color`, `box-shadow`, `opacity`.
- **NO Dramatic Fly-in Entrances**: Dropdowns and popovers must never fly in from 10px–20px away. Use a soft micro-shift of at most 2px–3px with an opacity fade.

---

## 3. The "No-Slop" Golden Standard for Buttons & Dropdowns

### Buttons
- **Hover**: Background shift (e.g. `var(--s2)` to `var(--s3)` or slight lightness shift) and/or 1px border color change (`var(--bd)` to `var(--acc)`).
- **Active / Press**: Subtle darkening or slight opacity drop (`0.92`), zero transform scale.
- **Transition**: `transition: background-color 0.14s ease, border-color 0.14s ease, color 0.14s ease, box-shadow 0.14s ease;`.
- **Focus**: Clean outline ring `outline: 2px solid var(--acc); outline-offset: 2px;`.

### Dropdown Menus
- **Surface**: Solid background (`var(--s1)` or `var(--s2)`), 1px solid border (`var(--bd)`), subtle shadow (`0 4px 16px rgba(0, 0, 0, 0.18)`).
- **Entrance Animation**: 
  - Micro-shift: `translateY(-3px)` to `translateY(0)`.
  - Opacity: `0` to `1`.
  - Timing: `140ms cubic-bezier(0.16, 1, 0.3, 1)` or `140ms ease-out`.
- **Chevron Rotation**: `140ms ease` without bounce.
- **Items**: 100% width, left-aligned, `6px` padding, subtle `var(--s3)` background hover in `120ms ease`.

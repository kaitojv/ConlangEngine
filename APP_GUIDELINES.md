# Project Orientation & AI Guidelines

This document serves as a guide for AI agents (like Antigravity) to understand the architecture, coding standards, and critical patterns of the Conlang Engine React application.

## 1. State Management (Zustand Stores)
The app uses Zustand for state management. **Always check the stores** before implementing logic that might duplicate existing state.

- **`useConfigStore`**: Primary configuration and project metadata (phonology, grammar, theme, etc.).
- **`useLexiconStore`**: Manages the dictionary/lexicon entries.
- **`useProjectStore`**: Handles project archiving and local/cloud persistence.

### Critical Rule: Schema Validation
Whenever adding a new field to `useConfigStore`'s `INITIAL_CONFIG`:
- **MUST** update `VALID_CONFIG_KEYS` in `src/utils/schemaValidator.jsx`.
- **Note**: `sentenceMaps` was recently added and needs to be included in the validator to prevent data loss during sync.

## 2. Theme System & Styling
The app uses a dynamic theme system powered by `useThemeInjector`.

### CSS Variable Usage
Never use hardcoded colors. Always use the following CSS variables which are dynamically updated:
- `--bg`: Main background
- `--h-bg`: Header background
- `--s1`, `--s2`, `--s3`, `--s4`: Surface levels (from darkest/main to lightest/accented)
- `--tx`, `--tx2`: Primary and secondary text colors
- `--acc`, `--acc2`, `--acc3`: Primary, secondary, and tertiary accents
- `--bd`: Border color
- `--blur`, `--glow`: Visual effects

### CSS Policy
- **No Inline Styles**: All styling must reside in a separate `.css` file.
- **Exceptions**: Dynamic calculations (e.g., tooltip positions) or user-selected colors from a palette that cannot be pre-defined.
- **File Naming**: Keep CSS files next to their components (e.g., `AlignerTab.jsx` -> `alignertab.css`).

## 3. Supabase Integration
- Use `supabaseClient.js` for all database interactions.
- **Do not conflict with existing configs**: Be careful when modifying `.env` or project sync logic.
- Ensure any changes to data structures are compatible with the Supabase profiles and project archives.

## 4. UI Components & UX
- **Theme Injector & Presets**: Everything must follow the `themeInjector` and `themePresets` logic. **Never redefine theme arrays locally** in components; always import from `src/utils/themePresets.js`.
- Use existing UI components from `src/components/UI` (Card, Button, Dropdown, etc.) for consistency.
- **PERMANENT NO SLOP UI RULE**: Follow the "No Slop UI" aesthetic (Linear / Stripe / GitHub benchmark): functional, honest, clean, and normal.
  - **Banned Visuals**: NO glassmorphism (`backdrop-filter: blur`), NO glowing/neon shadows, NO gradient buttons or borders, NO pill buttons (`border-radius: 9999px`), NO detached floating shells.
  - **Banned Motion**: NO hover scaling (`scale(1.02)`), NO hover lift (`translateY(-2px)`), NO bouncy spring overshoots, NO sluggish >200ms transitions, NO `transition: all`.
  - **Motion Standard**: 100ms–160ms ease-out transitions on explicit properties (`background-color`, `border-color`, `color`, `box-shadow`, `opacity`). Dropdown entrances use soft micro-shifts (max 2–3px translateY + opacity fade in ~140ms).
  - Full rule specification: See `.agents/rules/no-ai-slop-ui.md`.

## 5. Development Workflow
- **Verify Persistence**: Always check if a new feature needs to be saved in the config store.
- **Routing**: Ensure new pages are registered in `App.jsx`.
- **Activity Logging**: Use `logActivity` in `useConfigStore` for major user actions.

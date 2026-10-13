# Multilanguage (i18n) Rule — Mandatory for Every Change

This is a permanent rule for **all** feature work, bug fixes, and UI changes in this repository.
The app is fully multilingual; no change may ship user-facing text in only one language.

---

## 1. Supported Languages

Defined in `src/i18n/index.js` (`SUPPORTED_LANGUAGES`):

| Code | Language |
|------|----------|
| `en` | English (source of truth / fallback) |
| `pt` | Português (Brasil) |
| `es` | Español |
| `fr` | Français |
| `ru` | Русский |
| `zh` | 简体中文 |
| `ja` | 日本語 |

If a language is added to `SUPPORTED_LANGUAGES`, it becomes part of this rule automatically.

## 2. Hard Rules

- **NO hardcoded user-facing strings** in JSX, toasts (`react-hot-toast`), `alert`/`confirm`, modal titles, button labels, placeholders, `title`/`aria-label` attributes, empty states, error messages, or status text. Always use `t('namespace.key')` from `useTranslation()`.
- **Every new key MUST be added to ALL 7 locales in the same change.** Never rely on the English fallback in `t()` — the fallback exists only as a safety net, not as a workflow.
- **Real translations only.** Write natural, correct translations for each language. Do not copy English text into other locale files as a placeholder.
- **Keep key structure identical** across all locales (same nesting, same key names, same order where practical).
- **Interpolation:** use `{varName}` placeholders (e.g. `t('sync.devicesOnline', { count })`). Every locale must keep the exact same placeholder names.
- **Editing existing text:** if you change the meaning of an English string, update all 6 other locales too.
- **Removing features:** delete the now-unused keys from all locales.

## 3. Where Keys Live

- Main dictionaries: `src/i18n/locales/{lang}.js`.
- Large feature areas have their own sub-folder (`profile/`, `help/`, `wiki/`, `aligner/`, `courseBuilder/`, `exercisePlayer/`, `howToStart/`), each with one file per language, imported and spread into the main `{lang}.js`.
- For a **new large feature** (≈ 20+ keys), create a new sub-folder `src/i18n/locales/<feature>/{en,pt,es,fr,ru,zh,ja}.js` and import it in all 7 main locale files, following the existing pattern.
- For small additions, add a namespaced block to the main `{lang}.js` files.

## 4. Exceptions (do NOT translate)

- User-generated content (conlang words, translations, wiki text, names).
- IPA symbols, linguistic notation, code identifiers, file extensions.
- `console.*` developer logs.

## 5. Verification Checklist (before finishing any task)

1. Search changed files for hardcoded strings in JSX/toasts.
2. Confirm every new `t('...')` key exists in **all 7** locale files.
3. Confirm placeholder names match across locales.
4. Run `npx eslint` on modified files and `vite build` (locale files are JS — a missing comma breaks the build).

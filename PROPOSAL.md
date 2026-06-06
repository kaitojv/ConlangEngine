# PR Proposal: Automatic Local Backup System

> **⚠️ IMPORTANT — Companion Plugin Required**
>
> This feature talks to a local REST API server that does **not** live in this repo. The matching Obsidian plugin that runs the backup server is here:
>
> **https://github.com/niruhsa/ConlangEngine-Obsidian-Backup**
>
> You must install and run that plugin for backups to actually be saved. Without it, the app simply shows "server offline."

---

## What This Adds

Conlang Engine currently saves your work three ways: manual JSON export, a local in-browser archive, and optional Supabase cloud sync. None of them back up your work continuously, and none tell you whether your latest changes are safe.

This PR adds a fourth option: **automatic, continuous backups to a local server you control** (the Obsidian plugin above), plus a live status indicator so you always know if your work is saved.

## Why

- **No more lost work.** Forget to hit save? The app saves for you, in the background.
- **You own the data.** Backups go to a server running on your own machine, not the cloud.
- **You can see what's happening.** A small icon in the header tells you at a glance: saved, unsaved, saving, or server offline.
- **Per-project control.** Each conlang has its own backup settings. Turn it on for one project, leave it off for another.

## How It Works (Plain Version)

1. You turn on backups in **Settings → Backup** and point the app at your local server (default `http://localhost:3000`).
2. As you work, the app watches for changes.
3. After you stop typing (or click away from a field), it quietly saves a backup.
4. A status icon in the top bar shows the current state.

You stay in control of three behaviors:

- **Auto-save every X minutes** — a periodic safety net.
- **Auto-save on change** — saves shortly after you stop typing.
- **Overwrite window** — instead of creating a brand-new backup for every tiny edit, rapid changes reuse the same backup version for a few minutes, then start a fresh version. Keeps your backup history clean.

The system is also **dialog-aware**: while you have a popup open (creating a word, editing an entry), it waits until you confirm before saving, so it never captures half-finished edits.

## What You'll See

A new status icon appears in the header when backups are enabled:

| State | Meaning |
|-------|---------|
| Dimmed cloud | Backup disabled |
| Amber cloud | You have unsaved changes |
| Spinning cloud | Backing up now |
| Green check | Saved — shows the time |
| Red cloud-off | Server is offline |

And a new **Backup** tab in Settings with:
- On/off toggle
- Server URL field
- Auto-save interval (minutes)
- Auto-save-on-change toggle, debounce delay, and overwrite window
- A "Test Connection" button to confirm your server is reachable

## What This Does NOT Change

- Manual save/export still works exactly as before.
- The local archive still works.
- Supabase cloud sync still works, independently.
- Nothing about your existing data changes. This is purely additive.

## Scope

**Included:** backup settings (per project), the background save engine, the status icon, the settings panel, and integration with the existing word/lexicon screens.

**Not included (by design):** the server itself (that's the Obsidian plugin), backup history browsing, encryption, login/auth, and conflict resolution between local and remote. Those can come later.

## Supporting Changes in the Latest Commit

The most recent commit (`9972be5`) lays groundwork in the stores and modules the backup system relies on — project configuration, the lexicon store, the study and word-generator modules, and IndexedDB persistence for large assets. Notable touched files:

- `src/store/useConfigStore.jsx`, `src/store/useLexiconStore.jsx` — store updates the backup payload reads from
- `src/components/pages/study/StudyTab.jsx`, `src/components/pages/wordgenerator/GeneratorTab.jsx` — feature modules
- `src/utils/sm2.js`, `src/utils/schemaValidator.jsx` — supporting utilities

These don't add backups on their own, but they stabilize the data shape the backup payload captures.

## New & Changed Files (Planned)

**New:**
- `src/store/useBackupStore.jsx` — per-project backup settings + live status
- `src/utils/backupApi.js` — talks to the REST API
- `src/utils/backupPayload.js` — assembles what gets saved
- `src/hooks/useBackupEngine.jsx` — the background save logic
- `src/hooks/useModalTracker.jsx` — knows when a popup is open
- `src/components/pages/settings/BackupSettings.jsx` (+ CSS) — settings panel
- `src/components/Layout/NavBar/BackupStatusIcon.jsx` (+ CSS) — header status icon

**Edited:**
- `src/App.jsx` — starts the backup engine
- `src/components/pages/settings/Settings.jsx` — adds the Backup tab
- `src/components/Layout/Header/Header.jsx` — shows the status icon
- A handful of modal components (Create Word, Edit Word, Export, Import) — so they pause backups while open

## Risks & Mitigations

- **Server offline** → app keeps working, shows "offline," retries later. No work blocked.
- **Rapid typing flooding the server** → debounce + overwrite window keep requests sane.
- **Switching projects mid-save** → pending timers cancel cleanly, settings reload per project.
- **Large conlangs** → the payload strips heavy embedded assets (fonts, glyph blobs) before sending.

## Security Note

The backup server is bound to `127.0.0.1` only and accepts no external connections, so there is no network exposure. CORS is pre-configured for localhost and the production app domain. No authentication is required because the server is local-only.

## Try It

1. Install and run the Obsidian plugin: https://github.com/niruhsa/ConlangEngine-Obsidian-Backup
2. In Conlang Engine, open **Settings → Backup**, enable it, and set the server URL.
3. Click **Test Connection** to confirm.
4. Edit your conlang and watch the header icon turn green.

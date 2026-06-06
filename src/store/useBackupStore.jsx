// src/store/useBackupStore.jsx
// Runtime status + persisted per-project metadata for the REST API backup system.
//
// `status` is ephemeral UI state (shown in the navigation bar status icon).
// `meta` is persisted per-project so we can:
//   - resume the "reuse one backup for X minutes" window across reloads
//   - detect when a remote backup is newer than what this device last saved
//     (basic multi-device sync on startup).

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Status values surfaced to the UI.
export const BACKUP_STATUS = {
    DISABLED: 'disabled',   // backup not enabled for this project
    SAVED: 'saved',         // in sync with server
    UNSAVED: 'unsaved',     // local changes not yet pushed
    SAVING: 'saving',       // request in flight
    OFFLINE: 'offline',     // server unreachable
    ERROR: 'error',         // last request failed
};

export const useBackupStore = create(
    persist(
        (set, get) => ({
            // ── Ephemeral runtime state ──
            status: BACKUP_STATUS.DISABLED,
            lastError: null,
            // Whether the most recent health check found the server online.
            online: false,
            // Epoch ms until which store-change detection is ignored (during restores).
            suppressUntil: 0,

            // ── Persisted per-project metadata: { [projectId]: ProjectMeta } ──
            // ProjectMeta = {
            //   lastBackupTime: ISO string of last successful push from this device,
            //   reuseVersion: version string currently being overwritten (reuse mode),
            //   reuseWindowStart: epoch ms when the current reuse window opened,
            // }
            meta: {},

            setStatus: (status, lastError = null) => set({ status, lastError }),
            setOnline: (online) => set({ online }),

            // Ignore local store changes for the next `ms` (used while restoring a
            // remote backup so we don't immediately re-push the loaded data).
            suppress: (ms = 1500) => set({ suppressUntil: Date.now() + ms }),
            isSuppressed: () => Date.now() < get().suppressUntil,

            getMeta: (projectId) => get().meta[projectId] || null,

            setMeta: (projectId, patch) =>
                set((state) => ({
                    meta: {
                        ...state.meta,
                        [projectId]: { ...(state.meta[projectId] || {}), ...patch },
                    },
                })),

            // Open a new reuse window pinned to a freshly created version.
            startReuseWindow: (projectId, version) =>
                set((state) => ({
                    meta: {
                        ...state.meta,
                        [projectId]: {
                            ...(state.meta[projectId] || {}),
                            reuseVersion: version,
                            reuseWindowStart: Date.now(),
                        },
                    },
                })),

            // Clear the reuse window (e.g. window expired or reuse disabled).
            clearReuseWindow: (projectId) =>
                set((state) => ({
                    meta: {
                        ...state.meta,
                        [projectId]: {
                            ...(state.meta[projectId] || {}),
                            reuseVersion: null,
                            reuseWindowStart: null,
                        },
                    },
                })),
        }),
        {
            name: 'conlang-backup-meta',
            // Only persist per-project meta; status/online are runtime-only.
            partialize: (state) => ({ meta: state.meta }),
        },
    ),
);

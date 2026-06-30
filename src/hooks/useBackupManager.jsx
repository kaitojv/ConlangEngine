// src/hooks/useBackupManager.jsx
// Orchestrates the REST API backup system. Mounted once (in App).
//
// Responsibilities:
//   - On startup (when enabled + server online): load the latest remote backup
//     if it is newer than what this device last pushed (basic multi-device sync).
//   - Detect committed changes to config / lexicon / project archive and, when
//     "backup on each change" is on, push a debounced backup. The debounce means
//     typing settles before we save, and modal forms only trigger a backup once
//     they commit to a store (i.e. on Save/Update), not while editing.
//   - Periodic autosave on an interval.
//   - "Reuse one backup for X minutes": overwrite a single version during the
//     window instead of creating a new version per change.
//   - Maintain the status surfaced in the navigation-bar status icon.

import { useEffect, useRef } from 'react';
import { useConfigStore } from '../store/useConfigStore.jsx';
import { useLexiconStore } from '../store/useLexiconStore.jsx';
import { useProjectStore } from '../store/useProjectStore.jsx';
import { useBackupStore, BACKUP_STATUS } from '../store/useBackupStore.jsx';
import { sanitizeConfig } from '../utils/schemaValidator.jsx';
import { restoreBackupPayload } from '../utils/backupRestore.js';
import { isDesktopDevice } from '../utils/device.js';
import toast from 'react-hot-toast';
import {
    checkHealth,
    createBackup,
    updateBackup,
    getLatestBackup,
    getProjectMeta,
    normalizeEndpoint,
} from '../utils/backupClient.js';

const HEALTH_POLL_MS = 30000;

// Build the full BackupPayload from the live stores.
function buildPayload() {
    const config = sanitizeConfig(useConfigStore.getState(), true);
    const project = { localProjects: useProjectStore.getState().localProjects || [] };
    const lexicon = { lexicon: useLexiconStore.getState().lexicon || [] };
    return { config, project, lexicon };
}

// Max random pre-flight delay (ms). Spreads out backups when several tabs are
// open so they don't all push at the same instant — the later tab then sees
// the version the first tab created and can skip a duplicate.
const JITTER_MAX_MS = 1500;
const jitter = () => new Promise((r) => setTimeout(r, Math.floor(Math.random() * JITTER_MAX_MS)));

// Deterministic JSON (keys sorted) so payload comparison is order-independent.
function stableStringify(value) {
    const seen = new WeakSet();
    const norm = (v) => {
        if (v && typeof v === 'object') {
            if (seen.has(v)) return null;
            seen.add(v);
            if (Array.isArray(v)) return v.map(norm);
            return Object.keys(v).sort().reduce((acc, k) => {
                acc[k] = norm(v[k]);
                return acc;
            }, {});
        }
        return v;
    };
    try {
        return JSON.stringify(norm(value));
    } catch {
        return null;
    }
}

// True when two backup payloads represent identical state.
function payloadsEqual(a, b) {
    if (!a || !b) return false;
    const sa = stableStringify(a);
    const sb = stableStringify(b);
    return sa !== null && sa === sb;
}

export function useBackupManager() {
    // Subscribe to settings so the manager reconfigures when they change.
    const settings = useConfigStore((s) => s.backupSettings) || {};
    const projectId = useConfigStore((s) => s.projectId);

    // Mutable refs shared across async callbacks / subscriptions.
    const settingsRef = useRef(settings);
    const projectIdRef = useRef(projectId);
    const dirtyRef = useRef(false);
    const inFlightRef = useRef(false);
    const pendingRef = useRef(false);     // a change arrived mid-flight
    const debounceTimer = useRef(null);
    const autosaveTimer = useRef(null);
    const healthTimer = useRef(null);

    settingsRef.current = settings;
    projectIdRef.current = projectId;

    const store = useBackupStore;

    // ── Core push routine ─────────────────────────────────────────────
    // forceNew: ignore the reuse window and always create a fresh version
    //           (used by interval autosave).
    const performBackup = async (forceNew = false) => {
        const cfg = settingsRef.current;
        const pid = projectIdRef.current;
        // Desktop-only (Obsidian plugin) — never run on mobile/tablet.
        if (!isDesktopDevice()) return;
        if (!cfg?.enabled || !pid || !normalizeEndpoint(cfg.endpoint)) return;

        if (inFlightRef.current) {
            // Coalesce: remember we still have changes to push when this finishes.
            pendingRef.current = true;
            return;
        }

        inFlightRef.current = true;
        store.getState().setStatus(BACKUP_STATUS.SAVING);

        // Random pre-flight delay so multiple tabs de-sync (see JITTER_MAX_MS).
        await jitter();

        // Settings/project may have changed during the delay — re-validate.
        if (!isDesktopDevice() || !settingsRef.current?.enabled || projectIdRef.current !== pid) {
            inFlightRef.current = false;
            return;
        }

        const endpoint = cfg.endpoint;
        // Build AFTER the delay so we capture the latest local state.
        const payload = buildPayload();
        const meta = store.getState().getMeta(pid);

        // Dedupe across tabs: if the server's latest backup is identical to what
        // we're about to push, skip creating/overwriting and just sync our meta.
        try {
            const remoteMeta = await getProjectMeta(endpoint, pid);
            if (remoteMeta) {
                const latestRemote = await getLatestBackup(endpoint, pid);
                if (latestRemote && payloadsEqual(latestRemote, payload)) {
                    store.getState().setMeta(pid, {
                        lastBackupTime: remoteMeta.lastBackupTime,
                        lastBackupVersion: remoteMeta.latestVersion,
                    });
                    store.getState().setOnline(true);
                    dirtyRef.current = false;
                    store.getState().setStatus(BACKUP_STATUS.SAVED);
                    inFlightRef.current = false;
                    if (pendingRef.current) {
                        pendingRef.current = false;
                        performBackup(false);
                    }
                    return;
                }
            }
        } catch {
            // Dedupe check failed (offline/etc.) — fall through to a normal push,
            // which has its own offline handling below.
        }

        // Decide whether to overwrite the active reuse version or create new.
        let reuseTarget = null;
        if (!forceNew && cfg.reuseEnabled && meta?.reuseVersion && meta?.reuseWindowStart) {
            const windowMs = (cfg.reuseWindowMinutes || 10) * 60000;
            if (Date.now() - meta.reuseWindowStart < windowMs) {
                reuseTarget = meta.reuseVersion;
            }
        }

        try {
            let timestamp = new Date().toISOString();
            let savedVersion = reuseTarget || null;
            if (reuseTarget) {
                try {
                    const res = await updateBackup(endpoint, pid, reuseTarget, payload);
                    timestamp = res?.timestamp || timestamp;
                    savedVersion = res?.version || reuseTarget;
                } catch {
                    // Version may have been deleted server-side — fall back to a new one.
                    const res = await createBackup(endpoint, pid, payload);
                    timestamp = res?.timestamp || timestamp;
                    savedVersion = res?.version || savedVersion;
                    if (cfg.reuseEnabled && res?.version) {
                        store.getState().startReuseWindow(pid, res.version);
                    }
                }
            } else {
                const res = await createBackup(endpoint, pid, payload);
                timestamp = res?.timestamp || timestamp;
                savedVersion = res?.version || savedVersion;
                // Open a fresh reuse window for subsequent change-backups.
                if (cfg.reuseEnabled && !forceNew && res?.version) {
                    store.getState().startReuseWindow(pid, res.version);
                } else if (forceNew) {
                    // Autosave creates a standalone version; don't disturb the
                    // reuse window unless none exists yet.
                    if (cfg.reuseEnabled && res?.version && !meta?.reuseVersion) {
                        store.getState().startReuseWindow(pid, res.version);
                    }
                }
            }

            // Record both time and version so startup sync can detect a newer
            // remote backup on the next load (or on another device).
            store.getState().setMeta(pid, { lastBackupTime: timestamp, lastBackupVersion: savedVersion });
            store.getState().setOnline(true);
            dirtyRef.current = false;
            store.getState().setStatus(BACKUP_STATUS.SAVED);
        } catch (err) {
            // Distinguish "server offline" from "request failed".
            const online = await checkHealth(endpoint);
            store.getState().setOnline(online);
            store.getState().setStatus(
                online ? BACKUP_STATUS.ERROR : BACKUP_STATUS.OFFLINE,
                err?.message || String(err),
            );
        } finally {
            inFlightRef.current = false;
            if (pendingRef.current) {
                pendingRef.current = false;
                // Flush the change that arrived while we were busy.
                performBackup(false);
            }
        }
    };

    // ── Schedule a debounced change-backup ────────────────────────────
    const scheduleDebounced = () => {
        const cfg = settingsRef.current;
        if (!cfg?.enabled || !cfg.onChangeEnabled) return;
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            performBackup(false);
        }, cfg.debounceMs || 2500);
    };

    // Mark local state dirty and (optionally) schedule a push.
    const onLocalChange = () => {
        if (store.getState().isSuppressed()) return;
        if (!isDesktopDevice()) return;
        const cfg = settingsRef.current;
        if (!cfg?.enabled) return;
        dirtyRef.current = true;
        const s = store.getState();
        if (s.status === BACKUP_STATUS.SAVED || s.status === BACKUP_STATUS.DISABLED) {
            s.setStatus(BACKUP_STATUS.UNSAVED);
        }
        scheduleDebounced();
    };

    // ── Subscriptions to the three stores (mounted once) ──────────────
    useEffect(() => {
        const unsubConfig = useConfigStore.subscribe(onLocalChange);
        const unsubLexicon = useLexiconStore.subscribe(onLocalChange);
        const unsubProject = useProjectStore.subscribe(onLocalChange);
        return () => {
            unsubConfig();
            unsubLexicon();
            unsubProject();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── React to settings / project changes: startup load, timers ─────
    useEffect(() => {
        const cfg = settings;
        const pid = projectId;

        // Clear any existing timers before reconfiguring.
        if (autosaveTimer.current) { clearInterval(autosaveTimer.current); autosaveTimer.current = null; }
        if (healthTimer.current) { clearInterval(healthTimer.current); healthTimer.current = null; }

        if (!isDesktopDevice() || !cfg?.enabled || !pid || !normalizeEndpoint(cfg.endpoint)) {
            store.getState().setStatus(BACKUP_STATUS.DISABLED);
            store.getState().setOnline(false);
            return;
        }

        let cancelled = false;

        // Startup: health check + conditional load of latest remote backup.
        (async () => {
            const online = await checkHealth(cfg.endpoint);
            if (cancelled) return;
            store.getState().setOnline(online);
            if (!online) {
                store.getState().setStatus(BACKUP_STATUS.OFFLINE);
                return;
            }

            try {
                const remoteMeta = await getProjectMeta(cfg.endpoint, pid);
                if (cancelled) return;
                const localMeta = store.getState().getMeta(pid);

                const versionNum = (v) => parseInt(String(v || '').replace(/^v/i, ''), 10) || 0;
                const remoteTime = remoteMeta?.lastBackupTime ? new Date(remoteMeta.lastBackupTime).getTime() : 0;
                const localTime = localMeta?.lastBackupTime ? new Date(localMeta.lastBackupTime).getTime() : 0;
                const remoteVer = versionNum(remoteMeta?.latestVersion);
                const localVer = versionNum(localMeta?.lastBackupVersion);

                // Remote wins when it has a higher version number, or (same/unknown
                // version) a newer timestamp than this device last synced.
                const remoteIsNewer = remoteMeta && (remoteVer > localVer || (remoteTime && remoteTime > localTime));

                if (remoteIsNewer) {
                    const payload = await getLatestBackup(cfg.endpoint, pid);
                    if (cancelled || !payload) return;
                    restoreBackupPayload(payload, {
                        lastBackupTime: remoteMeta.lastBackupTime,
                        lastBackupVersion: remoteMeta.latestVersion,
                    });
                    dirtyRef.current = false;
                    store.getState().setStatus(BACKUP_STATUS.SAVED);
                    toast.success(`Loaded newer backup ${remoteMeta.latestVersion || ''} from server`.trim());
                } else {
                    store.getState().setStatus(dirtyRef.current ? BACKUP_STATUS.UNSAVED : BACKUP_STATUS.SAVED);
                }
            } catch (err) {
                if (cancelled) return;
                store.getState().setStatus(BACKUP_STATUS.ERROR, err?.message || String(err));
            }
        })();

        // Interval autosave.
        if (cfg.autosaveEnabled) {
            const ms = Math.max(1, cfg.autosaveIntervalMinutes || 5) * 60000;
            autosaveTimer.current = setInterval(() => {
                if (dirtyRef.current) performBackup(true);
            }, ms);
        }

        // Periodic health poll to keep the status icon accurate.
        healthTimer.current = setInterval(async () => {
            const online = await checkHealth(settingsRef.current.endpoint);
            store.getState().setOnline(online);
            const cur = store.getState().status;
            if (!online && cur !== BACKUP_STATUS.SAVING) {
                store.getState().setStatus(BACKUP_STATUS.OFFLINE);
            } else if (online && cur === BACKUP_STATUS.OFFLINE) {
                store.getState().setStatus(dirtyRef.current ? BACKUP_STATUS.UNSAVED : BACKUP_STATUS.SAVED);
            }
        }, HEALTH_POLL_MS);

        return () => {
            cancelled = true;
            if (autosaveTimer.current) { clearInterval(autosaveTimer.current); autosaveTimer.current = null; }
            if (healthTimer.current) { clearInterval(healthTimer.current); healthTimer.current = null; }
            if (debounceTimer.current) { clearTimeout(debounceTimer.current); debounceTimer.current = null; }
        };
        // Re-run when enable/endpoint/timing/project change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        projectId,
        settings?.enabled,
        settings?.endpoint,
        settings?.autosaveEnabled,
        settings?.autosaveIntervalMinutes,
        settings?.onChangeEnabled,
        settings?.reuseEnabled,
        settings?.reuseWindowMinutes,
        settings?.debounceMs,
    ]);

    // Expose a manual trigger for the UI ("Back up now").
    return { backupNow: () => performBackup(true) };
}

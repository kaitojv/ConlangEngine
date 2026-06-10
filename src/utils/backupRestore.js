// src/utils/backupRestore.js
// Shared helper to restore a remote BackupPayload into the local stores.
// Used by both the backup manager (startup auto-load) and the backup browser
// (manual project selection). Suppresses change detection during the restore
// so the freshly loaded data isn't immediately pushed back to the server.

import { useConfigStore } from '../store/useConfigStore.jsx';
import { useLexiconStore } from '../store/useLexiconStore.jsx';
import { useProjectStore } from '../store/useProjectStore.jsx';
import { useBackupStore } from '../store/useBackupStore.jsx';
import { sanitizeBackup } from './schemaValidator.jsx';

// Restore config / lexicon / project archive from a payload.
// Returns the restored projectId (from the payload config), or null.
// `lastBackupTime` (optional ISO string) records the device's sync point so we
// don't re-fetch the same backup on the next startup.
export function restoreBackupPayload(payload, { lastBackupTime, lastBackupVersion } = {}) {
    const data = sanitizeBackup(payload);

    // Pause change detection across the synchronous setState batch (+ buffer).
    useBackupStore.getState().suppress(1500);

    if (data.config) useConfigStore.getState().setFullConfig(data.config);
    if (data.lexicon) useLexiconStore.getState().setLexicon(data.lexicon);
    if (payload?.project?.localProjects) {
        useProjectStore.setState({ localProjects: payload.project.localProjects });
    }

    const projectId = data.config?.projectId || null;
    if (projectId && (lastBackupTime || lastBackupVersion)) {
        const patch = {};
        if (lastBackupTime) patch.lastBackupTime = lastBackupTime;
        if (lastBackupVersion) patch.lastBackupVersion = lastBackupVersion;
        useBackupStore.getState().setMeta(projectId, patch);
    }
    return projectId;
}

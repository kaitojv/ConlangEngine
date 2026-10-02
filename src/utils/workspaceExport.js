/**
 * Workspace backup export.
 *
 * Lives in its own module rather than inside Header so that any destructive
 * operation can produce a backup that is byte-for-byte the same shape as the
 * user's own File > Save. A backup that could not be restored would defeat the
 * purpose of forcing one before a rewrite.
 */
import { useConfigStore } from '../store/useConfigStore.jsx';
import { useProjectStore } from '../store/useProjectStore.jsx';
import { useLexiconStore } from '../store/useLexiconStore.jsx';
import { sanitizeConfig } from './schemaValidator.jsx';

/**
 * Builds the exact payload the File > Save export writes:
 * { config, project, lexicon } with the config sanitized for save.
 */
export function buildWorkspaceSnapshot({ exportAll = true } = {}) {
    const config = sanitizeConfig(useConfigStore.getState(), true);
    const lexicon = useLexiconStore.getState();

    const project = { ...useProjectStore.getState() };
    if (!exportAll) project.localProjects = [];

    return { config, project, lexicon };
}

/**
 * Serialises a snapshot to a JSON string.
 *
 * Pretty-printed deliberately. These files are large, but they are a user's
 * safety net: if they ever need to hand-edit or diff one, minified JSON on a
 * 40 MB payload is close to unusable.
 */
export function serialiseWorkspaceSnapshot(snapshot) {
    return JSON.stringify(snapshot, null, 2);
}

/**
 * Triggers a browser download and returns once the blob has been handed to the
 * browser.
 *
 * Browsers give no reliable signal that a large download actually completed,
 * so callers must treat a returned value as "download initiated", not
 * "download verified". That limit is why the destructive flow also keeps the
 * serialised snapshot in memory and offers a second retry.
 */
export function downloadWorkspaceBackup(snapshot, filenameHint) {
    const json = serialiseWorkspaceSnapshot(snapshot);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const name = filenameHint || `${snapshot.config?.conlangName || 'MyConlang'}_Backup.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Deferred: revoking immediately can cancel a download still in progress,
    // which is exactly the failure mode this backup must avoid.
    setTimeout(() => URL.revokeObjectURL(url), 30000);

    return { filename: name, bytes: json.length };
}

// src/utils/syncBaseStore.js
// Persists the "sync base" for each project: the last version this device
// knows is identical to the cloud. It is the common ancestor that the 3-way
// merge engine (src/utils/syncMerge.js) needs to tell apart
// "added on device A" vs "deleted on device B".
//
// Stored in its own IndexedDB database so it never collides with the
// config store's DB (useConfigStore) or course audio DB.

const DB_NAME = 'ce-sync-base';
const DB_VERSION = 1;
const STORE = 'bases';

function hasIndexedDB() {
    return typeof indexedDB !== 'undefined';
}

function openDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'projectId' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function withStore(mode, fn) {
    return openDb().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        let result;
        try {
            result = fn(store);
        } catch (err) {
            db.close();
            reject(err);
            return;
        }
        tx.oncomplete = () => {
            db.close();
            resolve(result && 'result' in result ? result.result : undefined);
        };
        tx.onerror = () => {
            db.close();
            reject(tx.error);
        };
    }));
}

/**
 * Saves the sync base for a project.
 * @param {string} projectId
 * @param {{ revision?: number|null, lexicon?: Array, phrases?: Array, config?: object, wiki?: object }} snapshot
 */
export async function saveSyncBase(projectId, snapshot) {
    if (!projectId || !hasIndexedDB()) return false;
    try {
        // structuredClone strips proxies/functions and freezes the snapshot in time
        const clean = typeof structuredClone === 'function'
            ? structuredClone(snapshot)
            : JSON.parse(JSON.stringify(snapshot));
        await withStore('readwrite', store => store.put({
            projectId,
            revision: clean.revision ?? null,
            lexicon: Array.isArray(clean.lexicon) ? clean.lexicon : [],
            phrases: Array.isArray(clean.phrases) ? clean.phrases : [],
            config: clean.config && typeof clean.config === 'object' ? clean.config : {},
            wiki: clean.wiki && typeof clean.wiki === 'object' ? clean.wiki : {},
            savedAt: Date.now(),
        }));
        return true;
    } catch (err) {
        console.warn('Could not save sync base:', err);
        return false;
    }
}

/**
 * Loads the sync base for a project, or null if none exists yet
 * (first sync after the upgrade, or a project never synced on this device).
 */
export async function loadSyncBase(projectId) {
    if (!projectId || !hasIndexedDB()) return null;
    try {
        const record = await withStore('readonly', store => store.get(projectId));
        return record || null;
    } catch (err) {
        console.warn('Could not load sync base:', err);
        return null;
    }
}

/** Removes the sync base for a project (e.g. when the project is deleted). */
export async function clearSyncBase(projectId) {
    if (!projectId || !hasIndexedDB()) return false;
    try {
        await withStore('readwrite', store => store.delete(projectId));
        return true;
    } catch (err) {
        console.warn('Could not clear sync base:', err);
        return false;
    }
}

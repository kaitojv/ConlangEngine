// src/utils/courseAudio.js
//
// Dual-tier storage helpers for creator-recorded pronunciation audio attached
// to course phrases.
//
// Architecture:
// 1. Browser: Stored in IndexedDB ('ConlangAudioDB') and in-memory cache for
//    instantaneous, offline-resilient, stutter-free playback.
// 2. Database: Stored as base64 Data URL (phrase.audioData) inside project_data
//    in the Supabase Postgres database (conlangs/conlang_snapshots), ensuring
//    cross-device sync, exports, and cloud persistence without relying on
//    external storage buckets.

export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
export const MAX_RECORDING_SECONDS = 120;

const AUDIO_DB_NAME = 'ConlangAudioDB';
const AUDIO_STORE = 'audio';

// In-memory cache: maps phraseId -> dataUrl or objectUrl
export const localAudioCache = new Map();

/** Opens or initializes the local IndexedDB audio store */
const openAudioDB = () => new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    try {
        const req = indexedDB.open(AUDIO_DB_NAME, 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(AUDIO_STORE)) {
                db.createObjectStore(AUDIO_STORE, { keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
    } catch {
        resolve(null);
    }
});

/** Saves an audio clip into browser IndexedDB and in-memory cache */
export const saveAudioToBrowser = async (phraseId, blob, dataUrl) => {
    if (!phraseId) return;
    if (dataUrl) {
        localAudioCache.set(phraseId, dataUrl);
    } else if (blob) {
        try {
            const url = URL.createObjectURL(blob);
            localAudioCache.set(phraseId, url);
        } catch {
            // Non-fatal
        }
    }

    const db = await openAudioDB();
    if (!db) return;
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(AUDIO_STORE, 'readwrite');
            const store = tx.objectStore(AUDIO_STORE);
            store.put({
                id: phraseId,
                dataUrl: dataUrl || '',
                blob: blob || null,
                mimeType: blob?.type || '',
                updatedAt: Date.now()
            });
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        } catch {
            resolve(false);
        }
    });
};

/** Loads an audio clip from browser IndexedDB */
export const loadAudioFromBrowser = async (phraseId) => {
    if (!phraseId) return null;
    if (localAudioCache.has(phraseId)) {
        return { dataUrl: localAudioCache.get(phraseId) };
    }
    const db = await openAudioDB();
    if (!db) return null;
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(AUDIO_STORE, 'readonly');
            const store = tx.objectStore(AUDIO_STORE);
            const req = store.get(phraseId);
            req.onsuccess = () => {
                const res = req.result;
                if (res?.dataUrl) {
                    localAudioCache.set(phraseId, res.dataUrl);
                }
                resolve(res || null);
            };
            req.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
};

/** Deletes an audio clip from browser IndexedDB and memory cache */
export const deleteAudioFromBrowser = async (phraseId) => {
    if (!phraseId) return;
    localAudioCache.delete(phraseId);
    const db = await openAudioDB();
    if (!db) return;
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(AUDIO_STORE, 'readwrite');
            const store = tx.objectStore(AUDIO_STORE);
            store.delete(phraseId);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        } catch {
            resolve(false);
        }
    });
};

/** Converts a Blob / File to a base64 Data URL string */
export const blobToDataUrl = async (blob) => {
    if (typeof FileReader !== 'undefined') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
    // Fallback for Node.js / non-DOM environments
    if (typeof globalThis !== 'undefined' && globalThis.Buffer) {
        const buffer = globalThis.Buffer.from(await blob.arrayBuffer());
        return `data:${blob.type || 'application/octet-stream'};base64,${buffer.toString('base64')}`;
    }
    return '';
};

const EXT_BY_MIME = {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav'
};

export const extensionForMime = (mime) => {
    const clean = (mime || '').split(';')[0].trim().toLowerCase();
    return EXT_BY_MIME[clean] || 'webm';
};

/**
 * Picks a recorder MIME type the current browser actually supports.
 * Safari notably refuses audio/webm, hence the ordered fallback.
 */
export const pickRecorderMime = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    return candidates.find((m) => {
        try { return MediaRecorder.isTypeSupported(m); } catch { return false; }
    }) || '';
};

const safeSegment = (value) =>
    String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'unknown';

export const buildAudioPath = ({ userId, projectId, phraseId, extension }) =>
    `${safeSegment(userId)}/${safeSegment(projectId)}/${safeSegment(phraseId)}.${safeSegment(extension)}`;

export const extractPhraseId = (path) => {
    if (!path) return '';
    const match = String(path).match(/(phrase-[a-zA-Z0-9_-]+)/);
    return match ? match[1] : '';
};

/**
 * Checks whether a phrase or exercise actually has valid audio attached.
 * Ignores dead Supabase bucket paths that were created during earlier failed attempts.
 */
export const hasCourseAudio = (phrase) => {
    if (!phrase) return false;
    if (phrase.audioData) return true;
    if (phrase.id && localAudioCache.has(phrase.id)) return true;
    if (typeof phrase.audioPath === 'string') {
        const p = phrase.audioPath.trim();
        if (p.startsWith('data:') || p.startsWith('blob:')) return true;
        if (p.includes('course-audio') || p.includes('/')) return false;
        return !!p;
    }
    return false;
};

/**
 * Resolves an audio reference (phrase object, data URL, blob URL, or phraseId)
 * to a playable URL.
 * NEVER returns dead Supabase storage URLs to avoid 400 Bad Request console errors.
 */
export const getCourseAudioUrl = (input) => {
    if (!input) return '';

    // If an object (phrase or exercise) was passed
    if (typeof input === 'object') {
        if (input.audioData) {
            if (input.id) localAudioCache.set(input.id, input.audioData);
            return input.audioData;
        }
        if (input.id && localAudioCache.has(input.id)) {
            return localAudioCache.get(input.id);
        }
        if (input.audioPath) return getCourseAudioUrl(input.audioPath);
        return '';
    }

    const str = String(input).trim();
    if (!str) return '';

    // Block any old dead Supabase storage URLs or paths so the browser never
    // makes a network request to a non-existent bucket (which causes a 400 error in console)
    if (str.includes('/storage/v1/object/course-audio') || str.includes('course-audio/')) {
        const extractedId = extractPhraseId(str);
        if (extractedId && localAudioCache.has(extractedId)) {
            return localAudioCache.get(extractedId);
        }
        return '';
    }

    // If it's already a data URL or blob URL
    if (str.startsWith('data:') || str.startsWith('blob:')) {
        return str;
    }

    // Direct external HTTP URL (excluding Supabase storage bucket)
    if (str.startsWith('http://') || str.startsWith('https://')) {
        return str;
    }

    // Check in-memory cache directly by key
    if (localAudioCache.has(str)) {
        return localAudioCache.get(str);
    }

    // Extract phrase ID if it was an old storage path or "local::phraseId"
    const extractedId = extractPhraseId(str);
    if (extractedId && localAudioCache.has(extractedId)) {
        return localAudioCache.get(extractedId);
    }

    return '';
};

/**
 * Saves a recorded or picked audio clip to both the Browser and Database.
 * 1. Browser: Saved in IndexedDB ('ConlangAudioDB') and memory cache for zero-latency offline playback.
 * 2. Database: Returns audioData (base64 Data URL) which is persisted directly into the project's
 *    customCourse in the Supabase database.
 * Completely eliminates Supabase Storage bucket dependencies and "Bucket not found" errors!
 */
export const uploadCourseAudio = async ({ blob, phraseId }) => {
    if (!blob) throw new Error('No audio data to upload.');
    if (blob.size > MAX_AUDIO_BYTES) {
        throw new Error(`Recording is too large (${(blob.size / 1048576).toFixed(1)} MB). Maximum is 10 MB.`);
    }

    // 1. Convert to base64 Data URL so it can be saved in the database
    const audioData = await blobToDataUrl(blob);

    // 2. Save to Browser (IndexedDB + memory cache)
    await saveAudioToBrowser(phraseId, blob, audioData);

    const localPath = `local::${phraseId}`;

    return {
        path: localPath,
        audioPath: localPath,
        audioData
    };
};

/** Removes a clip from browser storage */
export const deleteCourseAudio = async (path, phraseId) => {
    const id = phraseId || extractPhraseId(path);
    if (id) {
        await deleteAudioFromBrowser(id);
    }
};

// src/utils/courseAudio.js
//
// Dual-tier storage helpers for creator-recorded pronunciation audio attached
// to course phrases.
//
// Architecture:
// 1. Browser: Stored in IndexedDB ('ConlangAudioDB') and in-memory cache for
//    instantaneous, offline-resilient, stutter-free playback.
// 2. Database: Stored as base64 Data URL (phrase.audioData) inside project_data
//    in the Supabase database (conlangs/conlang_snapshots), ensuring cross-device
//    sync, exports, and cloud persistence.
// 3. Storage Bucket: Opportunistic upload to Supabase storage ('course-audio') if
//    the bucket exists and user is signed in. Never fails the user if the bucket
//    errors out or does not exist.

import { supabase } from './supabaseClient.js';

export const COURSE_AUDIO_BUCKET = 'course-audio';
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
export const MAX_RECORDING_SECONDS = 120;

const AUDIO_DB_NAME = 'ConlangAudioDB';
const AUDIO_STORE = 'audio';

// In-memory cache: maps phraseId / path -> dataUrl or objectUrl
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
export const saveAudioToBrowser = async (phraseId, blob, dataUrl, path) => {
    if (!phraseId) return;
    if (dataUrl) {
        localAudioCache.set(phraseId, dataUrl);
        if (path) localAudioCache.set(path, dataUrl);
    } else if (blob) {
        try {
            const url = URL.createObjectURL(blob);
            localAudioCache.set(phraseId, url);
            if (path) localAudioCache.set(path, url);
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
                path: path || '',
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
                    if (res.path) localAudioCache.set(res.path, res.dataUrl);
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
    const buffer = Buffer.from(await blob.arrayBuffer());
    return `data:${blob.type || 'application/octet-stream'};base64,${buffer.toString('base64')}`;
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

/**
 * Builds the storage path for a clip. The first segment MUST be the owner's
 * user id — the RLS policies key off `foldername(name))[1]`.
 */
export const buildAudioPath = ({ userId, projectId, phraseId, extension }) =>
    `${safeSegment(userId)}/${safeSegment(projectId)}/${safeSegment(phraseId)}.${safeSegment(extension)}`;

/**
 * Resolves an audio reference (phrase object, data URL, blob URL, or storage path)
 * to a playable URL.
 */
export const getCourseAudioUrl = (input) => {
    if (!input) return '';

    // If an object (phrase or exercise) was passed
    if (typeof input === 'object') {
        if (input.audioData) {
            localAudioCache.set(input.id || input.audioPath || '', input.audioData);
            return input.audioData;
        }
        if (input.audioPath) return getCourseAudioUrl(input.audioPath);
        if (input.id && localAudioCache.has(input.id)) return localAudioCache.get(input.id);
        return '';
    }

    const str = String(input).trim();
    if (!str) return '';

    // If it's already a data URL, blob URL, or direct HTTP URL
    if (str.startsWith('data:') || str.startsWith('blob:') || str.startsWith('http://') || str.startsWith('https://')) {
        return str;
    }

    // Check in-memory cache
    if (localAudioCache.has(str)) {
        return localAudioCache.get(str);
    }

    // Fall back to Supabase storage public URL if path contains a slash
    if (str.includes('/')) {
        try {
            const { data } = supabase.storage.from(COURSE_AUDIO_BUCKET).getPublicUrl(str);
            if (data?.publicUrl) return data.publicUrl;
        } catch {
            // Bucket not found or storage offline
        }
    }

    return '';
};

/**
 * Uploads/saves a recorded or picked audio clip.
 * Saves to BOTH:
 * 1. Browser: IndexedDB ('ConlangAudioDB') and memory cache.
 * 2. Database: Returns audioData (base64 Data URL) to persist in project_data.
 * Also attempts opportunistic Supabase storage bucket upload without crashing if missing.
 */
export const uploadCourseAudio = async ({ blob, userId, projectId, phraseId, mimeType }) => {
    if (!blob) throw new Error('No audio data to upload.');
    if (blob.size > MAX_AUDIO_BYTES) {
        throw new Error(`Recording is too large (${(blob.size / 1048576).toFixed(1)} MB). Maximum is 10 MB.`);
    }

    const effectiveMime = mimeType || blob.type || 'audio/webm';
    const extension = extensionForMime(effectiveMime);
    const path = buildAudioPath({
        userId: userId || 'local',
        projectId: projectId || 'local',
        phraseId,
        extension
    });

    // 1. Convert to base64 Data URL so it can be saved in the database
    const audioData = await blobToDataUrl(blob);

    // 2. Save to Browser (IndexedDB + memory cache)
    await saveAudioToBrowser(phraseId, blob, audioData, path);

    // 3. Attempt Supabase Storage bucket upload (opportunistic)
    let remotePath = path;
    if (userId && supabase) {
        try {
            const { data, error } = await supabase.storage
                .from(COURSE_AUDIO_BUCKET)
                .upload(path, blob, { contentType: effectiveMime, upsert: true });

            if (error) {
                // Bucket might not exist, RLS policy error, etc.
                console.warn('Supabase storage bucket upload skipped (saved to database & browser):', error.message || error);
            } else if (data?.path) {
                remotePath = data.path;
            }
        } catch (uploadErr) {
            console.warn('Supabase storage upload error:', uploadErr.message || uploadErr);
        }
    }

    return {
        path: remotePath,
        audioPath: remotePath,
        audioData
    };
};

/** Removes a clip from browser storage and attempts bucket removal */
export const deleteCourseAudio = async (path, phraseId) => {
    if (phraseId) {
        await deleteAudioFromBrowser(phraseId);
    }
    if (path) {
        localAudioCache.delete(path);
        if (supabase && path.includes('/')) {
            try {
                await supabase.storage.from(COURSE_AUDIO_BUCKET).remove([path]);
            } catch {
                // Non-fatal
            }
        }
    }
};

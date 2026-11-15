// src/utils/publicFontCache.js
// Memory + IndexedDB cache for compiled public font ArrayBuffers so large scripts
// do not recompile from scratch across script switches, Explore navigation, or reloads.

const DB_NAME = 'ConlangPublicFontCacheDB';
const DB_VERSION = 1;
const STORE_NAME = 'fonts';

const memoryCache = new Map();

function openCacheDb() {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            resolve(null);
            return;
        }
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function getCachedPublicFont(key) {
    if (!key) return null;
    if (memoryCache.has(key)) {
        return memoryCache.get(key);
    }
    try {
        const db = await openCacheDb();
        if (!db) return null;
        const val = await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
        if (val instanceof ArrayBuffer) {
            memoryCache.set(key, val);
            return val;
        }
        if (ArrayBuffer.isView(val)) {
            const buf = val.buffer.slice(val.byteOffset, val.byteOffset + val.byteLength);
            memoryCache.set(key, buf);
            return buf;
        }
        return null;
    } catch {
        return null;
    }
}

export async function setCachedPublicFont(key, buffer) {
    if (!key || !(buffer instanceof ArrayBuffer)) return;
    memoryCache.set(key, buffer);
    try {
        const db = await openCacheDb();
        if (!db) return;
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.put(buffer.slice(0), key);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    } catch {
        // Ignore IndexedDB quota / private mode failures; memory cache still works
    }
}

export function arrayBufferToFontDataUrl(buffer) {
    return new Promise((resolve, reject) => {
        if (!(buffer instanceof ArrayBuffer)) {
            reject(new Error('Expected ArrayBuffer'));
            return;
        }
        const blob = new Blob([buffer], { type: 'font/truetype' });
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string' && reader.result.includes(',')) {
                const base64 = reader.result.split(',')[1];
                resolve(`data:font/truetype;charset=utf-8;base64,${base64}`);
            } else {
                reject(new Error('Failed to encode font ArrayBuffer'));
            }
        };
        reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
        reader.readAsDataURL(blob);
    });
}

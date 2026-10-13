// src/utils/deviceIdentity.js
// Stable per-device identity used by the sync engine to know which device
// authored a change. Stored in localStorage only — it is NEVER synced to the
// cloud or included in config/lexicon payloads.

const DEVICE_ID_KEY = 'ce-device-id';

let cachedDeviceId = null;

function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return 'dev_' + crypto.randomUUID();
    }
    return 'dev_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/**
 * Returns this device's stable ID, creating it on first use.
 * Falls back to an in-memory ID when localStorage is unavailable
 * (private mode, Node test environment, etc.).
 */
export function getDeviceId() {
    if (cachedDeviceId) return cachedDeviceId;

    try {
        if (typeof localStorage !== 'undefined') {
            let id = localStorage.getItem(DEVICE_ID_KEY);
            if (!id) {
                id = generateId();
                localStorage.setItem(DEVICE_ID_KEY, id);
            }
            cachedDeviceId = id;
            return id;
        }
    } catch {
        // localStorage blocked — fall through to in-memory ID
    }

    cachedDeviceId = generateId();
    return cachedDeviceId;
}

/**
 * Returns structured, language-neutral info about this device.
 * The UI is responsible for turning this into translated text
 * (e.g. t('sync.deviceLabel', { browser, os })).
 */
export function getDeviceInfo() {
    const ua = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';

    let os = 'unknown';
    if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/windows/i.test(ua)) os = 'Windows';
    else if (/mac os x|macintosh/i.test(ua)) os = 'macOS';
    else if (/linux/i.test(ua)) os = 'Linux';

    let browser = 'unknown';
    if (/edg\//i.test(ua)) browser = 'Edge';
    else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
    else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
    else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
    else if (/safari/i.test(ua)) browser = 'Safari';

    const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua);

    return { id: getDeviceId(), os, browser, isMobile };
}

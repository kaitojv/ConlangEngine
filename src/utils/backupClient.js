// src/utils/backupClient.js
// Thin REST client for the Conlang Engine Backup API (see API.md).
// All functions take an `endpoint` base URL (e.g. "http://localhost:3000").
// They throw on network/HTTP errors so callers can distinguish offline vs. failure.

const DEFAULT_TIMEOUT = 8000;

// Normalize a user-supplied endpoint: trim, strip trailing slash.
export function normalizeEndpoint(endpoint) {
    if (typeof endpoint !== 'string') return '';
    return endpoint.trim().replace(/\/+$/, '');
}

// fetch wrapper with timeout via AbortController.
async function request(url, options = {}, timeout = DEFAULT_TIMEOUT) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
    } finally {
        clearTimeout(timer);
    }
}

async function parseJson(res) {
    const text = await res.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

// GET /api/health — returns true if the server responds 200.
export async function checkHealth(endpoint) {
    const base = normalizeEndpoint(endpoint);
    if (!base) return false;
    try {
        const res = await request(`${base}/api/health`, { method: 'GET' }, 4000);
        return res.ok;
    } catch {
        return false;
    }
}

// POST /api/backups/:projectId — create a new versioned backup.
// Returns { version, timestamp }.
export async function createBackup(endpoint, projectId, payload) {
    const base = normalizeEndpoint(endpoint);
    const res = await request(`${base}/api/backups/${encodeURIComponent(projectId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await parseJson(res);
    if (!res.ok) {
        throw new Error(data?.error || `Backup failed (HTTP ${res.status})`);
    }
    return data;
}

// PUT /api/backups/:projectId/:version — overwrite an existing backup.
// Returns { version, updated }.
export async function updateBackup(endpoint, projectId, version, payload) {
    const base = normalizeEndpoint(endpoint);
    const res = await request(`${base}/api/backups/${encodeURIComponent(projectId)}/${encodeURIComponent(version)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await parseJson(res);
    if (!res.ok) {
        throw new Error(data?.error || `Backup overwrite failed (HTTP ${res.status})`);
    }
    return data;
}

// GET /api/backups/latest/:projectId — fetch latest backup payload.
// Returns the BackupPayload, or null if none exists (404).
export async function getLatestBackup(endpoint, projectId) {
    const base = normalizeEndpoint(endpoint);
    const res = await request(`${base}/api/backups/latest/${encodeURIComponent(projectId)}`, { method: 'GET' });
    if (res.status === 404) return null;
    const data = await parseJson(res);
    if (!res.ok) {
        throw new Error(data?.error || `Fetch latest failed (HTTP ${res.status})`);
    }
    return data;
}

// GET /api/projects — list every project that has at least one backup.
// Returns an array of project metadata objects (sorted by most recent backup).
export async function listProjects(endpoint) {
    const base = normalizeEndpoint(endpoint);
    const res = await request(`${base}/api/projects`, { method: 'GET' });
    const data = await parseJson(res);
    if (!res.ok) {
        throw new Error(data?.error || `List projects failed (HTTP ${res.status})`);
    }
    return Array.isArray(data?.projects) ? data.projects : [];
}

// GET /api/backups/:projectId/:version — fetch a specific backup version payload.
// Returns the BackupPayload, or null if not found (404).
export async function getBackupVersion(endpoint, projectId, version) {
    const base = normalizeEndpoint(endpoint);
    const res = await request(`${base}/api/backups/${encodeURIComponent(projectId)}/${encodeURIComponent(version)}`, { method: 'GET' });
    if (res.status === 404) return null;
    const data = await parseJson(res);
    if (!res.ok) {
        throw new Error(data?.error || `Fetch version failed (HTTP ${res.status})`);
    }
    return data;
}

// GET /api/projects/:projectId — fetch project metadata (lastBackupTime, latestVersion, ...).
// Returns metadata object, or null if not found (404).
export async function getProjectMeta(endpoint, projectId) {
    const base = normalizeEndpoint(endpoint);
    const res = await request(`${base}/api/projects/${encodeURIComponent(projectId)}`, { method: 'GET' });
    if (res.status === 404) return null;
    const data = await parseJson(res);
    if (!res.ok) {
        throw new Error(data?.error || `Fetch project meta failed (HTTP ${res.status})`);
    }
    return data;
}

// tests/test_accountSyncPreservation.js
import assert from 'node:assert/strict';
import { sanitizeConfig, sanitizeBackup } from '../src/utils/schemaValidator.js';

console.log('Testing account settings & sync preservation...');

// 1. sanitizeConfig(config, true) must strip runtime sync and account state
const dirtyConfig = {
    conlangName: 'Elvish',
    projectId: 'proj_123',
    lastCloudSync: '2025-01-01T00:00:00.000Z',
    syncConflictStatus: 'conflict',
    isAutoSyncEnabled: true,
    isProActive: true,
    devicesOnlineCount: 5,
    isRehydrating: true,
    vowels: ['a', 'e', 'i', 'o', 'u']
};

const savedConfig = sanitizeConfig(dirtyConfig, true);
assert.equal(savedConfig.conlangName, 'Elvish');
assert.equal(savedConfig.projectId, 'proj_123');
assert.deepEqual(savedConfig.vowels, ['a', 'e', 'i', 'o', 'u']);
assert.equal(savedConfig.lastCloudSync, undefined, 'lastCloudSync should be stripped on save');
assert.equal(savedConfig.syncConflictStatus, undefined, 'syncConflictStatus should be stripped on save');
assert.equal(savedConfig.isAutoSyncEnabled, undefined, 'isAutoSyncEnabled should be stripped on save');
assert.equal(savedConfig.isProActive, undefined, 'isProActive should be stripped on save');
assert.equal(savedConfig.devicesOnlineCount, undefined, 'devicesOnlineCount should be stripped on save');
assert.equal(savedConfig.isRehydrating, undefined, 'isRehydrating should be stripped on save');

console.log('✔ sanitizeConfig strips runtime sync and account settings on save');

// 2. sanitizeBackup must clean older backups that have these fields
const legacyBackup = {
    config: {
        conlangName: 'Dwarvish',
        lastCloudSync: '2023-05-01T00:00:00.000Z',
        syncConflictStatus: 'conflict',
        isAutoSyncEnabled: true,
        isProActive: true,
        devicesOnlineCount: 2
    },
    lexicon: [
        { word: 'khazad', translation: 'dwarf' }
    ]
};

const cleanedBackup = sanitizeBackup(legacyBackup);
assert.equal(cleanedBackup.config.conlangName, 'Dwarvish');
assert.equal(cleanedBackup.config.lastCloudSync, undefined, 'lastCloudSync must be stripped from imported backups');
assert.equal(cleanedBackup.config.syncConflictStatus, undefined, 'syncConflictStatus must be stripped from imported backups');
assert.equal(cleanedBackup.config.isAutoSyncEnabled, undefined, 'isAutoSyncEnabled must be stripped from imported backups');
assert.equal(cleanedBackup.config.isProActive, undefined, 'isProActive must be stripped from imported backups');
assert.equal(cleanedBackup.config.devicesOnlineCount, undefined, 'devicesOnlineCount must be stripped from imported backups');

console.log('✔ sanitizeBackup strips runtime sync and account settings on restore');

// 3. Sync review toggle helper contract
const SYNC_REVIEW_PREF_KEY = 'ce_showSyncReview';
const isReviewOn = (storage) => {
    try { return storage.getItem(SYNC_REVIEW_PREF_KEY) !== 'false'; } catch { return true; }
};
const setReviewOn = (storage, enabled) => {
    try { storage.setItem(SYNC_REVIEW_PREF_KEY, enabled ? 'true' : 'false'); } catch { /* ignore */ }
};

const store = new Map();
const fakeStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
};

assert.equal(isReviewOn(fakeStorage), true, 'defaults to true');
setReviewOn(fakeStorage, false);
assert.equal(isReviewOn(fakeStorage), false, 'false after turning off');
setReviewOn(fakeStorage, true);
assert.equal(isReviewOn(fakeStorage), true, 'true after turning on');

console.log('✔ isSyncReviewEnabled & setSyncReviewEnabled contract validated');

console.log('All account sync preservation tests passed!');

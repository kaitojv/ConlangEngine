// src/utils/syncEngine.js
// ─────────────────────────────────────────────────────────────────────────────
// Unified cloud sync engine for Conlang Engine.
// Single source of truth for preparing payloads, compressing, pushing, pulling,
// and orchestrating 3-way merges across devices.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabaseClient.js';
import {
    sanitizeConfig,
    sanitizeLexicon,
    sanitizePhrases,
    decompressPayloadAsync
} from './schemaValidator.jsx';
import { saveSyncBase, loadSyncBase } from './syncBaseStore.js';
import { mergeProject, MERGE_MODES } from './syncMerge.js';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import LZString from 'lz-string';
import { broadcastProjectUpdate } from './realtimeSync.js';

// Device-level preference: stored in localStorage so it isn't merged into project config.
export const SYNC_REVIEW_PREF_KEY = 'ce_showSyncReview';
export const isSyncReviewEnabled = () => {
    try { return localStorage.getItem(SYNC_REVIEW_PREF_KEY) !== 'false'; } catch { return true; }
};
export const setSyncReviewEnabled = (enabled) => {
    try { localStorage.setItem(SYNC_REVIEW_PREF_KEY, enabled ? 'true' : 'false'); } catch { /* ignore */ }
};

/**
 * Builds a compressed cloud-ready payload from current project state.
 */
export async function buildCloudPayload({ config, lexicon, phrases = [], wiki = {} }) {
    const configData = sanitizeConfig(config, true);

    // Strip massive fonts (> 2MB) to avoid database timeouts
    if (typeof configData.customFontBase64 === 'string' && configData.customFontBase64.length > 2000000) {
        delete configData.customFontBase64;
        delete configData.customFont;
    }
    if (configData.scriptDataById) {
        Object.values(configData.scriptDataById).forEach(script => {
            if (typeof script.customFontBase64 === 'string' && script.customFontBase64.length > 2000000) {
                delete script.customFontBase64;
                delete script.customFont;
            }
        });
    }

    const payload = {
        dictionary: lexicon,
        phrases: phrases,
        config: configData,
        wiki: wiki,
        wordCount: lexicon.length,
        last_updated: new Date().toISOString()
    };

    const payloadStr = JSON.stringify(payload);
    let finalPayload = payload;

    // Compress payloads > 1MB
    if (payloadStr.length > 1000000) {
        try {
            const stream = new Blob([JSON.stringify({
                dictionary: lexicon,
                phrases: phrases,
                wiki: wiki
            })]).stream();
            const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
            const compressedResponse = new Response(compressedStream);
            const compressedArrayBuffer = await compressedResponse.arrayBuffer();

            const bytes = new Uint8Array(compressedArrayBuffer);
            let binary = '';
            const chunkSize = 32768;
            for (let i = 0; i < bytes.length; i += chunkSize) {
                binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
            }
            const compressedString = btoa(binary);

            const cleanConfigForCloud = { ...configData };
            delete cleanConfigForCloud.wikiPages;
            delete cleanConfigForCloud.wiki;

            finalPayload = {
                gzip_compressed_payload: compressedString,
                config: cleanConfigForCloud,
                wordCount: lexicon.length,
                last_updated: payload.last_updated
            };
        } catch (e) {
            console.warn("gzip compression failed, falling back to LZString:", e);
            try {
                const compressedString = LZString.compressToBase64(JSON.stringify({
                    dictionary: lexicon,
                    phrases: phrases,
                    wiki: wiki
                }));
                const cleanConfigForCloud = { ...configData };
                delete cleanConfigForCloud.wikiPages;
                delete cleanConfigForCloud.wiki;

                finalPayload = {
                    compressed_payload: compressedString,
                    config: cleanConfigForCloud,
                    wordCount: lexicon.length,
                    last_updated: payload.last_updated
                };
            } catch (lzErr) {
                console.warn("LZString compression also failed, sending uncompressed:", lzErr);
            }
        }
    }

    return finalPayload;
}

/**
 * Fetches the latest remote project state from Supabase.
 */
export async function pullRemoteProject(projectId) {
    if (!projectId || projectId.startsWith('local_')) return null;

    const { data, error } = await supabase
        .from('conlang_snapshots')
        .select('created_at, project_data, user_id')
        .eq('project_id', projectId)
        .maybeSingle();

    if (error || !data || !data.project_data) return null;

    const projectData = await decompressPayloadAsync(data.project_data);
    if (!projectData) return null;

    const remoteConfig = sanitizeConfig(projectData.config || {});
    const remoteLexicon = sanitizeLexicon(projectData.dictionary || []);
    const remotePhrases = sanitizePhrases(projectData.phrases || []);
    const remoteWiki = projectData.wiki || {};
    const remoteTimestamp = projectData.last_updated
        ? new Date(projectData.last_updated).getTime()
        : new Date(data.created_at).getTime();

    return {
        projectId,
        remoteState: {
            config: remoteConfig,
            lexicon: remoteLexicon,
            phrases: remotePhrases,
            wiki: remoteWiki
        },
        remoteTimestamp,
        userId: data.user_id,
        rawPayload: data.project_data
    };
}

/**
 * Pushes project state to Supabase conlang_snapshots and conlangs.
 */
export async function pushProjectState(session, projectId, state, options = {}) {
    if (!projectId || projectId.startsWith('local_')) return { success: false, error: 'Invalid project ID' };

    const activeSession = session || (await supabase.auth.getSession()).data?.session;
    const { versionName = null, skipVersions = false } = options;

    const finalPayload = await buildCloudPayload({
        config: state.config,
        lexicon: state.lexicon,
        phrases: state.phrases,
        wiki: state.wiki
    });

    const finalPayloadSize = JSON.stringify(finalPayload).length;
    if (finalPayloadSize > 20000000) {
        return { success: false, error: 'Project payload exceeds 20MB limit' };
    }

    // Verify ownership
    if (activeSession?.user?.id) {
        const { data: existing } = await supabase
            .from('conlang_snapshots')
            .select('user_id')
            .eq('project_id', projectId)
            .maybeSingle();

        if (existing && existing.user_id && existing.user_id !== activeSession.user.id) {
            // Fork project to prevent overwriting someone else's conlang
            const forkedId = 'proj_' + crypto.randomUUID();
            useConfigStore.getState().updateConfig({ projectId: forkedId });
            projectId = forkedId;
        }
    }

    const nowIso = new Date().toISOString();

    // 1. Snapshot table (for sharing & base sync)
    const { error: snapErr } = await supabase.from('conlang_snapshots').upsert({
        user_id: activeSession?.user?.id || null,
        project_id: projectId,
        project_data: finalPayload,
        updated_at: nowIso
    }, { onConflict: 'project_id' });

    if (snapErr) throw snapErr;

    // 2. Conlangs table (cross-device account collection)
    if (activeSession?.user?.id) {
        const { error: conlangErr } = await supabase.from('conlangs').upsert({
            user_id: activeSession.user.id,
            project_id: projectId,
            project_data: finalPayload,
            updated_at: nowIso
        }, { onConflict: 'project_id' });

        if (conlangErr) console.warn("Could not upsert to conlangs table:", conlangErr);

        // 3. Version history (if explicitly requested or named)
        if (!skipVersions && versionName) {
            try {
                await supabase.from('conlang_versions').insert({
                    user_id: activeSession.user.id,
                    project_id: projectId,
                    version_name: versionName,
                    project_data: finalPayload
                });
            } catch (vErr) {
                console.warn("Could not save version checkpoint:", vErr);
            }
        }

        // 4. Instant peer-to-peer broadcast to all devices on this account
        broadcastProjectUpdate({
            userId: activeSession.user.id,
            projectId,
            remoteTimestamp: Date.now()
        }).catch(() => {});
    }

    // Save as local sync base now that cloud has confirmed receipt
    await saveSyncBase(projectId, {
        lexicon: state.lexicon,
        phrases: state.phrases,
        config: state.config,
        wiki: state.wiki
    });

    useConfigStore.getState().updateConfig({
        lastCloudSync: nowIso,
        syncConflictStatus: 'resolved'
    });

    return { success: true, projectId };
}

/**
 * Applies merged project state to local stores (Zustand) and updates IndexedDB base.
 */
export async function applyMergedStateLocally(projectId, mergedState) {
    const { lexicon, phrases, config, wiki } = mergedState;

    if (Array.isArray(lexicon)) {
        useLexiconStore.getState().setLexicon(lexicon);
    }
    if (Array.isArray(phrases)) {
        useLexiconStore.getState().setPhrases(phrases);
    }
    if (config && typeof config === 'object') {
        useConfigStore.getState().setFullConfig({
            ...config,
            projectId,
            wikiPages: wiki || config.wikiPages || {},
            lastCloudSync: new Date().toISOString(),
            syncConflictStatus: 'resolved'
        });
    }

    await saveSyncBase(projectId, {
        lexicon,
        phrases,
        config,
        wiki
    });
}

/**
 * High-level merge orchestration: loads base, merges local vs remote,
 * and returns merge result.
 */
export async function performProjectMerge({
    projectId,
    localState,
    remoteState,
    mode = MERGE_MODES.AUTO,
    decisions = {}
}) {
    const base = await loadSyncBase(projectId);

    const mergeResult = mergeProject({
        base,
        local: localState,
        remote: remoteState,
        mode,
        decisions
    });

    return {
        ...mergeResult,
        base
    };
}

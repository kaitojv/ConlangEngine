import { useEffect, useRef, useCallback } from 'react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { supabase } from '@/utils/supabaseClient.js';
import { sanitizeConfig } from '@/utils/schemaValidator.jsx';
import LZString from 'lz-string';

/**
 * useAutoSync — pushes config + lexicon to Supabase whenever either store
 * changes, debounced at 5 s. Runs entirely outside of React render state
 * (reads stores imperatively) so there are no stale-closure issues.
 */
export function useAutoSync() {
    const lastSyncStateRef = useRef(null);
    const timeoutRef = useRef(null);
    const isFirstRun = useRef(true);
    const isSyncing = useRef(false);

    // Build a stable "push to cloud" function that always reads fresh state.
    const pushToCloud = useCallback(async () => {
        // --- Guard: no double-flights ---
        if (isSyncing.current) return false;
        isSyncing.current = true;

        try {
            // Always read the freshest session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return false;

            const config = useConfigStore.getState();
            const lexicon = useLexiconStore.getState().lexicon || [];

            let currentProjectId = config.projectId;
            if (!currentProjectId) {
                currentProjectId = 'proj_' + crypto.randomUUID();
                config.updateConfig({ projectId: currentProjectId });
            }

            const configData = sanitizeConfig(useConfigStore.getState(), true);

            // Strip massive base64 font from cloud payload
            delete configData.customFontBase64;
            delete configData.customFont;

            const payload = {
                dictionary: lexicon,
                config: configData,
                wiki: config.wikiPages || {},
                last_updated: new Date().toISOString()
            };

            // Compress large payloads
            const payloadSizeStr = JSON.stringify(payload);
            let finalPayload = payload;

            if (payloadSizeStr.length > 1000000) {
                try {
                    const stream = new Blob([JSON.stringify({
                        dictionary: lexicon,
                        wiki: config.wikiPages || {}
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

                    let cleanConfigForCloud = { ...configData };
                    delete cleanConfigForCloud.wikiPages;
                    delete cleanConfigForCloud.wiki;

                    finalPayload = {
                        gzip_compressed_payload: compressedString,
                        config: cleanConfigForCloud,
                        wordCount: lexicon.length,
                        last_updated: payload.last_updated
                    };
                } catch (e) {
                    console.warn("Failed to compress payload using gzip, trying LZString fallback:", e);
                    try {
                        const compressedString = LZString.compressToBase64(JSON.stringify({
                            dictionary: lexicon,
                            wiki: config.wikiPages || {}
                        }));
                        let cleanConfigForCloud = { ...configData };
                        delete cleanConfigForCloud.wikiPages;
                        delete cleanConfigForCloud.wiki;

                        finalPayload = {
                            compressed_payload: compressedString,
                            config: cleanConfigForCloud,
                            wordCount: lexicon.length,
                            last_updated: payload.last_updated
                        };
                    } catch (lzErr) {
                        console.warn("LZString compression also failed:", lzErr);
                    }
                }
            }

            if (configData.scriptDataById) {
                Object.values(configData.scriptDataById).forEach(script => {
                    delete script.customFontBase64;
                    delete script.customFont;
                });
            }

            const finalPayloadSize = JSON.stringify(finalPayload).length;
            const isMassivePayload = finalPayloadSize > 3000000;

            if (finalPayloadSize > 20000000) {
                console.warn("Project too large for auto-sync.");
                return false;
            }

            // Verify project ownership
            if (session.user?.id && currentProjectId) {
                const { data: existingSnapshot } = await supabase
                    .from('conlang_snapshots')
                    .select('user_id')
                    .eq('project_id', currentProjectId)
                    .maybeSingle();

                if (existingSnapshot && existingSnapshot.user_id && existingSnapshot.user_id !== session.user.id) {
                    currentProjectId = 'proj_' + crypto.randomUUID();
                    useConfigStore.getState().updateConfig({ projectId: currentProjectId });
                }
            }

            // Push to snapshots
            const { error } = await supabase.from('conlang_snapshots').upsert({
                user_id: session.user?.id || null,
                project_id: currentProjectId,
                project_data: finalPayload
            }, { onConflict: 'project_id' });

            if (error) throw error;

            // Push to version history
            if (session.user?.id) {
                const autoVersionName = `Auto Save - ${new Date().toLocaleString()}`;
                const { error: versionError } = await supabase.from('conlang_versions').insert({
                    user_id: session.user.id,
                    project_id: currentProjectId,
                    version_name: autoVersionName,
                    project_data: finalPayload
                });
                if (versionError) console.warn("Failed to save version history:", versionError);

                // Cleanup old versions
                try {
                    const keepCount = isMassivePayload ? 3 : 10;
                    const { data: oldVersions } = await supabase
                        .from('conlang_versions')
                        .select('id')
                        .eq('project_id', currentProjectId)
                        .order('created_at', { ascending: false })
                        .range(keepCount, 100);

                    if (oldVersions && oldVersions.length > 0) {
                        const idsToDelete = oldVersions.map(v => v.id);
                        await supabase.from('conlang_versions').delete().in('id', idsToDelete);
                    }
                } catch (cleanupErr) {
                    console.warn("Failed to cleanup old versions:", cleanupErr);
                }
            }

            // Push to conlangs table for cross-device sync
            if (session.user?.id) {
                const { error: conlangError } = await supabase.from('conlangs').upsert({
                    user_id: session.user.id,
                    project_id: currentProjectId,
                    project_data: finalPayload
                }, { onConflict: 'project_id' });

                if (conlangError) throw conlangError;
            }

            useConfigStore.getState().updateConfig({ lastCloudSync: new Date().toISOString() });
            return true;
        } catch (err) {
            console.error("Auto-sync failed:", err.message || err);
            return false;
        } finally {
            isSyncing.current = false;
        }
    }, []);

    // Compute a clean state fingerprint for change detection
    const computeFingerprint = useCallback(() => {
        const config = useConfigStore.getState();
        const lexicon = useLexiconStore.getState().lexicon || [];

        // Strip volatile UI-only fields from comparison
        const {
            lastCloudSync, syncConflictStatus, activeTab, isThemeModalOpen,
            showSettings, isSidebarOpen, isRehydrating, activity,
            // Strip bloat fields that are in IndexedDB, not meaningful for sync comparison
            customFontBase64, customFont, syllabaryMap, customGlyphs, scriptDataById,
            featuralComponents, alphabetGlyphs,
            ...cleanConfig
        } = config;

        return JSON.stringify({ config: cleanConfig, lexiconLength: lexicon.length, lexicon });
    }, []);

    // The debounced sync trigger
    const triggerAutoSync = useCallback(() => {
        const config = useConfigStore.getState();

        if (!config.isAutoSyncEnabled || config.syncConflictStatus === 'conflict') {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            return;
        }

        if (isFirstRun.current) {
            isFirstRun.current = false;
            lastSyncStateRef.current = computeFingerprint();
            return;
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Debounce for 5 seconds
        timeoutRef.current = setTimeout(async () => {
            // Read fresh state at sync time, not at trigger time
            const currentFingerprint = computeFingerprint();

            if (currentFingerprint !== lastSyncStateRef.current) {
                const success = await pushToCloud();
                if (success) {
                    lastSyncStateRef.current = currentFingerprint;
                }
            }
        }, 5000);
    }, [computeFingerprint, pushToCloud]);

    // Subscribe to both stores using vanilla subscribe (single-argument form)
    useEffect(() => {
        // useConfigStore does NOT use subscribeWithSelector, so we use the
        // single-argument subscribe(listener) form. The listener is called on
        // every state change.
        const unsubscribeConfig = useConfigStore.subscribe(() => {
            triggerAutoSync();
        });

        // useLexiconStore DOES use subscribeWithSelector, but for consistency
        // and simplicity we also use the single-argument form here.
        const unsubscribeLexicon = useLexiconStore.subscribe(() => {
            triggerAutoSync();
        });

        return () => {
            unsubscribeConfig();
            unsubscribeLexicon();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [triggerAutoSync]);
}

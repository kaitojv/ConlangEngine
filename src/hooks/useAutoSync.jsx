// src/hooks/useAutoSync.jsx
import { useEffect, useRef, useCallback } from 'react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { supabase } from '@/utils/supabaseClient.js';
import { getDeviceId } from '@/utils/deviceIdentity.js';
import {
    pullRemoteProject,
    performProjectMerge,
    applyMergedStateLocally,
    pushProjectState
} from '@/utils/syncEngine.js';
import { MERGE_MODES } from '@/utils/syncMerge.js';

const LAST_VERSION_SAVE_KEY = 'ce_last_version_save_ts';
const VERSION_CHECKPOINT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * useAutoSync — handles debounced cloud synchronization, Supabase Realtime
 * cross-device sync pings, presence tracking, and profile setting propagation.
 */
export function useAutoSync() {
    const lastSyncStateRef = useRef(null);
    const timeoutRef = useRef(null);
    const isFirstRun = useRef(true);
    const isSyncing = useRef(false);

    // Compute a clean fingerprint of local data to detect changes
    const computeFingerprint = useCallback(() => {
        const config = useConfigStore.getState();
        const lexicon = useLexiconStore.getState().lexicon || [];
        const phrases = useLexiconStore.getState().phrases || [];

        const volatileKeys = new Set([
            'lastCloudSync', 'syncConflictStatus', 'activeTab', 'isThemeModalOpen',
            'showSettings', 'isSidebarOpen', 'isRehydrating', 'activity',
            'customFontBase64', 'customFont', 'syllabaryMap', 'customGlyphs', 'scriptDataById',
            'featuralComponents', 'alphabetGlyphs', 'devicesOnlineCount'
        ]);
        const cleanConfig = Object.fromEntries(
            Object.entries(config).filter(([k]) => !volatileKeys.has(k))
        );

        // Lightweight summaries so glyph additions/updates trigger auto-sync
        // without stringifying multi-megabyte base64 fonts.
        const scriptDataSummary = Object.entries(config.scriptDataById || {}).map(([sId, sData]) => ({
            id: sId,
            glyphsCount: Object.keys(sData?.customGlyphs || {}).length,
            syllablesCount: Object.keys(sData?.syllabaryMap || {}).length,
            alphabetCount: Object.keys(sData?.alphabetGlyphs || {}).length,
            hasFont: Boolean(sData?.customFontBase64),
        }));

        const rootGlyphsSummary = {
            glyphsCount: Object.keys(config.customGlyphs || {}).length,
            syllablesCount: Object.keys(config.syllabaryMap || {}).length,
            alphabetCount: Object.keys(config.alphabetGlyphs || {}).length,
            hasFont: Boolean(config.customFontBase64),
        };

        return JSON.stringify({
            config: cleanConfig,
            scriptDataSummary,
            rootGlyphsSummary,
            lexiconLength: lexicon.length,
            phrasesLength: phrases.length,
            lexicon,
            phrases
        });
    }, []);

    // Push local state or perform pre-push 3-way merge if remote advanced
    const pushToCloud = useCallback(async () => {
        if (isSyncing.current) return false;
        isSyncing.current = true;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return false;

            const config = useConfigStore.getState();
            let currentProjectId = config.projectId;
            if (!currentProjectId || currentProjectId.startsWith('local_')) {
                currentProjectId = 'proj_' + crypto.randomUUID();
                config.updateConfig({ projectId: currentProjectId });
            }

            const localState = {
                config,
                lexicon: useLexiconStore.getState().lexicon || [],
                phrases: useLexiconStore.getState().phrases || [],
                wiki: config.wikiPages || {}
            };

            // Check if remote changed since our last cloud sync
            const remote = await pullRemoteProject(currentProjectId);
            const localTime = config.lastCloudSync ? new Date(config.lastCloudSync).getTime() : 0;

            if (remote && remote.remoteTimestamp > localTime + 3500) {
                // Remote has newer changes! Merge first so we don't erase them
                const mergeRes = await performProjectMerge({
                    projectId: currentProjectId,
                    localState,
                    remoteState: remote.remoteState,
                    mode: config.isAutoSyncEnabled ? MERGE_MODES.AUTO : MERGE_MODES.REVIEW,
                    decisions: {}
                });

                if (mergeRes.conflicts.length > 0) {
                    // Conflicting simultaneous edits: pause auto-push and prompt review
                    config.updateConfig({ syncConflictStatus: 'conflict' });
                    return false;
                }

                // Clean merge: apply combined state locally and push back to cloud
                await applyMergedStateLocally(currentProjectId, mergeRes.merged);
                localState.lexicon = mergeRes.merged.lexicon;
                localState.phrases = mergeRes.merged.phrases;
                localState.config = mergeRes.merged.config;
                localState.wiki = mergeRes.merged.wiki;
            }

            // Determine if we should record a version history checkpoint (at most every 30 mins)
            let shouldSaveVersion = false;
            try {
                const lastSave = parseInt(localStorage.getItem(LAST_VERSION_SAVE_KEY) || '0', 10);
                if (Date.now() - lastSave > VERSION_CHECKPOINT_INTERVAL_MS) {
                    shouldSaveVersion = true;
                    localStorage.setItem(LAST_VERSION_SAVE_KEY, String(Date.now()));
                }
            } catch {
                // Ignore storage error
            }

            const versionName = shouldSaveVersion ? `Auto Save — ${new Date().toLocaleString()}` : null;
            const res = await pushProjectState(session, currentProjectId, localState, {
                versionName,
                skipVersions: !shouldSaveVersion
            });

            return res.success;
        } catch (err) {
            console.error("Auto-sync push failed:", err.message || err);
            return false;
        } finally {
            isSyncing.current = false;
        }
    }, []);

    // Debounced trigger
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

        // Live mode uses fast 1.5s debounce; standard auto-sync uses 5s
        const debounceMs = config.isProActive ? 1500 : 5000;

        timeoutRef.current = setTimeout(async () => {
            const currentFingerprint = computeFingerprint();
            if (currentFingerprint !== lastSyncStateRef.current) {
                const success = await pushToCloud();
                if (success) {
                    lastSyncStateRef.current = currentFingerprint;
                }
            }
        }, debounceMs);
    }, [computeFingerprint, pushToCloud]);

    // 1. Subscribe to local store mutations
    useEffect(() => {
        const unsubscribeConfig = useConfigStore.subscribe(() => {
            triggerAutoSync();
        });
        const unsubscribeLexicon = useLexiconStore.subscribe(() => {
            triggerAutoSync();
        });

        return () => {
            unsubscribeConfig();
            unsubscribeLexicon();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [triggerAutoSync]);

    // 2. Realtime listener: cross-device live updates and presence
    useEffect(() => {
        let channel = null;
        let profileChannel = null;

        const setupRealtime = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const config = useConfigStore.getState();
            const projectId = config.projectId;
            if (!projectId || projectId.startsWith('local_')) return;

            const myDeviceId = getDeviceId();

            // Project Realtime channel (changes & presence)
            channel = supabase.channel(`live_project_${projectId}`, {
                config: {
                    presence: { key: myDeviceId }
                }
            });

            channel
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'conlang_snapshots',
                    filter: `project_id=eq.${projectId}`
                }, async () => {
                    // Remote update occurred
                    if (isSyncing.current) return;
                    const curConfig = useConfigStore.getState();
                    if (!curConfig.isAutoSyncEnabled) return;

                    try {
                        const remote = await pullRemoteProject(projectId);
                        if (!remote) return;

                        const localTime = curConfig.lastCloudSync ? new Date(curConfig.lastCloudSync).getTime() : 0;
                        if (remote.remoteTimestamp > localTime + 2000) {
                            const localState = {
                                config: curConfig,
                                lexicon: useLexiconStore.getState().lexicon || [],
                                phrases: useLexiconStore.getState().phrases || [],
                                wiki: curConfig.wikiPages || {}
                            };

                            const mergeRes = await performProjectMerge({
                                projectId,
                                localState,
                                remoteState: remote.remoteState,
                                mode: curConfig.isAutoSyncEnabled ? MERGE_MODES.AUTO : MERGE_MODES.REVIEW,
                                decisions: {}
                            });

                            if (mergeRes.conflicts.length === 0) {
                                await applyMergedStateLocally(projectId, mergeRes.merged);
                            } else {
                                curConfig.updateConfig({ syncConflictStatus: 'conflict' });
                            }
                        }
                    } catch (e) {
                        console.warn("Realtime sync handler error:", e);
                    }
                })
                .on('presence', { event: 'sync' }, () => {
                    const state = channel.presenceState();
                    const activeCount = Object.keys(state).length || 1;
                    useConfigStore.setState({ devicesOnlineCount: activeCount });
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await channel.track({
                            onlineAt: new Date().toISOString(),
                            deviceId: myDeviceId
                        });
                    }
                });

            // Account-level profiles Realtime channel (propagates live_auto_sync toggle across devices)
            profileChannel = supabase.channel(`live_profile_${session.user.id}`)
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${session.user.id}`
                }, (payload) => {
                    if (payload.new && payload.new.live_auto_sync !== undefined && payload.new.live_auto_sync !== null) {
                        useConfigStore.setState({ isAutoSyncEnabled: Boolean(payload.new.live_auto_sync) });
                    }
                })
                .subscribe();
        };

        setupRealtime();

        return () => {
            if (channel) supabase.removeChannel(channel);
            if (profileChannel) supabase.removeChannel(profileChannel);
        };
    }, [pushToCloud]);
}

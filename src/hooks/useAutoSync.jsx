// src/hooks/useAutoSync.jsx
import { useEffect, useRef, useCallback, useState } from 'react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useProjectStore } from '@/store/useProjectStore.jsx';
import { supabase } from '@/utils/supabaseClient.js';
import { getDeviceId } from '@/utils/deviceIdentity.js';
import {
    pullRemoteProject,
    performProjectMerge,
    applyMergedStateLocally,
    pushProjectState
} from '@/utils/syncEngine.js';
import { MERGE_MODES } from '@/utils/syncMerge.js';
import {
    getAccountChannel,
    fetchLatestCloudProject,
    broadcastProjectUpdate
} from '@/utils/realtimeSync.js';

const LAST_VERSION_SAVE_KEY = 'ce_last_version_save_ts';
const VERSION_CHECKPOINT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * useAutoSync — handles real-time cross-device synchronization between PC, Mobile, and Tablet.
 * Features:
 *  - Debounced auto-push for local changes.
 *  - Supabase Realtime WebSockets broadcast for instant (<100ms) peer-to-peer updates.
 *  - Account-level broadcast channel so mobile automatically switches to active cloud conlangs.
 *  - Background sleep / tab-switch wakeup (visibilitychange & focus).
 *  - Periodic liveness heartbeat fallback.
 */
export function useAutoSync() {
    const lastSyncStateRef = useRef(null);
    const timeoutRef = useRef(null);
    const isFirstRun = useRef(true);
    const isSyncing = useRef(false);
    const [activeSession, setActiveSession] = useState(null);

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
                    config.updateConfig({ syncConflictStatus: 'conflict' });
                    return false;
                }

                await applyMergedStateLocally(currentProjectId, mergeRes.merged);
                localState.lexicon = mergeRes.merged.lexicon;
                localState.phrases = mergeRes.merged.phrases;
                localState.config = mergeRes.merged.config;
                localState.wiki = mergeRes.merged.wiki;
            }

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

    // Debounced trigger for local edits
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

        // Live mode uses 1.5s debounce; standard auto-sync uses 5s
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

    // 2. Track authentication session
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setActiveSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setActiveSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Helper: Pull and apply or merge remote project state
    const syncRemoteProject = useCallback(async (projectId, forceSwitch = false) => {
        if (!projectId || projectId.startsWith('local_')) return;
        if (isSyncing.current) return;

        const curConfig = useConfigStore.getState();

        try {
            const remote = await pullRemoteProject(projectId);
            if (!remote) return;

            const isDifferentProject = curConfig.projectId !== projectId;
            const localTime = curConfig.lastCloudSync ? new Date(curConfig.lastCloudSync).getTime() : 0;

            if (forceSwitch || isDifferentProject) {
                // Device switched or had only a local scratchpad: load cloud project
                await applyMergedStateLocally(projectId, remote.remoteState);
                try {
                    useProjectStore.getState().saveProjectToArchive(
                        { ...remote.remoteState.config, projectId },
                        remote.remoteState.lexicon,
                        remote.remoteState.phrases
                    );
                } catch (e) {
                    // Ignore local storage error
                }
                return;
            }

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
                    try {
                        useProjectStore.getState().saveProjectToArchive(
                            { ...mergeRes.merged.config, projectId },
                            mergeRes.merged.lexicon,
                            mergeRes.merged.phrases
                        );
                    } catch (e) {
                        // Ignore local storage error
                    }
                } else {
                    curConfig.updateConfig({ syncConflictStatus: 'conflict' });
                }
            }
        } catch (e) {
            console.warn("syncRemoteProject error:", e);
        }
    }, []);

    // Helper: Discover and load the user's latest active conlang from the cloud
    const checkAndSyncLatestProject = useCallback(async (userId) => {
        if (!userId) return;
        const curConfig = useConfigStore.getState();
        if (!curConfig.isAutoSyncEnabled) return;

        try {
            const latest = await fetchLatestCloudProject(userId);
            if (!latest) return;

            const isLocalOnly = !curConfig.projectId || curConfig.projectId.startsWith('local_');
            const isDifferentProject = curConfig.projectId !== latest.projectId;
            const localTime = curConfig.lastCloudSync ? new Date(curConfig.lastCloudSync).getTime() : 0;

            if (isLocalOnly || isDifferentProject) {
                await syncRemoteProject(latest.projectId, true);
            } else if (latest.updatedAt > localTime + 2000) {
                await syncRemoteProject(latest.projectId, false);
            }
        } catch (e) {
            console.warn("checkAndSyncLatestProject error:", e);
        }
    }, [syncRemoteProject]);

    // 3. Initial sync check & profile check when session changes or mounts
    useEffect(() => {
        if (!activeSession) return;

        const checkProfileAndSync = async () => {
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('live_auto_sync, is_pro, live_until')
                    .eq('id', activeSession.user.id)
                    .maybeSingle();

                if (profile && profile.live_auto_sync !== undefined && profile.live_auto_sync !== null) {
                    useConfigStore.setState({ isAutoSyncEnabled: Boolean(profile.live_auto_sync) });
                }

                // If Auto Sync is active, pull latest project from cloud immediately
                const isAuto = profile ? Boolean(profile.live_auto_sync) : useConfigStore.getState().isAutoSyncEnabled;
                if (isAuto) {
                    await checkAndSyncLatestProject(activeSession.user.id);
                }
            } catch (err) {
                console.warn("Profile sync check error:", err);
            }
        };

        checkProfileAndSync();
    }, [activeSession, checkAndSyncLatestProject]);

    // 4. Realtime channels: Account-level and Project-level subscriptions
    useEffect(() => {
        if (!activeSession) return;

        const userId = activeSession.user.id;
        const myDeviceId = getDeviceId();
        const accountChannel = getAccountChannel(userId);

        if (!accountChannel) return;

        // Account channel broadcast listeners
        accountChannel
            .on('broadcast', { event: 'project_updated' }, (msg) => {
                const payload = msg?.payload;
                if (!payload || payload.deviceId === myDeviceId) return;

                const curConfig = useConfigStore.getState();
                if (!curConfig.isAutoSyncEnabled) return;

                syncRemoteProject(payload.projectId, payload.projectId !== curConfig.projectId);
            })
            .on('broadcast', { event: 'toggle_auto_sync' }, (msg) => {
                const payload = msg?.payload;
                if (!payload || payload.deviceId === myDeviceId) return;

                const enabled = Boolean(payload.enabled);
                useConfigStore.setState({ isAutoSyncEnabled: enabled });

                if (enabled && payload.activeProjectId) {
                    syncRemoteProject(payload.activeProjectId, true);
                }
            });

        // Project channel for presence & postgres_changes
        let projectChannel = null;
        const curProjectId = useConfigStore.getState().projectId;

        if (curProjectId && !curProjectId.startsWith('local_')) {
            projectChannel = supabase.channel(`live_project_${curProjectId}`, {
                config: {
                    presence: { key: myDeviceId }
                }
            });

            projectChannel
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'conlang_snapshots',
                    filter: `project_id=eq.${curProjectId}`
                }, () => {
                    const curConfig = useConfigStore.getState();
                    if (!curConfig.isAutoSyncEnabled) return;
                    syncRemoteProject(curProjectId, false);
                })
                .on('presence', { event: 'sync' }, () => {
                    const state = projectChannel.presenceState();
                    const activeCount = Object.keys(state).length || 1;
                    useConfigStore.setState({ devicesOnlineCount: activeCount });
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await projectChannel.track({
                            onlineAt: new Date().toISOString(),
                            deviceId: myDeviceId
                        });
                    }
                });
        }

        return () => {
            if (projectChannel) {
                supabase.removeChannel(projectChannel);
            }
        };
    }, [activeSession, syncRemoteProject]);

    // 5. Mobile tab wakeup / sleep recovery & window focus
    useEffect(() => {
        if (!activeSession) return;

        const handleWakeup = () => {
            if (document.visibilityState === 'visible') {
                checkAndSyncLatestProject(activeSession.user.id);
            }
        };

        const handleFocus = () => {
            checkAndSyncLatestProject(activeSession.user.id);
        };

        document.addEventListener('visibilitychange', handleWakeup);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleWakeup);
            window.removeEventListener('focus', handleFocus);
        };
    }, [activeSession, checkAndSyncLatestProject]);

    // 6. Periodic liveness heartbeat (every 12 seconds when auto-sync is active)
    useEffect(() => {
        if (!activeSession) return;

        const interval = setInterval(() => {
            const curConfig = useConfigStore.getState();
            if (curConfig.isAutoSyncEnabled && document.visibilityState === 'visible') {
                checkAndSyncLatestProject(activeSession.user.id);
            }
        }, 12000);

        return () => clearInterval(interval);
    }, [activeSession, checkAndSyncLatestProject]);
}

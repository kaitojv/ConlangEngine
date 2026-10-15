// src/components/pages/home/SyncConflictManager.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { supabase } from '@/utils/supabaseClient.js';
import Modal from '@/components/UI/Modal/Modal.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import toast from 'react-hot-toast';
import {
    AlertTriangle,
    GitMerge,
    CloudDownload,
    HardDriveUpload,
    PlusCircle,
    Copy,
    Check
} from 'lucide-react';
import {
    pullRemoteProject,
    performProjectMerge,
    applyMergedStateLocally,
    pushProjectState,
    isSyncReviewEnabled
} from '@/utils/syncEngine.js';
import { MERGE_MODES, SIMILARITY, mergeProject } from '@/utils/syncMerge.js';
import './syncConflictManager.css';

export default function SyncConflictManager() {
    const { t } = useTranslation();
    const {
        projectId, lastCloudSync, isAutoSyncEnabled,
        updateConfig
    } = useConfigStore(useShallow(state => ({
        projectId: state.projectId,
        lastCloudSync: state.lastCloudSync,
        isAutoSyncEnabled: state.isAutoSyncEnabled,
        updateConfig: state.updateConfig
    })));

    const [session, setSession] = useState(null);
    const [remotePackage, setRemotePackage] = useState(null);
    const [decisions, setDecisions] = useState({});
    const [isApplying, setIsApplying] = useState(false);
    const [isReviewOpen, setIsReviewOpen] = useState(false);

    // Track active session
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
        return () => subscription.unsubscribe();
    }, []);

    // Check remote cloud state for updates
    const checkForUpdates = useCallback(async () => {
        if (!session || !projectId || projectId.startsWith('local_')) return;

        try {
            const remote = await pullRemoteProject(projectId);
            if (!remote) return;

            const localTime = lastCloudSync ? new Date(lastCloudSync).getTime() : 0;
            // Buffer to prevent false positives from immediate self-pushes
            if (remote.remoteTimestamp > localTime + 3500) {
                const localConfig = useConfigStore.getState();
                const localLexicon = useLexiconStore.getState().lexicon || [];
                const localPhrases = useLexiconStore.getState().phrases || [];
                const localWiki = localConfig.wikiPages || {};

                const localState = {
                    config: localConfig,
                    lexicon: localLexicon,
                    phrases: localPhrases,
                    wiki: localWiki
                };

                const initialMerge = await performProjectMerge({
                    projectId,
                    localState,
                    remoteState: remote.remoteState,
                    mode: isAutoSyncEnabled ? MERGE_MODES.AUTO : MERGE_MODES.REVIEW,
                    decisions: {}
                });

                const hasConflicts = initialMerge.conflicts.length > 0;
                const hasSimilar = initialMerge.similar.length > 0;
                const hasIncomingChanges = initialMerge.localChanged || hasConflicts || hasSimilar;

                // Cloud timestamp moved but content is identical or has no incoming updates for this device:
                // acknowledge new cloud timestamp and do NOT interrupt user with a review modal.
                if (!hasIncomingChanges) {
                    updateConfig({ lastCloudSync: new Date(remote.remoteTimestamp).toISOString() });
                    if (initialMerge.remoteChanged && isAutoSyncEnabled) {
                        await pushProjectState(session, projectId, initialMerge.merged, { skipVersions: true });
                    }
                    setRemotePackage(null);
                    return;
                }

                setRemotePackage({
                    ...remote,
                    base: initialMerge.base
                });

                // If Live Auto Sync is enabled, or the user opted out of the review modal,
                // apply clean merges silently without interrupting user. Real conflicts still require user decision.
                if ((isAutoSyncEnabled || !isSyncReviewEnabled()) && !hasConflicts) {
                    await applyMergedStateLocally(projectId, initialMerge.merged);
                    if (initialMerge.remoteChanged) {
                        await pushProjectState(session, projectId, initialMerge.merged, { skipVersions: true });
                    }
                    toast.success(t('sync.status.autoMergedToast'));
                    setRemotePackage(null);
                    return;
                }

                // Review needed or direct conflicts exist: prompt user
                updateConfig({ syncConflictStatus: 'conflict' });
                setIsReviewOpen(true);
            }
        } catch (err) {
            console.warn("Could not check for cloud updates:", err);
        }
    }, [session, projectId, lastCloudSync, isAutoSyncEnabled, updateConfig, t]);

    // Check on mount, window focus, and tab wakeup (visibilitychange)
    useEffect(() => {
        checkForUpdates();
        const handleFocus = () => checkForUpdates();
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') checkForUpdates();
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [checkForUpdates]);

    // Compute live merge synchronously based on current decisions
    const currentMerge = useMemo(() => {
        if (!remotePackage) return null;
        const localConfig = useConfigStore.getState();
        const localLexicon = useLexiconStore.getState().lexicon || [];
        const localPhrases = useLexiconStore.getState().phrases || [];
        const localWiki = localConfig.wikiPages || {};

        const localState = {
            config: localConfig,
            lexicon: localLexicon,
            phrases: localPhrases,
            wiki: localWiki
        };

        return mergeProject({
            base: remotePackage.base || null,
            local: localState,
            remote: remotePackage.remoteState,
            mode: MERGE_MODES.REVIEW,
            decisions
        });
    }, [remotePackage, decisions]);

    const handleApplyMerged = async () => {
        if (!remotePackage || !currentMerge) return;
        setIsApplying(true);
        try {
            const resolved = await currentMerge;
            // 1. Save checkpoint version
            const versionName = `Before Merge — ${new Date().toLocaleString()}`;
            // 2. Apply locally
            await applyMergedStateLocally(projectId, resolved.merged);
            // 3. Push to cloud
            await pushProjectState(session, projectId, resolved.merged, { versionName });

            toast.success(t('sync.status.autoMergedToast'));
            setIsReviewOpen(false);
            setRemotePackage(null);
            setDecisions({});
            updateConfig({ syncConflictStatus: 'resolved' });
        } catch (err) {
            console.error("Failed to apply merge:", err);
            toast.error(err.message || "Failed to merge");
        } finally {
            setIsApplying(false);
        }
    };

    const handlePullCloudOnly = async () => {
        if (!remotePackage) return;
        setIsApplying(true);
        try {
            await applyMergedStateLocally(projectId, remotePackage.remoteState);
            toast.success(t('sync.status.pulledToast'));
            setIsReviewOpen(false);
            setRemotePackage(null);
            updateConfig({ syncConflictStatus: 'resolved' });
        } catch (err) {
            toast.error(err.message || "Failed to pull cloud version");
        } finally {
            setIsApplying(false);
        }
    };

    const handleKeepLocalOnly = async () => {
        setIsApplying(true);
        try {
            const localConfig = useConfigStore.getState();
            const localLexicon = useLexiconStore.getState().lexicon || [];
            const localPhrases = useLexiconStore.getState().phrases || [];
            const localWiki = localConfig.wikiPages || {};

            const localState = {
                config: localConfig,
                lexicon: localLexicon,
                phrases: localPhrases,
                wiki: localWiki
            };

            const versionName = `Overwrite Cloud — ${new Date().toLocaleString()}`;
            await pushProjectState(session, projectId, localState, { versionName });

            toast.success(t('sync.status.pushedToast'));
            setIsReviewOpen(false);
            setRemotePackage(null);
            updateConfig({ syncConflictStatus: 'resolved' });
        } catch (err) {
            toast.error(err.message || "Failed to keep local version");
        } finally {
            setIsApplying(false);
        }
    };

    const setItemDecision = (key, choice) => {
        setDecisions(prev => ({
            ...prev,
            [key]: choice
        }));
    };

    if (!isReviewOpen || !remotePackage) return null;

    const report = currentMerge?.report || {};
    const similarList = currentMerge?.similar || [];
    const conflictList = currentMerge?.conflicts || [];

    return (
        <Modal
            isOpen={isReviewOpen}
            onClose={() => {
                setIsReviewOpen(false);
                updateConfig({ syncConflictStatus: 'ignored' });
            }}
            title={
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={18} color="var(--acc)" />
                    {t('sync.title')}
                </span>
            }
        >
            <div className="sync-review-modal">
                {/* Summary Card */}
                <div className="sync-summary-card">
                    <div className="sync-summary-header">
                        <GitMerge size={18} color="var(--acc)" />
                        <h3>{t('sync.summaryTitle')}</h3>
                    </div>
                    <p className="sync-summary-desc">{t('sync.summaryDesc')}</p>

                    <div className="sync-badges-grid">
                        <div className="sync-badge-item">
                            <PlusCircle size={14} color="var(--acc)" />
                            {t('sync.addedRemote', { count: report.lexicon?.addedRemote || 0 })}
                        </div>
                        <div className="sync-badge-item">
                            <PlusCircle size={14} color="var(--tx)" />
                            {t('sync.addedLocal', { count: report.lexicon?.addedLocal || 0 })}
                        </div>
                        {similarList.length > 0 && (
                            <div className="sync-badge-item highlight">
                                <Copy size={14} />
                                {t('sync.similarFound', { count: similarList.length })}
                            </div>
                        )}
                        {conflictList.length > 0 && (
                            <div className="sync-badge-item highlight">
                                <AlertTriangle size={14} />
                                {t('sync.conflictsFound', { count: conflictList.length })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Primary Actions */}
                <div className="sync-main-actions">
                    <Button
                        variant="imp"
                        onClick={handleApplyMerged}
                        disabled={isApplying}
                        className="sync-action-btn-primary"
                    >
                        <div className="btn-content">
                            <GitMerge size={16} />
                            {t('sync.mergeAll')}
                        </div>
                    </Button>

                    <div className="sync-action-subrow">
                        <Button
                            variant="default"
                            onClick={handlePullCloudOnly}
                            disabled={isApplying}
                        >
                            <div className="btn-content">
                                <CloudDownload size={15} />
                                {t('sync.useCloud')}
                            </div>
                        </Button>
                        <Button
                            variant="default"
                            onClick={handleKeepLocalOnly}
                            disabled={isApplying}
                        >
                            <div className="btn-content">
                                <HardDriveUpload size={15} />
                                {t('sync.useLocal')}
                            </div>
                        </Button>
                    </div>
                </div>

                {/* Similar / Repeated Words Section */}
                {similarList.length > 0 && (
                    <div>
                        <div className="sync-section-title">
                            <span>{t('sync.similarTitle')}</span>
                            <span>{similarList.length}</span>
                        </div>
                        <div className="sync-items-list">
                            {similarList.map(item => {
                                const activeChoice = decisions[item.key] || item.resolution || 'combine';
                                const badgeClass = item.level === SIMILARITY.IDENTICAL
                                    ? 'identical'
                                    : item.level === SIMILARITY.SAME_MEANING
                                    ? 'same-meaning'
                                    : 'same-word';

                                const badgeText = item.level === SIMILARITY.IDENTICAL
                                    ? t('sync.identicalBadge')
                                    : item.level === SIMILARITY.SAME_MEANING
                                    ? t('sync.sameMeaningBadge')
                                    : t('sync.sameWordBadge');

                                return (
                                    <div key={item.key} className="sync-item-card">
                                        <div className="sync-item-header">
                                            <div className="sync-item-word">
                                                <span>{item.localEntry?.word || item.remoteEntry?.word}</span>
                                                <span className={`sync-level-tag ${badgeClass}`}>
                                                    {badgeText}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="sync-diff-columns">
                                            <div className="sync-diff-col">
                                                <span className="sync-diff-label">{t('sync.localDevice')}</span>
                                                <span className="sync-diff-val">
                                                    {item.localEntry?.translation}
                                                    {item.localEntry?.definition ? ` — ${item.localEntry.definition}` : ''}
                                                </span>
                                            </div>
                                            <div className="sync-diff-col">
                                                <span className="sync-diff-label">{t('sync.remoteDevice')}</span>
                                                <span className="sync-diff-val">
                                                    {item.remoteEntry?.translation}
                                                    {item.remoteEntry?.definition ? ` — ${item.remoteEntry.definition}` : ''}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="sync-item-options">
                                            <button
                                                type="button"
                                                className={`sync-choice-chip ${activeChoice === 'combine' ? 'active' : ''}`}
                                                onClick={() => setItemDecision(item.key, 'combine')}
                                            >
                                                {activeChoice === 'combine' && <Check size={12} style={{ marginRight: '4px' }} />}
                                                {t('sync.combineAuto')}
                                            </button>
                                            <button
                                                type="button"
                                                className={`sync-choice-chip ${activeChoice === 'keepBoth' ? 'active' : ''}`}
                                                onClick={() => setItemDecision(item.key, 'keepBoth')}
                                            >
                                                {activeChoice === 'keepBoth' && <Check size={12} style={{ marginRight: '4px' }} />}
                                                {t('sync.keepBoth')}
                                            </button>
                                            <button
                                                type="button"
                                                className={`sync-choice-chip ${activeChoice === 'keepLocal' ? 'active' : ''}`}
                                                onClick={() => setItemDecision(item.key, 'keepLocal')}
                                            >
                                                {activeChoice === 'keepLocal' && <Check size={12} style={{ marginRight: '4px' }} />}
                                                {t('sync.keepLocalOnly')}
                                            </button>
                                            <button
                                                type="button"
                                                className={`sync-choice-chip ${activeChoice === 'keepRemote' ? 'active' : ''}`}
                                                onClick={() => setItemDecision(item.key, 'keepRemote')}
                                            >
                                                {activeChoice === 'keepRemote' && <Check size={12} style={{ marginRight: '4px' }} />}
                                                {t('sync.keepRemoteOnly')}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Simultaneous Conflict Edits */}
                {conflictList.length > 0 && (
                    <div>
                        <div className="sync-section-title">
                            <span>{t('sync.conflictsTitle')}</span>
                            <span>{conflictList.length}</span>
                        </div>
                        <div className="sync-items-list">
                            {conflictList.map(conflict => {
                                const activeChoice = decisions[conflict.key] || conflict.resolution || conflict.autoResolution;

                                return (
                                    <div key={conflict.key} className="sync-item-card">
                                        <div className="sync-item-header">
                                            <span style={{ fontWeight: 600 }}>{conflict.field || conflict.key}</span>
                                        </div>

                                        <div className="sync-diff-columns">
                                            <div className="sync-diff-col">
                                                <span className="sync-diff-label">{t('sync.localDevice')}</span>
                                                <span className="sync-diff-val">
                                                    {typeof conflict.localValue === 'object'
                                                        ? JSON.stringify(conflict.localValue)
                                                        : String(conflict.localValue ?? '')}
                                                </span>
                                            </div>
                                            <div className="sync-diff-col">
                                                <span className="sync-diff-label">{t('sync.remoteDevice')}</span>
                                                <span className="sync-diff-val">
                                                    {typeof conflict.remoteValue === 'object'
                                                        ? JSON.stringify(conflict.remoteValue)
                                                        : String(conflict.remoteValue ?? '')}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="sync-item-options">
                                            <button
                                                type="button"
                                                className={`sync-choice-chip ${activeChoice === 'local' ? 'active' : ''}`}
                                                onClick={() => setItemDecision(conflict.key, 'local')}
                                            >
                                                {activeChoice === 'local' && <Check size={12} style={{ marginRight: '4px' }} />}
                                                {t('sync.localDevice')}
                                            </button>
                                            <button
                                                type="button"
                                                className={`sync-choice-chip ${activeChoice === 'remote' ? 'active' : ''}`}
                                                onClick={() => setItemDecision(conflict.key, 'remote')}
                                            >
                                                {activeChoice === 'remote' && <Check size={12} style={{ marginRight: '4px' }} />}
                                                {t('sync.remoteDevice')}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useSharing } from '@/hooks/useSharing.jsx';
import { supabase } from '@/utils/supabaseClient.js';
import Modal from '@/components/UI/Modal/Modal.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import { sanitizeConfig, sanitizeLexicon, decompressPayloadAsync } from '@/utils/schemaValidator.jsx';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import toast from 'react-hot-toast';
import { CloudDownload, HardDriveUpload, AlertTriangle } from 'lucide-react';

export default function SyncConflictManager() {
    const { t } = useTranslation();
    const {
        projectId, lastCloudSync, syncConflictStatus,
        updateConfig, setFullConfig,
    } = useConfigStore(useShallow(state => ({
        projectId: state.projectId,
        lastCloudSync: state.lastCloudSync,
        syncConflictStatus: state.syncConflictStatus,
        updateConfig: state.updateConfig,
        setFullConfig: state.setFullConfig,
    })));
    const setLexicon = useLexiconStore((state) => state.setLexicon);
    const [session, setSession] = useState(null);
    const { handlePushToCloud } = useSharing(session);

    // Track cloud payload so we don't have to fetch it twice
    const [cloudPayload, setCloudPayload] = useState(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const checkForConflicts = async () => {
        if (!session || !projectId || !lastCloudSync || projectId.startsWith('local_')) return;

        try {
            // Fetch the latest snapshot from the cloud
            const { data, error } = await supabase
                .from('conlang_snapshots')
                .select('created_at, project_data')
                .eq('project_id', projectId)
                .maybeSingle();

            if (error || !data) return;

            const projectData = await decompressPayloadAsync(data.project_data);
            const cloudTimestamp = projectData?.last_updated ? new Date(projectData.last_updated).getTime() : new Date(data.created_at).getTime();
            const localTimestamp = new Date(lastCloudSync).getTime();

            // Give a 5-second buffer to account for minor clock desyncs during the actual push
            if (cloudTimestamp > localTimestamp + 5000) {
                setCloudPayload(projectData);
                updateConfig({ syncConflictStatus: 'conflict' });
            }
        } catch (err) {
            console.warn('Could not check for sync conflicts:', err);
        }
    };

    // Check on mount and when window regains focus
    useEffect(() => {
        checkForConflicts();

        const handleFocus = () => checkForConflicts();
        window.addEventListener('focus', handleFocus);

        return () => window.removeEventListener('focus', handleFocus);
    }, [session, projectId, lastCloudSync]);


    const handlePullCloud = () => {
        if (!cloudPayload) return;

        const safeConfig = sanitizeConfig(cloudPayload.config || {});
        const safeLexicon = sanitizeLexicon(cloudPayload.dictionary || []);
        
        setLexicon(safeLexicon);
        setFullConfig({ ...safeConfig, projectId: projectId });
        
        if (cloudPayload.wiki) {
            updateConfig({ wikiPages: cloudPayload.wiki });
        }
        
        updateConfig({ 
            syncConflictStatus: 'resolved',
            lastCloudSync: new Date().toISOString() // Update local timestamp to match cloud
        });
        
        setCloudPayload(null);
        toast.success("Pulled changes from another device!");
    };

    const handleKeepLocal = async () => {
        // Pushing to cloud will naturally update `lastCloudSync`
        const success = await handlePushToCloud(true, `Conflict Resolution: Overwrite`);
        if (success) {
            updateConfig({ syncConflictStatus: 'resolved' });
            setCloudPayload(null);
            toast.success("Kept local changes and overwrote cloud.");
        } else {
            toast.error("Failed to push local changes to cloud.");
        }
    };

    return (
        <Modal 
            isOpen={syncConflictStatus === 'conflict'} 
            onClose={() => {
                updateConfig({ syncConflictStatus: 'ignored' });
                setCloudPayload(null);
            }} 
            title={<><AlertTriangle color="var(--err)" style={{ position: 'relative', top: '2px', marginRight: '5px' }}/> {t('syncConflict.title')}</>}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
                <p style={{ margin: 0, color: 'var(--tx)' }}>
                    {t('syncConflict.desc')}
                </p>
                
                <p style={{ margin: 0, color: 'var(--tx2)', fontSize: '0.9rem' }}>
                    {t('syncConflict.question')}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    <Button variant="imp" onClick={handlePullCloud} style={{ width: '100%', justifyContent: 'flex-start' }}>
                        <div className="btn-content"><CloudDownload /> {t('syncConflict.pullCloud')}</div>
                    </Button>
                    <Button variant="default" onClick={handleKeepLocal} style={{ width: '100%', justifyContent: 'flex-start' }}>
                        <div className="btn-content"><HardDriveUpload /> {t('syncConflict.keepLocal')}</div>
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

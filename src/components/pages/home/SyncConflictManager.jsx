import React, { useEffect, useState } from 'react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useSharing } from '@/hooks/useSharing.jsx';
import { supabase } from '@/utils/supabaseClient.js';
import Modal from '@/components/UI/Modal/Modal.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import { sanitizeConfig, sanitizeLexicon, decompressPayload } from '@/utils/schemaValidator.jsx';
import toast from 'react-hot-toast';
import { CloudDownload, HardDriveUpload, AlertTriangle } from 'lucide-react';

export default function SyncConflictManager() {
    const config = useConfigStore();
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
        if (!session || !config.projectId) return;

        try {
            // Fetch the latest snapshot from the cloud
            const { data, error } = await supabase
                .from('conlang_snapshots')
                .select('created_at, project_data')
                .eq('project_id', config.projectId)
                .single();

            if (error || !data) return;

            if (!config.lastCloudSync) return; // Do not show conflict for users who have never synced on this device

            const projectData = decompressPayload(data.project_data);
            const cloudTimestamp = projectData?.last_updated ? new Date(projectData.last_updated).getTime() : new Date(data.created_at).getTime();
            const localTimestamp = new Date(config.lastCloudSync).getTime();

            // Give a 5-second buffer to account for minor clock desyncs during the actual push
            if (cloudTimestamp > localTimestamp + 5000) {
                setCloudPayload(projectData);
                config.updateConfig({ syncConflictStatus: 'conflict' });
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
    }, [session, config.projectId, config.lastCloudSync]);


    const handlePullCloud = () => {
        if (!cloudPayload) return;

        const safeConfig = sanitizeConfig(cloudPayload.config || {});
        const safeLexicon = sanitizeLexicon(cloudPayload.dictionary || []);
        
        setLexicon(safeLexicon);
        config.setFullConfig({ ...safeConfig, projectId: config.projectId });
        
        if (cloudPayload.wiki) {
            config.updateConfig({ wikiPages: cloudPayload.wiki });
        }
        
        config.updateConfig({ 
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
            config.updateConfig({ syncConflictStatus: 'resolved' });
            setCloudPayload(null);
            toast.success("Kept local changes and overwrote cloud.");
        } else {
            toast.error("Failed to push local changes to cloud.");
        }
    };

    return (
        <Modal 
            isOpen={config.syncConflictStatus === 'conflict'} 
            onClose={() => {
                config.updateConfig({ syncConflictStatus: 'ignored' });
                setCloudPayload(null);
            }} 
            title={<><AlertTriangle color="var(--err)" style={{ position: 'relative', top: '2px', marginRight: '5px' }}/> Sync Conflict Detected</>}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
                <p style={{ margin: 0, color: 'var(--tx)' }}>
                    It looks like this project was recently modified and saved to the cloud on <b>another device</b>.
                </p>
                
                <p style={{ margin: 0, color: 'var(--tx2)', fontSize: '0.9rem' }}>
                    What would you like to do? Note: Your auto-sync has been temporarily paused to prevent accidentally overwriting the cloud.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    <Button variant="imp" onClick={handlePullCloud} style={{ width: '100%', justifyContent: 'flex-start' }}>
                        <div className="btn-content"><CloudDownload /> Pull Cloud Version (Overwrite Local)</div>
                    </Button>
                    <Button variant="default" onClick={handleKeepLocal} style={{ width: '100%', justifyContent: 'flex-start' }}>
                        <div className="btn-content"><HardDriveUpload /> Keep Local Version (Overwrite Cloud)</div>
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

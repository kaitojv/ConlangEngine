import { useState } from 'react';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { supabase } from '@/utils/supabaseClient.js';
import { sanitizeConfig } from '@/utils/schemaValidator.jsx';
import toast from 'react-hot-toast';

export function useSharing(session) {
    const [isSharing, setIsSharing] = useState(false);
    const lexicon = useLexiconStore(state => state.lexicon) || [];
    const config = useConfigStore();

    const handlePushToCloud = async (isManualSync = true) => {
        // Only enforce session for manual "Push to Cloud" button
        if (isManualSync && !session) {
            toast.error("You must be logged in to sync!");
            return false;
        }
        
        let currentProjectId = config.projectId;
        if (!currentProjectId) {
            currentProjectId = 'proj_' + crypto.randomUUID();
            config.updateConfig({ projectId: currentProjectId });
        }

        const configData = sanitizeConfig(useConfigStore.getState());
        const payload = { 
            dictionary: lexicon, 
            config: configData, 
            wiki: config.wikiPages || {} 
        };
        
        try {
            // Always push to the snapshots table for public links
            const { error } = await supabase.from('conlang_snapshots').upsert({ 
                user_id: session?.user?.id || null, 
                project_id: currentProjectId, 
                project_data: payload 
            }, { onConflict: 'project_id' });

            if (error) throw error;
            
            if (isManualSync) {
                toast.success('Cloud Sync Complete!');
                config.logActivity('Pushed dictionary to the cloud.');
            }
            return true;
        } catch (err) {
            console.error("Supabase Error Context:", { 
                errorCode: err.code, 
                message: err.message, 
                details: err.details,
                hint: err.hint,
                session: !!session 
            });
            
            if (isManualSync) {
                toast.error(`Sync failed: ${err.message}`);
            }
            return false;
        }
    };

    const handleShareLink = async () => {
        setIsSharing(true);
        const toastId = toast.loading('Generating share link...');
        
        try {
            // Auto-push so the link actually points to something valid
            const success = await handlePushToCloud(false);
            
            if (!success) {
                toast.error('Failed to generate share link.', { id: toastId });
                return;
            }
            
            const currentProjectId = config.projectId || useConfigStore.getState().projectId;
            if (!currentProjectId) {
                toast.error("Error generating project ID.", { id: toastId });
                return;
            }

            const shareUrl = `${window.location.origin}/view/${currentProjectId}`;
            await navigator.clipboard.writeText(shareUrl);
            
            toast.success('Share link copied to clipboard!', { id: toastId });
            
            // Still show the alert for emphasis on anonymous sharing
            if (!session) {
                alert("🔗 Public Reader Link Copied!\n\nSince you are not logged in, this is a permanent snapshot of your current work. Anyone with this link can view it.");
            } else {
                alert("🔗 Public Reader Link Copied!\n\nAnyone with this link can view a read-only showcase of your conlang.");
            }

        } catch (err) {
            console.error(err);
            toast.error("Failed to copy link.", { id: toastId });
        } finally {
            setIsSharing(false);
        }
    };

    return { isSharing, handleShareLink, handlePushToCloud };
}

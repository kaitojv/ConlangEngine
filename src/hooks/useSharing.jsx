import { useState } from 'react';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { supabase } from '@/utils/supabaseClient.js';
import toast from 'react-hot-toast';
import { pushProjectState } from '@/utils/syncEngine.js';

/**
 * Pushes the current workspace state to Supabase (snapshots, versions, conlangs).
 * Can be called standalone or from useSharing hook.
 */
export async function pushProjectToCloud(session = null, isManualSync = false, versionName = null) {
    let activeSession = session;
    if (!activeSession) {
        try {
            const { data } = await supabase.auth.getSession();
            activeSession = data?.session;
        } catch (sErr) {
            console.warn("Could not fetch session:", sErr);
        }
    }

    // Only enforce session for manual "Push to Cloud" button
    if (isManualSync && !activeSession) {
        toast.error("You must be logged in to sync!");
        return false;
    }

    const state = useConfigStore.getState();
    let currentProjectId = state.projectId;
    if (!currentProjectId) {
        currentProjectId = 'proj_' + crypto.randomUUID();
        state.updateConfig({ projectId: currentProjectId });
    }

    const localState = {
        config: state,
        lexicon: useLexiconStore.getState().lexicon || [],
        phrases: useLexiconStore.getState().phrases || [],
        wiki: state.wikiPages || {}
    };

    try {
        const defaultVersionName = isManualSync ? `Manual Save — ${new Date().toLocaleString()}` : null;
        const res = await pushProjectState(activeSession, currentProjectId, localState, {
            versionName: versionName || defaultVersionName
        });

        if (res.success) {
            if (isManualSync) {
                toast.success('Cloud Sync Complete!');
                state.logActivity?.('Pushed dictionary to the cloud.');
            }
            return true;
        } else {
            if (isManualSync) toast.error(`Sync failed: ${res.error}`);
            return false;
        }
    } catch (err) {
        console.error("Cloud push failed:", err);
        if (isManualSync) {
            toast.error(`Sync failed: ${err.message}`);
        }
        return false;
    }
}

export function useSharing(session) {
    const [isSharing, setIsSharing] = useState(false);
    const projectId = useConfigStore(state => state.projectId);

    const handlePushToCloud = async (isManualSync = true, versionName = null) => {
        return pushProjectToCloud(session, isManualSync, versionName);
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
            
            const currentProjectId = projectId || useConfigStore.getState().projectId;
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

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

    const handlePushToCloud = async (isManualSync = true, versionName = null) => {
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

        const configData = sanitizeConfig(useConfigStore.getState(), true);
        
        // SEC/PERF: Strip massive base64 font from cloud payload to prevent Supabase statement timeouts
        delete configData.customFontBase64;
        delete configData.customFont;
        
        const payload = { 
            dictionary: lexicon, 
            config: configData, 
            wiki: config.wikiPages || {},
            last_updated: new Date().toISOString()
        };
        
        // SEC/PERF: Hard limit payload to ~8MB to prevent database exhaustion, but allow massive logographic languages
        const payloadSizeStr = JSON.stringify(payload);
        const isMassivePayload = payloadSizeStr.length > 3000000; // > 3MB
        
        if (payloadSizeStr.length > 8000000) {
            if (isManualSync) toast.error("Project is too large to sync to the cloud! Please remove large images from your wiki (Limit: 8MB).");
            return false;
        }
        
        try {
            // SEC: Before upserting, verify that this project_id doesn't belong to another user
            if (session?.user?.id && currentProjectId) {
                const { data: existingSnapshot } = await supabase
                    .from('conlang_snapshots')
                    .select('user_id')
                    .eq('project_id', currentProjectId)
                    .single();

                if (existingSnapshot && existingSnapshot.user_id && existingSnapshot.user_id !== session.user.id) {
                    // Project belongs to someone else! (e.g., imported from a different account)
                    // Generate a new project ID to fork it instead of overwriting
                    currentProjectId = 'proj_' + crypto.randomUUID();
                    config.updateConfig({ projectId: currentProjectId });
                    toast('Forked project to avoid overwriting another account.');
                }
            }

            // Always push to the snapshots table for public links
            const { error } = await supabase.from('conlang_snapshots').upsert({ 
                user_id: session?.user?.id || null, 
                project_id: currentProjectId, 
                project_data: payload 
            }, { onConflict: 'project_id' });

            if (error) throw error;

            // Push to version history table if logged in
            if (session?.user?.id) {
                const autoVersionName = versionName || (isManualSync ? `Manual Save - ${new Date().toLocaleString()}` : `Auto Save - ${new Date().toLocaleString()}`);
                const { error: versionError } = await supabase.from('conlang_versions').insert({
                    user_id: session.user.id,
                    project_id: currentProjectId,
                    version_name: autoVersionName,
                    project_data: payload
                });
                if (versionError) console.warn("Failed to save version history:", versionError);

                // --- NEW CODE: CLEANUP OLD VERSIONS ---
                // We don't want the database to blow up. Keep fewer versions for massive projects.
                try {
                    const keepCount = isMassivePayload ? 3 : 10;
                    const { data: oldVersions } = await supabase
                        .from('conlang_versions')
                        .select('id')
                        .eq('project_id', currentProjectId)
                        .order('created_at', { ascending: false })
                        .range(keepCount, 100); // Fetch versions beyond the keep limit

                    if (oldVersions && oldVersions.length > 0) {
                        const idsToDelete = oldVersions.map(v => v.id);
                        await supabase.from('conlang_versions').delete().in('id', idsToDelete);
                    }
                } catch (cleanupErr) {
                    console.warn("Failed to cleanup old versions:", cleanupErr);
                }
            }

            // If logged in, also push to the conlangs table for syncing across devices
            if (session?.user?.id) {
                const { error: conlangError } = await supabase.from('conlangs').upsert({ 
                    user_id: session.user.id, 
                    project_id: currentProjectId, 
                    project_data: payload 
                }, { onConflict: 'project_id' });

                if (conlangError) throw conlangError;
            }
            
            if (isManualSync) {
                toast.success('Cloud Sync Complete!');
                config.logActivity('Pushed dictionary to the cloud.');
            }
            
            config.updateConfig({ lastCloudSync: new Date().toISOString() });
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

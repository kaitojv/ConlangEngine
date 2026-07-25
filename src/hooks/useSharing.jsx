import { useState } from 'react';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { supabase } from '@/utils/supabaseClient.js';
import { sanitizeConfig } from '@/utils/schemaValidator.jsx';
import toast from 'react-hot-toast';
import LZString from 'lz-string';

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
        
        // SEC/PERF: Compress massive payloads to prevent database exhaustion
        const payloadSizeStr = JSON.stringify(payload);
        let finalPayload = payload;
        
        if (payloadSizeStr.length > 1000000) {
            try {
                // Use native CompressionStream for superior JSON compression
                const stream = new Blob([JSON.stringify({
                    dictionary: lexicon,
                    wiki: config.wikiPages || {}
                })]).stream();
                const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
                const compressedResponse = new Response(compressedStream);
                const compressedArrayBuffer = await compressedResponse.arrayBuffer();
                
                // Convert ArrayBuffer to Base64 in chunks to avoid Maximum Call Stack Size Exceeded
                const bytes = new Uint8Array(compressedArrayBuffer);
                let binary = '';
                // V8 limits function arguments to 65535. A safe chunk size is 32768.
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
                // Fallback to LZString if gzip fails for any reason
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
        const isMassivePayload = finalPayloadSize > 3000000; // > 3MB after compression
        
        if (finalPayloadSize > 20000000) {
            toast.error("Project is too large to sync to the cloud! Please remove large images from your wiki.");
            return false;
        }
        
        try {
            let activeSession = session;
            if (!activeSession) {
                try {
                    const { data } = await supabase.auth.getSession();
                    activeSession = data?.session;
                } catch (sErr) {
                    console.warn("Could not fetch session:", sErr);
                }
            }

            // SEC: Before upserting, verify that this project_id doesn't belong to another user
            if (activeSession?.user?.id && currentProjectId) {
                const { data: existingSnapshot } = await supabase
                    .from('conlang_snapshots')
                    .select('user_id')
                    .eq('project_id', currentProjectId)
                    .maybeSingle();

                if (existingSnapshot && existingSnapshot.user_id && existingSnapshot.user_id !== activeSession.user.id) {
                    // Project belongs to someone else! (e.g., imported from a different account)
                    // Generate a new project ID to fork it instead of overwriting
                    currentProjectId = 'proj_' + crypto.randomUUID();
                    config.updateConfig({ projectId: currentProjectId });
                    toast('Forked project to avoid overwriting another account.');
                }
            }

            // Always push to the snapshots table for public links
            const { error } = await supabase.from('conlang_snapshots').upsert({ 
                user_id: activeSession?.user?.id || null, 
                project_id: currentProjectId, 
                project_data: finalPayload 
            }, { onConflict: 'project_id' });

            if (error) throw error;

            // Push to version history table if logged in
            if (activeSession?.user?.id) {
                const autoVersionName = versionName || (isManualSync ? `Manual Save - ${new Date().toLocaleString()}` : `Auto Save - ${new Date().toLocaleString()}`);
                const { error: versionError } = await supabase.from('conlang_versions').insert({
                    user_id: activeSession.user.id,
                    project_id: currentProjectId,
                    version_name: autoVersionName,
                    project_data: finalPayload
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
            if (activeSession?.user?.id) {
                const { error: conlangError } = await supabase.from('conlangs').upsert({ 
                    user_id: activeSession.user.id, 
                    project_id: currentProjectId, 
                    project_data: finalPayload 
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

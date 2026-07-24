import { useEffect, useRef, useState } from 'react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useSharing } from '@/hooks/useSharing.jsx';
import { supabase } from '@/utils/supabaseClient.js';
import toast from 'react-hot-toast';

export function useAutoSync() {
    const [session, setSession] = useState(null);
    const { handlePushToCloud } = useSharing(session);
    
    // Track the last synced state to avoid redundant syncs
    const lastSyncStateRef = useRef(null);
    const timeoutRef = useRef(null);
    const isFirstRun = useRef(true);

    // 1. Get session globally
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    // 2. Watch for changes and debounce push
    useEffect(() => {
        const unsubscribeConfig = useConfigStore.subscribe(
            (state) => state,
            (configState) => triggerAutoSync(configState, useLexiconStore.getState().lexicon)
        );

        const unsubscribeLexicon = useLexiconStore.subscribe(
            (state) => state.lexicon,
            (lexiconState) => triggerAutoSync(useConfigStore.getState(), lexiconState)
        );

        return () => {
            unsubscribeConfig();
            unsubscribeLexicon();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [session]);

    const triggerAutoSync = (config, lexicon) => {
        if (!config.isAutoSyncEnabled || config.syncConflictStatus === 'conflict') {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            return;
        }

        if (isFirstRun.current) {
            isFirstRun.current = false;
            // Record initial state but don't sync it
            lastSyncStateRef.current = JSON.stringify({
                config: config,
                lexicon: lexicon
            });
            return;
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Debounce for 5 seconds
        timeoutRef.current = setTimeout(async () => {
            const currentStateStr = JSON.stringify({
                config: config,
                lexicon: lexicon
            });

            if (currentStateStr !== lastSyncStateRef.current) {
                if (session) {
                    const success = await handlePushToCloud(false);
                    if (success) {
                        lastSyncStateRef.current = currentStateStr;
                    }
                }
            }
        }, 5000); // 5 seconds debounce
    };
}

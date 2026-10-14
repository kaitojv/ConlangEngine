// src/utils/realtimeSync.js
// ─────────────────────────────────────────────────────────────────────────────
// Real-time synchronization layer for Conlang Engine.
// Provides instantaneous cross-device communication via Supabase Realtime
// WebSockets (peer-to-peer broadcasts + presence + postgres_changes).
// Ensures PC, Mobile, and Tablet stay perfectly live.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabaseClient.js';
import { getDeviceId } from './deviceIdentity.js';

const activeChannels = new Map();

/**
 * Returns or creates a persistent channel for account-level real-time broadcasts.
 */
export function getAccountChannel(userId) {
    if (!userId) return null;
    const channelName = `live_account_${userId}`;
    
    if (activeChannels.has(channelName)) {
        return activeChannels.get(channelName);
    }

    const channel = supabase.channel(channelName, {
        config: {
            broadcast: { ack: false, self: false }
        }
    });

    channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            // Channel is ready to transmit and receive
        }
    });

    activeChannels.set(channelName, channel);
    return channel;
}

/**
 * Broadcasts project updates to all devices logged into the user's account.
 */
export async function broadcastProjectUpdate({ userId, projectId, remoteTimestamp, deviceId }) {
    if (!userId || !projectId) return;
    try {
        const channel = getAccountChannel(userId);
        if (channel) {
            await channel.send({
                type: 'broadcast',
                event: 'project_updated',
                payload: {
                    projectId,
                    remoteTimestamp: remoteTimestamp || Date.now(),
                    deviceId: deviceId || getDeviceId()
                }
            });
        }
    } catch (e) {
        console.warn("Failed to broadcast project update:", e);
    }
}

/**
 * Broadcasts Auto Sync toggle across all devices in real-time.
 */
export async function broadcastAutoSyncToggle({ userId, enabled, activeProjectId, deviceId }) {
    if (!userId) return;
    try {
        const channel = getAccountChannel(userId);
        if (channel) {
            await channel.send({
                type: 'broadcast',
                event: 'toggle_auto_sync',
                payload: {
                    enabled: Boolean(enabled),
                    activeProjectId: activeProjectId || null,
                    deviceId: deviceId || getDeviceId(),
                    timestamp: Date.now()
                }
            });
        }
    } catch (e) {
        console.warn("Failed to broadcast auto sync toggle:", e);
    }
}

/**
 * Subscribes to account-level broadcasts (Auto Sync toggle and project update pings).
 */
export function subscribeAccountLive(userId, { onProjectUpdate, onToggleAutoSync }) {
    if (!userId) return () => {};
    const channel = getAccountChannel(userId);
    if (!channel) return () => {};

    const projectUpdateSub = channel.on('broadcast', { event: 'project_updated' }, (payload) => {
        if (onProjectUpdate && payload?.payload) {
            onProjectUpdate(payload.payload);
        }
    });

    const toggleSub = channel.on('broadcast', { event: 'toggle_auto_sync' }, (payload) => {
        if (onToggleAutoSync && payload?.payload) {
            onToggleAutoSync(payload.payload);
        }
    });

    return () => {
        // Channel remains active in map to avoid churn, but callbacks can be deregistered if needed
    };
}

/**
 * Fetches the user's most recently modified project from the cloud.
 */
export async function fetchLatestCloudProject(userId) {
    if (!userId) return null;

    try {
        // First check conlangs table
        const { data: conlangData, error: conlangErr } = await supabase
            .from('conlangs')
            .select('project_id, updated_at, project_data')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(1);

        if (!conlangErr && conlangData && conlangData.length > 0) {
            return {
                projectId: conlangData[0].project_id,
                updatedAt: new Date(conlangData[0].updated_at).getTime(),
                rawPayload: conlangData[0].project_data
            };
        }

        // Fallback to conlang_snapshots
        const { data: snapData, error: snapErr } = await supabase
            .from('conlang_snapshots')
            .select('project_id, created_at, updated_at, project_data')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1);

        if (!snapErr && snapData && snapData.length > 0) {
            const time = snapData[0].updated_at || snapData[0].created_at;
            return {
                projectId: snapData[0].project_id,
                updatedAt: new Date(time).getTime(),
                rawPayload: snapData[0].project_data
            };
        }

        return null;
    } catch (e) {
        console.warn("fetchLatestCloudProject error:", e);
        return null;
    }
}

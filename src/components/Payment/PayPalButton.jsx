import React from 'react';
import { PayPalButtons } from "@paypal/react-paypal-js";
import { supabase } from '@/utils/supabaseClient.js';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { toast } from 'react-hot-toast';

/**
 * PayPalButton Component
 * Handles PayPal subscription logic and updates the user's profile in Supabase.
 */
const PayPalButton = () => {
    const config = useConfigStore();
    const PLAN_ID = import.meta.env.VITE_PAYPAL_PLAN_ID;

    const handleSuccess = async (data) => {
        const { session } = await supabase.auth.getSession();
        if (!session?.user) {
            toast.error("You must be logged in to sync your LIVE status.");
            return;
        }

        try {
            // Update the profile in Supabase
            // We set is_pro to true and potentially a live_until date
            // For subscriptions, it's better to rely on is_pro or a long-dated live_until
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    is_pro: true,
                    // Optionally store subscription ID
                    // paypal_subscription_id: data.subscriptionID 
                })
                .eq('id', session.user.id);

            if (error) throw error;

            // Update local state
            config.updateConfig({ isProActive: true });
            config.logActivity("Upgraded to Conlang Engine LIVE via PayPal!");
            
            toast.success("Welcome to LIVE! Cloud features are now unlocked.", {
                duration: 5000,
                icon: '🚀',
            });
        } catch (err) {
            console.error("Error updating profile:", err);
            toast.error("Payment successful, but failed to update profile. Please contact support.");
        }
    };

    const isPlaceholder = !PLAN_ID || PLAN_ID.includes('YOUR_PAYPAL') || import.meta.env.VITE_PAYPAL_CLIENT_ID?.includes('YOUR_PAYPAL');

    if (isPlaceholder) {
        return (
            <div className="p-4 bg-amber-900/20 border border-amber-500/50 rounded-lg text-amber-200 text-sm">
                <p className="font-bold mb-1">PayPal Integration Pending</p>
                <p>Please update <code>VITE_PAYPAL_CLIENT_ID</code> and <code>VITE_PAYPAL_PLAN_ID</code> in your <code>.env.local</code> file to see the checkout button.</p>
            </div>
        );
    }

    return (
        <div className="paypal-button-container" style={{ minHeight: '150px' }}>
            <PayPalButtons
                style={{
                    shape: 'pill',
                    color: 'gold',
                    layout: 'vertical',
                    label: 'subscribe'
                }}
                createSubscription={(data, actions) => {
                    return actions.subscription.create({
                        plan_id: PLAN_ID
                    });
                }}
                onApprove={async (data, actions) => {
                    await handleSuccess(data);
                }}
                onCancel={() => {
                    toast("Payment cancelled", { icon: 'ℹ️' });
                }}
                onError={(err) => {
                    console.error("PayPal Error:", err);
                    toast.error("A PayPal error occurred. Please try again.");
                }}
            />
        </div>
    );
};

export default PayPalButton;

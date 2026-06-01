import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import Button from '../Buttons/Buttons.jsx';

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

        if (isIosDevice && !isStandalone) {
            // Only show iOS prompt once per session to avoid annoying users
            if (!sessionStorage.getItem('iosPwaPromptDismissed')) {
                setIsIOS(true);
                setShowPrompt(true);
            }
        }

        const handleBeforeInstallPrompt = (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            
            // Only show if not dismissed recently
            if (!sessionStorage.getItem('pwaPromptDismissed')) {
                setShowPrompt(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        
        setShowPrompt(false);
        deferredPrompt.prompt();
        
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted the A2HS prompt');
        } else {
            console.log('User dismissed the A2HS prompt');
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        if (isIOS) {
            sessionStorage.setItem('iosPwaPromptDismissed', 'true');
        } else {
            sessionStorage.setItem('pwaPromptDismissed', 'true');
        }
    };

    if (!showPrompt) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--s3)',
            border: '1px solid var(--acc)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            zIndex: 99999,
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            width: 'calc(100% - 40px)',
            maxWidth: '400px'
        }}>
            <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: 'var(--tx)' }}>Install ConlangEngine</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--tx2)' }}>
                    {isIOS ? (
                        <>To install, tap the <b>Share</b> icon below and select <b>Add to Home Screen</b>.</>
                    ) : (
                        <>Install the app on your device for offline access and a better experience.</>
                    )}
                </p>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {!isIOS && (
                    <Button variant="save" className="btn-sm" onClick={handleInstallClick}>
                        <Download size={14} /> Install
                    </Button>
                )}
                <button 
                    onClick={handleDismiss} 
                    style={{ background: 'transparent', border: 'none', color: 'var(--tx2)', cursor: 'pointer', padding: '4px' }}
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}

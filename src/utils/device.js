// src/utils/device.js
// Desktop vs. mobile/tablet detection.
//
// The REST API backup feature talks to the Conlang Engine Obsidian plugin,
// which is DESKTOP-ONLY. So the entire feature (settings tab, navbar status,
// background engine) must be hidden/disabled on phones and tablets.

import { useEffect, useState } from 'react';

// Heuristic: a real desktop has a fine pointer (mouse), no coarse-primary touch,
// a non-mobile user agent, and a wide enough viewport.
export function isDesktopDevice() {
    if (typeof window === 'undefined') return false;

    const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i
        .test(navigator.userAgent || '');

    // iPadOS reports as desktop Safari but has touch + no fine pointer.
    const finePointer = window.matchMedia?.('(pointer: fine)')?.matches ?? true;
    const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
    const wideEnough = window.innerWidth >= 1024;

    if (mobileUA) return false;
    if (coarsePointer && !finePointer) return false; // touch-only device
    return finePointer && wideEnough;
}

// Reactive hook — re-evaluates on resize / pointer changes.
export function useIsDesktop() {
    const [desktop, setDesktop] = useState(() => isDesktopDevice());

    useEffect(() => {
        const update = () => setDesktop(isDesktopDevice());
        window.addEventListener('resize', update);
        const mq = window.matchMedia?.('(pointer: fine)');
        mq?.addEventListener?.('change', update);
        return () => {
            window.removeEventListener('resize', update);
            mq?.removeEventListener?.('change', update);
        };
    }, []);

    return desktop;
}

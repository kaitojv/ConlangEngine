import { useEffect, useState } from 'react';

// Shared by the CSS @media block in index.css and by JS-driven animation
// (framer-motion transitions and the FloatingBackground parallax loop),
// which CSS alone cannot stop.

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange) {
    if (typeof window === 'undefined' || !window.matchMedia) return () => {};
    const mql = window.matchMedia(QUERY);
    // Safari < 14 only supports the deprecated add/removeListener API.
    if (mql.addEventListener) {
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
}

function getSnapshot() {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(QUERY).matches;
}

// Cached so multiple components reading the hook during one render share a
// single value and only trigger a re-render when the setting actually flips.
let cachedValue = null;

export function usePrefersReducedMotion() {
    const [prefersReduced, setPrefersReduced] = useState(() => {
        cachedValue = getSnapshot();
        return cachedValue;
    });

    useEffect(() => {
        const check = () => {
            const next = getSnapshot();
            if (next !== cachedValue) {
                cachedValue = next;
                setPrefersReduced(next);
            }
        };
        check();
        return subscribe(check);
    }, []);

    return prefersReduced;
}

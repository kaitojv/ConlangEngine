// src/hooks/useTransliterator.jsx
// Thin React wrapper around the pure transliteration utilities.
import React from 'react';
import { useConfigStore } from '../store/useConfigStore.jsx';
import { transliterateText, normalizeToBase as normalizeToBasePure } from '../utils/transliteration.js';

export function useTransliterator(overrideConfig = null) {
    const storeConfig = useConfigStore();
    const activeConfig = overrideConfig || storeConfig;

    // Depend on the config object itself, not a hand-picked subset of fields.
    // The bodies below read the whole config, so tracking only some keys (as an
    // earlier version did) left a stale closure whenever any other field changed
    // -- which silently produced outdated transliterations.
    const transliterate = React.useCallback((word, lexicon = []) => {
        return transliterateText(word, activeConfig, lexicon);
    }, [activeConfig]);

    const normalizeToBase = React.useCallback((word) => {
        return normalizeToBasePure(word, activeConfig);
    }, [activeConfig]);

    return { transliterate, normalizeToBase };
}

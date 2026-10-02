// src/hooks/useTransliterator.jsx
// Thin React wrapper around the pure transliteration utilities.
import React from 'react';
import { useConfigStore } from '../store/useConfigStore.jsx';
import { useShallow } from 'zustand/react/shallow';
import { transliterateText, normalizeToBase as normalizeToBasePure } from '../utils/transliteration.js';

// The complete set of config keys transliterateText() reads, verified against
// src/utils/transliteration.js. Selecting exactly these keeps the callbacks
// stable across unrelated config changes.
//
// An earlier version listed a hand-picked subset (8 keys) and missed
// blockSettings, typographySettings and others, which left a stale closure and
// silently produced outdated transliterations. The set below is derived from the
// function body rather than guessed, and transliterateConfig is kept in one
// place so it can be re-checked if that function changes.
const TRANSLITERATION_KEYS = [
    'phonologyTypes',
    'alphabeticScript',
    'alphabetGlyphs',
    'syllabaryMap',
    'consonants',
    'vowels',
    'otherPhonemes',
    'syllabificationAlgorithm',
    'blockSettings',
    'typographySettings',
];

export function useTransliterator(overrideConfig = null) {
    // Only subscribe to the keys the transliteration functions actually read.
    // useShallow keeps the derived config reference stable as long as none of
    // these fields change, so the callbacks below do not churn on every
    // unrelated store update.
    const transliterateConfig = useConfigStore(
        useShallow((state) => {
            const cfg = {};
            for (const key of TRANSLITERATION_KEYS) cfg[key] = state[key];
            return cfg;
        })
    );

    const activeConfig = overrideConfig || transliterateConfig;

    const transliterate = React.useCallback((word, lexicon = []) => {
        return transliterateText(word, activeConfig, lexicon);
    }, [activeConfig]);

    const normalizeToBase = React.useCallback((word) => {
        return normalizeToBasePure(word, activeConfig);
    }, [activeConfig]);

    return { transliterate, normalizeToBase };
}

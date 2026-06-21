// src/hooks/useTransliterator.jsx
// Thin React wrapper around the pure transliteration utilities.
import React from 'react';
import { useConfigStore } from '../store/useConfigStore.jsx';
import { transliterateText, normalizeToBase as normalizeToBasePure } from '../utils/transliteration.js';

export function useTransliterator(overrideConfig = null) {
    const storeConfig = useConfigStore();
    const activeConfig = overrideConfig || storeConfig;

    const transliterate = React.useCallback((word, lexicon = []) => {
        return transliterateText(word, activeConfig, lexicon);
    }, [
        activeConfig.phonologyTypes,
        activeConfig.alphabeticScript,
        activeConfig.alphabetGlyphs,
        activeConfig.syllabaryMap,
        activeConfig.consonants,
        activeConfig.vowels,
        activeConfig.otherPhonemes,
        activeConfig.syllabificationAlgorithm,
    ]);

    const normalizeToBase = React.useCallback((word) => {
        return normalizeToBasePure(word, activeConfig);
    }, [
        activeConfig.phonologyTypes,
        activeConfig.alphabeticScript,
        activeConfig.alphabetGlyphs,
        activeConfig.consonants,
        activeConfig.vowels,
        activeConfig.otherPhonemes,
    ]);

    return { transliterate, normalizeToBase };
}

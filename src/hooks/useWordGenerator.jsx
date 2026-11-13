import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import { generateWordFromConfig } from '@/utils/wordGeneratorEngine.js';

export function useWordGenerator() {
    const { t } = useTranslation();

    const phonologyTypes = useConfigStore((state) => state.phonologyTypes);
    const syllabaryMap = useConfigStore((state) => state.syllabaryMap);
    const consonants = useConfigStore((state) => state.consonants);
    const vowels = useConfigStore((state) => state.vowels);
    const otherPhonemes = useConfigStore((state) => state.otherPhonemes);
    const otherPhonemeMapping = useConfigStore((state) => state.otherPhonemeMapping);
    const syllablePattern = useConfigStore((state) => state.syllablePattern);
    const syllablePatternWeights = useConfigStore((state) => state.syllablePatternWeights) || {};
    const verbMarker = useConfigStore((state) => state.verbMarker);
    const generatorMarkers = useConfigStore((state) => state.generatorMarkers) || {};
    const generatorRegexRules = useConfigStore((state) => state.generatorRegexRules) || [];
    const generatorOptions = useConfigStore((state) => state.generatorOptions) || {};
    const grammarRules = useConfigStore((state) => state.grammarRules) || [];
    const vowelHarmonySets = useConfigStore((state) => state.vowelHarmonySets) || [];
    const customWordClasses = useConfigStore((state) => state.customWordClasses) || [];
    const lexicon = useLexiconStore((state) => state.lexicon) || [];

    const [generatedWord, setGeneratedWord] = useState('');
    const [generatedIpa, setGeneratedIpa] = useState('');
    const [generatedClass, setGeneratedClass] = useState('');
    const [generatedStem, setGeneratedStem] = useState('');

    const setGeneratedPreview = useCallback((entry) => {
        if (!entry) return;
        setGeneratedWord(entry.word || '');
        setGeneratedIpa(entry.ipa || '');
        setGeneratedClass(entry.wordClass || '');
        setGeneratedStem(entry.stem || entry.word || '');
    }, []);

    // Supports positional signatures:
    // (min, max, targetClass, extraOpts), (len, targetClass, extraOpts), (lengthsArray, targetClass, extraOpts)
    const generateWord = useCallback((...args) => {
        let lengths = [];
        let targetClass = 'random';
        let extraOpts = {};

        if (args.length >= 3 && typeof args[0] === 'number' && typeof args[1] === 'number') {
            const min = Math.min(args[0], args[1]);
            const max = Math.max(args[0], args[1]);
            for (let i = min; i <= max; i++) lengths.push(i);
            if (typeof args[2] === 'string' && args[2]) targetClass = args[2];
            if (args[3] && typeof args[3] === 'object') extraOpts = args[3];
        } else if (args.length >= 2 && typeof args[0] === 'number' && typeof args[1] === 'string') {
            lengths = [args[0]];
            targetClass = args[1];
            if (args[2] && typeof args[2] === 'object') extraOpts = args[2];
        } else if (args.length >= 1 && typeof args[0] === 'number') {
            lengths = [args[0]];
            if (args[1] && typeof args[1] === 'object') extraOpts = args[1];
        } else if (Array.isArray(args[0])) {
            lengths = args[0];
            if (typeof args[1] === 'string' && args[1]) targetClass = args[1];
            if (args[2] && typeof args[2] === 'object') extraOpts = args[2];
        }

        if (lengths.length === 0) lengths = [2];

        const avoidDuplicates = extraOpts.avoidDuplicates ?? Boolean(generatorOptions.avoidDuplicates);
        const respectVowelHarmony = extraOpts.respectVowelHarmony ?? Boolean(generatorOptions.respectVowelHarmony);

        let existingWords = extraOpts.existingWords;
        if (avoidDuplicates && !existingWords) {
            existingWords = new Set(
                lexicon.map(w => (w.word || '').replace(/\*/g, '').trim().toLowerCase()).filter(Boolean)
            );
        }

        const result = generateWordFromConfig(
            {
                phonologyTypes,
                syllabaryMap,
                consonants,
                vowels,
                otherPhonemes,
                otherPhonemeMapping,
                syllablePattern,
                syllablePatternWeights,
                verbMarker,
                generatorMarkers,
                generatorRegexRules,
                grammarRules,
                vowelHarmonySets,
                customWordClasses,
            },
            {
                lengths,
                targetClass,
                respectVowelHarmony,
                avoidDuplicates,
                existingWords,
                maxAttempts: extraOpts.maxAttempts || 25,
            }
        );

        if (!result || result.error) {
            if (!extraOpts.silent) {
                if (result?.error === 'empty_syllabary') {
                    toast.error(t('generator.errorEmptySyllabary'));
                } else {
                    toast.error(t('generator.errorMissingPhonology'));
                }
            }
            return null;
        }

        if (!extraOpts.skipStateUpdate) {
            setGeneratedWord(result.word);
            setGeneratedIpa(result.ipa);
            setGeneratedClass(result.wordClass);
            setGeneratedStem(result.stem);
        }

        return result;
    }, [
        phonologyTypes, syllabaryMap, consonants, vowels, otherPhonemes, otherPhonemeMapping,
        syllablePattern, syllablePatternWeights, verbMarker, generatorMarkers, generatorRegexRules,
        grammarRules, vowelHarmonySets, customWordClasses, generatorOptions, lexicon, t
    ]);

    return { generatedWord, generatedIpa, generatedClass, generatedStem, setGeneratedPreview, generateWord };
}

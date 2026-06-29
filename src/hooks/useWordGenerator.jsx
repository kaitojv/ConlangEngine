import { useState, useCallback } from 'react';
import { useConfigStore } from '@/store/useConfigStore.jsx';

export function useWordGenerator() {
    // 1. Pull the grammar and phonology settings directly from your Zustand store
    const phonologyTypes = useConfigStore((state) => state.phonologyTypes);
    const syllabaryMap = useConfigStore((state) => state.syllabaryMap);
    const consonants = useConfigStore((state) => state.consonants);
    const vowels = useConfigStore((state) => state.vowels);
    const syllablePattern = useConfigStore((state) => state.syllablePattern);
    const syllablePatternWeights = useConfigStore((state) => state.syllablePatternWeights) || {};
    const verbMarker = useConfigStore((state) => state.verbMarker);
    const generatorMarkers = useConfigStore((state) => state.generatorMarkers) || {};

    // 2. Local state to hold the currently generated word data
    const [generatedWord, setGeneratedWord] = useState('');
    const [generatedIpa, setGeneratedIpa] = useState('');
    const [generatedClass, setGeneratedClass] = useState('');

    // Weighted random pick: selects from items proportionally to their weight
    const weightedPick = useCallback((items, weights) => {
        const total = weights.reduce((sum, w) => sum + w, 0);
        if (total <= 0) return items[Math.floor(Math.random() * items.length)];
        let r = Math.random() * total;
        for (let i = 0; i < items.length; i++) {
            r -= weights[i];
            if (r <= 0) return items[i];
        }
        return items[items.length - 1];
    }, []);

    // 3. The main generation function
    const generateWord = useCallback((allowedLengths = [2], targetClass = 'random') => {
        // Fallback for older calls that pass minSyllables, maxSyllables
        let lengths = Array.isArray(allowedLengths) ? allowedLengths : [];
        if (!Array.isArray(allowedLengths)) {
            // If it's a number, assume it's minSyllables
            const min = allowedLengths;
            const max = typeof targetClass === 'number' ? targetClass : min;
            for (let i = min; i <= max; i++) lengths.push(i);
            targetClass = typeof arguments[2] === 'string' ? arguments[2] : 'random';
        }
        if (lengths.length === 0) lengths = [2];

        const numSyllables = lengths[Math.floor(Math.random() * lengths.length)];
        const classFinal = targetClass === 'random' 
            ? ['noun', 'verb', 'adjective'][Math.floor(Math.random() * 3)] 
            : targetClass;
        
        let orthResult = '';
        let ipaResult = '';

        // SYLLABIC MODE
        if (phonologyTypes === 'syllabic') {
            const validSyllables = Object.keys(syllabaryMap || {});
            if (validSyllables.length === 0) {
                alert("⚠️ Syllabary Grid is empty!");
                return null;
            }

            for (let i = 0; i < numSyllables; i++) {
                const s = validSyllables[Math.floor(Math.random() * validSyllables.length)];
                orthResult += s;
                ipaResult += s; 
            }
        } 
        // ALPHABETIC MODE
        else {
            const parseP = (str) => str.split(',').map(s => s.trim()).filter(Boolean).map(item => item.includes('=') ? { ipa: item.split('=')[0].trim(), orth: item.split('=')[1].trim() } : { ipa: item, orth: item });
            
            const consList = parseP(consonants || '');
            const vogsList = parseP(vowels || '');
            
            // Smart parsing: Split by commas AND/OR spaces to ensure each pattern is totally isolated!
            const pads = (syllablePattern || '')
                .toUpperCase()
                .split(/[\s,]+/)
                .filter(Boolean);
            
            if (pads.length === 0 || consList.length === 0 || vogsList.length === 0) {
                 alert("⚠️ Missing consonants, vowels, or syllable patterns in Settings!");
                 return null;
            }

            // Build weight array for each pattern (default = 1 if not configured)
            const patternWeights = pads.map(p => {
                const w = syllablePatternWeights[p] ?? syllablePatternWeights[p.toLowerCase()];
                return (w !== undefined && w >= 0) ? w : 1;
            });
            
            let currentVCount = 0;
            let safetyCount = 0;
            
            while (currentVCount < numSyllables && safetyCount < 100) {
                safetyCount++;
                const padraoStr = weightedPick(pads, patternWeights); 
                
                // Dynamically resolve optional characters like (C) or (V)
                let resolvedPattern = '';
                for (let k = 0; k < padraoStr.length; k++) {
                    if (padraoStr[k] === '(') {
                        const end = padraoStr.indexOf(')', k);
                        if (end !== -1) {
                            const optionalPart = padraoStr.slice(k + 1, end);
                            // 50% chance to include the optional part
                            if (Math.random() > 0.5) resolvedPattern += optionalPart;
                            k = end; // Skip over the closing parenthesis
                        }
                    } else if (padraoStr[k] === 'C' || padraoStr[k] === 'V') {
                        resolvedPattern += padraoStr[k];
                    }
                }
                
                for (let j = 0; j < resolvedPattern.length; j++) {
                    // If we've reached the target syllable count, do not start a new syllable (V).
                    if (currentVCount >= numSyllables && resolvedPattern[j] === 'V') {
                        break;
                    }
                    
                    if (resolvedPattern[j] === 'C') { 
                        const c = consList[Math.floor(Math.random() * consList.length)]; 
                        orthResult += c.orth; 
                        ipaResult += c.ipa; 
                    } else if (resolvedPattern[j] === 'V') { 
                        const v = vogsList[Math.floor(Math.random() * vogsList.length)]; 
                        orthResult += v.orth; 
                        ipaResult += v.ipa; 
                        currentVCount++;
                    }
                }
            }
        }

        // Apply the per-class marker from generatorMarkers.
        // For verbs, fall back to the legacy verbMarker if generatorMarkers.verb is not set.
        const markerForClass = generatorMarkers[classFinal];
        const resolvedMarker = (markerForClass !== undefined && markerForClass !== '')
            ? markerForClass
            : (classFinal === 'verb' ? verbMarker : '');

        if (resolvedMarker) {
            let cleanMarker = resolvedMarker.split(',')[0].trim();
            if (cleanMarker.endsWith('-')) {
                cleanMarker = cleanMarker.slice(0, -1);
                if (cleanMarker && !orthResult.startsWith(cleanMarker)) {
                    orthResult = cleanMarker + orthResult;
                    ipaResult = cleanMarker + ipaResult;
                }
            } else {
                cleanMarker = cleanMarker.replace(/^-/, '');
                if (cleanMarker && !orthResult.endsWith(cleanMarker)) {
                    orthResult += cleanMarker;
                    ipaResult += cleanMarker;
                }
            }
        }

        // Save to our hook's state
        setGeneratedWord(orthResult);
        setGeneratedIpa(ipaResult);
        setGeneratedClass(classFinal);

        // Return the object in case the caller wants to use it immediately
        return { word: orthResult, ipa: ipaResult, wordClass: classFinal };
    }, [phonologyTypes, syllabaryMap, consonants, vowels, syllablePattern, syllablePatternWeights, verbMarker, generatorMarkers, weightedPick]);

    return { generatedWord, generatedIpa, generatedClass, generateWord };
}
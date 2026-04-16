import { useState, useCallback } from 'react';
import { useConfigStore } from '@/store/useConfigStore.jsx';

export function useWordGenerator() {
    // 1. Pull the grammar and phonology settings directly from your Zustand store
    const phonologyTypes = useConfigStore((state) => state.phonologyTypes);
    const syllabaryMap = useConfigStore((state) => state.syllabaryMap);
    const consonants = useConfigStore((state) => state.consonants);
    const vowels = useConfigStore((state) => state.vowels);
    const syllablePattern = useConfigStore((state) => state.syllablePattern);
    const verbMarker = useConfigStore((state) => state.verbMarker);

    // 2. Local state to hold the currently generated word data
    const [generatedWord, setGeneratedWord] = useState('');
    const [generatedIpa, setGeneratedIpa] = useState('');
    const [generatedClass, setGeneratedClass] = useState('');

    // 3. The main generation function
    const generateWord = useCallback((numSyllables = 2, targetClass = 'random') => {
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
            const sortear = (arr) => arr[Math.floor(Math.random() * arr.length)];
            
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
            
            let currentVCount = 0;
            let safetyCount = 0;
            
            while (currentVCount < numSyllables && safetyCount < 100) {
                safetyCount++;
                const padraoStr = sortear(pads); 
                
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
                        const c = sortear(consList); 
                        orthResult += c.orth; 
                        ipaResult += c.ipa; 
                    } else if (resolvedPattern[j] === 'V') { 
                        const v = sortear(vogsList); 
                        orthResult += v.orth; 
                        ipaResult += v.ipa; 
                        currentVCount++;
                    }
                }
            }
        }

        // Add Verb Marker if applicable (Strip any leading hyphens from the marker)
        if (classFinal === 'verb' && verbMarker) {
            const cleanMarker = verbMarker.split(',')[0].trim().replace(/^-/, ''); 
            if (!orthResult.endsWith(cleanMarker)) {
                orthResult += cleanMarker;
                ipaResult += cleanMarker;
            }
        }

        // Save to our hook's state
        setGeneratedWord(orthResult);
        setGeneratedIpa(ipaResult);
        setGeneratedClass(classFinal);

        // Return the object in case the caller wants to use it immediately
        return { word: orthResult, ipa: ipaResult, wordClass: classFinal };
    }, [phonologyTypes, syllabaryMap, consonants, vowels, syllablePattern, verbMarker]);

    return { generatedWord, generatedIpa, generatedClass, generateWord };
}
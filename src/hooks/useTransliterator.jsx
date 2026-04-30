// src/hooks/useTransliterator.jsx
import React from 'react';
import { useConfigStore } from '../store/useConfigStore.jsx';

const SCRIPT_MAPS = {
    runic: {
        'f': 'ᚠ', 'u': 'ᚢ', 'th': 'ᚦ', 'a': 'ᚨ', 'r': 'ᚱ', 'k': 'ᚲ', 'g': 'ᚷ', 'w': 'ᚹ',
        'h': 'ᚺ', 'n': 'ᚾ', 'i': 'ᛁ', 'j': 'ᛃ', 'ei': 'ᛇ', 'p': 'ᛈ', 'z': 'ᛉ', 's': 'ᛊ',
        't': 'ᛏ', 'b': 'ᛒ', 'e': 'ᛖ', 'm': 'ᛗ', 'l': 'ᛚ', 'ng': 'ᛜ', 'd': 'ᛞ', 'o': 'ᛟ'
    },
    cyrillic: {
        'shch': 'щ', 'sh': 'ш', 'zh': 'ж', 'ch': 'ч', 'ts': 'ц', 'ya': 'я', 'yu': 'ю',
        'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'e': 'е', 'z': 'з', 'i': 'и',
        'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р', 's': 'с',
        't': 'т', 'u': 'у', 'f': 'ф', 'h': 'х', 'y': 'ы'
    },
    greek: {
        'th': 'θ', 'ph': 'φ', 'ch': 'χ', 'ps': 'ψ',
        'a': 'α', 'b': 'β', 'g': 'γ', 'd': 'δ', 'e': 'ε', 'z': 'ζ', 'h': 'η', 'i': 'ι',
        'k': 'κ', 'l': 'λ', 'm': 'μ', 'n': 'ν', 'x': 'ξ', 'o': 'ο', 'p': 'π', 'r': 'ρ',
        's': 'σ', 't': 'τ', 'y': 'υ', 'w': 'ω'
    },
    georgian: {
        'ts': 'ც', 'dz': 'ძ', 'ch': 'ჩ', 'j': 'ჯ', 'sh': 'შ', 'zh': 'ჟ', 'gh': 'ღ', 'kh': 'ხ',
        'a': 'ა', 'b': 'ბ', 'g': 'გ', 'd': 'დ', 'e': 'ე', 'v': 'ვ', 'z': 'ზ', 't': 'თ',
        'i': 'ი', 'k': 'კ', 'l': 'ლ', 'm': 'მ', 'n': 'ნ', 'o': 'ო', 'p': 'პ', 'r': 'რ',
        's': 'ს', 'u': 'უ', 'p': 'ფ', 'q': 'ქ', 'h': 'ჰ'
    }
};

export function useTransliterator() {
    const phonologyTypes = useConfigStore((state) => state.phonologyTypes);
    const alphabeticScript = useConfigStore((state) => state.alphabeticScript);
    const syllabaryMap = useConfigStore((state) => state.syllabaryMap) || {};
    
    // Fetching consonants and vowels from Settings
    const consonants = useConfigStore((state) => state.consonants) || '';
    const vowels = useConfigStore((state) => state.vowels) || '';

    // Two-way dictionary mapping
    const getOrthographyMap = () => {
        const mapToText = {}; // Phonetic Value -> Visual Form (e.g., r -> რ)
        const mapToBase = {}; // Visual Form -> Phonetic Value (e.g., რ -> r)
        
        const allSounds = `${consonants},${vowels}`.split(',');

        allSounds.forEach(sound => {
            if (sound.includes('=')) {
                const [base, text] = sound.split('=').map(s => s.trim());
                if (base && text) {
                    mapToText[base] = text;
                    mapToBase[text] = base;
                }
            }
        });
        return { mapToText, mapToBase };
    };

    // 1. FROM MEMORY TO SCREEN (For rendering the dictionary list beautifully)
    const transliterate = React.useCallback((word, lexicon = []) => {
        if (!word) return "";
        let cleanWord = word.replace(/\*/g, '').toLowerCase();

        if (phonologyTypes === 'alphabetic' || !phonologyTypes) {
            const { mapToText } = getOrthographyMap();
            
            let result = cleanWord;

            // Apply pre-existing script mapping if chosen
            if (alphabeticScript && alphabeticScript !== 'latin') {
                const scriptMap = SCRIPT_MAPS[alphabeticScript] || {};
                const sortedKeys = Object.keys(scriptMap).sort((a, b) => b.length - a.length);
                let out = "";
                let i = 0;
                while (i < result.length) {
                    let match = null;
                    for (let key of sortedKeys) {
                        if (result.startsWith(key, i)) {
                            match = key; break;
                        }
                    }
                    if (match) { out += scriptMap[match]; i += match.length; } 
                    else { out += result[i]; i++; }
                }
                result = out;
            }

            // Apply custom "=" mappings on top
            if (Object.keys(mapToText).length > 0) {
                for (const [base, text] of Object.entries(mapToText)) {
                    const regex = new RegExp(base, 'g');
                    result = result.replace(regex, text);
                }
            }
            
            return result;
        }

        if (phonologyTypes === 'syllabic' || phonologyTypes === 'featural_block') {
            const syllables = Object.keys(syllabaryMap).sort((a, b) => b.length - a.length);
            let out = "";
            let i = 0;
            while (i < cleanWord.length) {
                let match = null;
                for (let syl of syllables) {
                    if (cleanWord.startsWith(syl, i) && syllabaryMap[syl]) {
                        match = syl; break;
                    }
                }
                if (match) { out += syllabaryMap[match]; i += match.length; } 
                else { out += cleanWord[i]; i++; }
            }
            return out;
        }

        if (phonologyTypes === 'logographic') {
            const dictEntry = lexicon.find(e => e.word.replace(/\*/g, '').toLowerCase() === cleanWord);
            return (dictEntry && dictEntry.ideogram) ? dictEntry.ideogram : cleanWord; 
        }

        return cleanWord;
    }, [phonologyTypes, alphabeticScript, syllabaryMap, consonants, vowels]);

    // 2. FROM KEYBOARD TO MEMORY (The Normalizer that protects against bugs)
    const normalizeToBase = React.useCallback((word) => {
        if (!word) return "";
        if (phonologyTypes !== 'alphabetic' && phonologyTypes) return word;

        const { mapToBase } = getOrthographyMap();
        let baseWord = word.toLowerCase();
        
        for (const [text, base] of Object.entries(mapToBase)) {
            // Escape the alien letter to prevent symbols like * or + from breaking the regex
            const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedText, 'g');
            baseWord = baseWord.replace(regex, base);
        }

        if (alphabeticScript && alphabeticScript !== 'latin') {
            const scriptMap = SCRIPT_MAPS[alphabeticScript] || {};
            for (const [base, text] of Object.entries(scriptMap)) {
                const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escapedText, 'g');
                baseWord = baseWord.replace(regex, base);
            }
        }

        return baseWord;
    }, [phonologyTypes, alphabeticScript, consonants, vowels]);

    return { transliterate, normalizeToBase };
}
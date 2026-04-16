// src/hooks/useTransliterator.jsx
import { useConfigStore } from '../store/useConfigStore.jsx';

export function useTransliterator() {
    const phonologyTypes = useConfigStore((state) => state.phonologyTypes);
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
    const transliterate = (word, lexicon = []) => {
        if (!word) return "";
        let cleanWord = word.replace(/\*/g, '').toLowerCase();

        if (phonologyTypes === 'alphabetic' || !phonologyTypes) {
            const { mapToText } = getOrthographyMap();
            
            // If the user hasn't configured any "=", return the normal word
            if (Object.keys(mapToText).length === 0) return cleanWord;

            // If configured, scan the word and replace the characters
            let result = cleanWord;
            for (const [base, text] of Object.entries(mapToText)) {
                const regex = new RegExp(base, 'g');
                result = result.replace(regex, text);
            }
            return result;
        }

        if (phonologyTypes === 'syllabic') {
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
    };

    // 2. FROM KEYBOARD TO MEMORY (The Normalizer that protects against bugs)
    const normalizeToBase = (word) => {
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
        return baseWord;
    };

    return { transliterate, normalizeToBase };
}
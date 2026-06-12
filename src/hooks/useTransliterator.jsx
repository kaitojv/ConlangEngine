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
        'ph': 'ფ',
        'a': 'ა', 'b': 'ბ', 'g': 'გ', 'd': 'დ', 'e': 'ე', 'v': 'ვ', 'z': 'ზ', 't': 'თ',
        'i': 'ი', 'k': 'კ', 'l': 'ლ', 'm': 'მ', 'n': 'ნ', 'o': 'ო', 'p': 'პ', 'r': 'რ',
        's': 'ს', 'u': 'უ', 'q': 'ქ', 'h': 'ჰ'
    }
};

export function useTransliterator(overrideConfig = null) {
    const storeConfig = useConfigStore();
    const activeConfig = overrideConfig || storeConfig;

    const phonologyTypes = activeConfig.phonologyTypes;
    const alphabeticScript = activeConfig.alphabeticScript;
    const alphabetGlyphs = activeConfig.alphabetGlyphs || {};
    const syllabaryMap = activeConfig.syllabaryMap || {};
    const syllabificationAlgorithm = activeConfig.syllabificationAlgorithm || 'ltr';
    
    // Fetching consonants and vowels from Settings
    const consonants = activeConfig.consonants || '';
    const vowels = activeConfig.vowels || '';

    // Two-way dictionary mapping
    const getOrthographyMap = () => {
        const mapToText = {}; // Phonetic Value -> Visual Form (e.g., r -> რ)
        const mapToBase = {}; // Visual Form -> Phonetic Value (e.g., რ -> r)
        
        const allSounds = `${consonants},${vowels},${activeConfig.otherPhonemes || ''}`.split(',');

        allSounds.forEach(sound => {
            if (sound.includes('=')) {
                const [base, text] = sound.split('=').map(s => s.trim());
                if (base && text) {
                    mapToText[base.toLowerCase()] = text;
                    // Store the original case in mapToBase for exact reversing if needed,
                    // but we generally rely on case-insensitive regex.
                    mapToBase[text.toLowerCase()] = base.toLowerCase();
                }
            }
        });
        return { mapToText, mapToBase };
    };

    // 1. FROM MEMORY TO SCREEN (For rendering the dictionary list beautifully)
    const transliterate = React.useCallback((word, lexicon = []) => {
        if (!word) return "";
        let cleanWord = word.replace(/\*/g, ''); // Preserve case

        const typographySettings = activeConfig.typographySettings || {};
        const activeDisplayMode = typographySettings.activeDisplayMode || 'Base';

        if (phonologyTypes === 'alphabetic' || !phonologyTypes) {
            const { mapToText } = getOrthographyMap();
            
            let scriptMap = {};
            if (alphabeticScript && alphabeticScript !== 'latin' && alphabeticScript !== 'custom') {
                scriptMap = { ...(SCRIPT_MAPS[alphabeticScript] || {}) };
            }

            // Extract base keys
            const allBases = new Set([
                ...Object.keys(mapToText),
                ...Object.keys(scriptMap),
                ...Object.keys(alphabetGlyphs).map(k => k.split('_')[0])
            ]);
            
            const sortedBases = Array.from(allBases).sort((a, b) => b.length - a.length);

            let out = "";
            let i = 0;
            const rawWord = cleanWord;
            const lowerWord = rawWord.toLowerCase();
            
            while (i < lowerWord.length) {
                let match = null;
                for (let base of sortedBases) {
                    if (lowerWord.startsWith(base, i)) {
                        match = base;
                        break;
                    }
                }
                
                if (match) {
                    const originalStr = rawWord.substring(i, i + match.length);
                    // Checking if the first character is uppercase
                    const isCapitalized = originalStr[0] !== originalStr[0].toLowerCase();
                    
                    const isInitial = i === 0 || !/[a-zA-Z]/.test(rawWord[i-1]);
                    const isFinal = i + match.length === rawWord.length || !/[a-zA-Z]/.test(rawWord[i + match.length]);
                    const isMedial = !isInitial && !isFinal;

                    let mappedChar = null;

                    // 1. Check Alphabet Glyphs (Highest Priority)
                    // First try active custom display mode
                    if (activeDisplayMode !== 'Base') {
                        const modeSuffix = `_${activeDisplayMode.toLowerCase()}`;
                        if (alphabetGlyphs[`${match}${modeSuffix}`]) {
                            mappedChar = alphabetGlyphs[`${match}${modeSuffix}`];
                        }
                    }

                    // Automatically check for 'Uppercase' mode if they typed a capital letter
                    if (!mappedChar && isCapitalized && alphabetGlyphs[`${match}_uppercase`]) {
                        mappedChar = alphabetGlyphs[`${match}_uppercase`];
                    }
                    
                    if (!mappedChar && alphabetGlyphs[match]) {
                        mappedChar = alphabetGlyphs[match];
                    }

                    // 2. Check script mappings
                    if (!mappedChar && scriptMap[match]) {
                        mappedChar = scriptMap[match];
                    }

                    // 3. Check custom mappings (e.g. from consonants/vowels = setting)
                    if (!mappedChar && mapToText[match]) {
                        mappedChar = mapToText[match];
                    }

                    if (mappedChar) {
                        // Apply capitalization to the final text if it's not a custom font PUA glyph
                        if (isCapitalized && !mappedChar.match(/[\uE000-\uF8FF]/)) {
                            // Only capitalize if we didn't use an explicit uppercase custom glyph
                            if (!alphabetGlyphs[`${match}_uppercase`]) {
                                out += mappedChar.toUpperCase();
                            } else {
                                out += mappedChar;
                            }
                        } else {
                            out += mappedChar;
                        }
                    } else {
                        // Unmapped base
                        out += isCapitalized ? match.toUpperCase() : match;
                    }
                    
                    i += match.length;
                } else {
                    out += rawWord[i];
                    i++;
                }
            }
            return out;
        }

        if (phonologyTypes === 'syllabic' || phonologyTypes === 'featural_block') {
            const syllables = Object.keys(syllabaryMap).sort((a, b) => b.length - a.length);
            
            // Allow manual override of block structure via ideogram field
            const dictEntry = lexicon.find(e => e.word.replace(/\*/g, '').toLowerCase() === cleanWord);
            const sourceStr = (dictEntry && dictEntry.ideogram) ? dictEntry.ideogram : cleanWord;
            
            // Explicit boundary logic + LTR/RTL parsing
            const blocks = sourceStr.split('.');
            let finalOut = "";

            blocks.forEach(rawBlock => {
                let block = rawBlock;
                // If the block has an override but the specific font glyph hasn't been compiled yet, strip the override to prevent rendering literal characters
                if (rawBlock.includes(':') && !syllabaryMap[rawBlock]) {
                    block = rawBlock.split(':')[0];
                }

                let out = "";
                if (syllabificationAlgorithm === 'rtl') {
                    // Right-to-Left Greedy Match
                    let i = block.length;
                    while (i > 0) {
                        let match = null;
                        for (let syl of syllables) {
                            if (i - syl.length >= 0 && block.substring(i - syl.length, i).toLowerCase() === syl && syllabaryMap[syl]) {
                                match = syl; break;
                            }
                        }
                        if (match) { 
                            const originalStr = block.substring(i - match.length, i);
                            const isCapitalized = originalStr[0] !== originalStr[0].toLowerCase();
                            
                            let mappedChar = null;
                            if (activeDisplayMode !== 'Base') {
                                const modeSuffix = `_${activeDisplayMode.toLowerCase()}`;
                                if (syllabaryMap[`${match}${modeSuffix}`]) {
                                    mappedChar = syllabaryMap[`${match}${modeSuffix}`];
                                }
                            }
                            if (!mappedChar && isCapitalized && syllabaryMap[`${match}_uppercase`]) {
                                mappedChar = syllabaryMap[`${match}_uppercase`];
                            }
                            if (!mappedChar) mappedChar = syllabaryMap[match];
                            
                            out = mappedChar + out; 
                            i -= match.length; 
                        } else { 
                            out = block[i - 1] + out; 
                            i--; 
                        }
                    }
                } else {
                    // Left-to-Right Greedy Match (Default)
                    let i = 0;
                    while (i < block.length) {
                        let match = null;
                        for (let syl of syllables) {
                            if (block.substring(i).toLowerCase().startsWith(syl) && syllabaryMap[syl]) {
                                match = syl; break;
                            }
                        }
                        if (match) { 
                            const originalStr = block.substring(i, i + match.length);
                            const isCapitalized = originalStr[0] !== originalStr[0].toLowerCase();
                            
                            let mappedChar = null;
                            if (activeDisplayMode !== 'Base') {
                                const modeSuffix = `_${activeDisplayMode.toLowerCase()}`;
                                if (syllabaryMap[`${match}${modeSuffix}`]) {
                                    mappedChar = syllabaryMap[`${match}${modeSuffix}`];
                                }
                            }
                            if (!mappedChar && isCapitalized && syllabaryMap[`${match}_uppercase`]) {
                                mappedChar = syllabaryMap[`${match}_uppercase`];
                            }
                            if (!mappedChar) mappedChar = syllabaryMap[match];
                            
                            out += mappedChar; 
                            i += match.length; 
                        } else { 
                            out += block[i]; 
                            i++; 
                        }
                    }
                }
                finalOut += out;
            });
            
            return finalOut;
        }

        if (phonologyTypes === 'logographic') {
            const dictEntry = lexicon.find(e => e.word.replace(/\*/g, '').toLowerCase() === cleanWord);
            return (dictEntry && dictEntry.ideogram) ? dictEntry.ideogram : cleanWord; 
        }

        return cleanWord;
    }, [phonologyTypes, alphabeticScript, alphabetGlyphs, syllabaryMap, consonants, vowels, syllabificationAlgorithm]);

    // 2. FROM KEYBOARD TO MEMORY (The Normalizer that protects against bugs)
    const normalizeToBase = React.useCallback((word) => {
        if (!word) return "";
        if (phonologyTypes !== 'alphabetic' && phonologyTypes) return word;

        const { mapToBase } = getOrthographyMap();
        let baseWord = word; // Preserve case initially
        
        for (const [text, base] of Object.entries(mapToBase)) {
            const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedText, 'gi');
            baseWord = baseWord.replace(regex, (match) => {
                if (match === match.toUpperCase() && match !== match.toLowerCase()) return base.toUpperCase();
                if (match[0] === match[0].toUpperCase()) return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
                return base.toLowerCase();
            });
        }

        let scriptMapToReverse = {};
        if (alphabeticScript && alphabeticScript !== 'latin' && alphabeticScript !== 'custom') {
            Object.entries(SCRIPT_MAPS[alphabeticScript] || {}).forEach(([base, text]) => {
                scriptMapToReverse[text] = base;
            });
        }
        
        // Custom font PUA variants back to base
        Object.entries(alphabetGlyphs).forEach(([key, text]) => {
            let base = key.split('_')[0];
            if (key.includes('_uppercase')) base = base.toUpperCase();
            scriptMapToReverse[text] = base;
        });

        if (Object.keys(scriptMapToReverse).length > 0) {
            for (const [text, base] of Object.entries(scriptMapToReverse)) {
                const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                // For PUA characters and specific script chars, match EXACTLY (not case-insensitively, 
                // because cyrillic/greek might have explicit upper/lower cases that we'd want to handle safely,
                // but SCRIPT_MAPS is currently lowercase only. So regex should be case-insensitive to catch uppercase cyrillic).
                const regex = new RegExp(escapedText, 'gi');
                baseWord = baseWord.replace(regex, (match) => {
                    // PUA characters have no uppercase, so match === match.toUpperCase() is true.
                    // To avoid uppercasing PUA, we just return base. 
                    // Wait, if we want to restore capitalization from Cyrillic:
                    if (!match.match(/[\uE000-\uF8FF]/) && match === match.toUpperCase() && match !== match.toLowerCase()) {
                        return base.charAt(0).toUpperCase() + base.slice(1);
                    }
                    return base;
                });
            }
        }

        return baseWord;
    }, [phonologyTypes, alphabeticScript, alphabetGlyphs, consonants, vowels]);

    return { transliterate, normalizeToBase };
}
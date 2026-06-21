// src/utils/transliteration.js
// Pure transliteration functions extracted from useTransliterator.jsx
// No React, no hooks — usable from exporters and validators.

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

/**
 * Build the two-way orthography map from consonants/vowels/otherPhonemes.
 * Returns { mapToText, mapToBase }.
 */
export function getOrthographyMap(config) {
    const mapToText = {};
    const mapToBase = {};
    const consonants = config.consonants || '';
    const vowels = config.vowels || '';
    const otherPhonemes = config.otherPhonemes || '';
    const allSounds = `${consonants},${vowels},${otherPhonemes}`.split(',');

    allSounds.forEach(sound => {
        if (sound.includes('=')) {
            const [base, text] = sound.split('=').map(s => s.trim());
            if (base && text) {
                mapToText[base.toLowerCase()] = text;
                mapToBase[text.toLowerCase()] = base.toLowerCase();
            }
        }
    });
    return { mapToText, mapToBase };
}

/**
 * Pure transliteration: memory → screen.
 * Takes a word string and a script-config object (from buildScriptConfig),
 * returns the rendered text.
 */
export function transliterateText(word, config, lexicon = []) {
    if (!word) return '';
    let cleanWord = word.replace(/\*/g, '');

    const phonologyTypes = config.phonologyTypes;
    const alphabeticScript = config.alphabeticScript;
    const alphabetGlyphs = config.alphabetGlyphs || {};
    const syllabaryMap = config.syllabaryMap || {};
    const syllabificationAlgorithm = config.syllabificationAlgorithm || 'ltr';
    const consonants = config.consonants || '';
    const vowels = config.vowels || '';
    const typographySettings = config.typographySettings || {};
    const activeDisplayMode = typographySettings.activeDisplayMode || 'Base';

    if (phonologyTypes === 'alphabetic' || !phonologyTypes) {
        const { mapToText } = getOrthographyMap(config);

        let scriptMap = {};
        if (alphabeticScript && alphabeticScript !== 'latin' && alphabeticScript !== 'custom') {
            scriptMap = { ...(SCRIPT_MAPS[alphabeticScript] || {}) };
        }

        // Parse all defined phonemes (base forms) so multi-character entries
        // like 'aa', 'ee', 'sh', 'th' etc. participate in longest-match-first.
        const parsePhonemeBase = (str) => (str || '').split(',').map(s => {
            let clean = s.trim();
            if (clean.includes('=')) clean = clean.split('=')[0].trim();
            return clean.toLowerCase();
        }).filter(Boolean);

        const allPhonemes = [
            ...parsePhonemeBase(consonants),
            ...parsePhonemeBase(vowels),
            ...parsePhonemeBase(config.otherPhonemes),
        ];

        const allBases = new Set([
            ...Object.keys(mapToText),
            ...Object.keys(scriptMap),
            ...Object.keys(alphabetGlyphs).map(k => k.split('_')[0]),
            ...allPhonemes,
        ]);

        const sortedBases = Array.from(allBases).sort((a, b) => b.length - a.length);

        let out = '';
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
                const isCapitalized = originalStr[0] !== originalStr[0].toLowerCase();
                const isInitial = i === 0 || !/[a-zA-Z]/.test(rawWord[i - 1]);
                const isFinal = i + match.length === rawWord.length || !/[a-zA-Z]/.test(rawWord[i + match.length]);

                let mappedChar = null;

                // 1. Alphabet Glyphs (highest priority)
                if (activeDisplayMode !== 'Base') {
                    const modeSuffix = `_${activeDisplayMode.toLowerCase()}`;
                    if (alphabetGlyphs[`${match}${modeSuffix}`]) {
                        mappedChar = alphabetGlyphs[`${match}${modeSuffix}`];
                    }
                }
                if (!mappedChar && isCapitalized && alphabetGlyphs[`${match}_uppercase`]) {
                    mappedChar = alphabetGlyphs[`${match}_uppercase`];
                }
                if (!mappedChar && alphabetGlyphs[match]) {
                    mappedChar = alphabetGlyphs[match];
                }

                // 2. Script mappings
                if (!mappedChar && scriptMap[match]) {
                    mappedChar = scriptMap[match];
                }

                // 3. Custom mappings
                if (!mappedChar && mapToText[match]) {
                    mappedChar = mapToText[match];
                }

                if (mappedChar) {
                    if (isCapitalized && !mappedChar.match(/[\uE000-\uF8FF]/)) {
                        if (!alphabetGlyphs[`${match}_uppercase`]) {
                            out += mappedChar.toUpperCase();
                        } else {
                            out += mappedChar;
                        }
                    } else {
                        out += mappedChar;
                    }
                } else {
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
        const dictEntry = lexicon.find(e => e.word.replace(/\*/g, '').toLowerCase() === cleanWord);
        const sourceStr = (dictEntry && dictEntry.ideogram) ? dictEntry.ideogram : cleanWord;
        const blocks = sourceStr.split('.');
        let finalOut = '';

        blocks.forEach(rawBlock => {
            let block = rawBlock;
            if (rawBlock.includes(':') && !syllabaryMap[rawBlock]) {
                block = rawBlock.split(':')[0];
            }

            let out = '';
            if (syllabificationAlgorithm === 'rtl') {
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
        const dictEntry = lexicon.find(e => e.word.replace(/\*/g, '').toLowerCase() === cleanWord.toLowerCase());
        return (dictEntry && dictEntry.ideogram) ? dictEntry.ideogram : cleanWord;
    }

    return cleanWord;
}

/**
 * Pure normalizer: screen → memory.
 * Reverses transliteration back to base form.
 */
export function normalizeToBase(word, config) {
    if (!word) return '';
    const phonologyTypes = config.phonologyTypes;
    if (phonologyTypes !== 'alphabetic' && phonologyTypes) return word;

    const alphabeticScript = config.alphabeticScript;
    const alphabetGlyphs = config.alphabetGlyphs || {};

    const { mapToBase } = getOrthographyMap(config);
    let baseWord = word;

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

    Object.entries(alphabetGlyphs).forEach(([key, text]) => {
        let base = key.split('_')[0];
        if (key.includes('_uppercase')) base = base.toUpperCase();
        scriptMapToReverse[text] = base;
    });

    if (Object.keys(scriptMapToReverse).length > 0) {
        for (const [text, base] of Object.entries(scriptMapToReverse)) {
            const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedText, 'gi');
            baseWord = baseWord.replace(regex, (match) => {
                if (!match.match(/[\uE000-\uF8FF]/) && match === match.toUpperCase() && match !== match.toLowerCase()) {
                    return base.charAt(0).toUpperCase() + base.slice(1);
                }
                return base;
            });
        }
    }

    return baseWord;
}

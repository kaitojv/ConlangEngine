// src/utils/validationEngine.js

/**
 * Extracts base characters from the user's config string.
 * E.g., "p, t, k, ʃ=th" -> ["p", "t", "k", "ʃ"]
 */
const extractInventory = (configString) => {
    if (!configString) return [];
    return configString
        .split(',')
        .map(s => s.trim().split('=')[0].toLowerCase())
        .filter(Boolean)
        .sort((a, b) => b.length - a.length); // Sort by length for digraph matching (e.g., 'ch' before 'c')
};

/**
 * Validates if the word strictly follows the Syllabary Grid.
 */
const validateSyllabic = (word, syllabaryMap) => {
    if (!syllabaryMap || Object.keys(syllabaryMap).length === 0) return { valid: true };

    const validSyllables = Object.keys(syllabaryMap).sort((a, b) => b.length - a.length);
    if (validSyllables.length === 0) return { valid: true };

    const regex = new RegExp(`^(${validSyllables.join('|')})+$`, 'i');

    if (!regex.test(word)) {
        return { valid: false, reason: "Contains syllables not defined in your Syllabary Grid." };
    }
    return { valid: true };
};

const extractIpaMappingAliases = (ipaMappingRules, cList, vList, oList) => {
    if (!ipaMappingRules) return { extraChars: [], aliasTypeMap: {} };
    const extraChars = [];
    const aliasTypeMap = {}; // alias → 'C' | 'V' | 'X'
    
    ipaMappingRules.split(',').forEach(rule => {
        const parts = rule.split('=').map(s => s.trim().toLowerCase());
        if (parts.length !== 2 || !parts[0] || !parts[1]) return;
        const alias = parts[0];  // shorthand (e.g. "c")
        const target = parts[1]; // IPA target (e.g. "ç")
        
        // Only add if the alias isn't already in the inventory
        if (!cList.includes(alias) && !vList.includes(alias) && !oList.includes(alias)) {
            extraChars.push(alias);
            // Determine its CV type based on what it maps to
            if (cList.includes(target)) aliasTypeMap[alias] = 'C';
            else if (vList.includes(target)) aliasTypeMap[alias] = 'V';
            else aliasTypeMap[alias] = 'X';
        }
    });
    
    return { extraChars, aliasTypeMap };
};

/**
 * Validates inventory and CV structure for Alphabetic languages.
 */
const validateAlphabetic = (word, consonants, vowels, syllablePattern, otherPhonemes, otherPhonemeMapping, skipSyllableValidation, ipaMappingRules) => {
    const cList = extractInventory(consonants);
    const vList = extractInventory(vowels);
    const oList = extractInventory(otherPhonemes);

    if (cList.length === 0 && vList.length === 0 && oList.length === 0) return { valid: true }; // No rules set yet
    
    const { extraChars, aliasTypeMap } = extractIpaMappingAliases(ipaMappingRules, cList, vList, oList);

    // 1. CHARACTER INVENTORY VALIDATION
    // Remove allowed universal characters (spaces, hyphens, apostrophes)
    let checkWord = word.replace(/[\s\-\*']/g, '');
    let tempWord = checkWord;

    // Remove valid vowels, consonants, and others to see if any alien characters remain
    const inventoryList = [...vList, ...cList, ...oList, ...extraChars].sort((a, b) => b.length - a.length);
    const invPattern = inventoryList.map(i => i.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    if (invPattern) {
        tempWord = tempWord.replace(new RegExp(invPattern, 'gi'), '');
    }

    if (tempWord.length > 0) {
        // Extract unique invalid characters for quick-fix actions
        const invalidChars = [...new Set(tempWord.split(''))];
        return {
            valid: false,
            reason: `Contains invalid characters: "${tempWord}". Check your Phoneme settings.`,
            type: 'invalid_chars',
            invalidChars
        };
    }

    // 2. SYLLABLE PATTERN (CV) VALIDATION
    if (!syllablePattern || skipSyllableValidation) return { valid: true };

    let cvString = checkWord;
    const mappingChar = otherPhonemeMapping ? otherPhonemeMapping.toUpperCase().trim() : 'X';

    // Create a combined inventory sorted by length to handle digraphs in one pass
    // This prevents placeholders like 'V' from being overwritten by a consonant 'v'
    const allTokens = [
        ...vList.map(v => ({ text: v, type: 'V' })),
        ...cList.map(c => ({ text: c, type: 'C' })),
        ...oList.map(o => ({ text: o, type: mappingChar })),
        ...extraChars.map(e => ({ text: e, type: aliasTypeMap[e] }))
    ].sort((a, b) => b.text.length - a.text.length);

    const pattern = allTokens
        .map(t => t.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');

    if (pattern) {
        const tokenRegex = new RegExp(pattern, 'gi');
        cvString = checkWord.replace(tokenRegex, (match) => {
            const token = allTokens.find(t => t.text.toLowerCase() === match.toLowerCase());
            return token ? token.type : match;
        });
    }

    // Parse user's pattern (e.g., "CVC, CV" -> /^(CVC|CV)+$/i )
    const patterns = syllablePattern.split(',').map(p => p.trim().toUpperCase()).filter(Boolean);
    if (patterns.length > 0) {
        const regexStr = `^(${patterns.join('|')})+$`;
        const patternRegex = new RegExp(regexStr, 'i');

        if (!patternRegex.test(cvString)) {
            return {
                valid: false,
                reason: `Does not match your Syllable Pattern (${syllablePattern}). Detected structure: [${cvString}]`,
                type: 'invalid_pattern',
                detectedPattern: cvString
            };
        }
    }

    return { valid: true };
};

/**
 * Normalize vowel harmony sets for backward compatibility.
 * Old format: string[][]  →  New format: { name, vowels, neutral }[]
 */
function normalizeHarmonySets(sets) {
    if (!Array.isArray(sets)) return [];
    return sets.map((s, i) => {
        if (Array.isArray(s)) return { name: `Set ${i + 1}`, vowels: s, neutral: false };
        if (s && Array.isArray(s.vowels)) return { name: s.name || `Set ${i + 1}`, vowels: s.vowels, neutral: !!s.neutral };
        return { name: `Set ${i + 1}`, vowels: [], neutral: false };
    });
}
/**
 * Extracts vowels from a word based on the user's vowel inventory.
 * Returns all vowel characters found in the word.
 */
function extractVowelsFromWord(word, vowelsStr) {
    if (!word || !vowelsStr) return [];
    const vowelList = vowelsStr
        .split(',')
        .map(s => s.trim().split('=')[0])
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);

    const found = [];
    let i = 0;
    const w = word.toLowerCase();
    while (i < w.length) {
        let matched = false;
        for (const v of vowelList) {
            const vl = v.toLowerCase();
            if (w.startsWith(vl, i)) {
                found.push(vl);
                i += vl.length;
                matched = true;
                break;
            }
        }
        if (!matched) i++;
    }
    return found;
}

/**
 * Checks if a word's vowels conform to the vowel harmony sets.
 * Neutral sets are ignored in constraint checking — their vowels may appear
 * alongside any non-neutral set, but they don't "count" as establishing a set.
 * Returns { conforms, foundVowels, matchingSet, mixedSets, matchingSetName }
 */
function checkVowelHarmony(word, vowelHarmonySets, vowelsStr) {
    const sets = normalizeHarmonySets(vowelHarmonySets);
    if (sets.length === 0) {
        return { conforms: true, foundVowels: [], matchingSet: -1, mixedSets: [], matchingSetName: '' };
    }

    const wordVowels = extractVowelsFromWord(word, vowelsStr);
    if (wordVowels.length === 0) {
        return { conforms: true, foundVowels: [], matchingSet: -1, mixedSets: [], matchingSetName: '' };
    }

    // Membership: which set indices does each vowel belong to?
    const setMemberships = wordVowels.map(v => {
        const indices = [];
        sets.forEach((set, idx) => {
            if (set.vowels.some(s => s.toLowerCase() === v)) indices.push(idx);
        });
        return indices;
    });

    // For constraint checking, filter out neutral sets.
    // Neutral vowels may appear with any non-neutral set.
    const nonNeutralMemberships = setMemberships.map(members =>
        members.filter(idx => !sets[idx].neutral)
    );

    // Vowels that don't belong to any non-neutral set are fully neutral
    const constrained = nonNeutralMemberships.filter(m => m.length > 0);
    if (constrained.length === 0) {
        return { conforms: true, foundVowels: wordVowels, matchingSet: -1, mixedSets: [], matchingSetName: '' };
    }

    let commonSets = [...constrained[0]];
    for (let i = 1; i < constrained.length; i++) {
        commonSets = commonSets.filter(s => constrained[i].includes(s));
    }

    const allInvolved = [...new Set(nonNeutralMemberships.flat())];
    const matchIdx = commonSets.length > 0 ? commonSets[0] : -1;

    // Identify which vowels belong to neutral sets (for UI display)
    const neutralVowels = [];
    wordVowels.forEach((v, vi) => {
        const belongsToNeutral = setMemberships[vi].some(idx => sets[idx].neutral);
        if (belongsToNeutral && !neutralVowels.includes(v)) neutralVowels.push(v);
    });

    return {
        conforms: commonSets.length > 0,
        foundVowels: wordVowels,
        matchingSet: matchIdx,
        mixedSets: allInvolved,
        matchingSetName: matchIdx >= 0 ? sets[matchIdx].name : '',
        neutralVowels
    };
}

/**
 * Validates vowel harmony for a word based on the configured mode.
 * Returns { valid: boolean, reason?: string, type?: string, harmonyResult: object }
 */
function validateVowelHarmony(word, configStoreData, wordClass = '', tags = []) {
    const {
        vowelHarmonyMode,
        vowelHarmonySets,
        vowels,
        vowelHarmonyOverrideWordClasses,
        vowelHarmonyOverrideTags,
    } = configStoreData;

    // Default: no validation if mode/settings not configured
    const mode = vowelHarmonyMode || 'complete';
    const sets = normalizeHarmonySets(vowelHarmonySets || []);

    if (sets.length === 0) {
        return { valid: true, harmonyResult: null };
    }

    const harmony = checkVowelHarmony(word, vowelHarmonySets, vowels);
    const involvedNames = harmony.mixedSets.map(i => sets[i]?.name || `Set ${i + 1}`).join(', ');

    const classes = String(wordClass || '').split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
    const tagList = (tags || []).map(t => String(t).toLowerCase());
    const isOverridden = classes.some(c => (vowelHarmonyOverrideWordClasses || []).includes(c)) ||
        tagList.some(t => (vowelHarmonyOverrideTags || []).includes(t));

    // Optional — suggestions only, never enforced
    if (mode === 'optional') {
        return { valid: true, harmonyResult: harmony };
    }

    // Complete — strict, no exceptions
    if (mode === 'complete') {
        if (!harmony.conforms) {
            return {
                valid: false,
                reason: `Vowel harmony violation: vowels [${harmony.foundVowels.join(', ')}] mix across harmony sets (${involvedNames}).`,
                type: 'vowel_harmony',
                harmonyResult: harmony
            };
        }
        return { valid: true, harmonyResult: harmony };
    }

    // Flexible — enforce unless word class or tag is exempted
    if (mode === 'flexible') {
        if (!harmony.conforms && !isOverridden) {
            return {
                valid: false,
                reason: `Vowel harmony violation: vowels [${harmony.foundVowels.join(', ')}] mix across harmony sets (${involvedNames}).`,
                type: 'vowel_harmony',
                harmonyResult: harmony
            };
        }
        return { valid: true, harmonyResult: harmony };
    }

    return { valid: true, harmonyResult: harmony };
}
export function validateNewWord(word, configStoreData, wordClass = '', tags = []) {
    if (!word) return { valid: false, reason: "Word is empty." };

    const {
        phonologyTypes,
        consonants,
        vowels,
        syllablePattern,
        syllabaryMap,
        otherPhonemes,
        otherPhonemeMapping,
        skipSyllableValidation,
        ipaMappingRules
    } = configStoreData;

    // Logographic languages bypass phonetic structure validation for the ideogram itself,
    // but the romanization (word) should technically still follow alphabetic rules.
    if (phonologyTypes === 'syllabic') {
        return validateSyllabic(word, syllabaryMap);
    }

    // Default to Alphabetic rules for 'alphabetic' and 'logographic' (to validate the romanization)
    const result = validateAlphabetic(
        word,
        consonants,
        vowels,
        syllablePattern,
        otherPhonemes,
        otherPhonemeMapping,
        skipSyllableValidation,
        ipaMappingRules
    );

    if (!result.valid) return result;

    // Secondary check: vowel harmony (only for alphabetic/logographic)
    const harmonyResult = validateVowelHarmony(word, configStoreData, wordClass, tags);
    if (!harmonyResult.valid) return harmonyResult;

    // Preserve harmony info even when valid (useful for 'optional' mode UI)
    return { ...result, harmonyResult: harmonyResult.harmonyResult };
}

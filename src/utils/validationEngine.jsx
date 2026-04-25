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

/**
 * Validates inventory and CV structure for Alphabetic languages.
 */
const validateAlphabetic = (word, consonants, vowels, syllablePattern) => {
    const cList = extractInventory(consonants);
    const vList = extractInventory(vowels);
    
    if (cList.length === 0 && vList.length === 0) return { valid: true }; // No rules set yet

    // 1. CHARACTER INVENTORY VALIDATION
    // Remove allowed universal characters (spaces, hyphens, apostrophes)
    let checkWord = word.replace(/[\s\-\*']/g, ''); 
    let tempWord = checkWord;

    // Remove valid vowels and consonants to see if any alien characters remain
    const inventoryList = [...vList, ...cList].sort((a, b) => b.length - a.length);
    const invPattern = inventoryList.map(i => i.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    if (invPattern) {
        tempWord = tempWord.replace(new RegExp(invPattern, 'gi'), '');
    }

    if (tempWord.length > 0) {
        return { valid: false, reason: `Contains invalid characters: "${tempWord}". Check your Consonants/Vowels settings.` };
    }

    // 2. SYLLABLE PATTERN (CV) VALIDATION
    if (!syllablePattern) return { valid: true };

    let cvString = checkWord;
    
    // Create a combined inventory sorted by length to handle digraphs in one pass
    // This prevents placeholders like 'V' from being overwritten by a consonant 'v'
    const allTokens = [
        ...vList.map(v => ({ text: v, type: 'V' })),
        ...cList.map(c => ({ text: c, type: 'C' }))
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
            return { valid: false, reason: `Does not match your Syllable Pattern (${syllablePattern}). Detected structure: [${cvString}]` };
        }
    }

    return { valid: true };
};

/**
 * Main wrapper function to validate a word before saving.
 */
export function validateNewWord(word, configStoreData) {
    if (!word) return { valid: false, reason: "Word is empty." };

    const { phonologyTypes, consonants, vowels, syllablePattern, syllabaryMap } = configStoreData;

    // Logographic languages bypass phonetic structure validation for the ideogram itself, 
    // but the romanization (word) should technically still follow alphabetic rules.
    if (phonologyTypes === 'syllabic') {
        return validateSyllabic(word, syllabaryMap);
    } 
    
    // Default to Alphabetic rules for 'alphabetic' and 'logographic' (to validate the romanization)
    return validateAlphabetic(word, consonants, vowels, syllablePattern);
}
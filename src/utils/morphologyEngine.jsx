// src/utils/morphologyEngine.jsx

// Helper to parse complex affix strings like "-ma-@V" or "re-"
const parseAffix = (affixStr) => {
    if (!affixStr) return null;
    // Regex matches: [startHyphen] [morpheme] [endHyphen] @positionTag
    const match = affixStr.match(/^([-=])?([^-=@]+)([-=])?(?:@(\w+))?$/);
    if (!match) return { clean: affixStr.replace(/^-|-$/g, ''), type: 'unknown' };

    const [_, hasStart, morpheme, hasEnd, position] = match;
    let type = 'suffix'; // Default
    if (hasStart && hasEnd) type = 'infix';
    else if (hasEnd) type = 'prefix';
    else if (hasStart) type = 'suffix';

    return { clean: morpheme, type, position };
};

// Placeholder for stripAffix - actual implementation would be more complex
export const stripAffix = (word, affixRule) => {
    if (!affixRule || !word) return null;

    // Reversing arbitrary regex transformations (like n => m) is mathematically 
    // impossible without a dictionary of underlying forms, so we skip them in the basic analyzer.
    if (affixRule.includes('=>')) return null;

    const parsed = parseAffix(affixRule);
    if (!parsed) return null;

    const { clean, type } = parsed;

    if (type === 'suffix') {
        if (word.endsWith(clean)) return word.slice(0, word.length - clean.length);
    } else if (type === 'prefix') {
        if (word.startsWith(clean)) return word.slice(clean.length);
    } else if (type === 'infix') {
        // For infixes, we just remove the first occurrence of the morpheme
        // This is a simplification but works for general analysis
        const idx = word.indexOf(clean);
        if (idx > 0 && idx < word.length - clean.length) {
            return word.slice(0, idx) + word.slice(idx + clean.length);
        }
    }
    return null;
};

// Placeholder for applyRuleToWord - actual implementation would be more complex
export const applyRuleToWord = (baseWord, rule, grammarRules, vowels, consonants, otherPhonemes) => {
    if (!baseWord || !rule || !rule.affix) return baseWord;

    // 0. Enforce Allomorph Conditions (After Vowel / After Consonant / After Other)
    if (rule.condition && rule.condition !== 'always') {
        const vowelList = vowels ? vowels.split(',').map(v => v.trim().split('=')[0].toLowerCase()).filter(Boolean) : [];
        const consList = consonants ? consonants.split(',').map(c => c.trim().split('=')[0].toLowerCase()).filter(Boolean) : [];
        const otherList = otherPhonemes ? otherPhonemes.split(',').map(o => o.trim().split('=')[0].toLowerCase()).filter(Boolean) : [];
        
        const parsed = parseAffix(rule.affix);
        const type = parsed ? parsed.type : 'suffix';
        const isAtStart = type === 'prefix';
        const wordLow = baseWord.toLowerCase();

        // Helper to check if any phoneme from a list matches at the edge
        const checkAtEdge = (list) => {
            const sorted = [...list].sort((a, b) => b.length - a.length);
            for (const p of sorted) {
                if (isAtStart ? wordLow.startsWith(p) : wordLow.endsWith(p)) return true;
            }
            return false;
        };

        const isVowel = checkAtEdge(vowelList);
        const isOther = checkAtEdge(otherList);
        // Consonant is either explicitly in the list OR just not a vowel/other
        const isCons = checkAtEdge(consList) || (!isVowel && !isOther);

        if (rule.condition === 'vowel' && !isVowel) return null;
        if (rule.condition === 'consonant' && !isCons) return null;
        if (rule.condition === 'other' && !isOther) return null;
    }

    // 1. Check for Regex replacement patterns (e.g. "n(?=[pb]) => m")
    if (rule.affix.includes('=>')) {
        const parts = rule.affix.split('=>');
        if (parts.length === 2) {
            const pattern = parts[0].trim();
            const replacement = parts[1].trim();
            try {
                // We use 'g' to replace all matching occurrences in the root
                const regex = new RegExp(pattern, 'g');
                return baseWord.replace(regex, replacement);
            } catch (e) {
                console.error("Invalid Regex rule:", pattern);
                return baseWord; // Return unmodified word if the user's regex crashes
            }
        }
    }

    const parsed = parseAffix(rule.affix);
    if (!parsed) return baseWord;

    const { clean, type, position } = parsed;

    if (type === 'suffix') {
        return baseWord + clean;
    } else if (type === 'prefix') {
        return clean + baseWord;
    } else if (type === 'infix') {
        // 1. Handle @V position (after first vowel)
        if (position === 'V' && vowels) {
            const vowelList = vowels.split(',').map(v => v.trim().split('=')[0]); // Use IPA part of "u=ú"
            for (let i = 0; i < baseWord.length; i++) {
                if (vowelList.includes(baseWord[i].toLowerCase())) {
                    return baseWord.slice(0, i + 1) + clean + baseWord.slice(i + 1);
                }
            }
        }
        
        // 2. Handle @C position (after first consonant)
        // (Optional expansion, but good for completeness)
        
        // Default: Insert in the absolute middle
        const middle = Math.floor(baseWord.length / 2);
        return baseWord.slice(0, middle) + clean + baseWord.slice(middle);
    }
    
    return baseWord;
};

/**
 * Processes an array of person rule objects to add a 'name' property
 * in a consistent format (e.g., "1S", "2P.Masc").
 * This function is used by MatrixModal, AnalyzerTab, and GlosserTab.
 *
 * @param {Array<Object>} personRulesArray - An array of person rule objects from the config store.
 * @returns {Array<Object>} The processed array with 'name' properties.
 */
export const getPersonRules = (personRulesArray) => {
    if (!Array.isArray(personRulesArray)) {
        return [];
    }

    return personRulesArray.map(rule => {
        // If standard '1st', '2nd', '3rd', abbreviate to '1', '2', '3'. Otherwise, keep user's custom text intact.
        const person = rule.person ? (rule.person.match(/^[123]/) ? rule.person.charAt(0).toUpperCase() : rule.person) : '';
        const number = rule.number ? rule.number.toUpperCase() : '';
        const gender = rule.gender ? `.${rule.gender}` : '';
        const name = `${person}${number}${gender}`;

        return {
            ...rule,
            name: name || (rule.id ? `Rule-${rule.id.substring(0, 4)}` : 'UnnamedRule')
        };
    });
};

/**
 * Attempts to segment a single mashed-together token into multiple valid lexicon/rule entries.
 * Uses a Greedy Longest Match approach.
 */
export const segmentToken = (token, lexicon, config, normalizeToBase, getUniqueParsings) => {
    if (!token || !lexicon) return [token];
    
    // Safety check for lexicon format
    const lexiconArray = Array.isArray(lexicon) ? lexicon : (lexicon.lexicon || []);
    if (lexiconArray.length === 0) return [token];

    // 1. If the token is already fully parsable as a single unit (root + affixes), keep it together.
    // This is the primary reason why it might not segment: if the whole thing is found.
    if (getUniqueParsings(token).length > 0) {
        return [token];
    }

    const safeToken = normalizeToBase(token.toLowerCase());
    const resultTokens = [];
    let remaining = safeToken;

    const findLongestMatch = (str) => {
        let longest = null;
        let matchLength = 0;

        // Check Lexicon
        lexiconArray.forEach(entry => {
            if (!entry.word) return;
            const entryWord = normalizeToBase(entry.word.toLowerCase());
            if (entryWord && str.startsWith(entryWord) && entryWord.length > matchLength) {
                matchLength = entryWord.length;
                longest = entry.word;
            }
        });

        // Check Person Rules (Free forms)
        const personRules = getPersonRules(config?.personRules || []);
        personRules.forEach(rule => {
            if (rule.freeForm) {
                const freeForm = normalizeToBase(rule.freeForm.toLowerCase());
                if (freeForm && str.startsWith(freeForm) && freeForm.length > matchLength) {
                    matchLength = freeForm.length;
                    longest = rule.freeForm;
                }
            }
        });

        return { word: longest, length: matchLength };
    };

    let iterations = 0;
    while (remaining.length > 0 && iterations < 20) {
        iterations++;
        const match = findLongestMatch(remaining);
        
        if (match.word && match.length > 0) {
            resultTokens.push(match.word);
            remaining = remaining.slice(match.length);
        } else {
            // Handle separators and glottal stops that might be in the middle
            if (remaining.startsWith("'") || remaining.startsWith("-") || remaining.startsWith("’") || remaining.startsWith("‘")) {
                remaining = remaining.slice(1);
                continue;
            }

            // If we're stuck, it's not a perfect segmentation. Return original.
            return [token];
        }
    }

    // Only return the segments if we actually found more than one and covered the whole string
    return (resultTokens.length > 1 && remaining.length === 0) ? resultTokens : [token];
};
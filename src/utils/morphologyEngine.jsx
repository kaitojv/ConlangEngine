// src/utils/morphologyEngine.jsx

// Placeholder for stripAffix - actual implementation would be more complex
export const stripAffix = (word, affixRule) => {
    // Example: if affixRule is '-s', check if word ends with 's' and return word without 's'
    // This is a simplified placeholder.
    if (!affixRule || !word) return null;

    // Reversing arbitrary regex transformations (like n => m) is mathematically 
    // impossible without a dictionary of underlying forms, so we skip them in the basic analyzer.
    if (affixRule.includes('=>')) {
        return null;
    }

    const cleanAffix = affixRule.replace(/^-|-$/g, ''); // Remove leading/trailing hyphens for matching
    if (affixRule.startsWith('-') && !affixRule.endsWith('-')) { // Suffix
        if (word.endsWith(cleanAffix)) {
            return word.slice(0, word.length - cleanAffix.length);
        }
    } else if (affixRule.endsWith('-') && !affixRule.startsWith('-')) { // Prefix
        if (word.startsWith(cleanAffix)) {
            return word.slice(cleanAffix.length);
        }
    } else if (affixRule.startsWith('-') && affixRule.endsWith('-')) { // Infix (simple check for now)
        // For infixes, this logic would be much more complex, depending on @position
        // For now, a very basic check: if the affix is *in* the word
        const parts = word.split(cleanAffix);
        if (parts.length > 1) {
            return parts.join(''); // Remove the infix
        }
    }
    return null;
};

// Placeholder for applyRuleToWord - actual implementation would be more complex
export const applyRuleToWord = (baseWord, rule, grammarRules, vowels) => {
    // This is a simplified placeholder.
    // In a real scenario, this would apply the rule's affix to the baseWord
    // considering rule.type, rule.affix, rule.position, etc.
    if (!baseWord || !rule || !rule.affix) return baseWord;

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

    const cleanAffix = rule.affix.replace(/^-|-$/g, '');

    if (rule.affix.startsWith('-') && !rule.affix.endsWith('-')) { // Suffix
        return baseWord + cleanAffix;
    } else if (rule.affix.endsWith('-') && !rule.affix.startsWith('-')) { // Prefix
        return cleanAffix + baseWord;
    } else if (rule.affix.startsWith('-') && rule.affix.endsWith('-')) { // Infix
        // Simplified infix application: just insert in the middle or at a specific position
        const positionMatch = rule.affix.match(/@(\w+)/);
        if (positionMatch && positionMatch[1] === 'V' && vowels) {
            // Find first vowel and insert after it
            const vowelList = vowels.split(',').map(v => v.trim());
            for (let i = 0; i < baseWord.length; i++) {
                if (vowelList.includes(baseWord[i])) {
                    return baseWord.slice(0, i + 1) + cleanAffix + baseWord.slice(i + 1);
                }
            }
        }
        // Default to middle if no specific position or vowel found
        const middle = Math.floor(baseWord.length / 2);
        return baseWord.slice(0, middle) + cleanAffix + baseWord.slice(middle);
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
        console.warn("getPersonRules received a non-array value for personRules. Falling back to empty array.", personRulesArray);
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
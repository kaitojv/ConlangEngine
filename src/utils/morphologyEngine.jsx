// src/utils/morphologyEngine.js

/**
 * Parses user-defined vowels and transforms them into a safe Regex string.
 * Extracts the base character (e.g., if input is "a, e=é, i", it returns "aei").
 * Escapes special regex characters to prevent execution errors.
 */
function getVowelRegexString(vowelsConfig) {
    if (!vowelsConfig) return 'aeiou'; // Safety fallback
    
    // Extract the left side of "=", trim spaces, and join
    const vowels = vowelsConfig.split(',').map(v => v.trim().split('=')[0].toLowerCase());
    
    // Escape special regex characters
    return vowels.map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('');
}

/**
 * Evaluates if a word ends with a vowel based on the user's config.
 * Used for phonological conditioning (allomorphy) during derivation.
 */
function endsWithVowel(wordBase, vowelsConfig) {
    if (!wordBase) return false;
    const vowels = (vowelsConfig || "a,e,i,o,u").split(',').map(v => v.trim().split('=')[0].toLowerCase()); 
    const lastChar = wordBase.slice(-1).toLowerCase();
    return vowels.some(v => lastChar === v);
}

/**
 * Applies simple concatenative affixes and positional infixes to a base word.
 * Uses the dynamic vowels configuration to accurately identify boundaries.
 */
export function applySimpleAffix(base, aff, vowelsConfig) {
    let cleanBase = base.replace(/\*/g, '');

    // Check for infix notation (-affix-@position or standard infix syntax)
    if (aff.startsWith('-') && (aff.includes('-@') || aff.endsWith('-'))) {
        let parts = aff.split('@');
        let inf = parts[0].replace(/-/g, '');
        let pos = parts[1];

        // If the base word has a wildcard placeholder (*)
        if (base.includes('*')) return base.replace('*', inf).replace(/\*/g, '');

        if (pos) {
            // Dynamically build the regex for Vowels and Consonants based on user config
            const vString = getVowelRegexString(vowelsConfig);
            const vowelRegex = new RegExp(`[${vString}]`, 'i');
            const consRegex = new RegExp(`[^${vString}]`, 'i');

            if (pos === 'V') {
                // Insert after the first vowel
                let match = cleanBase.match(vowelRegex);
                if (match) { let idx = match.index + 1; return cleanBase.slice(0, idx) + inf + cleanBase.slice(idx); }
            } else if (pos === 'C') {
                // Insert after the first consonant
                let match = cleanBase.match(consRegex);
                if (match) { let idx = match.index + 1; return cleanBase.slice(0, idx) + inf + cleanBase.slice(idx); }
            } else if (!isNaN(pos)) {
                // Insert at a specific numerical index
                let idx = parseInt(pos); return cleanBase.slice(0, idx) + inf + cleanBase.slice(idx);
            }
        }
        // Default: insert after the first letter
        return cleanBase.slice(0, 1) + inf + cleanBase.slice(1);
    }
    
    // Prefix application
    if (aff.endsWith('-')) return aff.replace('-', '') + cleanBase;
    
    // Suffix application (or generic fallback)
    if (aff.startsWith('-')) return cleanBase + aff.replace('-', '');
    
    return cleanBase + aff;
}

/**
 * Evaluates regex conditions, dependencies, and applies the correct templatic or affix rule.
 * * @param {string} baseWord - The word to modify (e.g., "makin")
 * @param {object|string} ruleConfig - The rule object from Zustand or a raw affix string
 * @param {array} grammarRules - The full list of rules from Zustand (needed for dependency resolution)
 * @param {string} vowelsConfig - The user's vowels string from Zustand
 * @param {array} visited - Anti-infinite loop array to track rule dependencies
 * @returns {string|null} - The modified word, or null if phonological conditions failed.
 */
export function applyRuleToWord(baseWord, ruleConfig, grammarRules, vowelsConfig, visited = []) {
    if (!baseWord) return baseWord;
    
    let cleanBase = baseWord.replace(/\*/g, '');
    let affixString = "";

    // --- 1. COMPATIBILITY, DEPENDENCIES & PHONOLOGY ---
    if (typeof ruleConfig === 'string') {
        affixString = ruleConfig;
    } else {
        affixString = ruleConfig.affix;

        // A) DEPENDENCY CHAINING
        if (ruleConfig.dependency) {
            const depName = ruleConfig.dependency.toLowerCase().trim();
            const parentRule = grammarRules?.find(r => r.name && r.name.toLowerCase() === depName);
            
            if (parentRule) {
                // Recursively apply the parent rule first
                cleanBase = applyRuleToWord(cleanBase, parentRule, grammarRules, vowelsConfig, [...visited, ruleConfig.name]);
                if (cleanBase === null) return null; 
            }
        }

        // B) PHONOLOGICAL CONDITIONING
        if (ruleConfig.condition && ruleConfig.condition !== 'always') {
            const isVowelEnd = endsWithVowel(cleanBase, vowelsConfig);
            if (ruleConfig.condition === 'vowel' && !isVowelEnd) return null; 
            if (ruleConfig.condition === 'consonant' && isVowelEnd) return null; 
        }
    }

    if (!affixString) return cleanBase;

    // --- 2. TEMPLATIC ROOTS (=>) ---
    if (affixString.includes('=>')) {
        let parts = affixString.split('=>');
        let regexPattern = parts[0].trim(); // e.g., (.)(.)(.)
        let template = parts[1].trim();     // e.g., $1a$2a$3
        
        let regex = new RegExp(regexPattern);
        if (regex.test(cleanBase)) {
            return cleanBase.replace(regex, template);
        }
    }

    // --- 3. INLINE REGEX CONDITIONS (:) ---
    if (affixString.includes(':')) {
        let conditions = affixString.split(',');
        for (let cond of conditions) {
            // If it's a simple affix without conditions, apply it immediately
            if (!cond.includes(':')) return applySimpleAffix(cleanBase, cond.trim(), vowelsConfig); 
            
            let parts = cond.split(':');
            let regexStr = parts[0].trim();
            let aff = parts[1].trim();
            
            try {
                let regex = new RegExp(regexStr);
                if (regex.test(cleanBase)) return applySimpleAffix(cleanBase, aff, vowelsConfig);
            } catch(e) { 
                console.error("Invalid Regex: " + regexStr); 
            }
        }
        return cleanBase; 
    }
    
    // --- 4. STANDARD AFFIXATION ---
    return applySimpleAffix(cleanBase, affixString, vowelsConfig);
}  


export function tryStrip(w, aff) {
    if (aff.startsWith('-') && aff.endsWith('-')) { 
        let inf = aff.split('@')[0].replace(/-/g, ''); 
        let idx = w.indexOf(inf);
        if (idx !== -1) return w.slice(0, idx) + w.slice(idx + inf.length);
    } else if (aff.endsWith('-')) { 
        let pref = aff.replace('-', ''); 
        if (w.startsWith(pref)) return w.slice(pref.length);
    } else if (aff.startsWith('-')) { 
        let suf = aff.replace('-', ''); 
        if (w.endsWith(suf)) return w.slice(0, -suf.length);
    }
    return null;
}

/**
 * Strips affixes considering regex configurations and comma-separated rules.
 * Affects: Word root identification. Returns the stripped string or null.
 */
export function stripAffix(word, affixConfig) {
    let affixesToTry = [];
    if (affixConfig.includes(':')) {
        affixConfig.split(',').forEach(c => {
            if (c.includes(':')) affixesToTry.push(c.split(':')[1].trim());
            else affixesToTry.push(c.trim());
        });
    } else {
        affixesToTry.push(affixConfig.trim());
    }

    for (let aff of affixesToTry) {
        let stripped = tryStrip(word, aff);
        if (stripped) return stripped; 
    }
    return null;
}

/**
 * Dynamically converts Person & Class configurations into pseudo-rules.
 * Affects: Syntax parser alignments and 2D Matrix generations.
 * @param {string} personsConfig - The raw string from Zustand (e.g., "1S: mi/-m, 2S: ti/-t")
 */
export function getPersonRules(personsConfig) {
    if (!personsConfig) return [];
    
    const rawGroups = personsConfig.split(',').map(p => p.trim()).filter(Boolean);
    let pRules = [];

    rawGroups.forEach(g => {
        if (g.includes(':')) {
            let parts = g.split(':');
            let label = parts[0].trim();
            let markers = parts[1].split('/').map(m => m.trim());

                    // Find both affix and free markers
                    let affixMarker = markers.find(m => m.includes('-') || m.includes("'"));
                    let freeMarker = markers.find(m => !m.includes('-') && !m.includes("'"));

                    let ruleAffix = "";
                    if (affixMarker) {
                        ruleAffix = affixMarker;
                        if (affixMarker.startsWith("'") && !affixMarker.startsWith("-")) {
                            ruleAffix = "-" + affixMarker; 
                        } else if (affixMarker.endsWith("'") && !affixMarker.endsWith("-")) {
                            ruleAffix = affixMarker + "-";
                }
                    }

                    if (ruleAffix || freeMarker) {
                        pRules.push({
                            name: label, 
                            affix: ruleAffix,
                            free: freeMarker || "",
                            appliesTo: 'verb' 
                        });
            }
        }
    });
    return pRules;
}
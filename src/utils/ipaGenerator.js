/**
 * Utility to auto-generate IPA from an orthographic word using a set of comma-separated rules.
 * Rules format: "oo=oʊ, uu=uː, ch=tʃ, c=k"
 */

export const generateIpaFromWord = (word, mappingString) => {
    if (!mappingString || !word) return { ipa: '', matched: false };

    // Normalize unicode and force lowercase to ensure consistent matching
    const normalizedWord = word.normalize('NFC').toLowerCase();

    // Parse the mapping string into an array of rules
    const rules = mappingString.split(',').map(s => {
        const parts = s.split('=');
        if (parts.length === 2) {
            return { 
                from: parts[0].trim().normalize('NFC').toLowerCase(), 
                to: parts[1].trim().normalize('NFC') 
            };
        }
        return null;
    }).filter(rule => rule && rule.from && rule.to);

    if (rules.length === 0) return { ipa: normalizedWord, matched: false };

    // Sort rules by length of 'from' string descending so longer matches happen first
    rules.sort((a, b) => b.from.length - a.from.length);

    // Escape regex special characters in 'from' strings
    const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create a regex that matches any of the 'from' patterns
    const escapedFroms = rules.map(r => escapeRegex(r.from));
    const regex = new RegExp(`(${escapedFroms.join('|')})`, 'g');

    // Create a fast lookup map for the replacements
    const ruleMap = Object.fromEntries(rules.map(r => [r.from, r.to]));

    let matched = false;
    // Perform a single-pass replacement to avoid rule chaining issues
    const result = normalizedWord.replace(regex, match => {
        matched = true;
        return ruleMap[match];
    });

    return { ipa: result, matched };
};

/**
 * Resolves or constructs the IPA transcription for a conlang word or phrase.
 * Checks the lexicon first (exact match, then word-by-word), and falls back
 * to auto-generating from ipaMappingRules or clean orthography.
 *
 * @param {string} text - Conlang word or phrase
 * @param {Array} [lexicon=[]] - Array of lexicon entries with { word, ipa }
 * @param {string} [ipaMappingRules=''] - Comma-separated orthography->IPA rules
 * @returns {string} IPA representation without enclosing slashes or brackets
 */
export const resolvePhraseIpa = (text, lexicon = [], ipaMappingRules = '') => {
    if (!text || typeof text !== 'string') return '';

    // Strip fill-in blanks (e.g., "____"), punctuation, and excess spaces
    const clean = text
        .replace(/_+/g, ' ')
        .replace(/[.*~`!@#$%^&()+=<>?[\]{}|\\/:]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!clean) return '';

    const stripIpaDelimiters = (ipa) => String(ipa || '').replace(/[\][]/g, '').replace(/\//g, '').trim();

    // 1. Direct whole-text match in lexicon
    const exact = (lexicon || []).find(e => e?.word && e.word.trim().toLowerCase() === clean.toLowerCase());
    if (exact?.ipa) {
        return stripIpaDelimiters(exact.ipa);
    }

    // 2. Multi-word: lookup each word or convert via mapping rules
    const words = clean.split(/\s+/).filter(Boolean);
    const ipaParts = words.map(w => {
        const found = (lexicon || []).find(e => e?.word && e.word.trim().toLowerCase() === w.toLowerCase());
        if (found?.ipa) {
            return stripIpaDelimiters(found.ipa);
        }
        if (ipaMappingRules && ipaMappingRules.trim()) {
            const gen = generateIpaFromWord(w, ipaMappingRules);
            if (gen?.ipa) return stripIpaDelimiters(gen.ipa);
        }
        return w;
    });

    return ipaParts.join(' ');
};

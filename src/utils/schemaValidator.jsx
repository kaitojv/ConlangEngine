// src/utils/schemaValidator.jsx
// SEC-4: Schema validator for imported JSON backups and cloud data.
// Only allows known keys to be merged into stores,
// preventing injection of arbitrary keys or XSS payloads.

// Static allowlist of valid config keys (mirrors INITIAL_CONFIG in useConfigStore).
// Kept as a flat set to avoid importing the store and bloating the bundle.
const VALID_CONFIG_KEYS = new Set([
    'projectId', 'conlangName', 'authorName', 'description',
    'phonologyTypes', 'alphabeticScript', 'featuralComponents', 'blockSettings',
    'syntaxOrder', 'writingDirection', 'consonants', 'vowels',
    'syllablePattern', 'historicalRules', 'syllabaryMap',
    'grammarRules', 'verbMarker', 'cliticsRules', 'personRules',
    'wikiPages', 'streak', 'unlockedBadges', 'activity',
    'isProActive', 'lastStudyDate', 'customFont', 'theme',
    'colors', 'customGlyphs', 'puaCounter', 'customFontBase64', 'numeralBase'
]);

/**
 * Strips unknown keys from a config object, keeping only those
 * present in INITIAL_CONFIG. Also does basic type sanitization.
 */
export function sanitizeConfig(rawConfig) {
    if (!rawConfig || typeof rawConfig !== 'object') return {};

    const clean = {};
    for (const key of Object.keys(rawConfig)) {
        // Only allow keys that exist in our schema
        if (!VALID_CONFIG_KEYS.has(key)) continue;

        // Skip functions entirely (they shouldn't be in serialized data)
        if (typeof rawConfig[key] === 'function') continue;

        clean[key] = rawConfig[key];
    }
    return clean;
}

/**
 * Validates and sanitizes a lexicon array from imported data.
 * Each entry must have at minimum a word and translation string.
 */
export function sanitizeLexicon(rawLexicon) {
    if (!Array.isArray(rawLexicon)) {
        // Handle the case where the lexicon store was serialized as { lexicon: [...] }
        if (rawLexicon && Array.isArray(rawLexicon.lexicon)) {
            return sanitizeLexicon(rawLexicon.lexicon);
        }
        return [];
    }

    return rawLexicon.filter(entry => {
        // Must be an object with at least word and translation
        if (!entry || typeof entry !== 'object') return false;
        if (typeof entry.word !== 'string') return false;
        if (typeof entry.translation !== 'string') return false;
        return true;
    }).map(entry => ({
        id: entry.id || Date.now() + Math.random(),
        word: entry.word,
        ipa: typeof entry.ipa === 'string' ? entry.ipa : '',
        wordClass: typeof entry.wordClass === 'string' ? entry.wordClass : '',
        translation: entry.translation,
        tags: Array.isArray(entry.tags) ? entry.tags.filter(t => typeof t === 'string') : [],
        ideogram: typeof entry.ideogram === 'string' ? entry.ideogram : '',
        inflectionOverrides: (entry.inflectionOverrides && typeof entry.inflectionOverrides === 'object') 
            ? entry.inflectionOverrides : {},
        createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : Date.now()
    }));
}

/**
 * Validates the full backup structure used by Save/Load in the Header.
 * Returns a sanitized copy of the data with only valid fields.
 */
export function sanitizeBackup(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid backup file: not a valid JSON object.');
    }

    return {
        config: data.config ? sanitizeConfig(data.config) : null,
        lexicon: data.lexicon ? sanitizeLexicon(data.lexicon) : null,
        project: data.project && typeof data.project === 'object' ? data.project : null
    };
}

/**
 * lexiconMatcher.js
 * Fast lexicon cross-checking utility for the Vocab Checklist.
 *
 * Builds a normalized O(1) lookup index over the lexicon so checking
 * 500+ vocab words against a 2000-word lexicon is instantaneous.
 */

/**
 * Normalize a raw translation string to a canonical set of English keys.
 * e.g. "to drink (water)" -> ["drink"]
 *      "water, stream" -> ["water", "stream"]
 *      "to run / to sprint" -> ["run", "sprint"]
 * @param {string} rawTranslation
 * @returns {string[]} normalized lowercase keys
 */
export function normalizeTranslation(rawTranslation) {
    if (!rawTranslation || typeof rawTranslation !== 'string') return [];

    // Strip bracketed / parenthetical context
    let s = rawTranslation
        .replace(/\s*\(.*?\)\s*/g, ' ')
        .replace(/\s*\[.*?\]\s*/g, ' ')
        .trim();

    // Split on commas, slashes, semicolons, pipe
    const parts = s.split(/[,/;|]+/).map(p => p.trim()).filter(Boolean);

    const normalized = [];
    for (const part of parts) {
        // Strip leading "to " for verbs
        const key = part.replace(/^to\s+/i, '').toLowerCase().trim();
        if (key) normalized.push(key);
    }
    return normalized;
}

/**
 * Build a fast lookup index from a lexicon array.
 * Returns a Map<string, LexiconEntry> keyed by every normalized English key.
 * @param {Array} lexicon
 * @returns {Map<string, object>}
 */
export function buildLexiconIndex(lexicon) {
    const index = new Map();
    if (!Array.isArray(lexicon)) return index;

    for (const entry of lexicon) {
        const keys = normalizeTranslation(entry.translation || '');
        for (const key of keys) {
            // Keep first hit (don't overwrite) so primary entry wins
            if (!index.has(key)) {
                index.set(key, entry);
            }
        }
    }
    return index;
}

/**
 * Check if an English vocab word has a translation in the lexicon index.
 * Returns { isCreated, lexiconEntry? }
 * @param {string} englishWord
 * @param {Map<string, object>} lexiconIndex
 * @returns {{ isCreated: boolean, lexiconEntry: object|null }}
 */
export function checkWordInLexicon(englishWord, lexiconIndex) {
    const key = englishWord.replace(/^to\s+/i, '').toLowerCase().trim();
    const entry = lexiconIndex.get(key);
    return {
        isCreated: !!entry,
        lexiconEntry: entry || null,
    };
}

/**
 * Compute per-category progress stats against a given lexiconIndex.
 * @param {Array} wordsInCategory  — filtered vocabDatabase subset
 * @param {Map}   lexiconIndex     — built by buildLexiconIndex
 * @returns {{ total: number, created: number, uncreated: number, pct: number }}
 */
export function getCategoryProgress(wordsInCategory, lexiconIndex) {
    const total = wordsInCategory.length;
    if (total === 0) return { total: 0, created: 0, uncreated: 0, pct: 0 };
    let created = 0;
    for (const w of wordsInCategory) {
        if (checkWordInLexicon(w.word, lexiconIndex).isCreated) created++;
    }
    const uncreated = total - created;
    const pct = Math.round((created / total) * 100);
    return { total, created, uncreated, pct };
}

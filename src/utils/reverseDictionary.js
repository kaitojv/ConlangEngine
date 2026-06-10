// src/utils/reverseDictionary.js
// Reverse dictionary: "what's my word for X?" — searches the lexicon by
// meaning instead of by form. Offline-only tiers (instant, no API):
//
//   100  exact gloss match            query "run"   ~ translation "run"
//    90  core-word match              query "to run"~ translation "running away"
//    60  substring of gloss/definition
//    40  shared semantic theme        query "wolf"  ~ entry tagged/glossed Animals
//
// A future async tier (Datamuse `ml=` synonyms, cached in IndexedDB) can slot
// between 60 and 40 without changing this interface.

import nlp from 'compromise';
import { extractCoreWord } from './semanticTagger.js';
import { MASSIVE_THEMES } from './offlineThemes.js';

const lemmaCache = new Map();

/**
 * Reduces a word to a comparable lemma: verbs → infinitive ("running" → "run"),
 * nouns → singular ("wolves" → "wolf"). Falls back to the input.
 * Memoized to prevent NLP engine from freezing the main thread during search.
 */
function lemma(word) {
    if (!word) return '';
    if (lemmaCache.has(word)) return lemmaCache.get(word);
    const doc = nlp(word);
    doc.verbs().toInfinitive();
    doc.nouns().toSingular();
    const out = doc.text().toLowerCase().trim() || word;
    lemmaCache.set(word, out);
    return out;
}

/**
 * Scores how well an entry's MEANING matches the query.
 * Returns 0 when there is no semantic match.
 */
export function reverseDictScore(query, entry) {
    const q = String(query || '').toLowerCase().trim();
    if (!q || !entry) return 0;

    const translation = String(entry.translation || '').toLowerCase();
    const definition = String(entry.definition || '').toLowerCase();

    // Translations often hold several glosses: "run, sprint; flee"
    const glosses = translation.split(/[,;/]/).map((g) => g.trim()).filter(Boolean);

    // Tier 1 — exact gloss
    if (glosses.includes(q)) return 100;

    // Tier 2 — core-word match ("to run" / "running" → "run")
    const qCore = lemma(extractCoreWord(q));
    if (qCore && glosses.some((g) => lemma(extractCoreWord(g)) === qCore)) return 90;

    // Tier 3 — mentioned somewhere in the gloss or definition
    if (translation.includes(q) || definition.includes(q)) return 60;

    // Tier 4 — shared semantic theme via the offline theme dictionary
    const qTheme = qCore ? MASSIVE_THEMES[qCore] : undefined;
    if (qTheme) {
        const themeLower = qTheme.toLowerCase();
        if ((entry.tags || []).some((t) => String(t).toLowerCase() === themeLower)) return 40;
        if (glosses.some((g) => MASSIVE_THEMES[extractCoreWord(g)] === qTheme)) return 40;
    }

    return 0;
}

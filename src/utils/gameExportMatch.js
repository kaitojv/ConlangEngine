// gameExportMatch.js — shared lexicon lookup for the Minecraft and Terraria
// exporters, so both agree on what "the word for this term" means.
//
// The rules exist because Conlang Engine glosses are messy in practice:
//   "see, observe"            -> two alternative renderings of one term
//   "and, related (4 4 14)"   -> alternatives plus a parenthetical note
//   "big*"                    -> a reconstruction-marked gloss
// A naive `english.includes(translation)` then matches "iron" inside
// "Iron Sword" and silently returns the word for *iron*, dropping "sword".
// So we normalise both sides and only ever accept an exact hit, and a term
// with no hit is left empty for the author to type by hand.

/** Strip reconstruction marks, collapse whitespace, lowercase. */
const normalise = (s) =>
    String(s ?? '')
        .replace(/\*/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

/**
 * Every way a single lexicon entry might render one term.
 * "and, related (4 4 14)" -> ["and", "related"]
 */
export const glossCandidates = (translation) =>
    normalise(translation)
        .replace(/\([^)]*\)/g, ' ') // drop parenthetical notes
        .split(/[,;/]/)
        .map((part) => normalise(part))
        .filter(Boolean);

/** The conlang spelling, with reconstruction marks removed. */
const conlangForm = (entry) =>
    String(entry?.word ?? '').replace(/\*/g, '').trim();

/**
 * Find every lexicon entry that names this exact English term.
 * Returns all of them so callers can flag a conflict rather than silently
 * picking one; an exact-only match means a term either resolves cleanly or
 * is reported missing.
 */
export const findLexiconMatches = (english, lexicon) => {
    if (!Array.isArray(lexicon) || lexicon.length === 0) return [];
    const target = normalise(english);
    if (!target) return [];

    const hits = [];
    lexicon.forEach((entry, index) => {
        const word = conlangForm(entry);
        if (!word) return;
        if (glossCandidates(entry?.translation).includes(target)) {
            hits.push({ word, index, entry });
        }
    });
    return hits;
};

/**
 * The single best conlang word for an English term, or '' when the lexicon
 * has no exact entry for it. Never guesses by substring.
 */
export const autoMatchLexicon = (english, lexicon) => {
    const hits = findLexiconMatches(english, lexicon);
    if (hits.length === 0) return '';
    // A unique match is a confident answer. Several matches means the author
    // needs to choose, so report nothing and let them pick.
    if (hits.length > 1 && new Set(hits.map((h) => h.word)).size > 1) return '';
    return hits[0].word;
};

/**
 * Build a lookup index once, then resolve many terms against it.
 *
 * Calling autoMatchLexicon per key is O(keys x lexicon): with the generated
 * Minecraft vocabulary (2,995 terms) and a 5,000-entry lexicon that took ~4.5s
 * and froze the export modal on open. This reduces it to a single pass by
 * indexing every entry by each of its gloss candidates.
 *
 * The index maps a normalised gloss to the distinct conlang words that claim
 * it. A gloss claimed by more than one word is deliberately recorded as
 * ambiguous so autoMatch keeps refusing to guess, exactly as the linear scan
 * did.
 */
export const buildLexiconIndex = (lexicon) => {
    /** @type {Map<string, { word: string, index: number, entry: object }[]>} */
    const index = new Map();
    if (!Array.isArray(lexicon)) return index;

    lexicon.forEach((entry, i) => {
        const word = conlangForm(entry);
        if (!word) return;
        for (const candidate of glossCandidates(entry?.translation)) {
            if (!index.has(candidate)) index.set(candidate, []);
            index.get(candidate).push({ word, index: i, entry });
        }
    });
    return index;
};

/**
 * autoMatchLexicon, but resolving against a prebuilt index.
 * Returns { key -> translation } for the given terms.
 */
export const autoMatchAll = (terms, lexicon) => {
    const index = buildLexiconIndex(lexicon);
    const out = {};

    for (const { key, english } of terms) {
        const hits = index.get(normalise(english)) || [];
        // A unique match is a confident answer. Several distinct words mean the
        // author has to choose, so report nothing.
        out[key] = hits.length === 0 ? '' : new Set(hits.map((h) => h.word)).size > 1 ? '' : hits[0].word;
    }
    return out;
};

/**
 * Every conlang candidate for a term, for the manual picker in the export
 * modal. Unlike autoMatchLexicon this never returns an empty list, so a
 * missing term can still be filled in from the lexicon by hand.
 */
export const searchLexicon = (english, lexicon) => {
    if (!Array.isArray(lexicon) || lexicon.length === 0) return [];
    const target = normalise(english);
    if (!target) return [];

    const exact = [];
    const partial = [];
    const seen = new Set();

    lexicon.forEach((entry, index) => {
        const word = conlangForm(entry);
        if (!word) return;
        const candidates = glossCandidates(entry?.translation);
        const label = candidates[0] || normalise(entry?.translation);
        if (!label || seen.has(label)) return;
        seen.add(label);

        if (candidates.includes(target)) exact.push({ word, label, index, entry });
        // Word-level suggestions only: every word of the term has to show up
        // somewhere in the gloss, so "iron" is never offered for "Iron Sword"
        // on its own while "sword" is still missing.
        else if (target.split(' ').every((w) => candidates.some((c) => c.includes(w)))) {
            partial.push({ word, label, index, entry });
        }
    });

    return [...exact, ...partial];
};

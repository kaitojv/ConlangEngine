import { normalizeTranslation } from '../lexiconMatcher.js';

export const STOP_DEFINITION_WORDS = new Set([
    'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
    'and', 'or', 'but', 'if', 'as', 'from', 'into', 'onto', 'out', 'up', 'down',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
    'do', 'does', 'did', 'have', 'has', 'had',
    'my', 'your', 'his', 'her', 'its', 'our', 'their',
    'i', 'me', 'you', 'he', 'him', 'she', 'it', 'we', 'us', 'they', 'them',
    'this', 'that', 'these', 'those', 'not', 'no', 'so'
]);

/**
 * Normalize raw word/gloss text consistently for comparison.
 */
function cleanText(val) {
    return String(val || '').normalize('NFC').toLowerCase().trim();
}

/**
 * Split a lexicon gloss field into clean individual senses (keeping parentheticals stripped too).
 * Returns [{ rawSense, cleanSense, hasToPrefix, words }]
 */
export function parseGlossSenses(rawGloss) {
    if (!rawGloss || typeof rawGloss !== 'string') return [];
    const parts = rawGloss
        .normalize('NFC')
        .split(/[,/;|]+/)
        .map(p => p.trim())
        .filter(Boolean);

    const senses = [];
    parts.forEach((rawPart, index) => {
        const lowerRaw = rawPart.toLowerCase().trim();
        const withoutParens = lowerRaw
            .replace(/\s*\([^)]*\)\s*/g, ' ')
            .replace(/\s*\[[^\]]*\]\s*/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const hasToPrefix = /^to\s+/i.test(withoutParens);
        const stripped = withoutParens.replace(/^to\s+/i, '').trim();
        if (stripped) {
            senses.push({
                index,
                rawSense: lowerRaw,
                withoutParens,
                cleanSense: stripped,
                hasToPrefix,
                words: stripped.split(/\s+/).filter(Boolean)
            });
        }
    });
    return senses;
}

/**
 * Check if query appears cleanly as whole words in a short text.
 */
function hasWholeWordMatch(haystack, needle) {
    if (!haystack || !needle) return false;
    const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
        const regex = new RegExp(`(^|[^a-z0-9'])${esc}($|[^a-z0-9'])`, 'i');
        return regex.test(haystack);
    } catch {
        return false;
    }
}

/**
 * Deterministic scoring function for ranking lexicon candidates against an English or Conlang query.
 * Higher score = better match. Returns null if entry does not match query at all.
 */
export function scoreLexiconCandidate(entry, query, options = {}) {
    if (!entry || !query) return null;

    const {
        preferredRole = null,
        normalizeToBase = null,
        getRoleFromWordClass = null,
        matchesPos = null,
        isLemmaFallback = false,
        negativeContractions = null
    } = options;

    const qLow = cleanText(query);
    if (!qLow) return null;
    const qStrippedTo = qLow.replace(/^to\s+/i, '').trim();
    const qBase = normalizeToBase ? cleanText(normalizeToBase(qLow)) : qLow;

    let effectivePrefRole = preferredRole;
    if (!effectivePrefRole && (qLow.startsWith('to ') || qLow.startsWith('to_'))) {
        effectivePrefRole = 'V';
    }

    let semanticScore = 0;
    let matchSource = null;
    let matchedSense = '';

    // 1. Conlang word direct match (entry.word stripped of asterisks)
    const rawConlang = (entry.word || '').replace(/\*/g, '');
    const conlangLow = cleanText(rawConlang);
    const conlangBase = normalizeToBase ? cleanText(normalizeToBase(conlangLow)) : conlangLow;

    if (conlangLow && (conlangLow === qLow || conlangBase === qBase || conlangLow === qBase || conlangBase === qLow)) {
        semanticScore = 1000;
        matchSource = 'conlang';
        matchedSense = rawConlang;
    }

    // 2. Check shortTranslation & translation senses
    if (!matchSource) {
        const shortSenses = parseGlossSenses(entry.shortTranslation || '');
        const transSenses = parseGlossSenses(entry.translation || '');

        const evalSenses = (senses, fieldWeight, sourceLabel) => {
            for (const s of senses) {
                // Exact sense match (e.g. "water", "to drink", "water (noun)")
                if (s.cleanSense === qStrippedTo || s.withoutParens === qLow || s.rawSense === qLow) {
                    const posBonus = Math.max(0, 60 - s.index * 15);
                    const verbToBonus = (effectivePrefRole === 'V' && s.hasToPrefix) ? 45 : 0;
                    const singleSenseBonus = senses.length === 1 ? 30 : 0;
                    const candScore = fieldWeight + posBonus + verbToBonus + singleSenseBonus;
                    if (candScore > semanticScore) {
                        semanticScore = candScore;
                        matchSource = sourceLabel;
                        matchedSense = s.rawSense;
                    }
                } else if (!STOP_DEFINITION_WORDS.has(qStrippedTo) && s.words.length > 1 && hasWholeWordMatch(s.cleanSense, qStrippedTo)) {
                    // Multi-word gloss containing query word (e.g. querying "water" matches "drinking water" strictly below exact "water")
                    const extraWords = Math.max(1, s.words.length - qStrippedTo.split(/\s+/).length);
                    const candScore = 180 - Math.min(100, extraWords * 25) - s.index * 10;
                    if (candScore > semanticScore) {
                        semanticScore = candScore;
                        matchSource = `${sourceLabel}-partial`;
                        matchedSense = s.rawSense;
                    }
                }
            }
        };

        evalSenses(shortSenses, 580, 'shortTranslation');
        evalSenses(transSenses, 500, 'translation');

        // Also check normalizeTranslation canonical keys for edge parentheticals
        if (!matchSource && entry.translation) {
            const normKeys = normalizeTranslation(entry.translation);
            const hitIdx = normKeys.indexOf(qStrippedTo);
            if (hitIdx !== -1) {
                semanticScore = 480 - hitIdx * 15;
                matchSource = 'translation';
                matchedSense = normKeys[hitIdx];
            }
        }
    }

    // 3. Fallback: entry.definition (strictly lower priority than any gloss match, blocked for short function words)
    if (!matchSource && entry.definition && !STOP_DEFINITION_WORDS.has(qStrippedTo)) {
        const defSenses = parseGlossSenses(entry.definition);
        for (const s of defSenses) {
            if (s.cleanSense === qStrippedTo) {
                const candScore = 110 - Math.min(40, s.index * 8);
                if (candScore > semanticScore) {
                    semanticScore = candScore;
                    matchSource = 'definition-exact';
                    matchedSense = s.rawSense;
                }
            } else if (hasWholeWordMatch(s.cleanSense, qStrippedTo)) {
                const extraWords = Math.max(1, s.words.length - 1);
                const candScore = Math.max(30, 80 - extraWords * 5);
                if (candScore > semanticScore) {
                    semanticScore = candScore;
                    matchSource = 'definition';
                    matchedSense = s.rawSense;
                }
            }
        }
    }

    // 4. Negative contraction fallback if needed
    if (!matchSource && negativeContractions?.[qLow]) {
        return scoreLexiconCandidate(entry, negativeContractions[qLow], {
            ...options,
            preferredRole: effectivePrefRole || 'N'
        });
    }

    if (!matchSource) return null;

    // 5. Apply POS / WordClass alignment score
    let posScore = 0;
    let posMatched = false;
    const wc = cleanText(entry.wordClass);

    if (effectivePrefRole && wc && matchesPos) {
        if (matchesPos(wc, effectivePrefRole)) {
            posScore = 380;
            posMatched = true;
            // Slight bonus for dedicated single POS class vs ambiguous multi-class
            if (!/[,/|]/.test(wc)) posScore += 20;
        } else {
            const inferredRole = getRoleFromWordClass ? getRoleFromWordClass(wc) : null;
            // Strong penalty if entry explicitly belongs to an incompatible major class
            if (inferredRole && inferredRole !== effectivePrefRole) {
                posScore = -280;
            }
        }
    }

    // Conlang direct matches always preserve highest priority
    const finalScore = (matchSource === 'conlang' ? 1000 : semanticScore) + posScore - (isLemmaFallback ? 20 : 0);

    return {
        entry,
        score: finalScore,
        matchSource,
        matchedSense,
        posMatched
    };
}

/**
 * Rank all matching lexicon entries for a query.
 * Returns array of lexicon entries sorted best-first, plus detailed `.rankedCandidates` attached if requested.
 */
export function rankLexiconMatches(lexicon, query, options = {}) {
    if (!query || !Array.isArray(lexicon) || lexicon.length === 0) return [];

    const scored = [];
    const seenIds = new Set();

    for (let idx = 0; idx < lexicon.length; idx++) {
        const entry = lexicon[idx];
        if (!entry) continue;
        const result = scoreLexiconCandidate(entry, query, options);
        if (!result) continue;

        const key = entry.id != null ? `id:${entry.id}` : `w:${cleanText(entry.word)}:${cleanText(entry.wordClass)}:${idx}`;
        if (seenIds.has(key)) continue;
        seenIds.add(key);
        scored.push(result);
    }

    scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const la = (a.entry.shortTranslation || a.entry.translation || a.entry.word || '').length;
        const lb = (b.entry.shortTranslation || b.entry.translation || b.entry.word || '').length;
        return la - lb;
    });

    return scored;
}

/**
 * Build an index of multi-word English phrases (2 to 4 words) present in lexicon translations/shortTranslations.
 * Allows matching "good morning", "thank you", "look for", "ice cream", etc. as a single token.
 */
export function buildMultiWordPhraseIndex(lexicon) {
    const phraseMap = new Map(); // normalized phrase string -> Array<LexiconEntry>
    if (!Array.isArray(lexicon)) return phraseMap;

    const addPhrase = (phrase, entry) => {
        const words = phrase.split(/\s+/).filter(Boolean);
        if (words.length < 2 || words.length > 5) return;
        const key = words.join(' ');
        if (!phraseMap.has(key)) phraseMap.set(key, []);
        const bucket = phraseMap.get(key);
        if (!bucket.includes(entry)) bucket.push(entry);
    };

    for (const entry of lexicon) {
        if (!entry) continue;
        const senses = [
            ...parseGlossSenses(entry.shortTranslation || ''),
            ...parseGlossSenses(entry.translation || '')
        ];
        for (const s of senses) {
            if (s.words.length >= 2) {
                addPhrase(s.cleanSense, entry);
            }
            if (s.hasToPrefix && s.withoutParens.split(/\s+/).length >= 2) {
                // Keep "to <single word>" out so "to eat" doesn't greedily swallow infinitives!
                if (s.words.length >= 2) {
                    addPhrase(s.withoutParens, entry);
                }
            }
        }
    }

    return phraseMap;
}

/**
 * Merge multi-word lexicon phrases in raw token stream cleanly before per-word parsing.
 * Input: array of cleaned raw token strings from a clause.
 * Output: array of phrase spans { text, words, startIdx, endIdx, isPhrase, entries }
 */
export function mergeMultiWordPhrases(rawTokens, phraseMap) {
    if (!Array.isArray(rawTokens) || rawTokens.length === 0) return [];
    const tokensLow = rawTokens.map(t => cleanText(t.replace(/[.,!?()[\]{}"`:;]/g, '')));
    const spans = [];
    let i = 0;

    while (i < rawTokens.length) {
        let matchedSpan = null;

        if (phraseMap && phraseMap.size > 0) {
            const maxLen = Math.min(4, rawTokens.length - i);
            for (let len = maxLen; len >= 2; len--) {
                // Don't span across internal punctuation like commas
                let crossesPunct = false;
                for (let k = 0; k < len - 1; k++) {
                    if (/[.,;:!?]$/.test(rawTokens[i + k])) {
                        crossesPunct = true;
                        break;
                    }
                }
                if (crossesPunct) continue;

                const sliceLow = tokensLow.slice(i, i + len);
                if (sliceLow.some(w => !w)) continue;
                const phraseKey = sliceLow.join(' ');
                const hits = phraseMap.get(phraseKey);
                if (hits && hits.length > 0) {
                    matchedSpan = {
                        rawText: rawTokens.slice(i, i + len).join(' '),
                        cleanText: phraseKey,
                        wordCount: len,
                        isPhraseMatch: true,
                        phraseEntries: hits
                    };
                    break;
                }
            }
        }

        if (matchedSpan) {
            spans.push(matchedSpan);
            i += matchedSpan.wordCount;
        } else {
            spans.push({
                rawText: rawTokens[i],
                cleanText: tokensLow[i],
                wordCount: 1,
                isPhraseMatch: false,
                phraseEntries: null
            });
            i++;
        }
    }

    return spans;
}

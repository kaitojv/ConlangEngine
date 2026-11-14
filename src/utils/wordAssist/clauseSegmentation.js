import nlp from 'compromise';

export const STRONG_SUBORDINATORS = new Set([
    'because', 'although', 'though', 'while', 'whereas', 'if', 'unless', 'until', 'since'
]);

export const CLAUSE_COORDINATORS = new Set([
    'and', 'but', 'or', 'so', 'then', 'yet', 'nor'
]);

export const INTERROGATIVE_STARTERS = new Set(['who', 'what', 'where', 'when', 'why', 'how', 'which']);

export const AUX_VERBS = new Set([
    'do', 'does', 'did', 'will', 'would', 'shall', 'should',
    'can', 'could', 'may', 'might', 'must', 'am', 'is', 'are', 'was', 'were',
    'have', 'has', 'had'
]);

function hasVerbLikeContent(tokens, checkLexiconVerbFn) {
    if (!tokens || tokens.length === 0) return false;
    try {
        const text = tokens.join(' ');
        const doc = nlp(text);
        if (doc.verbs().length > 0) return true;
    } catch {
        // Fallback below
    }
    return tokens.some(raw => {
        const low = raw.replace(/[.,!?()[\]{}"`:;]/g, '').toLowerCase();
        if (!low) return false;
        if (AUX_VERBS.has(low)) return true;
        if (checkLexiconVerbFn && checkLexiconVerbFn(low)) return true;
        return false;
    });
}

/**
 * Split a sentence/line into punctuation segments, clause segments, and inter-clause conjunction markers.
 * Keeps NP-internal coordinations ("cats and dogs", "bread and water") together inside one clause,
 * while splitting true multi-clause structures ("I eat bread and you drink water", "When it rains, I stay").
 */
export function splitSentenceIntoSegments(line, options = {}) {
    const { isLexiconVerb = null } = options;
    if (!line || !line.trim()) return [];

    const parts = line.split(/([.,;:!?]+)/);
    const segments = [];

    for (let idx = 0; idx < parts.length; idx++) {
        const part = parts[idx];
        if (idx % 2 === 1) {
            if (part.trim()) segments.push({ type: 'punct', text: part });
            continue;
        }
        const trimmed = part.trim();
        if (!trimmed) continue;

        const words = trimmed.split(/\s+/).filter(Boolean);
        if (words.length <= 2) {
            segments.push({ type: 'clause', text: trimmed });
            continue;
        }

        // Scan for clause-splitting conjunctions inside this punctuated span
        let start = 0;
        let i = 0;
        while (i < words.length) {
            const wLow = words[i].replace(/[.,!?()[\]{}"`:;]/g, '').toLowerCase();
            const isSub = STRONG_SUBORDINATORS.has(wLow) || ((wLow === 'when' || wLow === 'where') && i > 0);
            const isCoord = CLAUSE_COORDINATORS.has(wLow);

            if (!isSub && !isCoord) {
                i++;
                continue;
            }

            // Case A: Clause-initial subordinator ("Because I drank water" -> conj + clause)
            if (i === start && (STRONG_SUBORDINATORS.has(wLow) || ((wLow === 'when') && words.length > 2 && !AUX_VERBS.has((words[i + 1] || '').toLowerCase())))) {
                segments.push({ type: 'conj', text: words[i] });
                start = i + 1;
                i++;
                continue;
            }

            if (i > start && i < words.length - 1) {
                const leftSlice = words.slice(start, i);
                const rightSlice = words.slice(i + 1);

                let shouldSplit = false;
                if (isSub && leftSlice.length >= 1 && rightSlice.length >= 2) {
                    shouldSplit = true;
                } else if (wLow === 'but' || wLow === 'so' || wLow === 'then' || wLow === 'yet') {
                    shouldSplit = hasVerbLikeContent(rightSlice, isLexiconVerb) || rightSlice.length >= 3;
                } else if (isCoord) {
                    // For "and" / "or": only split into two clauses if right side starts/contains a verb predicate
                    // AND left side already has a verb predicate (keeps "cats and dogs" intact!)
                    const leftHasVerb = hasVerbLikeContent(leftSlice, isLexiconVerb);
                    const rightHasVerb = hasVerbLikeContent(rightSlice, isLexiconVerb);
                    shouldSplit = leftHasVerb && rightHasVerb;
                }

                if (shouldSplit) {
                    const leftText = leftSlice.join(' ').trim();
                    if (leftText) segments.push({ type: 'clause', text: leftText });
                    segments.push({ type: 'conj', text: words[i] });
                    start = i + 1;
                    i++;
                    continue;
                }
            }

            i++;
        }

        const rem = words.slice(start).join(' ').trim();
        if (rem) {
            segments.push({ type: 'clause', text: rem });
        }
    }

    return segments;
}

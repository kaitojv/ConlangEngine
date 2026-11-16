// src/utils/wordAssist/syntaxOrdering.js
// Constituent-aware syntactic ordering driven by Settings > Grammar and
// explicit Word Assist typological settings (alignment, adpositions,
// genitives, adjectives, negation, adverbs, comparatives, WH-questions).

export const LEGACY_STALE_WA_ORDER = 'QCTLJNORVMSAPG';

const CANONICAL_CORE_ORDERS = {
    SVO: ['S', 'V', 'O', 'D', 'L'],
    SOV: ['S', 'L', 'D', 'O', 'V'],
    VSO: ['V', 'S', 'O', 'D', 'L'],
    VOS: ['V', 'O', 'D', 'L', 'S'],
    OVS: ['L', 'D', 'O', 'V', 'S'],
    OSV: ['O', 'D', 'L', 'S', 'V'],
    OVA: ['O', 'V', 'M', 'D', 'L', 'S']
};

/**
 * Resolves the effective syntax order, rescuing any legacy/stale QCTLJNORVMSAPG
 * default that shadows the canonical Grammar syntaxOrder.
 */
export function resolveEffectiveSyntaxOrder(waSyntaxOrder, targetSyntaxOrder, storeSyntaxOrder = 'SVO') {
    const cleanTarget = (targetSyntaxOrder || '').trim().toUpperCase();
    const cleanWa = (waSyntaxOrder || '').trim().toUpperCase();
    const cleanStore = (storeSyntaxOrder || 'SVO').trim().toUpperCase();

    if (cleanTarget && cleanTarget !== LEGACY_STALE_WA_ORDER) {
        if (cleanTarget === cleanWa && cleanWa === LEGACY_STALE_WA_ORDER) {
            return cleanStore;
        }
        return cleanTarget;
    }

    if (cleanWa && cleanWa !== LEGACY_STALE_WA_ORDER) {
        return cleanWa;
    }

    return cleanStore || 'SVO';
}

export function extractCoreOrderLabel(effectiveSyntaxOrder = 'SVO') {
    const upper = (effectiveSyntaxOrder || 'SVO').toUpperCase();
    if (CANONICAL_CORE_ORDERS[upper]) return upper;

    const cleanCore = upper.split('').filter(c => c === 'S' || c === 'V' || c === 'O').join('');
    if (cleanCore.length === 3 && cleanCore.includes('S') && cleanCore.includes('V') && cleanCore.includes('O')) {
        return cleanCore;
    }
    return upper.slice(0, 3) || 'SVO';
}

export function buildRolePriorityMap(effectiveSyntaxOrder = 'SVO') {
    const upper = (effectiveSyntaxOrder || 'SVO').trim().toUpperCase();
    const fallbackOrder = 'QCTLJNORVMSAPG';
    const order = {};
    let priorityIndex = 1;

    if (CANONICAL_CORE_ORDERS[upper]) {
        const sIdx = upper.indexOf('S');
        const vIdx = upper.indexOf('V');
        const oIdx = upper.indexOf('O');
        const aIdx = upper.indexOf('A');

        order.C = priorityIndex++;
        order.Q = priorityIndex++;
        order.T = priorityIndex++;

        const coreChars = [];
        if (sIdx !== -1) coreChars.push({ char: 'S', idx: sIdx });
        if (vIdx !== -1) coreChars.push({ char: 'V', idx: vIdx });
        if (oIdx !== -1) coreChars.push({ char: 'O', idx: oIdx });
        if (aIdx !== -1) coreChars.push({ char: 'M', idx: aIdx });
        coreChars.sort((a, b) => a.idx - b.idx);

        coreChars.forEach(item => {
            if (item.char === 'S') {
                order.S = priorityIndex++;
            } else if (item.char === 'V') {
                order.N = priorityIndex++;
                if (!order.M) order.M = priorityIndex++;
                order.V = priorityIndex++;
            } else if (item.char === 'O') {
                order.D = priorityIndex++;
                order.O = priorityIndex++;
            } else if (item.char === 'M') {
                order.M = priorityIndex++;
            }
        });

        order.P = priorityIndex++;
        order.L = priorityIndex++;
        order.J = priorityIndex++;
        order.G = priorityIndex++;
        order.A = priorityIndex++;

        for (const c of fallbackOrder) {
            if (!order[c]) order[c] = priorityIndex++;
        }
        return order;
    }

    for (let i = 0; i < upper.length; i++) {
        const ch = upper[i];
        if (!order[ch]) {
            order[ch] = priorityIndex++;
        }
    }
    if (!order.L) order.L = order.O ? order.O + 0.5 : priorityIndex++;
    if (!order.D) order.D = order.O ? order.O - 0.1 : priorityIndex++;
    for (const ch of fallbackOrder) {
        if (!order[ch]) order[ch] = priorityIndex++;
    }
    return order;
}

function isCustomLongPriorityString(rawOrder) {
    if (!rawOrder || typeof rawOrder !== 'string') return false;
    const upper = rawOrder.trim().toUpperCase();
    if (upper === LEGACY_STALE_WA_ORDER) return false;
    return upper.length >= 8 && !CANONICAL_CORE_ORDERS[upper];
}

function normalizeOrderingOptions(optionsOrOrder = 'SVO', legacyAdjPos, legacyGenPos, legacyAdvPos) {
    if (typeof optionsOrOrder === 'string' || !optionsOrOrder) {
        const syntaxOrder = (optionsOrOrder || 'SVO').toUpperCase();
        return {
            syntaxOrder,
            adjectivePlacement: legacyAdjPos === 'after' ? 'post-nominal' : (legacyAdjPos === 'before' ? 'pre-nominal' : 'pre-nominal'),
            genitivePlacement: legacyGenPos === 'after' ? 'possessed-possessor' : 'possessor-possessed',
            adpositionPlacement: 'preposition',
            adverbPlacement: legacyAdvPos === 'after' || legacyAdvPos === 'afterVerb' ? 'afterVerb' : (legacyAdvPos === 'clauseInitial' || legacyAdvPos === 'clauseFinal' ? legacyAdvPos : 'beforeVerb'),
            negationPlacement: 'beforeVerb',
            comparativeStrategy: 'analytic',
            questionWordPlacement: 'front',
            legacyAdjPos,
            legacyGenPos,
            legacyAdvPos
        };
    }

    return {
        syntaxOrder: (optionsOrOrder.syntaxOrder || 'SVO').toUpperCase(),
        adjectivePlacement: optionsOrOrder.adjectivePlacement || (optionsOrOrder.adjPos === 'after' ? 'post-nominal' : 'pre-nominal'),
        genitivePlacement: optionsOrOrder.genitivePlacement || (optionsOrOrder.genPos === 'after' ? 'possessed-possessor' : 'possessor-possessed'),
        adpositionPlacement: optionsOrOrder.adpositionPlacement || 'preposition',
        adverbPlacement: optionsOrOrder.adverbPlacement || 'beforeVerb',
        negationPlacement: optionsOrOrder.negationPlacement || 'beforeVerb',
        comparativeStrategy: optionsOrOrder.comparativeStrategy || 'analytic',
        questionWordPlacement: optionsOrOrder.questionWordPlacement || 'front'
    };
}

/**
 * Fallback sorter ONLY for legacy custom >=8-char priority strings (e.g. OQCLTRNPDVMS)
 * used in direct API calls / regression tests.
 */
function legacyPrioritySort(breakdownArray, opts) {
    const cleanTokens = breakdownArray.filter(t => t && !t.swallowed);
    if (cleanTokens.length <= 1) return cleanTokens;

    const orderMap = buildRolePriorityMap(opts.syntaxOrder);
    const items = cleanTokens.map((t, idx) => ({
        ...t,
        _origIdx: idx,
        _p: orderMap[t.role] || 99
    }));

    const anchorAdj = opts.legacyAdjPos || (opts.adjectivePlacement === 'post-nominal' ? 'after' : 'before');
    const anchorGen = opts.legacyGenPos || (opts.genitivePlacement === 'possessed-possessor' ? 'after' : 'before');
    const anchorAdv = opts.legacyAdvPos || opts.adverbPlacement || 'beforeVerb';

    const anchors = items.filter(t => !['J', 'G', 'A', 'P'].includes(t.role) && !(t.role === 'M' && anchorAdv !== 'followPriority'));
    const modifiers = items.filter(t => ['J', 'G', 'A', 'P'].includes(t.role) || (t.role === 'M' && anchorAdv !== 'followPriority'));

    anchors.sort((a, b) => (a._p !== b._p ? a._p - b._p : a._origIdx - b._origIdx));

    const result = [...anchors];
    const insertAround = (mod, target, placeAfter) => {
        if (!target) {
            result.push(mod);
            return;
        }
        const idx = result.indexOf(target);
        if (idx === -1) {
            result.push(mod);
            return;
        }
        result.splice(placeAfter ? idx + 1 : idx, 0, mod);
    };

    for (const mod of modifiers) {
        if (mod.role === 'J' || mod.role === 'G' || mod.role === 'A') {
            if (mod.isPredicateAdjective) {
                const pos = result.findIndex(x => x._p > mod._p);
                if (pos === -1) result.push(mod);
                else result.splice(pos, 0, mod);
                continue;
            }
            let head = null;
            for (let i = mod._origIdx + 1; i < items.length; i++) {
                if (['S', 'O', 'D', 'L'].includes(items[i].role)) { head = items[i]; break; }
            }
            if (!head) {
                for (let i = mod._origIdx - 1; i >= 0; i--) {
                    if (['S', 'O', 'D', 'L'].includes(items[i].role)) { head = items[i]; break; }
                }
            }
            const placeAfter = (mod.role === 'G' && anchorGen === 'after') || (mod.role === 'J' && anchorAdj === 'after');
            insertAround(mod, head, placeAfter);
        } else if (mod.role === 'M') {
            let head = items.find((x, idx) => idx > mod._origIdx && x.role === 'V')
                || [...items].reverse().find(x => x._origIdx < mod._origIdx && x.role === 'V');
            insertAround(mod, head, anchorAdv === 'afterVerb' || anchorAdv === 'after');
        } else {
            result.push(mod);
        }
    }
    return result;
}

/**
 * Formats an internal NP group according to explicit grammatical placement settings:
 * - Determiner/Numeral edge placement
 * - Adjective Pre-nominal vs Post-nominal
 * - Genitive/Possessor Possessor-Possessed vs Possessed-Possessor
 * - Adposition Preposition vs Postposition around the full NP
 */
function orderNounPhrase(groupTokens, opts) {
    const prepositions = [];
    const articlesAndDet = [];
    const numerals = [];
    const adjectives = [];
    const possessors = [];
    const heads = [];
    const other = [];

    for (const t of groupTokens) {
        if (t.role === 'P') prepositions.push(t);
        else if (t.role === 'A' && !t.isNumeral) articlesAndDet.push(t);
        else if (t.isNumeral) numerals.push(t);
        else if (t.role === 'J') adjectives.push(t);
        else if (t.role === 'G') possessors.push(t);
        else if (['S', 'O', 'D', 'L', 'Q'].includes(t.role)) heads.push(t);
        else other.push(t);
    }

    const adjBefore = opts.adjectivePlacement !== 'post-nominal';
    const genBefore = opts.genitivePlacement !== 'possessed-possessor';
    const isPostposition = opts.adpositionPlacement === 'postposition';

    const coreNP = [];
    if (genBefore) coreNP.push(...possessors);
    coreNP.push(...articlesAndDet, ...numerals);
    if (adjBefore) coreNP.push(...adjectives);
    coreNP.push(...heads);
    if (!adjBefore) coreNP.push(...adjectives);
    if (!genBefore) coreNP.push(...possessors);
    coreNP.push(...other);

    if (prepositions.length === 0) return coreNP;
    return isPostposition ? [...coreNP, ...prepositions] : [...prepositions, ...coreNP];
}

/**
 * Constituent-aware clause reordering driven directly by Grammar Tab + Word Assist settings.
 */
export function reorderClauseBreakdown(breakdownArray, options = 'SVO', legacyAdjPos, legacyGenPos, legacyAdvPos) {
    if (!Array.isArray(breakdownArray)) return [];
    const cleanTokens = breakdownArray.filter(t => t && !t.swallowed);
    if (cleanTokens.length <= 1) return cleanTokens;

    const opts = normalizeOrderingOptions(options, legacyAdjPos, legacyGenPos, legacyAdvPos);
    if (isCustomLongPriorityString(opts.syntaxOrder)) {
        return legacyPrioritySort(cleanTokens, opts);
    }

    const coreLabel = extractCoreOrderLabel(opts.syntaxOrder);
    const coreSequence = CANONICAL_CORE_ORDERS[coreLabel] || CANONICAL_CORE_ORDERS.SVO;
    const isOV = coreSequence.indexOf('O') < coreSequence.indexOf('V');

    // First, group tokens into syntactic constituents
    const coordinators = [];
    const timeLeading = [];
    const timeTrailing = [];
    const whTokens = [];
    const questionParticles = [];
    const verbTokens = [];
    const adverbTokens = [];
    const negationTokens = [];

    // NP chunks keyed by id
    const npChunks = []; // { slotRole: 'S'|'O'|'D'|'L', tokens: [] }
    const comparativeItems = { more: [], adj: [], than: [], std: [] };
    let seenVerb = false;

    const isNPHeadRole = (r) => r === 'S' || r === 'O' || r === 'D' || r === 'L';
    const isNPModifier = (t) => !t.isPredicateAdjective && !t.isComparativePart && ['P', 'A', 'J', 'G'].includes(t.role);

    let i = 0;
    while (i < cleanTokens.length) {
        const tok = cleanTokens[i];

        if (tok.isQuestionParticle) {
            questionParticles.push(tok);
            i++;
            continue;
        }

        if (tok.role === 'Q') {
            seenVerb = seenVerb || false;
            if (opts.questionWordPlacement === 'inSitu' && tok.inSituRole && isNPHeadRole(tok.inSituRole)) {
                npChunks.push({ slotRole: tok.inSituRole, tokens: [tok] });
            } else {
                whTokens.push(tok);
            }
            i++;
            continue;
        }

        if (tok.role === 'C' && !tok.isInternalCoordinator) {
            coordinators.push(tok);
            i++;
            continue;
        }

        if (tok.isInternalCoordinator) {
            // Standalone internal coordinator (e.g. joining S and predicate J) stays attached cleanly
            const prevChunk = npChunks[npChunks.length - 1];
            const nextTok = cleanTokens[i + 1];
            if (prevChunk && nextTok && !['V', 'T', 'N'].includes(nextTok.role)) {
                prevChunk.tokens.push(tok, nextTok);
                i += 2;
                continue;
            }
            coordinators.push(tok);
            i++;
            continue;
        }

        if (tok.role === 'T') {
            if (!seenVerb) timeLeading.push(tok);
            else timeTrailing.push(tok);
            i++;
            continue;
        }

        if (tok.role === 'N') {
            negationTokens.push(tok);
            i++;
            continue;
        }

        if (tok.role === 'M') {
            adverbTokens.push(tok);
            i++;
            continue;
        }

        if (tok.role === 'V') {
            seenVerb = true;
            verbTokens.push(tok);
            i++;
            continue;
        }

        // Comparative phrase parts tagged by grammarAnalyzer
        if (tok.isComparativePart) {
            if (tok.compPart === 'more') comparativeItems.more.push(tok);
            else if (tok.compPart === 'adj') comparativeItems.adj.push(tok);
            else if (tok.compPart === 'than') comparativeItems.than.push(tok);
            else comparativeItems.std.push(tok);
            i++;
            continue;
        }

        // Predicate Adjective after copula acts as Predicate Complement ('O')
        if (tok.isPredicateAdjective) {
            npChunks.push({ slotRole: 'O', tokens: [tok], isPredicate: true });
            i++;
            continue;
        }

        // Gather contiguous NP (e.g., P? + A/G/J* + Head(S/O/D/L)+ + J/G?, plus coordinated NP siblings joined by 'and'/'or')
        if (isNPModifier(tok) || isNPHeadRole(tok.role)) {
            const subPhrases = [];
            let assignedSlotRole = null;
            let j = i;

            while (j < cleanTokens.length) {
                const subChunk = [];
                let subHeadRole = null;
                while (j < cleanTokens.length) {
                    const cur = cleanTokens[j];
                    if (cur.isPredicateAdjective || cur.isComparativePart || cur.isQuestionParticle || cur.isInternalCoordinator) break;

                    if (isNPModifier(cur)) {
                        if (subHeadRole && (cur.role === 'P' || (cur.role === 'A' && !cur.isNumeral))) break;
                        if (subHeadRole && cur.role === 'J' && !cur.postNominalForPrevious) {
                            const nextAfter = cleanTokens[j + 1];
                            if (nextAfter && isNPHeadRole(nextAfter.role) && nextAfter.role !== subHeadRole) {
                                break;
                            }
                        }
                        subChunk.push(cur);
                        j++;
                    } else if (isNPHeadRole(cur.role)) {
                        if (subHeadRole && subHeadRole !== cur.role) break;
                        subHeadRole = cur.role;
                        if (!assignedSlotRole) assignedSlotRole = cur.role;
                        subChunk.push(cur);
                        j++;

                        while (j < cleanTokens.length && cleanTokens[j].role === 'G' && !cleanTokens[j].startsNewPhrase) {
                            subChunk.push(cleanTokens[j]);
                            j++;
                        }
                    } else {
                        break;
                    }
                }

                if (subChunk.length === 0) break;
                subPhrases.push({ subChunk, hasHead: Boolean(subHeadRole) });

                // If immediately followed by internal coordinator ('and'/'or') linking another NP of same slot (or Adj/Noun), chain them together!
                const coord = cleanTokens[j];
                const afterCoord = cleanTokens[j + 1];
                if (coord && coord.isInternalCoordinator && afterCoord && (isNPHeadRole(afterCoord.role) || isNPModifier(afterCoord))) {
                    // Only chain as coordinated NP when both share nominal role (or afterCoord starts an NP)
                    if (!assignedSlotRole || afterCoord.role === assignedSlotRole || isNPModifier(afterCoord)) {
                        subPhrases.push({ coordinator: coord });
                        j++;
                        continue;
                    }
                }
                break;
            }

            if (subPhrases.length > 0) {
                const orderedFlat = [];
                for (const sp of subPhrases) {
                    if (sp.coordinator) {
                        orderedFlat.push(sp.coordinator);
                    } else if (!sp.hasHead && sp.subChunk.length === 1) {
                        orderedFlat.push(...sp.subChunk);
                    } else {
                        orderedFlat.push(...orderNounPhrase(sp.subChunk, opts));
                    }
                }
                const effectiveSlotRole = assignedSlotRole
                    || (orderedFlat.some(t => t.role === 'P') ? 'L' : (seenVerb ? 'O' : 'S'));
                npChunks.push({ slotRole: effectiveSlotRole, tokens: orderedFlat });
                i = j;
                continue;
            }
        }

        npChunks.push({ slotRole: seenVerb ? 'O' : 'S', tokens: [tok] });
        i++;
    }

    // Build Comparative constituent if present
    const hasComparative = comparativeItems.adj.length > 0 || comparativeItems.std.length > 0;
    if (hasComparative) {
        let compOrdered = [];
        const orderedStd = comparativeItems.std.length > 0 ? orderNounPhrase(comparativeItems.std, opts) : [];
        if (opts.comparativeStrategy === 'suffix_ablative') {
            compOrdered = isOV
                ? [...orderedStd, ...comparativeItems.adj]
                : [...comparativeItems.adj, ...orderedStd];
        } else if (opts.comparativeStrategy === 'standard_first') {
            compOrdered = [...orderedStd, ...comparativeItems.than, ...comparativeItems.more, ...comparativeItems.adj];
        } else {
            // analytic
            compOrdered = [...comparativeItems.more, ...comparativeItems.adj, ...comparativeItems.than, ...orderedStd];
        }
        if (compOrdered.length > 0) {
            npChunks.push({ slotRole: 'O', tokens: compOrdered, isComparative: true });
        }
    }

    // Assemble Verb Complex with Negation & Adverbs
    const verbComplex = [];
    const negInitial = opts.negationPlacement === 'clauseInitial' ? negationTokens : [];
    const negFinal = opts.negationPlacement === 'clauseFinal' ? negationTokens : [];
    const negBeforeV = (opts.negationPlacement === 'beforeVerb' || opts.negationPlacement === 'affix') ? negationTokens : [];
    const negAfterV = opts.negationPlacement === 'afterVerb' ? negationTokens : [];

    const advInitial = opts.adverbPlacement === 'clauseInitial' ? adverbTokens : [];
    const advFinal = opts.adverbPlacement === 'clauseFinal' ? adverbTokens : [];
    const advBeforeV = opts.adverbPlacement === 'beforeVerb' ? adverbTokens : [];
    const advAfterV = opts.adverbPlacement === 'afterVerb' ? adverbTokens : [];

    verbComplex.push(...negBeforeV, ...advBeforeV, ...verbTokens, ...negAfterV, ...advAfterV);

    // Order core clause roles according to canonical order (SVO, SOV, VSO, VOS, OVS, OSV, OVA)
    const buckets = {
        S: [],
        O: [],
        D: [],
        L: [],
        V: verbComplex,
        M: []
    };

    for (const chunk of npChunks) {
        const key = buckets[chunk.slotRole] ? chunk.slotRole : 'O';
        buckets[key].push(...chunk.tokens);
    }

    const coreOrdered = [];
    for (const slot of coreSequence) {
        if (buckets[slot] && buckets[slot].length > 0) {
            coreOrdered.push(...buckets[slot]);
        }
    }

    // Put WH-words & Time adverbs into their typological slots
    const out = [];
    out.push(...coordinators);
    out.push(...negInitial);
    if (opts.questionWordPlacement === 'front') {
        out.push(...whTokens);
    }
    out.push(...advInitial);
    out.push(...timeLeading);

    // In OV / V-initial languages, trailing time expressions typically precede core or verb; in SVO preserve trailing after core
    if (coreLabel === 'SOV' || coreLabel === 'OSV') {
        out.push(...timeTrailing);
        out.push(...coreOrdered);
    } else {
        out.push(...coreOrdered);
        out.push(...timeTrailing);
    }

    out.push(...advFinal);
    if (opts.questionWordPlacement === 'clauseFinal') {
        out.push(...whTokens);
    }
    out.push(...negFinal);
    out.push(...questionParticles);

    return out;
}

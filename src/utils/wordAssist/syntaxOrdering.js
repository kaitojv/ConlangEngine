export const LEGACY_STALE_WA_ORDER = 'QCTLJNORVMSAPG';

const ALL_ROLES = ['Q', 'C', 'T', 'L', 'O', 'D', 'V', 'M', 'N', 'S', 'P', 'R', 'A', 'J', 'G'];

const DEGREE_ADVERBS = new Set([
    'very', 'so', 'too', 'quite', 'rather', 'really', 'extremely',
    'incredibly', 'fairly', 'pretty', 'super', 'more', 'most', 'less', 'least'
]);

/**
 * Resolve effective Word Assist syntax order cleanly, ignoring the legacy stale
 * 'QCTLJNORVMSAPG' OVS store default unless grammar order genuinely is OVS.
 */
export function resolveEffectiveSyntaxOrder(waSyntaxOrder, targetSyntaxOrder, storeSyntaxOrder = 'SVO') {
    const baseGrammar = (storeSyntaxOrder || 'SVO').toUpperCase().trim();
    const target = (targetSyntaxOrder || '').toUpperCase().trim();
    const waOrder = (waSyntaxOrder || '').toUpperCase().trim();

    // If caller explicitly passed a different syntax order than store default (e.g. unit test or override), honor it
    if (target && target !== baseGrammar) {
        return target;
    }

    if (waOrder) {
        const isStaleDefault = waOrder === LEGACY_STALE_WA_ORDER && baseGrammar !== 'OVS';
        if (!isStaleDefault) {
            return waOrder;
        }
    }

    return target || baseGrammar || 'SVO';
}

/**
 * Expand canonical 3-4 letter syntax orders (SVO, SOV, VSO, VOS, OVS, OSV, OVA)
 * or preserve explicit >4-char custom drag priority orders into a complete role weight map.
 */
export function buildRolePriorityMap(effectiveSyntaxOrder = 'SVO') {
    let normalizedInput = (effectiveSyntaxOrder || 'SVO').toUpperCase().replace(/[^A-Z]/g, '');
    if (!normalizedInput) normalizedInput = 'SVO';

    // Support 'OVA' (Object-Verb-Agent) shorthand in GrammarTab
    if (normalizedInput === 'OVA') {
        normalizedInput = 'OVS';
    }

    const baseOrder = [];
    const pushUnique = (role) => {
        if (role && !baseOrder.includes(role)) baseOrder.push(role);
    };

    if (normalizedInput.length > 4) {
        // Explicit custom syntactic priority string from drag-and-drop settings
        for (const ch of normalizedInput) pushUnique(ch);
        ALL_ROLES.forEach(pushUnique);
    } else {
        // Canonical short order (e.g. SVO, SOV, VSO, VOS, OVS, OSV)
        const coreChars = [];
        for (const ch of normalizedInput) {
            if (!coreChars.includes(ch)) coreChars.push(ch);
        }
        const isVerbFinal = coreChars[coreChars.length - 1] === 'V';

        // 1. Clause-initial frame elements (Wh-questions, Complementizers/Subordinators, Time adjuncts)
        ['Q', 'C', 'T'].forEach(pushUnique);

        // 2. Core arguments & Verb complex
        coreChars.forEach((role) => {
            if (role === 'O') {
                // Dative indirect object naturally precedes Direct Object ("give Mary a book")
                pushUnique('D');
                pushUnique('O');
            } else if (role === 'V') {
                if (isVerbFinal) {
                    // In SOV/OSV, locative/prepositional adjuncts come before the clause-final verb
                    pushUnique('L');
                    pushUnique('P');
                    pushUnique('M');
                    pushUnique('N');
                    pushUnique('V');
                } else {
                    pushUnique('M');
                    pushUnique('N');
                    pushUnique('V');
                }
            } else {
                pushUnique(role);
            }
        });

        // 3. Post-core locative/adpositional phrases for VO / V-initial / V-medial orders
        pushUnique('L');
        pushUnique('P');

        // 4. Fill remaining modifier roles deterministically
        ALL_ROLES.forEach(pushUnique);
    }

    const roleOrder = {};
    baseOrder.forEach((role, idx) => {
        roleOrder[role] = idx;
    });
    return { baseOrder, roleOrder, normalizedInput };
}

/**
 * Format short display label for the panel header (e.g. "SOV", "OVS", "VSO").
 */
export function extractCoreOrderLabel(effectiveSyntaxOrder = 'SVO') {
    const clean = (effectiveSyntaxOrder || 'SVO').toUpperCase().trim();
    if (clean.length <= 4) return clean;
    const core = [];
    for (const ch of clean) {
        if ((ch === 'S' || ch === 'V' || ch === 'O') && !core.includes(ch)) {
            core.push(ch);
        }
    }
    return core.length === 3 ? core.join('') : clean.slice(0, 4);
}

/**
 * Reorder a single clause breakdown into target conlang word order using constituent grouping:
 * - Adjectives (J), Genitives (G), Articles (A), and Noun-modifying degree adverbs stay bound to their head noun
 * - Prepositional/Postpositional phrases stay cohesive around their NP complement
 * - Clause adverbs (R) attach to the Verb constituent rather than the nearest Noun
 * - Coordinated noun phrases ("cats and dogs") stay together inside their constituent
 * - Adjective agreement (if enabled) propagates head noun rules onto bound adjectives
 */
export function reorderClauseBreakdown(breakdownArray, options = {}) {
    const {
        effectiveSyntaxOrder = 'SVO',
        adjPosDefault = 'before',
        waConfig = {},
        isPostpositional = false,
        adjectiveAgreement = false,
        applyPhonologicalRule = null
    } = options;

    const { roleOrder } = buildRolePriorityMap(effectiveSyntaxOrder);

    const resolveModifierPos = (modRole) => {
        if (modRole === 'A') return 'before';
        if (modRole === 'G') return waConfig?.genPos || 'before';
        if (modRole === 'R') return waConfig?.advPos || 'before';
        if (modRole === 'J' || modRole === 'C') return adjPosDefault;
        return waConfig?.adjPos || adjPosDefault;
    };

    const activeTokens = (breakdownArray || []).filter(Boolean);
    if (activeTokens.length === 0) return [];

    activeTokens.forEach((tok, idx) => {
        tok.originalPos = idx;
    });

    const isNominalRole = (r) => r === 'S' || r === 'O' || r === 'D' || r === 'L' || r === 'T' || r === 'Q';
    const isNounModRole = (r) => r === 'A' || r === 'G' || r === 'J' || r === 'C';

    const partitionNpModifiers = (mods) => {
        const before = [];
        const after = [];
        mods.forEach((m) => {
            // Keep degree adverbs attached directly to adjectives
            if (m._attachedToAdj) {
                const adjPos = resolveModifierPos('J');
                if (adjPos === 'after') after.push(m);
                else before.push(m);
                return;
            }
            const pos = resolveModifierPos(m.role);
            if (pos === 'after') after.push(m);
            else before.push(m);
        });
        return { before, after };
    };

    const blocks = [];
    let pendingNounMods = [];
    const pendingVerbAdverbs = [];
    let j = 0;

    while (j < activeTokens.length) {
        const tokenObj = activeTokens[j];
        const r = tokenObj.role;
        const low = (tokenObj.original || '').toLowerCase();

        // 1. Degree adverb directly preceding an Adjective or another Adverb -> bind them together
        if (r === 'R' && DEGREE_ADVERBS.has(low) && j + 1 < activeTokens.length && (activeTokens[j + 1].role === 'J' || activeTokens[j + 1].role === 'R')) {
            const nextTok = activeTokens[j + 1];
            if (nextTok.role === 'J') {
                const pos = resolveModifierPos('J');
                if (pos === 'priority') {
                    blocks.push({ type: 'Standalone', headRole: 'R', tokens: [tokenObj], originalPos: tokenObj.originalPos });
                } else {
                    tokenObj._attachedToAdj = true;
                    pendingNounMods.push(tokenObj);
                }
                j++;
                continue;
            }
        }

        // 2. General Adverb ('R') -> attach to Verb block (or standalone if advPos === 'priority')
        if (r === 'R') {
            const pos = resolveModifierPos('R');
            if (pos === 'priority') {
                blocks.push({ type: 'Standalone', headRole: 'R', tokens: [tokenObj], originalPos: tokenObj.originalPos });
            } else {
                pendingVerbAdverbs.push({ token: tokenObj, pos });
            }
            j++;
            continue;
        }

        // 3. Prepositional / Postpositional Phrase ('P' + modifiers + NP (+ optional 'and NP'))
        if (r === 'P') {
            // Flush any stray noun modifiers if they came before P without a noun
            if (pendingNounMods.length > 0) {
                blocks.push({
                    type: 'Standalone',
                    headRole: pendingNounMods[0].role,
                    tokens: pendingNounMods,
                    originalPos: pendingNounMods[0].originalPos
                });
                pendingNounMods = [];
            }

            const pToken = tokenObj;
            j++;

            const pMods = [];
            while (j < activeTokens.length && (isNounModRole(activeTokens[j].role) || (activeTokens[j].role === 'R' && activeTokens[j + 1]?.role === 'J'))) {
                pMods.push(activeTokens[j]);
                j++;
            }

            const pTokens = [pToken];
            let pHeadToken = null;
            let pHeadRole = 'P';

            if (j < activeTokens.length && isNominalRole(activeTokens[j].role)) {
                const before = [];
                const after = [];
                pMods.forEach((m) => {
                    const pos = resolveModifierPos(m.role);
                    if (pos === 'priority') {
                        blocks.push({ type: 'Standalone', headRole: m.role, tokens: [m], originalPos: m.originalPos });
                    } else if (pos === 'after') {
                        after.push(m);
                    } else {
                        before.push(m);
                    }
                });
                pHeadToken = activeTokens[j];
                pHeadRole = pHeadToken.role;
                pTokens.push(...before, pHeadToken, ...after);
                j++;

                // Support coordinated PP objects like "between the cat and the dog"
                if (
                    j + 1 < activeTokens.length &&
                    activeTokens[j].role === 'K' &&
                    isNominalRole(activeTokens[j + 1].role)
                ) {
                    pTokens.push(activeTokens[j], activeTokens[j + 1]);
                    j += 2;
                }
            } else {
                pMods.forEach((m) => {
                    const pos = resolveModifierPos(m.role);
                    if (pos === 'priority') {
                        blocks.push({ type: 'Standalone', headRole: m.role, tokens: [m], originalPos: m.originalPos });
                    } else {
                        pTokens.push(m);
                    }
                });
            }

            blocks.push({
                type: 'Prepositional',
                headRole: pHeadRole,
                headToken: pHeadToken,
                tokens: pTokens,
                hasAdposition: true,
                originalPos: pToken.originalPos
            });
            continue;
        }

        // 4. Noun Modifiers ('A', 'G', 'J', 'C')
        if (isNounModRole(r)) {
            const pos = resolveModifierPos(r);
            if (pos === 'priority') {
                if (pendingNounMods.length > 0) {
                    blocks.push({
                        type: 'Standalone',
                        headRole: pendingNounMods[0].role,
                        tokens: pendingNounMods,
                        originalPos: pendingNounMods[0].originalPos
                    });
                    pendingNounMods = [];
                }
                blocks.push({ type: 'Standalone', headRole: r, tokens: [tokenObj], originalPos: tokenObj.originalPos });
            } else {
                // Coordinated adjectives: "red and big dog"
                pendingNounMods.push(tokenObj);
            }
            j++;
            continue;
        }

        // 5. Nominal Heads ('S', 'O', 'D', 'L', 'T', 'Q')
        if (isNominalRole(r)) {
            const { before, after } = partitionNpModifiers(pendingNounMods);
            const npTokens = [...before, tokenObj, ...after];
            pendingNounMods = [];
            j++;

            // Keep coordinated NP heads ("cats and dogs", "Mary and John") in one constituent!
            while (
                j < activeTokens.length &&
                activeTokens[j].role === 'K'
            ) {
                const conjToken = activeTokens[j];
                let look = j + 1;
                const coordMods = [];
                while (look < activeTokens.length && isNounModRole(activeTokens[look].role)) {
                    coordMods.push(activeTokens[look]);
                    look++;
                }
                if (look < activeTokens.length && isNominalRole(activeTokens[look].role)) {
                    const { before: cb, after: ca } = partitionNpModifiers(coordMods);
                    npTokens.push(conjToken, ...cb, activeTokens[look], ...ca);
                    j = look + 1;
                } else {
                    break;
                }
            }

            blocks.push({
                type: r === 'S' ? 'Subject' : r === 'D' ? 'IndirectObject' : r === 'O' ? 'Object' : 'Constituent',
                headRole: r,
                headToken: tokenObj,
                tokens: npTokens,
                originalPos: tokenObj.originalPos
            });
            continue;
        }

        // 6. Verbs ('V'), Modals ('M'), Negation ('N')
        if (r === 'V' || r === 'M' || r === 'N') {
            if (pendingNounMods.length > 0 && r === 'V') {
                // Edge case: lone predicate adjective or subordinator preceding V ("is red" is handled below;
                // flush modifiers if they don't belong inside V)
                const { before, after } = partitionNpModifiers(pendingNounMods);
                const lastBlock = blocks[blocks.length - 1];
                if (lastBlock && lastBlock.headRole === r) {
                    lastBlock.tokens.push(...before, tokenObj, ...after);
                } else {
                    blocks.push({
                        type: 'Verb',
                        headRole: r,
                        headToken: tokenObj,
                        tokens: [...before, tokenObj, ...after],
                        originalPos: tokenObj.originalPos
                    });
                }
                pendingNounMods = [];
                j++;
                continue;
            }

            const lastBlock = blocks[blocks.length - 1];
            // Group adjacent infinitive/serial verbs into the Verb complex (e.g. "want [to] sleep")
            if (lastBlock && lastBlock.headRole === 'V' && r === 'V' && pendingNounMods.every(m => m.role === 'C')) {
                lastBlock.tokens.push(...pendingNounMods, tokenObj);
                pendingNounMods = [];
                j++;
                continue;
            }

            if (pendingNounMods.length > 0) {
                blocks.push({
                    type: 'Standalone',
                    headRole: pendingNounMods[0].role,
                    tokens: pendingNounMods,
                    originalPos: pendingNounMods[0].originalPos
                });
                pendingNounMods = [];
            }

            if (lastBlock && lastBlock.headRole === r && r !== 'N') {
                lastBlock.tokens.push(tokenObj);
            } else {
                blocks.push({
                    type: r === 'V' ? 'Verb' : r === 'M' ? 'Modal' : 'Negation',
                    headRole: r,
                    headToken: tokenObj,
                    tokens: [tokenObj],
                    originalPos: tokenObj.originalPos
                });
            }
            j++;
            continue;
        }

        // 7. Standalone / Remaining roles (e.g. 'K' inside clause)
        if (pendingNounMods.length > 0) {
            blocks.push({
                type: 'Standalone',
                headRole: pendingNounMods[0].role,
                tokens: pendingNounMods,
                originalPos: pendingNounMods[0].originalPos
            });
            pendingNounMods = [];
        }
        blocks.push({
            type: 'Standalone',
            headRole: r,
            tokens: [tokenObj],
            originalPos: tokenObj.originalPos
        });
        j++;
    }

    // Flush leftover noun/predicate modifiers:
    // If the clause is a copula predicate ("The cat is black"), pending predicate adjectives ('J') stay as standalone 'J' blocks
    // OR attach cleanly without attaching to Subject erroneously!
    if (pendingNounMods.length > 0) {
        const lastNonVerbNounBlock = blocks.find(b => b.headRole === 'V' || b.headRole === 'M');
        if (pendingNounMods.length === 1 && lastNonVerbNounBlock) {
            const isShortOrder = (effectiveSyntaxOrder || '').trim().length <= 4;
            blocks.push({
                type: 'PredicateModifier',
                headRole: isShortOrder && pendingNounMods[0].role === 'J' ? 'O' : pendingNounMods[0].role,
                tokens: pendingNounMods,
                originalPos: pendingNounMods[0].originalPos
            });
        } else {
            pendingNounMods.forEach((modTok) => {
                blocks.push({
                    type: 'Standalone',
                    headRole: modTok.role,
                    tokens: [modTok],
                    originalPos: modTok.originalPos
                });
            });
        }
    }

    // Attach deferred Verb-modifying Adverbs ('R') onto the clause's Verb block (instead of dangling onto an Object noun!)
    if (pendingVerbAdverbs.length > 0) {
        const verbBlock = blocks.find(b => b.headRole === 'V') || blocks.find(b => b.headRole === 'M');
        if (verbBlock) {
            pendingVerbAdverbs.forEach(({ token, pos }) => {
                if (pos === 'after') verbBlock.tokens.push(token);
                else verbBlock.tokens.unshift(token);
            });
        } else {
            pendingVerbAdverbs.forEach(({ token }) => {
                blocks.push({
                    type: 'Standalone',
                    headRole: 'R',
                    tokens: [token],
                    originalPos: token.originalPos
                });
            });
        }
    }

    // Sort constituent blocks stably according to roleOrder
    blocks.sort((a, b) => {
        const weightA = roleOrder[a.headRole] ?? 99;
        const weightB = roleOrder[b.headRole] ?? 99;
        if (weightA !== weightB) return weightA - weightB;
        return (a.originalPos ?? 0) - (b.originalPos ?? 0);
    });

    // Respect Preposition vs Postposition settings inside adpositional phrases
    blocks.forEach((block) => {
        if (!block.hasAdposition) return;
        block.tokens.sort((a, b) => {
            if (a.role === 'P' && b.role !== 'P') return isPostpositional ? 1 : -1;
            if (b.role === 'P' && a.role !== 'P') return isPostpositional ? -1 : 1;
            return 0;
        });
    });

    // Adjective agreement with head noun rules
    if (adjectiveAgreement && applyPhonologicalRule) {
        blocks.forEach((block) => {
            if (block.headToken?.appliedRules?.length > 0) {
                block.tokens.forEach((t) => {
                    if (t.role === 'J') {
                        let c = t.conlang;
                        block.headToken.appliedRules.forEach((r) => {
                            try {
                                c = applyPhonologicalRule(c, r);
                                t.inflected = true;
                                t.ruleSource = (t.ruleSource ? t.ruleSource + ', ' : '') + 'Adjective Agreement: ' + (r.name || r.condition);
                            } catch (e) {
                                console.error(e);
                            }
                        });
                        t.conlang = c;
                    }
                });
            }
        });
    }

    const result = [];
    blocks.forEach((block) => {
        // Clean internal temp flag
        block.tokens.forEach(tok => {
            if (tok && Object.prototype.hasOwnProperty.call(tok, '_attachedToAdj')) {
                delete tok._attachedToAdj;
            }
        });
        result.push(...block.tokens);
    });
    return result;
}

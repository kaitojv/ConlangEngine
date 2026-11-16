// src/utils/wordAssist/diagnosticsEngine.js
// Audits both overall conlang translator readiness and exact missing
// vocabulary, pronouns, and grammar rules for the active sentence.

import { SLOT_BY_ID, PREPOSITION_TO_CASE_MAP } from './configResolver.js';

function countPOS(lexicon, posRegex) {
    return (lexicon || []).filter(e => posRegex.test(e?.wordClass || '')).length;
}

function hasLexiconTranslation(lexicon, terms) {
    const set = new Set(terms.map(t => t.toLowerCase()));
    return (lexicon || []).some(e => {
        const parts = (e?.translation || '')
            .toLowerCase()
            .replace(/\([^)]*\)/g, '')
            .split(/[,;/]+/)
            .map(s => s.trim().replace(/^to\s+/, ''));
        return parts.some(p => set.has(p));
    });
}

function buildSuggestedRuleFromSlot(slotId) {
    const slot = SLOT_BY_ID[slotId];
    if (!slot) return null;
    return {
        slotId,
        name: slot.label.split('(')[0].trim(),
        affix: slot.suggestedAffix || `-${slot.defaultGloss.toLowerCase()}`,
        gloss: slot.defaultGloss,
        targetPOS: slot.posHint === 'All' ? '' : slot.posHint,
        appliesTo: 'all',
        standalone: Boolean(slot.standaloneDefault)
    };
}

/**
 * Evaluates overall readiness of the conlang across Lexicon, Grammar,
 * Pronouns, Alignment, Cases, and Morphosyntax settings.
 */
export function auditLanguageReadiness({
    lexicon = [],
    settings = {},
    resolver = null,
    pronounSystem = null,
    particleDatabase = []
} = {}) {
    const checks = [];
    const slotSummary = resolver?.slotSummary || {};

    const nouns = countPOS(lexicon, /\bnoun\b/i);
    const verbs = countPOS(lexicon, /\bverb\b/i);
    const adjectives = countPOS(lexicon, /\badj/i);
    const pronounsInLex = countPOS(lexicon, /\bpron/i);
    const pronounsInMatrix = pronounSystem?.byEnglishAndCase?.size || 0;

    checks.push({
        id: 'lex-core',
        category: 'lexicon',
        status: lexicon.length >= 10 && nouns > 0 && verbs > 0 ? 'ok' : (lexicon.length > 0 ? 'warn' : 'missing'),
        label: 'Core Vocabulary',
        detail: `${lexicon.length} entries (${nouns} Nouns, ${verbs} Verbs, ${adjectives} Adj.)`,
        targetTab: 'lexicon'
    });

    const has1S = (pronounSystem?.lookupMatrixPronoun?.('i', 'sub')?.length > 0) || hasLexiconTranslation(lexicon, ['i']);
    const has2S = (pronounSystem?.lookupMatrixPronoun?.('you', 'sub')?.length > 0) || hasLexiconTranslation(lexicon, ['you']);
    const has3S = (pronounSystem?.lookupMatrixPronoun?.('he', 'sub')?.length > 0 || pronounSystem?.lookupMatrixPronoun?.('she', 'sub')?.length > 0 || pronounSystem?.lookupMatrixPronoun?.('it', 'sub')?.length > 0)
        || hasLexiconTranslation(lexicon, ['he', 'she', 'it']);

    checks.push({
        id: 'pronouns-core',
        category: 'pronouns',
        status: (has1S && has2S && has3S) ? 'ok' : ((pronounsInLex > 0 || pronounsInMatrix > 0) ? 'warn' : 'missing'),
        label: 'Personal Pronouns (1S / 2S / 3S)',
        detail: (has1S && has2S && has3S)
            ? 'Core subject pronouns configured'
            : `Missing: ${[!has1S && 'I (1S)', !has2S && 'you (2S)', !has3S && 'he/she/it (3S)'].filter(Boolean).join(', ')}`,
        targetTab: 'functionWords'
    });

    // Alignment rule check
    if (settings.alignment === 'accusative') {
        const hasAcc = Boolean(slotSummary.accusative);
        checks.push({
            id: 'align-accusative',
            category: 'grammar',
            status: hasAcc ? 'ok' : 'warn',
            label: 'Accusative Case (Object Marking)',
            detail: hasAcc
                ? `Bound to ${slotSummary.accusative.rule?.name || slotSummary.accusative.particle?.surface}`
                : 'Alignment is Nominative-Accusative, but no Accusative (ACC) rule or particle exists.',
            slotId: 'accusative',
            suggestedRule: buildSuggestedRuleFromSlot('accusative'),
            targetTab: 'grammar'
        });
    } else if (settings.alignment === 'ergative') {
        const hasErg = Boolean(slotSummary.ergative);
        checks.push({
            id: 'align-ergative',
            category: 'grammar',
            status: hasErg ? 'ok' : 'warn',
            label: 'Ergative Case (Transitive Subject)',
            detail: hasErg
                ? `Bound to ${slotSummary.ergative.rule?.name || slotSummary.ergative.particle?.surface}`
                : 'Alignment is Ergative-Absolutive, but no Ergative (ERG) rule or particle exists.',
            slotId: 'ergative',
            suggestedRule: buildSuggestedRuleFromSlot('ergative'),
            targetTab: 'grammar'
        });
    } else {
        checks.push({
            id: 'align-neutral',
            category: 'grammar',
            status: 'ok',
            label: 'Neutral Word-Order Alignment',
            detail: `Arguments distinguished strictly by ${settings.syntaxOrder || 'SVO'} word order.`,
            targetTab: 'grammar'
        });
    }

    // Core Tense & Number & Negation
    const coreGrammarChecks = [
        { id: 'slot-plural', slotId: 'plural', label: 'Plural Number Rule' },
        { id: 'slot-past', slotId: 'past', label: 'Past Tense Rule / Particle' },
        { id: 'slot-future', slotId: 'future', label: 'Future Tense Rule / Particle' },
        { id: 'slot-negation', slotId: 'negation', label: 'Negation Rule / Word ("not")', lexTerms: ['not'] }
    ];

    for (const chk of coreGrammarChecks) {
        const resolved = slotSummary[chk.slotId];
        const hasLex = chk.lexTerms ? hasLexiconTranslation(lexicon, chk.lexTerms) : false;
        const ok = Boolean(resolved || hasLex);
        checks.push({
            id: chk.id,
            category: 'grammar',
            status: ok ? 'ok' : 'warn',
            label: chk.label,
            detail: resolved
                ? `Active: ${resolved.rule?.name || resolved.particle?.surface} (${resolved.rule?.affix || resolved.particle?.surface || ''})`
                : hasLex
                    ? 'Handled via Lexicon word'
                    : `No ${chk.label.toLowerCase()} found in Grammar Rules or Particles.`,
            slotId: chk.slotId,
            suggestedRule: buildSuggestedRuleFromSlot(chk.slotId),
            targetTab: 'grammar'
        });
    }

    // Copula Check
    const hasBeLex = hasLexiconTranslation(lexicon, ['be', 'is', 'am', 'are', 'copula']);
    const copulaOk = settings.copulaBehavior === 'zero_copula' || hasBeLex || Boolean(settings.copulaReplacement);
    checks.push({
        id: 'copula-check',
        category: 'grammar',
        status: copulaOk ? 'ok' : 'warn',
        label: 'Copula ("to be")',
        detail: settings.copulaBehavior === 'zero_copula'
            ? (settings.copulaReplacement ? `Zero-copula / particle "${settings.copulaReplacement}"` : 'Zero-copula enabled (linking "is/are" omitted)')
            : (hasBeLex ? 'Verb "to be" present in Lexicon' : 'Add a "be" verb in Lexicon or enable Zero-Copula in Grammar Settings.'),
        targetTab: 'grammar'
    });

    // Optional Particle / Numeral summary
    if (Array.isArray(particleDatabase) && particleDatabase.length > 0) {
        checks.push({
            id: 'particles-ok',
            category: 'particles',
            status: 'ok',
            label: 'Particle System',
            detail: `${particleDatabase.length} particles indexed for translation`,
            targetTab: 'particles'
        });
    }

    const readyCount = checks.filter(c => c.status === 'ok').length;
    const totalCount = checks.length || 1;
    const scorePercent = Math.round((readyCount / totalCount) * 100);

    return {
        scorePercent,
        readyCount,
        totalCount,
        checks
    };
}

/**
 * Inspects analyzed tokens & clause features for the active sentence and produces
 * concrete, deduplicated missing vocabulary, pronouns, and grammar rule suggestions.
 */
export function collectSentenceDiagnostics({
    tokens = [],
    settings = {},
    resolver = null,
    numberSystem = {}
} = {}) {
    const items = [];
    const seenKeys = new Set();

    const pushItem = (item) => {
        if (!item || !item.id || seenKeys.has(item.id)) return;
        seenKeys.add(item.id);
        items.push(item);
    };

    const resolveSlot = (slotId, posHint = null) => resolver?.resolveSlot?.(slotId, posHint) || null;
    const safeTokens = Array.isArray(tokens) ? tokens : [];

    // 1. Missing words & pronouns from token breakdown
    for (const tok of safeTokens) {
        if (!tok || tok.swallowed || tok.skippedArticle || tok.skippedAuxiliary || tok.droppedPro) continue;
        if (tok.isPunctuation) continue;

        if (!tok.found) {
            const rawOrig = tok.original || '';
            const cleanOrig = rawOrig.trim();
            if (!cleanOrig) continue;

            if (tok.isNumeral) {
                const hasDigits = numberSystem?.digits && Object.values(numberSystem.digits).some(Boolean);
                if (!hasDigits) {
                    pushItem({
                        id: `numeral:${cleanOrig}`,
                        kind: 'setting',
                        severity: 'warn',
                        title: `Numeral "${cleanOrig}" cannot be generated`,
                        description: 'Define your digit words in Orthography > Numerals or add the number word to your Lexicon.',
                        suggestedPos: 'Numeral',
                        lemma: cleanOrig,
                        targetTab: 'numerals',
                        targetRoute: '/orthography'
                    });
                }
                continue;
            }

            const lemma = (tok.baseWord || cleanOrig).replace(/['’]s$/i, '').trim() || cleanOrig;
            const rolePos = tok.missingPosHint || (
                tok.role === 'V' ? 'Verb'
                    : tok.role === 'J' ? 'Adjective'
                        : tok.role === 'M' || tok.role === 'T' ? 'Adverb'
                            : tok.role === 'P' ? 'Preposition'
                                : tok.role === 'C' ? 'Conjunction'
                                    : tok.role === 'N' ? 'Particle'
                                        : tok.isPronoun ? 'Pronoun'
                                            : 'Noun'
            );

            if (tok.isPronoun || tok.type === 'missing-pronoun') {
                pushItem({
                    id: `pronoun:${lemma.toLowerCase()}`,
                    kind: 'pronoun',
                    severity: 'missing',
                    title: `Missing Pronoun: "${cleanOrig}"`,
                    description: `Add "${cleanOrig}" in Settings > Pronouns Matrix (synced to Lexicon) or add it directly as a Pronoun in your Lexicon.`,
                    lemma,
                    original: cleanOrig,
                    suggestedPos: 'Pronoun',
                    targetTab: 'functionWords'
                });
            } else if (tok.role === 'P') {
                const mappedCase = PREPOSITION_TO_CASE_MAP[cleanOrig.toLowerCase()];
                if (mappedCase && !resolveSlot(mappedCase, 'Noun')) {
                    const slot = SLOT_BY_ID[mappedCase];
                    pushItem({
                        id: `prep_or_case:${cleanOrig.toLowerCase()}:${mappedCase}`,
                        kind: 'word',
                        severity: 'missing',
                        title: `Missing Preposition "${cleanOrig}" (or ${slot?.label?.split('(')[0].trim()} case)`,
                        description: settings.absorbPrepositionsIntoCase
                            ? `Either add "${cleanOrig}" as a Preposition in Lexicon, or create a ${slot?.label} (${slot?.defaultGloss}) rule in Grammar.`
                            : `Add "${cleanOrig}" as a ${settings.adpositionPlacement === 'postposition' ? 'Postposition' : 'Preposition'} in Lexicon or Particle Database.`,
                        lemma,
                        original: cleanOrig,
                        suggestedPos: settings.adpositionPlacement === 'postposition' ? 'Postposition' : 'Preposition',
                        alternativeSlotId: mappedCase,
                        suggestedRule: buildSuggestedRuleFromSlot(mappedCase),
                        targetTab: 'grammar'
                    });
                } else {
                    pushItem({
                        id: `word:${lemma.toLowerCase()}:Preposition`,
                        kind: 'word',
                        severity: 'missing',
                        title: `Missing Adposition: "${cleanOrig}"`,
                        description: `Add "${lemma}" as a ${settings.adpositionPlacement === 'postposition' ? 'Postposition' : 'Preposition'} in Lexicon or Particle Database.`,
                        lemma,
                        original: cleanOrig,
                        suggestedPos: settings.adpositionPlacement === 'postposition' ? 'Postposition' : 'Preposition'
                    });
                }
            } else {
                pushItem({
                    id: `word:${lemma.toLowerCase()}:${rolePos}`,
                    kind: 'word',
                    severity: 'missing',
                    title: `Missing ${rolePos}: "${lemma}"${lemma.toLowerCase() !== cleanOrig.toLowerCase() ? ` (from "${cleanOrig}")` : ''}`,
                    description: tok.role === 'S' ? 'Used as Subject in this sentence.'
                        : tok.role === 'O' ? 'Used as Direct Object / Complement in this sentence.'
                            : tok.role === 'V' ? 'Used as Verb predicate in this sentence.'
                                : tok.role === 'J' ? 'Used as Adjective modifier in this sentence.'
                                    : 'Required by the current sentence.',
                    lemma,
                    original: cleanOrig,
                    suggestedPos: rolePos
                });
            }
        }
    }

    // 2. Grammar rule requirements triggered specifically by tokens/constructions in this sentence
    for (const tok of safeTokens) {
        if (!tok) continue;

        // Alignment rules (only warn when a rule is actually needed by an argument)
        if (tok.role === 'O' && !tok.isCopulaPredicate && !tok.swallowed && settings.alignment === 'accusative') {
            if (!resolveSlot('accusative', 'Noun')) {
                pushItem({
                    id: 'missing_rule:accusative',
                    kind: 'rule',
                    severity: 'warn',
                    title: 'No Accusative Case Rule for Direct Object',
                    description: `Your alignment is Nominative-Accusative and "${tok.original}" is a Direct Object, but no Accusative (ACC) rule exists in Grammar Rules.`,
                    slotId: 'accusative',
                    suggestedRule: buildSuggestedRuleFromSlot('accusative'),
                    targetTab: 'grammar'
                });
            }
        }

        if (tok.role === 'S' && tok.isTransitiveSubject && !tok.swallowed && settings.alignment === 'ergative') {
            if (!resolveSlot('ergative', 'Noun')) {
                pushItem({
                    id: 'missing_rule:ergative',
                    kind: 'rule',
                    severity: 'warn',
                    title: 'No Ergative Case Rule for Transitive Subject',
                    description: `Your alignment is Ergative-Absolutive and "${tok.original}" is a transitive Agent, but no Ergative (ERG) rule exists.`,
                    slotId: 'ergative',
                    suggestedRule: buildSuggestedRuleFromSlot('ergative'),
                    targetTab: 'grammar'
                });
            }
        }

        if (tok.needsFeatures && Array.isArray(tok.needsFeatures)) {
            for (const feat of tok.needsFeatures) {
                if (feat.satisfied) continue;
                const slot = SLOT_BY_ID[feat.slotId];
                if (!slot) continue;
                pushItem({
                    id: `missing_rule:${feat.slotId}`,
                    kind: 'rule',
                    severity: 'warn',
                    title: `Missing Grammar Rule: ${slot.label}`,
                    description: feat.reason || `"${tok.original}" uses ${slot.label}, but no matching rule (${slot.defaultGloss}) or particle was found.`,
                    slotId: feat.slotId,
                    suggestedRule: buildSuggestedRuleFromSlot(feat.slotId),
                    targetTab: 'grammar'
                });
            }
        }

        // Pro-drop check
        if (tok.missingPersonAgreementTag) {
            pushItem({
                id: `missing_agreement:${tok.missingPersonAgreementTag}`,
                kind: 'setting',
                severity: 'warn',
                title: `Missing Verb Affix for ${tok.missingPersonAgreementTag} (Pro-drop)`,
                description: `Pro-drop is set to drop subject pronouns, so define a Verb Affix for ${tok.missingPersonAgreementTag} in Settings > Pronouns.`,
                targetTab: 'functionWords'
            });
        }
    }

    // Check Copula warning specifically when an English copula was used with normal copula mode & nothing found
    const missingCopulaToken = safeTokens.find(t => t && t.isCopulaVerb && !t.found && !t.swallowed && settings.copulaBehavior === 'normal');
    if (missingCopulaToken) {
        pushItem({
            id: 'missing_copula_or_zero',
            kind: 'setting',
            severity: 'warn',
            title: `No "to be" / Copula Verb for "${missingCopulaToken.original}"`,
            description: 'Add a verb meaning "to be" to your Lexicon, or set Copula Handling to Zero Copula in Grammar / Word Assist Settings.',
            lemma: 'be',
            original: missingCopulaToken.original,
            suggestedPos: 'Verb',
            targetTab: 'grammar'
        });
    }

    return items;
}

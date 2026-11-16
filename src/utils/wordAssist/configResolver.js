// src/utils/wordAssist/configResolver.js
// Unified resolution of Settings > Grammar, Pronouns Matrix, Particles,
// Numerals, and Word Assist Translator configuration.

import { buildNumeralAtoms, numeralName } from '../../components/UI/Glyph/resolveNumeralGlyphs.js';
import { LEGACY_STALE_WA_ORDER } from './syntaxOrdering.js';

export const CANONICAL_SYNTAX_ORDERS = ['SVO', 'SOV', 'VSO', 'VOS', 'OVS', 'OSV', 'OVA'];

export const GRAMMATICAL_SLOTS = [
    // Core Arguments & Cases
    {
        id: 'nominative',
        group: 'core_case',
        label: 'Nominative (Subject)',
        posHint: 'Noun',
        defaultGloss: 'NOM',
        suggestedAffix: '',
        glossPatterns: ['nom', 'nominative', 'sbj', 'subj'],
        namePatterns: ['nominative', 'nominativo', 'subject case']
    },
    {
        id: 'accusative',
        group: 'core_case',
        label: 'Accusative (Direct Object)',
        posHint: 'Noun',
        defaultGloss: 'ACC',
        suggestedAffix: '-n',
        glossPatterns: ['acc', 'accusative', 'obj', 'do'],
        namePatterns: ['accusative', 'acusativo', 'direct object', 'object case']
    },
    {
        id: 'ergative',
        group: 'core_case',
        label: 'Ergative (Transitive Subject)',
        posHint: 'Noun',
        defaultGloss: 'ERG',
        suggestedAffix: '-e',
        glossPatterns: ['erg', 'ergative'],
        namePatterns: ['ergative', 'ergativo']
    },
    {
        id: 'absolutive',
        group: 'core_case',
        label: 'Absolutive (Intrans. Subj / Obj)',
        posHint: 'Noun',
        defaultGloss: 'ABS',
        suggestedAffix: '',
        glossPatterns: ['abs', 'absolutive'],
        namePatterns: ['absolutive', 'absolutivo']
    },
    {
        id: 'genitive',
        group: 'core_case',
        label: 'Genitive / Possessive',
        posHint: 'Noun',
        defaultGloss: 'GEN',
        suggestedAffix: '-s',
        glossPatterns: ['gen', 'poss', 'genitive'],
        namePatterns: ['genitive', 'genitivo', 'possessive', 'possessivo']
    },
    {
        id: 'dative',
        group: 'core_case',
        label: 'Dative (Indirect Object)',
        posHint: 'Noun',
        defaultGloss: 'DAT',
        suggestedAffix: '-r',
        glossPatterns: ['dat', 'dative', 'io', 'ben', 'benefactive'],
        namePatterns: ['dative', 'dativo', 'indirect object', 'benefactive']
    },

    // Oblique Cases
    {
        id: 'locative',
        group: 'oblique_case',
        label: 'Locative (in / at / on)',
        posHint: 'Noun',
        defaultGloss: 'LOC',
        suggestedAffix: '-lo',
        glossPatterns: ['loc', 'locative', 'iness', 'adess'],
        namePatterns: ['locative', 'locativo', 'inessive', 'adessive']
    },
    {
        id: 'allative',
        group: 'oblique_case',
        label: 'Allative (to / toward / into)',
        posHint: 'Noun',
        defaultGloss: 'ALL',
        suggestedAffix: '-ta',
        glossPatterns: ['all', 'allative', 'lat', 'ill', 'illative'],
        namePatterns: ['allative', 'alativo', 'illative', 'lative', 'directional']
    },
    {
        id: 'ablative',
        group: 'oblique_case',
        label: 'Ablative (from / out of / than)',
        posHint: 'Noun',
        defaultGloss: 'ABL',
        suggestedAffix: '-fa',
        glossPatterns: ['abl', 'ablative', 'el', 'elative'],
        namePatterns: ['ablative', 'ablativo', 'elative']
    },
    {
        id: 'instrumental',
        group: 'oblique_case',
        label: 'Instrumental / Comitative (with / by)',
        posHint: 'Noun',
        defaultGloss: 'INS',
        suggestedAffix: '-wi',
        glossPatterns: ['ins', 'inst', 'instr', 'instrumental', 'com', 'comitative'],
        namePatterns: ['instrumental', 'comitative', 'comitativo']
    },

    // Nominal Number & Definiteness
    {
        id: 'plural',
        group: 'nominal',
        label: 'Plural Number',
        posHint: 'Noun',
        defaultGloss: 'PL',
        suggestedAffix: '-i',
        glossPatterns: ['pl', 'plur', 'plural'],
        namePatterns: ['plural']
    },
    {
        id: 'dual',
        group: 'nominal',
        label: 'Dual Number',
        posHint: 'Noun',
        defaultGloss: 'DU',
        suggestedAffix: '-du',
        glossPatterns: ['du', 'dual'],
        namePatterns: ['dual']
    },
    {
        id: 'definite',
        group: 'nominal',
        label: 'Definite Article / Marker ("the")',
        posHint: 'Noun',
        defaultGloss: 'DEF',
        suggestedAffix: 'la-',
        glossPatterns: ['def', 'definite', 'art.def'],
        namePatterns: ['definite', 'definido']
    },
    {
        id: 'indefinite',
        group: 'nominal',
        label: 'Indefinite Article / Marker ("a/an")',
        posHint: 'Noun',
        defaultGloss: 'INDEF',
        suggestedAffix: 'un-',
        glossPatterns: ['indef', 'indf', 'indefinite'],
        namePatterns: ['indefinite', 'indefinido']
    },

    // Tense, Aspect & Mood
    {
        id: 'past',
        group: 'tam',
        label: 'Past Tense',
        posHint: 'Verb',
        defaultGloss: 'PST',
        suggestedAffix: '-ta',
        glossPatterns: ['pst', 'past', 'pret', 'impf'],
        namePatterns: ['past', 'passado', 'pretérito', 'preterite', 'imperfect']
    },
    {
        id: 'present',
        group: 'tam',
        label: 'Present Tense',
        posHint: 'Verb',
        defaultGloss: 'PRS',
        suggestedAffix: '',
        glossPatterns: ['prs', 'pres', 'present', 'npst'],
        namePatterns: ['present', 'presente']
    },
    {
        id: 'future',
        group: 'tam',
        label: 'Future Tense',
        posHint: 'Verb',
        defaultGloss: 'FUT',
        suggestedAffix: '-ul',
        glossPatterns: ['fut', 'future'],
        namePatterns: ['future', 'futuro']
    },
    {
        id: 'perfect',
        group: 'tam',
        label: 'Perfect Aspect / Past Participle',
        posHint: 'Verb',
        defaultGloss: 'PRF',
        suggestedAffix: '-en',
        glossPatterns: ['prf', 'perf', 'perfect', 'ptcp'],
        namePatterns: ['perfect', 'perfeito', 'participle', 'particípio']
    },
    {
        id: 'progressive',
        group: 'tam',
        label: 'Progressive / Gerund ("-ing")',
        posHint: 'Verb',
        defaultGloss: 'PROG',
        suggestedAffix: '-an',
        glossPatterns: ['prog', 'cont', 'ger', 'ipfv', 'progressive'],
        namePatterns: ['progressive', 'progressivo', 'continuous', 'contínuo', 'gerund', 'gerúndio']
    },
    {
        id: 'conditional',
        group: 'tam',
        label: 'Conditional / Subjunctive ("would")',
        posHint: 'Verb',
        defaultGloss: 'COND',
        suggestedAffix: '-va',
        glossPatterns: ['cond', 'subj', 'irr'],
        namePatterns: ['conditional', 'condicional', 'subjunctive', 'subjuntivo']
    },
    {
        id: 'imperative',
        group: 'tam',
        label: 'Imperative Mood',
        posHint: 'Verb',
        defaultGloss: 'IMP',
        suggestedAffix: '-o',
        glossPatterns: ['imp', 'imper', 'imperative'],
        namePatterns: ['imperative', 'imperativo', 'command']
    },
    {
        id: 'passive',
        group: 'tam',
        label: 'Passive Voice',
        posHint: 'Verb',
        defaultGloss: 'PASS',
        suggestedAffix: '-pa',
        glossPatterns: ['pass', 'pasv', 'passive'],
        namePatterns: ['passive', 'passiva', 'passivo']
    },
    {
        id: 'infinitive',
        group: 'tam',
        label: 'Infinitive ("to V")',
        posHint: 'Verb',
        defaultGloss: 'INF',
        suggestedAffix: '-ar',
        glossPatterns: ['inf', 'infinitive'],
        namePatterns: ['infinitive', 'infinitivo']
    },

    // Polarity, Comparison & Clause
    {
        id: 'negation',
        group: 'clause',
        label: 'Negation ("not")',
        posHint: 'Verb',
        defaultGloss: 'NEG',
        suggestedAffix: 'ne-',
        glossPatterns: ['neg', 'not'],
        namePatterns: ['negation', 'negative', 'negação', 'negativo']
    },
    {
        id: 'comparative',
        group: 'clause',
        label: 'Comparative Degree ("more / -er")',
        posHint: 'Adjective',
        defaultGloss: 'COMP',
        suggestedAffix: '-er',
        glossPatterns: ['comp', 'cmpr', 'comparative'],
        namePatterns: ['comparative', 'comparativo']
    },
    {
        id: 'superlative',
        group: 'clause',
        label: 'Superlative Degree ("most / -est")',
        posHint: 'Adjective',
        defaultGloss: 'SUP',
        suggestedAffix: '-est',
        glossPatterns: ['sup', 'supl', 'superlative'],
        namePatterns: ['superlative', 'superlativo']
    },
    {
        id: 'question',
        group: 'clause',
        label: 'Question / Interrogative Marker',
        posHint: 'Particle',
        defaultGloss: 'Q',
        suggestedAffix: 'ka',
        glossPatterns: ['q', 'int', 'interr', 'qu'],
        namePatterns: ['question', 'interrogative', 'pergunta', 'interrogativo'],
        standaloneDefault: true
    },
    {
        id: 'adverbial',
        group: 'clause',
        label: 'Adverbializer ("-ly")',
        posHint: 'Adjective',
        defaultGloss: 'ADV',
        suggestedAffix: '-li',
        glossPatterns: ['adv', 'advz', 'adverbial'],
        namePatterns: ['adverbial', 'adverb', 'advérbio']
    }
];

export const SLOT_BY_ID = Object.fromEntries(GRAMMATICAL_SLOTS.map(s => [s.id, s]));

export function buildGrammarRuleEntry(slotId, draft = {}) {
    const slot = SLOT_BY_ID[slotId] || null;
    const rawPos = String(draft.appliesTo || draft.targetPOS || slot?.posHint || 'all').trim().toLowerCase();
    const appliesTo = rawPos === 'particle' || !rawPos ? 'all' : rawPos;
    const id = draft.id || `rule_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    return {
        id,
        name: String(draft.name || slot?.label?.split('(')[0] || slotId || 'Rule').trim(),
        affix: String(draft.affix || slot?.suggestedAffix || '').trim(),
        gloss: String(draft.gloss || slot?.defaultGloss || '').trim(),
        appliesTo,
        targetPOS: '',
        condition: 'always',
        dependency: '',
        standalone: draft.standalone !== undefined ? Boolean(draft.standalone) : Boolean(slot?.standaloneDefault),
        applyToPersons: false,
        isDerivational: false
    };
}

export const PREPOSITION_TO_CASE_MAP = {
    'in': 'locative',
    'at': 'locative',
    'on': 'locative',
    'inside': 'locative',
    'upon': 'locative',
    'within': 'locative',
    'under': 'locative',
    'near': 'locative',
    'to': 'allative',
    'into': 'allative',
    'toward': 'allative',
    'towards': 'allative',
    'onto': 'allative',
    'from': 'ablative',
    'out': 'ablative',
    'off': 'ablative',
    'with': 'instrumental',
    'by': 'instrumental',
    'via': 'instrumental',
    'using': 'instrumental',
    'for': 'dative',
    'of': 'genitive'
};

export const DEFAULT_TRANSLATOR_SETTINGS = {
    syntaxOrder: 'SVO',
    alignment: 'accusative',
    adjectivePlacement: 'pre-nominal',
    adjectiveAgreement: false,
    genitivePlacement: 'possessor-possessed',
    adpositionPlacement: 'preposition',
    absorbPrepositionsIntoCase: true,
    adverbPlacement: 'beforeVerb',
    negationPlacement: 'beforeVerb',
    comparativeStrategy: 'analytic',
    questionWordPlacement: 'front',
    questionParticleBehavior: 'yesNoOnly',
    articleStrategy: 'omit',
    subjectRealization: 'free_only', // 'free_only' | 'affix_only' | 'drop_subject' | 'free_and_affix'
    proDropMode: 'never',
    verbPersonAgreement: 'off', // 'auto' | 'always' | 'off'
    copulaBehavior: 'normal',
    copulaReplacement: '',
    ruleBindings: {},
    particleBindings: {},
    roleOverrides: {}
};

export const TYPOLOGY_SELECT_FIELDS = [
    {
        key: 'alignment',
        label: 'Morphosyntactic Alignment',
        options: [
            { value: 'accusative', label: 'Nominative - Accusative (Object marked ACC)' },
            { value: 'ergative', label: 'Ergative - Absolutive (Transitive Subj marked ERG)' },
            { value: 'neutral', label: 'Neutral (Word Order only, no core case)' }
        ]
    },
    {
        key: 'genitivePlacement',
        label: 'Genitive / Possessor Order',
        options: [
            { value: 'possessor-possessed', label: "Possessor First (John's book / my house)" },
            { value: 'possessed-possessor', label: 'Possessed First (book of John / house my)' }
        ]
    },
    {
        key: 'adpositionPlacement',
        label: 'Adpositions',
        options: [
            { value: 'preposition', label: 'Prepositions (before NP: "in house")' },
            { value: 'postposition', label: 'Postpositions (after NP: "house in")' }
        ]
    },
    {
        key: 'negationPlacement',
        label: 'Negation Placement',
        options: [
            { value: 'beforeVerb', label: 'Before Verb (I not eat)' },
            { value: 'afterVerb', label: 'After Verb (I eat not)' },
            { value: 'clauseInitial', label: 'Clause-Initial (Not I eat)' },
            { value: 'clauseFinal', label: 'Clause-Final (I eat ... not)' },
            { value: 'affix', label: 'Attach as Verb Affix (using NEG rule)' }
        ]
    },
    {
        key: 'adverbPlacement',
        label: 'Adverb Placement',
        options: [
            { value: 'beforeVerb', label: 'Before Verb' },
            { value: 'afterVerb', label: 'After Verb' },
            { value: 'clauseInitial', label: 'Clause-Initial' },
            { value: 'clauseFinal', label: 'Clause-Final' }
        ]
    },
    {
        key: 'comparativeStrategy',
        label: 'Comparative Construction',
        options: [
            { value: 'analytic', label: 'Analytic (more ADJ than X)' },
            { value: 'suffix_ablative', label: 'Inflected + Ablative (ADJ-COMP X-ABL)' },
            { value: 'standard_first', label: 'Standard First (X (than) ADJ-COMP)' }
        ]
    },
    {
        key: 'questionWordPlacement',
        label: 'WH-Question Words',
        options: [
            { value: 'front', label: 'Fronted (clause start: "What you eat?")' },
            { value: 'inSitu', label: 'In-Situ (stay in S/O/L grammatical slot)' },
            { value: 'clauseFinal', label: 'Clause-Final' }
        ]
    },
    {
        key: 'questionParticleBehavior',
        label: 'Question Particle ("ka")',
        options: [
            { value: 'yesNoOnly', label: 'Yes/No questions only (if Q rule exists)' },
            { value: 'allQuestions', label: 'All questions (including WH)' },
            { value: 'none', label: 'Do not inject question particle' }
        ]
    },
    {
        key: 'articleStrategy',
        label: 'Articles ("the / a / an")',
        options: [
            { value: 'omit', label: 'Omit English articles (zero-article conlang)' },
            { value: 'translate', label: 'Translate as separate words (from Lexicon/Particles)' },
            { value: 'affix', label: 'Apply Definite/Indefinite Noun Affixes (DEF / IND)' }
        ]
    },
    {
        key: 'subjectRealization',
        label: 'Subject Pronouns & Verb Agreement',
        options: [
            { value: 'free_only', label: 'Free Only (keep subject pronoun, no verb affix)' },
            { value: 'affix_only', label: 'Affix Only (attach person affix to verb & drop pronoun)' },
            { value: 'drop_subject', label: 'Drop Subject (omit subject pronoun completely)' },
            { value: 'free_and_affix', label: 'Both: Free Pronoun + Verb Affix' }
        ]
    }
];

function isCustomRolePriorityString(order) {
    if (!order || typeof order !== 'string') return false;
    const upper = order.trim().toUpperCase();
    if (upper === LEGACY_STALE_WA_ORDER) return false;
    return upper.length >= 8 && !CANONICAL_SYNTAX_ORDERS.includes(upper);
}

/**
 * Merges GrammarTab settings, WordAssist overrides, and legacy waConfig defaults
 * into one explicit, deterministic translator settings object.
 */
export function resolveTranslatorSettings(options = {}) {
    const waConfig = (options.waConfig && typeof options.waConfig === 'object')
        ? options.waConfig
        : (options.wordAssistConfig && typeof options.wordAssistConfig === 'object' ? options.wordAssistConfig : {});

    const rawGrammarOrder = (options.syntaxOrder || '').trim().toUpperCase();
    const rawWaOrder = (waConfig.syntaxOrder || '').trim().toUpperCase();

    let effectiveSyntaxOrder = 'SVO';
    let isLegacyCustomPriority = false;

    if (isCustomRolePriorityString(rawWaOrder)) {
        effectiveSyntaxOrder = rawWaOrder;
        isLegacyCustomPriority = true;
    } else if (isCustomRolePriorityString(rawGrammarOrder)) {
        effectiveSyntaxOrder = rawGrammarOrder;
        isLegacyCustomPriority = true;
    } else if (rawWaOrder && rawWaOrder !== LEGACY_STALE_WA_ORDER && CANONICAL_SYNTAX_ORDERS.includes(rawWaOrder)) {
        effectiveSyntaxOrder = rawWaOrder;
    } else if (rawGrammarOrder && rawGrammarOrder !== LEGACY_STALE_WA_ORDER) {
        effectiveSyntaxOrder = rawGrammarOrder;
    }

    const legacyAdjPos = waConfig.adjPos;
    const adjectivePlacement = options.adjectivePlacement
        || (legacyAdjPos === 'after' ? 'post-nominal' : legacyAdjPos === 'before' ? 'pre-nominal' : DEFAULT_TRANSLATOR_SETTINGS.adjectivePlacement);

    const legacyGenPos = waConfig.genPos;
    const genitivePlacement = waConfig.genitivePlacement
        || (legacyGenPos === 'after' ? 'possessed-possessor' : 'possessor-possessed');

    const legacyAdvPos = waConfig.advPos;
    const mappedLegacyAdv = legacyAdvPos === 'after' || legacyAdvPos === 'afterVerb'
        ? 'afterVerb'
        : (legacyAdvPos === 'clauseInitial' || legacyAdvPos === 'clauseFinal' ? legacyAdvPos : 'beforeVerb');

    const copulaBehavior = options.copulaOverride
        || waConfig.copulaBehavior
        || DEFAULT_TRANSLATOR_SETTINGS.copulaBehavior;

    const alignment = waConfig.alignment || options.alignment || DEFAULT_TRANSLATOR_SETTINGS.alignment;

    const VALID_SUBJECT_MODES = new Set(['free_only', 'affix_only', 'drop_subject', 'free_and_affix']);
    const rawSubjMode = waConfig.subjectRealization || options.subjectRealization || '';
    const hasExplicitSubjMode = VALID_SUBJECT_MODES.has(rawSubjMode);

    let subjectRealization;
    let proDropMode;
    let verbPersonAgreement;

    if (hasExplicitSubjMode) {
        subjectRealization = rawSubjMode;
        proDropMode = rawSubjMode === 'affix_only' ? 'pronouns' : (rawSubjMode === 'drop_subject' ? 'always' : 'never');
        verbPersonAgreement = (rawSubjMode === 'affix_only' || rawSubjMode === 'free_and_affix') ? 'always' : 'off';
    } else {
        proDropMode = waConfig.proDropMode || options.proDropMode || DEFAULT_TRANSLATOR_SETTINGS.proDropMode;
        verbPersonAgreement = waConfig.verbPersonAgreement || options.verbPersonAgreement || 'auto';
        if (proDropMode === 'pronouns') subjectRealization = 'affix_only';
        else if (proDropMode === 'always') subjectRealization = 'drop_subject';
        else if (verbPersonAgreement === 'always') subjectRealization = 'free_and_affix';
        else subjectRealization = 'free_only';
    }

    return {
        ...DEFAULT_TRANSLATOR_SETTINGS,
        syntaxOrder: effectiveSyntaxOrder,
        isLegacyCustomPriority,
        alignment,
        adjectivePlacement,
        adjectiveAgreement: options.adjectiveAgreement !== undefined
            ? Boolean(options.adjectiveAgreement)
            : Boolean(waConfig.adjectiveAgreement),
        genitivePlacement,
        adpositionPlacement: waConfig.adpositionPlacement || options.adpositionPlacement || DEFAULT_TRANSLATOR_SETTINGS.adpositionPlacement,
        absorbPrepositionsIntoCase: waConfig.absorbPrepositionsIntoCase !== undefined
            ? Boolean(waConfig.absorbPrepositionsIntoCase)
            : DEFAULT_TRANSLATOR_SETTINGS.absorbPrepositionsIntoCase,
        adverbPlacement: waConfig.adverbPlacement || mappedLegacyAdv,
        negationPlacement: waConfig.negationPlacement || DEFAULT_TRANSLATOR_SETTINGS.negationPlacement,
        comparativeStrategy: waConfig.comparativeStrategy || DEFAULT_TRANSLATOR_SETTINGS.comparativeStrategy,
        questionWordPlacement: waConfig.questionWordPlacement || DEFAULT_TRANSLATOR_SETTINGS.questionWordPlacement,
        questionParticleBehavior: waConfig.questionParticleBehavior || DEFAULT_TRANSLATOR_SETTINGS.questionParticleBehavior,
        articleStrategy: waConfig.articleStrategy || DEFAULT_TRANSLATOR_SETTINGS.articleStrategy,
        subjectRealization,
        hasExplicitSubjectRealization: hasExplicitSubjMode,
        proDropMode,
        verbPersonAgreement,
        copulaBehavior,
        copulaReplacement: (waConfig.copulaReplacement || '').trim(),
        ruleBindings: waConfig.ruleBindings && typeof waConfig.ruleBindings === 'object' ? { ...waConfig.ruleBindings } : {},
        particleBindings: waConfig.particleBindings && typeof waConfig.particleBindings === 'object' ? { ...waConfig.particleBindings } : {},
        roleOverrides: waConfig.roleOverrides && typeof waConfig.roleOverrides === 'object' ? { ...waConfig.roleOverrides } : {},
        legacyTriggers: Array.isArray(waConfig.triggers) ? waConfig.triggers : []
    };
}

function posMatchesRule(rule, targetPOS) {
    if (!rule || !targetPOS) return true;
    const rawTarget = (rule.targetPOS || rule.appliesTo || 'all').toLowerCase().trim();
    if (!rawTarget || rawTarget === 'all' || rawTarget === 'any') return true;
    const normPos = targetPOS.toLowerCase().trim();
    const parts = rawTarget.split(/[,/|]+/).map(s => s.trim());
    return parts.some(p => p === normPos || p.startsWith(normPos.slice(0, 3)) || normPos.startsWith(p.slice(0, 3)));
}

function scoreRuleForSlot(rule, slot, targetPOS) {
    if (!rule || (!rule.affix && !rule.name && !rule.gloss)) return 0;
    let score = 0;

    const ruleGloss = (rule.gloss || '').toLowerCase().trim();
    const ruleName = (rule.name || '').toLowerCase().trim();
    const glossTokens = ruleGloss.split(/[^a-z0-9]+/).filter(Boolean);

    if (slot.glossPatterns.some(p => ruleGloss === p || glossTokens.includes(p))) {
        score += 120;
    }

    for (const pat of slot.namePatterns) {
        if (ruleName === pat) {
            score += 110;
            break;
        }
        const wordRegex = new RegExp(`\\b${pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
        if (wordRegex.test(ruleName)) {
            score += 80;
            break;
        }
    }

    if (score === 0) return 0;

    // Bonus/penalty for POS alignment
    const effectivePos = targetPOS || slot.posHint;
    if (effectivePos && effectivePos !== 'All') {
        if (posMatchesRule(rule, effectivePos)) {
            score += 30;
        } else {
            score -= 45;
        }
    }

    // Prefer non-empty affixes over zero placeholders when two rules match equally
    if (rule.affix && rule.affix.trim()) {
        score += 10;
    }

    return score;
}

function scoreParticleForSlot(particle, slot, usesParticles) {
    if (!particle || !particle.surface) return null;
    const senses = Array.isArray(particle.senses) && particle.senses.length > 0
        ? particle.senses
        : [{ meaning: '', gloss: '', tags: [] }];

    let best = null;
    for (const sense of senses) {
        const gloss = (sense.gloss || '').toLowerCase().trim();
        const meaning = (sense.meaning || '').toLowerCase().trim();
        const tags = Array.isArray(sense.tags) ? sense.tags.map(t => String(t).toLowerCase()) : [];

        let score = 0;
        const glossTokens = gloss.split(/[^a-z0-9]+/).filter(Boolean);
        if (slot.glossPatterns.some(p => gloss === p || glossTokens.includes(p) || tags.includes(p))) {
            score += 115;
        }
        if (slot.namePatterns.some(pat => meaning === pat || meaning.includes(pat))) {
            score += 95;
        }
        if (slot.id === 'negation' && (meaning === 'not' || meaning === 'no' || meaning.includes('not'))) {
            score += 100;
        }
        if (slot.id === 'future' && (meaning === 'will' || meaning === 'shall')) {
            score += 90;
        }
        if (slot.id === 'past' && (meaning === 'did' || meaning === 'was')) {
            score += 75;
        }

        if (score > 0) {
            if (usesParticles) score += 20;
            if (!best || score > best.score) {
                best = { score, particle, sense };
            }
        }
    }
    return best;
}

function mapLegacyTriggerSlot(trigger) {
    const trigName = (trigger.name || '').toLowerCase();
    const trigKey = (trigger.trigger || '').toLowerCase();
    if (trigKey === 'o' || trigName.includes('accusative') || trigName.includes('direct object')) return 'accusative';
    if (trigKey === 'not' || trigName.includes('negat')) return 'negation';
    if (trigKey === '-s' || trigName.includes('plural')) return 'plural';
    if (trigName.includes('past')) return 'past';
    if (trigName.includes('future')) return 'future';
    if (trigName.includes('genitive') || trigName.includes('possess')) return 'genitive';
    if (trigName.includes('comparat')) return 'comparative';
    if (trigName.includes('superlat')) return 'superlative';
    if (trigName.includes('locative')) return 'locative';
    if (trigName.includes('dative')) return 'dative';
    if (trigName.includes('ergative')) return 'ergative';
    return null;
}

/**
 * Resolves each grammatical slot to its configured grammar rule, particle, or legacy trigger.
 */
export function buildGrammaticalResolver({
    grammarRules = [],
    particleDatabase = [],
    usesParticles = false,
    settings = DEFAULT_TRANSLATOR_SETTINGS
} = {}) {
    const safeRules = Array.isArray(grammarRules) ? grammarRules : [];
    const safeParticles = Array.isArray(particleDatabase) ? particleDatabase : [];

    const resolveSlot = (slotId, targetPOS = null) => {
        const slot = SLOT_BY_ID[slotId];
        if (!slot) return null;

        const explicitRuleId = settings.ruleBindings?.[slotId];
        const explicitParticleId = settings.particleBindings?.[slotId];

        if (explicitRuleId === 'none' && (!explicitParticleId || explicitParticleId === 'none')) {
            return null;
        }

        if (explicitRuleId && explicitRuleId !== 'auto' && explicitRuleId !== 'none') {
            const boundRule = safeRules.find(r => r.id === explicitRuleId || r.name === explicitRuleId);
            if (boundRule) {
                return { kind: 'rule', slotId, source: 'binding', rule: boundRule };
            }
        }

        if (explicitParticleId && explicitParticleId !== 'auto' && explicitParticleId !== 'none') {
            const boundParticle = safeParticles.find(p => p.id === explicitParticleId || p.surface === explicitParticleId);
            if (boundParticle) {
                return {
                    kind: 'particle',
                    slotId,
                    source: 'binding',
                    particle: boundParticle,
                    sense: boundParticle.senses?.[0] || null
                };
            }
        }

        // Auto-match best grammar rule
        let bestRule = null;
        let bestRuleScore = 0;
        for (const r of safeRules) {
            const s = scoreRuleForSlot(r, slot, targetPOS);
            if (s > bestRuleScore) {
                bestRuleScore = s;
                bestRule = r;
            }
        }

        // Auto-match best particle
        let bestParticleMatch = null;
        for (const p of safeParticles) {
            const m = scoreParticleForSlot(p, slot, usesParticles);
            if (m && (!bestParticleMatch || m.score > bestParticleMatch.score)) {
                bestParticleMatch = m;
            }
        }

        // When usesParticles is true and morphology has no stronger rule, favor particle
        if (bestParticleMatch && (!bestRule || (usesParticles && bestParticleMatch.score >= bestRuleScore))) {
            return {
                kind: 'particle',
                slotId,
                source: 'auto',
                particle: bestParticleMatch.particle,
                sense: bestParticleMatch.sense
            };
        }

        if (bestRule) {
            return { kind: 'rule', slotId, source: 'auto', rule: bestRule };
        }

        // Low-priority compatibility fallback: non-empty legacy WA trigger
        const matchingTrigger = (settings.legacyTriggers || []).find(t =>
            t?.marker && t.marker.trim() && mapLegacyTriggerSlot(t) === slotId
        );
        if (matchingTrigger) {
            const marker = matchingTrigger.marker.trim();
            const pos = matchingTrigger.position || 'suffix';
            const affix = marker.startsWith('-') || marker.endsWith('-')
                ? marker
                : (pos === 'prefix' ? `${marker}-` : pos === 'word' ? marker : `-${marker}`);
            return {
                kind: 'trigger',
                slotId,
                source: 'legacy',
                trigger: matchingTrigger,
                rule: {
                    id: matchingTrigger.id,
                    name: matchingTrigger.name || slot.label,
                    affix,
                    gloss: slot.defaultGloss,
                    standalone: pos === 'word',
                    appliesTo: 'all'
                }
            };
        }

        return null;
    };

    const slotSummary = {};
    for (const slot of GRAMMATICAL_SLOTS) {
        slotSummary[slot.id] = resolveSlot(slot.id, slot.posHint);
    }

    return {
        resolveSlot,
        slotSummary
    };
}

// Canonical mapping of pronoun matrix keys -> English surface forms & roles
const PERSONAL_ENGLISH_MAP = {
    '1st-S': { sub: ['i'], obj: ['me'], det: ['my'], pos: ['mine'], ref: ['myself'] },
    '1st-P': { sub: ['we'], obj: ['us'], det: ['our'], pos: ['ours'], ref: ['ourselves'] },
    '1st-C': { sub: ['we'], obj: ['us'], det: ['our'], pos: ['ours'], ref: ['ourselves'] },
    '1st-D': { sub: ['we'], obj: ['us'], det: ['our'], pos: ['ours'], ref: ['ourselves'] },
    '2nd-S': { sub: ['you'], obj: ['you'], det: ['your'], pos: ['yours'], ref: ['yourself'] },
    '2nd-P': { sub: ['you'], obj: ['you'], det: ['your'], pos: ['yours'], ref: ['yourselves'] },
    '2nd-C': { sub: ['you'], obj: ['you'], det: ['your'], pos: ['yours'], ref: ['yourselves'] },
    '2nd-D': { sub: ['you'], obj: ['you'], det: ['your'], pos: ['yours'], ref: ['yourselves'] },
    '3rd-S-Masc': { sub: ['he'], obj: ['him'], det: ['his'], pos: ['his'], ref: ['himself'] },
    '3rd-S-Fem': { sub: ['she'], obj: ['her'], det: ['her'], pos: ['hers'], ref: ['herself'] },
    '3rd-S-Neut': { sub: ['it'], obj: ['it'], det: ['its'], pos: ['its'], ref: ['itself'] },
    '3rd-S-Inan': { sub: ['it'], obj: ['it'], det: ['its'], pos: ['its'], ref: ['itself'] },
    '3rd-S-Anim': { sub: ['he', 'she', 'they'], obj: ['him', 'her', 'them'], det: ['his', 'her', 'their'], pos: ['his', 'hers', 'theirs'], ref: ['himself', 'herself'] },
    '3rd-S-General': { sub: ['he', 'she', 'it'], obj: ['him', 'her', 'it'], det: ['his', 'her', 'its'], pos: ['his', 'hers', 'its'], ref: ['himself', 'herself', 'itself'] },
    '3rd-P': { sub: ['they'], obj: ['them'], det: ['their'], pos: ['theirs'], ref: ['themselves'] },
    '3rd-C': { sub: ['they'], obj: ['them'], det: ['their'], pos: ['theirs'], ref: ['themselves'] },
    '3rd-D': { sub: ['they'], obj: ['them'], det: ['their'], pos: ['theirs'], ref: ['themselves'] },
    'Inan-S': { sub: ['it'], obj: ['it'], det: ['its'], pos: ['its'], ref: ['itself'] },
    'Inan-P': { sub: ['they'], obj: ['them'], det: ['their'], pos: ['theirs'], ref: ['themselves'] }
};

function getEnglishTokensForMatrixKey(person, number, gender, caseType) {
    if (person === 'Other') {
        const isPlur = number === 'P' || number === 'D' || number === 'C';
        if (caseType === 'dem') {
            if (gender === 'Near') return isPlur ? ['these'] : ['this'];
            if (gender === 'Far') return isPlur ? ['those'] : ['that'];
            return isPlur ? ['these', 'those'] : ['this', 'that'];
        }
        if (caseType === 'int') {
            if (gender === 'Anim') return ['who', 'whom'];
            if (gender === 'Inan') return ['what', 'which'];
            return ['who', 'whom', 'what', 'which'];
        }
        if (caseType === 'rel') {
            if (gender === 'Anim') return ['who', 'whom'];
            if (gender === 'Inan') return ['which'];
            return ['which', 'who'];
        }
        if (caseType === 'ind') {
            if (gender === 'Anim') return ['someone', 'somebody', 'anyone', 'anybody', 'everyone', 'everybody'];
            if (gender === 'Inan') return ['something', 'anything', 'everything'];
            return ['someone', 'something'];
        }
        return [];
    }

    const specific = PERSONAL_ENGLISH_MAP[`${person}-${number}-${gender}`];
    if (specific?.[caseType]) return specific[caseType];
    const base = PERSONAL_ENGLISH_MAP[`${person}-${number}`];
    if (base?.[caseType]) return base[caseType];
    return [];
}

function normalizePersonTag(person, number) {
    const rawP = String(person || '').toLowerCase().trim();
    const rawN = String(number || 'S').toUpperCase().trim();
    let p = '';
    if (rawP.startsWith('1')) p = '1';
    else if (rawP.startsWith('2')) p = '2';
    else if (rawP.startsWith('3') || rawP === 'inan') p = '3';
    else if (rawP.startsWith('4')) p = '4';
    const n = rawN.startsWith('P') || rawN === 'C' ? 'P' : rawN.startsWith('D') ? 'D' : 'S';
    return p ? `${p}${n}` : '';
}

/**
 * Extracts pronoun entries & verb person-agreement affixes directly from
 * Settings > Pronouns (pronounMatrixData + personRules).
 */
export function buildPronounSystem({
    personRulesArray = [],
    pronounMatrixData = {}
} = {}) {
    const byEnglishAndCase = new Map(); // `${eng}:${caseType}` -> [{ word, personTag, caseType, source }]
    const verbAgreementMap = new Map(); // `1S` -> [{ affix, freeForm, rule }]

    const registerPronoun = (engWord, caseType, entry) => {
        if (!engWord || !entry?.word) return;
        const key = `${engWord.toLowerCase()}:${caseType}`;
        if (!byEnglishAndCase.has(key)) byEnglishAndCase.set(key, []);
        const list = byEnglishAndCase.get(key);
        if (!list.some(x => x.word === entry.word)) {
            list.push(entry);
        }
    };

    const registerAgreement = (personTag, ruleObj) => {
        if (!personTag || (!ruleObj.affix && !ruleObj.freeForm)) return;
        if (!verbAgreementMap.has(personTag)) verbAgreementMap.set(personTag, []);
        verbAgreementMap.get(personTag).push(ruleObj);
    };

    // 1. From pronounMatrixData
    if (pronounMatrixData && typeof pronounMatrixData === 'object') {
        for (const [key, rawVal] of Object.entries(pronounMatrixData)) {
            const val = typeof rawVal === 'string' ? rawVal.trim() : '';
            if (!val) continue;
            const parts = key.split('-');
            if (parts[0] === 'Other' && parts.length >= 5) {
                const [, num, loc, anim, caseType] = parts;
                const prop = caseType === 'dem' ? loc : anim;
                const tokens = getEnglishTokensForMatrixKey('Other', num, prop, caseType);
                tokens.forEach(tok => registerPronoun(tok, caseType, {
                    word: val,
                    wordClass: 'Pronoun',
                    translation: tok,
                    personTag: '',
                    caseType,
                    source: 'pronounMatrix'
                }));
            } else if (parts.length >= 4) {
                const [person, number, gender, caseType] = parts;
                const personTag = normalizePersonTag(person, number);
                if (caseType === 'affix') {
                    registerAgreement(personTag, {
                        person,
                        number,
                        gender,
                        personTag,
                        affix: val,
                        freeForm: pronounMatrixData[`${person}-${number}-${gender}-sub`] || '',
                        name: `${personTag} (${gender})`
                    });
                } else {
                    const tokens = getEnglishTokensForMatrixKey(person, number, gender, caseType);
                    tokens.forEach(tok => registerPronoun(tok, caseType, {
                        word: val,
                        wordClass: 'Pronoun',
                        translation: tok,
                        personTag,
                        caseType,
                        gender,
                        source: 'pronounMatrix'
                    }));
                }
            }
        }
    }

    // 2. From personRulesArray
    if (Array.isArray(personRulesArray)) {
        for (const pr of personRulesArray) {
            if (!pr) continue;
            const personTag = normalizePersonTag(pr.person || pr.name, pr.number || (String(pr.person || '').toUpperCase().includes('P') ? 'P' : 'S'));
            if (pr.affix || pr.freeForm) {
                registerAgreement(personTag || pr.person || pr.name, {
                    ...pr,
                    personTag: personTag || pr.person || pr.name
                });
            }
            if (pr.freeForm) {
                const tokens = getEnglishTokensForMatrixKey(
                    pr.person || (personTag.startsWith('1') ? '1st' : personTag.startsWith('2') ? '2nd' : '3rd'),
                    pr.number || (personTag.endsWith('P') ? 'P' : 'S'),
                    pr.gender || 'General',
                    'sub'
                );
                tokens.forEach(tok => registerPronoun(tok, 'sub', {
                    word: pr.freeForm,
                    wordClass: 'Pronoun',
                    translation: tok,
                    personTag,
                    caseType: 'sub',
                    source: 'personRules'
                }));
            }
        }
    }

    const lookupMatrixPronoun = (engWord, expectedCase = null) => {
        const lower = (engWord || '').toLowerCase();
        const tryOrder = expectedCase
            ? [expectedCase, 'sub', 'obj', 'det', 'pos', 'ref', 'dem', 'int', 'rel', 'ind']
            : ['sub', 'obj', 'det', 'pos', 'ref', 'dem', 'int', 'rel', 'ind'];

        const allMatches = [];
        for (const c of tryOrder) {
            const list = byEnglishAndCase.get(`${lower}:${c}`);
            if (list && list.length > 0) {
                for (const item of list) {
                    if (!allMatches.some(m => m.word === item.word)) {
                        allMatches.push(item);
                    }
                }
            }
        }
        return allMatches;
    };

    const getAgreementForPerson = (personTag) => {
        if (!personTag) return null;
        const candidates = verbAgreementMap.get(personTag) || [];
        if (candidates.length === 0) return null;
        // Prefer an entry with an explicit verb affix
        return candidates.find(c => c.affix && c.affix.trim()) || candidates[0];
    };

    return {
        byEnglishAndCase,
        verbAgreementMap,
        lookupMatrixPronoun,
        getAgreementForPerson
    };
}

/**
 * Translates an Arabic integer token using Orthography > Numerals when configured.
 */
export function translateNumeralToken(rawToken, numberSystem = {}, numeralBase = 10) {
    if (!rawToken || !/^\d+$/.test(rawToken.trim())) return null;
    const num = Number(rawToken.trim());
    if (!Number.isFinite(num) || num < 0 || num > 1e12) return null;

    const ns = numberSystem || {};
    const hasConfiguredNumerals = Boolean(
        (num === 0 && ns.zero)
        || ns.irregulars?.[num]
        || (ns.digits && Object.values(ns.digits).some(v => v && String(v).trim()))
    );
    if (!hasConfiguredNumerals) return null;

    const atoms = buildNumeralAtoms(num, ns, numeralBase || 10);
    const word = numeralName(atoms, ns.settings || {});
    if (!word || /^\(\d+\)$/.test(word) || word.includes('[Base^')) return null;

    return {
        word,
        translation: rawToken,
        wordClass: 'Numeral',
        source: 'numerals'
    };
}

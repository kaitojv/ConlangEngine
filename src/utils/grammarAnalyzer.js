// src/utils/grammarAnalyzer.js
// Unified Conlang Translator & Word Assist Engine.
// Directly driven by Settings > Grammar, Pronoun Matrix, Particle System,
// Numeral System, Morphophonology, and Lexicon, plus actionable missing-data diagnostics.

import { applyRuleToWord } from './morphologyEngine.js';
import {
    rankLexiconMatches,
    buildMultiWordPhraseIndex,
    mergeMultiWordPhrases
} from './wordAssist/lexiconLookup.js';
import {
    extractCoreOrderLabel,
    reorderClauseBreakdown
} from './wordAssist/syntaxOrdering.js';
import {
    splitSentenceIntoSegments,
    AUX_VERBS
} from './wordAssist/clauseSegmentation.js';
import {
    PREPOSITION_TO_CASE_MAP,
    SLOT_BY_ID,
    resolveTranslatorSettings,
    buildGrammaticalResolver,
    buildPronounSystem,
    translateNumeralToken
} from './wordAssist/configResolver.js';
import {
    auditLanguageReadiness,
    collectSentenceDiagnostics
} from './wordAssist/diagnosticsEngine.js';

let storeGetter = null;
import('../store/useConfigStore.jsx').then(m => {
    storeGetter = m.useConfigStore;
}).catch(() => {
    // Node test runner environment fallback
});

export const MODAL_VERBS = new Set([
    'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must',
    'ought to', 'used to', 'dare', 'need', 'have to', 'has to', 'had to'
]);

export const NEGATIVE_WORDS = new Set([
    'not', 'no', 'never', 'nothing', 'none', 'neither', 'nor', 'nobody', 'nowhere'
]);

export const NEGATIVE_CONTRACTIONS = {
    "don't": ['do', 'not'],
    "doesn't": ['does', 'not'],
    "didn't": ['did', 'not'],
    "won't": ['will', 'not'],
    "wouldn't": ['would', 'not'],
    "can't": ['can', 'not'],
    "cannot": ['can', 'not'],
    "couldn't": ['could', 'not'],
    "shouldn't": ['should', 'not'],
    "mustn't": ['must', 'not'],
    "isn't": ['is', 'not'],
    "aren't": ['are', 'not'],
    "wasn't": ['was', 'not'],
    "weren't": ['were', 'not'],
    "haven't": ['have', 'not'],
    "hasn't": ['has', 'not'],
    "hadn't": ['had', 'not'],
    "didn’t": ['did', 'not'],
    "don’t": ['do', 'not'],
    "doesn’t": ['does', 'not'],
    "won’t": ['will', 'not'],
    "wouldn’t": ['would', 'not'],
    "can’t": ['can', 'not'],
    "isn’t": ['is', 'not'],
    "aren’t": ['are', 'not'],
    "wasn’t": ['was', 'not'],
    "weren’t": ['were', 'not']
};

export const ING_NOUNS = new Set([
    'king', 'ring', 'wing', 'thing', 'spring', 'string', 'sing', 'bring',
    'morning', 'evening', 'building', 'painting', 'feeling', 'meaning', 'wedding', 'meeting',
    'ceiling', 'beginning', 'ending', 'clothing', 'lightning', 'being', 'living', 'writing'
]);

export const ING_ADJECTIVES = new Set([
    'interesting', 'amazing', 'boring', 'exciting', 'surprising', 'tired', 'loving',
    'willing', 'living', 'missing', 'growing', 'burning', 'shining', 'flying', 'running'
]);

export const VERB_3SG = new Set([
    'is', 'was', 'has', 'does', 'goes', 'says', 'makes', 'takes', 'comes', 'sees',
    'knows', 'gets', 'gives', 'finds', 'thinks', 'tells', 'wants', 'needs', 'likes',
    'loves', 'eats', 'drinks', 'sleeps', 'runs', 'walks', 'speaks', 'writes', 'reads'
]);

export const S_NOUNS_SING = new Set([
    'bus', 'gas', 'glass', 'grass', 'class', 'pass', 'mass', 'boss', 'loss', 'cross',
    'dress', 'kiss', 'miss', 'lens', 'news', 'series', 'species', 'chaos', 'cosmos',
    'cactus', 'focus', 'bonus', 'virus', 'status', 'campus', 'genius', 'plus', 'minus',
    'always', 'perhaps', 'sometimes', 'yes', 'this', 'his', 'its', 'us', 'as', 'is', 'was', 'has', 'does'
]);

export const ER_BLOCKLIST = new Set([
    'water', 'father', 'mother', 'brother', 'sister', 'daughter', 'master', 'teacher',
    'worker', 'player', 'writer', 'reader', 'singer', 'dancer', 'driver', 'runner',
    'farmer', 'hunter', 'leader', 'ruler', 'maker', 'baker', 'fisher', 'soldier',
    'river', 'silver', 'copper', 'paper', 'butter', 'sugar', 'pepper', 'winter', 'summer',
    'flower', 'tower', 'power', 'letter', 'matter', 'number', 'member', 'center', 'corner',
    'order', 'border', 'murder', 'wonder', 'thunder', 'hunger', 'anger', 'danger',
    'finger', 'shoulder', 'monster', 'disaster', 'whisper', 'answer', 'feather', 'weather',
    'leather', 'other', 'another', 'either', 'neither', 'together', 'forever', 'over', 'under',
    'after', 'ever', 'never', 'better', 'clever', 'proper', 'bitter', 'sober', 'eager', 'inner', 'outer', 'upper'
]);

export const EST_BLOCKLIST = new Set([
    'best', 'rest', 'test', 'west', 'east', 'nest', 'chest', 'guest', 'quest', 'forest',
    'harvest', 'honest', 'modest', 'interest', 'contest', 'protest', 'suggest', 'request',
    'arrest', 'invest', 'priest', 'feast', 'beast', 'least', 'first', 'last', 'past', 'fast', 'vast', 'just', 'must', 'trust', 'dust', 'rust'
]);

export const ED_ADJECTIVES = new Set([
    'red', 'tired', 'excited', 'bored', 'interested', 'surprised', 'scared', 'afraid',
    'worried', 'pleased', 'satisfied', 'confused', 'amazed', 'annoyed', 'married',
    'wicked', 'sacred', 'naked', 'blessed', 'cursed', 'beloved', 'aged', 'learned',
    'crowded', 'dead', 'good', 'bad', 'sad', 'glad', 'mad', 'cold', 'old', 'bold', 'gold', 'wild', 'mild', 'loud', 'proud', 'hard', 'kind', 'blind', 'round', 'sound', 'grand'
]);

export const DITRANSITIVE_VERBS = new Set([
    'give', 'send', 'show', 'tell', 'teach', 'offer', 'bring', 'lend', 'pass', 'hand', 'grant', 'sell', 'buy', 'make', 'write', 'read'
]);

export const COMPARATIVE_IRREGULAR = {
    'better': { base: 'good', degree: 'comparative' },
    'best': { base: 'good', degree: 'superlative' },
    'worse': { base: 'bad', degree: 'comparative' },
    'worst': { base: 'bad', degree: 'superlative' },
    'farther': { base: 'far', degree: 'comparative' },
    'further': { base: 'far', degree: 'comparative' },
    'farthest': { base: 'far', degree: 'superlative' },
    'furthest': { base: 'far', degree: 'superlative' },
    'elder': { base: 'old', degree: 'comparative' },
    'eldest': { base: 'old', degree: 'superlative' }
};

export const IRREGULAR_VERBS = {
    'was': { base: 'be', tense: 'past', personHint: '3S' },
    'were': { base: 'be', tense: 'past' },
    'been': { base: 'be', tense: 'perfect' },
    'am': { base: 'be', tense: 'present', personHint: '1S' },
    'is': { base: 'be', tense: 'present', personHint: '3S' },
    'are': { base: 'be', tense: 'present' },
    'had': { base: 'have', tense: 'past' },
    'has': { base: 'have', tense: 'present', personHint: '3S' },
    'did': { base: 'do', tense: 'past' },
    'does': { base: 'do', tense: 'present', personHint: '3S' },
    'done': { base: 'do', tense: 'perfect' },
    'went': { base: 'go', tense: 'past' },
    'gone': { base: 'go', tense: 'perfect' },
    'ate': { base: 'eat', tense: 'past' },
    'eaten': { base: 'eat', tense: 'perfect' },
    'drank': { base: 'drink', tense: 'past' },
    'drunk': { base: 'drink', tense: 'perfect' },
    'saw': { base: 'see', tense: 'past' },
    'seen': { base: 'see', tense: 'perfect' },
    'made': { base: 'make', tense: 'past' },
    'came': { base: 'come', tense: 'past' },
    'took': { base: 'take', tense: 'past' },
    'taken': { base: 'take', tense: 'perfect' },
    'gave': { base: 'give', tense: 'past' },
    'given': { base: 'give', tense: 'perfect' },
    'got': { base: 'get', tense: 'past' },
    'gotten': { base: 'get', tense: 'perfect' },
    'knew': { base: 'know', tense: 'past' },
    'known': { base: 'know', tense: 'perfect' },
    'thought': { base: 'think', tense: 'past' },
    'said': { base: 'say', tense: 'past' },
    'told': { base: 'tell', tense: 'past' },
    'found': { base: 'find', tense: 'past' },
    'felt': { base: 'feel', tense: 'past' },
    'left': { base: 'leave', tense: 'past' },
    'brought': { base: 'bring', tense: 'past' },
    'bought': { base: 'buy', tense: 'past' },
    'caught': { base: 'catch', tense: 'past' },
    'taught': { base: 'teach', tense: 'past' },
    'fought': { base: 'fight', tense: 'past' },
    'sought': { base: 'seek', tense: 'past' },
    'slept': { base: 'sleep', tense: 'past' },
    'kept': { base: 'keep', tense: 'past' },
    'met': { base: 'meet', tense: 'past' },
    'sat': { base: 'sit', tense: 'past' },
    'stood': { base: 'stand', tense: 'past' },
    'understood': { base: 'understand', tense: 'past' },
    'spoke': { base: 'speak', tense: 'past' },
    'spoken': { base: 'speak', tense: 'perfect' },
    'broke': { base: 'break', tense: 'past' },
    'broken': { base: 'break', tense: 'perfect' },
    'chose': { base: 'choose', tense: 'past' },
    'chosen': { base: 'choose', tense: 'perfect' },
    'wrote': { base: 'write', tense: 'past' },
    'written': { base: 'write', tense: 'perfect' },
    'drove': { base: 'drive', tense: 'past' },
    'driven': { base: 'drive', tense: 'perfect' },
    'rode': { base: 'ride', tense: 'past' },
    'ridden': { base: 'ride', tense: 'perfect' },
    'rose': { base: 'rise', tense: 'past' },
    'risen': { base: 'rise', tense: 'perfect' },
    'woke': { base: 'wake', tense: 'past' },
    'woken': { base: 'wake', tense: 'perfect' },
    'wore': { base: 'wear', tense: 'past' },
    'worn': { base: 'wear', tense: 'perfect' },
    'flew': { base: 'fly', tense: 'past' },
    'flown': { base: 'fly', tense: 'perfect' },
    'grew': { base: 'grow', tense: 'past' },
    'grown': { base: 'grow', tense: 'perfect' },
    'threw': { base: 'throw', tense: 'past' },
    'thrown': { base: 'throw', tense: 'perfect' },
    'drew': { base: 'draw', tense: 'past' },
    'drawn': { base: 'draw', tense: 'perfect' },
    'fell': { base: 'fall', tense: 'past' },
    'fallen': { base: 'fall', tense: 'perfect' },
    'held': { base: 'hold', tense: 'past' },
    'ran': { base: 'run', tense: 'past' },
    'swam': { base: 'swim', tense: 'past' },
    'swum': { base: 'swim', tense: 'perfect' },
    'sang': { base: 'sing', tense: 'past' },
    'sung': { base: 'sing', tense: 'perfect' },
    'began': { base: 'begin', tense: 'past' },
    'begun': { base: 'begin', tense: 'perfect' },
    'won': { base: 'win', tense: 'past' },
    'lost': { base: 'lose', tense: 'past' },
    'sent': { base: 'send', tense: 'past' },
    'spent': { base: 'spend', tense: 'past' },
    'built': { base: 'build', tense: 'past' },
    'heard': { base: 'hear', tense: 'past' },
    'read': { base: 'read', tense: 'present' },
    'cut': { base: 'cut', tense: 'present' },
    'put': { base: 'put', tense: 'present' }
};

export const PRONOUN_MAP = {
    'i': { personTag: '1S', caseType: 'sub', isPlural: false },
    'me': { personTag: '1S', caseType: 'obj', isPlural: false },
    'my': { personTag: '1S', caseType: 'det', isPlural: false, isPossessive: true },
    'mine': { personTag: '1S', caseType: 'pos', isPlural: false, isPossessive: true },
    'myself': { personTag: '1S', caseType: 'ref', isPlural: false },
    'we': { personTag: '1P', caseType: 'sub', isPlural: true },
    'us': { personTag: '1P', caseType: 'obj', isPlural: true },
    'our': { personTag: '1P', caseType: 'det', isPlural: true, isPossessive: true },
    'ours': { personTag: '1P', caseType: 'pos', isPlural: true, isPossessive: true },
    'ourselves': { personTag: '1P', caseType: 'ref', isPlural: true },
    'you': { personTag: '2S', caseType: 'sub', isPlural: false },
    'your': { personTag: '2S', caseType: 'det', isPlural: false, isPossessive: true },
    'yours': { personTag: '2S', caseType: 'pos', isPlural: false, isPossessive: true },
    'yourself': { personTag: '2S', caseType: 'ref', isPlural: false },
    'yourselves': { personTag: '2P', caseType: 'ref', isPlural: true },
    'he': { personTag: '3S', caseType: 'sub', isPlural: false },
    'him': { personTag: '3S', caseType: 'obj', isPlural: false },
    'his': { personTag: '3S', caseType: 'det', isPlural: false, isPossessive: true },
    'himself': { personTag: '3S', caseType: 'ref', isPlural: false },
    'she': { personTag: '3S', caseType: 'sub', isPlural: false },
    'her': { personTag: '3S', caseType: 'obj', isPlural: false },
    'hers': { personTag: '3S', caseType: 'pos', isPlural: false, isPossessive: true },
    'herself': { personTag: '3S', caseType: 'ref', isPlural: false },
    'it': { personTag: '3S', caseType: 'sub', isPlural: false },
    'its': { personTag: '3S', caseType: 'det', isPlural: false, isPossessive: true },
    'itself': { personTag: '3S', caseType: 'ref', isPlural: false },
    'they': { personTag: '3P', caseType: 'sub', isPlural: true },
    'them': { personTag: '3P', caseType: 'obj', isPlural: true },
    'their': { personTag: '3P', caseType: 'det', isPlural: true, isPossessive: true },
    'theirs': { personTag: '3P', caseType: 'pos', isPlural: true, isPossessive: true },
    'themselves': { personTag: '3P', caseType: 'ref', isPlural: true },
    'this': { personTag: '3S', caseType: 'dem', isPlural: false },
    'that': { personTag: '3S', caseType: 'dem', isPlural: false },
    'these': { personTag: '3P', caseType: 'dem', isPlural: true },
    'those': { personTag: '3P', caseType: 'dem', isPlural: true }
};

export const GRAMMAR_RULE_IMPORT_MAP = [
    { key: 'accusative', names: ['accusative', 'acc', 'direct object'] },
    { key: 'ergative', names: ['ergative', 'erg'] },
    { key: 'genitive', names: ['genitive', 'gen', 'possessive'] },
    { key: 'dative', names: ['dative', 'dat', 'indirect object'] },
    { key: 'plural', names: ['plural', 'pl'] },
    { key: 'past', names: ['past', 'pst', 'preterite'] },
    { key: 'future', names: ['future', 'fut'] },
    { key: 'negation', names: ['negation', 'neg', 'negative'] }
];

export const TYPE_COLORS = {
    direct: 'var(--acc)',
    pronoun: '#10b981',
    inflected: '#f59e0b',
    'grammar-case': '#3b82f6',
    'grammar-tense': '#f59e0b',
    'grammar-number': '#06b6d4',
    particle: '#8b5cf6',
    numeral: '#14b8a6',
    missing: '#ef4444'
};

export const TYPE_LABELS = {
    direct: 'lexicon',
    pronoun: 'pronoun',
    inflected: 'conjugated',
    'grammar-case': 'case',
    'grammar-tense': 'tense',
    'grammar-number': 'number',
    particle: 'particle',
    numeral: 'numeral',
    missing: 'missing'
};

export const PREPOSITION_CASE_MAP = PREPOSITION_TO_CASE_MAP;

const ARTICLES = new Set(['the', 'a', 'an']);
const WH_WORDS = new Set(['who', 'whom', 'whose', 'what', 'which', 'where', 'when', 'why', 'how']);
const COORDINATORS = new Set(['and', 'but', 'or', 'because', 'if', 'although', 'though', 'while', 'since', 'yet', 'so', 'then', 'that']);
const TIME_ADVERBS = new Set(['yesterday', 'today', 'tomorrow', 'now', 'soon', 'always', 'never', 'often', 'sometimes', 'already', 'still', 'later', 'earlier', 'recently', 'tonight']);
const MANNER_ADVERBS_COMMON = new Set(['very', 'quickly', 'slowly', 'well', 'fast', 'hard', 'early', 'late', 'together', 'alone', 'here', 'there', 'everywhere', 'almost', 'even', 'just', 'only', 'also', 'too', 'really', 'extremely', 'much']);
const COPULA_VERBS = new Set(['be', 'am', 'is', 'are', 'was', 'were', 'been', 'being']);
const PREPOSITIONS = new Set([
    ...Object.keys(PREPOSITION_TO_CASE_MAP),
    'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around',
    'before', 'behind', 'below', 'beneath', 'beside', 'between', 'beyond',
    'during', 'except', 'outside', 'over', 'past', 'through', 'until', 'without', 'than'
]);

const IRREGULAR_PLURALS = {
    'men': 'man', 'women': 'woman', 'children': 'child', 'people': 'person',
    'feet': 'foot', 'teeth': 'tooth', 'mice': 'mouse', 'geese': 'goose',
    'wolves': 'wolf', 'knives': 'knife', 'leaves': 'leaf', 'lives': 'life',
    'wives': 'wife', 'elves': 'elf', 'halves': 'half', 'thieves': 'thief',
    'cities': 'city', 'countries': 'country', 'stories': 'story', 'babies': 'baby',
    'bodies': 'body', 'families': 'family', 'ladies': 'lady', 'parties': 'party',
    'boxes': 'box', 'dishes': 'dish', 'watches': 'watch', 'buses': 'bus', 'classes': 'class'
};

const NON_COUNT_PLURALS = new Set(['news', 'water', 'air', 'fire', 'earth', 'sun', 'moon', 'physics', 'mathematics', 'series', 'species']);

export function createGrammarAnalyzer(configOptions = {}) {
    const storeState = storeGetter ? storeGetter.getState() : {};
    const mergedOptions = {
        ...storeState,
        ...configOptions
    };

    const lexicon = Array.isArray(mergedOptions.lexicon) ? mergedOptions.lexicon : [];
    const grammarRules = Array.isArray(mergedOptions.grammarRules) ? mergedOptions.grammarRules : [];
    const personRulesArray = Array.isArray(mergedOptions.personRulesArray)
        ? mergedOptions.personRulesArray
        : (Array.isArray(mergedOptions.personRules) ? mergedOptions.personRules : []);
    const pronounMatrixData = mergedOptions.pronounMatrixData || {};
    const particleDatabase = Array.isArray(mergedOptions.particleDatabase) ? mergedOptions.particleDatabase : [];
    const usesParticles = Boolean(mergedOptions.usesParticles);
    const numberSystem = mergedOptions.numberSystem || {};
    const numeralBase = mergedOptions.numeralBase || 10;
    const vowels = mergedOptions.vowels || '';
    const consonants = mergedOptions.consonants || '';
    const otherPhonemes = mergedOptions.otherPhonemes || '';
    const verbMarker = (mergedOptions.verbMarker || '').trim();
    const transliterate = typeof mergedOptions.transliterate === 'function' ? mergedOptions.transliterate : (s => s);
    const normalizeToBase = typeof mergedOptions.normalizeToBase === 'function' ? mergedOptions.normalizeToBase : (s => s);

    const baseSettings = resolveTranslatorSettings(mergedOptions);
    const baseResolver = buildGrammaticalResolver({
        grammarRules,
        particleDatabase,
        usesParticles,
        settings: baseSettings
    });
    const pronounSystem = buildPronounSystem({
        personRulesArray,
        pronounMatrixData
    });

    const multiWordIndex = buildMultiWordPhraseIndex(lexicon);

    // Pre-index standalone particles from particleDatabase by English meaning
    const particleByEnglish = new Map();
    for (const ptcl of particleDatabase) {
        if (!ptcl || !ptcl.surface) continue;
        const senses = Array.isArray(ptcl.senses) && ptcl.senses.length > 0
            ? ptcl.senses
            : [];
        for (const sense of senses) {
            const rawMeaning = (sense.meaning || '').toLowerCase();
            const meanings = rawMeaning.split(/[,;/]+/).map(s => s.trim()).filter(Boolean);
            for (const m of meanings) {
                if (!particleByEnglish.has(m)) particleByEnglish.set(m, []);
                particleByEnglish.get(m).push({
                    word: ptcl.surface,
                    translation: sense.meaning,
                    wordClass: 'Particle',
                    contextPOS: sense.contextPOS || 'any',
                    position: ptcl.position || 'standalone',
                    gloss: sense.gloss || '',
                    source: 'particleDatabase',
                    particle: ptcl
                });
            }
        }
    }

    const lemmatize = (word, hintPOS = null) => {
        if (!word) return '';
        const lower = word.toLowerCase().trim();
        if (!lower) return '';

        if (COMPARATIVE_IRREGULAR[lower]) return COMPARATIVE_IRREGULAR[lower].base;
        if (IRREGULAR_VERBS[lower]) return IRREGULAR_VERBS[lower].base;
        if (IRREGULAR_PLURALS[lower]) return IRREGULAR_PLURALS[lower];

        if (hintPOS === 'Adjective') {
            if (lower.endsWith('ier') && lower.length > 4 && !ER_BLOCKLIST.has(lower)) return `${lower.slice(0, -3)}y`;
            if (lower.endsWith('er') && lower.length > 4 && !ER_BLOCKLIST.has(lower)) {
                const stem = lower.slice(0, -2);
                if (stem.length >= 3 && stem[stem.length - 1] === stem[stem.length - 2]) return stem.slice(0, -1);
                return stem;
            }
            if (lower.endsWith('iest') && lower.length > 5 && !EST_BLOCKLIST.has(lower)) return `${lower.slice(0, -4)}y`;
            if (lower.endsWith('est') && lower.length > 5 && !EST_BLOCKLIST.has(lower)) return lower.slice(0, -3);
        }

        if (lower.endsWith('ies') && lower.length > 4) return `${lower.slice(0, -3)}y`;
        if (lower.endsWith('ied') && lower.length > 4) return `${lower.slice(0, -3)}y`;
        if (lower.endsWith('ing') && lower.length > 5 && !ING_NOUNS.has(lower) && !ING_ADJECTIVES.has(lower)) {
            const stem = lower.slice(0, -3);
            if (stem.length >= 3 && stem[stem.length - 1] === stem[stem.length - 2]) return stem.slice(0, -1);
            return stem;
        }
        if (lower.endsWith('ed') && lower.length > 4 && !ED_ADJECTIVES.has(lower)) {
            const stem = lower.slice(0, -2);
            if (stem.length >= 3 && stem[stem.length - 1] === stem[stem.length - 2]) return stem.slice(0, -1);
            return stem;
        }
        if (lower.endsWith('es') && lower.length > 4 && !S_NOUNS_SING.has(lower)) {
            if (/(sh|ch|x|z|s)es$/.test(lower)) return lower.slice(0, -2);
            return lower.slice(0, -1);
        }
        if (lower.endsWith('s') && lower.length > 2 && !S_NOUNS_SING.has(lower) && !lower.endsWith('ss')) {
            return lower.slice(0, -1);
        }
        return lower;
    };

    const getRoleFromWordClass = (wc) => {
        if (!wc) return null;
        const p = String(wc).toLowerCase();
        if (p.includes('verb') || p.includes('aux')) return 'V';
        if (p.includes('adj')) return 'J';
        if (p.includes('adv')) return 'M';
        if (p.includes('prep') || p.includes('post') || p.includes('adpos')) return 'P';
        if (p.includes('conj') || p.includes('part')) return 'C';
        if (p.includes('interrog') || p.includes('question')) return 'Q';
        if (p.includes('pron')) return 'Pronoun';
        if (p.includes('noun')) return 'N';
        return null;
    };

    const matchesPos = (wc, targetRole) => {
        if (!wc || !targetRole) return true;
        const parts = String(wc).split(/[,/|]+/).map(s => s.trim()).filter(Boolean);
        return parts.some(part => {
            const role = getRoleFromWordClass(part);
            if (!role) return false;
            if (targetRole === 'S' || targetRole === 'O' || targetRole === 'D' || targetRole === 'L' || targetRole === 'G') {
                return role === 'N' || role === 'Pronoun';
            }
            return role === targetRole;
        });
    };

    const posToPreferredRole = (posHint) => getRoleFromWordClass(posHint);

    const matchesTranslation = (entry, query) => {
        if (!entry || !query) return false;
        const ranked = rankLexiconMatches([entry], query, { normalizeToBase, matchesPos, getRoleFromWordClass });
        return ranked.length > 0;
    };

    const findGrammarRule = (slotIdOrName, targetPOS = null, customResolver = baseResolver) => {
        if (!slotIdOrName) return null;
        const lower = String(slotIdOrName).toLowerCase().trim();
        if (SLOT_BY_ID[lower]) {
            const resolved = customResolver.resolveSlot(lower, targetPOS);
            return resolved?.rule || null;
        }
        return grammarRules.find(r =>
            (r.name || '').toLowerCase() === lower || (r.gloss || '').toLowerCase() === lower
        ) || null;
    };

    const findRankedLexiconCandidates = (queryWord, posHint = null, contextInfo = {}) => {
        if (!queryWord) return [];
        const cleanQuery = queryWord.toLowerCase().trim();
        const results = [];
        const seenWords = new Set();

        const pushCandidate = (cand) => {
            if (!cand || !cand.word) return;
            const normKey = `${cand.word.toLowerCase()}::${(cand.wordClass || '').toLowerCase()}`;
            if (seenWords.has(normKey)) return;
            seenWords.add(normKey);
            results.push(cand);
        };

        // 1. Pronoun Matrix entries (scored just below explicit overrides; legacy personRules.freeForm scored below lexicon)
        if (contextInfo.expectedPronounCase || PRONOUN_MAP[cleanQuery] || posHint === 'Pronoun') {
            const pMatches = pronounSystem.lookupMatrixPronoun(cleanQuery, contextInfo.expectedPronounCase);
            for (const pm of pMatches) {
                pushCandidate({
                    id: `matrix:${cleanQuery}:${pm.caseType}`,
                    word: pm.word,
                    translation: pm.translation,
                    wordClass: 'Pronoun',
                    personTag: pm.personTag,
                    matrixCaseType: pm.caseType,
                    source: pm.source,
                    _score: pm.source === 'pronounMatrix' ? 145 : 115
                });
            }
        }

        // 2. Particles Database match (prioritized if usesParticles or functional POS)
        const pCandidates = particleByEnglish.get(cleanQuery) || [];
        for (const pc of pCandidates) {
            pushCandidate({
                id: pc.particle?.id || `ptcl:${pc.word}`,
                word: pc.word,
                translation: pc.translation,
                wordClass: 'Particle',
                particle: pc.particle,
                source: 'particleDatabase',
                _score: usesParticles ? 135 : 85
            });
        }

        // 3. Numeral conversion for integer tokens
        if (/^\d+$/.test(cleanQuery)) {
            const numCand = translateNumeralToken(cleanQuery, numberSystem, numeralBase);
            if (numCand) {
                pushCandidate({
                    id: `num:${cleanQuery}`,
                    word: numCand.word,
                    translation: cleanQuery,
                    wordClass: 'Numeral',
                    source: 'numerals',
                    _score: 150
                });
            }
        }

        // 4. Ranked Lexicon lookup (trying original + lemmatized forms)
        const candidateQueries = [cleanQuery];
        const lemma = lemmatize(cleanQuery, posHint);
        if (lemma && lemma !== cleanQuery) candidateQueries.push(lemma);

        // Also handle irregular verbs or stripped -e stem recovery (e.g. "loved" -> "love", "making" -> "make")
        if (cleanQuery.endsWith('ed') && cleanQuery.length > 4) {
            const withE = `${cleanQuery.slice(0, -1)}`;
            if (!candidateQueries.includes(withE)) candidateQueries.push(withE);
        }
        if (cleanQuery.endsWith('ing') && cleanQuery.length > 5) {
            const withE = `${cleanQuery.slice(0, -3)}e`;
            if (!candidateQueries.includes(withE)) candidateQueries.push(withE);
        }
        if ((posHint === 'Adjective' || !posHint) && cleanQuery.endsWith('er') && !ER_BLOCKLIST.has(cleanQuery)) {
            const withE = cleanQuery.slice(0, -1);
            if (!candidateQueries.includes(withE)) candidateQueries.push(withE);
        }
        if ((posHint === 'Adjective' || !posHint) && cleanQuery.endsWith('est') && !EST_BLOCKLIST.has(cleanQuery)) {
            const withE = cleanQuery.slice(0, -2);
            if (!candidateQueries.includes(withE)) candidateQueries.push(withE);
        }

        const lexRanked = [];
        const preferredRole = posToPreferredRole(posHint);
        const normQuery = normalizeToBase(cleanQuery).toLowerCase();

        // Direct Conlang word match (e.g., user mixes conlang root directly in input sentence)
        for (const entry of lexicon) {
            if (!entry?.word) continue;
            const entryLow = entry.word.toLowerCase();
            const entryNorm = normalizeToBase(entry.word).toLowerCase();
            if (entryLow === cleanQuery || entryNorm === normQuery) {
                const entryRole = posToPreferredRole(entry.wordClass);
                const roleBonus = preferredRole && entryRole === preferredRole ? 420 : 200;
                lexRanked.push({
                    ...entry,
                    _score: 400 + roleBonus,
                    source: 'lexicon'
                });
            }
        }

        for (let qIdx = 0; qIdx < candidateQueries.length; qIdx++) {
            const q = candidateQueries[qIdx];
            const matches = rankLexiconMatches(lexicon, q, {
                preferredRole,
                matchesPos,
                getRoleFromWordClass,
                normalizeToBase,
                isLemmaFallback: qIdx > 0
            });
            for (const m of matches) {
                const entry = m.entry || m;
                lexRanked.push({
                    ...entry,
                    _score: (m.score || 100) - qIdx * 12,
                    source: 'lexicon'
                });
            }
        }

        lexRanked.sort((a, b) => (b._score || 0) - (a._score || 0));
        // Interleave with any Matrix/Particle candidates by score
        const combinedPre = [...results, ...lexRanked].sort((a, b) => (b._score || 0) - (a._score || 0));
        results.length = 0;
        seenWords.clear();
        for (const item of combinedPre) {
            pushCandidate(item);
        }

        return results;
    };

    const applyAffixSafely = (currentWord, slotMatch, allRules, entry = null, personTag = '') => {
        if (!currentWord || !slotMatch) return { word: currentWord, particleToken: null, appliedName: null };

        if (slotMatch.kind === 'particle') {
            const ptclSurface = slotMatch.particle?.surface?.trim();
            if (!ptclSurface) return { word: currentWord, particleToken: null, appliedName: null };
            const pos = slotMatch.particle?.position || 'before';
            return {
                word: currentWord,
                particleToken: { surface: ptclSurface, position: pos, gloss: SLOT_BY_ID[slotMatch.slotId]?.defaultGloss || slotMatch.slotId.toUpperCase() },
                appliedName: `${SLOT_BY_ID[slotMatch.slotId]?.defaultGloss || slotMatch.slotId}: ${ptclSurface}`
            };
        }

        const rule = slotMatch.rule;
        if (!rule) return { word: currentWord, particleToken: null, appliedName: null };

        // Check manual Lexicon Conjugation Matrix overrides (e.g. BASE_Past or 1S_Past)
        if (entry?.inflectionOverrides && rule.name) {
            const overrideKeys = [
                personTag ? `${personTag}_${rule.name}` : null,
                personTag ? `${personTag}_${rule.name}_affix` : null,
                `BASE_${rule.name}`,
                `BASE_${rule.name}_affix`
            ].filter(Boolean);

            for (const k of overrideKeys) {
                const val = entry.inflectionOverrides[k];
                if (val && typeof val === 'string' && val.trim()) {
                    return {
                        word: val.trim(),
                        particleToken: null,
                        appliedName: `${rule.gloss || rule.name} (override)`
                    };
                }
            }
        }

        const rawAffix = (rule.affix || '').trim();
        if (!rawAffix) return { word: currentWord, particleToken: null, appliedName: null };

        // Standalone word rule without hyphens -> independent particle rather than fused affix
        if (rule.standalone && !rawAffix.startsWith('-') && !rawAffix.endsWith('-') && !rawAffix.includes('=>')) {
            return {
                word: currentWord,
                particleToken: { surface: rawAffix, position: 'before', gloss: rule.gloss || rule.name },
                appliedName: `${rule.gloss || rule.name}: ${rawAffix}`
            };
        }

        // Prevent accidental duplicate application of identical simple affix
        const cleanAffix = rawAffix.replace(/^-|-$/g, '');
        if (cleanAffix && !rawAffix.includes('=>') && !rule.condition) {
            if (rawAffix.endsWith('-') && !rawAffix.startsWith('-')) {
                if (currentWord.toLowerCase().startsWith(cleanAffix.toLowerCase())) {
                    return { word: currentWord, particleToken: null, appliedName: null };
                }
            } else if (rawAffix.startsWith('-') && !rawAffix.endsWith('-')) {
                if (currentWord.toLowerCase().endsWith(cleanAffix.toLowerCase())) {
                    return { word: currentWord, particleToken: null, appliedName: null };
                }
            }
        }

        const inflected = applyRuleToWord(
            currentWord,
            rule,
            allRules,
            vowels,
            consonants,
            otherPhonemes
        );

        return {
            word: inflected || currentWord,
            particleToken: null,
            appliedName: `${rule.gloss || rule.name}${rawAffix ? ` (${rawAffix})` : ''}`
        };
    };

    const reorderBreakdown = (tokens, customOrderOrOpts) => reorderClauseBreakdown(tokens, customOrderOrOpts);

    /**
     * Expand English contractions into clean syntax tokens while retaining character spans.
     */
    const tokenizeClause = (segmentText) => {
        const rawMatches = [];
        const regex = /([A-Za-z0-9'’]+|[.,!?;:]+)/g;
        let m;
        while ((m = regex.exec(segmentText)) !== null) {
            rawMatches.push({
                raw: m[0],
                start: m.index,
                end: m.index + m[0].length
            });
        }

        const expanded = [];
        for (const item of rawMatches) {
            const raw = item.raw;
            if (/^[.,!?;:]+$/.test(raw)) continue;

            const lower = raw.toLowerCase();
            if (NEGATIVE_CONTRACTIONS[lower]) {
                const [aux, neg] = NEGATIVE_CONTRACTIONS[lower];
                expanded.push({ raw: aux, lower: aux, sourceRaw: raw });
                expanded.push({ raw: neg, lower: neg, sourceRaw: raw, fromNegContraction: true });
                continue;
            }

            // Handle 're, 'm, 've, 'll, 'd
            if (/^(.+)['’]re$/i.test(lower)) {
                const stem = raw.slice(0, -3);
                expanded.push({ raw: stem, lower: stem.toLowerCase(), sourceRaw: raw });
                expanded.push({ raw: 'are', lower: 'are', sourceRaw: raw });
                continue;
            }
            if (/^i['’]m$/i.test(lower)) {
                expanded.push({ raw: 'I', lower: 'i', sourceRaw: raw });
                expanded.push({ raw: 'am', lower: 'am', sourceRaw: raw });
                continue;
            }
            if (/^(.+)['’]ll$/i.test(lower)) {
                const stem = raw.slice(0, -3);
                expanded.push({ raw: stem, lower: stem.toLowerCase(), sourceRaw: raw });
                expanded.push({ raw: 'will', lower: 'will', sourceRaw: raw });
                continue;
            }
            if (/^(.+)['’]ve$/i.test(lower)) {
                const stem = raw.slice(0, -3);
                expanded.push({ raw: stem, lower: stem.toLowerCase(), sourceRaw: raw });
                expanded.push({ raw: 'have', lower: 'have', sourceRaw: raw });
                continue;
            }
            if (/^(.+)['’]s$/i.test(lower) && !['it\'s', 'it’s', 'he\'s', 'he’s', 'she\'s', 'she’s', 'what\'s', 'what’s', 'that\'s', 'that’s', 'who\'s', 'who’s', 'there\'s', 'there’s'].includes(lower)) {
                expanded.push({ raw: raw.slice(0, -2), lower: lower.slice(0, -2), sourceRaw: raw, isGenitivePossessor: true });
                continue;
            }
            if (['it\'s', 'it’s', 'he\'s', 'he’s', 'she\'s', 'she’s', 'what\'s', 'what’s', 'that\'s', 'that’s', 'who\'s', 'who’s'].includes(lower)) {
                const stem = raw.slice(0, -2);
                expanded.push({ raw: stem, lower: stem.toLowerCase(), sourceRaw: raw });
                expanded.push({ raw: 'is', lower: 'is', sourceRaw: raw });
                continue;
            }

            expanded.push({ raw, lower, sourceRaw: raw });
        }

        // Merge known multi-word idioms / lexical phrases
        const rawStrings = expanded.map(t => t.raw);
        const spans = mergeMultiWordPhrases(rawStrings, multiWordIndex);
        const resultTokens = [];
        let cursorIdx = 0;
        for (const span of spans) {
            if (span.isPhraseMatch) {
                const count = span.wordCount || 1;
                resultTokens.push({
                    raw: span.rawText,
                    lower: (span.cleanText || span.rawText || '').toLowerCase(),
                    isPhrase: true,
                    phraseEntries: span.phraseEntries,
                    entry: span.phraseEntries?.[0] || null
                });
                cursorIdx += count;
            } else {
                const orig = expanded[cursorIdx] || { raw: span.rawText, lower: (span.cleanText || span.rawText || '').toLowerCase() };
                resultTokens.push(orig);
                cursorIdx += 1;
            }
        }
        return resultTokens;
    };

    const detectSubjectPerson = (clauseTokens, verbIdx) => {
        for (let i = verbIdx - 1; i >= 0; i--) {
            const t = clauseTokens[i];
            if (!t || t.swallowed) continue;
            if (t.role === 'S') {
                const pInfo = PRONOUN_MAP[t.lower];
                if (pInfo) return pInfo.personTag;
                return t.isPlural ? '3P' : '3S';
            }
        }
        return '';
    };

    const isInfinitiveTo = (tokens, idx) => {
        const cur = tokens[idx];
        const next = tokens[idx + 1];
        if (!cur || cur.lower !== 'to' || !next) return false;
        if (ARTICLES.has(next.lower) || PRONOUN_MAP[next.lower] || /^\d+$/.test(next.lower)) return false;
        const verbLex = lexicon.some(e =>
            /\bverb\b/i.test(e.wordClass || '') && rankLexiconMatches([e], next.lower, { preferredRole: 'V', matchesPos, getRoleFromWordClass, normalizeToBase }).length > 0
        );
        const nounOnlyLex = lexicon.some(e =>
            /\bnoun\b/i.test(e.wordClass || '') && rankLexiconMatches([e], next.lower, { preferredRole: 'N', matchesPos, getRoleFromWordClass, normalizeToBase }).length > 0
        ) && !verbLex;
        if (verbLex) return true;
        if (nounOnlyLex) return false;
        // Common English verbs / default infinitive complement when preceded by 'want/like/need/try/love/hate/hope/go/start'
        const prev = tokens[idx - 1];
        if (prev && ['want', 'wants', 'wanted', 'need', 'needs', 'needed', 'like', 'likes', 'liked', 'love', 'loves', 'try', 'tries', 'tried', 'hope', 'start', 'going', 'have', 'has', 'had', 'ought', 'used'].includes(prev.lower)) {
            return true;
        }
        return false;
    };

    const translateSegment = ({
        segmentText,
        clauseIndex = 0,
        trailingPunct = '',
        isQuestionSegment = false,
        settings,
        resolver,
        userManualRoles = {},
        userWordChoices = {}
    }) => {
        const rawTokens = tokenizeClause(segmentText);
        if (rawTokens.length === 0) return null;

        const appliedGrammarSet = new Set();

        // Annotate syntactic roles and morphological features across tokens in clause
        const tokens = rawTokens.map((t, idx) => ({
            id: `tok_${clauseIndex}_${idx}`,
            occKey: `${clauseIndex}:${idx}:${t.lower}`,
            original: t.raw,
            lower: t.lower,
            isPhrase: Boolean(t.isPhrase),
            phraseEntry: t.entry || null,
            isGenitivePossessor: Boolean(t.isGenitivePossessor),
            fromNegContraction: Boolean(t.fromNegContraction),
            role: '',
            posHint: null,
            entry: null,
            candidates: [],
            found: false,
            inflected: '',
            type: 'direct',
            swallowed: false,
            needsFeatures: [],
            appliedRules: [],
            particlesBefore: [],
            particlesAfter: []
        }));

        // First Pass: identify aux verbs, articles, negations, prepositions, WH-words, coordinators, adjectives, nouns, verbs
        let seenMainVerb = false;
        let seenCopula = false;
        let activeVerbFeatures = {
            past: false,
            future: false,
            perfect: false,
            progressive: false,
            conditional: false,
            passive: false,
            imperative: false
        };
        let isComparativeClause = tokens.some((t, idx) =>
            t.lower === 'than'
            || (t.lower === 'more' && idx + 1 < tokens.length && tokens[idx + 1]?.lower !== 'than')
            || COMPARATIVE_IRREGULAR[t.lower]?.degree === 'comparative'
            || (/^[a-z]+ier$|^[a-z]+er$/.test(t.lower) && !ER_BLOCKLIST.has(t.lower) && tokens.some(x => x.lower === 'than'))
        );

        let insideComparativeStd = false;

        for (let i = 0; i < tokens.length; i++) {
            const tok = tokens[i];
            const prev = tokens[i - 1] || null;
            const next = tokens[i + 1] || null;
            const lower = tok.lower;

            const manualRole = userManualRoles[tok.occKey] || userManualRoles[`${i}:${lower}`] || userManualRoles[lower] || settings.roleOverrides?.[lower];

            // Handle 'than' in comparative clauses
            if (isComparativeClause && lower === 'than') {
                insideComparativeStd = true;
                tok.role = 'C';
                tok.posHint = 'Conjunction';
                tok.isComparativePart = true;
                tok.compPart = 'than';
                continue;
            }

            if (insideComparativeStd) {
                // Everything after 'than' belongs to standard NP
                tok.isComparativePart = true;
                tok.compPart = 'std';
            }

            // Punctuation / numerals
            if (/^\d+$/.test(lower)) {
                tok.isNumeral = true;
                tok.role = 'A';
                tok.posHint = 'Numeral';
                continue;
            }

            // Genitive possessor ("John's")
            if (tok.isGenitivePossessor) {
                tok.role = 'G';
                tok.posHint = 'Noun';
                tok.baseWord = lower;
                tok.needsFeatures.push({ slotId: 'genitive', pos: 'Noun', satisfied: false });
                continue;
            }

            // Negation
            if (NEGATIVE_WORDS.has(lower)) {
                tok.role = 'N';
                tok.posHint = 'Particle';
                continue;
            }

            // WH-question words
            if (WH_WORDS.has(lower)) {
                tok.role = 'Q';
                tok.posHint = 'Pronoun';
                if (lower === 'what' || lower === 'which') tok.inSituRole = seenMainVerb ? 'O' : 'O';
                else if (lower === 'who' || lower === 'whom') tok.inSituRole = prev?.role === 'P' ? 'L' : (seenMainVerb ? 'O' : 'S');
                else if (lower === 'where') tok.inSituRole = 'L';
                else if (lower === 'when') tok.inSituRole = 'T';
                else if (lower === 'why' || lower === 'how') tok.inSituRole = 'M';
                continue;
            }

            // Coordinators at start or coordinating NPs ('and', 'or') inside clause
            if (COORDINATORS.has(lower) && i === 0) {
                tok.role = 'C';
                tok.posHint = 'Conjunction';
                continue;
            }
            if ((lower === 'and' || lower === 'or' || lower === '&') && i > 0) {
                tok.role = 'C';
                tok.posHint = 'Conjunction';
                tok.isInternalCoordinator = true;
                tok.isClauseConjunction = true;
                continue;
            }
            if (lower === 'that' && next && (PRONOUN_MAP[next.lower] || ARTICLES.has(next.lower))) {
                // complementizer "I know that you..."
                if (seenMainVerb) {
                    tok.role = 'C';
                    tok.posHint = 'Conjunction';
                    continue;
                }
            }

            // Articles ("the", "a", "an")
            if (ARTICLES.has(lower)) {
                tok.role = 'A';
                tok.isArticle = true;
                tok.articleDefiniteness = lower === 'the' ? 'definite' : 'indefinite';
                continue;
            }

            // Infinitive 'to'
            if (isInfinitiveTo(tokens, i)) {
                tok.swallowed = true;
                tok.skippedAuxiliary = true;
                if (next) next._hasInfinitiveMarker = true;
                continue;
            }

            // Adpositions ('in', 'on', 'with', 'from', 'to', 'for', 'of', etc.)
            if (PREPOSITIONS.has(lower) && (!prev || prev.role !== 'P')) {
                tok.role = 'P';
                tok.posHint = 'Preposition';
                continue;
            }

            // Auxiliaries preceding main verbs ("did eat", "where did the cat sleep", "will run", "is running", "has eaten", "would go")
            const nextNonNeg = (tokens[i + 1] && NEGATIVE_WORDS.has(tokens[i + 1].lower)) ? tokens[i + 2] : tokens[i + 1];
            const looksFollowedByVerb = (candidateTok) => {
                if (!candidateTok) return false;
                const cl = candidateTok.lower;
                if (IRREGULAR_VERBS[cl] || cl.endsWith('ing') || cl.endsWith('ed')) return true;
                if (ARTICLES.has(cl) || PREPOSITIONS.has(cl) || WH_WORDS.has(cl)) return false;
                if (ED_ADJECTIVES.has(cl) || ING_ADJECTIVES.has(cl)) return false;
                const hasVerbInLex = lexicon.some(e =>
                    /\bverb\b/i.test(e.wordClass || '') && rankLexiconMatches([e], cl, { preferredRole: 'V', matchesPos, getRoleFromWordClass, normalizeToBase }).length > 0
                );
                if (hasVerbInLex) return true;
                // In "did you eat" / "will you go"
                if (PRONOUN_MAP[cl] && tokens[i + 2]) return true;
                return false;
            };
            const clauseHasLaterVerb = tokens.slice(i + 1).some(laterTok => {
                const ll = laterTok.lower;
                if (['do', 'does', 'did', 'go', 'sleep', 'eat', 'drink', 'see', 'make', 'run', 'walk', 'come', 'give', 'take', 'have', 'like', 'want', 'need'].includes(ll)) return true;
                if (IRREGULAR_VERBS[ll]) return true;
                return lexicon.some(e =>
                    /\bverb\b/i.test(e.wordClass || '') && rankLexiconMatches([e], lemmatize(ll, 'Verb'), { preferredRole: 'V', matchesPos, getRoleFromWordClass, normalizeToBase }).length > 0
                );
            });

            if (['do', 'does', 'did'].includes(lower) && nextNonNeg && (looksFollowedByVerb(nextNonNeg) || PRONOUN_MAP[nextNonNeg.lower] || (ARTICLES.has(nextNonNeg.lower) && clauseHasLaterVerb))) {
                tok.swallowed = true;
                tok.skippedAuxiliary = true;
                if (lower === 'did') activeVerbFeatures.past = true;
                continue;
            }

            if ((lower === 'will' || lower === 'shall') && nextNonNeg) {
                tok.swallowed = true;
                tok.skippedAuxiliary = true;
                activeVerbFeatures.future = true;
                continue;
            }

            if (lower === 'would' && nextNonNeg) {
                tok.swallowed = true;
                tok.skippedAuxiliary = true;
                activeVerbFeatures.conditional = true;
                continue;
            }

            if (['have', 'has', 'had'].includes(lower) && nextNonNeg && (nextNonNeg.lower.endsWith('ed') || IRREGULAR_VERBS[nextNonNeg.lower]?.tense === 'perfect' || IRREGULAR_VERBS[nextNonNeg.lower]?.tense === 'past')) {
                tok.swallowed = true;
                tok.skippedAuxiliary = true;
                activeVerbFeatures.perfect = true;
                if (lower === 'had') activeVerbFeatures.past = true;
                continue;
            }

            if (COPULA_VERBS.has(lower) && nextNonNeg) {
                const nl = nextNonNeg.lower;
                if ((nl.endsWith('ing') && !ING_NOUNS.has(nl) && !ING_ADJECTIVES.has(nl)) || nl === 'going') {
                    // Progressive "is running"
                    tok.swallowed = true;
                    tok.skippedAuxiliary = true;
                    if (lower === 'was' || lower === 'were') activeVerbFeatures.past = true;
                    activeVerbFeatures.progressive = true;
                    continue;
                }
                if ((IRREGULAR_VERBS[nl]?.tense === 'perfect' || (nl.endsWith('ed') && !ED_ADJECTIVES.has(nl))) && tokens.some(t => t.lower === 'by')) {
                    tok.swallowed = true;
                    tok.skippedAuxiliary = true;
                    if (lower === 'was' || lower === 'were') activeVerbFeatures.past = true;
                    activeVerbFeatures.passive = true;
                    continue;
                }
            }

            // Degree adverbs in comparative/superlative ("more", "most")
            if (isComparativeClause && lower === 'more' && next) {
                tok.role = 'J';
                tok.isComparativePart = true;
                tok.compPart = 'more';
                tok.isComparativeModifier = true;
                if (settings.comparativeStrategy === 'suffix_ablative') {
                    tok.swallowed = true;
                    next._forceComparative = true;
                }
                continue;
            }
            if (lower === 'most' && next && !ARTICLES.has(next.lower)) {
                tok.swallowed = true;
                next._forceSuperlative = true;
                continue;
            }

            // Pronouns & Possessive Determiners
            if (PRONOUN_MAP[lower]) {
                const pMeta = PRONOUN_MAP[lower];
                tok.isPronoun = true;
                tok.personTag = pMeta.personTag;
                tok.isPlural = pMeta.isPlural;
                if (pMeta.caseType === 'det' || (lower === 'his' && next && !COPULA_VERBS.has(next.lower))) {
                    tok.role = 'G';
                    tok.posHint = 'Pronoun';
                    tok.expectedPronounCase = 'det';
                } else if (pMeta.caseType === 'dem') {
                    // "this dog" vs "I like this"
                    const modifiesFollowingNoun = next && !COPULA_VERBS.has(next.lower) && !PREPOSITIONS.has(next.lower) && !COORDINATORS.has(next.lower) && !NEGATIVE_WORDS.has(next.lower);
                    if (modifiesFollowingNoun) {
                        tok.role = 'A';
                        tok.posHint = 'Pronoun';
                        tok.expectedPronounCase = 'dem';
                    } else {
                        tok.role = seenMainVerb ? 'O' : 'S';
                        tok.posHint = 'Pronoun';
                        tok.expectedPronounCase = 'dem';
                    }
                } else if (prev?.role === 'P') {
                    tok.role = insideComparativeStd ? 'O' : 'L';
                    tok.posHint = 'Pronoun';
                    tok.expectedPronounCase = 'obj';
                } else if (!seenMainVerb) {
                    tok.role = 'S';
                    tok.posHint = 'Pronoun';
                    tok.expectedPronounCase = 'sub';
                } else {
                    tok.role = (DITRANSITIVE_VERBS.has(tokens.find(t => t.role === 'V')?.lower || '') && next && !PREPOSITIONS.has(next.lower)) ? 'D' : 'O';
                    tok.posHint = 'Pronoun';
                    tok.expectedPronounCase = 'obj';
                }
                if (manualRole) tok.role = manualRole;
                continue;
            }

            // Time adverbs
            if (TIME_ADVERBS.has(lower)) {
                tok.role = 'T';
                tok.posHint = 'Adverb';
                if (manualRole) tok.role = manualRole;
                continue;
            }

            // Manner / degree adverbs (-ly or common adverbs)
            if (MANNER_ADVERBS_COMMON.has(lower) || (lower.endsWith('ly') && lower.length > 4 && !['only', 'early', 'family', 'belly', 'reply', 'supply', 'fly'].includes(lower))) {
                tok.role = 'M';
                tok.posHint = 'Adverb';
                if (manualRole) tok.role = manualRole;
                continue;
            }

            // Explicit Copula Verb ("is", "are", "was", "were", "am", "be")
            if (COPULA_VERBS.has(lower)) {
                tok.role = 'V';
                tok.posHint = 'Verb';
                tok.isCopulaVerb = true;
                seenMainVerb = true;
                seenCopula = true;
                if (lower === 'was' || lower === 'were') tok.tenseFeature = 'past';
                if (manualRole) tok.role = manualRole;
                continue;
            }

            // Multi-word lexicon phrase pre-matched earlier
            if (tok.isPhrase && tok.phraseEntry) {
                const wc = (tok.phraseEntry.wordClass || '').toLowerCase();
                tok.role = manualRole || (wc.includes('verb') ? 'V' : wc.includes('adj') ? 'J' : wc.includes('adv') ? 'M' : (!seenMainVerb ? 'S' : 'O'));
                tok.posHint = tok.phraseEntry.wordClass || null;
                if (tok.role === 'V') seenMainVerb = true;
                continue;
            }

            // Check Lexicon / Morphosyntactic context for ambiguous words ("cold", "water", "sleep", etc.)
            if (manualRole) {
                tok.role = manualRole;
                tok.posHint = manualRole === 'V' ? 'Verb' : manualRole === 'J' ? 'Adjective' : manualRole === 'M' ? 'Adverb' : 'Noun';
                if (tok.role === 'V') seenMainVerb = true;
                continue;
            }

            if (tok._hasInfinitiveMarker) {
                tok.role = 'V';
                tok.posHint = 'Verb';
                tok.isInfinitive = true;
                seenMainVerb = true;
                continue;
            }

            if (seenCopula && (!next || PREPOSITIONS.has(next.lower) || next.lower === 'than' || COORDINATORS.has(next.lower))) {
                // After copula: Predicate Adjective vs Predicate Nominal!
                // Distinguish by checking Adj lexicon match first, or adjective morphology (-er/-est/COMPARATIVE_IRREGULAR/ED_ADJECTIVES/ING_ADJECTIVES)
                const adjMatch = lexicon.some(e => /\badj/i.test(e.wordClass || '') && rankLexiconMatches([e], lower, { preferredRole: 'J', matchesPos, getRoleFromWordClass, normalizeToBase }).length > 0);
                const nounMatch = lexicon.some(e => /\bnoun\b/i.test(e.wordClass || '') && rankLexiconMatches([e], lower, { preferredRole: 'N', matchesPos, getRoleFromWordClass, normalizeToBase }).length > 0);
                const looksComparativeAdj = COMPARATIVE_IRREGULAR[lower]?.degree || tok._forceComparative || tok._forceSuperlative || (!ER_BLOCKLIST.has(lower) && lower.endsWith('er') && isComparativeClause) || (!EST_BLOCKLIST.has(lower) && lower.endsWith('est'));
                if (adjMatch || looksComparativeAdj || ED_ADJECTIVES.has(lower) || ING_ADJECTIVES.has(lower) || !nounMatch) {
                    tok.role = 'J';
                    tok.posHint = 'Adjective';
                    tok.isPredicateAdjective = true;
                    tok.isCopulaPredicate = true;
                    if (isComparativeClause && (looksComparativeAdj || tok._forceComparative || prev?.isComparativeModifier)) {
                        tok.isComparativePart = true;
                        tok.compPart = 'adj';
                    }
                    continue;
                }
            }

            // Pre-nominal modifier vs Noun head vs Main Verb:
            // If immediately preceded by Article/Determiner/Genitive/Preposition AND followed by a probable Noun -> Adjective!
            const precededByNominalStarter = !prev || ARTICLES.has(prev.lower) || prev.role === 'A' || prev.role === 'G' || prev.role === 'P' || prev.role === 'J';
            const followedByHeadCandidate = next
                && !PREPOSITIONS.has(next.lower)
                && !COORDINATORS.has(next.lower)
                && !COPULA_VERBS.has(next.lower)
                && !NEGATIVE_WORDS.has(next.lower)
                && !['do', 'does', 'did', 'will', 'shall', 'would', 'have', 'has', 'had'].includes(next.lower)
                && next.lower !== 'to'
                && next.lower !== 'than';

            const lexAdj = lexicon.some(e => /\badj/i.test(e.wordClass || '') && rankLexiconMatches([e], lemmatize(lower, 'Adjective'), { preferredRole: 'J', matchesPos, getRoleFromWordClass, normalizeToBase }).length > 0);
            const lexVerb = lexicon.some(e => /\bverb\b/i.test(e.wordClass || '') && rankLexiconMatches([e], lemmatize(lower, 'Verb'), { preferredRole: 'V', matchesPos, getRoleFromWordClass, normalizeToBase }).length > 0);
            const lexNoun = lexicon.some(e => /\bnoun\b/i.test(e.wordClass || '') && rankLexiconMatches([e], lemmatize(lower, 'Noun'), { preferredRole: 'N', matchesPos, getRoleFromWordClass, normalizeToBase }).length > 0);

            if (precededByNominalStarter && followedByHeadCandidate && !insideComparativeStd) {
                // Check if NEXT token can act as a Noun (or if THIS token is explicitly Adjective)
                const nextIsNoun = lexicon.some(e => /\bnoun\b/i.test(e.wordClass || '') && rankLexiconMatches([e], lemmatize(next.lower, 'Noun'), { preferredRole: 'N', matchesPos, getRoleFromWordClass, normalizeToBase }).length > 0);
                const nextIsVerb = lexicon.some(e => /\bverb\b/i.test(e.wordClass || '') && rankLexiconMatches([e], lemmatize(next.lower, 'Verb'), { preferredRole: 'V', matchesPos, getRoleFromWordClass, normalizeToBase }).length > 0);
                if (lexAdj && (!lexVerb || nextIsNoun)) {
                    tok.role = 'J';
                    tok.posHint = 'Adjective';
                    continue;
                }
                if (!seenMainVerb && prev && (ARTICLES.has(prev.lower) || prev.role === 'G' || prev.role === 'J') && nextIsNoun && !nextIsVerb) {
                    tok.role = 'J';
                    tok.posHint = 'Adjective';
                    continue;
                }
                if (seenMainVerb && prev && (ARTICLES.has(prev.lower) || prev.role === 'G' || prev.role === 'P' || prev.role === 'J') && (!lexNoun || lexAdj) && !nextIsVerb) {
                    tok.role = 'J';
                    tok.posHint = 'Adjective';
                    continue;
                }
            }

            // Is it a finite Verb?
            const hasVerbMorph = Boolean(IRREGULAR_VERBS[lower])
                || (lower.endsWith('ed') && !ED_ADJECTIVES.has(lower))
                || (lower.endsWith('ing') && !ING_NOUNS.has(lower) && !ING_ADJECTIVES.has(lower))
                || (activeVerbFeatures.past || activeVerbFeatures.future || activeVerbFeatures.perfect || activeVerbFeatures.progressive || activeVerbFeatures.conditional);

            const precededByNounPhraseTrigger = prev && (ARTICLES.has(prev.lower) || prev.role === 'P' || prev.role === 'A' || prev.role === 'J' || prev.isInternalCoordinator);
            const hasLaterKnownVerb = tokens.slice(i + 1).some(nt =>
                IRREGULAR_VERBS[nt.lower]
                || lexicon.some(e => /\bverb\b/i.test(e.wordClass || '') && rankLexiconMatches([e], lemmatize(nt.lower, 'Verb'), { preferredRole: 'V', matchesPos, getRoleFromWordClass, normalizeToBase }).length > 0)
            );
            const isLikelyDirectConlangVerb = lexicon.some(e => /\bverb\b/i.test(e.wordClass || '') && e.word?.toLowerCase() === lower);
            const isPluralNounOnly = lower.endsWith('s') && !VERB_3SG.has(lower) && lexNoun && !lexVerb && !isLikelyDirectConlangVerb;
            const afterSubjectReadyForVerb = !seenMainVerb && i > 0 && !precededByNounPhraseTrigger && !isPluralNounOnly && !(lexNoun && !lexVerb && hasLaterKnownVerb);

            if (!seenMainVerb && !precededByNounPhraseTrigger && (lexVerb || isLikelyDirectConlangVerb || hasVerbMorph || afterSubjectReadyForVerb)) {
                tok.role = 'V';
                tok.posHint = 'Verb';
                seenMainVerb = true;
                continue;
            }

            // What if we already saw main Verb and this is another Verb? (e.g. "I like reading", "want eat")
            if (seenMainVerb && !precededByNounPhraseTrigger && (lexVerb || isLikelyDirectConlangVerb) && !lexNoun) {
                tok.role = 'V';
                tok.posHint = 'Verb';
                continue;
            }

            // Oblique PP head or Standard of Comparison
            const insidePP = (() => {
                for (let k = i - 1; k >= 0; k--) {
                    if (tokens[k].role === 'P') return tokens[k];
                    if (['V', 'C'].includes(tokens[k].role) && !tokens[k].isInternalCoordinator) return null;
                }
                return null;
            })();

            if (insideComparativeStd) {
                tok.role = lexAdj && !lexNoun ? 'J' : 'O';
                tok.posHint = lexAdj && !lexNoun ? 'Adjective' : 'Noun';
                continue;
            }

            if (insidePP) {
                if (insidePP.lower === 'of') {
                    tok.role = 'G';
                    tok.posHint = 'Noun';
                } else {
                    tok.role = 'L';
                    tok.posHint = 'Noun';
                }
                continue;
            }

            if (!seenMainVerb) {
                // Before main verb and after Adj/Article -> Adjective or Subject Noun
                if (lexAdj && !lexNoun && next && followedByHeadCandidate) {
                    tok.role = 'J';
                    tok.posHint = 'Adjective';
                } else {
                    tok.role = 'S';
                    tok.posHint = 'Noun';
                }
            } else {
                // Post-verbal NP or predicate nominal
                if (seenCopula) tok.isCopulaPredicate = true;
                if (lexAdj && !lexNoun) {
                    tok.role = 'J';
                    tok.posHint = 'Adjective';
                    if (seenCopula && !followedByHeadCandidate) tok.isPredicateAdjective = true;
                } else {
                    const prevV = [...tokens].reverse().find(x => x.role === 'V');
                    const prevVLemma = prevV ? lemmatize(prevV.lower, 'Verb') : '';
                    const hasFollowingArgument = tokens.slice(i + 1).some(x =>
                        !PREPOSITIONS.has(x.lower) && !TIME_ADVERBS.has(x.lower) && !MANNER_ADVERBS_COMMON.has(x.lower) && !NEGATIVE_WORDS.has(x.lower) && !ARTICLES.has(x.lower)
                    );
                    const isIndirectObj = prevV && DITRANSITIVE_VERBS.has(prevVLemma) && hasFollowingArgument && (!prev || prev.role === 'V' || prev.role === 'J' || ARTICLES.has(prev.lower));
                    tok.role = isIndirectObj ? 'D' : 'O';
                    tok.posHint = 'Noun';
                }
            }
        }

        // Second Pass: Propagate clause tense/aspect to primary Verb, absorb Prepositions, detect Plural/Comparative/Superlative, and resolve Lexicon/Pronouns/Particles
        const mainVerbTok = tokens.find(t => t.role === 'V' && !t.swallowed) || null;
        const hasTransitiveObject = tokens.some(t => t.role === 'O' && !t.isCopulaPredicate && !t.swallowed);
        const subjectPersonTag = mainVerbTok ? detectSubjectPerson(tokens, tokens.indexOf(mainVerbTok)) : '';

        if (mainVerbTok) {
            if (activeVerbFeatures.past || IRREGULAR_VERBS[mainVerbTok.lower]?.tense === 'past' || (mainVerbTok.lower.endsWith('ed') && !ED_ADJECTIVES.has(mainVerbTok.lower))) {
                mainVerbTok.tenseFeature = 'past';
            }
            if (activeVerbFeatures.future) mainVerbTok.futureFeature = true;
            if (activeVerbFeatures.perfect || IRREGULAR_VERBS[mainVerbTok.lower]?.tense === 'perfect') mainVerbTok.perfectFeature = true;
            if (activeVerbFeatures.progressive || (mainVerbTok.lower.endsWith('ing') && !ING_NOUNS.has(mainVerbTok.lower))) mainVerbTok.progressiveFeature = true;
            if (activeVerbFeatures.conditional) mainVerbTok.conditionalFeature = true;
            if (activeVerbFeatures.passive) mainVerbTok.passiveFeature = true;
        }

        // Handle Preposition absorption vs explicit translation
        for (let i = 0; i < tokens.length; i++) {
            const pTok = tokens[i];
            if (pTok.role !== 'P' || pTok.swallowed) continue;

            const mappedCase = PREPOSITION_TO_CASE_MAP[pTok.lower];
            const headNoun = tokens.slice(i + 1).find(t => !t.swallowed && ['L', 'G', 'D', 'O', 'Q'].includes(t.role));

            if (mappedCase && settings.absorbPrepositionsIntoCase && headNoun) {
                const caseMatch = resolver.resolveSlot(mappedCase, 'Noun')
                    || (mappedCase === 'allative' ? resolver.resolveSlot('dative', 'Noun') : null);
                if (caseMatch) {
                    pTok.swallowed = true;
                    pTok.absorbedIntoCase = mappedCase;
                    headNoun.obliqueCase = mappedCase;
                    headNoun.absorbedPreposition = pTok.lower;
                }
            }
        }

        // Handle Articles ("the", "a", "an") per articleStrategy
        for (let i = 0; i < tokens.length; i++) {
            const aTok = tokens[i];
            if (!aTok.isArticle || aTok.swallowed) continue;
            const headNoun = tokens.slice(i + 1).find(t => !t.swallowed && ['S', 'O', 'D', 'L', 'G'].includes(t.role));

            if (settings.articleStrategy === 'omit') {
                aTok.swallowed = true;
                aTok.skippedArticle = true;
            } else if (settings.articleStrategy === 'affix') {
                aTok.swallowed = true;
                aTok.skippedArticle = true;
                if (headNoun) {
                    headNoun.definitenessFeature = aTok.articleDefiniteness;
                }
            } else {
                // 'translate' — try lexicon or particleDatabase; will fall through to lookup below
                aTok.posHint = 'Article';
            }
        }

        // Handle Comparative Strategy 'suffix_ablative' swallowing 'than' onto Standard Noun
        if (isComparativeClause && settings.comparativeStrategy === 'suffix_ablative') {
            const thanTok = tokens.find(t => t.compPart === 'than');
            const stdHead = tokens.find(t => t.compPart === 'std' && ['O', 'S', 'L'].includes(t.role));
            if (thanTok && stdHead) {
                thanTok.swallowed = true;
                stdHead.obliqueCase = 'ablative';
            }
        }

        // Third Pass: Resolve each non-swallowed token and apply morphological grammar rules!
        for (let i = 0; i < tokens.length; i++) {
            const tok = tokens[i];
            if (tok.swallowed) continue;

            if (tok.role === 'S' && hasTransitiveObject) {
                tok.isTransitiveSubject = true;
            }

            // Detect plural number on Nouns
            if (['S', 'O', 'D', 'L', 'G'].includes(tok.role) && !tok.isPronoun && !tok.isPhrase) {
                const lw = tok.lower;
                const isIrrPlur = Boolean(IRREGULAR_PLURALS[lw]);
                const isRegPlur = lw.endsWith('s') && lw.length > 2 && !S_NOUNS_SING.has(lw) && !NON_COUNT_PLURALS.has(lw) && !lw.endsWith("'s") && !lw.endsWith("’s");
                if (isIrrPlur || isRegPlur) {
                    tok.isPlural = true;
                }
            }

            // Detect Adjective degree (comparative / superlative)
            if (tok.role === 'J') {
                if (COMPARATIVE_IRREGULAR[tok.lower]?.degree === 'comparative' || tok._forceComparative || (isComparativeClause && !ER_BLOCKLIST.has(tok.lower) && tok.lower.endsWith('er'))) {
                    tok.degreeFeature = 'comparative';
                } else if (COMPARATIVE_IRREGULAR[tok.lower]?.degree === 'superlative' || tok._forceSuperlative || (!EST_BLOCKLIST.has(tok.lower) && tok.lower.endsWith('est'))) {
                    tok.degreeFeature = 'superlative';
                }
            }

            // Lookup candidates (Lexicon + Pronouns Matrix + Particles + Numerals)
            let chosenEntry = tok.phraseEntry || null;
            let candidates = [];

            if (chosenEntry) {
                candidates = [chosenEntry];
            } else {
                candidates = findRankedLexiconCandidates(tok.lower, tok.posHint, {
                    expectedPronounCase: tok.expectedPronounCase
                });
                const preferredChoice = userWordChoices[tok.occKey] || userWordChoices[`${i}:${tok.lower}`] || userWordChoices[tok.lower];
                if (preferredChoice) {
                    const forced = candidates.find(c => c.id === preferredChoice || c.word === preferredChoice);
                    if (forced) chosenEntry = forced;
                }
                if (!chosenEntry && candidates.length > 0) {
                    chosenEntry = candidates[0];
                }
            }

            tok.candidates = candidates;
            tok.baseWord = lemmatize(tok.lower, tok.posHint);

            if (chosenEntry && chosenEntry.word) {
                tok.found = true;
                tok.entry = chosenEntry;
                tok.type = chosenEntry.source === 'numerals'
                    ? 'numeral'
                    : (chosenEntry.source === 'particleDatabase' ? 'particle' : (tok.isPronoun ? 'pronoun' : 'direct'));

                let inflectedWord = chosenEntry.word;

                // 1) Nominal Morphology (Plural, Definiteness, Case / Alignment)
                if (['S', 'O', 'D', 'L', 'G'].includes(tok.role)) {
                    const isPronMatrixCaseHandled = tok.isPronoun && chosenEntry.source === 'pronounMatrix'
                        && ((tok.role === 'O' && chosenEntry.matrixCaseType === 'obj') || (tok.role === 'G' && ['det', 'pos'].includes(chosenEntry.matrixCaseType)));

                    if (tok.isPlural && !tok.isPronoun) {
                        const plSlot = resolver.resolveSlot('plural', 'Noun');
                        if (plSlot) {
                            const res = applyAffixSafely(inflectedWord, plSlot, grammarRules, chosenEntry);
                            inflectedWord = res.word;
                            if (res.particleToken) tok.particlesAfter.push(res.particleToken);
                            if (res.appliedName) {
                                tok.appliedRules.push(res.appliedName);
                                appliedGrammarSet.add(res.appliedName);
                                tok.type = 'grammar-number';
                            }
                        } else {
                            tok.needsFeatures.push({ slotId: 'plural', satisfied: false, reason: `Plural noun "${tok.original}" has no Plural (PL) rule.` });
                        }
                    }

                    if (tok.definitenessFeature) {
                        const defSlot = resolver.resolveSlot(tok.definitenessFeature, 'Noun');
                        if (defSlot) {
                            const res = applyAffixSafely(inflectedWord, defSlot, grammarRules, chosenEntry);
                            inflectedWord = res.word;
                            if (res.particleToken) tok.particlesBefore.push(res.particleToken);
                            if (res.appliedName) {
                                tok.appliedRules.push(res.appliedName);
                                appliedGrammarSet.add(res.appliedName);
                            }
                        } else {
                            tok.needsFeatures.push({ slotId: tok.definitenessFeature, satisfied: false });
                        }
                    }

                    // Determine nominal case slot
                    let caseSlotId = tok.obliqueCase || null;
                    if (!caseSlotId) {
                        if (tok.role === 'G' && !tok.isPronoun) {
                            caseSlotId = 'genitive';
                        } else if (tok.role === 'G' && tok.isPronoun && !isPronMatrixCaseHandled && !['my', 'your', 'his', 'her', 'its', 'our', 'their'].includes(tok.lower)) {
                            caseSlotId = 'genitive';
                        } else if (tok.role === 'D') {
                            caseSlotId = 'dative';
                        } else if (tok.role === 'O' && !tok.isCopulaPredicate) {
                            if (settings.alignment === 'accusative' && !isPronMatrixCaseHandled) {
                                caseSlotId = 'accusative';
                            } else if (settings.alignment === 'ergative') {
                                caseSlotId = 'absolutive';
                            }
                        } else if (tok.role === 'S') {
                            if (settings.alignment === 'ergative' && tok.isTransitiveSubject) {
                                caseSlotId = 'ergative';
                            } else if (settings.alignment === 'ergative') {
                                caseSlotId = 'absolutive';
                            } else if (settings.alignment === 'accusative') {
                                caseSlotId = 'nominative';
                            }
                        }
                    }

                    if (caseSlotId) {
                        const caseMatch = resolver.resolveSlot(caseSlotId, 'Noun');
                        if (caseMatch) {
                            const res = applyAffixSafely(inflectedWord, caseMatch, grammarRules, chosenEntry);
                            inflectedWord = res.word;
                            if (res.particleToken) {
                                if (res.particleToken.position === 'before') tok.particlesBefore.push(res.particleToken);
                                else tok.particlesAfter.push(res.particleToken);
                            }
                            if (res.appliedName) {
                                tok.appliedRules.push(res.appliedName);
                                appliedGrammarSet.add(res.appliedName);
                                tok.type = 'grammar-case';
                            }
                        } else if (['genitive', 'dative', 'locative', 'ablative', 'allative', 'instrumental'].includes(caseSlotId)) {
                            tok.needsFeatures.push({ slotId: caseSlotId, satisfied: false });
                        }
                    }
                }

                // 2) Adjective Degree & Agreement
                if (tok.role === 'J') {
                    if (tok.degreeFeature) {
                        const degMatch = resolver.resolveSlot(tok.degreeFeature, 'Adjective');
                        if (degMatch) {
                            const res = applyAffixSafely(inflectedWord, degMatch, grammarRules, chosenEntry);
                            inflectedWord = res.word;
                            if (res.particleToken) {
                                if (res.particleToken.position === 'after') tok.particlesAfter.push(res.particleToken);
                                else tok.particlesBefore.push(res.particleToken);
                            }
                            if (res.appliedName) {
                                tok.appliedRules.push(res.appliedName);
                                appliedGrammarSet.add(res.appliedName);
                            }
                        } else if (tok.degreeFeature === 'comparative' && settings.comparativeStrategy === 'suffix_ablative') {
                            tok.needsFeatures.push({ slotId: 'comparative', satisfied: false });
                        } else if (tok.degreeFeature === 'superlative') {
                            tok.needsFeatures.push({ slotId: 'superlative', satisfied: false });
                        }
                    }

                    if (settings.adjectiveAgreement && !tok.isPredicateAdjective) {
                        // Find modified head noun and propagate plural/case when rule permits adjectives
                        const headNoun = tokens.slice(i + 1).find(t => !t.swallowed && ['S', 'O', 'D', 'L'].includes(t.role));
                        if (headNoun?.isPlural) {
                            const adjPl = resolver.resolveSlot('plural', 'Adjective');
                            if (adjPl && (adjPl.rule?.appliesTo === 'all' || /adj/i.test(adjPl.rule?.targetPOS || ''))) {
                                const res = applyAffixSafely(inflectedWord, adjPl, grammarRules, chosenEntry);
                                inflectedWord = res.word;
                                if (res.appliedName) {
                                    tok.appliedRules.push(res.appliedName);
                                    appliedGrammarSet.add(`Adj Agreement: ${res.appliedName}`);
                                }
                            }
                        }
                    }
                }

                // 3) Verb Morphology (TAM, Negation-as-affix, Person Agreement, Infinitive verbMarker)
                if (tok.role === 'V') {
                    const appliedSlots = [];
                    if (tok.passiveFeature) appliedSlots.push('passive');
                    if (tok.progressiveFeature) appliedSlots.push('progressive');
                    if (tok.perfectFeature) appliedSlots.push('perfect');
                    if (tok.tenseFeature === 'past') appliedSlots.push('past');
                    if (tok.futureFeature) appliedSlots.push('future');
                    if (tok.conditionalFeature) appliedSlots.push('conditional');

                    for (const sId of appliedSlots) {
                        const slotMatch = resolver.resolveSlot(sId, 'Verb');
                        if (slotMatch) {
                            const res = applyAffixSafely(inflectedWord, slotMatch, grammarRules, chosenEntry, subjectPersonTag);
                            inflectedWord = res.word;
                            if (res.particleToken) {
                                if (res.particleToken.position === 'after') tok.particlesAfter.push(res.particleToken);
                                else tok.particlesBefore.push(res.particleToken);
                            }
                            if (res.appliedName) {
                                tok.appliedRules.push(res.appliedName);
                                appliedGrammarSet.add(res.appliedName);
                                tok.type = 'grammar-tense';
                            }
                        } else {
                            tok.needsFeatures.push({ slotId: sId, satisfied: false });
                        }
                    }

                    // Infinitive rule or verbMarker from Grammar Settings
                    if (tok.isInfinitive) {
                        const infRule = resolver.resolveSlot('infinitive', 'Verb');
                        if (infRule) {
                            const res = applyAffixSafely(inflectedWord, infRule, grammarRules, chosenEntry);
                            inflectedWord = res.word;
                            if (res.appliedName) {
                                tok.appliedRules.push(res.appliedName);
                                appliedGrammarSet.add(res.appliedName);
                            }
                        } else if (verbMarker) {
                            const markerClean = verbMarker.replace(/^-|-$/g, '');
                            if (markerClean && !inflectedWord.toLowerCase().includes(markerClean.toLowerCase())) {
                                inflectedWord = verbMarker.startsWith('-')
                                    ? `${inflectedWord}${markerClean}`
                                    : (verbMarker.endsWith('-') ? `${markerClean}${inflectedWord}` : `${markerClean} ${inflectedWord}`);
                                appliedGrammarSet.add(`Verb Marker (${verbMarker})`);
                            }
                        }
                    }

                    // Negation affix when negationPlacement === 'affix'
                    const hasNegInClause = tokens.some(t => t.role === 'N' && !t.swallowed);
                    if (hasNegInClause) {
                        const negSlot = resolver.resolveSlot('negation', 'Verb');
                        if (settings.negationPlacement === 'affix') {
                            if (negSlot) {
                                const negTok = tokens.find(t => t.role === 'N' && !t.swallowed);
                                if (negTok) negTok.swallowed = true;
                                const res = applyAffixSafely(inflectedWord, negSlot, grammarRules, chosenEntry, subjectPersonTag);
                                inflectedWord = res.word;
                                if (res.particleToken) tok.particlesBefore.push(res.particleToken);
                                if (res.appliedName) {
                                    tok.appliedRules.push(res.appliedName);
                                    appliedGrammarSet.add(res.appliedName);
                                }
                            } else {
                                tok.needsFeatures.push({ slotId: 'negation', satisfied: false, reason: 'Negation is set to Affix, but no Negation (NEG) grammar rule exists.' });
                            }
                        }
                    }

                    // Subject Person Agreement from Pronoun Matrix / Person Rules
                    const hasMatrixVerbAffixes = Object.keys(pronounMatrixData || {}).some(k => k.endsWith('-affix') && String(pronounMatrixData[k] || '').trim());
                    const subjMode = settings.subjectRealization;
                    const shouldApplyVerbAgreement = settings.hasExplicitSubjectRealization
                        ? (subjMode === 'affix_only' || subjMode === 'free_and_affix')
                        : (
                            settings.verbPersonAgreement === 'always'
                            || settings.proDropMode === 'pronouns'
                            || (settings.verbPersonAgreement === 'auto' && hasMatrixVerbAffixes)
                        );

                    if (shouldApplyVerbAgreement && !tok.isInfinitive && subjectPersonTag) {
                        const agreement = pronounSystem.getAgreementForPerson(subjectPersonTag, tok);
                        if (agreement?.affix && !tok.isCopulaVerb) {
                            const agrRule = { name: agreement.name || subjectPersonTag, affix: agreement.affix };
                            const res = applyAffixSafely(inflectedWord, { kind: 'rule', slotId: 'person', rule: agrRule }, grammarRules, chosenEntry, subjectPersonTag);
                            inflectedWord = res.word;
                            if (res.appliedName) {
                                tok.appliedRules.push(res.appliedName);
                                appliedGrammarSet.add(`Agreement ${subjectPersonTag} (${agreement.affix})`);
                            }
                        }
                    }
                }

                //Assemble final surface for this token including any attached standalone particles
                const beforeStr = tok.particlesBefore.map(p => p.surface).filter(Boolean).join(' ');
                const afterStr = tok.particlesAfter.map(p => p.surface).filter(Boolean).join(' ');
                tok.inflected = [beforeStr, inflectedWord, afterStr].filter(Boolean).join(' ');
            } else {
                // Token NOT found directly in Lexicon / Pronouns / Particles
                // Special case 1: Copula zero_copula handling
                if (tok.isCopulaVerb && settings.copulaBehavior === 'zero_copula') {
                    if (settings.copulaReplacement) {
                        tok.found = true;
                        tok.type = 'particle';
                        tok.entry = { word: settings.copulaReplacement, translation: 'be', wordClass: 'Particle', source: 'copulaSetting' };
                        tok.inflected = settings.copulaReplacement;
                        appliedGrammarSet.add(`Copula Replacement (${settings.copulaReplacement})`);
                    } else {
                        tok.swallowed = true;
                        tok.found = true;
                        appliedGrammarSet.add('Zero Copula');
                    }
                    continue;
                }

                // Special case 2: Negation particle fallback from Grammar negation slot!
                if (tok.role === 'N') {
                    const negSlot = resolver.resolveSlot('negation', 'Verb');
                    if (negSlot) {
                        const ptclText = negSlot.kind === 'particle'
                            ? negSlot.particle?.surface
                            : (negSlot.rule?.affix || '').replace(/^-|-$/g, '');
                        if (ptclText) {
                            tok.found = true;
                            tok.type = 'particle';
                            tok.entry = { word: ptclText, translation: tok.original, wordClass: 'Particle', source: 'grammarRule' };
                            tok.inflected = ptclText;
                            appliedGrammarSet.add(`NEG (${ptclText})`);
                            continue;
                        }
                    } else {
                        tok.needsFeatures.push({ slotId: 'negation', satisfied: false, reason: 'Negation word "not" or NEG grammar rule not found.' });
                    }
                }

                // Special case 3: Still report morphology rules needed for missing words (plural, tense, etc.)
                if (tok.isPlural && !tok.isPronoun && !resolver.resolveSlot('plural', 'Noun')) {
                    tok.needsFeatures.push({ slotId: 'plural', satisfied: false, reason: `Plural noun "${tok.original}" has no Plural (PL) rule.` });
                }
                const missingVerbSlots = [];
                if (tok.passiveFeature) missingVerbSlots.push('passive');
                if (tok.progressiveFeature) missingVerbSlots.push('progressive');
                if (tok.perfectFeature) missingVerbSlots.push('perfect');
                if (tok.tenseFeature === 'past') missingVerbSlots.push('past');
                if (tok.futureFeature) missingVerbSlots.push('future');
                if (tok.conditionalFeature) missingVerbSlots.push('conditional');
                for (const sId of missingVerbSlots) {
                    if (!resolver.resolveSlot(sId, 'Verb')) {
                        tok.needsFeatures.push({ slotId: sId, satisfied: false });
                    }
                }
                if (tok.definitenessFeature && !resolver.resolveSlot(tok.definitenessFeature, 'Noun')) {
                    tok.needsFeatures.push({ slotId: tok.definitenessFeature, satisfied: false });
                }

                tok.found = false;
                tok.type = tok.isPronoun ? 'missing-pronoun' : 'missing';
                tok.inflected = `[${tok.original}]`;
            }
        }

        // Subject Realization / Pro-drop check
        for (const tok of tokens) {
            if (tok.swallowed || tok.role !== 'S' || !tok.isPronoun) continue;
            if (settings.subjectRealization === 'drop_subject' || (!settings.hasExplicitSubjectRealization && settings.proDropMode === 'always')) {
                tok.swallowed = true;
                tok.droppedPro = true;
                appliedGrammarSet.add('Drop Subject (Pronoun Omitted)');
            } else if (settings.subjectRealization === 'affix_only' || (!settings.hasExplicitSubjectRealization && settings.proDropMode === 'pronouns')) {
                const agr = pronounSystem.getAgreementForPerson(tok.personTag);
                if (agr?.affix) {
                    tok.swallowed = true;
                    tok.droppedPro = true;
                    appliedGrammarSet.add(`Affix Only (Pro-drop ${tok.personTag})`);
                } else if (tok.personTag) {
                    tok.missingPersonAgreementTag = tok.personTag;
                }
            }
        }

        // Question particle injection if a 'question' slot rule/particle exists & sentence is a question
        if (isQuestionSegment && settings.questionParticleBehavior !== 'none') {
            const hasWh = tokens.some(t => t.role === 'Q' && !t.swallowed);
            const shouldAddQParticle = settings.questionParticleBehavior === 'allQuestions'
                || (settings.questionParticleBehavior === 'yesNoOnly' && !hasWh);
            if (shouldAddQParticle) {
                const qSlot = resolver.resolveSlot('question', 'Particle');
                if (qSlot) {
                    const qSurface = qSlot.kind === 'particle'
                        ? qSlot.particle?.surface
                        : (qSlot.rule?.affix || '').replace(/^-|-$/g, '');
                    if (qSurface) {
                        tokens.push({
                            id: 'tok_q_particle',
                            original: '?',
                            lower: '?',
                            role: 'Q',
                            isQuestionParticle: true,
                            found: true,
                            type: 'particle',
                            entry: { word: qSurface, translation: 'question particle', wordClass: 'Particle' },
                            inflected: qSurface,
                            appliedRules: ['Q']
                        });
                        appliedGrammarSet.add(`Question Marker (${qSurface})`);
                    }
                }
            }
        }

        // Collect all sentence-level missing requirements before final ordering
        const diagnostics = collectSentenceDiagnostics({
            tokens,
            settings,
            resolver,
            pronounSystem,
            lexicon,
            numberSystem
        });

        // Order tokens strictly according to Grammar + Word Assist Settings
        const orderedTokens = reorderClauseBreakdown(tokens, settings);
        let rawRomanized = orderedTokens.map(t => t.inflected).filter(Boolean).join(' ').trim();
        if (trailingPunct && rawRomanized && !/[?!.,;:]$/.test(rawRomanized)) {
            rawRomanized = `${rawRomanized}${trailingPunct}`;
        }
        const display = rawRomanized ? transliterate(rawRomanized, lexicon) : '';
        // If transliterate produces non-PUA orthography (e.g. θ -> ṫ), mirror orthographic form in romanized
        const containsPuaGlyphs = /[\uE000-\uF8FF]/.test(display);
        const romanized = (!containsPuaGlyphs && display) ? display : rawRomanized;

        return {
            romanized,
            display,
            wordBreakdown: orderedTokens,
            reordered: orderedTokens,
            diagnostics,
            appliedGrammar: Array.from(appliedGrammarSet)
        };
    };

    const computePhraseSuggestion = (
        val,
        cursor,
        customSyntaxOrder = null,
        userManualRoles = {},
        copulaOverride = null,
        userWordChoices = {}
    ) => {
        if (!val || typeof val !== 'string') return [];

        const dynamicStoreState = storeGetter ? storeGetter.getState() : {};
        const effectiveOptions = {
            ...mergedOptions,
            ...dynamicStoreState,
            ...configOptions,
            ...(customSyntaxOrder ? { syntaxOrder: customSyntaxOrder } : {}),
            ...(copulaOverride ? { copulaOverride } : {})
        };

        const settings = resolveTranslatorSettings(effectiveOptions);
        const resolver = buildGrammaticalResolver({
            grammarRules,
            particleDatabase,
            usesParticles,
            settings
        });

        // Locate current active paragraph/sentence around cursor (or full trimmed text if cursor at end)
        const safeCursor = Math.min(Math.max(0, Number.isFinite(cursor) ? cursor : val.length), val.length);

        let targetLineStart = 0;
        let targetLineEnd = val.length;
        const lines = val.split('\n');
        let acc = 0;
        for (let i = 0; i < lines.length; i++) {
            const lineLen = lines[i].length;
            const lineStart = acc;
            const lineEnd = acc + lineLen;
            if (safeCursor >= lineStart && safeCursor <= lineEnd + 1) {
                if (lines[i].trim() || i === 0) {
                    targetLineStart = lineStart;
                    targetLineEnd = lineEnd;
                    break;
                } else if (i > 0 && lines[i - 1].trim()) {
                    targetLineStart = acc - lines[i - 1].length - 1;
                    targetLineEnd = acc - 1;
                    break;
                }
            }
            acc += lineLen + 1;
        }

        const activeText = val.slice(targetLineStart, targetLineEnd).trim() || val.trim();
        if (!activeText) return [];

        const segments = splitSentenceIntoSegments(activeText);
        if (segments.length === 0) return [];

        const clauseResults = [];
        const combinedBreakdown = [];
        const combinedDiagnostics = [];
        const seenDiagIds = new Set();
        const combinedApplied = new Set();

        for (let sIdx = 0; sIdx < segments.length; sIdx++) {
            const seg = segments[sIdx];
            if (!seg || seg.type === 'punct') continue;

            if (seg.type === 'conj') {
                const conjWordRaw = (seg.text || '').trim();
                if (!conjWordRaw) continue;
                const conjCand = findRankedLexiconCandidates(conjWordRaw.toLowerCase(), 'Conjunction')[0];
                const conjWord = conjCand ? conjCand.word : `[${conjWordRaw}]`;
                const conjTok = {
                    id: `conj_${sIdx}`,
                    original: conjWordRaw,
                    lower: conjWordRaw.toLowerCase(),
                    role: 'C',
                    found: Boolean(conjCand),
                    entry: conjCand || null,
                    candidates: conjCand ? [conjCand] : [],
                    type: conjCand ? 'direct' : 'missing',
                    inflected: conjWord
                };
                if (!conjCand) {
                    const id = `word:${conjWordRaw.toLowerCase()}:Conjunction`;
                    if (!seenDiagIds.has(id)) {
                        seenDiagIds.add(id);
                        combinedDiagnostics.push({
                            id,
                            kind: 'word',
                            severity: 'missing',
                            title: `Missing Conjunction: "${conjWordRaw}"`,
                            description: 'Used to link coordinated clauses.',
                            lemma: conjWordRaw.toLowerCase(),
                            original: conjWordRaw,
                            suggestedPos: 'Conjunction'
                        });
                    }
                }
                combinedBreakdown.push(conjTok);
                clauseResults.push(conjWord);
                continue;
            }

            const segText = typeof seg === 'string' ? seg : (seg.text || '');
            const nextSeg = segments[sIdx + 1];
            const punctText = nextSeg?.type === 'punct' ? (nextSeg.text || '').trim() : '';
            const trailingPunct = (punctText === '?' || punctText === '!') ? punctText : '';
            const isQ = segText.trim().endsWith('?')
                || trailingPunct === '?'
                || WH_WORDS.has((segText.trim().split(/\s+/)[0] || '').toLowerCase());

            const segRes = translateSegment({
                segmentText: segText,
                clauseIndex: sIdx,
                trailingPunct,
                isQuestionSegment: isQ,
                settings,
                resolver,
                userManualRoles,
                userWordChoices
            });
            if (!segRes) continue;

            if (segRes.romanized) clauseResults.push(segRes.romanized);
            combinedBreakdown.push(...segRes.wordBreakdown);
            for (const d of segRes.diagnostics) {
                if (!seenDiagIds.has(d.id)) {
                    seenDiagIds.add(d.id);
                    combinedDiagnostics.push(d);
                }
            }
            for (const g of segRes.appliedGrammar) combinedApplied.add(g);
        }

        const rawRomJoined = clauseResults.filter(Boolean).join(' ').trim();
        const display = rawRomJoined ? transliterate(rawRomJoined, lexicon) : '';
        const containsPuaGlyphs = /[\uE000-\uF8FF]/.test(display);
        const romanized = (!containsPuaGlyphs && display) ? display : rawRomJoined;
        const coreLabel = extractCoreOrderLabel(settings.syntaxOrder);

        return [{
            key: `wa_${coreLabel}`,
            type: 'translation',
            label: settings.syntaxOrder,
            effectiveSyntaxOrder: settings.syntaxOrder,
            coreOrderLabel: coreLabel,
            romanized,
            display,
            wordBreakdown: combinedBreakdown,
            reordered: combinedBreakdown,
            lineStart: targetLineStart,
            lineEnd: targetLineEnd,
            diagnostics: combinedDiagnostics,
            appliedGrammar: Array.from(combinedApplied),
            effectiveSettings: settings
        }];
    };

    const auditReadiness = () => auditLanguageReadiness({
        lexicon,
        settings: baseSettings,
        resolver: baseResolver,
        pronounSystem,
        particleDatabase,
        numberSystem
    });

    return {
        computePhraseSuggestion,
        lemmatize,
        matchesTranslation,
        findGrammarRule,
        reorderBreakdown,
        findRankedLexiconCandidates,
        auditReadiness,
        getResolvedSettings: () => baseSettings,
        getResolvedSlotSummary: () => baseResolver.slotSummary
    };
}

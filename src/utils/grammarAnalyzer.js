import { applyRuleToWord } from './morphologyEngine.js';
import nlp from 'compromise';
import {
    rankLexiconMatches,
    buildMultiWordPhraseIndex,
    mergeMultiWordPhrases
} from './wordAssist/lexiconLookup.js';
import {
    resolveEffectiveSyntaxOrder,
    extractCoreOrderLabel,
    reorderClauseBreakdown
} from './wordAssist/syntaxOrdering.js';
import {
    splitSentenceIntoSegments,
    AUX_VERBS
} from './wordAssist/clauseSegmentation.js';

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
    'not', "n't", "don't", "dont", "doesn't", "doesnt", "didn't", "didnt", 
    "won't", "wont", "wouldn't", "wouldnt", "can't", "cant", "cannot", 
    "couldn't", "couldnt", "shouldn't", "shouldnt", "mustn't", "mustnt", 
    "isn't", "isnt", "aren't", "arent", "wasn't", "wasnt", "weren't", "werent", 
    "haven't", "havent", "hasn't", "hasnt", "hadn't", "hadnt", 
    'never', 'no', 'neither', 'nor'
]);

export const NEGATIVE_CONTRACTIONS = {
    "don't": 'not', "dont": 'not',
    "doesn't": 'not', "doesnt": 'not',
    "didn't": 'not', "didnt": 'not',
    "won't": 'not', "wont": 'not',
    "wouldn't": 'not', "wouldnt": 'not',
    "can't": 'not', "cant": 'not', "cannot": 'not',
    "couldn't": 'not', "couldnt": 'not',
    "shouldn't": 'not', "shouldnt": 'not',
    "mustn't": 'not', "mustnt": 'not',
    "isn't": 'not', "isnt": 'not',
    "aren't": 'not', "arent": 'not',
    "wasn't": 'not', "wasnt": 'not',
    "weren't": 'not', "werent": 'not',
    "haven't": 'not', "havent": 'not',
    "hasn't": 'not', "hasnt": 'not',
    "hadn't": 'not', "hadnt": 'not'
};

export const ING_NOUNS = new Set([
    'morning', 'evening', 'spring', 'ceiling', 'building', 'king', 'ring', 'thing', 'wing', 'string', 'sting', 'swing', 'sing',
    'bling', 'ding', 'fling', 'ping', 'sling', 'wedding', 'pudding', 'blessing', 'boarding', 'clothing', 'coating',
    'crossing', 'drawing', 'earning', 'feeling', 'filling', 'finding', 'flooring', 'funding', 'gathering', 'greeting',
    'heading', 'helping', 'inning', 'landing', 'lining', 'meaning', 'meeting', 'opening', 'parking', 'planning', 'posting',
    'reading', 'roofing', 'seating', 'setting', 'serving', 'siding', 'spelling', 'stirring', 'stuffing', 'topping', 'training',
    'warning', 'wiring', 'writing', 'pricing', 'savings', 'earnings', 'belongings', 'surroundings', 'findings', 'proceedings',
    'dealings', 'innings', 'trimmings', 'workings', 'underpinnings', 'outskirts', 'during', 'among', 'along', 'nothing',
    'something', 'anything', 'everything', 'herring', 'sibling', 'darling', 'dumpling',
    'farthing', 'offspring', 'shilling', 'sterling', 'fledgling', 'nestling', 'underling', 'hireling'
]);

export const ING_ADJECTIVES = new Set([
    'interesting', 'boring', 'exciting', 'amazing', 'charming', 'daring', 'demanding', 'thrilling', 'willing', 'unwilling',
    'appealing', 'appalling', 'astonishing', 'convincing', 'cunning', 'dashing', 'daunting', 'deserving', 'distinguishing',
    'embarrassing', 'encouraging', 'entertaining', 'existing', 'fascinating', 'fitting', 'flattering', 'forgiving', 'glaring',
    'haunting', 'imposing', 'inspiring', 'insulting', 'inviting', 'lasting', 'leading', 'living', 'long-lasting', 'loving',
    'misleading', 'missing', 'outstanding', 'overwhelming', 'pressing', 'promising', 'remaining', 'rewarding', 'shocking',
    'smashing', 'startling', 'striking', 'stunning', 'surrounding', 'tiring', 'touching', 'underlying', 'unfolding',
    'unrelenting', 'varying', 'welcoming', 'working'
]);

export const VERB_3SG = new Set([
    'is', 'has', 'does', 'goes', 'says', 'pays', 'plays', 'stays', 'makes', 'takes', 'gives', 'lives', 'loves', 'moves',
    'proves', 'serves', 'saves', 'runs', 'comes', 'becomes', 'seems', 'feels', 'keeps', 'sees', 'meets', 'gets', 'puts',
    'sets', 'lets', 'cuts', 'hits', 'sits', 'fits', 'hurts', 'quits', 'splits', 'knows', 'shows', 'grows', 'flows', 'throws',
    'follows', 'allows', 'borrows', 'needs', 'reads', 'leads', 'feeds', 'breeds', 'speeds', 'bleeds', 'means', 'cleans'
]);

export const S_NOUNS_SING = new Set([
    'status', 'bonus', 'campus', 'census', 'nexus', 'virus', 'focus', 'cactus', 'radius', 'stimulus', 'syllabus', 'apparatus',
    'caucus', 'chorus', 'circus', 'corpus', 'exodus', 'fungus', 'genius', 'hiatus', 'impetus', 'lapsus', 'prospectus', 'ruckus',
    'terminus', 'tinnitus', 'tonus', 'physics', 'mathematics', 'economics', 'politics', 'ethics', 'athletics', 'acoustics',
    'aerobics', 'robotics', 'genetics', 'linguistics', 'statistics', 'logistics', 'gymnastics', 'class', 'glass', 'grass',
    'mass', 'pass', 'less', 'dress', 'press', 'stress', 'mess', 'boss', 'loss', 'cross', 'moss', 'toss', 'plus', 'thus', 'bus', 'pus'
]);

export const ER_BLOCKLIST = new Set([
    'her', 'water', 'butter', 'sister', 'brother', 'mother', 'father', 'daughter', 'winter', 'summer', 'after', 'river',
    'flower', 'tower', 'power', 'cover', 'silver', 'copper', 'timber', 'letter', 'dinner', 'supper', 'chapter', 'answer',
    'cancer', 'center', 'corner', 'counter', 'danger', 'disorder', 'filter', 'finger', 'flutter', 'foster', 'gather',
    'gender', 'hunger', 'laughter', 'lawyer', 'leader', 'leather', 'liver', 'lobster', 'manner', 'master', 'matter',
    'member', 'monster', 'murder', 'offer', 'other', 'oyster', 'partner', 'pepper', 'pitcher', 'plaster', 'poster',
    'powder', 'prefer', 'proper', 'quarter', 'render', 'shelter', 'shower', 'slander', 'soccer', 'spider', 'suffer',
    'sugar', 'thunder', 'traitor', 'transfer', 'trigger', 'tumbler', 'ulcer', 'usher', 'vector', 'vendor', 'venture',
    'weather', 'whisper', 'wonder', 'teacher', 'writer', 'player', 'worker', 'manager', 'officer', 'driver', 'farmer',
    'hunter', 'baker', 'singer', 'dancer', 'painter', 'runner', 'climber', 'fighter', 'rider', 'swimmer', 'winner',
    'loser', 'builder', 'buyer', 'seller', 'dealer', 'healer', 'reader', 'speaker', 'keeper', 'seeker',
    'maker', 'taker', 'breaker', 'shaker', 'helper', 'opener', 'closer', 'owner', 'user', 'view'
]);

export const EST_BLOCKLIST = new Set([
    'forest', 'interest', 'protest', 'contest', 'harvest', 'manifest', 'modest', 'honest', 'arrest', 'earnest', 'request',
    'suggest', 'digest', 'invest', 'infest', 'attest', 'bequest', 'breast', 'chest', 'crest', 'jest', 'nest', 'pest',
    'quest', 'rest', 'test', 'vest', 'west', 'zest', 'beast', 'feast', 'least', 'yeast', 'priest'
]);

export const ED_ADJECTIVES = new Set([
    'naked', 'sacred', 'wicked', 'ragged', 'rugged', 'jagged', 'cragged', 'beloved', 'learned', 'blessed', 'dogged', 'aged',
    'wretched', 'crooked'
]);

export const DITRANSITIVE_VERBS = new Set([
    'give', 'gives', 'gave', 'given', 'send', 'sends', 'sent', 'show', 'shows', 'showed', 'shown',
    'tell', 'tells', 'told', 'teach', 'teaches', 'taught', 'offer', 'offers', 'offered',
    'bring', 'brings', 'brought', 'pass', 'passes', 'passed', 'hand', 'hands', 'handed',
    'pay', 'pays', 'paid', 'buy', 'buys', 'bought', 'sell', 'sells', 'sold',
    'lend', 'lends', 'lent', 'grant', 'grants', 'granted', 'feed', 'feeds', 'fed'
]);

export const COMPARATIVE_IRREGULAR = {
    "better":   { lemma: "good",   type: "comparative" },
    "worse":    { lemma: "bad",    type: "comparative" },
    "farther":  { lemma: "far",    type: "comparative" },
    "further":  { lemma: "far",    type: "comparative" },
    "more":     { lemma: "many",   type: "comparative" },
    "less":     { lemma: "little", type: "comparative" },
    "fewer":    { lemma: "few",    type: "comparative" },
    "elder":    { lemma: "old",    type: "comparative" },
    "older":    { lemma: "old",    type: "comparative" },
    "best":     { lemma: "good",   type: "superlative" },
    "worst":    { lemma: "bad",    type: "superlative" },
    "farthest": { lemma: "far",    type: "superlative" },
    "furthest": { lemma: "far",    type: "superlative" },
    "most":     { lemma: "many",   type: "superlative" },
    "least":    { lemma: "little", type: "superlative" },
    "fewest":   { lemma: "few",    type: "superlative" },
    "eldest":   { lemma: "old",    type: "superlative" },
    "oldest":   { lemma: "old",    type: "superlative" },
    "latest":   { lemma: "late",   type: "superlative" },
    "last":     { lemma: "late",   type: "superlative" },
    "nearest":  { lemma: "near",   type: "superlative" },
    "next":     { lemma: "near",   type: "superlative" },
};

export const IRREGULAR_VERBS = {
    "am":    { lemma: "be",      tense: "present", person: "1st", number: "S" },
    "is":    { lemma: "be",      tense: "present", person: "3rd", number: "S" },
    "are":   { lemma: "be",      tense: "present" },
    "was":   { lemma: "be",      tense: "past",    number: "S" },
    "were":  { lemma: "be",      tense: "past",    number: "P" },
    "been":  { lemma: "be",      tense: "past_participle" },
    "being": { lemma: "be",      tense: "gerund" },
    "does":  { lemma: "do",      tense: "present", person: "3rd", number: "S" },
    "did":   { lemma: "do",      tense: "past" },
    "done":  { lemma: "do",      tense: "past_participle" },
    "has":   { lemma: "have",    tense: "present", person: "3rd", number: "S" },
    "had":   { lemma: "have",    tense: "past",    isParticiple: true },
    "went":  { lemma: "go",      tense: "past" },
    "gone":  { lemma: "go",      tense: "past_participle" },
    "goes":  { lemma: "go",      tense: "present", person: "3rd", number: "S" },
    "saw":   { lemma: "see",     tense: "past" },
    "seen":  { lemma: "see",     tense: "past_participle" },
    "ate":   { lemma: "eat",     tense: "past" },
    "eaten": { lemma: "eat",     tense: "past_participle" },
    "bought":  { lemma: "buy",   tense: "past", isParticiple: true },
    "brought": { lemma: "bring", tense: "past", isParticiple: true },
    "thought": { lemma: "think", tense: "past", isParticiple: true },
    "caught":  { lemma: "catch", tense: "past", isParticiple: true },
    "taught":  { lemma: "teach", tense: "past", isParticiple: true },
    "took":   { lemma: "take",   tense: "past" },
    "taken":  { lemma: "take",   tense: "past_participle" },
    "made":   { lemma: "make",   tense: "past", isParticiple: true },
    "came":   { lemma: "come",   tense: "past" },
    "come":   { lemma: "come",   tense: "past_participle" },
    "said":   { lemma: "say",    tense: "past", isParticiple: true },
    "told":   { lemma: "tell",   tense: "past", isParticiple: true },
    "knew":   { lemma: "know",   tense: "past" },
    "known":  { lemma: "know",   tense: "past_participle" },
    "grew":   { lemma: "grow",   tense: "past" },
    "grown":  { lemma: "grow",   tense: "past_participle" },
    "threw":  { lemma: "throw",  tense: "past" },
    "thrown": { lemma: "throw",  tense: "past_participle" },
    "showed": { lemma: "show",   tense: "past" },
    "shown":  { lemma: "show",   tense: "past_participle" },
    "wrote":  { lemma: "write",  tense: "past" },
    "written":{ lemma: "write",  tense: "past_participle" },
    "rode":   { lemma: "ride",   tense: "past" },
    "ridden": { lemma: "ride",   tense: "past_participle" },
    "drove":  { lemma: "drive",  tense: "past" },
    "driven": { lemma: "drive",  tense: "past_participle" },
    "rose":   { lemma: "rise",   tense: "past" },
    "risen":  { lemma: "rise",   tense: "past_participle" },
    "spoke":   { lemma: "speak",  tense: "past" },
    "spoken":  { lemma: "speak",  tense: "past_participle" },
    "broke":   { lemma: "break",  tense: "past" },
    "broken":  { lemma: "break",  tense: "past_participle" },
    "stole":   { lemma: "steal",  tense: "past" },
    "stolen":  { lemma: "steal",  tense: "past_participle" },
    "froze":   { lemma: "freeze", tense: "past" },
    "frozen":  { lemma: "freeze", tense: "past_participle" },
    "gave":    { lemma: "give",    tense: "past" },
    "given":   { lemma: "give",    tense: "past_participle" },
    "forgave": { lemma: "forgive", tense: "past" },
    "forgiven":{ lemma: "forgive", tense: "past_participle" },
    "found":   { lemma: "find",   tense: "past", isParticiple: true },
    "bound":   { lemma: "bind",   tense: "past", isParticiple: true },
    "ground":  { lemma: "grind",  tense: "past", isParticiple: true },
    "ran":     { lemma: "run",    tense: "past" },
    "run":     { lemma: "run",    tense: "past_participle" },
    "won":     { lemma: "win",    tense: "past", isParticiple: true },
    "began":   { lemma: "begin",  tense: "past" },
    "begun":   { lemma: "begin",  tense: "past_participle" },
    "swam":    { lemma: "swim",   tense: "past" },
    "swum":    { lemma: "swim",   tense: "past_participle" },
    "sang":    { lemma: "sing",   tense: "past" },
    "sung":    { lemma: "sing",   tense: "past_participle" },
    "rang":    { lemma: "ring",   tense: "past" },
    "rung":    { lemma: "ring",   tense: "past_participle" },
    "drank":   { lemma: "drink",  tense: "past" },
    "drunk":   { lemma: "drink",  tense: "past_participle" },
    "shrank":  { lemma: "shrink", tense: "past" },
    "shrunk":  { lemma: "shrink", tense: "past_participle" },
    "put":   { lemma: "put",   tense: "past", isParticiple: true, invariable: true },
    "cut":   { lemma: "cut",   tense: "past", isParticiple: true, invariable: true },
    "hit":   { lemma: "hit",   tense: "past", isParticiple: true, invariable: true },
    "set":   { lemma: "set",   tense: "past", isParticiple: true, invariable: true },
    "let":   { lemma: "let",   tense: "past", isParticiple: true, invariable: true },
    "shut":  { lemma: "shut",  tense: "past", isParticiple: true, invariable: true },
    "cost":  { lemma: "cost",  tense: "past", isParticiple: true, invariable: true },
    "hurt":  { lemma: "hurt",  tense: "past", isParticiple: true, invariable: true },
    "quit":  { lemma: "quit",  tense: "past", isParticiple: true, invariable: true },
    "read":  { lemma: "read",  tense: "past", isParticiple: true, invariable: true },
    "spread":{ lemma: "spread",tense: "past", isParticiple: true, invariable: true },
    "cast":  { lemma: "cast",  tense: "past", isParticiple: true, invariable: true },
    "burst": { lemma: "burst", tense: "past", isParticiple: true, invariable: true },
};

export const PRONOUN_MAP = {
    'i':      { base: 'i',    person: '1st', number: 'S', role: 'S' },
    'me':     { base: 'i',    person: '1st', number: 'S', role: 'O', case: 'objective' },
    'my':     { base: 'i',    person: '1st', number: 'S', role: null, case: 'genitive' },
    'mine':   { base: 'i',    person: '1st', number: 'S', role: null, case: 'genitive' },
    'we':     { base: 'we',   person: '1st', number: 'P', role: 'S' },
    'us':     { base: 'we',   person: '1st', number: 'P', role: 'O', case: 'objective' },
    'our':    { base: 'we',   person: '1st', number: 'P', role: null, case: 'genitive' },
    'ours':   { base: 'we',   person: '1st', number: 'P', role: null, case: 'genitive' },
    'you':    { base: 'you',  person: '2nd', number: 'S', role: null },
    'your':   { base: 'you',  person: '2nd', number: 'S', role: null, case: 'genitive' },
    'yours':  { base: 'you',  person: '2nd', number: 'S', role: null, case: 'genitive' },
    'he':     { base: 'he',   person: '3rd', number: 'S', gender: 'Masc', role: 'S' },
    'him':    { base: 'he',   person: '3rd', number: 'S', gender: 'Masc', role: 'O', case: 'objective' },
    'his':    { base: 'he',   person: '3rd', number: 'S', gender: 'Masc', role: null, case: 'genitive' },
    'she':    { base: 'she',  person: '3rd', number: 'S', gender: 'Fem',  role: 'S' },
    'her':    { base: 'she',  person: '3rd', number: 'S', gender: 'Fem',  role: 'O', case: 'objective' },
    'hers':   { base: 'she',  person: '3rd', number: 'S', gender: 'Fem',  role: null, case: 'genitive' },
    'it':     { base: 'it',   person: '3rd', number: 'S', gender: 'Neut', role: null },
    'its':    { base: 'it',   person: '3rd', number: 'S', gender: 'Neut', role: null, case: 'genitive' },
    'they':   { base: 'they', person: '3rd', number: 'P', role: 'S' },
    'them':   { base: 'they', person: '3rd', number: 'P', role: 'O', case: 'objective' },
    'their':  { base: 'they', person: '3rd', number: 'P', role: null, case: 'genitive' },
    'theirs': { base: 'they', person: '3rd', number: 'P', role: null, case: 'genitive' },
};

export const GRAMMAR_RULE_IMPORT_MAP = [
    { keywords: ['past', 'preterit', 'preterite'], trigger: 'was, did', type: 'word', position: 'suffix' },
    { keywords: ['future'], trigger: 'will', type: 'word', position: 'suffix' },
    { keywords: ['perfect'], trigger: 'have, has, had', type: 'word', position: 'suffix' },
    { keywords: ['plural'], trigger: '-s', type: 'suffix', position: 'suffix' },
    { keywords: ['negat', 'negative'], trigger: 'not', type: 'word', position: 'prefix' },
    { keywords: ['gerund', 'continuous', 'progressive'], trigger: '-ing', type: 'suffix', position: 'suffix' },
    { keywords: ['passive'], trigger: 'was, been', type: 'word', position: 'suffix' },
    { keywords: ['possessive', 'genitive'], trigger: "'s", type: 'suffix', position: 'suffix' },
    { keywords: ['comparative'], trigger: 'more, -er', type: 'word', position: 'before' },
    { keywords: ['superlative'], trigger: 'most, -est', type: 'word', position: 'before' },
    { keywords: ['agentive'], trigger: '-er, -or', type: 'suffix', position: 'suffix' },
    { keywords: ['object', 'accusative'], trigger: 'O', type: 'trigger', position: 'suffix' },
    { keywords: ['subject', 'nominative', 'ergative'], trigger: 'S', type: 'trigger', position: 'suffix' },
    { keywords: ['dative', 'indirect'], trigger: 'D', type: 'trigger', position: 'suffix' },
    { keywords: ['locative', 'place'], trigger: 'L', type: 'trigger', position: 'suffix' },
];

export const TYPE_COLORS = { direct: 'var(--acc)', pronoun: '#10b981', inflected: '#f59e0b', 'grammar-case': '#ec4899' };
export const TYPE_LABELS = { direct: 'lexicon', pronoun: 'pronoun', inflected: 'conjugated', 'grammar-case': 'case' };

export const PREPOSITION_CASE_MAP = {
    'in': 'locative',
    'on': 'locative',
    'at': 'locative',
    'inside': 'locative',
    'within': 'locative',
    'with': 'instrumental',
    'by': 'instrumental',
    'from': 'ablative',
    'out of': 'ablative',
    'off': 'ablative',
    'to': 'allative',
    'into': 'allative',
    'onto': 'allative',
    'towards': 'allative',
    'toward': 'allative',
    'for': 'dative',
    'of': 'genitive',
    'than': 'ablative'
};

const ANIMACY_SCOPES = {
    "pronoun_1_2": {
        description: "1st/2nd Person only",
        test: (entry, pInfo) => pInfo && (pInfo.person === "1st" || pInfo.person === "2nd")
    },
    "pronoun": {
        description: "Any personal pronoun",
        test: (entry, pInfo) => !!pInfo
    },
    "human": {
        description: "Pronouns + Humans/Persons",
        test: (entry, pInfo) => !!pInfo || /(pronoun|person|human|name|animate)/i.test(entry?.wordClass || "") || (entry?.tags || []).some(t => /(person|human|animate|name|proper)/i.test(t))
    },
    "animate": {
        description: "Humans + Animals",
        test: (entry, pInfo) => !!pInfo || /(pronoun|person|human|animal|animate|creature|beast)/i.test(entry?.wordClass || "") || (entry?.tags || []).some(t => /(animate|person|human|animal|creature)/i.test(t))
    },
    "concrete": {
        description: "Concrete objects",
        test: (entry, pInfo) => !!pInfo || (!(entry?.tags || []).includes("abstract") && !(entry?.tags || []).includes("concept"))
    },
    "all": {
        description: "No restriction",
        test: () => true
    }
};

const HUMAN_WORDS_EN = new Set([
    "person","man","woman","boy","girl","child","baby","adult","human",
    "father","mother","son","daughter","brother","sister","parent","sibling",
    "friend","enemy","teacher","student","doctor","nurse","king","queen",
    "prince","princess","lord","lady","sir","madam","hero","villain",
    "leader","follower","master","servant","owner","guest","host","visitor",
    "citizen","soldier","guard","priest","monk","witch","wizard","warrior",
    "merchant","farmer","hunter","baker","maker","worker","player","artist",
    "writer","speaker","reader","thinker","listener"
]);

const ANIMAL_WORDS_EN = new Set([
    "dog","cat","bird","fish","horse","cow","pig","sheep","goat","deer",
    "wolf","bear","lion","tiger","elephant","monkey","snake","frog","bee",
    "ant","fly","spider","worm","mouse","rat","rabbit","fox","duck","owl",
    "eagle","shark","whale","dolphin","dragon","creature","beast","animal"
]);

const CASE_NEVER_WORDS = new Set([
    "myself", "yourself", "himself", "herself", "itself",
    "ourselves", "yourselves", "themselves", "oneself",
    "it", "there"
]);

const COPULA_VERBS = new Set([
    "am", "is", "are", "was", "were", "be", "been", "being", "become", "seem", "appear",
    "look", "feel", "sound", "smell", "taste", "remain", "stay", "turn"
]);

const FUNCTION_WORDS = new Set([
    'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'and', 'or', 'but', 'if', 'as',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did', 'have', 'has', 'had',
    'my', 'your', 'his', 'her', 'its', 'our', 'their', 'me', 'us', 'him', 'them'
]);

function getAnimacyLevel(token, lexEntry, pronounInfo) {
    if (pronounInfo) {
        return (pronounInfo.person === "1st" || pronounInfo.person === "2nd") ? "pronoun_1_2" : "pronoun";
    }
    const wc = (lexEntry?.wordClass || "").toLowerCase();
    const tags = (lexEntry?.tags || []).map(t => t.toLowerCase());
    const q = (token.original || "").toLowerCase();

    if (wc.includes("proper") || wc.includes("name") || tags.some(t => ["person","human","name","proper","character"].includes(t))) return "human";
    if (wc.includes("person") || wc.includes("human") || HUMAN_WORDS_EN.has(q)) return "human";
    if (wc.includes("animal") || wc.includes("creature") || tags.some(t => ["animal","creature","beast"].includes(t)) || ANIMAL_WORDS_EN.has(q)) return "animate";
    if (tags.some(t => ["abstract","concept"].includes(t))) return "abstract";
    
    if (/^[A-Z]/.test(token.original || "") && token.sentencePosition > 0) return "human";

    return "concrete";
}

function getDefiniteness(tokenIdx, allTokens) {
    const q = (allTokens[tokenIdx]?.original || "").toLowerCase();
    const isPronoun = ["i","me","you","he","him","she","her","it","we","us","they","them"].includes(q);
    
    const prev = allTokens.slice(Math.max(0, tokenIdx - 2), tokenIdx).map(t => (t.original || "").toLowerCase());
    const isDefinite = isPronoun || prev.some(p => p === "the" || ["this","that","these","those"].includes(p) || ["my","your","his","her","its","our","their"].includes(p));
    const isIndefinite = !isPronoun && prev.some(p => p === "a" || p === "an") && !isDefinite;
    const isSpecific = isDefinite || /^[A-Z]/.test(allTokens[tokenIdx]?.original || "");
    
    return { isDefinite, isIndefinite, isSpecific };
}

function applyCaseToObject(token, trigger, lexEntry, pronounInfo, context) {
    if (!token || !trigger || trigger.type !== "trigger") return false;
    if (token.role !== trigger.trigger) return false;
    if (CASE_NEVER_WORDS.has((token.original || "").toLowerCase())) return false;

    const dom = trigger.domConditions || {};
    const scope = dom.animacyMin || trigger.scope || "all";
    
    const animacyLevel = getAnimacyLevel(token, lexEntry, pronounInfo);
    if (scope !== "all") {
        const tester = ANIMACY_SCOPES[scope];
        if (tester && !tester.test(lexEntry, pronounInfo)) {
            const hierarchy = ["pronoun_1_2", "pronoun", "human", "animate", "concrete", "abstract", "all"];
            if (hierarchy.indexOf(animacyLevel) > hierarchy.indexOf(scope)) return false;
        }
    }

    if (dom.requiresDefinite && !context.isDefinite) return false;
    if (dom.requiresIndefinite && !context.isIndefinite) return false;
    if (dom.requiresSpecific && !context.isSpecific) return false;
    if (dom.numberRestriction && token.number !== dom.numberRestriction) return false;
    
    if (dom.personRestriction) {
        const allowed = Array.isArray(dom.personRestriction) ? dom.personRestriction : [dom.personRestriction];
        if (!allowed.includes(pronounInfo?.person || token.person)) return false;
    }
    
    if (dom.genderRestriction) {
        const g = pronounInfo?.gender || lexEntry?.gender;
        if (g !== dom.genderRestriction) return false;
    }

    if (dom.requiredTags?.length > 0) {
        const tags = (lexEntry?.tags || []).map(t => t.toLowerCase());
        if (!dom.requiredTags.every(rt => tags.includes(rt.toLowerCase()))) return false;
    }

    if (dom.excludedTags?.length > 0) {
        const tags = (lexEntry?.tags || []).map(t => t.toLowerCase());
        if (dom.excludedTags.some(et => tags.includes(et.toLowerCase()))) return false;
    }

    return true;
}

export function createGrammarAnalyzer(configOptions = {}) {
    const storeState = typeof storeGetter?.getState === 'function' ? storeGetter.getState() : {};

    const { 
        lexicon = storeState.lexicon || [],
        grammarRules = storeState.grammarRules || [],
        syntaxOrder = storeState.syntaxOrder || 'SVO',
        waConfig = storeState.wordAssistConfig || storeState.waConfig || {},
        personRulesArray = storeState.personRulesArray || [],
        overrideCopulaBehavior = null, 
        transliterate = (s) => s,
        normalizeToBase = (s) => s,
        adjectivePlacement = storeState.adjectivePlacement || 'pre-nominal',
        adjectiveAgreement = storeState.adjectiveAgreement ?? false,
        adpositionPlacement = storeState.adpositionPlacement || waConfig?.adpPos || (syntaxOrder.startsWith('SOV') ? 'post' : 'pre'),
        proDropMode = storeState.proDropMode || waConfig?.proDrop || 'always',
        alignment = storeState.alignment || waConfig?.alignment || 'accusative',
        caseSensitive = storeState.caseSensitiveOrthography ?? false,
        verbMarker = storeState.verbMarker || configOptions.verbMarker || '',
        replacePrepositionsWithCase = true
    } = configOptions;

    const adjPosDefault = adjectivePlacement === 'post-nominal' ? 'after' : (waConfig?.adjPos || 'before');
    const isPostpositional = adpositionPlacement === 'post' || adpositionPlacement === 'after' || waConfig?.adpPos === 'after';

    // Multilingual POS mapper supporting English, Portuguese, and standard linguistic abbreviations
    const getRoleFromWordClass = (wc, preferredRole = null) => {
        if (!wc) return null;
        const classes = String(wc).toLowerCase().split(/[,/|]+/).map(c => c.trim()).filter(Boolean);
        if (classes.length === 0) return null;

        const roleForClass = (c) => {
            if (c.includes('negat') || c.includes('negação') || c.includes('negacao')) return 'N';
            if (c.includes('modal') || c.includes('aux')) return 'M';
            if (c.includes('verb') || c.includes('verbo') || c === 'v' || c === 'v.') return 'V';
            if (c.includes('adj') || c.includes('adjetivo') || c === 'a.') return 'J';
            if (c.includes('adv') || c.includes('adverb') || c.includes('advérbio') || c.includes('adverbio') || c === 'adv.') {
                return preferredRole === 'N' ? 'N' : 'R';
            }
            if (c.includes('prep') || c.includes('preposição') || c.includes('preposicao') || c.includes('posp') || c.includes('adpos')) return 'P';
            if (c.includes('conj') || c.includes('conjunção') || c.includes('conjuncao')) return 'C';
            if (c.includes('part') || c.includes('partícula') || c.includes('particula')) {
                return preferredRole === 'N' ? 'N' : 'C';
            }
            if (c.includes('interrog') || c.includes('question') || c.includes('interrogativo')) return 'Q';
            if (c.includes('art') || c.includes('artigo') || c.includes('determiner')) return 'A';
            if (c.includes('pronoun') || c.includes('pronome') || c.includes('pronom')) return 'NOUN';
            if (c.includes('noun') || c.includes('subst') || c.includes('substantivo') || c.includes('nome') || c === 'n' || c === 'n.' || c === 's' || c === 's.') return 'NOUN';
            return null;
        };

        const roles = classes.map(roleForClass).filter(Boolean);
        if (roles.length === 0) return null;

        if (preferredRole) {
            const prefNorm = (preferredRole === 'S' || preferredRole === 'O' || preferredRole === 'D' || preferredRole === 'L') ? 'NOUN' : preferredRole;
            if (roles.includes(prefNorm)) return prefNorm;
            if (preferredRole === 'N' && classes.some(c => c.includes('part') || c.includes('adv') || c.includes('neg'))) {
                return 'N';
            }
        }

        return roles[0];
    };

    // Multilingual POS matcher supporting English, Portuguese, and standard linguistic abbreviations
    const matchesPos = (wc, r) => {
        if (!wc || !r) return false;
        const target = (r === 'NOUN' || ['S', 'O', 'D', 'L'].includes(r)) ? 'NOUN' : r;
        const classes = String(wc).toLowerCase().split(/[,/|]+/).map(c => c.trim()).filter(Boolean);
        for (const c of classes) {
            const role = getRoleFromWordClass(c, target);
            if (!role) continue;
            if (target === 'NOUN') {
                if (role === 'NOUN') return true;
            } else if (target === 'V') {
                if (role === 'V') return true;
            } else if (target === 'M') {
                if (role === 'M') return true;
            } else if (target === 'N') {
                if (role === 'N' || c.includes('neg') || c.includes('part') || c.includes('adv')) return true;
            } else if (role === target) {
                return true;
            }
        }
        return false;
    };

    // Centralized helper to apply phonological/morphological rules using useConfigStore state
    const applyPhonologicalRule = (word, rule) => {
        if (!word || !rule) return word;
        const vStore = typeof storeGetter?.getState === 'function' ? storeGetter.getState() : storeState;
        const cleanWord = caseSensitive ? word.normalize('NFC') : word;

        // Idempotency guard: prevent duplicate affixes (e.g. ir'ir')
        if (rule.affix) {
            const rawAffix = rule.affix.trim();
            const cleanAffix = rawAffix.replace(/^[-=']+|[-=']+$/g, '');
            if (cleanAffix) {
                if (rawAffix.endsWith('-') || rawAffix.endsWith("'")) {
                    // Prefix rule
                    if (cleanWord.startsWith(cleanAffix) || cleanWord.startsWith(rawAffix)) return cleanWord;
                } else if (rawAffix.startsWith('-') || rawAffix.startsWith("'")) {
                    // Suffix rule
                    if (cleanWord.endsWith(cleanAffix) || cleanWord.endsWith(rawAffix)) return cleanWord;
                }
            }
        }

        return applyRuleToWord(
            cleanWord,
            rule,
            grammarRules,
            vStore?.vowels || '',
            vStore?.consonants || '',
            vStore?.otherPhonemes || ''
        );
    };

    const applyAffixToBase = (base, affix, ruleObj = null) => {
        if (!base || !affix) return base;
        if (ruleObj && (ruleObj.condition || ruleObj.regex || ruleObj.affix?.includes('=>'))) {
            try {
                return applyPhonologicalRule(base, ruleObj);
            } catch (e) {
                console.error(e);
            }
        }
        const a = affix.trim();
        const cleanAffix = a.replace(/^[-=']+|[-=']+$/g, '');

        // Idempotency check: don't double-apply suffix or prefix
        if (a.startsWith('-') || a.startsWith("'")) {
            const s = a.startsWith('-') ? a.slice(1) : a;
            if (base.endsWith(cleanAffix) || base.endsWith(s)) return base;
            return base + s;
        }
        if (a.endsWith('-') || a.endsWith("'")) {
            const p = a.endsWith('-') ? a.slice(0, -1) : a;
            if (base.startsWith(cleanAffix) || base.startsWith(p)) return base;
            return p + base;
        }
        return base + ' ' + a;
    };

    // Build multi-word lexicon phrase index once per analyzer instance
    const multiWordPhraseIndex = buildMultiWordPhraseIndex(lexicon);

    const matchesTranslation = (translation, q) => {
        if (!translation || !q) return false;
        return rankLexiconMatches([{ translation, word: translation }], q).length > 0;
    };

    const getMatchOptions = (preferredRole = null, isLemmaFallback = false) => ({
        preferredRole,
        normalizeToBase,
        getRoleFromWordClass,
        matchesPos,
        isLemmaFallback,
        negativeContractions: NEGATIVE_CONTRACTIONS
    });

    // Centralized POS-aware scored lexicon lookup (memoized per analyzer instance)
    const candidateCache = new Map();
    const findRankedLexiconCandidates = (query, preferredRole = null, lemma = null) => {
        if (!query || !Array.isArray(lexicon)) return [];
        const cacheKey = `${String(query).toLowerCase()}\0${preferredRole || ''}\0${lemma ? String(lemma).toLowerCase() : ''}`;
        if (candidateCache.has(cacheKey)) {
            return candidateCache.get(cacheKey);
        }

        const surfaceRanked = rankLexiconMatches(lexicon, query, getMatchOptions(preferredRole, false));
        if (!lemma || lemma.toLowerCase() === query.toLowerCase()) {
            candidateCache.set(cacheKey, surfaceRanked);
            return surfaceRanked;
        }
        const lemmaRanked = rankLexiconMatches(lexicon, lemma, getMatchOptions(preferredRole, true));
        if (surfaceRanked.length === 0) {
            candidateCache.set(cacheKey, lemmaRanked);
            return lemmaRanked;
        }

        // Merge any additional candidates from lemma without dropping higher-scoring surface hits
        const seen = new Set(surfaceRanked.map(r => r.entry.id != null ? `id:${r.entry.id}` : r.entry.word));
        const merged = [...surfaceRanked];
        for (const cand of lemmaRanked) {
            const key = cand.entry.id != null ? `id:${cand.entry.id}` : cand.entry.word;
            if (!seen.has(key)) {
                seen.add(key);
                merged.push(cand);
            }
        }
        merged.sort((a, b) => b.score - a.score);
        candidateCache.set(cacheKey, merged);
        return merged;
    };

    const findLexiconMatches = (query, preferredRole = null) => {
        return findRankedLexiconCandidates(query, preferredRole, null).map(r => r.entry);
    };

    const resolveEnglishStem = (rawStem, originalWord, suffixType) => {
        const candidates = [rawStem];
        if (['s', 'es', 'ed', 'ing', 'er', 'est'].includes(suffixType)) {
            candidates.push(rawStem + 'e'); // lov -> love, mak -> make, se -> see
            if (rawStem.length >= 3 && rawStem[rawStem.length - 1] === rawStem[rawStem.length - 2]) {
                candidates.push(rawStem.slice(0, -1)); // runn -> run, stopp -> stop
            }
            if (rawStem.endsWith('i')) {
                candidates.push(rawStem.slice(0, -1) + 'y'); // tri -> try, happi -> happy
            }
        }
        for (const cand of candidates) {
            if (findLexiconMatches(cand).length > 0) {
                return cand;
            }
        }
        return rawStem;
    };

    const lemmatize = (word, context = {}) => {
        const lower = (word || '').normalize('NFC').toLowerCase();
        const { prevTokens = [], preferredRole = null } = context;
        const prev1 = prevTokens[prevTokens.length - 1]?.toLowerCase();

        // Level 0: Blocklists & Irregulars
        if (IRREGULAR_VERBS[lower]) return { ...IRREGULAR_VERBS[lower] };
        if (PRONOUN_MAP[lower]) return { lemma: PRONOUN_MAP[lower].base, tense: 'present', ...PRONOUN_MAP[lower] };
        if (COMPARATIVE_IRREGULAR[lower]) return { ...COMPARATIVE_IRREGULAR[lower] };

        // Level 1: Direct Lexicon Match (context-aware when preferredRole is known)
        const lexMatches = findLexiconMatches(lower, preferredRole);
        if (lexMatches.length > 0) {
            const literalMatch = lexMatches[0];
            const wc = (literalMatch.wordClass || '').toLowerCase();
            const role = getRoleFromWordClass(wc, preferredRole);
            const isNoun = role === 'NOUN';
            const isVerb = role === 'V';
            return {
                lemma: lower,
                wordClass: literalMatch.wordClass,
                role: role || (isNoun ? 'NOUN' : isVerb ? 'V' : undefined),
                entry: literalMatch,
                tense: 'present',
                ...(isNoun ? { person: '3rd', number: 'S' } : {})
            };
        }

        // Level 2: Suffix Analysis
        if (lower.endsWith('ing')) {
            if (ING_NOUNS.has(lower)) return { lemma: lower, wordClass: 'Noun', person: '3rd', number: 'S' };
            if (ING_ADJECTIVES.has(lower)) return { lemma: lower, wordClass: 'Adjective' };
            const rawStem = lower.slice(0, -3);
            if (rawStem.length < 2) return { lemma: lower, wordClass: 'Noun', person: '3rd', number: 'S' };
            const stem = resolveEnglishStem(rawStem, lower, 'ing');
            if (['am', 'is', 'are', 'was', 'were', 'been', 'be'].includes(prev1)) return { lemma: stem, tense: 'gerund', role: 'V' };
            return { lemma: stem, tense: 'gerund' };
        }

        if (lower.endsWith('s') && !lower.endsWith('ss')) {
            if (S_NOUNS_SING.has(lower)) return { lemma: lower, singular: true, wordClass: 'Noun', person: '3rd', number: 'S' };

            const candidateStems = [];
            if (lower.endsWith('ies')) candidateStems.push(lower.slice(0, -3) + 'y');
            if (lower.endsWith('es')) {
                candidateStems.push(lower.slice(0, -1)); // sees -> see, makes -> make
                candidateStems.push(lower.slice(0, -2)); // watches -> watch, boxes -> box
            } else {
                candidateStems.push(lower.slice(0, -1)); // cats -> cat, runs -> run
            }

            const verbStem = candidateStems.find(stem => {
                const matches = findLexiconMatches(stem, 'V');
                return matches.some(m => matchesPos(m.wordClass, 'V'));
            });
            const nounStem = candidateStems.find(stem => {
                const matches = findLexiconMatches(stem, 'NOUN');
                return matches.some(m => matchesPos(m.wordClass, 'NOUN'));
            });

            const afterDetOrNum = prev1 && ['the', 'a', 'an', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'two', 'three', 'four', 'five', 'many', 'some', 'few', 'these', 'those', 'all'].includes(prev1);
            if (!afterDetOrNum && (preferredRole === 'V' || (verbStem && !nounStem) || VERB_3SG.has(lower) || ['he', 'she', 'it'].includes(prev1))) {
                const chosenStem = verbStem || candidateStems[0];
                return { lemma: chosenStem, person: '3rd', number: 'S', tense: 'present' };
            }

            const chosenNounStem = nounStem || candidateStems[0];
            return { lemma: chosenNounStem, isPlural: true, person: '3rd', number: 'P' };
        }

        if (lower.endsWith('er')) {
            if (ER_BLOCKLIST.has(lower)) return { lemma: lower, wordClass: 'Noun', person: '3rd', number: 'S' };
            const rawStem = lower.endsWith('ier') ? lower.slice(0, -3) + 'y' : lower.slice(0, -2);
            const stem = resolveEnglishStem(rawStem, lower, 'er');
            const isAdj = findLexiconMatches(stem, 'J').some(e => matchesPos(e.wordClass, 'J'));
            if (isAdj) return { lemma: stem, case: 'comparative' };
        }

        if (lower.endsWith('est')) {
            if (EST_BLOCKLIST.has(lower)) return { lemma: lower };
            const rawStem = lower.endsWith('iest') ? lower.slice(0, -4) + 'y' : lower.slice(0, -3);
            const stem = resolveEnglishStem(rawStem, lower, 'est');
            return { lemma: stem, case: 'superlative' };
        }

        if (lower.endsWith('ed')) {
            if (ED_ADJECTIVES.has(lower)) return { lemma: lower, wordClass: 'Adjective' };
            const isPerfect = ['have', 'has', 'had'].includes(prev1);
            const isPassive = ['was', 'were', 'been'].includes(prev1);
            const rawStem = lower.slice(0, -2);
            const stem = resolveEnglishStem(rawStem, lower, 'ed');
            return { lemma: stem, tense: 'past', isParticiple: true, isPerfect, isPassive };
        }

        if (lower.endsWith("'s") || lower.endsWith("’s")) {
            return { lemma: lower.slice(0, -2), case: 'genitive', person: '3rd', number: 'S' };
        }

        return { lemma: lower, tense: 'present', person: '3rd', number: 'S' };
    };

    const reorderBreakdown = (breakdownArray, targetSyntaxOrder = syntaxOrder) => {
        const effSyntaxOrder = resolveEffectiveSyntaxOrder(waConfig?.syntaxOrder, targetSyntaxOrder, syntaxOrder);
        return reorderClauseBreakdown(breakdownArray, {
            effectiveSyntaxOrder: effSyntaxOrder,
            adjPosDefault,
            waConfig,
            isPostpositional,
            adjectiveAgreement,
            applyPhonologicalRule
        });
    };

    const resolveTempo = (stack) => {
        if (!stack || stack.length === 0) return null;
        if (stack.includes('will') || stack.includes('shall')) return 'future';
        if (stack.includes('had')) return 'past_perfect';
        if (stack.includes('have') || stack.includes('has')) return 'perfect';
        if (stack.includes('be_past') || stack.includes('was') || stack.includes('were') || stack.includes('did')) return 'past';
        if (stack.includes('would')) return 'conditional';
        return null;
    };

    const findGrammarRule = (trigger, fallbackName) => {
        if (!grammarRules) return null;
        const lt = (trigger || '').toLowerCase();
        const lf = (fallbackName || '').toLowerCase();

        const aliases = {
            'nominative': ['nominative', 'nominativo', 'nom'],
            'accusative': ['accusative', 'acusativo', 'acusative', 'acc', 'obj', 'objective'],
            'ergative': ['ergative', 'ergativo', 'erg'],
            'absolutive': ['absolutive', 'absolutivo', 'abs'],
            'dative': ['dative', 'dativo', 'dat', 'indirect_object', 'recipient', 'benefactive'],
            'ablative': ['ablative', 'ablativo', 'abl', 'than', 'comparative_target', 'elative'],
            'allative': ['allative', 'allativo', 'all', 'illative', 'directional'],
            'locative': ['locative', 'locativo', 'loc', 'inessive', 'adessive'],
            'instrumental': ['instrumental', 'instrument', 'comitative', 'ins', 'inst'],
            'genitive': ['genitive', 'genitivo', 'possessive', 'possessivo', 'gen'],
            'vocative': ['vocative', 'vocativo', 'voc'],
            'plural': ['plural', 'pl'],
            'past': ['past', 'pretérito', 'preterite', 'ed'],
            'future': ['future', 'futuro'],
            'comparative': ['comparative', 'comparativo', 'er'],
            'superlative': ['superlative', 'superlativo', 'est']
        };

        const targets = new Set([lt, lf].filter(Boolean));
        if (aliases[lt]) aliases[lt].forEach(a => targets.add(a));
        if (aliases[lf]) aliases[lf].forEach(a => targets.add(a));

        let found = grammarRules.find(r => targets.has((r.waTrigger || '').toLowerCase()));
        if (found) return found;

        found = grammarRules.find(r => targets.has((r.gloss || '').toLowerCase()));
        if (found) return found;

        found = grammarRules.find(r => targets.has((r.name || '').toLowerCase()));
        if (found) return found;

        return grammarRules.find(r => {
            const rn = (r.name || '').toLowerCase();
            const rg = (r.gloss || '').toLowerCase();
            return [...targets].some(t => (t.length > 2 && rn.includes(t)) || (rg && t.length >= 2 && rg.includes(t)));
        });
    };

    const computePhraseSuggestion = (
        val,
        cursor,
        customSyntaxOrder = syntaxOrder,
        userManualRoles = {},
        copulaOverride = overrideCopulaBehavior,
        userWordChoices = {}
    ) => {
        const safeCursor = typeof cursor === 'number' ? cursor : val.length;
        const lineStart = val.lastIndexOf('\n', safeCursor - 1) + 1;
        const rawEnd = val.indexOf('\n', safeCursor);
        const lineEnd = rawEnd === -1 ? val.length : rawEnd;
        let line = val.slice(lineStart, lineEnd).trim();
        if (!line && val.trim()) {
            const nonEmpties = val.split('\n').map(l => l.trim()).filter(Boolean);
            line = nonEmpties[nonEmpties.length - 1] || '';
        }
        if (!line) return null;

        const effectiveSyntaxOrder = resolveEffectiveSyntaxOrder(waConfig?.syntaxOrder, customSyntaxOrder, syntaxOrder);

        const PREPOSITIONS = new Set([
            'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'about', 'under', 'over',
            'into', 'onto', 'through', 'after', 'before', 'between', 'during', 'without', 'against',
            'near', 'beside', 'behind', 'above', 'below', 'around', 'toward', 'towards'
        ]);
        const ARTICLES = new Set(['the', 'a', 'an']);
        const QUESTION_WORDS = new Set(['who', 'what', 'where', 'when', 'why', 'how', 'which', 'whom', 'whose']);
        const TIME_WORDS = new Set([
            'now', 'then', 'today', 'tomorrow', 'yesterday', 'tonight', 'always', 'sometimes', 'often',
            'already', 'soon', 'recently', 'early', 'late'
        ]);
        const PLACE_WORDS = new Set(['here', 'there', 'everywhere', 'nowhere', 'somewhere', 'anywhere', 'inside', 'outside']);
        const CONJUNCTIONS = new Set(['and', 'or', 'but', 'if', 'as', 'because', 'so', 'although', 'though', 'unless', 'until', 'while', 'since', 'yet', 'whereas']);
        const NUMERALS = new Set([
            'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
            'eleven', 'twelve', 'twenty', 'hundred', 'thousand', 'first', 'second', 'third'
        ]);
        const QUANTIFIER_OR_DEM = new Set([
            'all', 'some', 'none', 'any', 'both', 'each', 'few', 'many', 'several',
            'everything', 'nothing', 'anything', 'something', 'everyone', 'someone',
            'anyone', 'nobody', 'everybody', 'somebody', 'anybody', 'much', 'more',
            'most', 'enough', 'other', 'others', 'another', 'every',
            'this', 'that', 'these', 'those'
        ]);
        const LY_NON_ADVERBS = new Set(['family', 'early', 'friendly', 'lovely', 'lonely', 'silly', 'ugly', 'likely', 'only', 'holy', 'belly', 'jelly', 'ally', 'fly', 'reply', 'supply', 'apply']);
        const DEGREE_OR_MANNER_ADVS = new Set(['very', 'quite', 'too', 'rather', 'really', 'almost', 'just', 'still', 'also', 'even', 'well', 'fast']);

        const globalOverrides = (waConfig?.roleOverrides || []).reduce((acc, curr) => {
            if (curr.word && curr.role) {
                curr.word.split(',').map(w => w.trim().toLowerCase()).filter(Boolean).forEach(w => {
                    acc[w] = curr.role;
                });
            }
            return acc;
        }, {});
        const mergedOverrides = { ...globalOverrides, ...userManualRoles };

        const getOverrideForToken = (occKey, low) => {
            return userManualRoles[occKey] || mergedOverrides[low] || null;
        };

        const getChoiceForToken = (occKey, low) => {
            if (Object.prototype.hasOwnProperty.call(userWordChoices, occKey)) return userWordChoices[occKey];
            if (Object.prototype.hasOwnProperty.call(userWordChoices, low)) return userWordChoices[low];
            return null;
        };

        const formatCandidates = (rankedList, selectedEntry) => {
            return (rankedList || []).slice(0, 8).map(item => {
                const entry = item.entry || item;
                const cleanWord = (entry.word || '').replace(/\*/g, '');
                return {
                    id: entry.id != null ? String(entry.id) : `${cleanWord}__${entry.wordClass || ''}`,
                    word: cleanWord,
                    conlang: transliterate(cleanWord, lexicon),
                    translation: entry.translation || '',
                    shortTranslation: entry.shortTranslation || '',
                    definition: entry.definition || '',
                    wordClass: entry.wordClass || '',
                    matchSource: item.matchSource || 'lexicon',
                    score: item.score ?? 0,
                    isSelected: entry === selectedEntry
                };
            });
        };

        const applyTokenInflectionsAndMarkers = ({
            q,
            fullForm,
            info,
            context,
            role,
            i,
            tokens,
            finalRoles,
            match,
            rankedCandidates,
            personRule,
            isAuxiliary,
            isArticle,
            isSupportDo,
            isCopulaPredicate,
            isComparisonTarget,
            hasObject,
            activeTense,
            wordMarkers,
            isCopulaReplacement
        }) => {
            let phraseNegated = false;

            if (isCopulaReplacement && !match) {
                match = { word: q, wordClass: 'Verb', translation: q };
            }

            if (match || (personRule && PRONOUN_MAP[q])) {
                let conlang = (match ? match.word : personRule.freeForm).replace(/\*/g, '');
                let inflected = false;
                let appliedRuleName = '';
                let appliedRuleSource = '';

                const appliedRules = [];
                const possibleRules = [];

                // 1. Verb Tense & Verb Marker
                if (role === 'V') {
                    if (activeTense) possibleRules.push(findGrammarRule(activeTense));
                    if (verbMarker && verbMarker.trim()) {
                        possibleRules.push({ name: 'Verb Marker', affix: verbMarker.trim(), appliesTo: 'verb' });
                    }
                }

                // 2. Number (Plural)
                if (info.isPlural) possibleRules.push(findGrammarRule('plural'));

                // 3. Genitive
                if (info.case === 'genitive' || q.endsWith("'s") || q.endsWith("’s") || role === 'G') {
                    possibleRules.push(findGrammarRule('genitive', 'possessive'));
                }

                // 4. Comparison target (than)
                if (isComparisonTarget) {
                    possibleRules.push(findGrammarRule('ablative', 'than'));
                }

                // 5. Prepositional Case Suffixes (Option 1: In the house -> house-LOC)
                const prevPToken = i > 0 && finalRoles[i - 1] === 'P' ? tokens[i - 1].toLowerCase() :
                    i > 1 && finalRoles[i - 2] === 'P' && ['the', 'a', 'an'].includes(tokens[i - 1].toLowerCase()) ? tokens[i - 2].toLowerCase() : null;
                if (prevPToken && PREPOSITION_CASE_MAP[prevPToken]) {
                    const prepCase = findGrammarRule(PREPOSITION_CASE_MAP[prevPToken]);
                    if (prepCase) possibleRules.push(prepCase);
                }

                // 6. Morphosyntactic Alignment & Core Cases (Skip Accusative on copula predicate nouns!)
                if (!isCopulaPredicate) {
                    if (role === 'D') {
                        possibleRules.push(findGrammarRule('dative'));
                    } else if (alignment === 'ergative') {
                        if (role === 'S' && hasObject) possibleRules.push(findGrammarRule('ergative'));
                        else if (role === 'S' || role === 'O') possibleRules.push(findGrammarRule('absolutive'));
                    } else {
                        if (role === 'S') {
                            const nomRule = findGrammarRule('nominative');
                            if (nomRule) possibleRules.push(nomRule);
                        } else if (role === 'O' || info.case === 'objective') {
                            possibleRules.push(findGrammarRule('accusative', 'objective'));
                        }
                    }
                }

                // 7. Degree
                if (info.case === 'comparative') possibleRules.push(findGrammarRule('comparative'));
                if (info.case === 'superlative') possibleRules.push(findGrammarRule('superlative'));

                for (const r of possibleRules) {
                    if (r?.affix) {
                        const tClass = (match?.wordClass || '').toLowerCase();
                        if (r.appliesTo && r.appliesTo !== 'all' && r.appliesTo.trim() !== '') {
                            if (!tClass.includes(r.appliesTo.toLowerCase())) continue;
                        }

                        try {
                            conlang = applyPhonologicalRule(conlang, r);
                            inflected = true;
                            appliedRuleName = r.name || r.condition;
                            appliedRuleSource = (appliedRuleSource ? appliedRuleSource + ', ' : '') + 'Grammar Rule: ' + appliedRuleName;
                            appliedRules.push(r);
                        } catch (e) {
                            console.error(e);
                        }
                    }
                }

                wordMarkers.sort((a, b) => (a.priority || 0) - (b.priority || 0)).forEach(t => {
                    if (appliedRules.some(ar => (ar.name || '').toLowerCase() === (t.name || '').toLowerCase())) return;

                    const rawMarker = String(t.marker || '');
                    if (!rawMarker) return;
                    const cleanMarker = rawMarker.replace(/^[-=']+|[-=']+$/g, '');
                    if (t.position === 'prefix' || t.position === 'before') {
                        const p = rawMarker.replace(/-$/, '');
                        if (!conlang.startsWith(cleanMarker) && !conlang.startsWith(p)) {
                            conlang = p + (t.position === 'before' ? ' ' : '') + conlang;
                            inflected = true;
                            appliedRuleSource = (appliedRuleSource ? appliedRuleSource + ', ' : '') + 'Word Assist: ' + (t.name || t.trigger || t.marker);
                        }
                    } else if (t.position === 'suffix' || t.position === 'after') {
                        const s = rawMarker.replace(/^-/, '');
                        if (!conlang.endsWith(cleanMarker) && !conlang.endsWith(s)) {
                            conlang = conlang + (t.position === 'after' ? ' ' : '') + s;
                            inflected = true;
                            appliedRuleSource = (appliedRuleSource ? appliedRuleSource + ', ' : '') + 'Word Assist: ' + (t.name || t.trigger || t.marker);
                        }
                    } else if (t.position === 'endOfSentence') {
                        phraseNegated = true;
                        inflected = true;
                        appliedRuleSource = (appliedRuleSource ? appliedRuleSource + ', ' : '') + 'Word Assist: ' + (t.name || t.trigger || t.marker);
                    }
                });

                const candidates = formatCandidates(rankedCandidates, match);
                const transliteratedWord = transliterate(conlang, lexicon);
                return {
                    phraseNegated,
                    tokenObj: {
                        original: fullForm,
                        conlang: transliteratedWord,
                        conlangBase: conlang,
                        found: true,
                        entry: match,
                        role,
                        inflected,
                        ruleName: appliedRuleName,
                        ruleSource: appliedRuleSource,
                        isAuxiliary,
                        isArticle,
                        isSupportDo,
                        isCopulaPredicate,
                        personRule,
                        isPronoun: !!PRONOUN_MAP[q],
                        alternatives: candidates.slice(1, 5).map(c => c.conlang),
                        candidates,
                        matchCount: candidates.length,
                        swallowed: false,
                        context,
                        appliedRules,
                        animacy: getAnimacyLevel({ original: q, sentencePosition: i }, match, PRONOUN_MAP[q])
                    }
                };
            }

            let conlang = `[${q}]`;
            let inflected = false;
            let appliedRuleSource = '';
            let isFound = false;

            if (role === 'S' && personRule?.freeForm) {
                conlang = personRule.freeForm;
                isFound = true;
            }

            wordMarkers.sort((a, b) => (a.priority || 0) - (b.priority || 0)).forEach(t => {
                const rawMarker = String(t.marker || '');
                if (!rawMarker) return;
                const cleanMarker = rawMarker.replace(/^[-=']+|[-=']+$/g, '');
                if (t.position === 'prefix' || t.position === 'before') {
                    const p = rawMarker.replace(/-$/, '');
                    if (!conlang.startsWith(cleanMarker) && !conlang.startsWith(p)) {
                        conlang = p + (t.position === 'before' ? ' ' : '') + conlang;
                        inflected = true;
                        appliedRuleSource = (appliedRuleSource ? appliedRuleSource + ', ' : '') + 'Word Assist: ' + (t.name || t.trigger || t.marker);
                    }
                } else if (t.position === 'suffix' || t.position === 'after') {
                    const s = rawMarker.replace(/^-/, '');
                    if (!conlang.endsWith(cleanMarker) && !conlang.endsWith(s)) {
                        conlang = conlang + (t.position === 'after' ? ' ' : '') + s;
                        inflected = true;
                        appliedRuleSource = (appliedRuleSource ? appliedRuleSource + ', ' : '') + 'Word Assist: ' + (t.name || t.trigger || t.marker);
                    }
                } else if (t.position === 'endOfSentence') {
                    phraseNegated = true;
                    inflected = true;
                    appliedRuleSource = (appliedRuleSource ? appliedRuleSource + ', ' : '') + 'Word Assist: ' + (t.name || t.trigger || t.marker);
                }
            });

            return {
                phraseNegated,
                tokenObj: {
                    original: fullForm,
                    conlang: isFound ? transliterate(conlang, lexicon) : conlang,
                    conlangBase: conlang,
                    role,
                    found: isFound,
                    personRule,
                    isPronoun: !!PRONOUN_MAP[q],
                    inflected,
                    ruleSource: appliedRuleSource,
                    candidates: [],
                    matchCount: 0,
                    swallowed: isAuxiliary || isArticle || isSupportDo,
                    isSupportDo,
                    animacy: getAnimacyLevel({ original: q, sentencePosition: i }, null, PRONOUN_MAP[q])
                }
            };
        };

        const parseClause = (clauseText, clauseIdx = 0) => {
            const rawWords = clauseText.trim().split(/\s+/).filter(Boolean);
            if (rawWords.length === 0) return { breakdown: [], phraseIsNegative: false };

            // Merge multi-word lexicon phrases first ("good morning", "thank you", "look for")
            const spans = mergeMultiWordPhrases(rawWords, multiWordPhraseIndex);
            const rawTokens = spans.map(s => s.rawText);
            const tokens = spans.map(s => s.isPhraseMatch ? s.cleanText : s.rawText.replace(/[.,!?()[\]{}"`:;]/g, ''));

            // Align compromise POS tags across spans
            let nlpTerms = [];
            try {
                const doc = nlp(clauseText);
                doc.compute('root');
                const termsJson = doc.terms().json();
                let termIdx = 0;
                for (let i = 0; i < spans.length; i++) {
                    const spanWords = spans[i].isPhraseMatch ? spans[i].wordCount : 1;
                    const tLow = tokens[i].toLowerCase();
                    const matchedTerms = [];

                    for (let w = 0; w < spanWords && termIdx < termsJson.length; w++) {
                        while (termIdx < termsJson.length) {
                            const item = termsJson[termIdx];
                            const term = item.terms?.[0] || {};
                            const termText = (term.text || item.text || '').toLowerCase();
                            if (termText) {
                                if (matchedTerms.length === 0 || spanWords > 1) {
                                    matchedTerms.push(term);
                                    termIdx++;
                                    break;
                                } else if (tLow.includes(termText) || termText.includes(tLow)) {
                                    matchedTerms.push(term);
                                    termIdx++;
                                } else {
                                    break;
                                }
                            } else {
                                matchedTerms.push(term);
                                termIdx++;
                            }
                        }
                        // Consume any trailing synthetic/implicit empty-text contraction expansion terms (e.g. "don't" -> "")
                        while (termIdx < termsJson.length) {
                            const nextItem = termsJson[termIdx];
                            const nextTerm = nextItem.terms?.[0] || {};
                            const nextText = (nextTerm.text || nextItem.text || '').trim();
                            if (!nextText) {
                                matchedTerms.push(nextTerm);
                                termIdx++;
                            } else {
                                break;
                            }
                        }
                    }

                    const mergedTags = Array.from(new Set(matchedTerms.flatMap(m => m.tags || [])));
                    const primaryTerm = matchedTerms[0] || {};
                    nlpTerms.push({
                        ...primaryTerm,
                        tags: mergedTags,
                        allTerms: matchedTerms
                    });
                }
            } catch (e) {
                console.warn('Compromise NLP error:', e);
            }

            const tokenData = tokens.map((t, idx) => {
                const low = t.toLowerCase();
                const occKey = `${clauseIdx}:${idx}`;
                const nlpTerm = nlpTerms[idx] || {};
                const info = lemmatize(low, { prevTokens: tokens.slice(0, idx), nlpTerm });
                const context = getDefiniteness(idx, rawTokens.map(rt => ({ original: rt.replace(/[.,!?()[\]{}"`:;]/g, '') })));
                return { original: t, low, occKey, span: spans[idx], info, context, nlpTerm };
            });

            // Helper to query lexicon POS capabilities for ambiguous English words (memoized per token index)
            const capableRolesCache = new Array(tokens.length);
            const getCapableRoles = (idx) => {
                if (capableRolesCache[idx]) return capableRolesCache[idx];
                const td = tokenData[idx];
                const tags = td.nlpTerm?.tags || [];
                const caps = new Set();
                if (tags.includes('Verb') || tags.includes('Infinitive') || tags.includes('Gerund') || tags.includes('PastTense')) caps.add('V');
                if (tags.includes('Noun') || tags.includes('Plural') || tags.includes('Singular') || tags.includes('ProperNoun')) caps.add('NOUN');
                if (tags.includes('Adjective') || tags.includes('Comparative') || tags.includes('Superlative')) caps.add('J');
                if (tags.includes('Adverb')) caps.add('R');

                const allCands = td.span?.isPhraseMatch
                    ? td.span.phraseEntries.map(e => ({ entry: e }))
                    : findRankedLexiconCandidates(td.low, null, td.info.lemma);

                allCands.forEach(c => {
                    const wc = (c.entry?.wordClass || '').toLowerCase();
                    if (!wc) return;
                    if (matchesPos(wc, 'V')) caps.add('V');
                    if (matchesPos(wc, 'NOUN')) caps.add('NOUN');
                    if (matchesPos(wc, 'J')) caps.add('J');
                    if (matchesPos(wc, 'R')) caps.add('R');
                    if (matchesPos(wc, 'P')) caps.add('P');
                    if (matchesPos(wc, 'N')) caps.add('N');
                    if (matchesPos(wc, 'M')) caps.add('M');
                });
                capableRolesCache[idx] = caps;
                return caps;
            };

            // Pass 1: Closed classes, overrides, phrase matches & initial POS hypothesis
            const preClassified = [];
            let seenVerbInClause = false;
            let seenSubjectInClause = false;
            let hasCopulaMainVerb = false;

            for (let idx = 0; idx < tokens.length; idx++) {
                const td = tokenData[idx];
                const low = td.low;
                const occKey = td.occKey;
                const info = td.info;
                const nlpTags = td.nlpTerm?.tags || [];
                const caps = getCapableRoles(idx);

                const overrideRole = getOverrideForToken(occKey, low);
                if (overrideRole) {
                    preClassified.push(overrideRole);
                    if (overrideRole === 'V' || overrideRole === 'M') seenVerbInClause = true;
                    continue;
                }

                // Multi-word lexicon phrase override (unless POS-ambiguous)
                if (td.span?.isPhraseMatch && td.span.phraseEntries?.length > 0) {
                    const phraseWcRole = getRoleFromWordClass(td.span.phraseEntries[0].wordClass);
                    const finalPhraseRole = phraseWcRole || 'NOUN';
                    if (finalPhraseRole === 'V' || finalPhraseRole === 'M') seenVerbInClause = true;
                    else if (finalPhraseRole === 'NOUN') seenSubjectInClause = true;
                    preClassified.push(finalPhraseRole);
                    continue;
                }

                // Negation comes BEFORE Time so "never" always acts as Negation ('N')
                if (NEGATIVE_WORDS.has(low) || nlpTags.includes('Negative')) {
                    // Distinguish determiner "no" before a noun ("no cats") vs standalone negation ("not")
                    if (low === 'no' && idx + 1 < tokens.length && (tokenData[idx + 1].nlpTerm?.tags?.includes('Noun') || findLexiconMatches(tokens[idx + 1].toLowerCase(), 'NOUN').length > 0)) {
                        preClassified.push('N');
                    } else {
                        preClassified.push('N');
                    }
                    continue;
                }
                if (QUESTION_WORDS.has(low) || nlpTags.includes('QuestionWord')) { preClassified.push('Q'); continue; }
                if (TIME_WORDS.has(low) || nlpTags.includes('Date')) { preClassified.push('T'); continue; }
                if (PLACE_WORDS.has(low)) { preClassified.push('L'); continue; }
                if (ARTICLES.has(low) || (nlpTags.includes('Determiner') && ARTICLES.has(low))) { preClassified.push('A'); continue; }

                // Numerals / Digits / Determiner-Quantifiers ("two dogs", "this cat", "3 apples")
                if (/^\d+$/.test(low) || NUMERALS.has(low) || nlpTags.includes('Value')) {
                    // Check if followed by noun or adjective before verb/prep/end
                    let modifiesFollowingNoun = false;
                    for (let k = idx + 1; k < tokens.length; k++) {
                        const nk = tokens[k].toLowerCase();
                        const nkCaps = getCapableRoles(k);
                        if (PREPOSITIONS.has(nk) || CONJUNCTIONS.has(nk) || MODAL_VERBS.has(nk)) break;
                        if (nkCaps.has('NOUN') || PRONOUN_MAP[nk]) { modifiesFollowingNoun = true; break; }
                    }
                    preClassified.push(modifiesFollowingNoun ? 'J' : 'NOUN');
                    continue;
                }

                // Infinitive vs Preposition 'to'
                if (low === 'to') {
                    const nextLow = idx < tokens.length - 1 ? tokens[idx + 1].toLowerCase() : '';
                    const nextMatches = findLexiconMatches(nextLow);
                    const isNextVerbInLex = nextMatches.some(m => matchesPos(m.wordClass, 'V'));
                    const nextNlpTags = tokenData[idx + 1]?.nlpTerm?.tags || [];
                    if (isNextVerbInLex || nextNlpTags.includes('Verb') || nextNlpTags.includes('Infinitive') || IRREGULAR_VERBS[nextLow]) {
                        preClassified.push('C');
                    } else {
                        preClassified.push('P');
                    }
                    continue;
                }

                // Pronouns
                if (PRONOUN_MAP[low]) {
                    const pm = PRONOUN_MAP[low];
                    if (pm.case === 'genitive') {
                        preClassified.push('G');
                    } else {
                        if (!seenVerbInClause) seenSubjectInClause = true;
                        preClassified.push(pm.role || 'NOUN');
                    }
                    continue;
                }

                // Copula verbs checked BEFORE lexicon lookup so zero_copula/omit/replace work even when 'be'/'is' is in lexicon
                const isCoreCopula = ['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being'].includes(low);
                if (isCoreCopula || (COPULA_VERBS.has(low) && !seenVerbInClause && !caps.has('NOUN'))) {
                    const behavior = copulaOverride || waConfig?.copulaBehavior || 'normal';
                    const nextLow = idx + 1 < tokens.length ? tokens[idx + 1].toLowerCase() : '';
                    const nextTags = tokenData[idx + 1]?.nlpTerm?.tags || [];
                    const followedByMainVerb = nextLow.endsWith('ing') || nextTags.includes('Verb') || nextTags.includes('Gerund') || (nextLow.endsWith('ed') && !ED_ADJECTIVES.has(nextLow));

                    if (behavior === 'omit' && !followedByMainVerb) {
                        td.isOmittedCopula = true;
                        hasCopulaMainVerb = true;
                        seenVerbInClause = true;
                        preClassified.push('SKIP');
                        continue;
                    }
                    if (behavior === 'replace' && !followedByMainVerb) {
                        const repl = (waConfig?.copulaReplacement || 'be').trim();
                        tokens[idx] = repl;
                        td.original = repl;
                        td.low = repl.toLowerCase();
                        td.info = { lemma: repl.toLowerCase(), tense: 'present' };
                        td.isCopulaReplacement = true;
                        hasCopulaMainVerb = true;
                        seenVerbInClause = true;
                        preClassified.push('V');
                        continue;
                    }
                    if (followedByMainVerb) {
                        preClassified.push('M');
                    } else {
                        hasCopulaMainVerb = true;
                        seenVerbInClause = true;
                        preClassified.push('V');
                    }
                    continue;
                }

                // Support 'do' / 'does' / 'did' & Modal verbs
                if (MODAL_VERBS.has(low) || nlpTags.includes('Modal')) {
                    preClassified.push('M');
                    continue;
                }

                if (['do', 'does', 'did'].includes(low)) {
                    const prevRole = idx > 0 ? preClassified[idx - 1] : null;
                    const prevLow = idx > 0 ? tokens[idx - 1].toLowerCase() : '';
                    const nextLow = idx + 1 < tokens.length ? tokens[idx + 1].toLowerCase() : '';
                    // "I want to do it" / "She did it" -> Main verb V!
                    // "Do you see...?" / "I did not go" -> Support auxiliary M!
                    const isAfterTo = prevLow === 'to' && prevRole === 'C';
                    const followedByNegOrVerb = NEGATIVE_WORDS.has(nextLow) || getCapableRoles(idx + 1).has('V');
                    const isQuestionAux = (idx === 0 || prevRole === 'Q') && idx + 2 < tokens.length;
                    if (!isAfterTo && (followedByNegOrVerb || isQuestionAux)) {
                        td.isSupportDo = true;
                        preClassified.push('M');
                        continue;
                    }
                }

                // Auxiliary 'have' / 'has' / 'had' BEFORE past participle -> M ("I have eaten"), else Main Verb V ("I have a dog")
                if (['have', 'has', 'had'].includes(low) && idx + 1 < tokens.length) {
                    const nextInfo = tokenData[idx + 1]?.info;
                    const nextLow = tokens[idx + 1].toLowerCase();
                    if (nextInfo?.isParticiple || nextInfo?.tense === 'past_participle' || nextLow === 'been' || NEGATIVE_WORDS.has(nextLow)) {
                        preClassified.push('M');
                        continue;
                    }
                }

                if (PREPOSITIONS.has(low)) { preClassified.push('P'); continue; }
                if (CONJUNCTIONS.has(low)) { preClassified.push('K'); continue; }
                if (QUANTIFIER_OR_DEM.has(low)) {
                    preClassified.push('QUANT_DET');
                    continue;
                }

                // Adverbs ending in -ly or degree/manner adverbs
                if ((low.endsWith('ly') && low.length > 3 && !LY_NON_ADVERBS.has(low)) || DEGREE_OR_MANNER_ADVS.has(low)) {
                    // Exception: "fast car" -> if directly after Det and directly before Noun, it's Adj ('J')
                    const prevR = idx > 0 ? preClassified[idx - 1] : null;
                    const nextLow = idx + 1 < tokens.length ? tokens[idx + 1].toLowerCase() : '';
                    const nextCanBeNoun = nextLow && (getCapableRoles(idx + 1).has('NOUN') || PRONOUN_MAP[nextLow]);
                    if (low === 'fast' && (prevR === 'A' || prevR === 'G' || prevR === 'P' || !seenVerbInClause) && nextCanBeNoun) {
                        preClassified.push('J');
                    } else if (low === 'fast' && idx > 0 && tokens[idx - 1].toLowerCase() === 'is') {
                        preClassified.push('J');
                    } else {
                        preClassified.push('R');
                    }
                    continue;
                }

                // Context-aware open-class resolution (V vs NOUN vs J vs R)
                const prevRole = idx > 0 ? preClassified[idx - 1] : null;
                const prevLow = idx > 0 ? tokens[idx - 1].toLowerCase() : null;
                const prevIsTo = prevLow === 'to' && prevRole === 'C';
                const prevIsDet = ARTICLES.has(prevLow) || prevRole === 'A' || prevRole === 'G' || prevRole === 'QUANT_DET';
                const prevIsModal = prevRole === 'M';
                const prevIsNeg = prevRole === 'N';
                const prevIsPrep = prevRole === 'P';

                // Walk backward across R/N/M to check if a Subject is immediately commanding this slot
                let immediatelyAfterSubject = false;
                if (seenSubjectInClause && !seenVerbInClause) {
                    let bk = idx - 1;
                    while (bk >= 0 && ['R', 'T', 'N', 'M'].includes(preClassified[bk])) bk--;
                    if (bk >= 0 && ['S', 'NOUN'].includes(preClassified[bk])) {
                        immediatelyAfterSubject = true;
                    }
                }

                // Look ahead to check if token is modifying an upcoming noun ("red big house")
                const nextToken = idx < tokens.length - 1 ? tokens[idx + 1].toLowerCase() : null;
                const nextIsPronoun = !!(nextToken && PRONOUN_MAP[nextToken]);
                const nextCaps = idx < tokens.length - 1 ? getCapableRoles(idx + 1) : new Set();
                const nextIsLikelyNoun = nextToken && !nextIsPronoun && nextCaps.has('NOUN') && !PREPOSITIONS.has(nextToken) && !CONJUNCTIONS.has(nextToken);

                let resolvedRole = null;

                // Direct lexicon word match (e.g. conlang word typed directly like "I glofur water")
                const topDirect = findRankedLexiconCandidates(low, null, null)[0];
                const directConlangHit = topDirect?.matchSource === 'conlang' ? topDirect.entry : null;
                if (directConlangHit && directConlangHit.wordClass) {
                    resolvedRole = getRoleFromWordClass(directConlangHit.wordClass);
                }

                if (!resolvedRole) {
                    if (prevIsTo || prevIsModal) {
                        resolvedRole = 'V';
                    } else if (prevIsDet || prevIsPrep || prevRole === 'J') {
                        // Inside an NP: before another Noun -> Adjective ('J'), otherwise Noun ('NOUN')
                        if (nextIsLikelyNoun && (caps.has('J') || !caps.has('NOUN') || nlpTags.includes('Adjective'))) {
                            resolvedRole = 'J';
                        } else if (!nextIsLikelyNoun && (caps.has('NOUN') || !caps.has('J'))) {
                            resolvedRole = 'NOUN';
                        } else if (caps.has('J') && nextIsLikelyNoun) {
                            resolvedRole = 'J';
                        } else {
                            resolvedRole = caps.has('NOUN') ? 'NOUN' : (caps.has('J') ? 'J' : 'NOUN');
                        }
                    } else if (immediatelyAfterSubject && (caps.has('V') || info.tense === 'past' || info.person === '3rd' || nlpTags.includes('Verb'))) {
                        // e.g. "I water the plant", "Cats drink water", "The dog runs"
                        resolvedRole = 'V';
                    } else if (idx === 0 && !seenVerbInClause && caps.has('V') && !caps.has('NOUN') && nextToken) {
                        // Unambiguous Imperative verb at start ("Eat the apple")
                        resolvedRole = 'V';
                    } else if (seenVerbInClause && !prevIsDet) {
                        // Post-verbal slot
                        if (hasCopulaMainVerb && !caps.has('NOUN') && (caps.has('J') || nlpTags.includes('Adjective'))) {
                            resolvedRole = 'J';
                        } else if (hasCopulaMainVerb && caps.has('J') && !nextIsLikelyNoun && !nlpTags.includes('Noun')) {
                            resolvedRole = 'J';
                        } else if (nextIsLikelyNoun && (caps.has('J') || nlpTags.includes('Adjective'))) {
                            resolvedRole = 'J';
                        } else if (caps.has('NOUN') || nlpTags.includes('Noun')) {
                            resolvedRole = 'NOUN';
                        } else if (caps.has('J') || nlpTags.includes('Adjective')) {
                            resolvedRole = 'J';
                        } else if (caps.has('V') && prevIsNeg) {
                            resolvedRole = 'V';
                        }
                    }
                }

                // Morphological fallbacks if still unresolved
                if (!resolvedRole) {
                    if (low.endsWith('ing') && !ING_NOUNS.has(low) && !ING_ADJECTIVES.has(low)) resolvedRole = 'V';
                    else if (low.endsWith('ed') && !ED_ADJECTIVES.has(low)) resolvedRole = 'V';
                    else if (nlpTags.includes('Verb') && !nlpTags.includes('Noun')) resolvedRole = 'V';
                    else if (nlpTags.includes('Adjective') && !nlpTags.includes('Noun')) resolvedRole = nextIsLikelyNoun || seenVerbInClause ? 'J' : (caps.has('J') ? 'J' : 'NOUN');
                    else if (nlpTags.includes('Adverb')) resolvedRole = 'R';
                    else if (caps.has('J') && nextIsLikelyNoun) resolvedRole = 'J';
                    else if (caps.has('V') && !caps.has('NOUN')) resolvedRole = 'V';
                    else if (caps.has('NOUN')) resolvedRole = 'NOUN';
                    else if (caps.has('J')) resolvedRole = 'J';
                    else if (nlpTags.includes('Preposition')) resolvedRole = 'P';
                    else if (nlpTags.includes('Conjunction')) resolvedRole = 'K';
                    else resolvedRole = 'NOUN';
                }

                if (resolvedRole === 'V' || resolvedRole === 'M') seenVerbInClause = true;
                else if (resolvedRole === 'NOUN' && !seenVerbInClause) seenSubjectInClause = true;

                preClassified.push(resolvedRole);
            }

            // Pass 2: Fix Quantifiers/Demonstratives ('QUANT_DET') + Imperatives + Question Auxiliary Inversion + NP Adjective refine
            for (let idx = 0; idx < preClassified.length; idx++) {
                if (getOverrideForToken(tokenData[idx].occKey, tokenData[idx].low)) continue;

                if (preClassified[idx] === 'QUANT_DET') {
                    let modifiesFollowingNoun = false;
                    for (let k = idx + 1; k < preClassified.length; k++) {
                        const r = preClassified[k];
                        if (r === 'NOUN' || PRONOUN_MAP[tokens[k].toLowerCase()]) { modifiesFollowingNoun = true; break; }
                        if (r === 'V' || r === 'M' || r === 'P' || r === 'K') break;
                    }
                    preClassified[idx] = modifiesFollowingNoun ? 'J' : 'NOUN';
                }

                // Infinitive marker 'to' forces following token -> V
                if (idx > 0 && tokens[idx - 1].toLowerCase() === 'to' && preClassified[idx - 1] === 'C') {
                    preClassified[idx] = 'V';
                }
                // Modal 'M' directly before open token -> V (unless it's inverted question subject before another V!)
                else if (idx > 0 && preClassified[idx - 1] === 'M' && ['NOUN', 'O', 'S'].includes(preClassified[idx]) && !PRONOUN_MAP[tokens[idx].toLowerCase()]) {
                    const hasLaterVerb = preClassified.slice(idx + 1).some(r => r === 'V');
                    if (!hasLaterVerb) {
                        preClassified[idx] = 'V';
                    }
                }
            }

            // If clause has ZERO verbs yet and starts with a verb-capable word ("Water the plant", "Cold the soup"), promote idx 0 -> V!
            const hasAnyVerb = preClassified.some(r => r === 'V' || r === 'SKIP');
            if (!hasAnyVerb && preClassified.length >= 1) {
                for (let idx = 0; idx < preClassified.length; idx++) {
                    if (['R', 'N', 'T'].includes(preClassified[idx])) continue;
                    const caps = getCapableRoles(idx);
                    if (!getOverrideForToken(tokenData[idx].occKey, tokenData[idx].low) && preClassified[idx] === 'NOUN' && caps.has('V') && preClassified.length > idx + 1) {
                        preClassified[idx] = 'V';
                    }
                    break;
                }
            }

            // Identify main verb boundary & question inversion structure
            let firstVerbIdx = preClassified.findIndex(r => r === 'V' || r === 'SKIP');
            const firstAuxIdx = preClassified.findIndex(r => r === 'M');
            const isInvertedQuestion = firstAuxIdx !== -1 && (firstAuxIdx === 0 || (firstAuxIdx === 1 && preClassified[0] === 'Q')) && firstVerbIdx > firstAuxIdx;

            if (firstVerbIdx === -1) {
                firstVerbIdx = firstAuxIdx;
            }
            const mainVerbTokenIdx = firstVerbIdx !== -1 ? firstVerbIdx : firstAuxIdx;
            const mainVerbLemma = mainVerbTokenIdx !== -1 ? tokenData[mainVerbTokenIdx]?.info?.lemma : '';
            const isDitransitive = mainVerbTokenIdx !== -1 && (DITRANSITIVE_VERBS.has(mainVerbLemma) || DITRANSITIVE_VERBS.has(tokens[mainVerbTokenIdx]?.toLowerCase()));

            let hasObject = false;
            if (mainVerbTokenIdx !== -1) {
                hasObject = tokens.slice(mainVerbTokenIdx + 1).some((t, idx) => {
                    const globalIdx = mainVerbTokenIdx + 1 + idx;
                    const role = preClassified[globalIdx];
                    return role === 'NOUN' || role === 'O' || PRONOUN_MAP[t.toLowerCase()]?.role === 'O';
                });
            }

            // Pass 3: Clause-level Grammatical Role Assignment (S, V, M, D, O, L, G, P)
            let postVerbNounCount = 0;
            let insidePrepPhrase = false;

            const finalRoles = preClassified.map((role, idx) => {
                const low = tokens[idx].toLowerCase();
                const occKey = tokenData[idx].occKey;
                const manual = getOverrideForToken(occKey, low);
                if (manual) return manual;

                if (role === 'P') {
                    insidePrepPhrase = true;
                    return 'P';
                }

                // Exit PP boundary after non-NP modifiers or verbs
                if (insidePrepPhrase && !['A', 'G', 'J', 'C', 'R', 'K', 'NOUN'].includes(role) && !PRONOUN_MAP[low]) {
                    insidePrepPhrase = false;
                }

                // Ambiguous 'her': determiner before noun/adj -> 'G' ("her cat"), else pronoun object
                if (low === 'her') {
                    const nextRole = preClassified[idx + 1];
                    if (nextRole === 'NOUN' || nextRole === 'J') return 'G';
                    if (insidePrepPhrase) {
                        insidePrepPhrase = false;
                        return 'L';
                    }
                    postVerbNounCount++;
                    return (mainVerbTokenIdx !== -1 && idx > mainVerbTokenIdx && isDitransitive && postVerbNounCount === 1) ? 'D' : 'O';
                }

                if (role === 'NOUN' || (PRONOUN_MAP[low] && PRONOUN_MAP[low].case !== 'genitive')) {
                    if (insidePrepPhrase) {
                        // Allow coordinated NP inside same PP ("between the cat and the dog")
                        const nextRole = preClassified[idx + 1];
                        const nextLow = tokens[idx + 1]?.toLowerCase();
                        if (!(nextRole === 'K' && nextLow === 'and')) {
                            insidePrepPhrase = false;
                        }
                        return 'L';
                    }

                    // Inverted question subject sits BETWEEN Aux (M) and main Verb (V): "What did YOU eat?" / "Do YOU see the cat?"
                    if (isInvertedQuestion && idx > firstAuxIdx && idx < firstVerbIdx) {
                        return 'S';
                    }

                    if (mainVerbTokenIdx === -1 || idx < mainVerbTokenIdx) {
                        return 'S';
                    }

                    postVerbNounCount++;
                    if (hasCopulaMainVerb) {
                        tokenData[idx].isCopulaPredicate = true;
                        return 'O'; // Predicate nominal positioned in complement slot, skips Accusative case
                    }
                    if (isDitransitive && postVerbNounCount === 1) {
                        return 'D';
                    }
                    return 'O';
                }

                return role;
            });

            // Pass 4: POS-Guided Lexicon Lookup + User Candidate Selection + Morphological Inflection
            const breakdown = [];
            let i = 0;
            let activeTense = null;
            let comparisonTargetIdx = -1;
            let phraseIsNegative = false;
            let auxiliaryStack = [];

            while (i < tokens.length) {
                const q = tokenData[i].low;
                const occKey = tokenData[i].occKey;
                const fullForm = rawTokens[i];
                const info = tokenData[i].info;
                const context = tokenData[i].context;
                const lemma = info.lemma;
                const role = finalRoles[i];
                const isComparisonTarget = (i === comparisonTargetIdx);

                const isAuxiliary = (role === 'M');
                const isArticle = (role === 'A');
                const isSupportDo = !!tokenData[i].isSupportDo;
                const isCopulaPredicate = !!tokenData[i].isCopulaPredicate;
                let personRule = null;

                if (q === 'than') {
                    comparisonTargetIdx = i + 1;
                    if (tokens[i + 1] && ARTICLES.has(tokens[i + 1].toLowerCase())) comparisonTargetIdx = i + 2;
                    breakdown[i] = { original: fullForm, conlang: '', role: 'C', occKey, swallowed: true, candidates: [], matchCount: 0 };
                    i++;
                    continue;
                }

                if (role === 'SKIP') {
                    breakdown[i] = { original: fullForm, conlang: `[${q}]`, role: 'M', occKey, swallowed: true, candidates: [], matchCount: 0 };
                    i++;
                    continue;
                }

                // Swallow infinitive 'to'
                if (q === 'to' && role === 'C' && tokens[i + 1]) {
                    breakdown[i] = { original: fullForm, conlang: '', role: 'C', occKey, swallowed: true, found: true, candidates: [], matchCount: 0 };
                    i++;
                    continue;
                }

                // Preposition absorption by nominal case rule (Option 1)
                if (role === 'P' && replacePrepositionsWithCase) {
                    const targetCaseName = PREPOSITION_CASE_MAP[q];
                    const caseRule = targetCaseName ? findGrammarRule(targetCaseName) : null;
                    if (caseRule) {
                        breakdown[i] = {
                            original: fullForm,
                            conlang: '',
                            role: 'P',
                            occKey,
                            swallowed: true,
                            ruleName: caseRule.name || targetCaseName,
                            absorbedInCase: true,
                            candidates: [],
                            matchCount: 0
                        };
                        i++;
                        continue;
                    }
                }

                if (['will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must'].includes(q)) auxiliaryStack.push(q);
                else if (['have', 'has', 'had'].includes(q)) auxiliaryStack.push(q);
                else if (['am', 'is', 'are'].includes(q)) auxiliaryStack.push('be_pres');
                else if (['was', 'were'].includes(q)) auxiliaryStack.push('be_past');
                else if (['do', 'does', 'did'].includes(q)) auxiliaryStack.push(q === 'did' ? 'did' : 'do');
                else if (q === 'been') auxiliaryStack.push('been');

                // Lookup ranked candidates using resolved grammatical POS!
                const lookupRoleHint = ['S', 'O', 'D', 'L'].includes(role) ? 'NOUN' : role;
                let rankedCandidates;
                if (tokenData[i].span?.isPhraseMatch && tokenData[i].span.phraseEntries?.length > 0) {
                    rankedCandidates = tokenData[i].span.phraseEntries.map((entry, idx) => ({
                        entry,
                        score: 900 - idx,
                        matchSource: 'phrase'
                    }));
                } else {
                    rankedCandidates = findRankedLexiconCandidates(q, lookupRoleHint, lemma);
                }

                // Support 'do/does/did' auxiliary should NOT pull action verb "make/do" unless explicitly Modal/Aux or chosen by user
                const userChoice = getChoiceForToken(occKey, q);
                let match = null;
                if (userChoice) {
                    const picked = rankedCandidates.find(c =>
                        (c.entry.id != null && String(c.entry.id) === String(userChoice)) ||
                        (c.entry.word || '').replace(/\*/g, '') === userChoice
                    ) || lexicon.find(e =>
                        (e.id != null && String(e.id) === String(userChoice)) ||
                        (e.word || '').replace(/\*/g, '') === userChoice
                    );
                    match = picked?.entry || picked || null;
                }

                if (!match) {
                    if (isSupportDo) {
                        const auxCand = rankedCandidates.find(c => matchesPos(c.entry?.wordClass, 'M') || matchesPos(c.entry?.wordClass, 'Q'));
                        match = auxCand?.entry || null;
                    } else {
                        const posBest = rankedCandidates.find(c => matchesPos(c.entry?.wordClass, lookupRoleHint));
                        match = posBest?.entry || rankedCandidates[0]?.entry || null;
                    }
                }

                if (role === 'N') {
                    phraseIsNegative = true;
                } else if (role === 'S' && (info.person || info.number || PRONOUN_MAP[q])) {
                    const subjPerson = info.person || '3rd';
                    const subjNumber = info.number || (info.isPlural ? 'P' : 'S');
                    const subjGender = info.gender || match?.gender;

                    if (copulaOverride === 'omit' || copulaOverride === 'replace') {
                        personRule = personRulesArray.find(r =>
                            (!r.person || r.person === subjPerson) &&
                            (!r.number || r.number === subjNumber) &&
                            (!r.gender || r.gender === subjGender) &&
                            r.appliesTo && r.appliesTo.replace(/[\s_]/g, '').toLowerCase().includes('zerocopula')
                        );
                    }
                    if (!personRule) {
                        personRule = personRulesArray.find(r =>
                            (!r.person || r.person === subjPerson) &&
                            (!r.number || r.number === subjNumber) &&
                            (!r.gender || r.gender === subjGender) &&
                            (!r.appliesTo || !r.appliesTo.replace(/[\s_]/g, '').toLowerCase().includes('zerocopula'))
                        );
                    }
                }

                const wordMarkers = (waConfig?.triggers || []).filter(t => {
                    if (!t) return false;
                    const trigStr = String(t.trigger || '').toLowerCase();
                    if (t.type === 'trigger' && t.trigger === role) {
                        if (t.domConditions?.requiresTransitive && !hasObject) return false;
                        return applyCaseToObject(
                            { original: q, role, number: info.isPlural ? 'P' : 'S', person: info.person || '3rd', sentencePosition: i },
                            t,
                            match,
                            PRONOUN_MAP[q],
                            context
                        );
                    }
                    if (t.type === 'word' && trigStr && trigStr.split(',').some(s => s.trim() === q)) return true;
                    if (t.type === 'suffix' && trigStr && q.endsWith(trigStr.replace(/^-/, ''))) {
                        const cleanTrigger = trigStr.replace(/^-/, '');
                        if ((cleanTrigger === 's' || cleanTrigger === 'es') && (role === 'V' || role === 'M')) {
                            return false;
                        }
                        return true;
                    }
                    return false;
                });

                if (role === 'V' && !isAuxiliary) {
                    activeTense = resolveTempo(auxiliaryStack) || info.tense;
                    auxiliaryStack = [];
                }

                const infRes = applyTokenInflectionsAndMarkers({
                    q,
                    fullForm,
                    info,
                    context,
                    role,
                    i,
                    tokens,
                    finalRoles,
                    match,
                    rankedCandidates,
                    personRule,
                    isAuxiliary,
                    isArticle,
                    isSupportDo,
                    isCopulaPredicate,
                    isComparisonTarget,
                    hasObject,
                    activeTense,
                    wordMarkers,
                    isCopulaReplacement: tokenData[i].isCopulaReplacement
                });

                if (infRes.phraseNegated) phraseIsNegative = true;
                breakdown[i] = { ...infRes.tokenObj, occKey, clauseIdx };
                i++;
            }

            return { breakdown, phraseIsNegative };
        };

        const isLexiconVerbFn = (wordLow) => findRankedLexiconCandidates(wordLow, 'V').some(c => matchesPos(c.entry?.wordClass, 'V'));
        const segments = splitSentenceIntoSegments(line, { isLexiconVerb: isLexiconVerbFn });

        if (segments.length === 0) return null;

        const finalBFree = [];
        const finalBAffix = [];
        const finalBAlt = [];

        const finalRFree = [];
        const finalRAffix = [];
        const finalRAlt = [];

        let totalPhraseIsNegative = false;
        let hasAmbiguousReading = false;
        let clauseCounter = 0;

        segments.forEach((seg, segIdx) => {
            if (seg.type === 'punct') {
                const punctToken = {
                    original: seg.text,
                    conlang: seg.text.trim(),
                    role: 'PUNCT',
                    occKey: `p:${segIdx}`,
                    swallowed: false,
                    found: true,
                    isPunct: true
                };
                finalBFree.push(punctToken);
                finalBAffix.push(punctToken);
                finalBAlt.push(punctToken);

                finalRFree.push(punctToken);
                finalRAffix.push(punctToken);
                finalRAlt.push(punctToken);
            } else if (seg.type === 'conj') {
                const low = seg.text.replace(/[.,!?()[\]{}"`:;]/g, '').toLowerCase();
                const occKey = `k:${segIdx}`;
                const role = getOverrideForToken(occKey, low) || 'K';
                const ranked = findRankedLexiconCandidates(low, 'C');
                const choiceKey = getChoiceForToken(occKey, low);
                let match = null;
                if (choiceKey) {
                    const foundCand = ranked.find(c =>
                        (c.entry.id != null && String(c.entry.id) === String(choiceKey)) ||
                        (c.entry.word || '').replace(/\*/g, '') === choiceKey
                    );
                    match = foundCand?.entry || null;
                }
                if (!match) {
                    match = ranked[0]?.entry || null;
                }
                const cands = ranked.slice(0, 8).map(c => ({
                    id: c.entry.id != null ? String(c.entry.id) : `${(c.entry.word || '').replace(/\*/g, '')}__${c.entry.wordClass || ''}`,
                    word: (c.entry.word || '').replace(/\*/g, ''),
                    conlang: transliterate((c.entry.word || '').replace(/\*/g, ''), lexicon),
                    translation: c.entry.translation || '',
                    shortTranslation: c.entry.shortTranslation || '',
                    definition: c.entry.definition || '',
                    wordClass: c.entry.wordClass || '',
                    matchSource: c.matchSource || 'lexicon',
                    score: c.score ?? 0,
                    isSelected: c.entry === match
                }));
                const conjWord = match ? transliterate((match.word || '').replace(/\*/g, ''), lexicon) : `[${low}]`;
                const conjToken = {
                    original: seg.text,
                    conlang: conjWord,
                    conlangBase: match ? (match.word || '').replace(/\*/g, '') : `[${low}]`,
                    role,
                    occKey,
                    found: !!match,
                    entry: match,
                    candidates: cands,
                    matchCount: cands.length,
                    alternatives: cands.slice(1, 5).map(c => c.conlang),
                    swallowed: false,
                    isClauseConjunction: true
                };

                finalBFree.push(conjToken);
                finalBAffix.push(conjToken);
                finalBAlt.push(conjToken);
                finalRFree.push(conjToken);
                finalRAffix.push(conjToken);
                finalRAlt.push(conjToken);
            } else {
                const parsed = parseClause(seg.text, clauseCounter++);

                if (parsed.phraseIsNegative) totalPhraseIsNegative = true;

                const clauseBFree = parsed.breakdown.map(t => ({ ...t, appliedRules: [...(t.appliedRules || [])] }));
                const clauseBAffix = parsed.breakdown.map(t => ({ ...t, appliedRules: [...(t.appliedRules || [])] }));

                // Person agreement for this clause
                const subjToken = clauseBAffix.find(w => w && w.role === 'S' && w.personRule);
                if (subjToken) {
                    let targetToken = clauseBAffix.filter(w => w && w.role === 'V' && !w.swallowed && !w.isAuxiliary).pop();
                    if (!targetToken) {
                        targetToken = clauseBAffix.filter(w => w && (w.role === 'J' || w.role === 'NOUN') && !w.swallowed).pop();
                    }

                    if (targetToken && subjToken.personRule.affix) {
                        const rawBase = targetToken.conlangBase || targetToken.conlang;
                        const inflectedBase = applyAffixToBase(rawBase, subjToken.personRule.affix, subjToken.personRule);
                        targetToken.conlangBase = inflectedBase;
                        targetToken.conlang = transliterate(inflectedBase, lexicon);
                        targetToken.inflected = true;
                        targetToken.ruleSource = (targetToken.ruleSource ? targetToken.ruleSource + ', ' : '') + 'Person Agreement: ' + (subjToken.personRule.name || subjToken.personRule.person);
                        if (subjToken.isPronoun && proDropMode !== 'never') {
                            subjToken.encodedInVerb = true;
                        }
                    }
                }

                const clauseRFree = reorderBreakdown(clauseBFree, effectiveSyntaxOrder);
                const clauseRAffix = reorderBreakdown(clauseBAffix, effectiveSyntaxOrder);

                finalBFree.push(...clauseBFree);
                finalBAffix.push(...clauseBAffix);

                finalRFree.push(...clauseRFree);
                finalRAffix.push(...clauseRAffix);

                // Alternate reading if ambiguous between Subject and Object
                const ambiguousWords = parsed.breakdown.filter(w =>
                    w && (w.role === 'S' || w.role === 'O') &&
                    !w.isCopulaPredicate &&
                    !PRONOUN_MAP[w.original?.toLowerCase()] &&
                    w.found
                );
                if (ambiguousWords.length >= 2) {
                    hasAmbiguousReading = true;
                    const clauseBAlt = parsed.breakdown.map(t => ({
                        ...t,
                        role: t.role === 'S' ? 'O' : t.role === 'O' ? 'S' : t.role,
                        appliedRules: [...(t.appliedRules || [])]
                    }));
                    const clauseRAlt = reorderBreakdown(clauseBAlt, effectiveSyntaxOrder);
                    finalBAlt.push(...clauseBAlt);
                    finalRAlt.push(...clauseRAlt);
                } else {
                    finalBAlt.push(...clauseBFree);
                    finalRAlt.push(...clauseRFree);
                }
            }
        });

        const buildRomanizedString = (reorderedList) => {
            let s = '';
            reorderedList.forEach((w) => {
                if (!w || w.swallowed || w.encodedInVerb) return;
                const wordStr = w.conlang;
                if (!wordStr) return;

                if (w.isPunct) {
                    s = s.trim() + wordStr + ' ';
                } else {
                    s += wordStr + ' ';
                }
            });
            return s.trim();
        };

        const appendNegation = (romStr) => {
            if (totalPhraseIsNegative && waConfig?.negation?.position === 'endOfSentence' && waConfig?.negation?.content) {
                return (romStr + ' ' + waConfig.negation.content).trim();
            }
            return romStr;
        };

        const results = [];
        const romFree = appendNegation(buildRomanizedString(finalRFree));
        const romAffix = appendNegation(buildRomanizedString(finalRAffix));
        const romAlt = hasAmbiguousReading ? appendNegation(buildRomanizedString(finalRAlt)) : '';

        const useAffix = (romAffix !== romFree && (romAffix.trim() || finalBAffix.length > 0));

        const primaryRom = useAffix ? romAffix : romFree;
        const primaryBreakdown = useAffix ? finalBAffix : finalBFree;
        const primaryReordered = useAffix ? finalRAffix : finalRFree;
        const coreLabel = extractCoreOrderLabel(effectiveSyntaxOrder);

        if (primaryRom.trim() || primaryBreakdown.length > 0) {
            results.push({
                key: 'phrase-primary', type: 'phrase', label: 'TRANSLATION SUGGESTION',
                romanized: primaryRom || '[empty]',
                wordBreakdown: primaryBreakdown, reordered: primaryReordered,
                lineStart, lineEnd, effectiveSyntaxOrder, coreOrderLabel: coreLabel
            });
        }

        if (useAffix && romAffix.trim() && romFree.trim()) {
            results.push({
                key: 'phrase-affix', type: 'phrase', label: 'TRANSLATION SUGGESTION (Affix Form)',
                romanized: romAffix || '[empty]',
                wordBreakdown: finalBAffix, reordered: finalRAffix,
                lineStart, lineEnd, effectiveSyntaxOrder, coreOrderLabel: coreLabel
            });
            results[0].label = 'TRANSLATION SUGGESTION (Free Form)';
            results[0].romanized = romFree;
            results[0].wordBreakdown = finalBFree;
            results[0].reordered = finalRFree;
        }

        if (hasAmbiguousReading && romAlt.trim() && romAlt !== romFree && romAlt !== romAffix) {
            results.push({
                key: 'phrase-alt-ambiguity',
                type: 'phrase',
                label: 'ALTERNATE READING (Inverted S/O)',
                romanized: romAlt,
                wordBreakdown: finalBAlt,
                reordered: finalRAlt,
                lineStart,
                lineEnd,
                effectiveSyntaxOrder,
                coreOrderLabel: coreLabel
            });
        }

        if (!copulaOverride && waConfig?.copulaBehavior === 'zero_copula') {
            const suggsOmit = computePhraseSuggestion(val, safeCursor, customSyntaxOrder, userManualRoles, 'omit', userWordChoices) || [];
            let suggsReplace = [];

            if (waConfig?.copulaReplacement && waConfig.copulaReplacement.trim() !== '') {
                suggsReplace = computePhraseSuggestion(val, safeCursor, customSyntaxOrder, userManualRoles, 'replace', userWordChoices) || [];
            }

            suggsOmit.forEach(s => {
                if (s.label) s.label = s.label.replace('TRANSLATION SUGGESTION', 'TRANSLATION (Zero Copula: Omit)');
                s.key = s.key + '-omit';
            });
            suggsReplace.forEach(s => {
                if (s.label) s.label = s.label.replace('TRANSLATION SUGGESTION', 'TRANSLATION (Zero Copula: Marker)');
                s.key = s.key + '-replace';
            });

            return [...suggsOmit, ...suggsReplace];
        }

        return results.map(res => {
            const outTokens = res.romanized.split(' ');
            const filtered = [];
            for (let j = 0; j < outTokens.length; j++) {
                if (j > 0 && outTokens[j] === outTokens[j - 1]) continue;
                filtered.push(outTokens[j]);
            }
            const rom = filtered.join(' ');
            return { ...res, romanized: rom, display: transliterate(rom, lexicon) };
        });
    };

    return {
        computePhraseSuggestion,
        lemmatize,
        matchesTranslation,
        findGrammarRule,
        reorderBreakdown,
        findRankedLexiconCandidates
    };
}

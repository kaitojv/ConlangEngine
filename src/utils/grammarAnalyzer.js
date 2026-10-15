import { applyRuleToWord } from './morphologyEngine.js';
import nlp from 'compromise';
import { normalizeTranslation } from './lexiconMatcher.js';

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
    'you':    { base: 'you',  person: '2nd', number: 'S', role: 'S' },
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

    // Helper to resolve modifier positioning consistently across Subject, Object, Prepositional Phrase, and Verb
    const resolveModifierPos = (modRole) => {
        if (modRole === 'G') return waConfig?.genPos || 'before';
        if (modRole === 'R') return waConfig?.advPos || 'before';
        if (modRole === 'J' || modRole === 'C') return adjPosDefault;
        return waConfig?.adjPos || adjPosDefault;
    };

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

    const isExactGlossMatch = (translation, target) => {
        if (!translation || !target) return false;
        const t = translation.normalize('NFC').toLowerCase().trim();
        const q = target.normalize('NFC').toLowerCase().trim();
        if (t === q || t === 'to ' + q) return true;

        // Check stripped keys from lexiconMatcher
        const keys = normalizeTranslation(translation);
        if (keys.includes(q)) return true;

        const defs = t.split(/[,;/|]+/).map(d => d.trim().toLowerCase()).filter(Boolean);
        return defs.includes(q) || defs.includes('to ' + q);
    };

    const matchesTranslation = (translation, q) => {
        if (!translation || !q) return false;
        const t = translation.normalize('NFC').toLowerCase().trim();
        const query = q.normalize('NFC').toLowerCase().trim();
        
        if (t === query) return true;

        // Check canonical keys (handles parentheticals like "water (noun)", "to drink (water)")
        const keys = normalizeTranslation(translation);
        if (keys.includes(query)) return true;
        
        const definitions = t.split(/[,;/|]+/).map(d => d.trim().toLowerCase()).filter(Boolean);
        if (definitions.includes(query)) return true;
        if (definitions.some(d => d === query || d === 'to ' + query)) return true;

        if (FUNCTION_WORDS.has(query)) return false;

        const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        try {
            const regex = new RegExp('(^|[^a-z0-9])' + esc + '($|[^a-z0-9])', 'i');
            if (definitions.some(d => regex.test(d))) return true;
        } catch {
            // Malformed regex query fallback
        }

        return false;
    };

    // Centralized lexicon lookup supporting conlang word (e.word), translation, shortTranslation, and definition
    const findLexiconMatches = (query, preferredRole = null) => {
        if (!query || !Array.isArray(lexicon)) return [];
        const qLow = query.normalize('NFC').toLowerCase().trim();
        const qBase = normalizeToBase ? normalizeToBase(qLow) : qLow;

        let effectivePrefRole = preferredRole;
        if (!effectivePrefRole && (qLow.startsWith('to ') || qLow.startsWith('to_'))) {
            effectivePrefRole = 'V';
        }

        const matches = lexicon.filter(e => {
            if (!e) return false;
            // 1. Conlang word match (e.word without asterisks, checking raw and base orthography)
            const conlangWord = (e.word || '').replace(/[*]/g, '').normalize('NFC').toLowerCase().trim();
            const conlangBase = normalizeToBase ? normalizeToBase(conlangWord) : conlangWord;
            if (conlangWord === qLow || conlangBase === qBase || conlangWord === qBase || conlangBase === qLow) return true;

            // 2. Gloss / Translation / Definition matches
            if (e.translation && matchesTranslation(e.translation, qLow)) return true;
            if (e.shortTranslation && matchesTranslation(e.shortTranslation, qLow)) return true;
            if (e.definition && matchesTranslation(e.definition, qLow)) return true;

            return false;
        });

        if (matches.length > 0) {
            return matches.sort((a, b) => {
                const wca = (a.wordClass || '').toLowerCase();
                const wcb = (b.wordClass || '').toLowerCase();

                // 1. Prioritize matching POS if preferredRole is provided
                if (effectivePrefRole) {
                    const aMatches = matchesPos(wca, effectivePrefRole);
                    const bMatches = matchesPos(wcb, effectivePrefRole);
                    if (aMatches && !bMatches) return -1;
                    if (!aMatches && bMatches) return 1;
                }

                // 2. Prefer exact conlang word match
                const aWord = (a.word || '').replace(/[*]/g, '').toLowerCase().trim();
                const bWord = (b.word || '').replace(/[*]/g, '').toLowerCase().trim();
                const aExactWord = aWord === qLow || (normalizeToBase && normalizeToBase(aWord) === qBase);
                const bExactWord = bWord === qLow || (normalizeToBase && normalizeToBase(bWord) === qBase);
                if (aExactWord && !bExactWord) return -1;
                if (!aExactWord && bExactWord) return 1;

                // 3. Prefer exact gloss match
                const ta = (a.shortTranslation || a.translation || a.word || '').toLowerCase();
                const tb = (b.shortTranslation || b.translation || b.word || '').toLowerCase();
                const aExact = isExactGlossMatch(ta, qLow);
                const bExact = isExactGlossMatch(tb, qLow);
                if (aExact && !bExact) return -1;
                if (!aExact && bExact) return 1;

                return ta.length - tb.length;
            });
        }

        if (NEGATIVE_CONTRACTIONS[qLow]) {
            return findLexiconMatches(NEGATIVE_CONTRACTIONS[qLow], preferredRole || 'N');
        }

        return [];
    };

    // Resolve English stem candidates against the lexicon (e.g. 'loved' -> 'love', 'running' -> 'run', 'tried' -> 'try', 'sees' -> 'see')
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
        const lower = word.normalize('NFC').toLowerCase();
        const { prevTokens = [] } = context;
        const prev1 = prevTokens[prevTokens.length - 1]?.toLowerCase();

        // Level 0: Blocklists & Irregulars
        if (IRREGULAR_VERBS[lower]) return { ...IRREGULAR_VERBS[lower] };
        if (PRONOUN_MAP[lower]) return { lemma: PRONOUN_MAP[lower].base, tense: 'present', ...PRONOUN_MAP[lower] };
        if (COMPARATIVE_IRREGULAR[lower]) return { ...COMPARATIVE_IRREGULAR[lower] };

        // Level 1: Direct Lexicon Match (checks e.word, e.translation, e.shortTranslation, e.definition)
        const lexMatches = findLexiconMatches(lower);
        if (lexMatches.length > 0) {
            const literalMatch = lexMatches[0];
            const wc = (literalMatch.wordClass || '').toLowerCase();
            const role = getRoleFromWordClass(wc);
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
            if (['am','is','are','was','were','been','be'].includes(prev1)) return { lemma: stem, tense: 'gerund', role: 'V' };
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

            // Check if any candidate stem is a verb in lexicon or known 3SG verb
            const verbStem = candidateStems.find(stem => {
                const matches = findLexiconMatches(stem, 'V');
                return matches.some(m => matchesPos(m.wordClass, 'V'));
            });

            if (verbStem || VERB_3SG.has(lower) || ['he','she','it'].includes(prev1)) {
                const chosenStem = verbStem || candidateStems[0];
                return { lemma: chosenStem, person: '3rd', number: 'S', tense: 'present' };
            }

            // Otherwise check for noun plural
            const nounStem = candidateStems.find(stem => {
                const matches = findLexiconMatches(stem, 'NOUN');
                return matches.some(m => matchesPos(m.wordClass, 'NOUN'));
            });

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
            const isPerfect = ['have','has','had'].includes(prev1);
            const isPassive = ['was','were','been'].includes(prev1);
            const rawStem = lower.slice(0, -2);
            const stem = resolveEnglishStem(rawStem, lower, 'ed');
            return { lemma: stem, tense: 'past', isParticiple: true, isPerfect, isPassive };
        }

        if (lower.endsWith("'s")) return { lemma: lower.slice(0, -2), case: 'possessive', person: '3rd', number: 'S' };

        return { lemma: lower, tense: 'present', person: '3rd', number: 'S' };
    };

    const reorderBreakdown = (breakdownArray, targetSyntaxOrder = syntaxOrder) => {
        const effSyntaxOrder = (waConfig?.syntaxOrder || targetSyntaxOrder || syntaxOrder || 'SVO').toUpperCase();

        // Build baseOrder sequence from effSyntaxOrder preserving user's priority order
        const baseOrder = [];
        for (const char of effSyntaxOrder) {
            if (!baseOrder.includes(char)) {
                baseOrder.push(char);
            }
        }
        if (baseOrder.length <= 4) {
            if (baseOrder.includes('O') && !baseOrder.includes('D')) {
                const oIdx = baseOrder.indexOf('O');
                baseOrder.splice(oIdx + 1, 0, 'D');
            }
            if (baseOrder.includes('V')) {
                const vIdx = baseOrder.indexOf('V');
                if (!baseOrder.includes('M')) baseOrder.splice(vIdx + 1, 0, 'M');
                if (!baseOrder.includes('N')) baseOrder.splice(vIdx + 2, 0, 'N');
            }
        }
        ['Q', 'C', 'T', 'L', 'O', 'D', 'V', 'M', 'N', 'S', 'P', 'R', 'A', 'J', 'G'].forEach(r => {
            if (!baseOrder.includes(r)) baseOrder.push(r);
        });

        const roleOrder = {};
        baseOrder.forEach((r, idx) => { roleOrder[r] = idx; });

        const activeTokens = breakdownArray.filter(Boolean);
        activeTokens.forEach((tok, idx) => {
            tok.originalPos = idx;
        });
        
        const blocks = [];
        let currentModifiers = [];
        let j = 0;

        const partitionModifiers = (mods) => {
            const before = [];
            const after = [];
            mods.forEach(m => {
                const pos = resolveModifierPos(m.role);
                if (pos === 'after') after.push(m);
                else before.push(m);
            });
            return { before, after };
        };

        while (j < activeTokens.length) {
            const tokenObj = activeTokens[j];
            const r = tokenObj.role;

            if (r === 'P') {
                const pBlock = {
                    type: 'Prepositional',
                    headRole: 'P',
                    tokens: [tokenObj]
                };
                j++;
                const pMods = [];
                while (j < activeTokens.length && ['A', 'G', 'J', 'C', 'R'].includes(activeTokens[j].role)) {
                    pMods.push(activeTokens[j]);
                    j++;
                }
                if (j < activeTokens.length && ['O', 'S', 'D', 'L'].includes(activeTokens[j].role)) {
                    const before = [];
                    const after = [];
                    pMods.forEach(m => {
                        const pos = resolveModifierPos(m.role);
                        if (pos === 'priority') {
                            blocks.push({ type: 'Standalone', headRole: m.role, tokens: [m] });
                        } else if (pos === 'after') {
                            after.push(m);
                        } else {
                            before.push(m);
                        }
                    });
                    pBlock.tokens.push(...before, activeTokens[j], ...after);
                    pBlock.headRole = activeTokens[j].role;
                    j++;
                } else {
                    pMods.forEach(m => {
                        const pos = resolveModifierPos(m.role);
                        if (pos === 'priority') {
                            blocks.push({ type: 'Standalone', headRole: m.role, tokens: [m] });
                        } else {
                            pBlock.tokens.push(m);
                        }
                    });
                }
                blocks.push(pBlock);
                continue;
            }

            if (['A', 'G', 'J', 'C', 'R'].includes(r)) {
                const pos = resolveModifierPos(r);
                if (pos === 'priority') {
                    if (currentModifiers.length > 0) {
                        blocks.push({
                            type: 'Standalone',
                            headRole: currentModifiers[0].role,
                            tokens: currentModifiers
                        });
                        currentModifiers = [];
                    }
                    blocks.push({
                        type: 'Standalone',
                        headRole: r,
                        tokens: [tokenObj]
                    });
                } else {
                    currentModifiers.push(tokenObj);
                }
                j++;
                continue;
            }

            if (r === 'S' || r === 'O' || r === 'D' || r === 'L' || r === 'T' || r === 'Q') {
                const { before, after } = partitionModifiers(currentModifiers);
                blocks.push({
                    type: r === 'S' ? 'Subject' : r === 'D' ? 'IndirectObject' : r === 'O' ? 'Object' : 'Constituent',
                    headRole: r,
                    headToken: tokenObj,
                    tokens: [...before, tokenObj, ...after]
                });
                currentModifiers = [];
                j++;
                continue;
            }

            if (r === 'V' || r === 'M' || r === 'N') {
                const { before, after } = partitionModifiers(currentModifiers);
                const lastBlock = blocks[blocks.length - 1];
                if (lastBlock && lastBlock.headRole === r) {
                    lastBlock.tokens.push(...before, tokenObj, ...after);
                } else {
                    blocks.push({
                        type: r === 'V' ? 'Verb' : r === 'M' ? 'Modal' : 'Negation',
                        headRole: r,
                        headToken: tokenObj,
                        tokens: [...before, tokenObj, ...after]
                    });
                }
                currentModifiers = [];
                j++;
                continue;
            }

            if (currentModifiers.length > 0) {
                blocks.push({
                    type: 'Standalone',
                    headRole: currentModifiers[0].role,
                    tokens: currentModifiers
                });
                currentModifiers = [];
            }
            blocks.push({
                type: 'Standalone',
                headRole: r,
                tokens: [tokenObj]
            });
            j++;
        }

        if (currentModifiers.length > 0) {
            const lastBlock = blocks[blocks.length - 1];
            if (lastBlock) {
                const { before, after } = partitionModifiers(currentModifiers);
                lastBlock.tokens.push(...before, ...after);
            } else {
                blocks.push({
                    type: 'Standalone',
                    headRole: currentModifiers[0].role,
                    tokens: currentModifiers
                });
            }
        }

        blocks.sort((a, b) => {
            const weightA = a.headRole === 'K' ? -1 : (roleOrder[a.headRole] ?? 99);
            const weightB = b.headRole === 'K' ? -1 : (roleOrder[b.headRole] ?? 99);
            return weightA - weightB;
        });

        // Respect Preposition vs Postposition settings
        blocks.forEach(block => {
            block.tokens.sort((a, b) => {
                if (a.role === 'P' && b.role !== 'P') return isPostpositional ? 1 : -1;
                if (b.role === 'P' && a.role !== 'P') return isPostpositional ? -1 : 1;
                return 0;
            });
        });

        if (adjectiveAgreement) {
            blocks.forEach(block => {
                if (block.headToken?.appliedRules?.length > 0) {
                    block.tokens.forEach(t => {
                        if (t.role === 'J') {
                            let c = t.conlang;
                            block.headToken.appliedRules.forEach(r => {
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
        blocks.forEach(block => {
            result.push(...block.tokens);
        });
        return result;
    };

    const resolveTempo = (stack) => {
        if (!stack || stack.length === 0) return null;
        if (stack.includes('will') || stack.includes('shall')) return 'future';
        if (stack.includes('have') || stack.includes('has')) return 'perfect';
        if (stack.includes('had')) return 'past_perfect';
        if (stack.includes('be_past') || stack.includes('was') || stack.includes('were')) return 'past';
        if (stack.includes('did')) return 'past';
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

    const computePhraseSuggestion = (val, cursor, customSyntaxOrder = syntaxOrder, userManualRoles = {}, copulaOverride = overrideCopulaBehavior) => {
        const lineStart = val.lastIndexOf('\n', cursor - 1) + 1;
        const rawEnd    = val.indexOf('\n', cursor);
        const lineEnd   = rawEnd === -1 ? val.length : rawEnd;
        let line        = val.slice(lineStart, lineEnd).trim();
        if (!line && val.trim()) {
            // Fallback for trailing newlines or multi-line source input
            const nonEmpties = val.split('\n').map(l => l.trim()).filter(Boolean);
            line = nonEmpties[nonEmpties.length - 1] || '';
        }
        if (!line) return null;

        const PREPOSITIONS = new Set(['of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'about', 'under', 'over', 'into', 'through', 'after', 'before', 'between', 'during', 'without', 'against']);
        const ARTICLES = new Set(['the', 'a', 'an']);
        const QUESTION_WORDS = new Set(['who', 'what', 'where', 'when', 'why', 'how', 'which']);
        const TIME_WORDS = new Set(['now', 'then', 'today', 'tomorrow', 'yesterday', 'tonight', 'always', 'never', 'sometimes', 'often']);
        const PLACE_WORDS = new Set(['here', 'there', 'everywhere', 'nowhere', 'somewhere', 'anywhere', 'up', 'down', 'left', 'right', 'inside', 'outside']);
        const CONJUNCTIONS = new Set(['and', 'or', 'but', 'if', 'as', 'because', 'so', 'although', 'though', 'unless', 'until', 'while', 'since', 'then']);

        const globalOverrides = (waConfig?.roleOverrides || []).reduce((acc, curr) => {
            if (curr.word && curr.role) {
                curr.word.split(',').map(w => w.trim().toLowerCase()).filter(Boolean).forEach(w => {
                    acc[w] = curr.role;
                });
            }
            return acc;
        }, {});
        const mergedOverrides = { ...globalOverrides, ...userManualRoles };

        const parseClause = (clauseText) => {
            const rawTokens = clauseText.trim().split(/\s+/).filter(Boolean);
            if (rawTokens.length === 0) return { breakdown: [], phraseIsNegative: false };
            
            const tokens = rawTokens.map(t => t.replace(/[.,!?()[\]{}"`:;]/g, ''));

            // Run compromise NLP over clause for robust English POS tagging
            let nlpTerms = [];
            try {
                const doc = nlp(clauseText);
                doc.compute('root');
                const termsJson = doc.terms().json();
                let termIdx = 0;
                for (let i = 0; i < tokens.length; i++) {
                    const t = tokens[i].toLowerCase();
                    const matchedTerms = [];
                    while (termIdx < termsJson.length) {
                        const item = termsJson[termIdx];
                        const term = item.terms?.[0] || {};
                        const termText = (term.text || item.text || '').toLowerCase();
                        if (termText) {
                            if (matchedTerms.length === 0) {
                                matchedTerms.push(term);
                                termIdx++;
                            } else if (t.includes(termText) || termText.includes(t)) {
                                matchedTerms.push(term);
                                termIdx++;
                            } else {
                                break;
                            }
                        } else {
                            // Absorbs empty synthetic negative contraction term (e.g. don't -> do + not)
                            matchedTerms.push(term);
                            termIdx++;
                            break;
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
                const nlpTerm = nlpTerms[idx] || {};
                const info = lemmatize(low, { prevTokens: tokens.slice(0, idx), nlpTerm });
                const context = getDefiniteness(idx, rawTokens.map(rt => ({ original: rt.replace(/[.,!?()[\]{}"`:;]/g, '') })));
                return { original: t, low, info, context, nlpTerm };
            });

            const preClassified = [];
            for (let idx = 0; idx < tokens.length; idx++) {
                const t = tokens[idx];
                const low = t.toLowerCase();
                const info = tokenData[idx].info;
                const lemma = info.lemma || low;
                const nlpTags = tokenData[idx].nlpTerm?.tags || [];
                
                if (mergedOverrides[low]) {
                    preClassified.push(mergedOverrides[low]);
                    continue;
                }
                
                if (TIME_WORDS.has(low) || nlpTags.includes('Date')) { preClassified.push('T'); continue; }
                if (PLACE_WORDS.has(low)) { preClassified.push('L'); continue; }
                if (QUESTION_WORDS.has(low) || nlpTags.includes('QuestionWord')) { preClassified.push('Q'); continue; }
                if (NEGATIVE_WORDS.has(low) || nlpTags.includes('Negative')) { preClassified.push('N'); continue; }
                if (ARTICLES.has(low) || (nlpTags.includes('Determiner') && ['the','a','an'].includes(low))) { preClassified.push('A'); continue; }

                if (low === 'to') {
                    const nextLow = idx < tokens.length - 1 ? tokens[idx + 1].toLowerCase() : '';
                    const nextMatches = findLexiconMatches(nextLow);
                    const isNextVerbInLexicon = nextMatches.some(m => matchesPos(m.wordClass, 'V'));
                    const nextNlpTags = tokenData[idx + 1]?.nlpTerm?.tags || [];
                    if (isNextVerbInLexicon || nextNlpTags.includes('Verb') || IRREGULAR_VERBS[nextLow]) {
                        preClassified.push('C'); // Infinitive marker
                    } else {
                        preClassified.push('P'); // Preposition 'to'
                    }
                    continue;
                }

                if (PRONOUN_MAP[low]) {
                    const pm = PRONOUN_MAP[low];
                    if (pm.case === 'genitive') preClassified.push('G');
                    else preClassified.push(pm.role || 'NOUN');
                    continue;
                }

                // 1. CHECK LEXICON'S WORD AND PART OF SPEECH FIRST!
                const prevToken = idx > 0 ? tokens[idx - 1].toLowerCase() : null;
                const prevRole = idx > 0 ? preClassified[idx - 1] : null;
                const prevIsSubject = prevRole === 'S' || PRONOUN_MAP[prevToken]?.role === 'S';
                const prevIsTo = prevToken === 'to';
                const prevIsDet = ARTICLES.has(prevToken) || prevRole === 'A';
                const prevIsModal = prevRole === 'M';
                const prevIsNeg = prevRole === 'N' || (prevToken && NEGATIVE_WORDS.has(prevToken));

                const nextToken = idx < tokens.length - 1 ? tokens[idx + 1].toLowerCase() : null;
                const nextMatches = nextToken ? findLexiconMatches(nextToken) : [];
                const nextIsNoun = nextMatches.some(m => matchesPos(m.wordClass, 'NOUN')) || PRONOUN_MAP[nextToken];

                let preferredRole = null;
                if (prevIsSubject || prevIsTo || prevIsModal || prevIsNeg) {
                    preferredRole = 'V';
                } else if (nextIsNoun && (prevIsDet || !prevRole)) {
                    // "The cold water" or "cold water" -> cold before noun is Adjective
                    preferredRole = 'J';
                } else if (prevIsDet) {
                    preferredRole = 'NOUN';
                } else if (nlpTags.includes('Verb') && !nlpTags.includes('Noun')) {
                    preferredRole = 'V';
                } else if (nlpTags.includes('Adjective') && !nlpTags.includes('Noun')) {
                    preferredRole = 'J';
                } else if (nlpTags.includes('Adverb')) {
                    preferredRole = 'R';
                } else if (nlpTags.includes('Noun')) {
                    preferredRole = 'NOUN';
                }

                let matches = findLexiconMatches(low, preferredRole);
                if (matches.length === 0 && lemma !== low) {
                    matches = findLexiconMatches(lemma, preferredRole);
                }

                if (matches.length > 0) {
                    const bestMatch = matches.find(m => preferredRole ? matchesPos(m.wordClass, preferredRole) : true) || matches[0];
                    if (bestMatch && bestMatch.wordClass) {
                        const wcRole = getRoleFromWordClass(bestMatch.wordClass, preferredRole);
                        if (wcRole) {
                            preClassified.push(wcRole);
                            continue;
                        }
                    }
                }

                // 2. Closed-class verbs & modals
                if (COPULA_VERBS.has(low) || ['am','is','are','was','were','be','been','being'].includes(low)) {
                    const behavior = copulaOverride || waConfig?.copulaBehavior || 'normal';
                    if (behavior === 'omit') { preClassified.push('SKIP'); continue; }
                    if (behavior === 'replace') {
                        const repl = waConfig?.copulaReplacement || 'be';
                        tokens[idx] = repl;
                        tokenData[idx].original = repl;
                        tokenData[idx].low = repl.toLowerCase();
                        tokenData[idx].info = { lemma: repl.toLowerCase(), tense: 'present' };
                        tokenData[idx].isCopulaReplacement = true;
                        preClassified.push('V');
                        continue;
                    }
                    preClassified.push('M');
                    continue;
                }

                if (MODAL_VERBS.has(low) || nlpTags.includes('Modal') || ['will','would','shall','should','can','could','may','might','must'].includes(low)) {
                    preClassified.push('M');
                    continue;
                }

                if (PREPOSITIONS.has(low) || nlpTags.includes('Preposition')) { preClassified.push('P'); continue; }
                if (CONJUNCTIONS.has(low) || nlpTags.includes('Conjunction')) { preClassified.push('K'); continue; }

                // 3. High-confidence compromise POS tags
                if (nlpTags.includes('Verb') && !nlpTags.includes('Noun')) { preClassified.push('V'); continue; }
                if (nlpTags.includes('Adjective') && !nlpTags.includes('Noun')) { preClassified.push('J'); continue; }
                if (nlpTags.includes('Adverb')) { preClassified.push('R'); continue; }
                if (nlpTags.includes('Noun')) { preClassified.push('NOUN'); continue; }

                // 4. Morphological suffixes
                if (low.endsWith('ing') && !ING_NOUNS.has(low) && !ING_ADJECTIVES.has(low)) { preClassified.push('V'); continue; }
                if (low.endsWith('ed') && !ED_ADJECTIVES.has(low)) { preClassified.push('V'); continue; }
                if (low.endsWith('er') && !ER_BLOCKLIST.has(low)) {
                    const stem = resolveEnglishStem(low.endsWith('ier') ? low.slice(0, -3) + 'y' : low.slice(0, -2), low, 'er');
                    if (findLexiconMatches(stem, 'J').some(e => matchesPos(e.wordClass, 'J'))) { preClassified.push('J'); continue; }
                }

                preClassified.push('NOUN');
            }

            // Pass 2: Contextual Verb Identification
            for (let idx = 0; idx < preClassified.length; idx++) {
                const low = tokens[idx].toLowerCase();
                const prevLow = idx > 0 ? tokens[idx-1].toLowerCase() : '';
                
                if (!mergedOverrides[low]) {
                    // Following infinitive 'to', next token is Infinitive Verb ('V')
                    if (prevLow === 'to' && preClassified[idx-1] === 'C') {
                        preClassified[idx] = 'V';
                    }
                    // Following modal 'M', next token is Verb ('V') unless it is an explicit pronoun
                    else if (idx > 0 && preClassified[idx-1] === 'M' && ['NOUN', 'O', 'S'].includes(preClassified[idx]) && !PRONOUN_MAP[low]) {
                        preClassified[idx] = 'V';
                    }
                }
            }

            const firstVerbIdx = preClassified.findIndex(role => role === 'V' || role === 'M');
            const lastVerbIdx = preClassified.map(r => r === 'V' || r === 'M').lastIndexOf(true);
            const mainVerbLemma = firstVerbIdx !== -1 ? tokenData[firstVerbIdx]?.info?.lemma : '';
            const isDitransitive = DITRANSITIVE_VERBS.has(mainVerbLemma) || DITRANSITIVE_VERBS.has(tokens[firstVerbIdx]?.toLowerCase());

            let hasObject = false;
            if (firstVerbIdx !== -1) {
                hasObject = tokens.slice(firstVerbIdx + 1).some((t, idx) => {
                    const globalIdx = firstVerbIdx + 1 + idx;
                    const role = preClassified[globalIdx];
                    return role === 'NOUN' || role === 'O' || PRONOUN_MAP[t.toLowerCase()]?.role === 'O';
                });
            }

            const PRONOUN_OR_DET = new Set([
                'all', 'some', 'none', 'any', 'both', 'each', 'few', 'many', 'several', 
                'everything', 'nothing', 'anything', 'something', 'everyone', 'someone', 
                'anyone', 'nobody', 'everybody', 'somebody', 'anybody', 'much', 'more', 
                'most', 'enough', 'other', 'others', 'another',
                'this', 'that', 'these', 'those'
            ]);

            // Pass 3: Syntactic Roles (distinguishing Subject, Direct Object, and Ditransitive Indirect Object / Dative)
            let postVerbNounCount = 0;
            let insidePrepPhrase = false;

            const finalRoles = preClassified.map((role, idx) => {
                const low = tokens[idx].toLowerCase();
                if (mergedOverrides[low]) return mergedOverrides[low];

                if (idx === lastVerbIdx && (role === 'M' || role === 'V')) {
                    return 'V';
                }

                if (role === 'P') {
                    insidePrepPhrase = true;
                    return 'P';
                }
                
                if (low === 'her') {
                    const nextRole = preClassified[idx + 1];
                    if (nextRole === 'NOUN' || nextRole === 'J') return 'G';
                    return (firstVerbIdx !== -1 && idx > firstVerbIdx && isDitransitive && postVerbNounCount === 0) ? 'D' : 'O';
                }

                if (PRONOUN_OR_DET.has(low)) {
                    let isPronoun = true;
                    for (let k = idx + 1; k < preClassified.length; k++) {
                        const r = preClassified[k];
                        if (r === 'NOUN' || (tokens[k] && PRONOUN_MAP[tokens[k].toLowerCase()])) {
                            isPronoun = false;
                            break;
                        }
                        if (r === 'V' || r === 'M' || r === 'P' || r === 'K') break;
                    }
                    if (isPronoun) {
                        return (firstVerbIdx === -1 || idx < firstVerbIdx) ? 'S' : 'O';
                    }
                    return 'J';
                }

                if (role === 'NOUN' || PRONOUN_MAP[low]?.role) {
                    if (insidePrepPhrase) {
                        insidePrepPhrase = false;
                        return 'L'; // Prepositional Object
                    }
                    if (firstVerbIdx === -1 || idx < firstVerbIdx) {
                        return 'S';
                    }
                    postVerbNounCount++;
                    // If the verb is ditransitive (like 'give Mary a book'), first object is Dative (D), second is Direct Object (O)
                    if (isDitransitive && postVerbNounCount === 1) {
                        return 'D'; // Indirect Object / Dative
                    }
                    return 'O'; // Direct Object / Accusative
                }

                return role;
            });

            const breakdown = [];
            let i = 0;
            let activeTense = null;
            let comparisonTargetIdx = -1;
            let phraseIsNegative = false;
            let auxiliaryStack = [];

            while (i < tokens.length) {
                const q = tokens[i].toLowerCase();
                const fullForm = rawTokens[i];
                const info = tokenData[i].info;
                const context = tokenData[i].context;
                const lemma = info.lemma;
                const role = finalRoles[i];
                const isComparisonTarget = (i === comparisonTargetIdx);

                const isAuxiliary = (role === 'M');
                const isArticle = (role === 'A');
                let personRule = null;

                if (q === 'than') {
                    comparisonTargetIdx = i + 1;
                    if (tokens[i+1] && ['the','a','an'].includes(tokens[i+1].toLowerCase())) comparisonTargetIdx = i + 2;
                    breakdown[i] = { original: fullForm, conlang: '', role: 'C', swallowed: true };
                    i++; continue;
                }
                
                if (role === 'SKIP') {
                    breakdown[i] = { original: fullForm, conlang: `[${q}]`, role: 'M', swallowed: true };
                    i++; continue;
                }

                // Swallow infinitive 'to'
                if (q === 'to' && tokens[i+1]) {
                    const nextLow = tokens[i+1].toLowerCase();
                    const nextMatches = findLexiconMatches(nextLow);
                    const isNextVerb = nextMatches.some(m => matchesPos(m.wordClass, 'V')) || 
                                     IRREGULAR_VERBS[nextLow] || 
                                     preClassified[i+1] === 'V';
                    
                    if (isNextVerb) {
                        breakdown[i] = { original: fullForm, conlang: '', role: 'C', swallowed: true, found: true };
                        i++; continue;
                    }
                }

                // Preposition checking: Can this preposition be absorbed by an applicable case rule on the following noun?
                if (role === 'P' && replacePrepositionsWithCase) {
                    const targetCaseName = PREPOSITION_CASE_MAP[q];
                    const caseRule = targetCaseName ? findGrammarRule(targetCaseName) : null;
                    if (caseRule) {
                        // Preposition will be replaced by the case affix on the noun
                        breakdown[i] = { 
                            original: fullForm, 
                            conlang: '', 
                            role: 'P', 
                            swallowed: true, 
                            ruleName: caseRule.name || targetCaseName,
                            absorbedInCase: true 
                        };
                        i++; 
                        continue;
                    }
                }

                if (['will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must'].includes(q)) { auxiliaryStack.push(q); }
                else if (['have', 'has', 'had'].includes(q)) { auxiliaryStack.push(q); }
                else if (['am', 'is', 'are'].includes(q)) { auxiliaryStack.push('be_pres'); }
                else if (['was', 'were'].includes(q)) { auxiliaryStack.push('be_past'); }
                else if (['do', 'does', 'did'].includes(q)) { auxiliaryStack.push('do'); }
                else if (q === 'been') { auxiliaryStack.push('been'); }

                let matches = findLexiconMatches(q, role);
                if (matches.length === 0 && lemma !== q) {
                    matches = findLexiconMatches(lemma, role);
                }
                let match = matches.find(m => matchesPos(m.wordClass, role)) || matches[0] || null;

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

                if (tokenData[i].isCopulaReplacement && !match) {
                    match = { word: tokens[i], wordClass: 'Verb', translation: tokens[i] };
                }

                if (match || (personRule && PRONOUN_MAP[q])) {
                    let conlang = (match ? match.word : personRule.freeForm).replace(/\*/g, '');
                    let inflected = false;
                    let appliedRuleName = '';
                    let appliedRuleSource = '';

                    if (match?.wordClass?.toLowerCase().includes('verb') && !isAuxiliary) {
                        activeTense = resolveTempo(auxiliaryStack) || info.tense;
                        auxiliaryStack = [];
                    }

                    // Apply Matrix Grammar Rules from the Grammar Page
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
                    if (info.case === 'genitive' || q.endsWith("'s") || role === 'G') {
                        possibleRules.push(findGrammarRule('genitive', 'possessive'));
                    }

                    // 4. Comparison target (than)
                    if (isComparisonTarget) {
                        possibleRules.push(findGrammarRule('ablative', 'than'));
                    }

                    // 5. Prepositional Case Suffixes (Option 1: In the house -> house-LOC)
                    const prevPToken = i > 0 && finalRoles[i-1] === 'P' ? tokens[i-1].toLowerCase() :
                                      i > 1 && finalRoles[i-2] === 'P' && ['the','a','an'].includes(tokens[i-1].toLowerCase()) ? tokens[i-2].toLowerCase() : null;
                    if (prevPToken && PREPOSITION_CASE_MAP[prevPToken]) {
                        const prepCase = findGrammarRule(PREPOSITION_CASE_MAP[prevPToken]);
                        if (prepCase) possibleRules.push(prepCase);
                    }

                    // 6. Morphosyntactic Alignment & Core Cases (Nominative, Accusative, Ergative, Absolutive, Dative)
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
                        // Skip if already applied by a grammar rule with the same case or name
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
                            phraseIsNegative = true;
                            inflected = true;
                            appliedRuleSource = (appliedRuleSource ? appliedRuleSource + ', ' : '') + 'Word Assist: ' + (t.name || t.trigger || t.marker);
                        }
                    });

                    const transliteratedWord = transliterate(conlang, lexicon);
                    breakdown[i] = {
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
                        personRule,
                        isPronoun: !!PRONOUN_MAP[q],
                        alternatives: matches.slice(1, 5).map(m => transliterate(m.word, lexicon)),
                        matchCount: matches.length,
                        swallowed: false, 
                        context, 
                        appliedRules,
                        animacy: getAnimacyLevel({ original: q, sentencePosition: i }, match, PRONOUN_MAP[q])
                    };
                } else {
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
                            phraseIsNegative = true;
                            inflected = true;
                            appliedRuleSource = (appliedRuleSource ? appliedRuleSource + ', ' : '') + 'Word Assist: ' + (t.name || t.trigger || t.marker);
                        }
                    });

                    breakdown[i] = { 
                        original: fullForm, 
                        conlang: isFound ? transliterate(conlang, lexicon) : conlang, 
                        conlangBase: conlang, 
                        role, 
                        found: isFound, 
                        personRule,
                        isPronoun: !!PRONOUN_MAP[q],
                        inflected, 
                        ruleSource: appliedRuleSource,
                        swallowed: isAuxiliary || isArticle,
                        animacy: getAnimacyLevel({ original: q, sentencePosition: i }, null, PRONOUN_MAP[q])
                    };
                }
                i++;
            }

            return { breakdown, phraseIsNegative };
        };

        const parts = line.split(/([.,;:!?]+)/);
        const segments = [];
        for (let idx = 0; idx < parts.length; idx++) {
            const part = parts[idx];
            if (idx % 2 === 0) {
                if (part.trim()) segments.push({ type: 'text', text: part });
            } else {
                segments.push({ type: 'punct', text: part });
            }
        }

        if (segments.length === 0) return null;

        const finalBFree = [];
        const finalBAffix = [];
        const finalBAlt = [];
        
        const finalRFree = [];
        const finalRAffix = [];
        const finalRAlt = [];

        let totalPhraseIsNegative = false;
        let hasAmbiguousReading = false;

        segments.forEach((seg) => {
            if (seg.type === 'punct') {
                const punctToken = {
                    original: seg.text,
                    conlang: seg.text.trim(),
                    role: 'PUNCT',
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
            } else {
                const parsed = parseClause(seg.text);
                
                if (parsed.phraseIsNegative) totalPhraseIsNegative = true;
                
                const clauseBFree = JSON.parse(JSON.stringify(parsed.breakdown));
                const clauseBAffix = JSON.parse(JSON.stringify(parsed.breakdown));
                
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
                
                const clauseRFree = reorderBreakdown(clauseBFree, customSyntaxOrder);
                const clauseRAffix = reorderBreakdown(clauseBAffix, customSyntaxOrder);
                
                finalBFree.push(...clauseBFree);
                finalBAffix.push(...clauseBAffix);
                
                finalRFree.push(...clauseRFree);
                finalRAffix.push(...clauseRAffix);

                // Alternate reading if ambiguous between Subject and Object
                const ambiguousWords = parsed.breakdown.filter(w =>
                    w && (w.role === 'S' || w.role === 'O') &&
                    !PRONOUN_MAP[w.original?.toLowerCase()] &&
                    w.found
                );
                if (ambiguousWords.length >= 2) {
                    hasAmbiguousReading = true;
                    const clauseBAlt = JSON.parse(JSON.stringify(parsed.breakdown));
                    clauseBAlt.forEach(w => {
                        if (w && w.role === 'S') w.role = 'O';
                        else if (w && w.role === 'O') w.role = 'S';
                    });
                    const clauseRAlt = reorderBreakdown(clauseBAlt, customSyntaxOrder);
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
        
        if (primaryRom.trim() || primaryBreakdown.length > 0) {
            results.push({
                key: 'phrase-primary', type: 'phrase', label: 'TRANSLATION SUGGESTION',
                romanized: primaryRom || '[empty]',
                wordBreakdown: primaryBreakdown, reordered: primaryReordered, lineStart, lineEnd
            });
        }

        if (useAffix && romAffix.trim() && romFree.trim()) {
            results.push({
                key: 'phrase-affix', type: 'phrase', label: 'TRANSLATION SUGGESTION (Affix Form)',
                romanized: romAffix || '[empty]',
                wordBreakdown: finalBAffix, reordered: finalRAffix, lineStart, lineEnd
            });
            results[0].label = 'TRANSLATION SUGGESTION (Free Form)';
            results[0].romanized = romFree;
            results[0].wordBreakdown = finalBFree;
            results[0].reordered = finalRFree;
        }

        // Expose alternate S/O ambiguity reading when it produces a distinct sentence
        if (hasAmbiguousReading && romAlt.trim() && romAlt !== romFree && romAlt !== romAffix) {
            results.push({
                key: 'phrase-alt-ambiguity',
                type: 'phrase',
                label: 'ALTERNATE READING (Inverted S/O)',
                romanized: romAlt,
                wordBreakdown: finalBAlt,
                reordered: finalRAlt,
                lineStart,
                lineEnd
            });
        }

        if (!copulaOverride && waConfig?.copulaBehavior === 'zero_copula') {
            const suggsOmit = computePhraseSuggestion(val, cursor, customSyntaxOrder, userManualRoles, 'omit') || [];
            let suggsReplace = [];
            
            if (waConfig?.copulaReplacement && waConfig.copulaReplacement.trim() !== '') {
                suggsReplace = computePhraseSuggestion(val, cursor, customSyntaxOrder, userManualRoles, 'replace') || [];
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
            const tokens = res.romanized.split(' ');
            const filtered = [];
            for (let j = 0; j < tokens.length; j++) {
                if (j > 0 && tokens[j] === tokens[j-1]) continue;
                filtered.push(tokens[j]);
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
        reorderBreakdown
    };
}

import { applyRuleToWord } from '@/utils/morphologyEngine.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';

const MODAL_VERBS = new Set([
    'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'ought to', 'used to', 'dare', 'need', 'have to', 'has to', 'had to'
]);

const ING_NOUNS = new Set([
    'morning', 'evening', 'spring', 'ceiling', 'building', 'king', 'ring', 'thing', 'wing', 'string', 'sting', 'swing', 'sing',
    'bling', 'ding', 'fling', 'ping', 'sling', 'wedding', 'pudding', 'blessing', 'boarding', 'clothing', 'coating',
    'crossing', 'drawing', 'earning', 'feeling', 'filling', 'finding', 'flooring', 'funding', 'gathering', 'greeting',
    'heading', 'helping', 'inning', 'landing', 'lining', 'meaning', 'meeting', 'opening', 'parking', 'planning', 'posting',
    'reading', 'roofing', 'seating', 'setting', 'serving', 'siding', 'spelling', 'stirring', 'stuffing', 'topping', 'training',
    'warning', 'wiring', 'writing', 'pricing', 'savings', 'earnings', 'belongings', 'surroundings', 'findings', 'proceedings',
    'dealings', 'innings', 'trimmings', 'workings', 'underpinnings', 'outskirts', 'during', 'among', 'along', 'nothing',
    'something', 'anything', 'everything', 'herring', 'pudding', 'sibling', 'ceiling', 'darling', 'dumpling', 'evening',
    'farthing', 'offspring', 'shilling', 'sterling', 'fledgling', 'nestling', 'underling', 'hireling'
]);

const ING_ADJECTIVES = new Set([
    'interesting', 'boring', 'exciting', 'amazing', 'charming', 'daring', 'demanding', 'thrilling', 'willing', 'unwilling',
    'appealing', 'appalling', 'astonishing', 'convincing', 'cunning', 'dashing', 'daunting', 'deserving', 'distinguishing',
    'embarrassing', 'encouraging', 'entertaining', 'existing', 'fascinating', 'fitting', 'flattering', 'forgiving', 'glaring',
    'haunting', 'imposing', 'inspiring', 'insulting', 'inviting', 'lasting', 'leading', 'living', 'long-lasting', 'loving',
    'misleading', 'missing', 'outstanding', 'overwhelming', 'pressing', 'promising', 'remaining', 'rewarding', 'shocking',
    'smashing', 'startling', 'striking', 'stunning', 'surrounding', 'tiring', 'touching', 'underlying', 'unfolding',
    'unrelenting', 'varying', 'welcoming', 'working'
]);

const VERB_3SG = new Set([
    'is', 'has', 'does', 'goes', 'says', 'pays', 'plays', 'stays', 'makes', 'takes', 'gives', 'lives', 'loves', 'moves',
    'proves', 'serves', 'saves', 'runs', 'comes', 'becomes', 'seems', 'feels', 'keeps', 'sees', 'meets', 'gets', 'puts',
    'sets', 'lets', 'cuts', 'hits', 'sits', 'fits', 'hurts', 'quits', 'splits', 'knows', 'shows', 'grows', 'flows', 'throws',
    'follows', 'allows', 'borrows', 'needs', 'reads', 'leads', 'feeds', 'breeds', 'speeds', 'bleeds', 'means', 'cleans'
]);

const S_NOUNS_SING = new Set([
    'status', 'bonus', 'campus', 'census', 'nexus', 'virus', 'focus', 'cactus', 'radius', 'stimulus', 'syllabus', 'apparatus',
    'caucus', 'chorus', 'circus', 'corpus', 'exodus', 'fungus', 'genius', 'hiatus', 'impetus', 'lapsus', 'prospectus', 'ruckus',
    'terminus', 'tinnitus', 'tonus', 'physics', 'mathematics', 'economics', 'politics', 'ethics', 'athletics', 'acoustics',
    'aerobics', 'robotics', 'genetics', 'linguistics', 'statistics', 'logistics', 'gymnastics', 'class', 'glass', 'grass',
    'mass', 'pass', 'less', 'dress', 'press', 'stress', 'mess', 'boss', 'loss', 'cross', 'moss', 'toss', 'plus', 'thus', 'bus', 'pus'
]);

const ER_BLOCKLIST = new Set([
    'her', 'water', 'butter', 'sister', 'brother', 'mother', 'father', 'daughter', 'winter', 'summer', 'after', 'river',
    'flower', 'tower', 'power', 'cover', 'silver', 'copper', 'timber', 'letter', 'dinner', 'supper', 'chapter', 'answer',
    'cancer', 'center', 'corner', 'counter', 'danger', 'disorder', 'filter', 'finger', 'flutter', 'foster', 'gather',
    'gender', 'hunger', 'laughter', 'lawyer', 'leader', 'leather', 'liver', 'lobster', 'manner', 'master', 'matter',
    'member', 'monster', 'murder', 'offer', 'other', 'oyster', 'partner', 'pepper', 'pitcher', 'plaster', 'poster',
    'powder', 'prefer', 'proper', 'quarter', 'render', 'shelter', 'shower', 'slander', 'soccer', 'spider', 'suffer',
    'sugar', 'thunder', 'traitor', 'transfer', 'trigger', 'tumbler', 'ulcer', 'usher', 'vector', 'vendor', 'venture',
    'weather', 'whisper', 'wonder', 'teacher', 'writer', 'player', 'worker', 'manager', 'officer', 'driver', 'farmer',
    'hunter', 'baker', 'singer', 'dancer', 'painter', 'runner', 'climber', 'fighter', 'rider', 'swimmer', 'winner',
    'loser', 'builder', 'buyer', 'seller', 'dealer', 'healer', 'leader', 'reader', 'speaker', 'keeper', 'seeker',
    'maker', 'taker', 'breaker', 'shaker', 'helper', 'opener', 'closer', 'owner', 'user', 'view'
]);

const EST_BLOCKLIST = new Set([
    'forest', 'interest', 'protest', 'contest', 'harvest', 'manifest', 'modest', 'honest', 'arrest', 'earnest', 'request',
    'suggest', 'digest', 'invest', 'infest', 'attest', 'bequest', 'breast', 'chest', 'crest', 'jest', 'nest', 'pest',
    'quest', 'rest', 'test', 'vest', 'west', 'zest', 'beast', 'feast', 'least', 'yeast', 'priest'
]);

const ED_ADJECTIVES = new Set([
    'naked', 'sacred', 'wicked', 'ragged', 'rugged', 'jagged', 'cragged', 'beloved', 'learned', 'blessed', 'dogged', 'aged',
    'wretched', 'crooked'
]);

const COMPARATIVE_IRREGULAR = {
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

const IRREGULAR_VERBS = {
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

const PRONOUN_MAP = {
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

// Word Assist Configuration Menu Constants
const GRAMMAR_RULE_IMPORT_MAP = [
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
    { keywords: ['subject', 'nominative'], trigger: 'S', type: 'trigger', position: 'suffix' },
];

function importDefaults(ruleName) {
    const lower = (ruleName || '').toLowerCase();
    for (const map of GRAMMAR_RULE_IMPORT_MAP) {
        if (map.keywords.some(k => lower.includes(k))) return map;
    }
    return { trigger: '', type: 'word', position: 'suffix' };
}

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
    
    // Proper name heuristic: Uppercase not at start of sentence
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
    
    // 1. Animacy Check
    const animacyLevel = getAnimacyLevel(token, lexEntry, pronounInfo);
    if (scope !== "all") {
        const tester = ANIMACY_SCOPES[scope];
        if (tester && !tester.test(lexEntry, pronounInfo)) {
            // Level-based fallback if tester fails
            const hierarchy = ["pronoun_1_2", "pronoun", "human", "animate", "concrete", "abstract", "all"];
            if (hierarchy.indexOf(animacyLevel) > hierarchy.indexOf(scope)) return false;
        }
    }

    // 2. DOM Conditions
    if (dom.requiresDefinite && !context.isDefinite) return false;
    if (dom.requiresIndefinite && !context.isIndefinite) return false;
    if (dom.requiresSpecific && !context.isSpecific) return false;
    
    if (dom.numberRestriction && token.number !== dom.numberRestriction) return false;
    
    if (dom.personRestriction) {
        const allowed = Array.isArray(dom.personRestriction) ? dom.personRestriction : [dom.personRestriction];
        if (!allowed.includes(pronounInfo?.person)) return false;
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


export function createGrammarAnalyzer(configOptions) {
    const { 
        lexicon, grammarRules, syntaxOrder, waConfig, personRulesArray, overrideCopulaBehavior, 
        transliterate = (s) => s,
        adjectivePlacement = 'pre-nominal',
        adjectiveAgreement = false
    } = configOptions;

    const adjPos = adjectivePlacement === 'post-nominal' ? 'after' : 'before';

const reorderBreakdown = (breakdownArray) => {
        const roleOrder = {};
        let customOrder = waConfig.syntaxOrder;
        let sOrder = customOrder || syntaxOrder || 'QCTLJNORVMSAPG';
        
        'QCTLJNORVMSAPG'.split('').forEach(r => { if (!sOrder.includes(r)) sOrder += r; });
        sOrder.split('').forEach((r, idx) => { roleOrder[r] = idx; });

        const activeTokens = breakdownArray.filter(w => w);
        activeTokens.forEach((tok, idx) => {
            tok.originalPos = idx;
        });
        
        const blocks = [];
        let currentModifiers = [];
        let j = 0;

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
                let pMods = [];
                while (j < activeTokens.length && ['A', 'G', 'J', 'C', 'R'].includes(activeTokens[j].role)) {
                    pMods.push(activeTokens[j]);
                    j++;
                }
                if (j < activeTokens.length && ['O', 'S'].includes(activeTokens[j].role)) {
                    let before = [];
                    let after = [];
                    pMods.forEach(m => {
                    const pos = (m.role === 'G' ? waConfig.genPos : (m.role === 'R' ? waConfig.advPos : (m.role === 'J' || m.role === 'C' ? adjPos : waConfig.adjPos))) || 'before';
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
                    const pos = (m.role === 'G' ? waConfig.genPos : (m.role === 'R' ? waConfig.advPos : (m.role === 'J' || m.role === 'C' ? adjPos : waConfig.adjPos))) || 'before';
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
                const pos = (r === 'G' ? waConfig.genPos : (r === 'R' ? waConfig.advPos : waConfig.adjPos)) || 'before';
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

            if (r === 'S') {
                let before = [];
                let after = [];
                currentModifiers.forEach(m => {
                    const pos = (m.role === 'G' ? waConfig.genPos : (m.role === 'R' ? waConfig.advPos : waConfig.adjPos)) || 'before';
                    if (pos === 'after') after.push(m);
                    else before.push(m);
                });
                blocks.push({
                    type: 'Subject',
                    headRole: 'S',
                    headToken: tokenObj,
                    tokens: [...before, tokenObj, ...after]
                });
                currentModifiers = [];
                j++;
                continue;
            }

            if (r === 'O') {
                let before = [];
                let after = [];
                currentModifiers.forEach(m => {
                    const pos = (m.role === 'G' ? waConfig.genPos : (m.role === 'R' ? waConfig.advPos : (m.role === 'J' || m.role === 'C' ? adjPos : waConfig.adjPos))) || 'before';
                    if (pos === 'after') after.push(m);
                    else before.push(m);
                });
                blocks.push({
                    type: 'Object',
                    headRole: 'O',
                    headToken: tokenObj,
                    tokens: [...before, tokenObj, ...after]
                });
                currentModifiers = [];
                j++;
                continue;
            }

            if (r === 'V' || r === 'M' || r === 'N') {
                let before = [];
                let after = [];
                currentModifiers.forEach(m => {
                    const pos = (m.role === 'G' ? waConfig.genPos : (m.role === 'R' ? waConfig.advPos : waConfig.adjPos)) || 'before';
                    if (pos === 'after') after.push(m);
                    else before.push(m);
                });

                let lastBlock = blocks[blocks.length - 1];
                if (lastBlock && lastBlock.type === 'Verb') {
                    lastBlock.tokens.push(...before, tokenObj, ...after);
                } else {
                    blocks.push({
                        type: 'Verb',
                        headRole: 'V',
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
            let lastBlock = blocks[blocks.length - 1];
            if (lastBlock) {
                let before = [];
                let after = [];
                currentModifiers.forEach(m => {
                    const pos = (m.role === 'G' ? waConfig.genPos : (m.role === 'R' ? waConfig.advPos : waConfig.adjPos)) || 'before';
                    if (pos === 'after') after.push(m);
                    else before.push(m);
                });
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

        blocks.forEach(block => {
            block.tokens.sort((a, b) => {
                // Prepositions always come first
                if (a.role === 'P' && b.role !== 'P') return -1;
                if (b.role === 'P' && a.role !== 'P') return 1;
                return 0; // preserve before/after order
            });
        });

        if (adjectiveAgreement) {
            blocks.forEach(block => {
                if (block.headToken && block.headToken.appliedRules && block.headToken.appliedRules.length > 0) {
                    block.tokens.forEach(t => {
                        if (t.role === 'J') {
                            let c = t.conlang;
                            const vStore = useConfigStore.getState();
                            block.headToken.appliedRules.forEach(r => {
                                try {
                                    c = applyRuleToWord(c, r, grammarRules, vStore.vowels, vStore.consonants, vStore.otherPhonemes);
                                    t.inflected = true;
                                    t.ruleSource = (t.ruleSource ? t.ruleSource + ', ' : '') + 'Adjective Agreement: ' + (r.name || r.condition);
                                } catch(e) { console.error(e); }
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


    

// ── Word Assist ──────────────────────────────────────────────────────────────

    // English pronoun → grammatical features
    const PRONOUN_MAP = {
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


    // Apply an affix notation to a base word:
    //   -'ma  → suffix  → soir + 'ma = soir'ma
    //   un'-  → prefix  → un' + soir  = un'soir
    const applyAffixToBase = (base, affix) => {
        if (!base || !affix) return base;
        const a = affix.trim();
        if (a.startsWith('-')) return base + a.slice(1);      // suffix
        if (a.startsWith("'")) return base + a;               // apostrophe suffix edge case
        if (a.endsWith('-'))   return a.slice(0, -1) + base;  // prefix
        if (a.endsWith("'"))   return a + base;               // apostrophe prefix edge case
        return base + ' ' + a;                                // particle (space-separated)
    };

    // Get 1-based position of a role letter in the syntaxOrder string
    const rolePosition = (role) => syntaxOrder.indexOf(role) + 1; // 0 if not found

    // Type → colour token for the badge
    const TYPE_COLORS = { direct: 'var(--acc)', pronoun: '#10b981', inflected: '#f59e0b', 'grammar-case': '#ec4899' };
    const TYPE_LABELS  = { direct: 'lexicon', pronoun: 'pronoun', inflected: 'conjugated', 'grammar-case': 'case' };

    const getWordAtCursor = (str, pos) => {
        let start = pos;
        while (start > 0 && !/\s/.test(str[start - 1])) start--;
        let end = pos;
        while (end < str.length && !/\s/.test(str[end])) end++;
        return { word: str.slice(start, end), start, end };
    };

    const FUNCTION_WORDS = new Set([
        'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'and', 'or', 'but', 'if', 'as',
        'is', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did', 'have', 'has', 'had',
        'my', 'your', 'his', 'her', 'its', 'our', 'their', 'me', 'us', 'him', 'them'
    ]);

    // Returns true only when `q` matches `translation` as a complete word.
    const matchesTranslation = (translation, q) => {
        if (!translation || !q) return false;
        const t = translation.toLowerCase().trim();
        const query = q.toLowerCase().trim();
        
        // Exact match is always preferred
        if (t === query) return true;
        
        // Split and check each definition strictly
        const definitions = t.split(/[,;/]/).map(d => d.trim().toLowerCase()).filter(Boolean);
        if (definitions.includes(query)) return true;
        if (definitions.some(d => d === query || d === 'to ' + query)) return true;

        // For short function words/prepositions, strictly require an exact match in definitions.
        // Prevent them from matching compound verb infinitives (like "to go") or phrases (like "of course").
        if (FUNCTION_WORDS.has(query)) return false;

        // Word boundary match with broad boundaries
        const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        try {
            const regex = new RegExp('(^|[^a-z0-9])' + esc + '($|[^a-z0-9])', 'i');
            if (definitions.some(d => regex.test(d))) return true;
        } catch(e) {}
        
        // Robust fallback: if query is long enough, allow partial inclusion in ANY definition
        if (query.length >= 3) {
            if (definitions.some(d => d.includes(query))) return true;
            if (t.includes(query)) return true;
        }

        return false;
    };

    const lemmatize = (word, context = {}) => {
        const lower = word.toLowerCase();
        const { prevTokens = [] } = context;
        const prev1 = prevTokens[prevTokens.length - 1]?.toLowerCase();

        // Level 0: Blocklists & Irregulars
        if (IRREGULAR_VERBS[lower]) return { ...IRREGULAR_VERBS[lower] };
        if (PRONOUN_MAP[lower]) return { lemma: PRONOUN_MAP[lower].base, tense: 'present', ...PRONOUN_MAP[lower] };
        if (COMPARATIVE_IRREGULAR[lower]) return { ...COMPARATIVE_IRREGULAR[lower] };

        // Level 1: Lexicon Hint (Is it a known root?)
        const literalMatch = lexicon.find(e => e.word.replace(/\*/g,'').toLowerCase() === lower);
        if (literalMatch && literalMatch.wordClass) return { lemma: lower, wordClass: literalMatch.wordClass, tense: 'present' };

        // Level 4: Suffix Analysis
        if (lower.endsWith('ing')) {
            if (ING_NOUNS.has(lower)) return { lemma: lower, wordClass: 'Noun' };
            if (ING_ADJECTIVES.has(lower)) return { lemma: lower, wordClass: 'Adjective' };
            const stem = lower.slice(0, -3);
            if (stem.length < 2) return { lemma: lower, wordClass: 'Noun' };
            if (['am','is','are','was','were','been','be'].includes(prev1)) return { lemma: stem, tense: 'gerund', role: 'V' };
            return { lemma: stem, tense: 'gerund' };
        }

        if (lower.endsWith('s') && !lower.endsWith('ss')) {
             if (VERB_3SG.has(lower)) return { lemma: lower.endsWith('es') ? lower.slice(0, -2) : lower.slice(0, -1), person: '3rd', number: 'S', tense: 'present' };
             if (S_NOUNS_SING.has(lower)) return { lemma: lower, singular: true, wordClass: 'Noun' };
             
             const stem = lower.endsWith('ies') ? lower.slice(0, -3) + 'y' : lower.endsWith('es') ? lower.slice(0, -2) : lower.slice(0, -1);
             const verbMatch = lexicon.find(e => e.translation && matchesTranslation(e.translation, stem) && e.wordClass?.toLowerCase().includes('verb'));
             
             if (verbMatch || ['he','she','it'].includes(prev1)) {
                 return { lemma: stem, person: '3rd', number: 'S', tense: 'present' };
             }
             const singular = stem;
             return { lemma: singular, isPlural: true };
        }

        if (lower.endsWith('er')) {
            if (ER_BLOCKLIST.has(lower)) return { lemma: lower, wordClass: 'Noun' };
            const stem = lower.endsWith('ier') ? lower.slice(0, -3) + 'y' : lower.slice(0, -2);
            if (lexicon.some(e => e.word.replace(/\*/g,'').toLowerCase() === stem && e.wordClass === 'Adjective')) return { lemma: stem, case: 'comparative' };
        }

        if (lower.endsWith('est')) {
             if (EST_BLOCKLIST.has(lower)) return { lemma: lower };
             const stem = lower.endsWith('iest') ? lower.slice(0, -4) + 'y' : lower.slice(0, -3);
             return { lemma: stem, case: 'superlative' };
        }

        if (lower.endsWith('ed')) {
            if (ED_ADJECTIVES.has(lower)) return { lemma: lower, wordClass: 'Adjective' };
            const isPerfect = ['have','has','had'].includes(prev1);
            const isPassive = ['was','were','been'].includes(prev1);
            return { lemma: lower.slice(0, -2), tense: 'past', isParticiple: true, isPerfect, isPassive };
        }

        if (lower.endsWith("'s")) return { lemma: lower.slice(0, -2), case: 'possessive' };

        return { lemma: lower, tense: 'present' };
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
        
        // Define aliases for common case names (handling English/Portuguese/Typos)
        const aliases = {
            'accusative': ['accusative', 'acusativo', 'acusative', 'acc', 'obj', 'objective'],
            'genitive': ['genitive', 'genitivo', 'possessive', 'possessivo', 'gen'],
            'plural': ['plural', 'pl'],
            'past': ['past', 'pretérito', 'preterite', 'ed'],
            'future': ['future', 'futuro'],
            'comparative': ['comparative', 'comparativo', 'er'],
            'superlative': ['superlative', 'superlativo', 'est']
        };

        const targets = new Set([lt, lf]);
        if (aliases[lt]) aliases[lt].forEach(a => targets.add(a));
        if (aliases[lf]) aliases[lf].forEach(a => targets.add(a));

        // 1. Exact Match on Trigger
        let found = grammarRules.find(r => targets.has((r.waTrigger || '').toLowerCase()));
        if (found) return found;

        // 2. Exact Match on Name
        found = grammarRules.find(r => targets.has((r.name || '').toLowerCase()));
        if (found) return found;

        // 3. Fuzzy Match on Name
        return grammarRules.find(r => {
            const rn = (r.name || '').toLowerCase();
            return [...targets].some(t => t.length > 2 && rn.includes(t));
        });
    };

    const computePhraseSuggestion = (val, cursor, syntaxOrder, userManualRoles = {}, overrideCopulaBehavior = null) => {
        const lineStart = val.lastIndexOf('\n', cursor - 1) + 1;
        const rawEnd    = val.indexOf('\n', cursor);
        const lineEnd   = rawEnd === -1 ? val.length : rawEnd;
        const line      = val.slice(lineStart, lineEnd).trim();
        if (!line) return null;

        const PREPOSITIONS = new Set(['of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'about', 'under', 'over', 'into', 'through', 'after', 'before', 'between', 'during', 'without', 'against']);
        const ARTICLES = new Set(['the', 'a', 'an']);
        const QUESTION_WORDS = new Set(['who', 'what', 'where', 'when', 'why', 'how', 'which']);
        const TIME_WORDS = new Set(['now', 'then', 'today', 'tomorrow', 'yesterday', 'tonight', 'always', 'never', 'sometimes', 'often']);
        const PLACE_WORDS = new Set(['here', 'there', 'everywhere', 'nowhere', 'somewhere', 'anywhere', 'up', 'down', 'left', 'right', 'inside', 'outside']);
        const CONJUNCTIONS = new Set(['and', 'or', 'but', 'if', 'as', 'because', 'so', 'although', 'though', 'unless', 'until', 'while', 'since', 'then']);

        const globalOverrides = (waConfig.roleOverrides || []).reduce((acc, curr) => {
            if (curr.word && curr.role) {
                curr.word.split(',').map(w => w.trim().toLowerCase()).filter(Boolean).forEach(w => {
                    acc[w] = curr.role;
                });
            }
            return acc;
        }, {});
        const mergedOverrides = { ...globalOverrides, ...userManualRoles };

        const parseClause = (clauseText, inheritedRole = 'S') => {
            const rawTokens = clauseText.trim().split(/\s+/).filter(Boolean);
            if (rawTokens.length === 0) return { breakdown: [], phraseIsNegative: false };
            
            const tokens = rawTokens.map(t => t.replace(/[.,!?()[\]{}"`:;]/g, ''));
            const tokenData = tokens.map((t, idx) => {
                const low = t.toLowerCase();
                const info = lemmatize(low, { prevTokens: tokens.slice(0, idx) });
                const context = getDefiniteness(idx, rawTokens.map(rt => ({ original: rt.replace(/[.,!?()[\]{}"`:;]/g, '') })));
                return { original: t, low, info, context };
            });

            // Pre-classify tokens to find first verb and nouns
            const preClassified = tokens.map((t, idx) => {
                const low = t.toLowerCase();
                const info = tokenData[idx].info;
                const lemma = info.lemma;
                
                // 1. Manual/Global Overrides (Highest Priority)
                if (mergedOverrides[low]) return mergedOverrides[low];
                
                // 2. Lexicon / Heuristics
                if (TIME_WORDS.has(low)) return 'T';
                if (QUESTION_WORDS.has(low)) return 'Q';
                if (CONJUNCTIONS.has(low)) return 'K';
                if (PREPOSITIONS.has(low)) return 'P';
                if (ARTICLES.has(low)) return 'A';
                if (low === 'not' || low === "n't") return 'N';
                if (COPULA_VERBS.has(low) || MODAL_VERBS.has(low) || ['will','would','have','has','had','am','is','are','was','were','do','does','did','been'].includes(low)) {
                    if (['am','is','are','was','were','be','been','being'].includes(low)) {
                        const behavior = overrideCopulaBehavior || waConfig.copulaBehavior || 'normal';
                        if (behavior === 'omit') return 'SKIP';
                        if (behavior === 'replace') {
                            const repl = waConfig.copulaReplacement || 'be';
                            tokens[idx] = repl;
                            tokenData[idx].original = repl;
                            tokenData[idx].low = repl.toLowerCase();
                            tokenData[idx].info = { lemma: repl.toLowerCase(), tense: 'present' };
                            tokenData[idx].isCopulaReplacement = true;
                            return 'V'; // Treat replacement copula as a verb so it can take person agreement
                        }
                    }
                    return 'M';
                }
                if (TIME_WORDS.has(low)) return 'T';
                if (PLACE_WORDS.has(low)) return 'L';

                // Pronoun map check
                if (PRONOUN_MAP[low]) {
                    const pm = PRONOUN_MAP[low];
                    if (pm.case === 'genitive') return 'G';
                    return pm.role || 'NOUN';
                }

                // Lexicon check
                const matches = lexicon.filter(e => e.translation && matchesTranslation(e.translation, lemma));
                let match = matches.sort((a, b) => {
                    const ta = (a.translation || '').toLowerCase();
                    const tb = (b.translation || '').toLowerCase();
                    const aExact = ta === lemma || ta.split(/[,;/]/).map(d => d.trim().toLowerCase()).includes(lemma);
                    const bExact = tb === lemma || tb.split(/[,;/]/).map(d => d.trim().toLowerCase()).includes(lemma);
                    if (aExact && !bExact) return -1;
                    if (!aExact && bExact) return 1;
                    return (a.translation || '').length - (b.translation || '').length;
                })[0];

                if (match) {
                    const wc = (match.wordClass || '').toLowerCase();
                    if (wc.includes('verb')) return 'V';
                    if (wc.includes('adj')) return 'J';
                    if (wc.includes('adv')) return 'R';
                    if (wc.includes('noun')) return 'NOUN';
                }

                // Suffix check
                if (low.endsWith('ing') && !ING_NOUNS.has(low) && !ING_ADJECTIVES.has(low)) return 'V';
                if (low.endsWith('ed') && !ED_ADJECTIVES.has(low)) return 'V';
                if (low.endsWith('er') && !ER_BLOCKLIST.has(low)) {
                    const stem = low.endsWith('ier') ? low.slice(0, -3) + 'y' : low.slice(0, -2);
                    if (lexicon.some(e => e.word.replace(/\*/g,'').toLowerCase() === stem && e.wordClass === 'Adjective')) return 'J';
                }

                return 'NOUN';
            });

            // Pass 2: Contextual Verb Identification
            for (let idx = 0; idx < preClassified.length; idx++) {
                const low = tokens[idx].toLowerCase();
                const prevLow = idx > 0 ? tokens[idx-1].toLowerCase() : '';
                const prevPrevLow = idx > 1 ? tokens[idx-2].toLowerCase() : '';
                
                // Contextual Verb Identification (only if not manually overridden)
                if (!mergedOverrides[low]) {
                    if (idx > 0 && preClassified[idx-1] === 'M' && (preClassified[idx] === 'NOUN' || preClassified[idx] === 'O' || preClassified[idx] === 'S')) {
                        preClassified[idx] = 'V';
                    } else if (prevLow === 'to') {
                        const catenativeVerbs = new Set(['want', 'wants', 'wanted', 'need', 'needs', 'needed', 'try', 'tries', 'tried', 'like', 'likes', 'liked', 'love', 'loves', 'loved', 'hate', 'hates', 'hated', 'start', 'starts', 'started', 'begin', 'begins', 'began', 'continue', 'continues', 'continued', 'hope', 'hopes', 'hoped', 'plan', 'plans', 'planned', 'expect', 'expects', 'expected', 'decide', 'decides', 'decided', 'going', 'used', 'ought', 'have', 'has', 'had', 'got', 'able', 'about', 'ready', 'supposed']);
                        if (catenativeVerbs.has(prevPrevLow)) {
                            if (preClassified[idx-2] === 'V' && !mergedOverrides[prevPrevLow]) {
                                preClassified[idx-2] = 'M';
                            }
                            if (preClassified[idx] === 'NOUN' || preClassified[idx] === 'O' || preClassified[idx] === 'S') {
                                preClassified[idx] = 'V';
                            }
                        } else if (preClassified[idx] === 'NOUN' || preClassified[idx] === 'O' || preClassified[idx] === 'S') {
                            const info = lemmatize(low);
                            const matches = lexicon.filter(e => e.translation && matchesTranslation(e.translation, info.lemma));
                            if (matches.some(m => m.wordClass?.toLowerCase().includes('verb'))) {
                                preClassified[idx] = 'V';
                            }
                        }
                    }
                }
            }

            // Find first verb index
            const firstVerbIdx = preClassified.findIndex(role => role === 'V' || role === 'M');
            const lastVerbIdx = preClassified.map(r => r === 'V' || r === 'M').lastIndexOf(true);

            // Transitivity check
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

            // Assign final roles based on verb position
            const finalRoles = preClassified.map((role, idx) => {
                const low = tokens[idx].toLowerCase();
                
                // Manual/Global Overrides MUST bypass context checks
                if (mergedOverrides[low]) return mergedOverrides[low];

                if (idx === lastVerbIdx && (role === 'M' || role === 'V')) {
                    return 'V';
                }
                
                if (low === 'her') {
                    const nextRole = preClassified[idx + 1];
                    if (nextRole === 'NOUN' || nextRole === 'J') return 'G';
                    return 'O';
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
                    } else {
                        return 'J';
                    }
                }

                if (role === 'NOUN') {
                    if (firstVerbIdx === -1) return inheritedRole;
                    if (idx < firstVerbIdx) return 'S';
                    return 'O';
                }

                if (role === 'S' || role === 'O') {
                    return role;
                }

                return role;
            });

            const breakdown = [];
            let i = 0;
            let activeTense = null;
            let comparisonTargetIdx = -1;
            let phraseIsNegative = false;
            let auxiliaryStack = [];

            // Main Loop
            while (i < tokens.length) {
                const q = tokens[i].toLowerCase();
                const fullForm = rawTokens[i];
                const info = tokenData[i].info;
                const context = tokenData[i].context;
                const lemma = info.lemma;
                const role = finalRoles[i];

                let isAuxiliary = (role === 'M');
                let isArticle = (role === 'A');
                let personRule = null;

                if (q === 'than') {
                    comparisonTargetIdx = i + 1;
                    if (tokens[i+1] && ['the','a','an'].includes(tokens[i+1].toLowerCase())) comparisonTargetIdx = i + 2;
                    breakdown[i] = { original: fullForm, conlang: '', role: 'C', swallowed: true };
                    i++; continue;
                }
                
                if (role === 'SKIP') {
                    // Zero Copula omission
                    breakdown[i] = { original: fullForm, conlang: `[${q}]`, role: 'M', swallowed: true };
                    i++; continue;
                }

                // Swallow infinitive marker 'to'
                if (q === 'to' && tokens[i+1]) {
                    const nextLow = tokens[i+1].toLowerCase();
                    const nextInfo = lemmatize(nextLow);
                    const nextMatch = lexicon.find(e => e.translation && matchesTranslation(e.translation, nextInfo.lemma));
                    const isNextVerb = nextMatch?.wordClass?.toLowerCase().includes('verb') || 
                                     IRREGULAR_VERBS[nextLow] || 
                                     (!['the','a','an','my','your','his','her','its','our','their'].includes(nextLow) && !ANIMAL_WORDS_EN.has(nextLow) && !HUMAN_WORDS_EN.has(nextLow));
                    
                    if (isNextVerb) {
                        const toMatch = lexicon.find(e => e.translation && matchesTranslation(e.translation, 'to'));
                        if (!toMatch) {
                            breakdown[i] = { original: fullForm, conlang: `[${q}]`, role: 'C', swallowed: true };
                            i++; continue;
                        }
                    }
                }

                if (['will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must'].includes(q)) { auxiliaryStack.push(q); }
                else if (['have', 'has', 'had'].includes(q)) { auxiliaryStack.push(q); }
                else if (['am', 'is', 'are'].includes(q)) { auxiliaryStack.push('be_pres'); }
                else if (['was', 'were'].includes(q)) { auxiliaryStack.push('be_past'); }
                else if (['do', 'does', 'did'].includes(q)) { auxiliaryStack.push('do'); }
                else if (q === 'been') { auxiliaryStack.push('been'); }

                let matches = lexicon.filter(e => {
                    const transMatch = e.translation && matchesTranslation(e.translation, q);
                    const shortMatch = e.shortTranslation && matchesTranslation(e.shortTranslation, q);
                    return transMatch || shortMatch;
                });
                let matchTarget = q;
                if (matches.length === 0) {
                    matches = lexicon.filter(e => {
                        const transMatch = e.translation && matchesTranslation(e.translation, lemma);
                        const shortMatch = e.shortTranslation && matchesTranslation(e.shortTranslation, lemma);
                        return transMatch || shortMatch;
                    });
                    matchTarget = lemma;
                }
                let match = matches.sort((a, b) => {
                    const ta = (a.shortTranslation || a.translation || '').toLowerCase();
                    const tb = (b.shortTranslation || b.translation || '').toLowerCase();
                    const aExact = ta === matchTarget || ta.split(/[,;/]/).map(d => d.trim().toLowerCase()).includes(matchTarget);
                    const bExact = tb === matchTarget || tb.split(/[,;/]/).map(d => d.trim().toLowerCase()).includes(matchTarget);
                    if (aExact && !bExact) return -1;
                    if (!aExact && bExact) return 1;
                    return ta.length - tb.length;
                })[0];

                if (role === 'N') {
                    phraseIsNegative = true;
                } else if (info.person || info.number || PRONOUN_MAP[q]) {
                    if (role === 'S') {
                        if (overrideCopulaBehavior === 'omit' || overrideCopulaBehavior === 'replace') {
                            personRule = personRulesArray.find(r => 
                                (!r.person || r.person === info.person) && 
                                (!r.number || r.number === info.number) && 
                                (!r.gender || r.gender === info.gender) && 
                                r.appliesTo && r.appliesTo.replace(/[\s_]/g, '').toLowerCase().includes('zerocopula')
                            );
                        }
                        if (!personRule) {
                            personRule = personRulesArray.find(r => 
                                (!r.person || r.person === info.person) && 
                                (!r.number || r.number === info.number) && 
                                (!r.gender || r.gender === info.gender) && 
                                (!r.appliesTo || !r.appliesTo.replace(/[\s_]/g, '').toLowerCase().includes('zerocopula'))
                            );
                        }
                    }
                }

                // Word Assist triggers for this role
                const wordMarkers = (waConfig.triggers || []).filter(t => {
                    if (t.type === 'trigger' && t.trigger === role) {
                        if (t.domConditions?.requiresTransitive && !hasObject) return false;
                        return applyCaseToObject({ original: q, role, number: info.isPlural?'P':'S' }, t, match, PRONOUN_MAP[q], context);
                    }
                    if (t.type === 'word' && t.trigger.toLowerCase().split(',').some(s => s.trim() === q)) return true;
                    if (t.type === 'suffix' && q.endsWith(t.trigger.toLowerCase().replace(/^-/, ''))) {
                        const cleanTrigger = t.trigger.toLowerCase().replace(/^-/, '');
                        if ((cleanTrigger === 's' || cleanTrigger === 'es') && (role === 'V' || role === 'M')) {
                            return false;
                        }
                        return true;
                    }
                    return false;
                });

                if (tokenData[i].isCopulaReplacement && !match) {
                    // Force the replacement marker to be recognized even if it's not in the dictionary
                    match = { word: tokens[i], wordClass: 'Verb', translation: tokens[i] };
                }

                if (match || personRule) {
                    let conlang = (match ? match.word : personRule.freeForm).replace(/\*/g, '');
                    let inflected = false;
                    let appliedRuleName = '';
                    let appliedRuleSource = '';

                    if (match?.wordClass === 'Verb' && !isAuxiliary) {
                        activeTense = resolveTempo(auxiliaryStack) || info.tense;
                        auxiliaryStack = [];
                    }

                    let appliedRules = [];
                    if (wordMarkers.length === 0) {
                        const possibleRules = [];
                        if (activeTense) possibleRules.push(findGrammarRule(activeTense));
                        if (info.isPlural) possibleRules.push(findGrammarRule('plural'));
                        if (info.case === 'genitive' || q.endsWith("'s") || role === 'G') possibleRules.push(findGrammarRule('genitive', 'possessive'));
                        if (info.case === 'objective' || role === 'O') possibleRules.push(findGrammarRule('objective', 'accusative'));
                        if (info.case === 'comparative') possibleRules.push(findGrammarRule('comparative'));
                        if (info.case === 'superlative') possibleRules.push(findGrammarRule('superlative'));

                        for (const r of possibleRules) {
                            if (r?.affix) {
                                const tClass = (match?.wordClass || '').toLowerCase();
                                if (r.appliesTo && r.appliesTo !== 'all' && r.appliesTo.trim() !== '') {
                                    if (!tClass.includes(r.appliesTo.toLowerCase())) continue;
                                }

                                try {
                                    const vStore = useConfigStore.getState();
                                    conlang = applyRuleToWord(conlang, r, grammarRules, vStore.vowels, vStore.consonants, vStore.otherPhonemes);
                                    inflected = true;
                                    appliedRuleName = r.name || r.condition;
                                    appliedRuleSource = 'Grammar Rule: ' + appliedRuleName;
                                    appliedRules.push(r);
                                } catch(e) { console.error(e); }
                            }
                        }
                    }

                    wordMarkers.sort((a, b) => (a.priority || 0) - (b.priority || 0)).forEach(t => {
                        if (t.position === 'prefix' || t.position === 'before') conlang = t.marker.replace(/-$/, '') + (t.position === 'before' ? ' ' : '') + conlang;
                        else if (t.position === 'suffix' || t.position === 'after') conlang = conlang + (t.position === 'after' ? ' ' : '') + t.marker.replace(/^-/, '');
                        else if (t.position === 'endOfSentence') phraseIsNegative = true;
                        inflected = true;
                        appliedRuleSource = 'Word Assist: ' + (t.name || t.trigger || t.marker);
                    });

                    breakdown[i] = {
                        original: fullForm, conlang, found: true, entry: match, role, inflected,
                        ruleName: appliedRuleName, ruleSource: appliedRuleSource, isAuxiliary, isArticle, personRule,
                        swallowed: false, context, appliedRules,
                        animacy: getAnimacyLevel({ original: q }, match, PRONOUN_MAP[q])
                    };
                } else {
                    let conlang = `[${q}]`;
                    let inflected = false;
                    let appliedRuleSource = '';

                    wordMarkers.sort((a, b) => (a.priority || 0) - (b.priority || 0)).forEach(t => {
                        if (t.position === 'prefix' || t.position === 'before') conlang = t.marker.replace(/-$/, '') + (t.position === 'before' ? ' ' : '') + conlang;
                        else if (t.position === 'suffix' || t.position === 'after') conlang = conlang + (t.position === 'after' ? ' ' : '') + t.marker.replace(/^-/, '');
                        else if (t.position === 'endOfSentence') phraseIsNegative = true;
                        inflected = true;
                        appliedRuleSource = 'Word Assist: ' + (t.name || t.trigger || t.marker);
                    });

                    breakdown[i] = { 
                        original: fullForm, conlang, role, found: false, 
                        inflected, ruleSource: appliedRuleSource,
                        swallowed: isAuxiliary || isArticle,
                        animacy: getAnimacyLevel({ original: q }, null, PRONOUN_MAP[q])
                    };
                }
                i++;
            }

            return { breakdown, phraseIsNegative };
        };

        // Split by punctuation, keeping the separators
        const parts = line.split(/([.,;:!?]+)/);
        const segments = [];
        for (let idx = 0; idx < parts.length; idx++) {
            const part = parts[idx];
            if (idx % 2 === 0) {
                if (part.trim()) {
                    segments.push({ type: 'text', text: part });
                }
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
        let hasAlt = false;
        let currentInheritedRole = 'S';

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
                const parsed = parseClause(seg.text, currentInheritedRole);
                
                const roles = parsed.breakdown.map(w => w?.role).filter(Boolean);
                if (roles.includes('V') || roles.includes('M')) {
                    currentInheritedRole = 'O';
                } else if (roles.includes('S')) {
                    currentInheritedRole = 'S';
                }
                
                if (parsed.phraseIsNegative) totalPhraseIsNegative = true;
                
                const clauseBFree = JSON.parse(JSON.stringify(parsed.breakdown));
                const clauseBAffix = JSON.parse(JSON.stringify(parsed.breakdown));
                
                // Person agreement for this clause
                const subjToken = clauseBAffix.find(w => w && w.role === 'S' && w.personRule);
                if (subjToken) {
                    let targetToken = clauseBAffix.filter(w => w && w.role === 'V' && !w.swallowed && !w.isAuxiliary).pop();
                    
                    // Fallback: If there is no verb (e.g. Zero Copula omission), attach to the predicate (Adjective/Noun)
                    if (!targetToken) {
                        targetToken = clauseBAffix.filter(w => w && (w.role === 'J' || w.role === 'NOUN') && !w.swallowed).pop();
                    }

                    if (targetToken && subjToken.personRule.affix) {
                        targetToken.conlang = applyAffixToBase(targetToken.conlang, subjToken.personRule.affix);
                        targetToken.inflected = true;
                        targetToken.ruleSource = 'Person Agreement: ' + (subjToken.personRule.name || subjToken.personRule.person);
                        subjToken.encodedInVerb = true;
                    }
                }
                
                const clauseRFree = reorderBreakdown(clauseBFree);
                const clauseRAffix = reorderBreakdown(clauseBAffix);
                
                finalBFree.push(...clauseBFree);
                finalBAffix.push(...clauseBAffix);
                
                finalRFree.push(...clauseRFree);
                finalRAffix.push(...clauseRAffix);

                // Alternate reading if ambiguous
                const ambiguousWords = parsed.breakdown.filter(w =>
                    w && (w.role === 'S' || w.role === 'O') &&
                    !PRONOUN_MAP[w.original?.toLowerCase()] &&
                    w.found
                );
                if (ambiguousWords.length >= 2) {
                    hasAlt = true;
                    const clauseBAlt = JSON.parse(JSON.stringify(parsed.breakdown));
                    clauseBAlt.forEach(w => {
                        if (w && w.role === 'S') w.role = 'O';
                        else if (w && w.role === 'O') w.role = 'S';
                    });
                    const clauseRAlt = reorderBreakdown(clauseBAlt);
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

        const results = [];
        
        let romFree = buildRomanizedString(finalRFree);
        if (totalPhraseIsNegative && waConfig.negation?.position === 'endOfSentence' && waConfig.negation?.content) romFree += ' ' + waConfig.negation.content;
        
        let romAffix = buildRomanizedString(finalRAffix);
        if (totalPhraseIsNegative && waConfig.negation?.position === 'endOfSentence' && waConfig.negation?.content) romAffix += ' ' + waConfig.negation.content;

        const useAffix = (romAffix !== romFree && (romAffix.trim() || finalBAffix.length > 0));
        
        const primaryRom = useAffix ? romAffix : romFree;
        const primaryBreakdown = useAffix ? finalBAffix : finalBFree;
        const primaryReordered = useAffix ? finalRAffix : finalRFree;
        
        if (primaryRom.trim() || primaryBreakdown.length > 0) {
            results.push({
                key: 'phrase-primary', type: 'phrase', label: 'TRANSLATION SUGGESTION',
                romanized: primaryRom || '[empty]', display: transliterate(primaryRom || '[empty]', lexicon),
                wordBreakdown: primaryBreakdown, reordered: primaryReordered, lineStart, lineEnd
            });
        }

        if (useAffix && romAffix.trim() && romFree.trim()) {
            results.push({
                key: 'phrase-affix', type: 'phrase', label: 'TRANSLATION SUGGESTION (Affix Form)',
                romanized: romAffix || '[empty]', display: transliterate(romAffix || '[empty]', lexicon),
                wordBreakdown: finalBAffix, reordered: finalRAffix, lineStart, lineEnd
            });
            results[0].label = 'TRANSLATION SUGGESTION (Free Form)';
            results[0].romanized = romFree;
            results[0].display = transliterate(romFree, lexicon);
            results[0].wordBreakdown = finalBFree;
            results[0].reordered = finalRFree;
        }

        if (!overrideCopulaBehavior && waConfig.copulaBehavior === 'zero_copula') {
            const suggsOmit = computePhraseSuggestion(val, cursor, syntaxOrder, userManualRoles, 'omit') || [];
            let suggsReplace = [];
            
            if (waConfig.copulaReplacement && waConfig.copulaReplacement.trim() !== '') {
                suggsReplace = computePhraseSuggestion(val, cursor, syntaxOrder, userManualRoles, 'replace') || [];
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
    }

    return {
        computePhraseSuggestion,
        lemmatize,
        matchesTranslation,
        findGrammarRule
    };
}

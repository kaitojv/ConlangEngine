import React, { useState, useEffect, useRef, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { getUniqueParsings } from '@/utils/morphologyEngine.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import Card from '@/components/UI/Card/Card.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import Modal from '@/components/UI/Modal/Modal.jsx';
import { Book, Plus, Trash2, Bold, Italic, Underline, Link, Save, Type, Languages, FileText, Settings, ChevronDown, ChevronUp, Info, Wand2, Quote, Heading1, Heading2, Heading3, Table, Smile, icons, Folder, FolderOpen, Edit2 } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createGrammarAnalyzer } from '@/utils/grammarAnalyzer.js';
import './wikiTab.css';

const PREDEFINED_ICONS = [
    'Star', 'Heart', 'Sun', 'Moon', 'Cloud', 'Flame', 'Zap', 'Droplet', 'Wind', 'TreePine',
    'Leaf', 'Mountain', 'Gem', 'Crown', 'Sword', 'Shield', 'Skull', 'Ghost', 'Castle', 'Tent',
    'Map', 'Compass', 'Anchor', 'Flag', 'BookOpen', 'Scroll', 'Feather', 'PenTool', 'Key', 'Lock',
    'Music', 'Eye', 'Hand', 'Footprints', 'Smile', 'Frown', 'Meh', 'Angry', 'Coffee', 'Utensils',
    'MessageCircle', 'Mail', 'Send', 'Share2', 'Camera', 'Video', 'Mic', 'Headphones', 'Volume2', 'Play',
    'Gift', 'Box', 'Briefcase', 'ShoppingCart', 'Umbrella', 'Clock', 'Bell', 'Snowflake', 'Thermometer', 'Sunset',
    'Sunrise', 'Tornado', 'Dices', 'Spade', 'Club', 'Trophy', 'Medal', 'Gamepad2', 'Puzzle', 'Car',
    'Train', 'Plane', 'Ship', 'Bike', 'Bus', 'Rocket', 'User', 'Users', 'Laugh', 'Bird',
    'Cat', 'Dog', 'Rabbit', 'Snail', 'Bug', 'Fish', 'Apple', 'Banana', 'Cherry', 'Carrot',
    'Beef', 'Beer', 'Wine', 'Cigarette', 'TreeDeciduous', 'Palmtree', 'Sparkles', 'Wand2', 'Atom', 'Brain',
    'Microscope', 'Telescope', 'Stethoscope', 'Syringe', 'Pill', 'Bone', 'HeartPulse', 'Ear', 'EyeOff', 'Palette',
    'Brush', 'Scissors', 'Hammer', 'Wrench', 'Axe', 'Pickaxe', 'Shovel', 'Magnet', 'ZapOff', 'Battery',
    'BatteryFull', 'Radio', 'Tv', 'Monitor', 'Smartphone', 'Laptop', 'Tablet', 'Watch', 'Printer', 'Keyboard',
    'Mouse', 'Gamepad', 'Ticket', 'Clapperboard', 'Film', 'Image', 'Book', 'Library', 'Newspaper', 'FileText',
    'Clipboard', 'Folder', 'FolderOpen', 'Archive', 'Trash2', 'Settings', 'Globe', 'Globe2', 'Earth', 'CloudSun',
    'CloudRain', 'CloudLightning', 'CloudSnow', 'Rainbow', 'ThermometerSun', 'ThermometerSnowflake', 'Asterisk', 'Hash', 'Percent', 'DollarSign',
    'Euro', 'PoundSterling', 'Bitcoin', 'Infinity', 'Plus', 'Minus', 'X', 'Check', 'Circle', 'Square', 'Triangle', 'Hexagon', 'Octagon'
];

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


function WordAssistSettingsMenu({ config, updateConfig, grammarRules }) {
    const wa = config.wordAssistConfig || { triggers: [] };
    const triggers = wa.triggers || [];

    const updateTrigger = (id, field, value) => {
        const newTriggers = triggers.map(t => t.id === id ? { ...t, [field]: value } : t);
        updateConfig({ wordAssistConfig: { ...wa, triggers: newTriggers } });
    };

    const addTrigger = () => {
        const newId = `tr-${Date.now()}`;
        const newTrigger = { id: newId, name: 'New Rule', trigger: '', marker: '', type: 'word', position: 'before', priority: triggers.length + 1 };
        updateConfig({ wordAssistConfig: { ...wa, triggers: [...triggers, newTrigger] } });
    };

    const removeTrigger = (id) => {
        const newTriggers = triggers.filter(t => t.id !== id);
        updateConfig({ wordAssistConfig: { ...wa, triggers: newTriggers } });
    };

    const moveTrigger = (idx, direction) => {
        const newTriggers = [...triggers];
        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= newTriggers.length) return;
        const [moved] = newTriggers.splice(idx, 1);
        newTriggers.splice(targetIdx, 0, moved);
        
        // Ensure priority matches the new array order so sorting works correctly
        newTriggers.forEach((t, i) => { t.priority = i + 1; });
        
        updateConfig({ wordAssistConfig: { ...wa, triggers: newTriggers } });
    };

    const importFromGrammarRules = () => {
        const rules = grammarRules || [];
        const existingNames = new Set(triggers.map(t => t.name.trim().toLowerCase()));
        const newTriggers = [...triggers];
        let added = 0;
        rules.forEach(rule => {
            if (!rule.affix || !rule.name) return;
            // Skip if a trigger with the same name already exists
            if (existingNames.has(rule.name.trim().toLowerCase())) return;
            const defaults = importDefaults(rule.name);
            // Extract a clean marker from the affix (strip regex/formula, keep affix chars)
            const rawAffix = rule.affix.trim();
            const isSuffix = rawAffix.startsWith('-');
            const isPrefix = rawAffix.endsWith('-');
            let marker = rawAffix;
            // Simplify formulas: if it contains '=>', take the right-hand side as hint only
            if (rawAffix.includes('=>')) marker = '-' + rawAffix.split('=>')[1].trim().replace(/[^a-zA-Z'\u00C0-\u024F]/g, '');
            const newEntry = {
                id: `gr-import-${rule.id || Date.now()}-${added}`,
                name: rule.name,
                trigger: defaults.trigger,
                marker,
                type: defaults.type,
                position: isSuffix ? 'suffix' : isPrefix ? 'prefix' : defaults.position,
                priority: newTriggers.length + 1,
            };
            newTriggers.push(newEntry);
            existingNames.add(rule.name.trim().toLowerCase());
            added++;
        });
        if (added === 0) return; // nothing new to import
        updateConfig({ wordAssistConfig: { ...wa, triggers: newTriggers } });
    };

    const roleOverrides = wa.roleOverrides || [];
    const addRoleOverride = () => {
        updateConfig({ wordAssistConfig: { ...wa, roleOverrides: [...roleOverrides, { word: '', role: 'V' }] } });
    };
    const updateRoleOverride = (idx, field, value) => {
        const newOverrides = [...roleOverrides];
        newOverrides[idx][field] = field === 'word' ? value.toLowerCase() : value;
        updateConfig({ wordAssistConfig: { ...wa, roleOverrides: newOverrides } });
    };
    const removeRoleOverride = (idx) => {
        const newOverrides = roleOverrides.filter((_, i) => i !== idx);
        updateConfig({ wordAssistConfig: { ...wa, roleOverrides: newOverrides } });
    };

    const importableCount = (grammarRules || []).filter(r =>
        r.affix && r.name && !triggers.some(t => t.name.trim().toLowerCase() === r.name.trim().toLowerCase())
    ).length;

    const roleLabels = {
        'Q': 'Question Word',
        'C': 'Comparative',
        'T': 'Time',
        'L': 'Place',
        'J': 'Adjective',
        'N': 'Negation',
        'O': 'Object',
        'R': 'Adverb',
        'M': 'Modal',
        'V': 'Verb',
        'S': 'Subject',
        'A': 'Article',
        'P': 'Preposition',
        'G': 'Genitive'
    };
    let syntaxOrder = wa.syntaxOrder;
    if (!syntaxOrder) {
        syntaxOrder = config.syntaxOrder || 'SVO';
        const defaultRest = 'QCTLJNORVMSAPG';
        defaultRest.split('').forEach(r => {
            if (!syntaxOrder.includes(r)) syntaxOrder += r;
        });
    } else {
        Object.keys(roleLabels).forEach(r => {
            if (!syntaxOrder.includes(r)) syntaxOrder += r;
        });
    }

    const [draggedRoleIdx, setDraggedRoleIdx] = useState(null);

    const handleRoleDragStart = (e, index) => {
        setDraggedRoleIdx(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleRoleDragOver = (e) => {
        e.preventDefault();
    };

    const handleRoleDrop = (e, targetIndex) => {
        e.preventDefault();
        if (draggedRoleIdx === null || draggedRoleIdx === targetIndex) return;
        const arr = syntaxOrder.split('');
        const [moved] = arr.splice(draggedRoleIdx, 1);
        arr.splice(targetIndex, 0, moved);
        updateConfig({ wordAssistConfig: { ...wa, syntaxOrder: arr.join('') } });
        setDraggedRoleIdx(null);
    };

    const moveRole = (idx, dir) => {
        const arr = syntaxOrder.split('');
        const target = idx + dir;
        if (target < 0 || target >= arr.length) return;
        const [moved] = arr.splice(idx, 1);
        arr.splice(target, 0, moved);
        updateConfig({ wordAssistConfig: { ...wa, syntaxOrder: arr.join('') } });
    };

    return (
        <div className="wa-settings-container-v2">

            {/* Syntax Priority Editor */}
            <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(0,0,0,0.25)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, color: 'var(--acc)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Settings size={15} /> Syntactic Priority (Drag-and-Drop Order)
                    </h4>
                    <span style={{ fontSize: '0.62rem', color: 'var(--tx3)' }}>Drag cards or use arrows to sort conlang syntax order</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {syntaxOrder.split('').map((role, idx) => (
                        <div 
                            key={role} 
                            draggable
                            onDragStart={(e) => handleRoleDragStart(e, idx)}
                            onDragOver={handleRoleDragOver}
                            onDrop={(e) => handleRoleDrop(e, idx)}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--s2)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--bd)',
                                fontSize: '0.68rem', fontWeight: 600, cursor: 'grab', transition: 'all 0.15s ease',
                                userSelect: 'none',
                                opacity: draggedRoleIdx === idx ? 0.3 : 1
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--acc)';
                                e.currentTarget.style.background = 'var(--s3)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--bd)';
                                e.currentTarget.style.background = 'var(--s2)';
                            }}
                        >
                            <span>{idx + 1}. {roleLabels[role] || role}</span>
                            <div style={{ display: 'flex', gap: '2px', marginLeft: '4px' }}>
                                <button onClick={() => moveRole(idx, -1)} disabled={idx === 0} style={{ padding: 0, border: 'none', background: 'none', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><ChevronUp size={11}/></button>
                                <button onClick={() => moveRole(idx, 1)} disabled={idx === syntaxOrder.length - 1} style={{ padding: 0, border: 'none', background: 'none', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><ChevronDown size={11}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modifier Placement Options */}
            <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(0,0,0,0.25)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, color: 'var(--acc)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Settings size={15} /> Modifier Position
                    </h4>
                </div>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.7rem', color: 'var(--tx2)', display: 'block', marginBottom: '4px' }}>Adjectives</label>
                        <select className="wa-select-v2" value={wa.adjPos || 'before'} onChange={(e) => updateConfig({ wordAssistConfig: { ...wa, adjPos: e.target.value } })}>
                            <option value="before">Before Noun (e.g. red cat)</option>
                            <option value="after">After Noun (e.g. cat red)</option>
                            <option value="priority">Follow Syntactic Priority</option>
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.7rem', color: 'var(--tx2)', display: 'block', marginBottom: '4px' }}>Genitives/Possessives</label>
                        <select className="wa-select-v2" value={wa.genPos || 'before'} onChange={(e) => updateConfig({ wordAssistConfig: { ...wa, genPos: e.target.value } })}>
                            <option value="before">Before Noun (e.g. my cat)</option>
                            <option value="after">After Noun (e.g. cat my)</option>
                            <option value="priority">Follow Syntactic Priority</option>
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.7rem', color: 'var(--tx2)', display: 'block', marginBottom: '4px' }}>Adverbs</label>
                        <select className="wa-select-v2" value={wa.advPos || 'before'} onChange={(e) => updateConfig({ wordAssistConfig: { ...wa, advPos: e.target.value } })}>
                            <option value="before">Before Verb (e.g. fast run)</option>
                            <option value="after">After Verb (e.g. run fast)</option>
                            <option value="priority">Follow Syntactic Priority</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Copula Settings */}
            <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(0,0,0,0.25)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, color: 'var(--acc)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Settings size={15} /> Copula (To Be) Settings
                    </h4>
                </div>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ fontSize: '0.7rem', color: 'var(--tx2)', display: 'block', marginBottom: '4px' }}>Behavior</label>
                        <select 
                            className="wa-select-v2" 
                            value={wa.copulaBehavior === 'replace' || wa.copulaBehavior === 'both' || wa.copulaBehavior === 'omit' ? 'zero_copula' : (wa.copulaBehavior || 'normal')} 
                            onChange={(e) => updateConfig({ wordAssistConfig: { ...wa, copulaBehavior: e.target.value } })}
                        >
                            <option value="normal">Normal (Parse as Verb/Modal)</option>
                            <option value="zero_copula">Enable Zero Copula</option>
                        </select>
                    </div>
                    {wa.copulaBehavior === 'zero_copula' && (
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{ fontSize: '0.7rem', color: 'var(--tx2)', display: 'block', marginBottom: '4px' }}>Replacement Marker (Optional)</label>
                            <Input 
                                value={wa.copulaReplacement || ''} 
                                onChange={(e) => updateConfig({ wordAssistConfig: { ...wa, copulaReplacement: e.target.value } })}
                                placeholder="e.g. vu"
                                style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem' }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Global Dictionary Overrides */}
            <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(0,0,0,0.25)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, color: 'var(--acc)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Settings size={15} /> Global Dictionary Overrides
                    </h4>
                    <Button variant="default" onClick={addRoleOverride} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                        <Plus size={12} /> Add Word
                    </Button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {roleOverrides.map((ro, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <Input 
                                value={ro.word} 
                                onChange={(e) => updateRoleOverride(idx, 'word', e.target.value)}
                                placeholder="Words separated by commas (e.g. today, tomorrow)"
                                style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem' }}
                            />
                            <span style={{ color: 'var(--tx3)' }}>→</span>
                            <select className="wa-select-v2" value={ro.role} onChange={(e) => updateRoleOverride(idx, 'role', e.target.value)} style={{ flex: 1, minWidth: '150px' }}>
                                {Object.entries(roleLabels).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                ))}
                            </select>
                            <button onClick={() => removeRoleOverride(idx)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}><Trash2 size={14}/></button>
                        </div>
                    ))}
                    {roleOverrides.length === 0 && <div style={{ fontSize: '0.7rem', color: 'var(--tx3)' }}>No overrides set. Use this to force specific English words into strict roles.</div>}
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--tx3)', fontStyle: 'italic' }}>
                    Define triggers (words or suffixes) and how they should be marked in your conlang.
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {importableCount > 0 && (
                        <Button
                            variant="default"
                            onClick={importFromGrammarRules}
                            style={{ fontSize: '0.7rem', padding: '4px 10px', borderColor: 'var(--acc)', color: 'var(--acc)' }}
                        >
                            <Languages size={13} /> Import Grammar Rules ({importableCount})
                        </Button>
                    )}
                    <Button variant="default" onClick={addTrigger} style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
                        <Plus size={14} /> Add New Trigger
                    </Button>
                </div>
            </div>

            <div className="wa-triggers-list">
                {[...triggers].sort((a,b) => a.priority - b.priority).map((t, idx) => (
                    <div key={t.id} className="wa-trigger-card">
                        <div className="wa-card-header">
                            <div className="wa-priority-controls">
                                <button onClick={() => moveTrigger(idx, -1)} disabled={idx === 0}><ChevronUp size={14}/></button>
                                <button onClick={() => moveTrigger(idx, 1)} disabled={idx === triggers.length - 1}><ChevronDown size={14}/></button>
                            </div>
                            <input 
                                className="wa-title-input"
                                value={t.name} 
                                onChange={(e) => updateTrigger(t.id, 'name', e.target.value)}
                                placeholder="Rule Name"
                            />
                            <button className="wa-remove-btn" onClick={() => removeTrigger(t.id)}><Trash2 size={14}/></button>
                        </div>
                        
                        <div className="wa-card-body">
                            <div className="wa-field">
                                <label>{t.type === 'trigger' ? 'Syntactic Role' : 'English Trigger'}</label>
                                {t.type === 'trigger' ? (
                                    <select className="wa-select-v2" value={t.trigger} onChange={(e) => updateTrigger(t.id, 'trigger', e.target.value)}>
                                        <option value="">Select Role...</option>
                                        <option value="S">Subject (Nominative / Agent)</option>
                                        <option value="V">Verb (Action)</option>
                                        <option value="O">Object (Accusative / Patient)</option>
                                        <option value="A">Article</option>
                                        <option value="P">Preposition</option>
                                        <option value="Q">Question Word</option>
                                        <option value="G">Genitive / Possessive</option>
                                        <option value="C">Comparative</option>
                                        <option value="T">Time</option>
                                        <option value="L">Place</option>
                                        <option value="J">Adjective</option>
                                        <option value="N">Negation</option>
                                        <option value="R">Adverb</option>
                                        <option value="M">Modal</option>
                                    </select>
                                ) : (
                                    <Input 
                                        value={t.trigger} 
                                        onChange={(e) => updateTrigger(t.id, 'trigger', e.target.value)}
                                        placeholder="e.g. not, from, -ing"
                                    />
                                )}
                            </div>
                            <div className="wa-field">
                                <label>Conlang Marker</label>
                                <Input 
                                    value={t.marker} 
                                    onChange={(e) => updateTrigger(t.id, 'marker', e.target.value)}
                                    placeholder="e.g. un, -m"
                                />
                            </div>
                            <div className="wa-field">
                                <label>Apply As</label>
                                <select className="wa-select-v2" value={t.type} onChange={(e) => updateTrigger(t.id, 'type', e.target.value)}>
                                    <option value="word">Word match</option>
                                    <option value="suffix">English suffix</option>
                                    <option value="trigger">Syntactic Role</option>
                                </select>
                            </div>
                            <div className="wa-field">
                                <label>Position</label>
                                <select className="wa-select-v2" value={t.position} onChange={(e) => updateTrigger(t.id, 'position', e.target.value)}>
                                    <option value="prefix">Prefix</option>
                                    <option value="suffix">Suffix</option>
                                    <option value="before">Before target</option>
                                    <option value="after">After target</option>
                                    <option value="beforeVerb">Before Verb</option>
                                    <option value="afterVerb">After Verb</option>
                                    <option value="endOfSentence">End of Sentence</option>
                                    <option value="thanTarget">Than-target (Reference)</option>
                                </select>
                            </div>
                            {t.type === 'trigger' && (
                                <div className="wa-field">
                                    <label>Scope</label>
                                    <select className="wa-select-v2" value={t.scope || 'all'} onChange={(e) => updateTrigger(t.id, 'scope', e.target.value)}>
                                        <option value="all">All (nouns + pronouns)</option>
                                        <option value="pronoun">Pronouns &amp; persons only</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}


// The new Interlinear Editor Component
function WordAssistTutorial({ onClose }) {
    const [step, setStep] = useState(1);
    
    return (
        <div className="wa-tip-box" style={{ background: 'var(--s2)', border: '1px solid var(--acc)' }}>
            <button 
                onClick={onClose}
                style={{ position: 'absolute', top: '8px', right: '8px', background: 'transparent', border: 'none', color: 'var(--tx3)', cursor: 'pointer', padding: '4px' }}
            >
                <Plus size={14} style={{ transform: 'rotate(45deg)' }} />
            </button>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ background: '#8b5cf6', padding: '8px', borderRadius: '10px', color: 'white', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)' }}>
                    <Languages size={18} />
                </div>
                <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--tx)' }}>Word Assist: The Ultimate Guide</h4>
                    
                    {step === 1 && (
                        <div>
                            <h5 style={{ margin: '0 0 4px 0', color: '#8b5cf6', fontSize: '0.8rem' }}>1. How it works</h5>
                            <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: 'var(--tx2)', lineHeight: '1.4' }}>
                                Word Assist parses your English sentence and automatically assigns a <strong>Grammatical Role</strong> to each word (like Subject, Verb, or Object). It then uses your drag-and-drop Syntactic Priority to reorder the sentence into your conlang's syntax.
                            </p>
                        </div>
                    )}
                    {step === 2 && (
                        <div>
                            <h5 style={{ margin: '0 0 4px 0', color: '#ec4899', fontSize: '0.8rem' }}>2. Creating Grammar Rules (Triggers)</h5>
                            <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: 'var(--tx2)', lineHeight: '1.4' }}>
                                Open the Word Assist Settings (gear icon) to create rules. You can map a specific role to a marker (e.g. "If a word is an Object, add the suffix '-m' for Accusative case"). The engine will automatically apply it for you.
                            </p>
                        </div>
                    )}
                    {step === 3 && (
                        <div>
                            <h5 style={{ margin: '0 0 4px 0', color: '#f59e0b', fontSize: '0.8rem' }}>3. Manual Overrides (Maximum Precision)</h5>
                            <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: 'var(--tx2)', lineHeight: '1.4' }}>
                                English is ambiguous! If the engine thinks a word is a Noun, but you meant it as a Verb, you can <strong>click the [role] badge</strong> under the suggested word to manually force it to be a Verb. You can also set permanent global overrides in the settings.
                            </p>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {[1, 2, 3].map(s => (
                                <div key={s} onClick={() => setStep(s)} style={{ width: '8px', height: '8px', borderRadius: '50%', background: step === s ? 'var(--acc)' : 'var(--bd)', cursor: 'pointer' }} />
                            ))}
                        </div>
                        <div>
                            {step > 1 && <Button variant="default" onClick={() => setStep(s => s - 1)} style={{ fontSize: '0.65rem', padding: '2px 8px', marginRight: '6px' }}>Back</Button>}
                            {step < 3 ? (
                                <Button variant="imp" onClick={() => setStep(s => s + 1)} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>Next</Button>
                            ) : (
                                <Button variant="default" onClick={onClose} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>Got it</Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CorpusEditor({ content, onSave, writingDirection: props_writingDirection }) {
    const [mode, setMode] = useState('edit');
    const [text, setText] = useState(content || '');
    const [wordAssist, setWordAssist] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [activeSuggIdx, setActiveSuggIdx] = useState(0);
    const [draggedChip, setDraggedChip] = useState(null); // { suggIdx, chipIdx }
    const [showWaTip, setShowWaTip] = useState(true);
    const [wordRange, setWordRange] = useState(null); // { start, end } of current word in text
    const [isWaSettingsOpen, setIsWaSettingsOpen] = useState(false);
    const [manualRoles, setManualRoles] = useState({}); // Local manual overrides for parsing (keyed by lowercase word)
    const textareaRef = useRef(null);

    const lexicon = useLexiconStore((state) => state.lexicon);
    const { transliterate, normalizeToBase } = useTransliterator();
    const config = useConfigStore();
    const personRulesStr   = useConfigStore(state => state.personRules) || "";
    const grammarRules     = useConfigStore(state => state.grammarRules) || [];
    const syntaxOrder      = useConfigStore(state => state.syntaxOrder) || 'SVO';
    const waConfig         = useConfigStore(state => state.wordAssistConfig) || {};
    const updateConfig     = useConfigStore(state => state.updateConfig);
    const storedWritingDir = useConfigStore(state => state.writingDirection) || 'ltr';
    // Prefer prop (passed from WikiTab parent) over store value
    const writingDirection = props_writingDirection || storedWritingDir;
    const isRTL            = writingDirection === 'rtl';

    // Normalise personRules into a flat object array regardless of legacy/modern format
    const personRulesArray = useMemo(() => {
        if (Array.isArray(personRulesStr)) return personRulesStr;
        if (typeof personRulesStr !== 'string' || !personRulesStr.trim()) return [];
        
        return personRulesStr.split(/[\n,]/).map(line => {
            if (!line.includes(':')) return null;
            const parts = line.split(':');
            const pg = parts[0].trim();
            let person = null, number = 'S', gender = null;
            
            if (pg.includes('1')) person = '1st';
            else if (pg.includes('2')) person = '2nd';
            else if (pg.includes('3')) person = '3rd';
            else if (pg.includes('4')) person = '4th';
            
            const upperPg = pg.toUpperCase();
            if (upperPg.includes('S')) number = 'S';
            if (upperPg.includes('P')) number = 'P';
            else if (upperPg.includes('C')) number = 'C';
            else if (upperPg.includes('D')) number = 'D';
            else if (upperPg.includes('B')) number = 'B';
            
            if (/masc/i.test(pg)) gender = 'Masc';
            else if (/fem/i.test(pg)) gender = 'Fem';
            else if (/neut/i.test(pg)) gender = 'Neut';
            else if (/anim/i.test(pg)) gender = 'Anim';
            else if (/inan/i.test(pg)) gender = 'Inan';
            
            const fap = parts[1].trim().split('/');
            return { id: `pr-${pg}`, person, number, gender, freeForm: fap[0]?.trim() || '', affix: fap[1]?.trim() || '', appliesTo: 'all' };
        }).filter(Boolean);
    }, [personRulesStr]);

    const analyzer = useMemo(() => createGrammarAnalyzer({
        lexicon,
        grammarRules,
        syntaxOrder,
        waConfig,
        personRulesArray,
        transliterate,
        adjectivePlacement: useConfigStore.getState().adjectivePlacement,
        adjectiveAgreement: useConfigStore.getState().adjectiveAgreement
    }), [lexicon, grammarRules, syntaxOrder, waConfig, personRulesArray, transliterate]);

    const { computePhraseSuggestion, lemmatize, matchesTranslation, reorderBreakdown } = analyzer;


    // Auto-save and content sync
    useEffect(() => {
        const t = setTimeout(() => onSave(text), 2000);
        return () => clearTimeout(t);
    }, [text, onSave]);
    useEffect(() => { setText(content || ''); }, [content]);

    const isVertical = writingDirection?.startsWith('vertical');
    // Build affixMap for the Interlinear Reader (affix → label)
    const affixMap = useMemo(() => {
        const map = {};
        const processAffix = (aff, data) => {
            if (!aff) return;
            const cleanAff = aff.trim().replace(/^['"-]/, '').replace(/['"-]$/, '').split('@')[0];
            if (cleanAff) { map[cleanAff] = data; map["'" + cleanAff] = data; map["-" + cleanAff] = data; }
        };
        personRulesArray.forEach(rule => {
            if (rule.affix) {
                const p = rule.person ? rule.person.replace(/[a-z]/g, '') : '';
                const n = rule.number || '';
                const g = rule.gender ? '.' + rule.gender : '';
                processAffix(rule.affix, { label: `${p}${n}${g}`, translation: rule.freeForm ? `(${rule.freeForm})` : '' });
            }
        });
        grammarRules.forEach(rule => {
            if (rule.affix) {
                processAffix(rule.affix, { label: rule.name || 'affix', translation: '' });
            }
        });
        return map;
    }, [personRulesArray, grammarRules]);

    // Combine lexicon with pronouns for the reader to find
    const extendedLexicon = useMemo(() => {
        const pronouns = personRulesArray
            .filter(r => r.freeForm)
            .map(r => ({
                id: `pronoun-${r.id}`,
                word: r.freeForm,
                wordClass: 'pronoun',
                translation: `${r.person} ${r.number}${r.gender ? ' ' + r.gender : ''}`,
                definition: r.translation || ''
            }));
        return [...lexicon, ...pronouns];
    }, [lexicon, personRulesArray]);

    // Helper to find entry even if inflected
    const findEntry = (token) => {
        const clean = token.replace(/[.,!?()[\]{}"`:;]/g, '').replace(/[‘’]/g, "'");
        if (!clean) return { entry: null, isExact: false };
        
        // Exact match in extendedLexicon
        const cleanLower = clean.toLowerCase();
        let exactEntry = extendedLexicon.find(e => e.word.replace(/\*/g,'').replace(/[‘’]/g, "'").toLowerCase() === cleanLower);
        if (exactEntry) return { entry: exactEntry, isExact: true };

        // Robust parsing using morphology engine
        const parsings = getUniqueParsings(clean, lexicon, config, normalizeToBase);
        
        if (cleanLower.includes('prikar') || cleanLower.includes('mas')) {
            console.log("findEntry Debug for:", cleanLower);
            console.log("Parsings:", parsings);
        }

        if (parsings.length > 0) {
            const p = parsings[0];
            const isExact = p.rules.length === 0;
            const label = p.rules.map(r => r.name || r.affix || '').filter(Boolean).join(', ');
            const trans = p.rules.map(r => r.translation || '').filter(Boolean).join(' ');
            return { 
                entry: p.root, 
                isExact, 
                personData: { label, translation: trans ? `(${trans})` : '' } 
            };
        }

        // Fallback to WikiTab's naive affixMap lookup for cases where the grammar rule is missing applyTo
        const sortedLexicon = [...extendedLexicon].sort((a, b) => b.word.length - a.word.length);
        for (const e of sortedLexicon) {
            const root = e.word.replace(/\*/g,'').replace(/[‘’]/g, "'").toLowerCase();
            if (root.length >= 2 && cleanLower.includes(root) && cleanLower !== root) {
                const affixPart = cleanLower.replace(root, '');
                const affixData = affixMap[affixPart] || affixMap[affixPart.replace(/^['"-]|['"-]$/g, '')];
                if (affixData) {
                    return { entry: e, isExact: false, personData: affixData };
                }
            }
        }
        
        return { entry: null, isExact: false };
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

    ;

    const handleTextChange = (e) => {
        const val = e.target.value;
        setText(val);
        if (!wordAssist) return;

        const cursor = e.target.selectionStart;
        const { word, start, end } = getWordAtCursor(val, cursor);
        const query = word.replace(/[.,!?()[\]{}"`:;]/g, '').toLowerCase();

        // ── Phrase translation — always computed so the summary stays visible ──────
        const phraseSuggs = computePhraseSuggestion(val, cursor, syntaxOrder, manualRoles);
        const combined = [...(Array.isArray(phraseSuggs) ? phraseSuggs : [])];

        // ── Lexicon & Inflections — only if query is long enough ──────────────────
        if (query.length >= 2) {
            setWordRange({ start, end });
            const { lemma, wordCase, isAgentive, tense: wordTense } = lemmatize(query);

            const directBucket    = [];
            const pronounBucket   = [];
            const inflectedBucket = [];

        // ── Bucket 1: Direct lexicon translation matches ──────────────────────────
        lexicon
            .filter(e => matchesTranslation(e.translation, query) || matchesTranslation(e.translation, lemma))
            .sort((a, b) => {
                const ta = (a.translation||'').toLowerCase(), tb = (b.translation||'').toLowerCase();
                const score = (t) => t === query ? 0 : t.startsWith(query + ' ') ? 1 : 2;
                return score(ta) - score(tb) || a.word.length - b.word.length;
            })
            .slice(0, 6)   // allow up to 6 direct matches
            .forEach(entry => {
                const base = entry.word.replace(/\*/g, '');
                const wc   = (entry.wordClass || '').toLowerCase();
                const role = wc.includes('verb') ? 'V' : wc.includes('noun') || wc.includes('adj') ? 'O' : null;
                directBucket.push({ key: `d-${entry.id}`, type: 'direct', romanized: base, display: transliterate(base, lexicon), gloss: entry.translation, definition: entry.definition, wordClass: entry.wordClass, role, label: '' });

                // ── Verb inflections — only for the verb, max 2 person forms per verb ──
                if (wc.includes('verb') || !entry.wordClass) {
                    personRulesArray
                        .filter(r => { const at=(r.appliesTo||'all').toLowerCase(); return at==='all'||at.includes('verb'); })
                        .slice(0, 2)   // cap: only first 2 person rules per verb
                        .forEach(rule => {
                            if (!rule.affix) return;
                            const inflected = applyAffixToBase(base, rule.affix);
                            const personLabel = `${rule.person} ${rule.number}${rule.gender?' '+rule.gender:''}`;
                            inflectedBucket.push({ key: `inf-${entry.id}-${rule.id}`, type: 'inflected', romanized: inflected, display: transliterate(inflected, lexicon), gloss: entry.translation, definition: entry.definition, wordClass: entry.wordClass, role: 'V', label: personLabel });
                        });

                    // ── Grammar case forms — max 3 per verb ──
                    grammarRules
                        .filter(r => r.affix && (r.appliesTo === 'all' || r.appliesTo === 'verb' || !r.appliesTo))
                        .filter(r => {
                            const name = (r.name || '').toLowerCase();
                            // Show relevant forms detected from English word tense
                            if (wordTense === 'gerund' && (name.includes('gerund') || name.includes('continuous') || name.includes('progressive'))) return true;
                            if (wordCase === 'comparative' && isAgentive && name.includes('agentive')) return true;
                            return ['passive', 'gerund', 'continuous', 'progressive', 'agentive'].some(k => name.includes(k));
                        })
                        .forEach(rule => {
                            const cased = applyAffixToBase(base, rule.affix);
                            inflectedBucket.push({ key: `gc-${entry.id}-${rule.id}`, type: 'grammar-case', romanized: cased, display: transliterate(cased, lexicon), gloss: entry.translation, definition: entry.definition, wordClass: entry.wordClass, role: 'V', label: rule.name || rule.condition || '' });
                        });
                }

                // ── Adjective/Noun forms ──
                if (wc.includes('adj') || wc.includes('noun')) {
                     grammarRules
                        .filter(r => r.affix && (r.appliesTo === 'all' || r.appliesTo.includes(wc) || !r.appliesTo))
                        .filter(r => {
                            const name = (r.name || '').toLowerCase();
                            if (wordCase && name.includes(wordCase)) return true;
                            return ['accusative', 'nominative', 'dative', 'ablative', 'locative', 'instrumental', 'vocative', 'ergative', 'comparative', 'superlative', 'possessive', 'genitive', 'agentive'].some(k => name.includes(k));
                        })
                        .forEach(rule => {
                            const cased = applyAffixToBase(base, rule.affix);
                            inflectedBucket.push({ key: `gc-adj-${entry.id}-${rule.id}`, type: 'grammar-case', romanized: cased, display: transliterate(cased, lexicon), gloss: entry.translation, definition: entry.definition, wordClass: entry.wordClass, role: 'O', label: rule.name || rule.condition || '' });
                        });
                }
            });

        // ── Bucket 2: English pronoun → free-form + case-marked forms ─────────────
        const pronounInfo = PRONOUN_MAP[query];
        if (pronounInfo) {
            personRulesArray
                .filter(r => {
                    const pMatch = r.person === pronounInfo.person;
                    const nMatch = !pronounInfo.number || r.number === pronounInfo.number;
                    const gMatch = !pronounInfo.gender || !r.gender || r.gender === pronounInfo.gender;
                    return pMatch && nMatch && gMatch;
                })
                .forEach(rule => {
                    if (rule.freeForm) {
                        const pLabel = `${rule.person} ${rule.number}${rule.gender?' '+rule.gender:''}`;
                        pronounBucket.push({ key: `pron-${rule.id}`, type: 'pronoun', romanized: rule.freeForm, display: transliterate(rule.freeForm, lexicon), gloss: query, wordClass: 'Pronoun', role: pronounInfo.role, label: pLabel });
                        grammarRules
                            .filter(r => r.affix && (r.appliesTo === 'all' || r.appliesTo === 'noun' || r.appliesTo === 'pronoun' || !r.appliesTo))
                            .slice(0, 2)
                            .forEach(gr => {
                                const cased = applyAffixToBase(rule.freeForm, gr.affix);
                                pronounBucket.push({ key: `pron-case-${rule.id}-${gr.id}`, type: 'grammar-case', romanized: cased, display: transliterate(cased, lexicon), gloss: query, wordClass: 'Pronoun', role: pronounInfo.role, label: `${rule.person} ${rule.number} · ${gr.name||gr.condition||'case'}` });
                            });
                    }
                });
        }
            
            // Merge all buckets into the combined list (which already has phrase suggestions)
            combined.push(...directBucket.slice(0, 6), ...pronounBucket, ...inflectedBucket);
        }

        // Final assembly
        if (query.length >= 2 && !FUNCTION_WORDS.has(query)) {
            const hasLexiconMatch = combined.some(s => s.type === 'direct' || s.type === 'inflected');
            if (!hasLexiconMatch) {
                combined.push({
                    key: 'no-match-fallback', type: 'direct', romanized: `[${query}]`, display: `[${query}]`,
                    gloss: 'Not found in lexicon', wordClass: 'Unknown', role: 'O', label: 'Missing'
                });
            }
        }

        setSuggestions(combined.slice(0, 50));
        setActiveSuggIdx(0);
    };


    const applySuggestion = (sugg) => {
        if (!wordRange) return;
        let insertStart, insertEnd;

        if (sugg.type === 'phrase') {
            // Replace the entire current line
            insertStart = sugg.lineStart;
            insertEnd   = sugg.lineEnd;
        } else {
            insertStart = wordRange.start;
            insertEnd   = wordRange.end;
        }

        const insertion = sugg.romanized;
        const newText   = text.slice(0, insertStart) + insertion + text.slice(insertEnd);
        setText(newText);
        setSuggestions([]);
        setWordRange(null);
        setTimeout(() => {
            if (textareaRef.current) {
                const pos = insertStart + insertion.length;
                textareaRef.current.selectionStart = pos;
                textareaRef.current.selectionEnd   = pos;
                textareaRef.current.focus();
            }
        }, 0);
    };
    
    const handleChipReorder = (suggIdx, fromIdx, toIdx) => {
        if (fromIdx === toIdx) return;
        const newSuggestions = [...suggestions];
        const sugg = { ...newSuggestions[suggIdx] };
        if (!sugg.reordered) return;
        
        const reordered = [...sugg.reordered];
        const [moved] = reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, moved);
        
        sugg.reordered = reordered;
        sugg.romanized = reordered.map(w => w.conlang).join(' ');
        sugg.display = transliterate(sugg.romanized, lexicon);
        
        newSuggestions[suggIdx] = sugg;
        setSuggestions(newSuggestions);
        setDraggedChip(null);
    };

    const handleChipClick = (e, suggIdx, chipIdx) => {
        e.stopPropagation();
        const newSuggestions = [...suggestions];
        const sugg = { ...newSuggestions[suggIdx] };
        if (!sugg.reordered) return;
        
        const reordered = [...sugg.reordered];
        const itemToUpdate = reordered[chipIdx];
        if (!itemToUpdate) return;

        const breakdown = [...(sugg.wordBreakdown || sugg.reordered)];
        const breakdownItem = breakdown.find((w, i) => w && (i === chipIdx || w === itemToUpdate)) || itemToUpdate;
        
        const base = breakdownItem.entry?.word || (breakdownItem.conlang || '').replace(/[[\]]/g, '');
        const wc = (breakdownItem.entry?.wordClass || '').toLowerCase();
        
        const matches = lexicon.filter(e => {
            const t1 = (e.translation || '').toLowerCase();
            const t2 = (e.shortTranslation || '').toLowerCase();
            const searchTerms = [(itemToUpdate.original || '').toLowerCase()];
            return searchTerms.some(term => matchesTranslation(t1, term) || matchesTranslation(t2, term));
        });

        let matchingRules = [];
        if (wc.includes('noun') || wc.includes('adj')) {
             matchingRules = grammarRules.filter(r => r.affix && (r.appliesTo === 'all' || r.appliesTo.includes(wc) || !r.appliesTo))
                                         .filter(r => {
                                             const name = (r.name || '').toLowerCase();
                                             return ['accusative', 'nominative', 'dative', 'ablative', 'locative', 'instrumental', 'vocative', 'ergative', 'comparative', 'superlative', 'possessive', 'genitive', 'agentive'].some(k => name.includes(k));
                                         });
        } else if (wc.includes('verb')) {
             matchingRules = grammarRules.filter(r => r.affix && (r.appliesTo === 'all' || r.appliesTo === 'verb' || !r.appliesTo))
                                         .filter(r => {
                                             const name = (r.name || '').toLowerCase();
                                             return ['passive', 'gerund', 'continuous', 'progressive', 'agentive'].some(k => name.includes(k));
                                         });
        }

        const totalOptions = matches.length + matchingRules.length;
        const cycleIdx = itemToUpdate.caseCycleIdx !== undefined ? itemToUpdate.caseCycleIdx + 1 : 0;
        const skipIdx  = totalOptions;


        if (cycleIdx < matches.length) {
            // Cycle through Lexicon Matches (Synonyms)
            const m = matches[cycleIdx];
            itemToUpdate.conlang = m.word;
            itemToUpdate.entry = m;
            itemToUpdate.ruleName = `Match ${cycleIdx + 1}/${matches.length}`;
            itemToUpdate.caseCycleIdx = cycleIdx;
            itemToUpdate.inflected = false;
            itemToUpdate.swallowed = false;
        } else if (cycleIdx < totalOptions) {
            // Standard Grammar Rule cycle
            const ruleIdx = cycleIdx - matches.length;
            const rule = matchingRules[ruleIdx];
            itemToUpdate.conlang = applyAffixToBase(base, rule.affix);
            itemToUpdate.ruleName = rule.name || rule.condition || 'case';
            itemToUpdate.caseCycleIdx = cycleIdx;
            itemToUpdate.inflected = true;
            itemToUpdate.swallowed = false;
        } else if (cycleIdx === skipIdx) {
            // Drop/Skip state
            itemToUpdate.swallowed = true;
            itemToUpdate.ruleName = "SKIP";
            itemToUpdate.caseCycleIdx = skipIdx;
            itemToUpdate.conlang = `[${base}]`; 
        } else {
            // Reset to base state
            itemToUpdate.swallowed = false;
            let conlang = base;
            if (itemToUpdate.markers && itemToUpdate.markers.length > 0) {
                itemToUpdate.markers.forEach(t => {
                    if (t.position === 'prefix') conlang = t.marker.replace(/-$/, '') + conlang;
                    else if (t.position === 'suffix') conlang = conlang + t.marker.replace(/^-/, '');
                });
            }
            itemToUpdate.conlang = conlang;
            itemToUpdate.ruleName = null;
            itemToUpdate.caseCycleIdx = -1;
            itemToUpdate.inflected = false;
        }
        
        const fullList = sugg.wordBreakdown || sugg.reordered || [];
        
        // If this is an Affix Form, we need to RE-APPLY the person marker per clause
        if (sugg.wordBreakdown) {
            const applyClausePersonAgreement = (clauseTokens) => {
                // 1. Clear existing person markers in this clause
                clauseTokens.forEach(w => {
                    if (w && w.role === 'V' && w.inflectedByPerson) {
                        w.conlang = w.originalConlang || w.conlang;
                        w.inflectedByPerson = false;
                    }
                    if (w && w.role === 'S') w.encodedInVerb = false;
                });

                // 2. Find subject and verb in this clause
                const subjWord = clauseTokens.find(w => w && w.role === 'S' && w.personRule?.affix);
                if (subjWord) {
                    let targetVerb = null;
                    for (let j = clauseTokens.length - 1; j >= 0; j--) {
                        const w = clauseTokens[j];
                        if (w && w.role === 'V' && !w.swallowed && w.conlang && !w.conlang.startsWith('[')) {
                            targetVerb = w;
                            break;
                        }
                    }
                    if (targetVerb) {
                        if (!targetVerb.originalConlang) targetVerb.originalConlang = targetVerb.conlang;
                        targetVerb.conlang = applyAffixToBase(targetVerb.conlang, subjWord.personRule.affix);
                        targetVerb.inflectedByPerson = true;
                        subjWord.encodedInVerb = true;
                    }
                }
            };

            let currentClause = [];
            fullList.forEach(w => {
                if (w && w.isPunct) {
                    applyClausePersonAgreement(currentClause);
                    currentClause = [];
                } else {
                    currentClause.push(w);
                }
            });
            if (currentClause.length > 0) {
                applyClausePersonAgreement(currentClause);
            }
        }
        
        // Reorder each clause of fullList independently
        const newReordered = [];
        let currentClause = [];
        fullList.forEach(w => {
            if (w && w.isPunct) {
                if (currentClause.length > 0) {
                    newReordered.push(...reorderBreakdown(currentClause));
                    currentClause = [];
                }
                newReordered.push(w);
            } else {
                currentClause.push(w);
            }
        });
        if (currentClause.length > 0) {
            newReordered.push(...reorderBreakdown(currentClause));
        }
        sugg.reordered = newReordered;

        sugg.romanized = sugg.reordered.filter(w => !w.swallowed && !w.encodedInVerb).map(w => w.conlang).join(' ');
        sugg.display = transliterate(sugg.romanized, lexicon);

        
        newSuggestions[suggIdx] = sugg;
        setSuggestions(newSuggestions);
    };

    const handleKeyDown = (e) => {
        if (suggestions.length === 0) return;
        if (e.key === 'Tab') {
            e.preventDefault();
            applySuggestion(suggestions[activeSuggIdx]);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveSuggIdx(i => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveSuggIdx(i => Math.max(i - 1, 0));
        } else if (e.key === 'Escape') {
            setSuggestions([]);
        }
    };

    // ── Interlinear render ───────────────────────────────────────────────────────
    const renderInterlinear = () => {
        const tokens = text.split(/(\s+)/);
        
        return (
            <div style={{
                writingMode: isVertical ? writingDirection : 'horizontal-tb',
                direction: writingDirection === 'rtl' ? 'rtl' : 'ltr',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '15px',
                padding: '20px',
                lineHeight: '1.5',
                minHeight: '400px',
                alignItems: 'flex-start',
                alignContent: 'flex-start'
            }}>
                {tokens.map((token, i) => {
                    if (!token.trim()) {
                        if (token.includes('\n')) {
                            const newlines = (token.match(/\n/g) || []).length;
                            return <div key={i} style={{ flexBasis: '100%', height: `${(newlines - 1) * 20}px` }} />;
                        }
                        return null; // Skip regular spaces since we use flex gap
                    }
                    
                    const { entry, isExact, personData } = findEntry(token);
                    const displayWord = transliterate(token, lexicon);

                    return (
                        <div key={i} style={{ 
                            display: 'inline-flex', 
                            flexDirection: isVertical ? 'row' : 'column',
                            alignItems: 'flex-start',
                            gap: '2px',
                            textOrientation: 'mixed',
                            opacity: entry ? 1 : 0.6
                        }}>
                            <span className="custom-font-text notranslate" style={{ 
                                fontSize: '1.2rem', 
                                color: entry ? (isExact ? 'var(--acc)' : 'var(--acc2)') : 'var(--tx)', 
                                fontWeight: entry ? 'bold' : 'normal' 
                            }}>
                                {displayWord}
                            </span>
                            {entry && (
                                <>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--tx3)', fontStyle: 'italic', fontFamily: 'sans-serif' }}>
                                        {entry.wordClass || 'root'}{!isExact && ` (+${personData.label})`}
                                    </span>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--tx)', fontFamily: 'sans-serif', fontWeight: isExact ? 'normal' : '500' }}>
                                        {entry.translation} {personData?.translation}
                                        {entry.definition && <span className="suggestion-def"> — {entry.definition}</span>}
                                    </span>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="wiki-toolbar">
                <Button variant={mode === 'edit' ? 'imp' : 'default'} onClick={() => setMode('edit')}>Edit Text</Button>
                <Button variant={mode === 'read' ? 'imp' : 'default'} onClick={() => setMode('read')}>Interlinear Reader</Button>
                <div style={{ flex: 1 }}></div>

                {/* Word Assist toggle — only relevant in edit mode */}
                {mode === 'edit' && (
                    <label style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        cursor: 'pointer', fontSize: '0.85rem',
                        color: wordAssist ? 'var(--acc)' : 'var(--tx2)',
                        fontWeight: wordAssist ? 700 : 400,
                        padding: '4px 10px',
                        border: `1px solid ${wordAssist ? 'var(--acc)' : 'var(--bd)'}`,
                        borderRadius: '6px',
                        background: wordAssist ? 'color-mix(in srgb, var(--acc) 12%, transparent)' : 'transparent',
                        transition: 'all 0.2s',
                        userSelect: 'none'
                    }}>
                        <input
                            type="checkbox"
                            style={{ accentColor: 'var(--acc)', width: '14px', height: '14px' }}
                            checked={wordAssist}
                            onChange={e => {
                                setWordAssist(e.target.checked);
                                setSuggestions([]);
                            }}
                        />
                        <Languages size={14} />
                        Word Assist
                    </label>
                )}

                {mode === 'edit' && wordAssist && (
                    <Button 
                        variant={isWaSettingsOpen ? 'imp' : 'default'} 
                        onClick={() => setIsWaSettingsOpen(!isWaSettingsOpen)}
                        style={{ padding: '4px 10px' }}
                        title="Word Assist Grammar Settings"
                    >
                        <Settings size={16} />
                    </Button>
                )}

                <Button variant="save" onClick={() => onSave(text)}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Save size={16} /> Save Document</div>
                </Button>
            </div>

            {/* ── Word Assist settings & suggestions panel ── */}
            {mode === 'edit' && wordAssist && (
                <div style={{
                    borderBottom: (suggestions.length > 0 || isWaSettingsOpen) ? '1px solid var(--acc)' : '1px solid var(--bd)',
                    background: (suggestions.length > 0 || isWaSettingsOpen) ? 'var(--s4)' : 'var(--s1)',
                    transition: 'all 0.2s'
                }}>
                    {isWaSettingsOpen && (
                        <div className="wa-settings-overlay">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Wand2 size={18} color="var(--acc)" /> Word Assist Configuration</h4>
                                <Button variant="default" onClick={() => setIsWaSettingsOpen(false)} style={{ padding: '2px 8px' }}>Close</Button>
                            </div>
                            <WordAssistSettingsMenu config={{ wordAssistConfig: waConfig }} updateConfig={updateConfig} grammarRules={grammarRules} />
                            <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--tx3)', display: 'flex', gap: '6px' }}>
                                    <Info size={14} /> These settings help the translation engine handle complex syntax. Changes take effect immediately as you type.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Status bar — always visible when word assist is on */}
                    {showWaTip && (
                        <WordAssistTutorial onClose={() => setShowWaTip(false)} />
                    )}

                    {wordRange && (suggestions.length > 0 || !FUNCTION_WORDS.has(text.slice(wordRange.start, wordRange.end).toLowerCase())) && (
                        <div style={{
                            padding: '4px 14px',
                            fontSize: '0.7rem',
                            color: suggestions.length > 0 ? 'var(--acc)' : 'var(--tx3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            borderBottom: suggestions.length > 0 ? '1px solid var(--bd)' : 'none',
                            fontWeight: 600,
                            letterSpacing: '0.04em'
                        }}>
                            <Languages size={11} />
                            {suggestions.length > 0
                                ? `${suggestions.length} match${suggestions.length > 1 ? 'es' : ''} for "${text.slice(wordRange.start, wordRange.end)}" — Tab to insert · ↑↓ navigate · Esc close`
                                : `No lexicon match for "${text.slice(wordRange.start, wordRange.end)}" — keep typing or check your lexicon`}
                        </div>
                    )}
                    {/* Suggestions list with type/role badges */}
                    {suggestions.map((sugg, idx) => {
                        const color = TYPE_COLORS[sugg.type] || 'var(--acc)';
                        const typeLabel = TYPE_LABELS[sugg.type] || sugg.type;
                        const rpos = sugg.role ? rolePosition(sugg.role) : 0;
                        const isActive = idx === activeSuggIdx;

                        // ── Special: phrase suggestion card ──────────────────────────────
                        if (sugg.type === 'phrase') {
                            const pc = sugg.label === 'Alt. Reading' ? '#0ea5e9' : '#8b5cf6';
                            return (
                                <div
                                    key={sugg.key}
                                    onClick={() => applySuggestion(sugg)}
                                    onMouseEnter={() => setActiveSuggIdx(idx)}
                                    style={{
                                        padding: '8px 14px',
                                        cursor: 'pointer',
                                        background: isActive
                                            ? `color-mix(in srgb, ${pc} 15%, transparent)`
                                            : `color-mix(in srgb, ${pc} 6%, transparent)`,
                                        borderLeft: isActive ? `3px solid ${pc}` : `3px solid color-mix(in srgb, ${pc} 35%, transparent)`,
                                        borderBottom: '1px solid var(--bd)',
                                        transition: 'background 0.15s',
                                    }}
                                >
                                    {/* Top row: badge + full phrase */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px', flexWrap: 'wrap',
                                        direction: isRTL ? 'rtl' : 'ltr' }}>
                                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'white', background: pc, borderRadius: '4px', padding: '1px 6px', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
                                            ✦ {sugg.label || 'phrase'}
                                        </span>
                                        <span className="custom-font-text notranslate" style={{ fontSize: '1.15rem', fontWeight: 700, color: pc,
                                            direction: isRTL ? 'rtl' : 'ltr', unicodeBidi: isRTL ? 'bidi-override' : 'normal' }}>
                                            {sugg.display}
                                        </span>
                                        <span style={{ fontSize: '0.9rem', color: 'var(--tx)', fontFamily: 'sans-serif', fontWeight: 600,
                                            direction: isRTL ? 'rtl' : 'ltr', unicodeBidi: isRTL ? 'bidi-override' : 'normal' }}>
                                            {sugg.romanized}
                                        </span>
                                        <span style={{ marginLeft: isRTL ? 0 : 'auto', marginRight: isRTL ? 'auto' : 0, fontSize: '0.63rem', fontWeight: 700, background: 'var(--s3)', color: 'var(--tx2)', borderRadius: '4px', padding: '1px 6px', fontFamily: 'sans-serif', whiteSpace: 'nowrap' }}>
                                            {syntaxOrder} · {isRTL ? 'RTL' : 'LTR'}
                                        </span>
                                    </div>
                                    {/* Bottom row: word-by-word breakdown chips */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px',
                                        flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                        {sugg.reordered?.map((breakdown, chipIdx) => {
                                            if (!breakdown || !breakdown.original) return null;
                                            const isMissing = !breakdown.found;
                                            const isFunction = FUNCTION_WORDS.has(breakdown.original.toLowerCase());
                                            if (isFunction && isMissing) return null;

                                            const isDragging = draggedChip?.suggIdx === idx && draggedChip?.chipIdx === chipIdx;

                                            return (
                                                <div 
                                                    key={chipIdx}
                                                    draggable
                                                    onDragStart={(e) => {
                                                        e.stopPropagation();
                                                        setDraggedChip({ suggIdx: idx, chipIdx: chipIdx });
                                                        e.dataTransfer.effectAllowed = "move";
                                                    }}
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        e.dataTransfer.dropEffect = "move";
                                                    }}
                                                    onDragEnd={() => setDraggedChip(null)}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        if (draggedChip && draggedChip.suggIdx === idx) {
                                                            handleChipReorder(idx, draggedChip.chipIdx, chipIdx);
                                                        }
                                                    }}
                                                    onClick={(e) => handleChipClick(e, idx, chipIdx)}
                                                    style={{ 
                                                        fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', 
                                                        background: isMissing ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                                                        border: `1px solid ${isMissing ? 'rgba(255,255,255,0.1)' : pc + '44'}`,
                                                        display: 'flex', flexDirection: 'column', color: isMissing ? '#999' : 'white',
                                                        opacity: (breakdown.encodedInVerb || breakdown.swallowed) ? 0.4 : (isDragging ? 0.2 : 1),
                                                        textDecoration: (breakdown.encodedInVerb || breakdown.swallowed) ? 'line-through' : 'none',
                                                        cursor: isDragging ? 'grabbing' : 'pointer',
                                                        transition: 'all 0.1s ease',
                                                        transform: isDragging ? 'scale(0.95)' : 'scale(1)',
                                                        userSelect: 'none',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                        position: 'relative'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = isMissing ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)';
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <span style={{ fontWeight: 600 }}>{breakdown.original}</span>
                                                        <span>→</span>
                                                        <span style={{ color: pc, fontWeight: 700 }}>{breakdown.conlang}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.55rem', opacity: 0.6, display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
                                                        <span 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const ROLES = ['S', 'V', 'O', 'M', 'J', 'R', 'P', 'A', 'Q', 'G', 'C', 'T', 'L', 'N'];
                                                                const currentRole = breakdown.role || 'O';
                                                                const idx = ROLES.indexOf(currentRole);
                                                                const nextRole = ROLES[(idx + 1) % ROLES.length];
                                                                
                                                                const newManualRoles = { ...manualRoles, [breakdown.original.toLowerCase()]: nextRole };
                                                                setManualRoles(newManualRoles);
                                                                
                                                                // Re-trigger suggestion compilation by faking a text change event
                                                                setTimeout(() => {
                                                                    const phraseSuggs = computePhraseSuggestion(text, textareaRef.current?.selectionStart || 0, syntaxOrder, newManualRoles);
                                                                    setSuggestions(prev => {
                                                                        const combined = [...(Array.isArray(phraseSuggs) ? phraseSuggs : [])];
                                                                        const others = prev.filter(p => p.type !== 'phrase');
                                                                        return [...combined, ...others];
                                                                    });
                                                                }, 0);
                                                            }}
                                                            style={{ 
                                                                fontWeight: 600, 
                                                                cursor: 'pointer', 
                                                                background: 'rgba(255,255,255,0.1)', 
                                                                padding: '1px 4px', 
                                                                borderRadius: '4px',
                                                                border: '1px dashed rgba(255,255,255,0.3)',
                                                                transition: 'all 0.1s'
                                                            }}
                                                            title="Click to manually override this grammatical role"
                                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.8)'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                                                        >
                                                            [{breakdown.role === 'V' ? 'verb' : breakdown.role === 'S' ? 'subject' : breakdown.role === 'O' ? 'object' : breakdown.role}]
                                                        </span>
                                                        {breakdown.entry?.wordClass && <span>[{breakdown.entry.wordClass}]</span>}
                                                        {breakdown.ruleName && <span style={{ color: '#ffcc00' }}>({breakdown.ruleName})</span>}
                                                        {breakdown.inflected && <span title={breakdown.ruleSource || 'Grammar Rule Applied'} style={{ color: '#ffcc00', cursor: 'help' }}>✦</span>}
                                                        {breakdown.matchCount > 1 && (
                                                            <span style={{ color: '#00ccff' }}>
                                                                ({breakdown.matchCount} alts: {breakdown.alternatives?.join(', ')})
                                                            </span>
                                                        )}
                                                        {!breakdown.found && breakdown.debugSearch && (
                                                            <span style={{ color: '#ff4444', fontStyle: 'italic' }}>
                                                                (searched: {breakdown.debugSearch})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                </div>
                            );
                        }

                        // ── Regular word suggestion row ──────────────────────────────────
                        return (
                            <div
                                key={sugg.key}
                                onClick={() => applySuggestion(sugg)}
                                style={{
                                    padding: '6px 14px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    background: isActive ? 'color-mix(in srgb, var(--acc) 12%, transparent)' : 'transparent',
                                    borderLeft: isActive ? `3px solid ${color}` : '3px solid transparent',
                                    transition: 'background 0.15s'
                                }}
                                onMouseEnter={() => setActiveSuggIdx(idx)}
                            >

                                {/* Type badge */}
                                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'white', background: color, borderRadius: '4px', padding: '1px 5px', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                                    {typeLabel}
                                </span>

                                {/* Script form */}
                                <span className="custom-font-text notranslate" style={{ fontSize: '1.1rem', fontWeight: 700, color, minWidth: '80px' }}>
                                    {sugg.display}
                                </span>

                                {/* Romanized form */}
                                <span style={{ fontSize: '0.88rem', color: 'var(--tx)', fontFamily: 'sans-serif', fontWeight: 600 }}>
                                    {sugg.romanized}
                                </span>

                                {/* Morphological label (person, case name, etc.) */}
                                {sugg.label && (
                                    <span style={{ fontSize: '0.75rem', color, fontFamily: 'sans-serif', fontStyle: 'italic', opacity: 0.85 }}>
                                        {sugg.label}
                                    </span>
                                )}

                                {/* English gloss */}
                                <span style={{ fontSize: '0.8rem', color: 'var(--tx2)', fontFamily: 'sans-serif', marginLeft: 'auto' }}>
                                    "{sugg.gloss}"
                                </span>

                                {/* Word order position badge */}
                                {sugg.role && rpos > 0 && (
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'var(--s3)', color: 'var(--tx2)', borderRadius: '4px', padding: '1px 5px', fontFamily: 'sans-serif', whiteSpace: 'nowrap' }}>
                                        {syntaxOrder[rpos-1]} pos {rpos}/{syntaxOrder.length}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <div style={{ flex: 1, padding: '15px', background: 'var(--s1)', borderRadius: '0 0 8px 8px', overflowY: 'auto' }}>
                {mode === 'edit' ? (
                    <textarea 
                        ref={textareaRef}
                        className="custom-font-text notranslate"
                        style={{ 
                            width: '100%', height: '100%', minHeight: '400px', 
                            background: 'transparent', border: 'none', color: 'var(--tx)', 
                            resize: 'none', outline: 'none', fontSize: '1.1rem',
                            fontFamily: wordAssist ? 'var(--font-body, sans-serif)' : undefined
                        }}
                        value={text}
                        onChange={handleTextChange}
                        onKeyDown={handleKeyDown}
                        placeholder={wordAssist
                            ? "Type in English — suggestions from your lexicon will appear automatically..."
                            : "Start typing your conlang text here..."}
                    />
                ) : (
                    renderInterlinear()
                )}
            </div>
        </div>
    );
}



// The Classic Rich Text Editor
function LegacyWikiEditor({ content, onSave }) {
    const editorRef = useRef(null);
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [iconPickerOpen, setIconPickerOpen] = useState(false);
    
    // We use a ref to track the last content we intentionally synced with the store.
    // This prevents DOMPurify from destroying the user's cursor position during autosave.
    const lastContentRef = useRef(content);

    useEffect(() => {
        if (editorRef.current && content !== editorRef.current.innerHTML && content !== lastContentRef.current) {
            // SEC-1: Sanitize HTML to prevent XSS via shared/cloud projects
            editorRef.current.innerHTML = DOMPurify.sanitize(content || '', {
                ALLOWED_TAGS: [
                    'b', 'i', 'u', 'a', 'span', 'p', 'br', 'div', 'h1', 'h2', 'h3', 'h4', 'strong', 'em', 'ul', 'ol', 'li',
                    'table', 'tbody', 'thead', 'tr', 'td', 'th', 'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'blockquote'
                ],
                ALLOWED_ATTR: [
                    'href', 'class', 'style', 'target', 'contenteditable',
                    'xmlns', 'viewBox', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'
                ]
            });
            lastContentRef.current = content;
        }
    }, [content]);

    const handleSave = () => {
        if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            lastContentRef.current = html;
            onSave(html);
        }
    };

    useEffect(() => {
        const autoSaveTimer = setInterval(handleSave, 3000);
        return () => clearInterval(autoSaveTimer);
    }, [onSave]);

    const formatText = (command, value = null) => {
        document.execCommand(command, false, value);
        if (editorRef.current) editorRef.current.focus();
    };

    const applyConlangFont = () => {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        // Check if we are already inside a conlang span. If so, unwrap it.
        let node = selection.anchorNode;
        while (node && node !== editorRef.current) {
            if (node.nodeType === 1 && node.classList && node.classList.contains('custom-font-text')) {
                // We are inside a conlang span, so remove the span (unwrap)
                const parent = node.parentNode;
                while (node.firstChild) {
                    parent.insertBefore(node.firstChild, node);
                }
                parent.removeChild(node);
                handleSave();
                return;
            }
            node = node.parentNode;
        }

        // If not inside, wrap the selection in the conlang span
        const selectedText = selection.toString();
        if (selectedText) {
            const html = `<span class="custom-font-text notranslate" style="color: var(--acc); font-weight: bold;">${selectedText}</span>`;
            document.execCommand('insertHTML', false, html);
        }
    };

    const insertTable = () => {
        const tableHtml = `
            <table class="wiki-table" style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                <thead>
                    <tr><th style="border: 1px solid var(--bd); padding: 8px; background: var(--s2);">Header 1</th><th style="border: 1px solid var(--bd); padding: 8px; background: var(--s2);">Header 2</th><th style="border: 1px solid var(--bd); padding: 8px; background: var(--s2);">Header 3</th></tr>
                </thead>
                <tbody>
                    <tr><td style="border: 1px solid var(--bd); padding: 8px;">Data</td><td style="border: 1px solid var(--bd); padding: 8px;">Data</td><td style="border: 1px solid var(--bd); padding: 8px;">Data</td></tr>
                    <tr><td style="border: 1px solid var(--bd); padding: 8px;">Data</td><td style="border: 1px solid var(--bd); padding: 8px;">Data</td><td style="border: 1px solid var(--bd); padding: 8px;">Data</td></tr>
                </tbody>
            </table><p><br></p>
        `;
        formatText('insertHTML', tableHtml);
    };

    const insertIcon = (iconName) => {
        const IconComponent = icons[iconName];
        if (IconComponent) {
            const svgString = renderToStaticMarkup(<IconComponent size={20} color="currentColor" style={{ verticalAlign: 'middle', margin: '0 4px', display: 'inline-block' }} />);
            // Ensure proper wrapping so it doesn't break text flow
            const html = `<span class="wiki-inline-icon" contenteditable="false">${svgString}</span>&#8203;`;
            formatText('insertHTML', html);
        }
        setIconPickerOpen(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="wiki-toolbar">
                <button className="wiki-tool-btn" title="Heading 1" onClick={() => formatText('formatBlock', 'H1')}><Heading1 size={16} /></button>
                <button className="wiki-tool-btn" title="Heading 2" onClick={() => formatText('formatBlock', 'H2')}><Heading2 size={16} /></button>
                <button className="wiki-tool-btn" title="Heading 3" onClick={() => formatText('formatBlock', 'H3')}><Heading3 size={16} /></button>
                <div style={{ width: '1px', background: 'var(--bd)', margin: '0 5px' }}></div>
                <button className="wiki-tool-btn" title="Bold" onClick={() => formatText('bold')}><Bold size={16} /></button>
                <button className="wiki-tool-btn" title="Italic" onClick={() => formatText('italic')}><Italic size={16} /></button>
                <button className="wiki-tool-btn" title="Underline" onClick={() => formatText('underline')}><Underline size={16} /></button>
                <button className="wiki-tool-btn" title="Quote / Callout" onClick={() => formatText('formatBlock', 'blockquote')}><Quote size={16} /></button>
                <div style={{ width: '1px', background: 'var(--bd)', margin: '0 5px' }}></div>
                <button className="wiki-tool-btn" title="Insert Table" onClick={insertTable}><Table size={16} /></button>
                <button className="wiki-tool-btn" title="Insert Icon" onClick={() => setIconPickerOpen(true)}><Smile size={16} /></button>
                <button className="wiki-tool-btn" title="Insert Link" onClick={() => setLinkModalOpen(true)}><Link size={16} /></button>
                <button className="wiki-tool-btn" title="Format as Conlang Font" onClick={applyConlangFont}><Type size={16} /> <span style={{fontSize: '0.7rem', marginLeft: '4px', fontWeight: 'bold'}}>CONLANG</span></button>
                <div style={{ flex: 1 }}></div>
                <Button variant="save" onClick={handleSave}><div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Save size={16} /> Save Document</div></Button>
            </div>
            <div 
                className="wiki-editor" 
                contentEditable 
                ref={editorRef} 
                onBlur={handleSave}
                suppressContentEditableWarning={true}
            />

            <Modal isOpen={linkModalOpen} onClose={() => setLinkModalOpen(false)} title="Insert Link">
                <Input label="Target URL" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." autoFocus />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}><Button variant="imp" onClick={() => { if(linkUrl) formatText('createLink', linkUrl); setLinkUrl(''); setLinkModalOpen(false); }}>Insert</Button></div>
            </Modal>

            <Modal isOpen={iconPickerOpen} onClose={() => setIconPickerOpen(false)} title="Insert Icon">
                <div className="icon-picker-grid">
                    {PREDEFINED_ICONS.map(iconName => {
                        const Icon = icons[iconName];
                        if (!Icon) return null;
                        return (
                            <button 
                                key={iconName} 
                                className="icon-picker-btn" 
                                title={iconName}
                                onClick={() => insertIcon(iconName)}
                            >
                                <Icon size={24} />
                            </button>
                        );
                    })}
                </div>
            </Modal>
        </div>
    );
}

export default function WikiTab() {
    const wikiPages = useConfigStore((state) => state.wikiPages) || {};
    const saveWikiPage = useConfigStore((state) => state.saveWikiPage);
    const addWikiPage = useConfigStore((state) => state.addWikiPage);
    const deleteWikiPage = useConfigStore((state) => state.deleteWikiPage);
    const reorderWikiPage = useConfigStore((state) => state.reorderWikiPage);
    const moveWikiPage = useConfigStore((state) => state.moveWikiPage);
    const updateWikiPageMetadata = useConfigStore((state) => state.updateWikiPageMetadata);
    const writingDirection = useConfigStore(state => state.writingDirection);

    const [currentPageId, setCurrentPageId] = useState(() => {
        const keys = Object.keys(wikiPages);
        const firstDoc = keys.find(k => typeof wikiPages[k] !== 'object' || wikiPages[k].type !== 'notebook');
        return firstDoc || null;
    });
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newPageTitle, setNewPageTitle] = useState('');
    const [newPageType, setNewPageType] = useState('wiki'); // 'wiki', 'corpus', or 'notebook'
    const [newPageParentId, setNewPageParentId] = useState('root');
    const [expandedNotebooks, setExpandedNotebooks] = useState(() => {
        const state = {};
        Object.keys(wikiPages).forEach(k => {
            if (wikiPages[k] && wikiPages[k].type === 'notebook' && wikiPages[k].expanded) {
                state[k] = true;
            }
        });
        return state;
    });

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPageId, setEditingPageId] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [editIcon, setEditIcon] = useState('');
    const [editParentId, setEditParentId] = useState('root');

    const notebooks = Object.keys(wikiPages).filter(k => {
        const p = wikiPages[k];
        return p && typeof p === 'object' && p.type === 'notebook';
    });

    const rootPages = Object.keys(wikiPages).filter(k => {
        const p = wikiPages[k];
        if (p && typeof p === 'object' && p.type === 'notebook') return false;
        if (p && typeof p === 'object' && p.parentId) return false;
        return true;
    });

    const getChildren = (notebookId) => {
        return Object.keys(wikiPages).filter(k => {
            const p = wikiPages[k];
            return p && typeof p === 'object' && p.parentId === notebookId;
        });
    };

    const toggleNotebook = (notebookId, e) => {
        e.stopPropagation();
        setExpandedNotebooks(prev => ({ ...prev, [notebookId]: !prev[notebookId] }));
    };

    const handleCreatePage = () => {
        try {
            if (!newPageTitle.trim()) {
                alert("Title cannot be empty!");
                return;
            }
            const pageId = newPageTitle.trim().toLowerCase().replace(/\s+/g, '-');
            const parent = newPageParentId === 'root' ? null : newPageParentId;
            addWikiPage(pageId, newPageTitle.trim(), newPageType, parent);
            
            if (newPageType !== 'notebook') {
                setCurrentPageId(pageId);
                if (parent) {
                    setExpandedNotebooks(prev => ({ ...prev, [parent]: true }));
                }
            } else {
                setExpandedNotebooks(prev => ({ ...prev, [pageId]: true }));
            }
            
            setNewPageTitle('');
            setNewPageType('wiki');
            setNewPageParentId('root');
            setIsCreateModalOpen(false);
        } catch (err) {
            alert("Error creating page: " + err.message);
        }
    };

    const handleDeletePage = (pageId, e) => {
        e.stopPropagation();
        const p = wikiPages[pageId];
        const isNotebook = p && typeof p === 'object' && p.type === 'notebook';
        const msg = isNotebook 
            ? "Are you sure you want to delete this notebook and ALL chapters inside it?" 
            : "Are you sure you want to delete this document?";
            
        if (!window.confirm(msg)) return;
        
        deleteWikiPage(pageId);
        
        // If the current page is deleted (or is a child of the deleted notebook), reset it
        if (currentPageId === pageId || (wikiPages[currentPageId] && wikiPages[currentPageId].parentId === pageId)) {
            const remainingPages = Object.keys(wikiPages).filter(id => id !== pageId && (!wikiPages[id].parentId || wikiPages[id].parentId !== pageId));
            const firstDoc = remainingPages.find(k => typeof wikiPages[k] !== 'object' || wikiPages[k].type !== 'notebook');
            setCurrentPageId(firstDoc || null);
        }
    };

    const handleOpenEdit = (pageId, e) => {
        e.stopPropagation();
        const p = wikiPages[pageId];
        setEditingPageId(pageId);
        setEditTitle(p && typeof p === 'object' ? p.title : pageId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
        setEditIcon(p && typeof p === 'object' && p.icon ? p.icon : '');
        setEditParentId(p && typeof p === 'object' && p.parentId ? p.parentId : 'root');
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = () => {
        if (!editTitle.trim()) {
            alert("Title cannot be empty!");
            return;
        }
        updateWikiPageMetadata(editingPageId, editTitle.trim(), editIcon);
        
        const p = wikiPages[editingPageId];
        if (p && (!p.type || p.type !== 'notebook')) {
            const currentParent = p.parentId || 'root';
            if (editParentId !== currentParent) {
                moveWikiPage(editingPageId, editParentId);
                if (editParentId !== 'root') {
                    setExpandedNotebooks(prev => ({ ...prev, [editParentId]: true }));
                }
            }
        }
        
        setIsEditModalOpen(false);
    };

    const renderPageItem = (pageId, indent = false) => {
        const p = wikiPages[pageId];
        const isCorp = p && typeof p === 'object' && p.type === 'corpus';
        const pTitle = p && typeof p === 'object' ? p.title : pageId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const Icon = p && typeof p === 'object' && p.icon && icons[p.icon] 
            ? icons[p.icon] 
            : (isCorp ? Languages : FileText);
        const iconColor = p && typeof p === 'object' && p.icon ? "var(--tx)" : (isCorp ? "var(--acc)" : "var(--tx2)");

        return (
            <div 
                key={pageId} 
                className={`wiki-page-item ${currentPageId === pageId ? 'active' : ''} ${indent ? 'nested' : ''}`}
                onClick={() => setCurrentPageId(pageId)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <div style={{ flexShrink: 0, display: 'flex' }}>
                        <Icon size={14} color={iconColor} />
                    </div>
                    <span style={{ fontWeight: 'bold', color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pTitle}</span>
                </div>
                <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }} className="wiki-item-controls">
                    <button className="wiki-del-btn" title="Move Up" onClick={(e) => { e.stopPropagation(); reorderWikiPage(pageId, 'up'); }}><ChevronUp size={14} /></button>
                    <button className="wiki-del-btn" title="Move Down" onClick={(e) => { e.stopPropagation(); reorderWikiPage(pageId, 'down'); }}><ChevronDown size={14} /></button>
                    
                    <button className="wiki-del-btn" title="Edit Details" onClick={(e) => handleOpenEdit(pageId, e)}><Edit2 size={14} /></button>
                    <button className="wiki-del-btn" title="Delete" onClick={(e) => handleDeletePage(pageId, e)}><Trash2 size={14} /></button>
                </div>
            </div>
        );
    };

    const currentPage = currentPageId ? wikiPages[currentPageId] : null;
    const isCorpus = currentPage && typeof currentPage === 'object' && currentPage.type === 'corpus';
    const content = (currentPage && typeof currentPage === 'object') ? currentPage.content : currentPage;

    return (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <Card style={{ flex: '1', minWidth: '260px', maxWidth: '320px' }}>
                <h2 className='flex sg-title' style={{ marginBottom: '15px' }}><Book /> Library & Writing</h2>
                <Button variant="imp" style={{ width: '100%', marginBottom: '20px' }} onClick={() => setIsCreateModalOpen(true)}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Plus size={18} /> New Document
                    </div>
                </Button>

                <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '500px', overflowY: 'auto', paddingRight: '5px' }}>
                    {Object.keys(wikiPages).length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--tx3)', fontStyle: 'italic', marginTop: '20px' }}>No documents created yet.</p>
                    ) : (
                        <>
                            {notebooks.map(nbId => {
                                const nb = wikiPages[nbId];
                                const isExpanded = expandedNotebooks[nbId];
                                const children = getChildren(nbId);
                                const NbIcon = nb.icon && icons[nb.icon] ? icons[nb.icon] : (isExpanded ? FolderOpen : Folder);
                                
                                return (
                                    <div key={nbId} className="wiki-notebook-container">
                                        <div className="wiki-notebook-header" onClick={(e) => toggleNotebook(nbId, e)}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                                <div style={{ flexShrink: 0, display: 'flex', color: 'var(--acc)' }}>
                                                    <NbIcon size={16} />
                                                </div>
                                                <span style={{ fontWeight: 'bold', color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nb.title}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }} className="wiki-item-controls">
                                                <button className="wiki-del-btn" title="Move Up" onClick={(e) => { e.stopPropagation(); reorderWikiPage(nbId, 'up'); }}><ChevronUp size={14} /></button>
                                                <button className="wiki-del-btn" title="Move Down" onClick={(e) => { e.stopPropagation(); reorderWikiPage(nbId, 'down'); }}><ChevronDown size={14} /></button>
                                                <button className="wiki-del-btn" title="Edit Notebook" onClick={(e) => handleOpenEdit(nbId, e)}><Edit2 size={14} /></button>
                                                <button className="wiki-del-btn" title="Delete" onClick={(e) => handleDeletePage(nbId, e)}><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                        {isExpanded && (
                                            <div className="wiki-notebook-children">
                                                {children.length === 0 && <div style={{ padding: '8px 20px', fontSize: '0.8rem', color: 'var(--tx3)', fontStyle: 'italic', borderLeft: '2px solid var(--bd)', marginLeft: '12px' }}>Empty notebook</div>}
                                                {children.map(childId => renderPageItem(childId, true))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            
                            {rootPages.map(pageId => renderPageItem(pageId, false))}
                        </>
                    )}
                </div>
            </Card>

            <Card style={{ flex: '3', minWidth: '300px' }}>
                {currentPageId ? (
                    isCorpus ? (
                        <CorpusEditor 
                            key={currentPageId}
                            content={content} 
                            writingDirection={writingDirection}
                            onSave={(val) => saveWikiPage(currentPageId, val)} 
                        />
                    ) : (
                        <LegacyWikiEditor 
                            key={currentPageId}
                            content={content} 
                            onSave={(val) => saveWikiPage(currentPageId, val)} 
                        />
                    )
                ) : (
                    <div style={{ textAlign: 'center', color: 'var(--tx3)', padding: '50px 0' }}>
                        <Book size={48} style={{ opacity: 0.2, marginBottom: '15px' }} />
                        <h3>Select or create a document to start writing.</h3>
                    </div>
                )}
            </Card>

            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Document">
                <Input label="Document Title" value={newPageTitle} onChange={(e) => setNewPageTitle(e.target.value)} placeholder="e.g. Genesis Translation, Phonotactics..." autoFocus />
                
                <div style={{ marginTop: '20px' }}>
                    <label className="form-label">Document Type</label>
                    <select 
                        className="fi" 
                        value={newPageType}
                        onChange={(e) => setNewPageType(e.target.value)}
                        style={{ width: '100%', padding: '10px', background: 'var(--s1)', color: 'var(--tx)', border: '1px solid var(--bd)', borderRadius: '6px' }}
                    >
                        <option value="wiki">Wiki Chapter (Rich Text)</option>
                        <option value="corpus">Corpus Text (Interlinear Glossing)</option>
                        <option value="notebook">Notebook (Folder to group chapters)</option>
                    </select>
                </div>

                {newPageType !== 'notebook' && notebooks.length > 0 && (
                    <div style={{ marginTop: '20px' }}>
                        <label className="form-label">Location</label>
                        <select 
                            className="fi" 
                            value={newPageParentId}
                            onChange={(e) => setNewPageParentId(e.target.value)}
                            style={{ width: '100%', padding: '10px', background: 'var(--s1)', color: 'var(--tx)', border: '1px solid var(--bd)', borderRadius: '6px' }}
                        >
                            <option value="root">Root Library (No Notebook)</option>
                            {notebooks.map(nb => (
                                <option key={nb} value={nb}>{wikiPages[nb].title}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}><Button variant="imp" onClick={handleCreatePage}>Create</Button></div>
            </Modal>

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Details">
                <Input label="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="e.g. Genesis Translation..." autoFocus />
                
                <div style={{ marginTop: '20px' }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Choose Icon</span>
                        {editIcon && (
                            <span 
                                style={{ color: 'var(--acc)', cursor: 'pointer', fontSize: '0.8rem' }} 
                                onClick={() => setEditIcon('')}
                            >
                                Clear Icon
                            </span>
                        )}
                    </label>
                    <div className="icon-picker-grid" style={{ background: 'var(--s1)', borderRadius: 'var(--rad-sm)', border: '1px solid var(--bd)' }}>
                        {PREDEFINED_ICONS.map(iconName => {
                            const Icon = icons[iconName];
                            if (!Icon) return null;
                            const isActive = editIcon === iconName;
                            return (
                                <button 
                                    key={iconName} 
                                    className="icon-picker-btn" 
                                    title={iconName}
                                    style={{ 
                                        background: isActive ? 'var(--acc)' : 'transparent',
                                        color: isActive ? 'var(--bg)' : 'var(--tx)',
                                        borderColor: isActive ? 'var(--acc)' : 'transparent'
                                    }}
                                    onClick={() => setEditIcon(iconName)}
                                >
                                    <Icon size={24} />
                                </button>
                            );
                        })}
                    </div>
                </div>

                {editingPageId && wikiPages[editingPageId] && wikiPages[editingPageId].type !== 'notebook' && notebooks.length > 0 && (
                    <div style={{ marginTop: '20px' }}>
                        <label className="form-label">Location</label>
                        <select 
                            className="fi" 
                            value={editParentId}
                            onChange={(e) => setEditParentId(e.target.value)}
                            style={{ width: '100%', padding: '10px', background: 'var(--s1)', color: 'var(--tx)', border: '1px solid var(--bd)', borderRadius: '6px' }}
                        >
                            <option value="root">Root Library (No Notebook)</option>
                            {notebooks.map(nb => (
                                <option key={nb} value={nb}>{wikiPages[nb].title}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <Button variant="imp" onClick={handleSaveEdit}>Save Changes</Button>
                </div>
            </Modal>
        </div>
    );
}

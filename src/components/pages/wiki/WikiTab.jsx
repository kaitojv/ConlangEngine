import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { sanitizeUrl, escapeHtml } from '@/utils/sanitizeHtml.js';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { getUniqueParsings } from '@/utils/morphologyEngine.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import { renderWordInScript } from '@/utils/scriptRendering.js';
import { getScriptSystem, getDefaultScriptId, repairScriptSystems } from '@/utils/scriptResolver.js';
import Card from '@/components/UI/Card/Card.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import Modal from '@/components/UI/Modal/Modal.jsx';
import { 
    Book, Plus, Trash2, Bold, Italic, Underline as UnderlineIcon, Link, Save, Type, Languages, 
    FileText, Settings, ChevronDown, ChevronUp, Info, Wand2, Quote, Heading1, Heading2, Heading3, 
    Table as TableIcon, Smile, icons, Folder, FolderOpen, Edit2,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Highlighter, Subscript as SubscriptIcon, Superscript as SuperscriptIcon,
    Strikethrough, List, ListOrdered, Undo, Redo, Eraser,
    Rows, Columns, ArrowUpFromLine, ArrowDownFromLine, ArrowLeftFromLine, ArrowRightFromLine,
    Indent as IndentIcon, Outdent as OutdentIcon,
    Image as ImageIcon, PenTool, GitBranch
} from 'lucide-react';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table as TiptapTable } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Underline as TiptapUnderline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Link as LinkExtension } from '@tiptap/extension-link';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { CharacterCount } from '@tiptap/extension-character-count';
import { renderToStaticMarkup } from 'react-dom/server';
import { Mark, mergeAttributes } from '@tiptap/core';
import { createGrammarAnalyzer } from '@/utils/grammarAnalyzer.js';
import { resolveEffectiveSyntaxOrder } from '@/utils/wordAssist/syntaxOrdering.js';
import LiveTranslatorPanel from './LiveTranslatorPanel.jsx';
import WordAssistSettingsPanel from './WordAssistSettingsPanel.jsx';
import LexiconEditModal from '../dictionary/LexiconEditModal.jsx';
import { Indent } from './indentExtension.js';
import { WikiImageNode, WikiDiagramNode, configureWikiNodeViews } from './wikiNodes.js';
import { WikiImageComponent, WikiDiagramComponent } from './WikiNodeViews.jsx';
import WikiImageModal from './WikiImageModal.jsx';
import WikiDoodleModal from './WikiDoodleModal.jsx';
import WikiDiagramModal from './WikiDiagramModal.jsx';

configureWikiNodeViews(WikiImageComponent, WikiDiagramComponent);

const ConlangSpan = Mark.create({
    name: 'conlangSpan',
    parseHTML() {
        return [{
            tag: 'span[class]',
            getAttrs: element => element.hasAttribute('class') ? {} : false
        }];
    },
    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes), 0];
    },
    addAttributes() {
        return {
            class: {
                default: null,
                parseHTML: element => element.getAttribute('class'),
            },
            style: {
                default: null,
                parseHTML: element => element.getAttribute('style'),
            },
            'data-script-id': {
                default: null,
                parseHTML: element => element.getAttribute('data-script-id'),
            },
            'data-writing-direction': {
                default: null,
                parseHTML: element => element.getAttribute('data-writing-direction'),
            }
        };
    }
});

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

function useConlangAnalyzer() {
    const rawLexicon = useLexiconStore((state) => state.lexicon);
    const lexicon = useMemo(() => rawLexicon || [], [rawLexicon]);
    const { transliterate, normalizeToBase } = useTransliterator();
    const config = useConfigStore(useShallow(state => ({
        grammarRules: state.grammarRules,
        personRules: state.personRules,
        verbMarker: state.verbMarker,
        cliticsRules: state.cliticsRules,
        syntaxOrder: state.syntaxOrder,
        wordAssistConfig: state.wordAssistConfig,
        adjectivePlacement: state.adjectivePlacement,
        adjectiveAgreement: state.adjectiveAgreement,
        pronounMatrixData: state.pronounMatrixData,
        particleDatabase: state.particleDatabase,
        usesParticles: state.usesParticles,
        morphologyMode: state.morphologyMode,
        numberSystem: state.numberSystem,
        numeralBase: state.numeralBase,
        vowels: state.vowels,
        consonants: state.consonants,
        otherPhonemes: state.otherPhonemes,
        scriptSystems: state.scriptSystems,
        activeScriptSystemId: state.activeScriptSystemId,
    })));
    const personRulesStr   = config.personRules || "";
    const rawGrammarRules  = config.grammarRules;
    const grammarRules     = useMemo(() => rawGrammarRules || [], [rawGrammarRules]);
    const syntaxOrder      = config.syntaxOrder || 'SVO';
    const rawWaConfig      = config.wordAssistConfig;
    const waConfig         = useMemo(() => rawWaConfig || {}, [rawWaConfig]);
    const updateConfig     = useConfigStore(state => state.updateConfig);

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
        syntaxOrder: waConfig?.syntaxOrder || syntaxOrder,
        waConfig,
        personRulesArray,
        transliterate,
        normalizeToBase,
        verbMarker: config.verbMarker,
        cliticsRules: config.cliticsRules,
        adjectivePlacement: config.adjectivePlacement,
        adjectiveAgreement: config.adjectiveAgreement,
        pronounMatrixData: config.pronounMatrixData,
        particleDatabase: config.particleDatabase,
        usesParticles: config.usesParticles,
        morphologyMode: config.morphologyMode,
        numberSystem: config.numberSystem,
        numeralBase: config.numeralBase,
        vowels: config.vowels,
        consonants: config.consonants,
        otherPhonemes: config.otherPhonemes
    }), [
        lexicon,
        grammarRules,
        syntaxOrder,
        waConfig,
        personRulesArray,
        transliterate,
        normalizeToBase,
        config.verbMarker,
        config.cliticsRules,
        config.adjectivePlacement,
        config.adjectiveAgreement,
        config.pronounMatrixData,
        config.particleDatabase,
        config.usesParticles,
        config.morphologyMode,
        config.numberSystem,
        config.numeralBase,
        config.vowels,
        config.consonants,
        config.otherPhonemes
    ]);

    return {
        analyzer,
        lexicon,
        transliterate,
        normalizeToBase,
        config,
        grammarRules,
        personRulesArray,
        syntaxOrder,
        waConfig,
        updateConfig
    };
}

// The new Interlinear Editor Component
function WordAssistTutorial({ onClose }) {
    const { t } = useTranslation();
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
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--tx)' }}>{t('wiki.tutorial.title')}</h4>
                    
                    {step === 1 && (
                        <div>
                            <h5 style={{ margin: '0 0 4px 0', color: '#8b5cf6', fontSize: '0.8rem' }}>{t('wiki.tutorial.step1Title')}</h5>
                            <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: 'var(--tx2)', lineHeight: '1.4' }}>
                                {t('wiki.tutorial.step1Text')}
                            </p>
                        </div>
                    )}
                    {step === 2 && (
                        <div>
                            <h5 style={{ margin: '0 0 4px 0', color: '#ec4899', fontSize: '0.8rem' }}>{t('wiki.tutorial.step2Title')}</h5>
                            <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: 'var(--tx2)', lineHeight: '1.4' }}>
                                {t('wiki.tutorial.step2Text')}
                            </p>
                        </div>
                    )}
                    {step === 3 && (
                        <div>
                            <h5 style={{ margin: '0 0 4px 0', color: '#f59e0b', fontSize: '0.8rem' }}>{t('wiki.tutorial.step3Title')}</h5>
                            <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: 'var(--tx2)', lineHeight: '1.4' }}>
                                {t('wiki.tutorial.step3Text')}
                            </p>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {[1, 2, 3].map(s => (
                                <div
                                    key={s}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Go to step ${s}`}
                                    onClick={() => setStep(s)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStep(s); } }}
                                    style={{ width: '8px', height: '8px', borderRadius: '50%', background: step === s ? 'var(--acc)' : 'var(--bd)', cursor: 'pointer' }}
                                />
                            ))}
                        </div>
                        <div>
                            {step > 1 && <Button variant="default" onClick={() => setStep(s => s - 1)} style={{ fontSize: '0.65rem', padding: '2px 8px', marginRight: '6px' }}>{t('wiki.tutorial.back')}</Button>}
                            {step < 3 ? (
                                <Button variant="imp" onClick={() => setStep(s => s + 1)} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>{t('wiki.tutorial.next')}</Button>
                            ) : (
                                <Button variant="default" onClick={onClose} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>{t('wiki.tutorial.gotIt')}</Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CorpusEditor({ content, onSave, writingDirection: props_writingDirection }) {
    const { t } = useTranslation();
    const [mode, setMode] = useState('edit');
    const [text, setText] = useState(content || '');
    const [wordAssist, setWordAssist] = useState(false);
    const [isWaSettingsOpen, setIsWaSettingsOpen] = useState(false);
    const [wordForAdd, setWordForAdd] = useState(null);
    const [activeSentence, setActiveSentence] = useState('');
    const textareaRef = useRef(null);

    const {
        analyzer,
        lexicon,
        transliterate,
        normalizeToBase,
        config,
        grammarRules,
        personRulesArray,
        syntaxOrder,
        waConfig,
        updateConfig
    } = useConlangAnalyzer();

    const storedWritingDir = useConfigStore(state => state.writingDirection) || 'ltr';
    const writingDirection = props_writingDirection || storedWritingDir;
    const isVertical       = writingDirection?.startsWith('vertical');

    // Auto-save and content sync
    useEffect(() => {
        const tm = setTimeout(() => onSave(text), 2000);
        return () => clearTimeout(tm);
    }, [text, onSave]);

    const [prevContent, setPrevContent] = useState(content);
    if (content !== prevContent) {
        setPrevContent(content);
        setText(content || '');
    }

    // Build affixMap for the Interlinear Reader
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

    const extendedLexicon = useMemo(() => {
        const prList = [];
        personRulesArray.forEach(rule => {
            if (rule.freeForm) {
                const p = rule.person ? rule.person.replace(/[a-z]/g, '') : '';
                const n = rule.number || '';
                const g = rule.gender ? '.' + rule.gender : '';
                prList.push({
                    id: rule.id,
                    word: rule.freeForm,
                    wordClass: 'pronoun',
                    translation: `${p}${n}${g} pronoun`,
                    definition: `Personal pronoun (${rule.person || ''} ${rule.number || ''} ${rule.gender || ''})`.trim()
                });
            }
        });
        return [...lexicon, ...prList];
    }, [lexicon, personRulesArray]);

    const findEntry = (wordToken) => {
        const clean = wordToken.replace(/[.,/#!$%^&*;:{}=\-_'~`()?"'’]/g, '');
        if (!clean) return { entry: null, isExact: false };

        const cleanLower = clean.toLowerCase();
        let exactEntry = extendedLexicon.find(e => e.word.replace(/\*/g,'').replace(/[‘’]/g, "'").toLowerCase() === cleanLower);
        if (exactEntry) return { entry: exactEntry, isExact: true };

        const parsings = getUniqueParsings(clean, lexicon, config, normalizeToBase);
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

    const updateActiveSentence = (val, cursor) => {
        if (!val) {
            setActiveSentence('');
            return;
        }
        const selStart = textareaRef.current?.selectionStart;
        const selEnd = textareaRef.current?.selectionEnd;
        if (selEnd !== undefined && selStart !== undefined && selEnd > selStart) {
            setActiveSentence(val.slice(selStart, selEnd).trim());
            return;
        }
        const pos = cursor !== undefined ? cursor : (textareaRef.current?.selectionStart || 0);
        const before = val.slice(0, pos);
        const after = val.slice(pos);
        const lineStart = before.lastIndexOf('\n') === -1 ? 0 : before.lastIndexOf('\n') + 1;
        const nextNl = after.indexOf('\n');
        const lineEnd = nextNl === -1 ? val.length : pos + nextNl;
        const currentLine = val.slice(lineStart, lineEnd).trim();
        setActiveSentence(currentLine);
    };

    const handleTextChange = (e) => {
        const val = e.target.value;
        setText(val);
        if (wordAssist) {
            updateActiveSentence(val, e.target.selectionStart);
        }
    };

    const handleSelectOrCursor = () => {
        if (wordAssist && textareaRef.current) {
            updateActiveSentence(text, textareaRef.current.selectionStart);
        }
    };

    const handleInsertTranslation = (insertedText) => {
        if (!textareaRef.current) return;
        const el = textareaRef.current;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        
        let newText;
        let nextCursor;
        if (start !== end) {
            newText = text.slice(0, start) + insertedText + text.slice(end);
            nextCursor = start + insertedText.length;
        } else {
            const before = text.slice(0, start);
            const after = text.slice(start);
            const lineStart = before.lastIndexOf('\n') === -1 ? 0 : before.lastIndexOf('\n') + 1;
            const nextNl = after.indexOf('\n');
            const lineEnd = nextNl === -1 ? text.length : start + nextNl;
            const currentLine = text.slice(lineStart, lineEnd).trim();
            
            if (currentLine && currentLine === activeSentence) {
                newText = text.slice(0, lineStart) + insertedText + text.slice(lineEnd);
                nextCursor = lineStart + insertedText.length;
            } else {
                newText = before + insertedText + after;
                nextCursor = start + insertedText.length;
            }
        }
        setText(newText);
        onSave(newText);
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.selectionStart = nextCursor;
                textareaRef.current.selectionEnd = nextCursor;
                textareaRef.current.focus();
            }
        }, 0);
    };

    // Interlinear render
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
                        return null;
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            {/* Toolbar */}
            <div className="wiki-toolbar">
                <Button variant={mode === 'edit' ? 'imp' : 'default'} onClick={() => setMode('edit')}>{t('wiki.corpus.editText')}</Button>
                <Button variant={mode === 'read' ? 'imp' : 'default'} onClick={() => setMode('read')}>{t('wiki.corpus.interlinearReader')}</Button>
                <div style={{ flex: 1 }}></div>

                {/* Word Assist / Live Translator toggle */}
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
                                const next = e.target.checked;
                                setWordAssist(next);
                                if (next && textareaRef.current) {
                                    updateActiveSentence(text, textareaRef.current.selectionStart);
                                }
                            }}
                        />
                        <Languages size={14} />
                        {t('wiki.corpus.wordAssist')}
                    </label>
                )}

                {mode === 'edit' && wordAssist && (
                    <Button 
                        variant={isWaSettingsOpen ? 'imp' : 'default'} 
                        onClick={() => setIsWaSettingsOpen(!isWaSettingsOpen)}
                        style={{ padding: '4px 10px' }}
                        title={t('wiki.corpus.wordAssistSettings')}
                    >
                        <Settings size={16} />
                    </Button>
                )}

                <Button variant="save" onClick={() => onSave(text)}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Save size={16} /> {t('wiki.saveDocument')}</div>
                </Button>
            </div>

            {/* Split Content Area */}
            <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'row', 
                gap: '12px', 
                minHeight: 0, 
                overflow: 'hidden' 
            }}>
                {/* Left Editor Pane */}
                <div style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    minWidth: 0, 
                    background: 'var(--s1)', 
                    borderRadius: '8px', 
                    border: '1px solid var(--bd)',
                    overflowY: 'auto' 
                }}>
                    {mode === 'edit' ? (
                        <textarea 
                            ref={textareaRef}
                            className="custom-font-text notranslate"
                            style={{ 
                                width: '100%', height: '100%', minHeight: '380px', 
                                background: 'transparent', border: 'none', color: 'var(--tx)', 
                                resize: 'none', outline: 'none', fontSize: '1.05rem',
                                padding: '16px',
                                lineHeight: '1.6',
                                boxSizing: 'border-box'
                            }}
                            value={text}
                            onChange={handleTextChange}
                            onSelect={handleSelectOrCursor}
                            onClick={handleSelectOrCursor}
                            onKeyUp={handleSelectOrCursor}
                            placeholder={wordAssist
                                ? t('wiki.corpus.placeholderEnglish')
                                : t('wiki.corpus.placeholderConlang')}
                        />
                    ) : (
                        renderInterlinear()
                    )}
                </div>

                {/* Right Live Translator Pane */}
                {mode === 'edit' && wordAssist && (
                    <div style={{ 
                        width: '380px', 
                        minWidth: '320px', 
                        maxWidth: '45%', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        height: '100%',
                        minHeight: 0
                    }}>
                        <LiveTranslatorPanel
                            analyzer={analyzer}
                            initialSourceText={activeSentence}
                            onInsert={handleInsertTranslation}
                            onClose={() => setWordAssist(false)}
                            onOpenSettings={() => setIsWaSettingsOpen(true)}
                            onOpenAddWord={(missingWordObj) => setWordForAdd(missingWordObj)}
                            syntaxOrder={resolveEffectiveSyntaxOrder(waConfig?.syntaxOrder, syntaxOrder, syntaxOrder)}
                            transliterate={transliterate}
                            lexicon={lexicon}
                            config={config}
                            updateConfig={updateConfig}
                            grammarRules={grammarRules}
                            scriptSystems={config.scriptSystems || []}
                            activeScriptId={config.activeScriptSystemId || 'default'}
                        />
                    </div>
                )}
            </div>

            {/* Settings Modal */}
            <Modal isOpen={isWaSettingsOpen} onClose={() => setIsWaSettingsOpen(false)} title={t('wiki.corpus.wordAssistSettings')}>
                <div style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: '4px' }}>
                    <WordAssistSettingsPanel
                        config={{ ...config, wordAssistConfig: waConfig }}
                        updateConfig={updateConfig}
                        grammarRules={grammarRules}
                        onClose={() => setIsWaSettingsOpen(false)}
                    />
                </div>
            </Modal>

            {/* Quick Add Word to Lexicon Modal */}
            {wordForAdd && (
                <Modal isOpen={!!wordForAdd} onClose={() => setWordForAdd(null)} title={t('lexicon.addWordModalTitle') || 'Add Word to Lexicon'}>
                    <LexiconEditModal 
                        wordObj={wordForAdd} 
                        mode="add" 
                        onClose={() => setWordForAdd(null)} 
                    />
                </Modal>
            )}
        </div>
    );
}



const VALID_WIKI_DIRECTIONS = ['ltr', 'rtl', 'vertical-rl', 'vertical-lr'];

function renderWikiConlangText(rawText, config, lexicon, scriptId) {
    if (!rawText) return '';
    const tokens = String(rawText).split(/(\s+|[.,!?;:()[\]"'«»—–]+)/);
    return tokens.map((token) => {
        if (!token || /^(\s+|[.,!?;:()[\]"'«»—–]+)$/.test(token)) {
            return token;
        }
        const cleanLower = token.replace(/\*/g, '').toLowerCase();
        const entry = lexicon.find(e => e.isPrimary && e.word && e.word.replace(/\*/g, '').toLowerCase() === cleanLower)
            || lexicon.find(e => e.word && e.word.replace(/\*/g, '').toLowerCase() === cleanLower)
            || { word: token };
        return renderWordInScript(entry, config, lexicon, scriptId).text || token;
    }).join('');
}

// The Classic Rich Text Editor - Upgraded to TipTap
function LegacyWikiEditor({ content, onSave }) {
    const { t } = useTranslation();
    const config = useConfigStore(useShallow(state => ({
        scriptSystems: state.scriptSystems,
        activeScriptSystemId: state.activeScriptSystemId,
        alphabeticScript: state.alphabeticScript,
        alphabetNames: state.alphabetNames,
        alphabetGlyphs: state.alphabetGlyphs,
        customGlyphs: state.customGlyphs,
        syllabaryMap: state.syllabaryMap,
        featuralComponents: state.featuralComponents,
        blockSettings: state.blockSettings,
        blockTemplates: state.blockTemplates,
        phonologyTypes: state.phonologyTypes,
        scriptName: state.scriptName,
        scriptRules: state.scriptRules,
        scriptDataById: state.scriptDataById,
        syllabificationAlgorithm: state.syllabificationAlgorithm,
        writingDirection: state.writingDirection,
        typographySettings: state.typographySettings,
        consonants: state.consonants,
        vowels: state.vowels,
        otherPhonemes: state.otherPhonemes,
    })));
    const lexicon = useLexiconStore(state => state.lexicon) || [];
    const resolvedScripts = useMemo(() => repairScriptSystems(config).scriptSystems, [config]);
    
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [iconPickerOpen, setIconPickerOpen] = useState(false);

    // Rich tools state (Images, Doodles, Diagrams)
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [doodleModalOpen, setDoodleModalOpen] = useState(false);
    const [diagramModalOpen, setDiagramModalOpen] = useState(false);
    const [editingDiagramInfo, setEditingDiagramInfo] = useState(null);
    
    // Conlang font insertion state
    const [conlangModalOpen, setConlangModalOpen] = useState(false);
    const [selectedScriptId, setSelectedScriptId] = useState(() => config.activeScriptSystemId || getDefaultScriptId(config));
    const [conlangSourceText, setConlangSourceText] = useState('');
    const [savedConlangSelection, setSavedConlangSelection] = useState(null);

    // Word Assist Live Translator state
    const [wordAssist, setWordAssist] = useState(false);
    const [isWaSettingsOpen, setIsWaSettingsOpen] = useState(false);
    const [wordForAdd, setWordForAdd] = useState(null);
    const [activeSentence, setActiveSentence] = useState('');

    const {
        analyzer,
        config: analyzerConfig,
        transliterate,
        syntaxOrder,
        waConfig,
        updateConfig,
        grammarRules
    } = useConlangAnalyzer();

    const updateActiveSentence = () => {
        if (!editor) return;
        const { from, to } = editor.state.selection;
        if (from !== to) {
            setActiveSentence(editor.state.doc.textBetween(from, to, ' ').trim());
            return;
        }
        const $pos = editor.state.selection.$from;
        setActiveSentence($pos.parent.textContent || '');
    };

    const onSaveRef = useRef(onSave);
    useEffect(() => {
        onSaveRef.current = onSave;
    }, [onSave]);

    // TipTap Editor Setup
    const editor = useEditor({
        extensions: [
            StarterKit,
            Indent,
            TiptapTable.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            TiptapUnderline,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Highlight,
            Subscript,
            Superscript,
            LinkExtension.configure({ openOnClick: false }),
            TextStyle,
            Color,
            ConlangSpan,
            WikiImageNode,
            WikiDiagramNode,
        ],
        content: content || '',
        editorProps: {
            attributes: {
                spellcheck: 'false',
                autocorrect: 'off',
                autocapitalize: 'off',
            }
        },
        onBlur: ({ editor }) => {
            if (editor && !editor.isDestroyed && onSaveRef.current) {
                onSaveRef.current(editor.getHTML());
            }
        },
        onSelectionUpdate: ({ editor: ed }) => {
            const { from, to } = ed.state.selection;
            if (from !== to) {
                setActiveSentence(ed.state.doc.textBetween(from, to, ' ').trim());
            } else {
                setActiveSentence(ed.state.selection.$from.parent.textContent || '');
            }
        }
    });

    // Update content when prop changes from outside (e.g. changing notebook)
    useEffect(() => {
        if (editor && !editor.isDestroyed && content !== editor.getHTML()) {
            editor.commands.setContent(content || '');
        }
    }, [content, editor]);

    // Cleanup on unmount (save state as a safety net)
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (editor && !editor.isDestroyed && onSaveRef.current) onSaveRef.current(editor.getHTML());
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (editor && !editor.isDestroyed && onSaveRef.current) onSaveRef.current(editor.getHTML());
        };
    }, [editor]);

    // Handle interactive in-document diagram edit requests
    useEffect(() => {
        const handleEditDiagram = (e) => {
            if (e.detail) {
                setEditingDiagramInfo(e.detail);
                setDiagramModalOpen(true);
            }
        };
        window.addEventListener('edit-wiki-diagram', handleEditDiagram);
        return () => {
            window.removeEventListener('edit-wiki-diagram', handleEditDiagram);
        };
    }, []);

    const activeConlangScript = useMemo(() => {
        const cfgWithScripts = { ...config, scriptSystems: resolvedScripts };
        return getScriptSystem(cfgWithScripts, selectedScriptId);
    }, [config, resolvedScripts, selectedScriptId]);

    const autoScriptDirection = useMemo(() => {
        const rawDir = activeConlangScript?.writingDirection || config.writingDirection || 'ltr';
        return VALID_WIKI_DIRECTIONS.includes(rawDir) ? rawDir : 'ltr';
    }, [activeConlangScript, config.writingDirection]);

    const conlangPreviewText = useMemo(() => {
        if (!conlangModalOpen || !conlangSourceText.trim()) return '';
        const cfgWithScripts = { ...config, scriptSystems: resolvedScripts };
        return renderWikiConlangText(conlangSourceText, cfgWithScripts, lexicon, selectedScriptId);
    }, [conlangModalOpen, conlangSourceText, config, resolvedScripts, lexicon, selectedScriptId]);

    if (!editor) {
        return null;
    }

    const setLink = () => {
        if (linkUrl) {
            const safeHref = sanitizeUrl(linkUrl);
            if (!safeHref) return;
            editor.chain().focus().extendMarkRange('link').setLink({ href: safeHref }).run();
        }
        setLinkUrl('');
        setLinkModalOpen(false);
    };

    const insertIcon = (iconName) => {
        const IconComponent = icons[iconName];
        if (IconComponent) {
            const svgString = renderToStaticMarkup(<IconComponent size={20} color="currentColor" style={{ verticalAlign: 'middle', margin: '0 4px', display: 'inline-block' }} />);
            const html = `<span class="wiki-inline-icon" contenteditable="false">${svgString}</span>&#8203;`;
            editor.commands.insertContent(html);
        }
        setIconPickerOpen(false);
    };

    const handleConlangBtnClick = () => {
        if (!editor) return;
        const { from, to } = editor.state.selection;
        setSavedConlangSelection({ from, to });
        const selected = from !== to ? editor.state.doc.textBetween(from, to, ' ') : '';
        setConlangSourceText(selected);

        const preferredId = config.activeScriptSystemId && resolvedScripts.some(s => s.id === config.activeScriptSystemId)
            ? config.activeScriptSystemId
            : (resolvedScripts.some(s => s.id === selectedScriptId) ? selectedScriptId : (resolvedScripts[0]?.id || getDefaultScriptId(config)));
        setSelectedScriptId(preferredId);
        setConlangModalOpen(true);
    };

    const applyConlangFontWithOptions = () => {
        if (!editor) return;
        const sourceText = conlangSourceText.trim();
        if (!sourceText) {
            setConlangModalOpen(false);
            return;
        }

        const cfgWithScripts = { ...config, scriptSystems: resolvedScripts };
        const rendered = renderWikiConlangText(conlangSourceText, cfgWithScripts, lexicon, selectedScriptId);
        const safeScriptId = String(selectedScriptId || 'default').replace(/[^a-zA-Z0-9_-]/g, '');
        const isVertical = autoScriptDirection.startsWith('vertical');
        const isRtl = autoScriptDirection === 'rtl';
        const isFeatural = activeConlangScript?.type === 'featural_block';

        let inlineStyle = 'color: var(--acc); font-weight: bold;';
        if (isVertical) {
            inlineStyle += ` writing-mode: ${autoScriptDirection}; text-orientation: upright; display: inline-block; vertical-align: middle; line-height: 1.45; padding: 0.2rem 0.35rem;`;
        } else if (isRtl) {
            inlineStyle += ' writing-mode: horizontal-tb; direction: rtl; unicode-bidi: isolate;';
        } else {
            inlineStyle += ' writing-mode: horizontal-tb; direction: ltr;';
        }

        const html = `<span class="custom-font-text notranslate conlang-script-${safeScriptId}${isFeatural ? ' featural-block-render' : ''}" data-script-id="${safeScriptId}" data-writing-direction="${autoScriptDirection}" style="${inlineStyle}">${escapeHtml(rendered)}</span>`;

        const chain = editor.chain().focus();
        if (savedConlangSelection && typeof savedConlangSelection.from === 'number') {
            chain.setTextSelection(savedConlangSelection);
        }
        chain.insertContent(html).run();
        setSavedConlangSelection(null);
        setConlangModalOpen(false);
    };

    const handleInsertImage = ({ src, caption, alt, align, width }) => {
        if (!editor) return;
        const figureAttrs = `class="wiki-figure wiki-align-${align}" data-type="wiki-image" data-align="${align}" data-width="${width}" data-caption="${caption || ''}"`;
        const styleAttr = width && width !== '100%' ? `style="max-width: ${width};"` : '';
        let html = `<figure ${figureAttrs}><img src="${src}" alt="${alt || caption || 'Conlang illustration'}" class="wiki-image-element" ${styleAttr} />`;
        if (caption) {
            html += `<figcaption class="wiki-figcaption">${caption}</figcaption>`;
        }
        html += `</figure><p></p>`;
        editor.chain().focus().insertContent(html).run();
    };

    const handleInsertDiagram = ({ diagramType, title, sourceData, svg, width, align }) => {
        if (!editor) return;
        const diagramWidth = width || '100%';
        const diagramAlign = align || 'center';

        if (editingDiagramInfo && editingDiagramInfo.pos !== null && editingDiagramInfo.pos !== undefined) {
            try {
                const node = editor.state.doc.nodeAt(editingDiagramInfo.pos);
                if (node && node.type.name === 'wikiDiagram') {
                    editor.chain().focus().setNodeSelection(editingDiagramInfo.pos).updateAttributes('wikiDiagram', {
                        diagramType,
                        title,
                        sourceData,
                        svg,
                        width: diagramWidth,
                        align: diagramAlign
                    }).run();
                    setEditingDiagramInfo(null);
                    return;
                }
            } catch (err) {
                console.warn('Fallback inserting updated diagram:', err);
            }
        }

        const svgDataUri = svg ? (svg.startsWith('data:') ? svg : `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`) : '';
        const safeSource = (sourceData || '').replace(/'/g, "&apos;");
        const safeSvg = (svg || '').replace(/'/g, "&apos;");
        const styleAttr = diagramWidth && diagramWidth !== '100%' ? `style="max-width: ${diagramWidth}; width: ${diagramWidth};"` : '';

        const html = `
        <figure class="wiki-diagram-figure wiki-align-${diagramAlign}" data-type="wiki-diagram" data-diagram-type="${diagramType}" data-diagram-title="${title}" data-diagram-source='${safeSource}' data-svg='${safeSvg}' data-width="${diagramWidth}" data-align="${diagramAlign}" ${styleAttr}>
            <div class="wiki-diagram-header" contenteditable="false">
                <span class="wiki-diagram-type-pill">${diagramType.toUpperCase()}</span>
                <span class="wiki-diagram-title-text">${title}</span>
            </div>
            <div class="wiki-diagram-preview" contenteditable="false">
                <img src="${svgDataUri}" alt="${title}" class="wiki-diagram-img" />
            </div>
            <figcaption class="wiki-diagram-caption">${title}</figcaption>
        </figure>
        <p></p>
        `;
        editor.chain().focus().insertContent(html).run();
        setEditingDiagramInfo(null);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="wiki-toolbar" style={{ flexWrap: 'wrap', gap: '4px' }}>
                {/* History */}
                <button className="wiki-tool-btn" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title={t('wiki.richText.undo')}><Undo size={16} /></button>
                <button className="wiki-tool-btn" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title={t('wiki.richText.redo')}><Redo size={16} /></button>
                <div style={{ width: '1px', background: 'var(--bd)', margin: '0 5px', height: '24px' }}></div>
                
                {/* Text Formatting */}
                <button className={`wiki-tool-btn ${editor.isActive('bold') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleBold().run()} title={t('wiki.richText.bold')}><Bold size={16} /></button>
                <button className={`wiki-tool-btn ${editor.isActive('italic') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleItalic().run()} title={t('wiki.richText.italic')}><Italic size={16} /></button>
                <button className={`wiki-tool-btn ${editor.isActive('underline') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleUnderline().run()} title={t('wiki.richText.underline')}><UnderlineIcon size={16} /></button>
                <button className={`wiki-tool-btn ${editor.isActive('strike') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleStrike().run()} title={t('wiki.richText.strikethrough')}><Strikethrough size={16} /></button>
                <button className={`wiki-tool-btn ${editor.isActive('highlight') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleHighlight().run()} title={t('wiki.richText.highlight')}><Highlighter size={16} /></button>
                <button className="wiki-tool-btn" onClick={() => editor.chain().focus().unsetAllMarks().run()} title={t('wiki.richText.clearFormatting')}><Eraser size={16} /></button>
                <div style={{ width: '1px', background: 'var(--bd)', margin: '0 5px', height: '24px' }}></div>
                
                {/* Alignment */}
                <button className={`wiki-tool-btn ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`} onClick={() => editor.chain().focus().setTextAlign('left').run()} title={t('wiki.richText.alignLeft')}><AlignLeft size={16} /></button>
                <button className={`wiki-tool-btn ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`} onClick={() => editor.chain().focus().setTextAlign('center').run()} title={t('wiki.richText.alignCenter')}><AlignCenter size={16} /></button>
                <button className={`wiki-tool-btn ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`} onClick={() => editor.chain().focus().setTextAlign('right').run()} title={t('wiki.richText.alignRight')}><AlignRight size={16} /></button>
                <button className={`wiki-tool-btn ${editor.isActive({ textAlign: 'justify' }) ? 'active' : ''}`} onClick={() => editor.chain().focus().setTextAlign('justify').run()} title={t('wiki.richText.justify')}><AlignJustify size={16} /></button>
                <div style={{ width: '1px', background: 'var(--bd)', margin: '0 5px', height: '24px' }}></div>
                
                {/* Headings */}
                <button className={`wiki-tool-btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title={t('wiki.richText.heading1')}><Heading1 size={16} /></button>
                <button className={`wiki-tool-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title={t('wiki.richText.heading2')}><Heading2 size={16} /></button>
                <button className={`wiki-tool-btn ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title={t('wiki.richText.heading3')}><Heading3 size={16} /></button>
                
                {/* Lists, Indentation & Quotes */}
                <button className={`wiki-tool-btn ${editor.isActive('bulletList') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleBulletList().run()} title={t('wiki.richText.bulletList')}><List size={16} /></button>
                <button className={`wiki-tool-btn ${editor.isActive('orderedList') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleOrderedList().run()} title={t('wiki.richText.orderedList')}><ListOrdered size={16} /></button>
                <button className="wiki-tool-btn" onClick={() => editor.chain().focus().outdent().run()} disabled={!editor.can().outdent()} title={`${t('wiki.richText.outdent')} (Shift+Tab)`}><OutdentIcon size={16} /></button>
                <button className="wiki-tool-btn" onClick={() => editor.chain().focus().indent().run()} disabled={!editor.can().indent()} title={`${t('wiki.richText.indent')} (Tab)`}><IndentIcon size={16} /></button>
                <button className={`wiki-tool-btn ${editor.isActive('blockquote') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleBlockquote().run()} title={t('wiki.richText.quote')}><Quote size={16} /></button>
                <div style={{ width: '1px', background: 'var(--bd)', margin: '0 5px', height: '24px' }}></div>
                
                {/* Sub/Superscript */}
                <button className={`wiki-tool-btn ${editor.isActive('subscript') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleSubscript().run()} title={t('wiki.richText.subscript')}><SubscriptIcon size={16} /></button>
                <button className={`wiki-tool-btn ${editor.isActive('superscript') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleSuperscript().run()} title={t('wiki.richText.superscript')}><SuperscriptIcon size={16} /></button>
                
                {/* Inserts */}
                <button className="wiki-tool-btn" onClick={() => setIconPickerOpen(true)} title={t('wiki.richText.insertIcon')}><Smile size={16} /></button>
                <button className={`wiki-tool-btn ${editor.isActive('link') ? 'active' : ''}`} onClick={() => setLinkModalOpen(true)} title={t('wiki.richText.insertLink')}><Link size={16} /></button>
                <button className="wiki-tool-btn" onClick={() => setImageModalOpen(true)} title={t('wiki.richText.insertImage')}><ImageIcon size={16} /></button>
                <button className="wiki-tool-btn" onClick={() => setDoodleModalOpen(true)} title={t('wiki.richText.doodleTool')}><PenTool size={16} /></button>
                <button className="wiki-tool-btn" onClick={() => { setEditingDiagramInfo(null); setDiagramModalOpen(true); }} title={t('wiki.richText.diagramTool')}><GitBranch size={16} /></button>
                <button className="wiki-tool-btn" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title={t('wiki.richText.insertTable')}><TableIcon size={16} /></button>

                <div style={{ width: '1px', background: 'var(--bd)', margin: '0 5px', height: '24px' }}></div>

                <button className="wiki-tool-btn" title={t('wiki.richText.formatConlang')} onClick={handleConlangBtnClick}><Type size={16} /> <span style={{fontSize: '0.7rem', marginLeft: '4px', fontWeight: 'bold'}}>{t('wiki.richText.conlangBadge')}</span></button>
                <button 
                    className={`wiki-tool-btn ${wordAssist ? 'active' : ''}`} 
                    title={t('wiki.corpus.wordAssistTooltip') || t('wiki.corpus.wordAssist') || 'Word Assist'} 
                    onClick={() => {
                        const next = !wordAssist;
                        setWordAssist(next);
                        if (next) updateActiveSentence();
                    }}
                >
                    <Languages size={16} /> <span style={{ fontSize: '0.7rem', marginLeft: '4px', fontWeight: 'bold' }}>{t('wiki.corpus.wordAssist') || 'Word Assist'}</span>
                </button>
                
                <div style={{ flex: 1 }}></div>
                <Button variant="save" onClick={() => onSave(editor.getHTML())}><div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Save size={16} /> {t('wiki.saveDocument')}</div></Button>
            </div>
            
            {/* Table Toolbar (Contextual - Only visible when inside an active table) */}
            {editor.can().deleteTable() && (
                <div className="wiki-table-context-toolbar">
                    <span style={{ fontSize: '0.75rem', color: 'var(--tx2)', margin: '0 8px', fontWeight: 'bold' }}>{t('wiki.richText.table')}</span>
                    <button className="wiki-tool-btn" onClick={() => editor.chain().focus().addColumnBefore().run()} title={t('wiki.richText.addColumnBefore')}><ArrowLeftFromLine size={14} /></button>
                    <button className="wiki-tool-btn" onClick={() => editor.chain().focus().addColumnAfter().run()} title={t('wiki.richText.addColumnAfter')}><ArrowRightFromLine size={14} /></button>
                    <button className="wiki-tool-btn" onClick={() => editor.chain().focus().deleteColumn().run()} title={t('wiki.richText.deleteColumn')} style={{ color: '#f87171' }}><Columns size={14} /></button>
                    <div style={{ width: '1px', background: 'var(--bd)', margin: '0 5px', height: '20px' }}></div>
                    <button className="wiki-tool-btn" onClick={() => editor.chain().focus().addRowBefore().run()} title={t('wiki.richText.addRowBefore')}><ArrowUpFromLine size={14} /></button>
                    <button className="wiki-tool-btn" onClick={() => editor.chain().focus().addRowAfter().run()} title={t('wiki.richText.addRowAfter')}><ArrowDownFromLine size={14} /></button>
                    <button className="wiki-tool-btn" onClick={() => editor.chain().focus().deleteRow().run()} title={t('wiki.richText.deleteRow')} style={{ color: '#f87171' }}><Rows size={14} /></button>
                    <div style={{ width: '1px', background: 'var(--bd)', margin: '0 5px', height: '20px' }}></div>
                    <button className="wiki-tool-btn" onClick={() => editor.chain().focus().mergeCells().run()} title={t('wiki.richText.mergeCells')}>{t('wiki.richText.mergeCells')}</button>
                    <button className="wiki-tool-btn" onClick={() => editor.chain().focus().splitCell().run()} title={t('wiki.richText.splitCell')}>{t('wiki.richText.splitCell')}</button>
                    <button className="wiki-tool-btn" onClick={() => editor.chain().focus().toggleHeaderRow().run()} title={t('wiki.richText.toggleHeaderRow')}>{t('wiki.richText.toggleHeaderRow')}</button>
                    <div style={{ width: '1px', background: 'var(--bd)', margin: '0 5px', height: '20px' }}></div>
                    <button className="wiki-tool-btn" onClick={() => editor.chain().focus().deleteTable().run()} title={t('wiki.richText.deleteTable')} style={{ color: '#f87171' }}><Trash2 size={14} /></button>
                </div>
            )}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', minHeight: 0, gap: '12px', overflow: 'hidden' }}>
                <div className="wiki-editor-container" style={{ flex: 1, overflow: 'auto', padding: '0', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <EditorContent 
                        editor={editor} 
                        className="wiki-editor-tiptap"
                        spellCheck={false}
                    />
                </div>

                {wordAssist && (
                    <div style={{ width: '380px', minWidth: '320px', maxWidth: '45%', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                        <LiveTranslatorPanel
                            analyzer={analyzer}
                            initialSourceText={activeSentence}
                            onInsert={(insertedText) => editor.commands.insertContent(insertedText)}
                            onClose={() => setWordAssist(false)}
                            onOpenSettings={() => setIsWaSettingsOpen(true)}
                            onOpenAddWord={(missingWordObj) => setWordForAdd(missingWordObj)}
                            syntaxOrder={resolveEffectiveSyntaxOrder(waConfig?.syntaxOrder, syntaxOrder, syntaxOrder)}
                            transliterate={transliterate}
                            lexicon={lexicon}
                            config={{ ...config, ...analyzerConfig }}
                            updateConfig={updateConfig}
                            grammarRules={grammarRules}
                            scriptSystems={resolvedScripts}
                            activeScriptId={config.activeScriptSystemId || 'default'}
                        />
                    </div>
                )}
            </div>

            <Modal isOpen={linkModalOpen} onClose={() => setLinkModalOpen(false)} title={t('wiki.richText.insertLink')}>
                <Input label={t('wiki.richText.targetUrl')} value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." autoFocus />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <Button variant="imp" onClick={setLink}>{t('wiki.richText.insertBtn')}</Button>
                </div>
            </Modal>

            <WikiImageModal 
                isOpen={imageModalOpen} 
                onClose={() => setImageModalOpen(false)} 
                onInsert={handleInsertImage}
                t={t}
            />

            <WikiDoodleModal 
                isOpen={doodleModalOpen} 
                onClose={() => setDoodleModalOpen(false)} 
                onInsert={handleInsertImage}
                t={t}
            />

            <WikiDiagramModal 
                isOpen={diagramModalOpen} 
                onClose={() => {
                    setDiagramModalOpen(false);
                    setEditingDiagramInfo(null);
                }} 
                onInsert={handleInsertDiagram}
                initialData={editingDiagramInfo}
                t={t}
            />

            <Modal isOpen={iconPickerOpen} onClose={() => setIconPickerOpen(false)} title={t('wiki.richText.insertIcon')}>
                <div className="icon-picker-grid">
                    {PREDEFINED_ICONS.map(iconName => {
                        const IconComponent = icons[iconName];
                        if (!IconComponent) return null;
                        return (
                            <button 
                                key={iconName} 
                                className="icon-picker-btn" 
                                title={iconName}
                                onClick={() => insertIcon(iconName)}
                            >
                                <IconComponent size={24} />
                            </button>
                        );
                    })}
                </div>
            </Modal>

            <Modal
                isOpen={conlangModalOpen}
                onClose={() => setConlangModalOpen(false)}
                title={t('wiki.richText.conlangModalTitle')}
                maxWidth="440px"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '10px' }}>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '5px', display: 'block' }}>
                            {t('wiki.richText.formatConlang')}
                        </label>
                        <input
                            type="text"
                            className="fi"
                            style={{ width: '100%' }}
                            placeholder="Type or select text to write in conlang..."
                            value={conlangSourceText}
                            onChange={(e) => setConlangSourceText(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '5px', display: 'block' }}>{t('wiki.richText.targetScript')}</label>
                        <select 
                            className="select select-bordered w-full"
                            style={{ height: '42px' }}
                            value={selectedScriptId}
                            onChange={(e) => setSelectedScriptId(e.target.value)}
                        >
                            {resolvedScripts.map(sys => (
                                <option key={sys.id} value={sys.id}>
                                    {sys.name} ({sys.type || 'alphabetic'})
                                </option>
                            ))}
                        </select>
                        <div style={{ fontSize: '0.75rem', color: 'var(--tx2)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{t('wiki.richText.writingDirection')}:</span>
                            <span style={{ padding: '2px 8px', borderRadius: '999px', background: 'var(--s2)', border: '1px solid var(--bd)', color: 'var(--tx)', fontWeight: 600 }}>
                                {autoScriptDirection === 'vertical-rl' ? 'Vertical (↓→)' : autoScriptDirection === 'vertical-lr' ? 'Vertical (↓←)' : autoScriptDirection === 'rtl' ? 'Right to Left (←)' : 'Horizontal (→)'}
                            </span>
                        </div>
                    </div>
                    {conlangPreviewText && (
                        <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--s2)', border: '1px solid var(--bd)', minHeight: '54px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <span
                                className={`custom-font-text notranslate conlang-script-${String(selectedScriptId || 'default').replace(/[^a-zA-Z0-9_-]/g, '')}${activeConlangScript?.type === 'featural_block' ? ' featural-block-render' : ''}`}
                                data-script-id={selectedScriptId}
                                data-writing-direction={autoScriptDirection}
                                style={{
                                    color: 'var(--acc)',
                                    fontSize: activeConlangScript?.type === 'featural_block' ? '2.2rem' : '1.4rem',
                                    fontWeight: 'bold',
                                    writingMode: autoScriptDirection.startsWith('vertical') ? autoScriptDirection : 'horizontal-tb',
                                    direction: autoScriptDirection === 'rtl' ? 'rtl' : 'ltr',
                                    textOrientation: autoScriptDirection.startsWith('vertical') ? 'upright' : undefined,
                                    maxHeight: '10rem',
                                }}
                            >
                                {conlangPreviewText}
                            </span>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                        <Button variant="ghost" onClick={() => setConlangModalOpen(false)}>{t('wiki.richText.cancel')}</Button>
                        <Button variant="imp" onClick={applyConlangFontWithOptions} disabled={!conlangSourceText.trim()}>{t('wiki.richText.apply')}</Button>
                    </div>
                </div>
            </Modal>

            {/* Word Assist Settings Modal */}
            <Modal isOpen={isWaSettingsOpen} onClose={() => setIsWaSettingsOpen(false)} title={t('wiki.corpus.wordAssistSettings')}>
                <div style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: '4px' }}>
                    <WordAssistSettingsPanel
                        config={{ ...analyzerConfig, wordAssistConfig: waConfig }}
                        updateConfig={updateConfig}
                        grammarRules={grammarRules}
                        onClose={() => setIsWaSettingsOpen(false)}
                    />
                </div>
            </Modal>

            {/* Quick Add Word to Lexicon Modal */}
            {wordForAdd && (
                <Modal isOpen={!!wordForAdd} onClose={() => setWordForAdd(null)} title={t('lexicon.addWordModalTitle') || 'Add Word to Lexicon'}>
                    <LexiconEditModal 
                        wordObj={wordForAdd} 
                        mode="add" 
                        onClose={() => setWordForAdd(null)} 
                    />
                </Modal>
            )}
        </div>
    );
}

export default function WikiTab() {
    const { t } = useTranslation();
    const wikiPages = useConfigStore((state) => state.wikiPages) || {};
    const saveWikiPage = useConfigStore((state) => state.saveWikiPage);
    const addWikiPage = useConfigStore((state) => state.addWikiPage);
    const deleteWikiPage = useConfigStore((state) => state.deleteWikiPage);
    const reorderWikiPage = useConfigStore((state) => state.reorderWikiPage);
    const moveWikiPage = useConfigStore((state) => state.moveWikiPage);
    const updateWikiPageMetadata = useConfigStore((state) => state.updateWikiPageMetadata);
    const writingDirection = useConfigStore(state => state.writingDirection);

    const [selectedPageId, setSelectedPageId] = useState(() => {
        const keys = Object.keys(wikiPages);
        const firstDoc = keys.find(k => typeof wikiPages[k] !== 'object' || wikiPages[k].type !== 'notebook');
        return firstDoc || null;
    });
    const setCurrentPageId = setSelectedPageId;
    const currentPageId = (selectedPageId && wikiPages[selectedPageId])
        ? selectedPageId
        : (Object.keys(wikiPages).find(k => typeof wikiPages[k] !== 'object' || wikiPages[k].type !== 'notebook') || null);
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

    const rootItems = Object.keys(wikiPages)
        .filter(k => {
            const p = wikiPages[k];
            const pId = typeof p === 'object' ? p.parentId : null;
            return pId === 'root' || pId === null || pId === undefined;
        })
        .sort((a, b) => {
            const orderA = typeof wikiPages[a] === 'object' && wikiPages[a].order !== undefined ? wikiPages[a].order : 0;
            const orderB = typeof wikiPages[b] === 'object' && wikiPages[b].order !== undefined ? wikiPages[b].order : 0;
            return orderA - orderB;
        });

    const getChildren = (notebookId) => {
        return Object.keys(wikiPages).filter(k => {
            const p = wikiPages[k];
            return p && typeof p === 'object' && p.parentId === notebookId;
        }).sort((a, b) => {
            const orderA = typeof wikiPages[a] === 'object' && wikiPages[a].order !== undefined ? wikiPages[a].order : 0;
            const orderB = typeof wikiPages[b] === 'object' && wikiPages[b].order !== undefined ? wikiPages[b].order : 0;
            return orderA - orderB;
        });
    };

    const toggleNotebook = (notebookId, e) => {
        e.stopPropagation();
        setExpandedNotebooks(prev => ({ ...prev, [notebookId]: !prev[notebookId] }));
    };

    const handleCreatePage = () => {
        try {
            if (!newPageTitle.trim()) {
                alert(t('wiki.alerts.titleRequired'));
                return;
            }
            const pageId = crypto.randomUUID();
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
            alert(t('wiki.alerts.createError') + err.message);
        }
    };

    const handleDeletePage = (pageId, e) => {
        e.stopPropagation();
        const p = wikiPages[pageId];
        const isNotebook = p && typeof p === 'object' && p.type === 'notebook';
        const msg = isNotebook 
            ? t('wiki.alerts.deleteNotebookConfirm') 
            : t('wiki.alerts.deleteDocConfirm');
            
        if (!window.confirm(msg)) return;
        
        // If the current page is deleted (or is a child of the deleted notebook), reset it first
        if (currentPageId === pageId || (wikiPages[currentPageId] && wikiPages[currentPageId].parentId === pageId)) {
            const remainingPages = Object.keys(wikiPages).filter(id => id !== pageId && (!wikiPages[id].parentId || wikiPages[id].parentId !== pageId));
            const firstDoc = remainingPages.find(k => typeof wikiPages[k] !== 'object' || wikiPages[k].type !== 'notebook');
            setCurrentPageId(firstDoc || null);
            if (firstDoc && wikiPages[firstDoc] && typeof wikiPages[firstDoc] === 'object' && wikiPages[firstDoc].parentId) {
                setExpandedNotebooks(prev => ({ ...prev, [wikiPages[firstDoc].parentId]: true }));
            }
        }

        deleteWikiPage(pageId);
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
            alert(t('wiki.alerts.titleRequired'));
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
                    <button className="wiki-del-btn" title={t('wiki.moveUp')} onClick={(e) => { e.stopPropagation(); reorderWikiPage(pageId, 'up'); }}><ChevronUp size={14} /></button>
                    <button className="wiki-del-btn" title={t('wiki.moveDown')} onClick={(e) => { e.stopPropagation(); reorderWikiPage(pageId, 'down'); }}><ChevronDown size={14} /></button>
                    
                    <button className="wiki-del-btn" title={t('wiki.editDetails')} onClick={(e) => handleOpenEdit(pageId, e)}><Edit2 size={14} /></button>
                    <button className="wiki-del-btn" title={t('wiki.delete')} onClick={(e) => handleDeletePage(pageId, e)}><Trash2 size={14} /></button>
                </div>
            </div>
        );
    };

    const currentPage = currentPageId ? wikiPages[currentPageId] : null;
    const isCorpus = currentPage && typeof currentPage === 'object' && currentPage.type === 'corpus';
    const content = (currentPage && typeof currentPage === 'object') ? currentPage.content : currentPage;
    const notebooks = Object.keys(wikiPages).filter(k => wikiPages[k] && typeof wikiPages[k] === 'object' && wikiPages[k].type === 'notebook');

    return (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <Card style={{ flex: '1', minWidth: '260px', maxWidth: '320px' }}>
                <h2 className='flex sg-title' style={{ marginBottom: '15px' }}><Book /> {t('wiki.title')}</h2>
                <Button variant="imp" style={{ width: '100%', marginBottom: '20px' }} onClick={() => setIsCreateModalOpen(true)}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Plus size={18} /> {t('wiki.newDocument')}
                    </div>
                </Button>

                <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '500px', overflowY: 'auto', paddingRight: '5px' }}>
                    {Object.keys(wikiPages).length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--tx3)', fontStyle: 'italic', marginTop: '20px' }}>{t('wiki.noDocumentsYet')}</p>
                    ) : (
                        <>
                            {rootItems.map(itemId => {
                                const p = wikiPages[itemId];
                                const isNotebook = p && typeof p === 'object' && p.type === 'notebook';

                                if (isNotebook) {
                                    const nbId = itemId;
                                    const nb = p;
                                    const isExpanded = expandedNotebooks[nbId];
                                    const children = getChildren(nbId);
                                    const NbIcon = nb.icon && icons[nb.icon] ? icons[nb.icon] : (isExpanded ? FolderOpen : Folder);
                                    
                                    return (
                                        <div key={nbId} className="wiki-notebook-container">
                                            <div
                                                className="wiki-notebook-header"
                                                role="button"
                                                tabIndex={0}
                                                onClick={(e) => toggleNotebook(nbId, e)}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleNotebook(nbId, e); } }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                                    <div style={{ flexShrink: 0, display: 'flex', color: 'var(--acc)' }}>
                                                        <NbIcon size={16} />
                                                    </div>
                                                    <span style={{ fontWeight: 'bold', color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nb.title}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }} className="wiki-item-controls">
                                                    <button className="wiki-del-btn" title={t('wiki.moveUp')} onClick={(e) => { e.stopPropagation(); reorderWikiPage(nbId, 'up'); }}><ChevronUp size={14} /></button>
                                                    <button className="wiki-del-btn" title={t('wiki.moveDown')} onClick={(e) => { e.stopPropagation(); reorderWikiPage(nbId, 'down'); }}><ChevronDown size={14} /></button>
                                                    <button className="wiki-del-btn" title={t('wiki.editNotebook')} onClick={(e) => handleOpenEdit(nbId, e)}><Edit2 size={14} /></button>
                                                    <button className="wiki-del-btn" title={t('wiki.delete')} onClick={(e) => handleDeletePage(nbId, e)}><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                            {isExpanded && (
                                                <div className="wiki-notebook-children">
                                                    {children.length === 0 && <div style={{ padding: '8px 20px', fontSize: '0.8rem', color: 'var(--tx3)', fontStyle: 'italic', borderLeft: '2px solid var(--bd)', marginLeft: '12px' }}>{t('wiki.emptyNotebook')}</div>}
                                                    {children.map(childId => renderPageItem(childId, true))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                } else {
                                    return renderPageItem(itemId, false);
                                }
                            })}
                        </>
                    )}
                </div>
            </Card>

            <Card style={{ flex: '3', minWidth: '300px' }}>
                {currentPageId && wikiPages[currentPageId] ? (
                    isCorpus ? (
                        <CorpusEditor 
                            key={currentPageId}
                            content={content} 
                            writingDirection={writingDirection}
                            onSave={(val) => {
                                if (useConfigStore.getState().wikiPages?.[currentPageId]) {
                                    saveWikiPage(currentPageId, val);
                                }
                            }} 
                        />
                    ) : (
                        <LegacyWikiEditor 
                            key={currentPageId}
                            content={content} 
                            onSave={(val) => {
                                if (useConfigStore.getState().wikiPages?.[currentPageId]) {
                                    saveWikiPage(currentPageId, val);
                                }
                            }} 
                        />
                    )
                ) : (
                    <div style={{ textAlign: 'center', color: 'var(--tx3)', padding: '50px 0' }}>
                        <Book size={48} style={{ opacity: 0.2, marginBottom: '15px' }} />
                        <h3>{t('wiki.selectDocToStart')}</h3>
                    </div>
                )}
            </Card>

            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title={t('wiki.createModal.title')}>
                <Input label={t('wiki.createModal.docTitle')} value={newPageTitle} onChange={(e) => setNewPageTitle(e.target.value)} placeholder={t('wiki.createModal.docTitlePlaceholder')} autoFocus />
                
                <div style={{ marginTop: '20px' }}>
                    <label className="form-label">{t('wiki.createModal.docType')}</label>
                    <select 
                        className="fi" 
                        value={newPageType}
                        onChange={(e) => setNewPageType(e.target.value)}
                        style={{ width: '100%', padding: '10px', background: 'var(--s1)', color: 'var(--tx)', border: '1px solid var(--bd)', borderRadius: '6px' }}
                    >
                        <option value="wiki">{t('wiki.createModal.typeWiki')}</option>
                        <option value="corpus">{t('wiki.createModal.typeCorpus')}</option>
                        <option value="notebook">{t('wiki.createModal.typeNotebook')}</option>
                    </select>
                </div>

                {newPageType !== 'notebook' && notebooks.length > 0 && (
                    <div style={{ marginTop: '20px' }}>
                        <label className="form-label">{t('wiki.createModal.location')}</label>
                        <select 
                            className="fi" 
                            value={newPageParentId}
                            onChange={(e) => setNewPageParentId(e.target.value)}
                            style={{ width: '100%', padding: '10px', background: 'var(--s1)', color: 'var(--tx)', border: '1px solid var(--bd)', borderRadius: '6px' }}
                        >
                            <option value="root">{t('wiki.createModal.rootLibrary')}</option>
                            {notebooks.map(nb => (
                                <option key={nb} value={nb}>{wikiPages[nb].title}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}><Button variant="imp" onClick={handleCreatePage}>{t('wiki.createModal.createBtn')}</Button></div>
            </Modal>

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={t('wiki.editModal.title')}>
                <Input label={t('wiki.editModal.titleField')} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder={t('wiki.editModal.titlePlaceholder')} autoFocus />
                
                <div style={{ marginTop: '20px' }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{t('wiki.editModal.chooseIcon')}</span>
                        {editIcon && (
                            <span 
                                style={{ color: 'var(--acc)', cursor: 'pointer', fontSize: '0.8rem' }} 
                                onClick={() => setEditIcon('')}
                            >
                                {t('wiki.editModal.clearIcon')}
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
                        <label className="form-label">{t('wiki.editModal.location')}</label>
                        <select 
                            className="fi" 
                            value={editParentId}
                            onChange={(e) => setEditParentId(e.target.value)}
                            style={{ width: '100%', padding: '10px', background: 'var(--s1)', color: 'var(--tx)', border: '1px solid var(--bd)', borderRadius: '6px' }}
                        >
                            <option value="root">{t('wiki.editModal.rootLibrary')}</option>
                            {notebooks.map(nb => (
                                <option key={nb} value={nb}>{wikiPages[nb].title}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <Button variant="imp" onClick={handleSaveEdit}>{t('wiki.editModal.saveBtn')}</Button>
                </div>
            </Modal>
        </div>
    );
}

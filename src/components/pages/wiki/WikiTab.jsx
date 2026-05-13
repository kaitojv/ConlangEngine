import React, { useState, useEffect, useRef, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import Card from '@/components/UI/Card/Card.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import Modal from '@/components/UI/Modal/Modal.jsx';
import { Book, Plus, Trash2, Bold, Italic, Underline, Link, Save, Type, Languages, FileText } from 'lucide-react';
import { applyRuleToWord } from '@/utils/morphologyEngine.jsx';
import './wikiTab.css';

// The new Interlinear Editor Component
function CorpusEditor({ content, onSave, writingDirection }) {
    const [mode, setMode] = useState('edit');
    const [text, setText] = useState(content || '');
    const [wordAssist, setWordAssist] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [activeSuggIdx, setActiveSuggIdx] = useState(0);
    const [draggedChip, setDraggedChip] = useState(null); // { suggIdx, chipIdx }
    const [showWaTip, setShowWaTip] = useState(true);
    const [wordRange, setWordRange] = useState(null); // { start, end } of current word in text
    const textareaRef = useRef(null);

    const lexicon = useLexiconStore((state) => state.lexicon);
    const { transliterate } = useTransliterator();
    const personRulesStr = useConfigStore(state => state.personRules) || "";
    const grammarRules   = useConfigStore(state => state.grammarRules) || [];
    const syntaxOrder    = useConfigStore(state => state.syntaxOrder) || 'SVO';


    // Auto-save and content sync
    useEffect(() => {
        const t = setTimeout(() => onSave(text), 2000);
        return () => clearTimeout(t);
    }, [text, onSave]);
    useEffect(() => { setText(content || ''); }, [content]);

    const isVertical = writingDirection?.startsWith('vertical');

    // Normalise personRules into a flat object array regardless of legacy/modern format
    const personRulesArray = useMemo(() => {
        if (Array.isArray(personRulesStr)) return personRulesStr;
        if (typeof personRulesStr !== 'string' || !personRulesStr.trim()) return [];
        return personRulesStr.split(',').map(ruleStr => {
            const parts = ruleStr.trim().split(':');
            if (parts.length < 2) return null;
            const pg = parts[0].trim();
            let person = '1st', number = 'S', gender = '';
            if (pg.startsWith('1')) person = '1st';
            else if (pg.startsWith('2')) person = '2nd';
            else if (pg.startsWith('3')) person = '3rd';
            if (pg.toUpperCase().includes('P')) number = 'P';
            if (/masc/i.test(pg)) gender = 'Masc';
            else if (/fem/i.test(pg)) gender = 'Fem';
            const fap = parts[1].trim().split('/');
            return { id: `pr-${pg}`, person, number, gender, freeForm: fap[0]?.trim() || '', affix: fap[1]?.trim() || '', appliesTo: 'all' };
        }).filter(Boolean);
    }, [personRulesStr]);

    // Build personMap for the Interlinear Reader (affix → label)
    const personMap = useMemo(() => {
        const map = {};
        const processAffix = (aff, data) => {
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
        return map;
    }, [personRulesArray]);

    // Helper to find entry even if inflected
    const findEntry = (token) => {
        const clean = token.replace(/[.,!?()[\]{}"`:;]/g, '').toLowerCase();
        
        let entry = lexicon.find(e => e.word.replace(/\*/g,'').toLowerCase() === clean);
        if (entry) return { entry, isExact: true };

        const sortedLexicon = [...lexicon].sort((a, b) => b.word.length - a.word.length);
        for (const e of sortedLexicon) {
            const root = e.word.replace(/\*/g,'').toLowerCase();
            if (root.length >= 3 && clean.startsWith(root)) {
                const suffix = clean.slice(root.length);
                const personData = personMap[suffix] || personMap[suffix.replace(/^['\"-]/, '')] || { label: suffix, translation: '' };
                return { entry: e, isExact: false, personData };
            }
        }
        return { entry: null, isExact: false };
    };

    // ── Word Assist ──────────────────────────────────────────────────────────────

    // English pronoun → grammatical features
    const PRONOUN_MAP = {
        'i':      { person: '1st', number: 'S', role: 'S' },
        'me':     { person: '1st', number: 'S', role: 'O' },
        'my':     { person: '1st', number: 'S', role: null, case: 'possessive' },
        'mine':   { person: '1st', number: 'S', role: null, case: 'possessive' },
        'we':     { person: '1st', number: 'P', role: 'S' },
        'us':     { person: '1st', number: 'P', role: 'O' },
        'our':    { person: '1st', number: 'P', role: null, case: 'possessive' },
        'ours':   { person: '1st', number: 'P', role: null, case: 'possessive' },
        'you':    { person: '2nd', number: 'S', role: 'S' },
        'your':   { person: '2nd', number: 'S', role: null, case: 'possessive' },
        'yours':  { person: '2nd', number: 'S', role: null, case: 'possessive' },
        'he':     { person: '3rd', number: 'S', gender: 'Masc', role: 'S' },
        'him':    { person: '3rd', number: 'S', gender: 'Masc', role: 'O' },
        'his':    { person: '3rd', number: 'S', gender: 'Masc', role: null, case: 'possessive' },
        'she':    { person: '3rd', number: 'S', gender: 'Fem',  role: 'S' },
        'her':    { person: '3rd', number: 'S', gender: 'Fem',  role: 'O' },
        'hers':   { person: '3rd', number: 'S', gender: 'Fem',  role: null, case: 'possessive' },
        'it':     { person: '3rd', number: 'S', gender: 'Neut', role: null },
        'its':    { person: '3rd', number: 'S', gender: 'Neut', role: null, case: 'possessive' },
        'they':   { person: '3rd', number: 'P', role: 'S' },
        'them':   { person: '3rd', number: 'P', role: 'O' },
        'their':  { person: '3rd', number: 'P', role: null, case: 'possessive' },
        'theirs': { person: '3rd', number: 'P', role: null, case: 'possessive' },
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
        'is', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did', 'have', 'has', 'had'
    ]);

    // Returns true only when `q` matches `translation` as a complete word.
    const matchesTranslation = (translation, q) => {
        if (!translation || !q) return false;
        const t = translation.toLowerCase();
        if (t === q) return true;
        const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp('\\b' + esc + '\\b').test(t);
    };

    const lemmatize = (word) => {
        const IRREGULAR_VERBS = {
            'am': { lemma: 'be', tense: 'present' }, 
            'is': { lemma: 'be', tense: 'present' }, 
            'are': { lemma: 'be', tense: 'present' }, 
            'was': { lemma: 'be', tense: 'past' }, 
            'were': { lemma: 'be', tense: 'past' }, 
            'been': { lemma: 'be', tense: 'past_participle' },
            'went': { lemma: 'go', tense: 'past' }, 
            'gone': { lemma: 'go', tense: 'past_participle' },
            'saw': { lemma: 'see', tense: 'past' }, 
            'seen': { lemma: 'see', tense: 'past_participle' },
            'did': { lemma: 'do', tense: 'past' }, 
            'done': { lemma: 'do', tense: 'past_participle' },
            'had': { lemma: 'have', tense: 'past', isParticiple: true },
            'ate': { lemma: 'eat', tense: 'past' }, 
            'eaten': { lemma: 'eat', tense: 'past_participle' },
            'bought': { lemma: 'buy', tense: 'past', isParticiple: true },
            'brought': { lemma: 'bring', tense: 'past', isParticiple: true },
            'thought': { lemma: 'think', tense: 'past', isParticiple: true }, 
            'took': { lemma: 'take', tense: 'past' },
            'taken': { lemma: 'take', tense: 'past_participle' },
            'made': { lemma: 'make', tense: 'past', isParticiple: true }, 
            'said': { lemma: 'say', tense: 'past', isParticiple: true }
        };
        const lower = word.toLowerCase();
        
        // 1. Irregular Verb Match
        if (IRREGULAR_VERBS[lower]) return { ...IRREGULAR_VERBS[lower] };

        // 2. Possessive nouns (John's)
        if (lower.endsWith("'s")) return { lemma: lower.slice(0, -2), case: 'possessive' };

        // 3. Plural detection (naive)
        if (lower.length > 3 && lower.endsWith('s') && !lower.endsWith('ss')) {
            const singular = lower.endsWith('ies') ? lower.slice(0, -3) + 'y' : 
                           lower.endsWith('es') ? lower.slice(0, -2) : lower.slice(0, -1);
            return { lemma: singular, tense: 'present', isPlural: true };
        }

        // 4. Regular endings
        if (lower.endsWith('ing')) return { lemma: lower.slice(0, -3), tense: 'gerund' };
        if (lower.endsWith('ed')) {
            return { lemma: lower.slice(0, -2), tense: 'past', isParticiple: true };
        }
        
        // 5. Agentive / Comparative / Superlative
        if (lower.length > 4) {
            if (lower.endsWith('est')) return { lemma: lower.slice(0, -3), case: 'superlative' };
            if (lower.endsWith('er')) return { lemma: lower.slice(0, -2), case: 'comparative', isAgentive: true };
        }

        return { lemma: lower, tense: 'present' };
    };

    // Helper to find a rule by trigger OR name
    const findGrammarRule = (trigger, fallbackName) => {
        if (!grammarRules) return null;
        const lowerTrigger = (trigger || '').toLowerCase();
        const lowerFallback = (fallbackName || '').toLowerCase();
        
        return grammarRules.find(r => (r.waTrigger || '').toLowerCase() === lowerTrigger) || 
               grammarRules.find(r => (r.name || '').toLowerCase() === lowerFallback) ||
               grammarRules.find(r => (r.name || '').toLowerCase().includes(lowerTrigger) && lowerTrigger.length > 2);
    };

    const computePhraseSuggestion = (val, cursor) => {
        const lineStart = val.lastIndexOf('\n', cursor - 1) + 1;
        const rawEnd    = val.indexOf('\n', cursor);
        const lineEnd   = rawEnd === -1 ? val.length : rawEnd;
        const line      = val.slice(lineStart, lineEnd).trim();
        
        // Split words and separate contractions (e.g., I'll -> I 'll)
        const words = line.replace(/([a-zA-Z])'([a-zA-Z])/g, "$1 '$2").split(/\s+/).filter(Boolean);
        if (words.length < 2) return null;

        const breakdown = [];
        let i = 0;
        let activeTense = null;
        let activePassive = false;
        let activeContinuous = false;
        let activeCompSuper = null; // 'comparative' or 'superlative'
        let activeAuxRule = null;

        const protectedMorphemes = new Set();
        grammarRules?.forEach(r => {
            if (!r.affix) return;
            const m = r.affix.match(/[^-=@]+/);
            if (m) protectedMorphemes.add(m[0].toLowerCase());
        });
        personRulesArray?.forEach(r => {
            if (r.affix) {
                const m = r.affix.match(/[^-=@]+/);
                if (m) protectedMorphemes.add(m[0].toLowerCase());
            }
        });

        while (i < words.length) {
            let found = false;
            // Removed the aggressive null reset from here
            
            for (let len = 4; len >= 2; len--) {
                if (i + len <= words.length) {
                    const slice = words.slice(i, i + len).join(' ');
                    const match = lexicon.find(w => w.translation?.toLowerCase().includes(slice.toLowerCase()));
                    if (match) {
                        breakdown.push({ original: slice, conlang: match.word, found: true, entry: match, role: 'O' });
                        i += len;
                        found = true;
                        break;
                    }
                }
            }
            if (found) continue;

            const currentWord = words[i];
            const q = currentWord.replace(/[.,!?()[\]{}"`:;]/g, '').toLowerCase();
            const fullForm = q === "'ll" ? "will" : 
                             q === "'ve" ? "have" : 
                             q === "'d"  ? "would" : 
                             q === "'re" ? "are" : q;
            const { lemma, tense: wordTense, isPlural, isParticiple, case: wordCase, isAgentive } = lemmatize(fullForm);

            // Tense/Voice/Mood Triggers
            if (fullForm === 'will' || fullForm === 'was') {
                const trigger = fullForm === 'will' ? 'future' : 'past';
                const rule = findGrammarRule(trigger, trigger);
                const marker = rule?.affix ? rule.affix.replace(/[-'=@]/g, '') : (trigger === 'future' ? 'kλn' : 'kin');
                breakdown.push({ 
                    original: currentWord, 
                    conlang: marker, 
                    role: 'V', 
                    found: true, 
                    isAuxiliary: true,
                    swallowed: false // Starts as visible, swallowed only if merged into a verb
                });
                activeAuxRule = rule;
                i++; continue;
            }
            if (fullForm === 'have') activeTense = 'perfect';
            if (['be', 'am', 'is', 'are', 'was', 'were', 'been'].includes(fullForm)) {
                activePassive = true;
                activeContinuous = true;
            }
            if (fullForm === 'more') activeCompSuper = 'comparative';
            if (fullForm === 'most') activeCompSuper = 'superlative';

            const pInfo = PRONOUN_MAP[q] || PRONOUN_MAP[fullForm];

            // 4. Lexicon Match (Strict Hierarchy)
            const allMatches = lexicon.filter(e => {
                const t1 = (e.translation || '').toLowerCase();
                const t2 = (e.shortTranslation || '').toLowerCase();
                const searchTerms = [q, lemma, fullForm];
                if (q === "'ll") searchTerms.push("future");
                if (q === "'ve") searchTerms.push("perfect");
                if (q === "'d") searchTerms.push("past", "would");

                return searchTerms.some(term => 
                    matchesTranslation(t1, term) || matchesTranslation(t2, term)
                );
            });

            // If no exact matches, try fallback
            if (allMatches.length === 0 && fullForm.length >= 3) {
                const partials = lexicon.filter(e => {
                    const t1 = (e.translation || '').toLowerCase();
                    const t2 = (e.shortTranslation || '').toLowerCase();
                    return t1.includes(fullForm) || t1.includes(lemma) || t2.includes(fullForm) || t2.includes(lemma);
                });
                allMatches.push(...partials);
            }

            let match = allMatches[0];
            if (allMatches.length > 1) {
                const nextWord = words[i+1]?.replace(/[.,!?;:]/g, '').toLowerCase();
                const { isPlural: nextIsPlural } = nextWord ? lemmatize(nextWord) : { isPlural: false };
                
                match = allMatches.sort((a, b) => {
                    const aT1 = (a.translation || '').toLowerCase();
                    const aT2 = (a.shortTranslation || '').toLowerCase();
                    const bT1 = (b.translation || '').toLowerCase();
                    const bT2 = (b.shortTranslation || '').toLowerCase();
                    const aWC = (a.wordClass || '').toLowerCase();
                    const bWC = (b.wordClass || '').toLowerCase();
                    let sA = 0, sB = 0;
                    
                    // AVOID CONFLICT: If lexicon word is a grammar particle, penalize heavily
                    if (protectedMorphemes.has(a.word.toLowerCase())) sA -= 100;
                    if (protectedMorphemes.has(b.word.toLowerCase())) sB -= 100;

                    // PRIORITIZE SHORT/EXACT MATCHES (Penalize long definitions)
                    if (aT2 === q || aT2 === lemma) sA += 60;
                    if (bT2 === q || bT2 === lemma) sB += 60;
                    if (aT1 === q || aT1 === lemma) sA += 40;
                    if (bT1 === q || bT1 === lemma) sB += 40;
                    
                    // Length penalty: long definitions should lose to short translations
                    sA -= Math.min(aT1.length, 50) / 2;
                    sB -= Math.min(bT1.length, 50) / 2;

                    // CLASS BONUS: If searching for function words (the, a), prefer articles/determinatives
                    if (FUNCTION_WORDS.has(q)) {
                        if (aWC.includes('article') || aWC.includes('det')) sA += 30;
                        if (bWC.includes('article') || bWC.includes('det')) sB += 30;
                    }

                    if (nextIsPlural && aWC.includes('plural')) sA += 10;
                    if (nextIsPlural && bWC.includes('plural')) sB += 10;
                    
                    return sB - sA;
                })[0];
            }

            // 4b. Simple typo tolerance if still no match
            if (!match && q.length > 3) {
                match = lexicon.find(e => {
                    const t = (e.translation || '').toLowerCase();
                    if (t.length < 3) return false;
                    const dist = (a, b) => {
                        if (Math.abs(a.length - b.length) > 1) return 99;
                        let errors = 0;
                        for(let j=0; j < Math.min(a.length, b.length); j++) if (a[j] !== b[j]) errors++;
                        return errors + Math.abs(a.length - b.length);
                    };
                    return dist(t, q) <= 1 || dist(t, lemma) <= 1;
                });
            }

            if (match) {
                const base = match.word.replace(/\*/g, '');
                const wc   = (match.wordClass || '').toLowerCase();
                const isAuxiliary = (fullForm === 'will' || fullForm === 'have' || fullForm === 'can' || fullForm === 'must' || fullForm === 'should' || ['be', 'am', 'is', 'are', 'was', 'were', 'been'].includes(fullForm));
                const isArticle   = ['the', 'a', 'an'].includes(q) || ['the', 'a', 'an'].includes(fullForm);
                const isPronoun   = wc.includes('pronoun');
                const pInfo = isPronoun ? (PRONOUN_MAP[q] || PRONOUN_MAP[fullForm]) : null;
                const personRule = pInfo ? personRulesArray.find(r => r.person === pInfo.person && (!pInfo.number || r.number === pInfo.number) && (!pInfo.gender || !r.gender || r.gender === pInfo.gender)) : null;

                // Force Role V for auxiliaries, A for articles, S for pronouns, O for others
                let role = (isAuxiliary || wc.includes('verb') || wc.includes('particle')) ? 'V' : 
                           (wc.includes('article') || isArticle) ? 'A' : 
                           (isPronoun) ? 'S' : 'O';
                let conlang = base;
                let inflected = false;
                let appliedRuleName = null;
                
                // Apply Grammar Rules based on triggers
                let ruleToApply = null;
                const isVerb = wc.includes('verb'); 
                const isAdj  = wc.includes('adj') || wc.includes('adv');
                const isNoun = wc.includes('noun');
                const isFunctionWord = FUNCTION_WORDS.has(q);
                
                // Only calculate effectiveTense if it's a verb to prevent leakage
                if (isVerb) {
                    if (activePassive && (wordTense === 'past_participle' || isParticiple)) {
                        ruleToApply = findGrammarRule('passive', 'passive');
                    } else if (activeContinuous && wordTense === 'gerund') {
                        ruleToApply = findGrammarRule('gerund', 'gerund') || findGrammarRule('continuous', 'continuous');
                    } else {
                        const effectiveTense = (wordTense === 'past' || activeTense === 'past') ? 'past' : 
                                             (activeTense === 'future') ? 'future' : 
                                             (activeTense === 'perfect') ? 'perfect' : null;

                        if (effectiveTense) {
                            ruleToApply = findGrammarRule(effectiveTense, effectiveTense);
                        }
                    }

                    // Special case: Agentive (baker -> bake + agentive)
                    if (!ruleToApply && wordCase === 'comparative' && isAgentive) {
                        ruleToApply = findGrammarRule('agentive', 'agentive');
                    }
                    

                } else if (wordCase) {
                    ruleToApply = findGrammarRule(wordCase, wordCase);
                } else if (activeCompSuper && isAdj) {
                    ruleToApply = findGrammarRule(activeCompSuper, activeCompSuper);
                } else if (isPlural && (isNoun || !wc) && !isFunctionWord) {
                    ruleToApply = findGrammarRule('plural', 'plural');
                }

                if (ruleToApply) {
                    const ruleApplies = (ruleToApply.appliesTo || 'all').toLowerCase();
                    let shouldApply = (ruleApplies === 'all') || 
                                     (ruleApplies === 'verb' && isVerb) || 
                                     (ruleApplies === 'noun' && wc.includes('noun'));

                    if (shouldApply) {
                        const vowels = useConfigStore.getState().vowels || [];
                        const consonants = useConfigStore.getState().consonants || [];
                        const otherPhonemes = useConfigStore.getState().otherPhonemes || '';
                        try {
                            conlang = applyRuleToWord(base, ruleToApply, grammarRules, vowels, consonants, otherPhonemes);
                            inflected = true;
                            appliedRuleName = ruleToApply.name;
                        } catch(e) { console.error(e); }
                    }
                }

                // Auxiliary Merging Logic:
                // Applied AFTER the current word's rule to ensure markers like 'kin' are not lost.
                // We allow merging into auxiliaries themselves (chaining) OR into the main verb.
                if (activeAuxRule && isVerb && !wc.includes('particle')) {
                    try {
                        const vStore = useConfigStore.getState();
                        let merged = applyRuleToWord(conlang, activeAuxRule, grammarRules, vStore.vowels, vStore.consonants, vStore.otherPhonemes);
                        if (!merged) {
                            merged = applyAffixToBase(conlang, activeAuxRule.affix);
                        }
                        if (merged && merged !== conlang) {
                            conlang = merged;
                            inflected = true;
                            // Mark the previous auxiliary as "swallowed"
                            const lastAux = breakdown.slice().reverse().find(w => w.isAuxiliary && !w.swallowed);
                            if (lastAux) {
                                // Don't swallow 'be' if we are merging into another verb (keep 'be' in 'will be seeing')
                                // Unless the user wants 'was seeing' -> 'kin soirium'
                                const isBe = ['be', 'am', 'is', 'are', 'was', 'were', 'been'].includes(lastAux.original.toLowerCase());
                                if (!isBe || activeTense === 'past') {
                                    lastAux.swallowed = true;
                                }
                            }
                            
                            // Clear the aux rule after it has been consumed by the first available verb/modal
                            activeAuxRule = null;
                            // Reset activeTense to avoid repeating tense markers, 
                            // BUT KEEP activePassive/activeContinuous for the rest of the phrase
                            activeTense = null;
                        }
                    } catch(e) { console.error(e); }
                }
                if (isAuxiliary && ruleToApply) {
                    activeAuxRule = ruleToApply;
                }
                breakdown.push({ 
                    original: currentWord, 
                    conlang, 
                    role, 
                    found: true, 
                    entry: match, 
                    inflected, 
                    ruleName: appliedRuleName,
                    matchCount: allMatches.length,
                    alternatives: allMatches.slice(1, 4).map(m => m.word),
                    isAuxiliary,
                    isArticle,
                    personRule
                });
            } else {
                const searchTerms = [q, lemma, fullForm];
                if (q === "'ll") searchTerms.push("future");
                if (q === "'ve") searchTerms.push("perfect");
                if (q === "'d") searchTerms.push("past", "would");
                
                breakdown.push({ 
                    original: currentWord, 
                    conlang: `[${currentWord}]`, 
                    role: null, 
                    found: false,
                    debugSearch: searchTerms.filter(Boolean).join('/')
                });
            }
            if (!['will', 'have', 'be', 'am', 'is', 'are', 'was', 'were', 'been', 'more', 'most'].includes(fullForm) && 
                !q.endsWith("'ll") && !q.endsWith("'ve") && !q.endsWith("'re")) {
                activeTense = null; 
                activePassive = false;
                activeContinuous = false;
                activeCompSuper = null;
                activeAuxRule = null;
            }
            i++;
        }

        if (!breakdown.some(w => w.found)) return null;
        const roleOrder = {};
        syntaxOrder.split('').forEach((r, idx) => { roleOrder[r] = idx; });
        
        // Map 'A' (article) to 'O' (object) for global sorting, but keep 'A' flag for internal reordering
        const getSortRole = (r) => r === 'A' ? 'O' : r;

        // Internal Phrase Reordering (Heuristic for Head-Finality)


        // Internal Phrase Reordering
        // Special case for OSV/SOV: If the user wants the subject after the verb (e.g. soirium mau),
        // we handle that by swapping their relative order if both are present in a V-final syntax.
        const isVFinal = syntaxOrder.endsWith('V');

        const applyInternalReordering = (list) => {
            if (!isVFinal) return list;
            const result = [...list];
            
            // Heuristic: In V-final languages, Subject often follows Verb or is very flexible.
            // If we have S and V, and V is the end of the syntax, we can swap them for some conlangs.
            // BUT a safer bet is to follow the syntaxOrder strictly.
            // Wait, the user EXPLICITLY said OSV generates "mau soirium" and they want "soirium mau".
            // This means they want V before S. So OVS.
            return result;
        };

        // Build Sug 1: Free Form
        const bFree = JSON.parse(JSON.stringify(breakdown));
        const rFree = [...bFree].filter(w => !w.swallowed).sort((a, b) => {
            const roleA = getSortRole(a.role) || 'O';
            const roleB = getSortRole(b.role) || 'O';
            
            const currentSyntax = (syntaxOrder || '').trim().toUpperCase();

            // ABSOLUTE Priority Map for OSV (requested as O-V-S)
            if (currentSyntax === 'OSV') {
                const getPriority = (r) => {
                    if (r === 'O' || r === 'A') return 1; // Object/Article first
                    if (r === 'V') return 2;              // Verbs second
                    if (r === 'S') return 3;              // Subjects LAST
                    return 99;
                };
                const pA = getPriority(roleA);
                const pB = getPriority(roleB);
                if (pA !== pB) return pA - pB;
                return 0;
            }

            if (roleA !== roleB) return (roleOrder[roleA] ?? 99) - (roleOrder[roleB] ?? 99);
            return 0; 
        });
        const romFree = rFree.map(w => w.conlang).join(' ');

        const results = [{
            key: 'phrase-free', type: 'phrase', romanized: romFree,
            display: transliterate(romFree, lexicon),
            gloss: line + " (Free Form)", lineStart, lineEnd, wordBreakdown: bFree, reordered: rFree, label: 'Free Form'
        }];

        // Build Sug 2: Affix Form
        const bAffix = JSON.parse(JSON.stringify(breakdown));
        const subjWord = bAffix.find(w => w.role === 'S' && w.personRule?.affix);
        if (subjWord) {
            let done = false;
            const reorderedAffix = [...bAffix];
            
            // Only apply agreement to the FIRST verb in the resulting order
            // (In V-final languages, this is often the main verb, in V-initial it's the auxiliary)
            const firstVerb = reorderedAffix.find(w => w.role === 'V' && w.conlang && !w.conlang.startsWith('['));
            if (firstVerb) {
                // Find the original word in bAffix to apply the change
                const originalWord = bAffix.find(w => w === firstVerb); // This is a bit tricky with clones, let's use index
            }
            
            // Only apply agreement to the LAST verb in the resulting order that is NOT swallowed
            // (In "will be seeing", agreement usually goes to the auxiliary "will" OR the final verb)
            // The user wants it on the final verb in their examples.
            let targetVerbIdx = -1;
            reorderedAffix.forEach((w, idx) => {
                if (w.role === 'V' && !w.swallowed && w.conlang && !w.conlang.startsWith('[')) {
                    targetVerbIdx = idx;
                }
            });

            if (targetVerbIdx !== -1) {
                const w = reorderedAffix[targetVerbIdx];
                w.conlang = applyAffixToBase(w.conlang, subjWord.personRule.affix);
                w.inflected = true; 
                done = true;
                
                // Also mark the subject as encoded
                subjWord.encodedInVerb = true;
            }

            if (done) {
                const rAffix = bAffix.filter(w => !w.encodedInVerb && !w.swallowed).sort((a, b) => {
                    const roleA = getSortRole(a.role) || 'O';
                    const roleB = getSortRole(b.role) || 'O';
                    
                    const currentSyntax = (syntaxOrder || '').trim().toUpperCase();

                    // ABSOLUTE Priority Map for OSV (requested as O-V-S)
                    if (currentSyntax === 'OSV') {
                        const getPriority = (r) => {
                            if (r === 'O' || r === 'A') return 1;
                            if (r === 'V') return 2;
                            if (r === 'S') return 3;
                            return 99;
                        };
                        const pA = getPriority(roleA);
                        const pB = getPriority(roleB);
                        if (pA !== pB) return pA - pB;
                        return 0;
                    }

                    if (roleA !== roleB) return (roleOrder[roleA] ?? 99) - (roleOrder[roleB] ?? 99);
                    return 0;
                });
                const romAffix = rAffix.map(w => w.conlang).join(' ');
                results.push({
                    key: 'phrase-affix', type: 'phrase', romanized: romAffix,
                    display: transliterate(romAffix, lexicon),
                    gloss: line + " (Affix Form)", lineStart, lineEnd, wordBreakdown: bAffix, reordered: rAffix, label: 'Affix Form'
                });
            }
        }

        // Global Conflict Resolver / Haplology Filter
        // Applies to all results to ensure we don't have "kin kin" duplicates by default
        return results.map(res => {
            const tokens = res.romanized.split(' ');
            const filtered = [];
            for (let j = 0; j < tokens.length; j++) {
                if (j > 0 && tokens[j] === tokens[j-1]) continue; // Merge identical consecutive tokens
                filtered.push(tokens[j]);
            }
            const rom = filtered.join(' ');
            return {
                ...res,
                romanized: rom,
                display: transliterate(rom, lexicon)
            };
        });
    };

    const handleTextChange = (e) => {
        const val = e.target.value;
        setText(val);
        if (!wordAssist) return;

        const cursor = e.target.selectionStart;
        const { word, start, end } = getWordAtCursor(val, cursor);
        const query = word.replace(/[.,!?()[\]{}"`:;]/g, '').toLowerCase();

        if (query.length < 2) { setSuggestions([]); setWordRange(null); return; }
        setWordRange({ start, end });

        const { lemma, wordCase, isAgentive, isPlural, isParticiple, tense: wordTense } = lemmatize(query);

        // Three independent buckets — each has its own cap so they can't crowd each other out
        const directBucket    = [];  // raw lexicon translation matches — up to 6
        const pronounBucket   = [];  // free-form / case-marked pronoun forms — up to 4
        const inflectedBucket = [];  // verb conjugations & case forms — up to 4

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
                            const trig = (r.waTrigger || '').toLowerCase();
                            const name = (r.name || '').toLowerCase();
                            // Prioritize showing relevant forms if detected
                            if (wordTense === 'gerund' && (trig === 'gerund' || trig === 'continuous')) return true;
                            if (wordCase === 'comparative' && isAgentive && (trig === 'agentive')) return true;
                            return ['passive', 'gerund', 'continuous', 'agentive'].includes(trig) || ['passive', 'gerund', 'continuous', 'agentive'].includes(name);
                        })
                        .slice(0, 3)
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
                            const trig = (r.waTrigger || '').toLowerCase();
                            if (wordCase && (trig === wordCase)) return true;
                            return ['comparative', 'superlative', 'possessive', 'genitive', 'agentive'].includes(trig);
                        })
                        .slice(0, 3)
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

        // ── Phrase translation — prepended as first suggestion ────────────────────
        const phraseSuggs = computePhraseSuggestion(val, cursor);

        // ── Assemble: phrase first, then direct, pronouns, inflected ─────────────
        const combined = [
            ...(Array.isArray(phraseSuggs) ? phraseSuggs : []),
            ...directBucket.slice(0, 6),
            ...pronounBucket.slice(0, 4),
            ...inflectedBucket.slice(0, 4),
        ].slice(0, 15);

        setSuggestions(combined);
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
                minHeight: '400px'
            }}>
                {tokens.map((token, i) => {
                    if (!token.trim()) return <span key={i} style={{ whiteSpace: 'pre' }}>{token}</span>;
                    
                    const { entry, isExact, personData } = findEntry(token);
                    const displayWord = transliterate(token, lexicon);

                    return (
                        <div key={i} style={{ 
                            display: 'inline-flex', 
                            flexDirection: isVertical ? 'row' : 'column',
                            alignItems: isVertical ? 'flex-start' : 'center',
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

                <Button variant="save" onClick={() => onSave(text)}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Save size={16} /> Save Document</div>
                </Button>
            </div>

            {/* ── Word Assist suggestion panel ── sits between toolbar and writing area, never clipped */}
            {mode === 'edit' && wordAssist && (
                <div style={{
                    borderBottom: suggestions.length > 0 ? '1px solid var(--acc)' : '1px solid var(--bd)',
                    background: suggestions.length > 0 ? 'var(--s4)' : 'var(--s1)',
                    transition: 'all 0.2s'
                }}>
                    {/* Status bar — always visible when word assist is on */}
                    {showWaTip && (
                        <div className="wa-tip-box">
                            <button 
                                onClick={() => setShowWaTip(false)}
                                style={{ position: 'absolute', top: '8px', right: '8px', background: 'transparent', border: 'none', color: 'var(--tx3)', cursor: 'pointer', padding: '4px' }}
                            >
                                <Plus size={14} style={{ transform: 'rotate(45deg)' }} />
                            </button>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <div style={{ background: '#8b5cf6', padding: '8px', borderRadius: '10px', color: 'white', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)' }}>
                                    <Languages size={18} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--tx)' }}>Word Assist Guide</h4>
                                    <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: 'var(--tx2)', lineHeight: '1.4' }}>
                                        Word Assist is an experimental syntactic engine that helps you build phrases in your conlang in real-time.
                                    </p>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8b5cf6', marginBottom: '4px' }}>1. SETUP</div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--tx3)' }}>Define classes (Verb, Noun) in Lexicon and use "WA Triggers" in Grammar.</div>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ec4899', marginBottom: '4px' }}>2. SYNTAX</div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--tx3)' }}>Word order (SVO, OSV, etc.) is pulled from your global settings.</div>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>3. INTERACTIVE</div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--tx3)' }}>Drag chips to reorder. Use Tab to insert the suggested phrase.</div>
                                        </div>
                                    </div>

                                    <div style={{ 
                                        display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', 
                                        background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', 
                                        borderRadius: '6px', color: '#f87171', fontSize: '0.65rem', fontWeight: 600
                                    }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f87171', animation: 'pulse 2s infinite' }}></div>
                                        EXPERIMENTAL: This engine is limited and subject to grammatical errors in complex phrases.
                                    </div>
                                </div>
                            </div>
                        </div>
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
                            const pc = '#8b5cf6';
                            return (
                                <div
                                    key={sugg.key}
                                    onClick={() => applySuggestion(sugg)}
                                    onMouseEnter={() => setActiveSuggIdx(idx)}
                                    style={{
                                        padding: '8px 14px',
                                        cursor: 'pointer',
                                        background: isActive ? 'color-mix(in srgb, #8b5cf6 15%, transparent)' : 'color-mix(in srgb, #8b5cf6 6%, transparent)',
                                        borderLeft: isActive ? '3px solid #8b5cf6' : '3px solid rgba(139,92,246,0.35)',
                                        borderBottom: '1px solid var(--bd)',
                                        transition: 'background 0.15s',
                                    }}
                                >
                                    {/* Top row: badge + full phrase */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'white', background: pc, borderRadius: '4px', padding: '1px 6px', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
                                            ✦ {sugg.label || 'phrase'}
                                        </span>
                                        <span className="custom-font-text notranslate" style={{ fontSize: '1.15rem', fontWeight: 700, color: pc }}>
                                            {sugg.display}
                                        </span>
                                        <span style={{ fontSize: '0.9rem', color: 'var(--tx)', fontFamily: 'sans-serif', fontWeight: 600 }}>
                                            {sugg.romanized}
                                        </span>
                                        <span style={{ marginLeft: 'auto', fontSize: '0.63rem', fontWeight: 700, background: 'var(--s3)', color: 'var(--tx2)', borderRadius: '4px', padding: '1px 6px', fontFamily: 'sans-serif', whiteSpace: 'nowrap' }}>
                                            {syntaxOrder} applied
                                        </span>
                                    </div>
                                    {/* Bottom row: word-by-word breakdown chips */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                                        {sugg.reordered?.map((breakdown, chipIdx) => {
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
                                                    style={{ 
                                                        fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', 
                                                        background: isMissing ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                                                        border: `1px solid ${isMissing ? 'rgba(255,255,255,0.1)' : pc + '44'}`,
                                                        display: 'flex', flexDirection: 'column', color: isMissing ? '#999' : 'white',
                                                        opacity: (breakdown.encodedInVerb || breakdown.swallowed) ? 0.4 : (isDragging ? 0.2 : 1),
                                                        textDecoration: (breakdown.encodedInVerb || breakdown.swallowed) ? 'line-through' : 'none',
                                                        cursor: isDragging ? 'grabbing' : 'grab',
                                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        transform: isDragging ? 'scale(0.95)' : 'scale(1)',
                                                        userSelect: 'none'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <span style={{ fontWeight: 600 }}>{breakdown.original}</span>
                                                        <span>→</span>
                                                        <span style={{ color: pc, fontWeight: 700 }}>{breakdown.conlang}</span>
                                                        {breakdown.inflected && <span title="Inflected" style={{ color: '#ffcc00' }}>✦</span>}
                                                    </div>
                                                    <div style={{ fontSize: '0.55rem', opacity: 0.6, display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                                        {breakdown.entry?.wordClass && <span>[{breakdown.entry.wordClass}]</span>}
                                                        {breakdown.ruleName && <span style={{ color: '#ffcc00' }}>({breakdown.ruleName})</span>}
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

    useEffect(() => {
        if (editorRef.current && content !== editorRef.current.innerHTML) {
            // SEC-1: Sanitize HTML to prevent XSS via shared/cloud projects
            editorRef.current.innerHTML = DOMPurify.sanitize(content || '', {
                ALLOWED_TAGS: ['b', 'i', 'u', 'a', 'span', 'p', 'br', 'div', 'h1', 'h2', 'h3', 'h4', 'strong', 'em', 'ul', 'ol', 'li'],
                ALLOWED_ATTR: ['href', 'class', 'style', 'target']
            });
        }
    }, [content]);

    useEffect(() => {
        const autoSaveTimer = setInterval(() => {
            if (editorRef.current) onSave(editorRef.current.innerHTML);
        }, 3000);
        return () => clearInterval(autoSaveTimer);
    }, [onSave]);

    const formatText = (command, value = null) => {
        document.execCommand(command, false, value);
        if (editorRef.current) editorRef.current.focus();
    };

    const applyConlangFont = () => {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const selectedText = selection.toString();
        if (selectedText) {
            const html = `<span class="custom-font-text notranslate" style="color: var(--acc); font-weight: bold;">${selectedText}</span>`;
            document.execCommand('insertHTML', false, html);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="wiki-toolbar">
                <button className="wiki-tool-btn" title="Bold" onClick={() => formatText('bold')}><Bold size={16} /></button>
                <button className="wiki-tool-btn" title="Italic" onClick={() => formatText('italic')}><Italic size={16} /></button>
                <button className="wiki-tool-btn" title="Underline" onClick={() => formatText('underline')}><Underline size={16} /></button>
                <div style={{ width: '1px', background: 'var(--bd)', margin: '0 5px' }}></div>
                <button className="wiki-tool-btn" title="Insert Link" onClick={() => setLinkModalOpen(true)}><Link size={16} /></button>
                <button className="wiki-tool-btn" title="Format as Conlang Font" onClick={applyConlangFont}><Type size={16} /> <span style={{fontSize: '0.7rem', marginLeft: '4px', fontWeight: 'bold'}}>CONLANG</span></button>
                <div style={{ flex: 1 }}></div>
                <Button variant="save" onClick={() => onSave(editorRef.current.innerHTML)}><div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Save size={16} /> Save Document</div></Button>
            </div>
            <div 
                className="wiki-editor" 
                contentEditable 
                ref={editorRef} 
                onBlur={() => onSave(editorRef.current.innerHTML)}
                suppressContentEditableWarning={true}
            />

            <Modal isOpen={linkModalOpen} onClose={() => setLinkModalOpen(false)} title="Insert Link">
                <Input label="Target URL" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." autoFocus />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}><Button variant="imp" onClick={() => { if(linkUrl) formatText('createLink', linkUrl); setLinkUrl(''); setLinkModalOpen(false); }}>Insert</Button></div>
            </Modal>
        </div>
    );
}

export default function WikiTab() {
    const wikiPages = useConfigStore((state) => state.wikiPages) || {};
    const saveWikiPage = useConfigStore((state) => state.saveWikiPage);
    const addWikiPage = useConfigStore((state) => state.addWikiPage);
    const deleteWikiPage = useConfigStore((state) => state.deleteWikiPage);
    const writingDirection = useConfigStore(state => state.writingDirection);

    const [currentPageId, setCurrentPageId] = useState(() => Object.keys(wikiPages)[0] || null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newPageTitle, setNewPageTitle] = useState('');
    const [newPageType, setNewPageType] = useState('wiki'); // 'wiki' or 'corpus'

    const handleCreatePage = () => {
        try {
            if (!newPageTitle.trim()) {
                alert("Title cannot be empty!");
                return;
            }
            const pageId = newPageTitle.trim().toLowerCase().replace(/\s+/g, '-');
            addWikiPage(pageId, newPageTitle.trim(), newPageType);
            setCurrentPageId(pageId);
            setNewPageTitle('');
            setIsCreateModalOpen(false);
        } catch (err) {
            alert("Error creating page: " + err.message);
        }
    };

    const handleDeletePage = (pageId, e) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this document?")) return;
        
        deleteWikiPage(pageId);
        if (currentPageId === pageId) {
            const remainingPages = Object.keys(wikiPages).filter(id => id !== pageId);
            setCurrentPageId(remainingPages.length > 0 ? remainingPages[0] : null);
        }
    };

    const currentPage = currentPageId ? wikiPages[currentPageId] : null;
    const isCorpus = currentPage && typeof currentPage === 'object' && currentPage.type === 'corpus';
    const content = isCorpus ? currentPage.content : currentPage;

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
                        Object.keys(wikiPages).map(pageId => {
                            const p = wikiPages[pageId];
                            const isCorp = p && typeof p === 'object' && p.type === 'corpus';
                            const pTitle = isCorp ? p.title : pageId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                            return (
                                <div 
                                    key={pageId} 
                                    className={`wiki-page-item ${currentPageId === pageId ? 'active' : ''}`}
                                    onClick={() => setCurrentPageId(pageId)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {isCorp ? <Languages size={14} color="var(--acc)" /> : <FileText size={14} color="var(--tx2)" />}
                                        <span style={{ fontWeight: 'bold', color: 'var(--tx)' }}>{pTitle}</span>
                                    </div>
                                    <button className="wiki-del-btn" onClick={(e) => handleDeletePage(pageId, e)}><Trash2 size={16} /></button>
                                </div>
                            );
                        })
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
                        <option value="wiki">Wiki Article (Rich Text Formatting)</option>
                        <option value="corpus">Corpus Text (Interlinear Glossing & Live Translation)</option>
                    </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}><Button variant="imp" onClick={handleCreatePage}>Create</Button></div>
            </Modal>
        </div>
    );
}

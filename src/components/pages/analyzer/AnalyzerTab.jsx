import React, { useState, useMemo } from 'react';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { stripAffix, getPersonRules } from '@/utils/morphologyEngine.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import Card from '@/components/UI/Card/card.jsx';
import Input from '@/components/UI/Input/input.jsx';
import Button from '@/components/UI/Buttons/buttons.jsx';
import Modal from '@/components/UI/Modal/Modal.jsx';
import { Search, AlertTriangle, Languages, CheckCircle2, FlaskConical } from 'lucide-react';
import './analyzerTab.css';

export default function AnalyzerTab() {
    const [inputText, setInputText] = useState('');
    const [analyzedWords, setAnalyzedWords] = useState([]);
    const [translation, setTranslation] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Store Data
    const lexicon = useLexiconStore((state) => state.lexicon);
    const config = useConfigStore();
    const { normalizeToBase, transliterate } = useTransliterator();

    // Typology Validation Helper
    const isStrictlySyllabic = (word) => {
        if (config.phonologyTypes !== 'syllabic' || !config.syllabaryMap) return true;
        const clean = normalizeToBase(word.toLowerCase());
        const syllables = Object.keys(config.syllabaryMap).sort((a, b) => b.length - a.length);
        if (syllables.length === 0) return true;
        
        let i = 0;
        while (i < clean.length) {
            let match = syllables.find(s => clean.startsWith(s, i) && config.syllabaryMap[s]);
            if (!match) return false;
            i += match.length;
        }
        return true;
    };

    // Recursive Parsing Engine
    const findAllParsings = (surface, depth = 0) => {
        if (depth > 3) return [];
        let parsings = [];
        const safeSurface = normalizeToBase(surface.toLowerCase());

        // 1. Exact match in dictionary
        lexicon.filter(e => normalizeToBase(e.word.toLowerCase()) === safeSurface)
               .forEach(m => parsings.push({ root: m, rules: [] }));

        // 2. Ghost Pronouns (Free Words)
        const personRules = getPersonRules(config.personRules);
        personRules.forEach(rule => {
            if (rule.free && normalizeToBase(rule.free.toLowerCase()) === safeSurface) {
                parsings.push({
                    root: { word: rule.free, wordClass: 'pronoun', translation: `Pronoun (${rule.name})` },
                    rules: []
                });
            }
        });

        // 3. Infinitive verbs (surface + verbMarker == dictionary verb)
        if (config.verbMarker) {
            const markers = config.verbMarker.split(',').map(m => m.trim().replace(/^-/, ''));
            markers.forEach(marker => {
                lexicon.filter(e => normalizeToBase(e.word.toLowerCase()) === safeSurface + normalizeToBase(marker) && e.wordClass === 'verb')
                       .forEach(m => parsings.push({ root: m, rules: [] }));
            });
        }

        // 4. Recursive affix stripping
        let allRules = [...(config.grammarRules || []), ...personRules.filter(p => p.affix).map(p => ({ ...p, appliesTo: 'verb' }))];

        allRules.forEach(rule => {
            if (!rule.affix) return;
            let stripped = stripAffix(safeSurface, rule.affix);
            if (stripped) {
                findAllParsings(stripped, depth + 1).forEach(sp => {
                    let applies = rule.appliesTo ? rule.appliesTo.split(',').map(c => c.trim().toLowerCase()) : ['all'];
                    if (applies.includes('all') || applies.includes(sp.root.wordClass?.toLowerCase())) {
                        parsings.push({ root: sp.root, rules: [rule, ...sp.rules] });
                    }
                });
            }
        });
        return parsings;
    };

    const getUniqueParsings = (surface) => {
        let parsings = findAllParsings(surface);
        let unique = [];
        let sigs = new Set();
        parsings.forEach(p => {
            let sig = p.root.word + '|' + p.root.translation + '|' + p.rules.map(r => r.name).join('|');
            if (!sigs.has(sig)) { sigs.add(sig); unique.push(p); }
        });
        return unique;
    };

    // Executing Analysis
    const handleAnalyze = () => {
        if (!inputText.trim()) {
            setAnalyzedWords([]);
            setTranslation('');
            setIsModalOpen(false);
            return;
        }
        
        const words = inputText.trim().split(/\s+/).map(p => {
            const cleanP = p.replace(/[.,!?]/g, ''); // Strip basic punctuation
            return {
                original: p,
                clean: cleanP,
                parsings: getUniqueParsings(cleanP),
                selectedIdx: 0,
                manualRole: null
            };
        });
        setAnalyzedWords(words);
        setTranslation('');
        setIsModalOpen(true);
    };

    const handleParsingChange = (wordIndex, parseIndex) => {
        const newWords = [...analyzedWords];
        newWords[wordIndex].selectedIdx = parseInt(parseIndex);
        setAnalyzedWords(newWords);
    };

    const handleRoleChange = (wordIndex, role) => {
        const newWords = [...analyzedWords];
        newWords[wordIndex].manualRole = role;
        setAnalyzedWords(newWords);
    };

    // Syntax Validation logic
    const syntaxStatus = useMemo(() => {
        if (analyzedWords.length === 0) return null;
        
        let pattern = [];
        let sentenceHasHiddenSubject = false;
        
        analyzedWords.forEach(wData => {
            if (wData.parsings.length === 0) return;
            let p = wData.parsings[wData.selectedIdx];
            
            let transLower = p.root.translation?.toLowerCase() || '';
            let isObjTrans = ['acc', 'acu', 'obj', 'dat', 'patient'].some(t => transLower.includes(t));
            let isObjRule = p.rules.some(r => ['acc', 'acu', 'obj', 'dat', 'patient'].some(t => r.name.toLowerCase().includes(t)));
            
            let isObj = isObjTrans || isObjRule;
            let isSubj = (p.root.wordClass === 'noun' || p.root.wordClass === 'pronoun') && !isObj;
            let defaultRole = (p.root.wordClass === 'verb') ? 'V' : (isObj ? 'O' : (isSubj ? 'S' : ''));
            
            let finalRole = wData.manualRole !== null ? wData.manualRole : defaultRole;
            if (finalRole) pattern.push(finalRole);
            
            if (finalRole === 'V') {
                let isPersonMarked = p.rules.some(r => {
                    let n = r.name.toUpperCase();
                    return n.match(/^[123][SP]/) || (config.personRules && config.personRules.toUpperCase().includes(n));
                });
                if (isPersonMarked) sentenceHasHiddenSubject = true;
            }
        });
        
        if (pattern.length === 0) return null;
        
        let cleanedPattern = pattern.filter((v, i, a) => v !== a[i - 1]).join('');
        let targetOrder = config.syntaxOrder || 'SVO';
        let isValid = cleanedPattern === targetOrder || cleanedPattern.includes(targetOrder);
        
        if (!isValid && sentenceHasHiddenSubject && !cleanedPattern.includes('S')) {
            let targetWithoutS = targetOrder.replace('S', '');
            if (cleanedPattern === targetWithoutS || cleanedPattern.includes(targetWithoutS)) {
                isValid = true;
                cleanedPattern = `${cleanedPattern} (+ Agglutinated S)`;
            }
        }
        
        return { isValid, cleanedPattern, targetOrder };
    }, [analyzedWords, config.syntaxOrder, config.personRules]);

    // Reverse Translation Engine
    const handleTranslate = () => {
        if (analyzedWords.length === 0) return;
        
        let subjects = [], verbs = [], objects = [], others = [];
        
        analyzedWords.forEach(wData => {
            if (wData.parsings.length === 0) {
                others.push("???"); return;
            }
            
            let p = wData.parsings[wData.selectedIdx];
            let transLower = p.root.translation?.toLowerCase() || '';
            
            let role = wData.manualRole;
            if (!role) {
                let isObjTrans = ['acc', 'acu', 'obj', 'dat', 'patient'].some(t => transLower.includes(t));
                let isObjRule = p.rules.some(r => ['acc', 'acu', 'obj', 'dat', 'patient'].some(t => r.name.toLowerCase().includes(t)));
                let isObj = isObjTrans || isObjRule;
                let isSubj = (p.root.wordClass === 'noun' || p.root.wordClass === 'pronoun') && !isObj;
                role = (p.root.wordClass === 'verb') ? 'V' : (isObj ? 'O' : (isSubj ? 'S' : ''));
            }
            
            let baseTrans = p.root.translation?.split(',')[0].trim() || p.root.word;
            if (role === 'V' && baseTrans.toLowerCase().startsWith('to ')) baseTrans = baseTrans.substring(3);
            
            const pronouns = { '1s': 'I', '2s': 'you', '3s': 'he/she/it', '1p': 'we', '2p': 'you', '3p': 'they' };
            let remainingTags = [], hiddenPronoun = null;
            
            p.rules.forEach(r => {
                let n = r.name.toLowerCase();
                if (pronouns[n]) hiddenPronoun = pronouns[n];
                else if (n.includes('past')) baseTrans = baseTrans.endsWith('e') ? baseTrans + 'd' : baseTrans + 'ed';
                else if (n.includes('future')) baseTrans = 'will ' + baseTrans;
                else if (n.includes('continuous') || n.includes('gerund')) baseTrans = (baseTrans.endsWith('e') && !baseTrans.endsWith('ee')) ? baseTrans.slice(0, -1) + 'ing' : baseTrans + 'ing';
                else if (n.includes('plural') && role !== 'V') baseTrans = baseTrans.endsWith('s') ? baseTrans + 'es' : baseTrans + 's';
                else if (n.includes('conditional')) baseTrans = 'would ' + baseTrans;
                else if (n.includes('potential') || n.includes('ability')) baseTrans = 'can ' + baseTrans;
                else if (['acc', 'acu', 'obj', 'dat'].some(t => n.includes(t))) { /* Ignore case tags */ }
                else remainingTags.push(r.name);
            });
            
            if (hiddenPronoun && role === 'V') subjects.push(hiddenPronoun);
            
            let pseudoTranslation = remainingTags.length > 0 ? `${baseTrans} [${remainingTags.join(', ')}]` : baseTrans;
            
            if (role === 'S') subjects.push(pseudoTranslation);
            else if (role === 'V') verbs.push(pseudoTranslation);
            else if (role === 'O') objects.push(pseudoTranslation);
            else others.push(pseudoTranslation);
        });
        
        let translatedSentence = [...new Set(subjects), ...verbs, ...objects, ...others].join(' ');
        if (translatedSentence.length > 0) translatedSentence = translatedSentence.charAt(0).toUpperCase() + translatedSentence.slice(1);
        setTranslation(translatedSentence);
    };

    return (
        <div className="analyzer-container">
            <Card>
                <h2 className='flex sg-title analyzer-header-title'><FlaskConical /> Syntax & Morphology Analyzer</h2>
                <p className="analyzer-description">Enter a sentence in your conlang. The engine will recursively strip affixes and identify the roots to analyze your syntax order.</p>
                
                <Input label="Sentence to Analyze" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Type your conlang phrase here..." className="custom-font-text notranslate" />
                <Button onClick={handleAnalyze} style={{ marginTop: '10px' }}><div className="analyzer-btn-content"><Search size={18} /> Execute Analysis</div></Button>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Analysis Results">
                {analyzedWords.length > 0 && (
                    <div className="analyzer-modal-content">
                        {syntaxStatus && (
                            <div className="syntax-status-box" style={{ border: `1px solid ${syntaxStatus.isValid ? 'var(--ok)' : 'var(--err)'}`, color: syntaxStatus.isValid ? 'var(--ok)' : 'var(--err)' }}>
                                {syntaxStatus.isValid ? <><CheckCircle2 size={16} className="status-icon"/> <b>Valid Syntax!</b> Sentence matches <b>{syntaxStatus.targetOrder}</b> order.</> : <><AlertTriangle size={16} className="status-icon"/> <b>Warning:</b> Detected <b>{syntaxStatus.cleanedPattern}</b> instead of <b>{syntaxStatus.targetOrder}</b>.</>}
                            </div>
                        )}
    
                    <div className="parsed-words-grid">
                        {analyzedWords.map((wData, i) => {
                            const isAmbig = wData.parsings.length > 1;
                            const isSylError = !isStrictlySyllabic(wData.original);
                            const p = wData.parsings.length > 0 ? wData.parsings[wData.selectedIdx] : null;
                            return (
                                <div key={i} className="parsed-word-card" style={{ border: `2px solid ${wData.parsings.length === 0 || isSylError ? 'var(--err)' : isAmbig ? 'var(--acc2)' : 'var(--bd)'}` }}>
                                    {wData.parsings.length === 0 ? (<><div className="notranslate custom-font-text unknown-root-text">{wData.original}</div><div className="unknown-root-label">? Unknown Root</div></>) : (<>
                                        {isAmbig && <div className="warning-badge ambig">⚠️ Ambiguous Parse</div>}
                                        {isSylError && <div className="warning-badge err">❌ Invalid Syllables</div>}
                                        {isAmbig && <select className="analyzer-select" value={wData.selectedIdx} onChange={(e) => handleParsingChange(i, e.target.value)}>{wData.parsings.map((pOpt, idx) => (<option key={idx} value={idx}>[{pOpt.root.wordClass}] {pOpt.root.translation}</option>))}</select>}
                                        <select className="analyzer-select mt-4" value={wData.manualRole || ''} onChange={(e) => handleRoleChange(i, e.target.value)}><option value="">- Auto Role -</option><option value="S">S (Subject)</option><option value="V">V (Verb)</option><option value="O">O (Object)</option></select>
                                        <div className="notranslate custom-font-text word-original">{transliterate(wData.original)}</div>
                                        <div className="notranslate word-root-label">Root: {transliterate(p.root.word)}</div>
                                        <div className="word-translation">{p.root.translation}</div>
                                        <div className="rules-container">{p.rules.map((r, idx) => (<span key={idx} className="rule-badge">{r.name}</span>))}</div>
                                    </>)}
                                </div>
                            );
                        })}
                    </div>

                    <div className="translation-section">
                        <Button variant="imp" onClick={handleTranslate}><div className="analyzer-btn-content text-white"><Languages size={18} /> Generate Approximate Translation</div></Button>
                        {translation && <div className="translation-result-box"><div className="translation-label">🌍 Approximate Translation (SVO)</div><div className="translation-text">{translation}.</div></div>}
                    </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
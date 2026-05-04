import React, { useState, useMemo } from 'react';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { stripAffix, getPersonRules, segmentToken } from '@/utils/morphologyEngine.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import Card from '@/components/UI/Card/Card.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Modal from '@/components/UI/Modal/Modal.jsx';
import { Search, AlertTriangle, Languages, CheckCircle2, FlaskConical, Volume2, HelpCircle, XCircle } from 'lucide-react';
import './analyzerTab.css';

export default function AnalyzerTab() {
    const [inputText, setInputText] = useState('');
    const [analyzedWords, setAnalyzedWords] = useState([]);
    const [translation, setTranslation] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Store Data
    const rawLexicon = useLexiconStore((state) => state.lexicon);
    const lexicon = Array.isArray(rawLexicon) ? rawLexicon : (rawLexicon?.lexicon || []);
    const config = useConfigStore();
    const { normalizeToBase, transliterate } = useTransliterator();

    // Text-to-Speech handler for the translation reader
    const handleListen = (text) => {
        if (!('speechSynthesis' in window)) {
            return alert("Sorry, your browser doesn't support text-to-speech.");
        }
        if (!text) return;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    };

    // Let's check if a word perfectly follows the rules of our syllabary (if the language uses one)
    const isStrictlySyllabic = (word) => {
        if (config.phonologyTypes !== 'syllabic' || !config.syllabaryMap) return true;
        
        const clean = normalizeToBase(word.toLowerCase());
        const syllables = Object.keys(config.syllabaryMap).sort((a, b) => b.length - a.length);
        if (syllables.length === 0) return true;
        
        let i = 0;
        while (i < clean.length) {
            const match = syllables.find(s => clean.startsWith(s, i) && config.syllabaryMap[s]);
            if (!match) return false;
            i += match.length;
        }
        return true;
    };

    // Time to dig into the word recursively to find its root and any attached affixes
    const findAllParsings = (surface, depth = 0) => {
        if (depth > 3) return []; // Safety net to prevent infinite loops on crazy long words
        
        const parsings = [];
        const safeSurface = normalizeToBase(surface.toLowerCase());

        // First, let's see if the exact word is already sitting right there in our dictionary
        lexicon.filter(e => normalizeToBase(e.word.toLowerCase()) === safeSurface)
               .forEach(m => parsings.push({ root: m, rules: [] }));

        const personRules = getPersonRules(config.personRules);
        personRules.forEach(rule => {
            const cleanAffix = rule.affix ? rule.affix.replace(/^-|-$/g, '').toLowerCase() : null;
            const isFreeMatch = rule.freeForm && normalizeToBase(rule.freeForm.toLowerCase()) === safeSurface;
            const isAffixMatch = cleanAffix && normalizeToBase(cleanAffix) === safeSurface;

            if (isFreeMatch || isAffixMatch) {
                parsings.push({
                    root: { 
                        word: rule.freeForm || cleanAffix, 
                        wordClass: 'pronoun', 
                        translation: `Person (${rule.name})` 
                    },
                    rules: [],
                });
            }
        });

        // What if it's a bare verb root, but verbs normally require an infinitive marker in the dictionary?
        if (config.verbMarker) {
            const markers = config.verbMarker.split(',').map(m => m.trim().replace(/^-/g, ''));
            markers.forEach(marker => {
                lexicon.filter(e => normalizeToBase(e.word.toLowerCase()) === safeSurface + normalizeToBase(marker) && e.wordClass === 'verb')
                       .forEach(m => parsings.push({ root: m, rules: [] }));
            });
        }

        // Finally, start stripping off grammar affixes one by one to see what's underneath
        const allRules = [
            ...(config.grammarRules || []), 
            ...personRules.filter(p => p.affix).map(p => ({ ...p, appliesTo: p.appliesTo || 'all' }))
        ];

        allRules.forEach(rule => {
            if (!rule.affix) return;
            
            const stripped = stripAffix(safeSurface, rule.affix);
            if (stripped) {
                findAllParsings(stripped, depth + 1).forEach(sp => {
                    const applies = rule.appliesTo ? rule.appliesTo.split(',').map(c => c.trim().toLowerCase()) : ['all'];
                    if (applies.includes('all') || applies.includes(sp.root.wordClass?.toLowerCase())) {
                        parsings.push({ root: sp.root, rules: [rule, ...sp.rules] });
                    }
                });
            }
        });
        
        return parsings;
    };

    // Clean up the results so we don't show the user the exact same parsing twice
    const getUniqueParsings = (surface) => {
        const parsings = findAllParsings(surface);
        const unique = [];
        const signatures = new Set();
        
        parsings.forEach(parse => {
            const signature = `${parse.root.word}|${parse.root.translation}|${parse.rules.map(r => r.name).join('|')}`;
            if (!signatures.has(signature)) { 
                signatures.add(signature); 
                unique.push(parse); 
            }
        });
        
        return unique;
    };

    // Fire up the engine when the user clicks the analyze button
    const handleAnalyze = () => {
        if (!inputText.trim()) {
            setAnalyzedWords([]);
            setTranslation('');
            setIsModalOpen(false);
            return;
        }
        
        // 1. Initial split by whitespace
        const initialTokens = inputText.trim().split(/\s+/);
        const finalTokens = [];

        // 2. Perform Lexicon-Aware Segmentation on each token
        initialTokens.forEach(token => {
            const cleanToken = token.replace(/[.,!?]/g, '');
            const segments = segmentToken(cleanToken, lexicon, config, normalizeToBase, getUniqueParsings);
            
            segments.forEach(seg => {
                finalTokens.push({
                    original: seg,
                    clean: seg,
                    parsings: getUniqueParsings(seg),
                    selectedIdx: 0,
                    manualRole: null
                });
            });
        });
        
        setAnalyzedWords(finalTokens);
        setTranslation('');
        setIsModalOpen(true);

        // Unlock Translator achievement
        if (inputText.trim() && !config.unlockedBadges?.includes('translator')) {
            config.unlockBadge('translator', 'Translator');
            config.logActivity('Analyzed a sentence in the Syntax Analyzer!');
        }
    };

    const handleParsingChange = (wordIndex, parseIndex) => {
        const newWords = [...analyzedWords];
        newWords[wordIndex].selectedIdx = parseInt(parseIndex);
        setAnalyzedWords(newWords);
    };

    const handleRoleChange = (wordIndex, role) => {
        const newWords = [...analyzedWords];
        newWords[wordIndex].manualRole = role || null;
        setAnalyzedWords(newWords);
    };

    // Check if the overall sentence structure matches the user's defined syntax order
    const syntaxStatus = useMemo(() => {
        if (analyzedWords.length === 0) return null;
        
        const pattern = [];
        let sentenceHasHiddenSubject = false;
        
        analyzedWords.forEach(wData => {
            if (wData.parsings.length === 0) return;
            const parse = wData.parsings[wData.selectedIdx];
            
            const transLower = parse.root.translation?.toLowerCase() || '';
            const isObjTrans = ['acc', 'acu', 'obj', 'dat', 'patient'].some(t => transLower.includes(t));
            const isObjRule = parse.rules.some(r => ['acc', 'acu', 'obj', 'dat', 'patient'].some(t => r.name.toLowerCase().includes(t)));
            
            const isObj = isObjTrans || isObjRule;
            const isSubj = (parse.root.wordClass === 'noun' || parse.root.wordClass === 'pronoun') && !isObj;
            const defaultRole = (parse.root.wordClass === 'verb') ? 'V' : (isObj ? 'O' : (isSubj ? 'S' : ''));
            
            const finalRole = wData.manualRole !== null ? wData.manualRole : defaultRole;
            if (finalRole) pattern.push(finalRole);
            
            if (finalRole === 'V') {
                const isPersonMarked = parse.rules.some(r => {
                    const n = r.name.toUpperCase();
                    if (n.match(/^[123][SP]/)) return true;
                    // personRules can be a legacy string or a modern array of objects
                    if (typeof config.personRules === 'string') {
                        return config.personRules.toUpperCase().includes(n);
                    }
                    if (Array.isArray(config.personRules)) {
                        return config.personRules.some(p => 
                            (p.name && p.name.toUpperCase().includes(n)) ||
                            (p.person && p.person.toUpperCase().includes(n))
                        );
                    }
                    return false;
                });
                if (isPersonMarked) sentenceHasHiddenSubject = true;
            }
        });
        
        if (pattern.length === 0) return null;
        
        let cleanedPattern = pattern.filter((v, i, a) => v !== a[i - 1]).join('');
        const targetOrder = config.syntaxOrder || 'SVO';
        let isValid = cleanedPattern === targetOrder || cleanedPattern.includes(targetOrder);
        
        if (!isValid && sentenceHasHiddenSubject && !cleanedPattern.includes('S')) {
            const targetWithoutS = targetOrder.replace('S', '');
            if (cleanedPattern === targetWithoutS || cleanedPattern.includes(targetWithoutS)) {
                isValid = true;
                cleanedPattern = `${cleanedPattern} (+ Agglutinated S)`;
            }
        }
        
        return { isValid, cleanedPattern, targetOrder };
    }, [analyzedWords, config.syntaxOrder, config.personRules]);

    // Spin up a rough English translation based on the found roots and grammar tags
    const handleTranslate = () => {
        if (analyzedWords.length === 0) return;
        
        const subjects = [];
        const verbs = []; 
        const objects = []; 
        const others = [];
        
        analyzedWords.forEach(wData => {
            if (wData.parsings.length === 0) {
                others.push("???"); return;
            }
            
            const parse = wData.parsings[wData.selectedIdx];
            const transLower = parse.root.translation?.toLowerCase() || '';
            
            let role = wData.manualRole;
            if (!role) {
                const isObjTrans = ['acc', 'acu', 'obj', 'dat', 'patient'].some(t => transLower.includes(t));
                const isObjRule = parse.rules.some(r => ['acc', 'acu', 'obj', 'dat', 'patient'].some(t => r.name.toLowerCase().includes(t)));
                const isObj = isObjTrans || isObjRule;
                const isSubj = (parse.root.wordClass === 'noun' || parse.root.wordClass === 'pronoun') && !isObj;
                role = (parse.root.wordClass === 'verb') ? 'V' : (isObj ? 'O' : (isSubj ? 'S' : ''));
            }
            
            let baseTrans = parse.root.translation?.split(',')[0].trim() || parse.root.word;
            if (role === 'V' && baseTrans.toLowerCase().startsWith('to ')) baseTrans = baseTrans.substring(3);
            
            const pronouns = { '1s': 'I', '2s': 'you', '3s': 'he/she/it', '1p': 'we', '2p': 'you', '3p': 'they' };
            const remainingTags = [];
            let hiddenPronoun = null;
            
            parse.rules.forEach(r => {
                const n = r.name.toLowerCase();
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
            
            const approximatedWord = remainingTags.length > 0 ? `${baseTrans} [${remainingTags.join(', ')}]` : baseTrans;
            
            if (role === 'S') subjects.push(approximatedWord);
            else if (role === 'V') verbs.push(approximatedWord);
            else if (role === 'O') objects.push(approximatedWord);
            else others.push(approximatedWord);
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
                <Button onClick={handleAnalyze} variant='edit' className="execute-analysis-btn">
                    <div className="analyzer-btn-content"><Search size={18} /> Execute Analysis</div>
                </Button>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Analysis Results">
                {analyzedWords.length > 0 && (
                    <div className="analyzer-modal-content">
                        {syntaxStatus && (
                            <div className={`syntax-status-box ${syntaxStatus.isValid ? 'status-valid' : 'status-invalid'}`}>
                                {syntaxStatus.isValid ? (
                                    <>
                                        <CheckCircle2 size={16} className="status-icon"/> 
                                        <b>Valid Syntax!</b> Sentence matches <b>{syntaxStatus.targetOrder}</b> order.
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle size={16} className="status-icon"/> 
                                        <b>Warning:</b> Detected <b>{syntaxStatus.cleanedPattern}</b> instead of <b>{syntaxStatus.targetOrder}</b>.
                                    </>
                                )}
                            </div>
                        )}
    
                    <div className="parsed-words-grid">
                        {analyzedWords.map((wData, i) => {
                            const isAmbig = wData.parsings.length > 1;
                            const isSylError = !isStrictlySyllabic(wData.original);
                                const parse = wData.parsings.length > 0 ? wData.parsings[wData.selectedIdx] : null;
                                
                                const cardStateClass = wData.parsings.length === 0 || isSylError 
                                    ? 'card-error' 
                                    : isAmbig ? 'card-warning' : 'card-default';

                            return (
                                    <div key={i} className={`parsed-word-card ${cardStateClass}`}>
                                        {!parse ? (
                                            <>
                                                <div className="notranslate custom-font-text unknown-root-text">{wData.original}</div>
                                                <div className="unknown-root-label"><HelpCircle size={14} style={{display: 'inline', marginBottom: '-2px', marginRight: '4px'}} />Unknown Root</div>
                                            </>
                                        ) : (
                                            <>
                                                {isAmbig && <div className="warning-badge ambig"><AlertTriangle size={14} style={{display: 'inline', marginBottom: '-2px', marginRight: '4px'}} />Ambiguous Parse</div>}
                                                {isSylError && <div className="warning-badge err"><XCircle size={14} style={{display: 'inline', marginBottom: '-2px', marginRight: '4px'}} />Invalid Syllables</div>}
                                                
                                                {isAmbig && (
                                                    <select className="analyzer-select" value={wData.selectedIdx} onChange={(e) => handleParsingChange(i, e.target.value)}>
                                                        {wData.parsings.map((pOpt, idx) => (
                                                            <option key={idx} value={idx}>[{pOpt.root.wordClass}] {pOpt.root.translation}</option>
                                                        ))}
                                                    </select>
                                                )}
                                                
                                                <select className="analyzer-select mt-4" value={wData.manualRole || ''} onChange={(e) => handleRoleChange(i, e.target.value)}>
                                                    <option value="">- Auto Role -</option>
                                                    <option value="S">S (Subject)</option>
                                                    <option value="V">V (Verb)</option>
                                                    <option value="O">O (Object)</option>
                                                </select>
                                                
                                                <div className="notranslate custom-font-text word-original">{transliterate(wData.original)}</div>
                                                <div className="notranslate word-root-label">Root: {transliterate(parse.root.word)}</div>
                                                <div className="word-translation">{parse.root.translation}</div>
                                                <div className="rules-container">
                                                    {parse.rules.map((r, idx) => (
                                                        <span key={idx} className="rule-badge">{r.name}</span>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="translation-section">
                        <Button variant="imp" onClick={handleTranslate}><div className="analyzer-btn-content"><Languages size={18} /> Generate Approximate Translation</div></Button>
                            {translation && (
                                <div className="translation-result-box" style={{ position: 'relative' }}>
                                    <div className="translation-label">Approximate Translation (SVO)</div>
                                    <div className="translation-text">{translation}.</div>
                                    <Button 
                                        variant="ipa" 
                                        onClick={() => handleListen(translation)}
                                        style={{ position: 'absolute', top: '10px', right: '10px' }}
                                    >
                                        <Volume2 size={14} /> Listen
                                    </Button>
                                </div>
                            )}
                    </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import Card from '@/components/UI/Card/Card.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import { useWordGenerator } from '@/hooks/useWordGenerator.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { applyRuleToWord, expandWildcardDependencies } from '@/utils/morphologyEngine.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import { validateNewWord } from '@/utils/validationEngine.jsx';
import { commonWords } from '@/components/pages/wordgenerator/commonWords.jsx';
import { Wand2, Send, Dna, BookCopy, SkipForward, Check, Settings2, Download, SlidersHorizontal, ListChecks, Dice5, Loader2 } from 'lucide-react';
import { fetchDefinitionForWord, fetchSynonymOptions } from '@/utils/semanticUtils.js';
import toast from 'react-hot-toast';
import './generatorTab.css';


export default function GeneratorTab() {
    const { transliterate } = useTransliterator();
    const { generatedWord, generatedIpa, generatedClass, generateWord } = useWordGenerator();
    const [selectedLengths, setSelectedLengths] = useState([2, 3]);
    const [targetClass, setTargetClass] = useState('random');
    const navigate = useNavigate();

    // Pull global state required for the Derivations Preview
    const grammarRules = useConfigStore((state) => state.grammarRules) || [];
    const vowels = useConfigStore((state) => state.vowels);
    const consonants = useConfigStore((state) => state.consonants);
    const otherPhonemes = useConfigStore((state) => state.otherPhonemes);
    const verbMarker = useConfigStore((state) => state.verbMarker);
    const cliticsRules = useConfigStore((state) => state.cliticsRules);
    const generatorMarkers = useConfigStore((state) => state.generatorMarkers) || {};
    const syllablePattern = useConfigStore((state) => state.syllablePattern) || '';
    const syllablePatternWeights = useConfigStore((state) => state.syllablePatternWeights) || {};
    const updateConfig = useConfigStore((state) => state.updateConfig);
    
    const [showMarkerConfig, setShowMarkerConfig] = useState(false);
    const [showWeightConfig, setShowWeightConfig] = useState(false);
    
    // Parse the syllable patterns from the config for the weight UI
    const parsedPatterns = useMemo(() => {
        return (syllablePattern || '')
            .toUpperCase()
            .split(/[\s,]+/)
            .filter(Boolean);
    }, [syllablePattern]);

    // Compute effective percentages for display
    const patternPercentages = useMemo(() => {
        if (parsedPatterns.length === 0) return {};
        const weights = parsedPatterns.map(p => {
            const w = syllablePatternWeights[p] ?? syllablePatternWeights[p.toLowerCase()];
            return (w !== undefined && w >= 0) ? w : 1;
        });
        const total = weights.reduce((s, w) => s + w, 0);
        const result = {};
        parsedPatterns.forEach((p, i) => {
            result[p] = total > 0 ? Math.round((weights[i] / total) * 100) : 0;
        });
        return result;
    }, [parsedPatterns, syllablePatternWeights]);
    
    const handleWeightChange = (pattern, value) => {
        const numVal = Math.max(0, Number(value) || 0);
        updateConfig({ syllablePatternWeights: { ...syllablePatternWeights, [pattern]: numVal } });
    };

    const [isFillMode, setIsFillMode] = useState(false);
    const [isBatchMode, setIsBatchMode] = useState(false);
    const [isListFillMode, setIsListFillMode] = useState(false);

    const handleGenerate = () => {
        if (selectedLengths.length === 0) return toast.error("Please select at least one syllable length.");
        generateWord(selectedLengths, targetClass);
    };

    const handleSendToCreateWord = () => {
        navigate('/create', { 
            state: { 
                prefillWord: generatedWord, 
                prefillIpa: generatedIpa,
                prefillClass: generatedClass 
            } 
        });
    };

    // Import markers from grammar rules — picks the first rule that applies uniquely to each class.
    // Verbs are always sourced from the dedicated verbMarker setting, never from grammar rules
    // (which contain inflections like past tense, not the base class marker).
    const handleImportFromGrammar = () => {
        const CLASSES = ['noun', 'adjective', 'adverb', 'pronoun', 'particle'];
        const imported = { ...generatorMarkers };

        CLASSES.forEach(cls => {
            // Only import a rule whose name exactly matches the class (e.g. "noun" rule → noun marker)
            const specificRule = grammarRules.find(r =>
                r.name.trim().toLowerCase() === cls && r.affix
            );
            if (specificRule) {
                imported[cls] = specificRule.affix;
            }
        });

        // Verb marker always comes from the dedicated verbMarker setting, not grammar rules
        imported.verb = verbMarker ? verbMarker.split(',')[0].trim() : (imported.verb || '');

        updateConfig({ generatorMarkers: imported });
    };

    const handleMarkerChange = (cls, value) => {
        updateConfig({ generatorMarkers: { ...generatorMarkers, [cls]: value } });
    };

    // Generate the live preview of declensions/conjugations
    const derivations = useMemo(() => {
        if (!generatedWord) return [];
        
        let base = generatedWord;
        
        if (cliticsRules) {
            const clitics = cliticsRules.split(',').map(c => c.trim().replace(/^-/, '')).filter(Boolean);
            const matchedClitic = clitics.find(c => base.endsWith(c));
            if (matchedClitic) base = base.slice(0, -matchedClitic.length);
        }
        if (generatedClass === 'verb' && verbMarker) {
            const markers = verbMarker.split(',').map(m => m.trim().replace(/^-/, '')).filter(Boolean);
            const matchedMarker = markers.find(m => base.endsWith(m));
            if (matchedMarker) base = base.slice(0, -matchedMarker.length);
        }

        let applicableRules = grammarRules.filter(rule => {
            const classes = (rule.appliesTo || 'all').split(',').map(c => c.trim().toLowerCase());
            return classes.includes('all') || classes.includes(generatedClass.toLowerCase());
        });
        
        applicableRules = expandWildcardDependencies(applicableRules, grammarRules);

        return applicableRules.map(rule => {
            const result = applyRuleToWord(base, rule, grammarRules, vowels, consonants, otherPhonemes);
            return { name: rule.name, result };
        });
    }, [generatedWord, generatedClass, grammarRules, vowels, verbMarker, cliticsRules]);

    if (isFillMode) return <FillMode onExit={() => setIsFillMode(false)} />;
    if (isBatchMode) return <BatchMode onExit={() => setIsBatchMode(false)} />;
    if (isListFillMode) return <ListFillMode onExit={() => setIsListFillMode(false)} />;

    return (
        <div className="generator-container">
            <Card>
                <h2 className='flex sg-title generator-header-title'>
                    <Dna /> Word Generator
                </h2>
                <p className="generator-description">Configure the parameters below to generate a new phonotactically valid word based on your conlang's rules.</p>
                
                <div className="generator-input-row">
                    <div className="generator-input-group">
                        <label className="generator-label">Syllable Length(s) (Select multiple)</label>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {[1, 2, 3, 4, 5, 6, 7].map(len => (
                                <button
                                    key={len}
                                    onClick={() => {
                                        if (selectedLengths.includes(len)) {
                                            if (selectedLengths.length > 1) {
                                                setSelectedLengths(selectedLengths.filter(l => l !== len));
                                            }
                                        } else {
                                            setSelectedLengths([...selectedLengths, len].sort());
                                        }
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '4px',
                                        border: `1px solid ${selectedLengths.includes(len) ? 'var(--acc)' : 'var(--bd)'}`,
                                        background: selectedLengths.includes(len) ? 'var(--acc)' : 'var(--s1)',
                                        color: selectedLengths.includes(len) ? '#fff' : 'var(--tx)',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        minWidth: '40px',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center'
                                    }}
                                >
                                    {len}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="generator-input-group">
                        <label className="generator-label">Word Class</label>
                        <select 
                            className="generator-input"
                            value={targetClass} onChange={(e) => setTargetClass(e.target.value)}
                        >
                            <option value="random">Random</option>
                            <option value="noun">Noun</option>
                            <option value="verb">Verb</option>
                            <option value="adjective">Adjective</option>
                            <option value="adverb">Adverb</option>
                            <option value="pronoun">Pronoun</option>
                        </select>
                    </div>
                </div>
                <Button onClick={handleGenerate}><div className="generator-btn-content"><Wand2 size={18} /> Generate Word</div></Button>

                {/* ── Class Marker Config ── */}
                <div className="marker-config-section">
                    <button
                        className="marker-config-toggle"
                        onClick={() => setShowMarkerConfig(v => !v)}
                    >
                        <Settings2 size={15} />
                        Class Markers
                        <span className="marker-config-arrow">{showMarkerConfig ? '▲' : '▼'}</span>
                    </button>

                    {showMarkerConfig && (
                        <div className="marker-config-panel">
                            <div className="marker-config-header">
                                <p className="marker-config-desc">
                                    Set a suffix/prefix that the generator appends per word class. 
                                    Use the import button to auto-fill from your Grammar Tab rules.
                                </p>
                                <Button variant="edit" onClick={handleImportFromGrammar}>
                                    <Download size={14} /> Import from Grammar
                                </Button>
                            </div>
                            <div className="marker-config-grid">
                                {Object.entries(generatorMarkers).map(([cls, marker]) => (
                                    <div key={cls} className="marker-config-row">
                                        <label className="marker-config-label">{cls.charAt(0).toUpperCase() + cls.slice(1)}</label>
                                        <input
                                            type="text"
                                            className="generator-input marker-config-input"
                                            value={marker}
                                            onChange={e => handleMarkerChange(cls, e.target.value)}
                                            placeholder="e.g. -ki or none"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Syllable Pattern Weights ── */}
                <div className="marker-config-section">
                    <button
                        className="marker-config-toggle"
                        onClick={() => setShowWeightConfig(v => !v)}
                    >
                        <SlidersHorizontal size={15} />
                        Pattern Weights
                        <span className="marker-config-arrow">{showWeightConfig ? '▲' : '▼'}</span>
                    </button>

                    {showWeightConfig && (
                        <div className="marker-config-panel">
                            <p className="marker-config-desc">
                                Assign probability weights to each syllable pattern. Higher weight = more likely to be picked. Default is 1 for all patterns.
                            </p>
                            {parsedPatterns.length === 0 ? (
                                <p className="weight-empty">No syllable patterns defined. Set them in Settings → Phonology.</p>
                            ) : (
                                <div className="weight-grid">
                                    {parsedPatterns.map(pattern => {
                                        const weight = syllablePatternWeights[pattern] ?? syllablePatternWeights[pattern.toLowerCase()] ?? 1;
                                        const pct = patternPercentages[pattern] || 0;
                                        return (
                                            <div key={pattern} className="weight-row">
                                                <span className="weight-pattern-label">{pattern}</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    className="generator-input weight-input"
                                                    value={weight}
                                                    onChange={(e) => handleWeightChange(pattern, e.target.value)}
                                                />
                                                <div className="weight-bar-container">
                                                    <div className="weight-bar-fill" style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="weight-pct">{pct}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="fill-mode-prompt" style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
                    <Button variant="edit" onClick={() => setIsFillMode(true)}>
                        <BookCopy size={18} /> Fill Mode
                    </Button>
                    <Button variant="imp" onClick={() => setIsBatchMode(true)}>
                        <Wand2 size={18} /> Batch Generator
                    </Button>
                    <Button variant="save" onClick={() => setIsListFillMode(true)}>
                        <ListChecks size={18} /> Vocab Checklist
                    </Button>
                </div>
            </Card>


            {generatedWord && (
                <Card>
                    <h2 className='flex sg-title' style={{ marginBottom: 0 }}>Laboratory Result</h2>
                    <div className="generator-result-section">
                        <h1 className="custom-font-text notranslate generator-result-word">{transliterate(generatedWord)}</h1>
                        <p className="generator-result-meta"><span className="notranslate generator-ipa">/{generatedIpa}/</span> <span className="generator-separator">|</span> <span className="generator-class-badge">{generatedClass}</span></p>
                    </div>
                    {derivations.length > 0 && (
                        <div className="derivation-preview-section">
                            <h3 className="derivation-preview-title">Derivation Preview</h3>
                            <div className="derivation-grid">
                                {derivations.map((d, i) => (<div key={i} className="derivation-item"><span className="derivation-rule-name">{d.name}</span><span className="custom-font-text notranslate derivation-result-word">{transliterate(d.result || '') || '---'}</span></div>))}
                            </div>
                        </div>
                    )}
                    <div className="generator-actions"><Button variant="imp" onClick={handleSendToCreateWord}><div className="generator-btn-content"><Send size={18} /> Send to Create Word</div></Button></div>
                </Card>
            )}
        </div>
    );
}

function FillMode({ onExit }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [conlangWord, setConlangWord] = useState('');
    
    const addWord = useLexiconStore((state) => state.addWord);
    const checkDuplicate = useLexiconStore((state) => state.checkDuplicate);
    const lexicon = useLexiconStore((state) => state.lexicon) || [];
    const configData = useConfigStore();
    const { normalizeToBase } = useTransliterator();

    const availableWords = useMemo(() => {
        return commonWords.filter(cw => {
            const target = cw.word.toLowerCase();
            return !lexicon.some(lw => {
                let trans = (lw.translation || '').toLowerCase().trim();
                
                // Clean up translation by removing text in parentheses or brackets
                const cleanTrans = trans.replace(/\s*[([].*?[)\]]\s*/g, ' ').trim();

                // Exact match or exact match with "to " prefix
                if (cleanTrans === target || cleanTrans === `to ${target}`) return true;
                
                // Match within comma/slash separated lists (e.g. "sun, day", "to run / to jog")
                const parts = cleanTrans.split(/[,\/;|]+/).map(p => p.trim());
                return parts.some(p => p === target || p === `to ${target}`);
            });
        });
    }, [lexicon]);

    const safeIndex = currentIndex >= availableWords.length ? 0 : currentIndex;
    const currentChallenge = availableWords[safeIndex];

    const handleSkip = () => {
        if (availableWords.length > 0) {
            setCurrentIndex(prev => (prev + 1) % availableWords.length);
        }
        setConlangWord('');
    };

    const handleSaveAndNext = () => {
        const translation = currentChallenge.word;
        const wordClass = currentChallenge.class;

        if (!conlangWord.trim()) {
            alert("Please enter a translation.");
            return;
        }
        const { isDuplicateWord, isDuplicateTranslation } = checkDuplicate(conlangWord, translation);
        if (isDuplicateWord || isDuplicateTranslation) {
            alert("This word or translation already exists in your lexicon!");
            return;
        }

        const safeWord = normalizeToBase(conlangWord.trim());
        const validation = validateNewWord(safeWord, configData, wordClass, []);

        // Complete mode hard-blocks vowel harmony violations
        if (!validation.valid && validation.type === 'vowel_harmony') {
            const mode = configData.vowelHarmonyMode || 'complete';
            if (mode === 'complete') {
                alert(`Vowel harmony violation: ${validation.reason}\n\nComplete mode - save blocked.`);
                return;
            }
            // Flexible mode - block with user-facing override
            const proceed = window.confirm(
                `⚠️ Vowel Harmony Warning:\n${validation.reason}\n\nThis word class is not in the exempt list. Save anyway?`
            );
            if (!proceed) return;
        } else if (!validation.valid) {
            const proceed = window.confirm(
                `⚠️ Phono-Syntax Warning:\n${validation.reason}\n\nDo you want to save it as an irregular exception anyway?`
            );
            if (!proceed) return;
        }

        addWord({
            word: safeWord,
            wordClass: wordClass,
            translation: translation,
        });

        setConlangWord('');
        if (currentIndex >= availableWords.length - 1) {
            setCurrentIndex(0);
        }
    };

    if (availableWords.length === 0) {
        return (
            <div className="fill-mode-container">
                <Card>
                    <div className="fill-mode-header">
                        <h2 className='flex sg-title'><BookCopy /> Fill Mode</h2>
                        <Button variant="cancel" onClick={onExit}>Exit Fill Mode</Button>
                    </div>
                    <div className="explore-empty">
                        <Check size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                        <h3>All done!</h3>
                        <p>You have translated all available common words into your lexicon.</p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="fill-mode-container">
            <Card>
                <div className="fill-mode-header">
                    <h2 className='flex sg-title'><BookCopy /> Fill Mode</h2>
                    <Button variant="cancel" onClick={onExit}>Exit Fill Mode</Button>
                </div>
                <p>Translate the common English word into your conlang. The word will be validated and added to your lexicon.</p>
                
                <div className="fill-challenge">
                    <div className="challenge-word-container">
                        <p className="challenge-label">Translate:</p>
                        <h1 className="challenge-word">{currentChallenge.word}</h1>
                        <p className="challenge-class">({currentChallenge.class})</p>
                    </div>
                    <Input
                        label="Your Conlang's Word"
                        value={conlangWord}
                        onChange={(e) => setConlangWord(e.target.value)}
                        placeholder="e.g., makin"
                        className="custom-font-text notranslate"
                        autoFocus
                    />
                </div>

                <div className="fill-actions">
                    <Button variant="default" onClick={handleSkip}><SkipForward size={18} /> Skip</Button>
                    <Button variant="save" onClick={handleSaveAndNext}><Check size={18} /> Save and Next</Button>
                </div>
            </Card>
        </div>
    );
}

function BatchMode({ onExit }) {
    const { transliterate } = useTransliterator();
    const { generateWord } = useWordGenerator();
    const addWord = useLexiconStore((state) => state.addWord);
    
    const [batchSize, setBatchSize] = useState(20);
    const [selectedLengths, setSelectedLengths] = useState([2, 3]);
    const [generatedBatch, setGeneratedBatch] = useState([]);
    const [selectedWords, setSelectedWords] = useState(new Set());
    const [translations, setTranslations] = useState({});

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 50;

    const handleGenerateBatch = () => {
        if (selectedLengths.length === 0) return toast.error("Select at least one syllable length");
        const newBatch = [];
        const seenWords = new Set();
        for (let i = 0; i < batchSize; i++) {
            const result = generateWord(selectedLengths, 'random');
            if (result && !seenWords.has(result.word)) {
                seenWords.add(result.word);
                newBatch.push({ ...result, id: crypto.randomUUID() });
            }
        }
        setGeneratedBatch(newBatch);
        setSelectedWords(new Set());
        setTranslations({});
        setCurrentPage(1);
    };

    const toggleSelection = (id) => {
        const newSet = new Set(selectedWords);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedWords(newSet);
    };

    const updateTranslation = (id, val) => {
        setTranslations(prev => ({ ...prev, [id]: val }));
        
        // Auto-select if they start typing a translation
        if (val.trim() && !selectedWords.has(id)) {
            toggleSelection(id);
        }
    };

    const handleSaveSelected = () => {
        let savedCount = 0;
        selectedWords.forEach(id => {
            const entry = generatedBatch.find(w => w.id === id);
            if (entry) {
                addWord({
                    word: entry.word,
                    wordClass: entry.wordClass,
                    translation: translations[id] || 'Unknown',
                });
                savedCount++;
            }
        });
        
        alert(`Successfully saved ${savedCount} words to the lexicon!`);
        
        // Remove saved words from the batch
        setGeneratedBatch(prev => {
            const newBatch = prev.filter(w => !selectedWords.has(w.id));
            // Adjust page if we deleted the last items on current page
            const newTotalPages = Math.ceil(newBatch.length / PAGE_SIZE);
            if (currentPage > newTotalPages && newTotalPages > 0) {
                setCurrentPage(newTotalPages);
            }
            return newBatch;
        });
        setSelectedWords(new Set());
    };

    const totalPages = Math.ceil(generatedBatch.length / PAGE_SIZE);
    const paginatedBatch = generatedBatch.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    return (
        <div className="fill-mode-container">
            <Card>
                <div className="fill-mode-header">
                    <h2 className='flex sg-title'><Wand2 /> Batch Auto-Generator</h2>
                    <Button variant="cancel" onClick={onExit}>Exit Batch Mode</Button>
                </div>
                <p>Generate a bulk list of phonotactically valid words. Select the ones you like, give them a translation, and save them directly to your Lexicon.</p>
                
                <div className="generator-input-row" style={{ marginTop: '20px' }}>
                    <div className="generator-input-group">
                        <label className="generator-label">Words to Generate (Max 3000)</label>
                        <input 
                            type="number" min="5" max="3000"
                            className="generator-input"
                            value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} 
                        />
                    </div>
                    <div className="generator-input-group">
                        <label className="generator-label">Syllable Length(s)</label>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {[1, 2, 3, 4, 5, 6, 7].map(len => (
                                <button
                                    key={len}
                                    onClick={() => {
                                        if (selectedLengths.includes(len)) {
                                            if (selectedLengths.length > 1) {
                                                setSelectedLengths(selectedLengths.filter(l => l !== len));
                                            }
                                        } else {
                                            setSelectedLengths([...selectedLengths, len].sort());
                                        }
                                    }}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '4px',
                                        border: `1px solid ${selectedLengths.includes(len) ? 'var(--acc)' : 'var(--bd)'}`,
                                        background: selectedLengths.includes(len) ? 'var(--acc)' : 'var(--s1)',
                                        color: selectedLengths.includes(len) ? '#fff' : 'var(--tx)',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        minWidth: '35px',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center'
                                    }}
                                >
                                    {len}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                
                <Button variant="imp" onClick={handleGenerateBatch} style={{ marginBottom: '20px' }}>
                    Generate {batchSize} Words
                </Button>

                {generatedBatch.length > 0 && (
                    <div className="batch-results">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                            <h3 style={{ margin: 0, color: 'var(--tx2)' }}>Results ({generatedBatch.length})</h3>
                            
                            {totalPages > 1 && (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <Button 
                                        variant="default" 
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        Prev
                                    </Button>
                                    <span style={{ color: 'var(--tx2)', fontSize: '0.9rem' }}>
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <Button 
                                        variant="default" 
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                    </Button>
                                </div>
                            )}

                            <Button 
                                variant="save" 
                                onClick={handleSaveSelected}
                                disabled={selectedWords.size === 0}
                            >
                                Save Selected ({selectedWords.size})
                            </Button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '450px', overflowY: 'auto', paddingRight: '10px' }}>
                            {paginatedBatch.map(item => (
                                <div 
                                    key={item.id} 
                                    style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'auto 1fr 1fr', 
                                        gap: '15px', 
                                        alignItems: 'center',
                                        background: selectedWords.has(item.id) ? 'var(--s3)' : 'var(--s2)',
                                        padding: '10px 15px',
                                        borderRadius: '8px',
                                        border: `1px solid ${selectedWords.has(item.id) ? 'var(--acc)' : 'transparent'}`,
                                        cursor: 'pointer'
                                    }}
                                    onClick={(e) => {
                                        // Don't toggle if they clicked the input
                                        if (e.target.tagName !== 'INPUT') toggleSelection(item.id);
                                    }}
                                >
                                    <input 
                                        type="checkbox" 
                                        checked={selectedWords.has(item.id)}
                                        onChange={() => toggleSelection(item.id)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <div>
                                        <div className="custom-font-text notranslate" style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--tx)' }}>{transliterate(item.word)}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--tx3)' }}>/{item.ipa}/ • {item.wordClass}</div>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Enter translation..." 
                                        className="generator-input"
                                        value={translations[item.id] || ''}
                                        onChange={(e) => updateTranslation(item.id, e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ margin: 0 }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}

function ListFillMode({ onExit }) {
    const { generateWord } = useWordGenerator();
    const addWord = useLexiconStore((state) => state.addWord);
    const lexicon = useLexiconStore((state) => state.lexicon) || [];
    const { normalizeToBase } = useTransliterator();
    
    const [batchSize, setBatchSize] = useState(15);
    const [minSyllables, setMinSyllables] = useState(2);
    const [maxSyllables, setMaxSyllables] = useState(2);
    const [autoFetchSemantics, setAutoFetchSemantics] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Filtering and pagination
    const [posFilter, setPosFilter] = useState('all');
    const [topicFilter, setTopicFilter] = useState('');
    const [offset, setOffset] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Track state for each row
    const [rows, setRows] = useState([]);
    const [selectedWords, setSelectedWords] = useState(new Set());

    const loadMore = async (reset = false) => {
        setIsLoading(true);
        let sourceWords = [];
        let currentOffset = reset ? 0 : offset;
        
        if (topicFilter.trim()) {
            try {
                const res = await fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(topicFilter.trim())}&md=p&max=200`);
                if (res.ok) {
                    const data = await res.json();
                    sourceWords = data.map(item => {
                        let pos = 'noun';
                        if (item.tags) {
                            if (item.tags.includes('v')) pos = 'verb';
                            else if (item.tags.includes('adj')) pos = 'adjective';
                            else if (item.tags.includes('adv')) pos = 'adverb';
                            else if (item.tags.includes('u')) pos = 'particle';
                        }
                        return { word: item.word, class: pos };
                    });
                }
            } catch (e) {
                toast.error("Failed to fetch topic words");
                sourceWords = commonWords;
            }
        } else {
            sourceWords = commonWords;
        }

        // Apply POS filter
        if (posFilter !== 'all') {
            sourceWords = sourceWords.filter(cw => cw.class === posFilter);
        }

        // Filter out existing lexicon
        const untranslated = sourceWords.filter(cw => {
            const target = cw.word.toLowerCase();
            const safeTarget = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${safeTarget}\\b`, 'i');
            return !lexicon.some(lw => {
                let trans = (lw.translation || '').toLowerCase();
                return regex.test(trans);
            });
        });

        const nextBatch = untranslated.slice(currentOffset, currentOffset + batchSize).map(cw => ({
            id: crypto.randomUUID(),
            englishWord: cw.word,
            conlangWord: '',
            wordClass: cw.class,
            tags: topicFilter.trim() ? topicFilter.trim() : '',
            description: ''
        }));

        if (nextBatch.length > 0) {
            setRows(prev => reset ? nextBatch : [...prev, ...nextBatch]);
            setOffset(currentOffset + batchSize);
        } else {
            if (reset) setRows([]);
            toast("No more words found for these criteria!", { icon: 'ℹ️' });
        }
        
        setSelectedWords(new Set());
        setIsLoading(false);
    };

    // Load initial batch only once
    React.useEffect(() => {
        loadMore(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const updateRow = (id, field, val) => {
        setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
        if (field === 'conlangWord' && val.trim() && !selectedWords.has(id)) {
            toggleSelection(id);
        }
    };

    const rollDice = (id, wordClass) => {
        const result = generateWord(minSyllables, maxSyllables, wordClass);
        if (result) {
            updateRow(id, 'conlangWord', result.word);
            updateRow(id, 'wordClass', result.wordClass || wordClass);
        }
    };

    const toggleSelection = (id) => {
        const newSet = new Set(selectedWords);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedWords(newSet);
    };

    const handleSaveSelected = async () => {
        setIsSaving(true);
        let savedCount = 0;
        
        const selectedRows = rows.filter(r => selectedWords.has(r.id) && r.conlangWord.trim());
        
        for (const row of selectedRows) {
            const safeWord = normalizeToBase(row.conlangWord.trim());
            let finalDesc = row.description.trim();
            let finalRelated = [];
            let finalTags = row.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

            if (autoFetchSemantics) {
                if (!finalDesc) {
                    try {
                        const def = await fetchDefinitionForWord(row.englishWord, row.wordClass);
                        if (def) finalDesc = def;
                    } catch (e) {}
                }
                try {
                    const syns = await fetchSynonymOptions(row.englishWord);
                    if (syns && syns.length > 0) {
                        const topPicks = [...new Set(syns.map(s => s.lemma.toLowerCase()))].slice(0, 5);
                        finalRelated = topPicks;
                    }
                } catch (e) {}
            }

            addWord({
                word: safeWord,
                wordClass: row.wordClass,
                translation: row.englishWord,
                definition: finalDesc,
                tags: finalTags,
                relatedWords: finalRelated
            });
            savedCount++;
        }
        
        setIsSaving(false);
        toast.success(`Successfully saved ${savedCount} words!`);
        
        // Remove saved from list
        setRows(prev => prev.filter(r => !selectedWords.has(r.id) || !r.conlangWord.trim()));
        setSelectedWords(new Set());
    };

    if (rows.length === 0 && !isLoading && !topicFilter && posFilter === 'all') {
        return (
            <div className="fill-mode-container">
                <Card>
                    <div className="fill-mode-header">
                        <h2 className='flex sg-title'><ListChecks /> Vocab Checklist</h2>
                        <Button variant="cancel" onClick={onExit}>Exit</Button>
                    </div>
                    <div className="explore-empty">
                        <Check size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                        <h3>All done!</h3>
                        <p>You have translated all available common words into your lexicon.</p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="fill-mode-container">
            <Card>
                <div className="fill-mode-header">
                    <h2 className='flex sg-title'><ListChecks /> Vocab Checklist</h2>
                    <Button variant="cancel" onClick={onExit}>Exit</Button>
                </div>
                <p>A checklist of untranslated English words. Fill in your conlang words, adjust tags and descriptions, and save them in bulk.</p>
                
                <div className="generator-input-row" style={{ marginTop: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="generator-input-group">
                        <label className="generator-label">Topic / Category</label>
                        <input 
                            type="text" 
                            placeholder="e.g. nature, emotion (optional)"
                            className="generator-input"
                            value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} 
                        />
                    </div>
                    <div className="generator-input-group">
                        <label className="generator-label">Part of Speech</label>
                        <select 
                            className="generator-input"
                            value={posFilter} onChange={(e) => setPosFilter(e.target.value)}
                        >
                            <option value="all">All</option>
                            <option value="noun">Noun</option>
                            <option value="verb">Verb</option>
                            <option value="adjective">Adjective</option>
                            <option value="adverb">Adverb</option>
                        </select>
                    </div>
                    <div className="generator-input-group">
                        <label className="generator-label">Words per Page</label>
                        <input 
                            type="number" min="5" max="50"
                            className="generator-input"
                            value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} 
                        />
                    </div>
                    <div className="generator-input-group">
                        <label className="generator-label">Syllable Length (Auto-gen)</label>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <input 
                                type="number" min="1" max="10"
                                className="generator-input"
                                value={minSyllables} onChange={(e) => { const v = Number(e.target.value); setMinSyllables(v); if (v > maxSyllables) setMaxSyllables(v); }}
                                style={{ flex: 1, margin: 0 }}
                            />
                            <span style={{ color: 'var(--tx2)', fontSize: '0.8rem' }}>to</span>
                            <input 
                                type="number" min={minSyllables} max="10"
                                className="generator-input"
                                value={maxSyllables} onChange={(e) => { const v = Number(e.target.value); if (v >= minSyllables) setMaxSyllables(v); }}
                                style={{ flex: 1, margin: 0 }}
                            />
                        </div>
                    </div>
                    <Button variant="imp" onClick={() => loadMore(true)} disabled={isLoading}>
                        {isLoading ? <Loader2 size={16} className="spinner" /> : 'Search / Reset'}
                    </Button>
                    <Button variant="default" onClick={() => loadMore(false)} disabled={isLoading}>
                        Load Next
                    </Button>
                </div>
                
                <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input 
                        type="checkbox" 
                        id="autoFetchOpt"
                        checked={autoFetchSemantics} 
                        onChange={(e) => setAutoFetchSemantics(e.target.checked)} 
                    />
                    <label htmlFor="autoFetchOpt" style={{ cursor: 'pointer', color: 'var(--tx)' }}>Auto-fetch Definitions & Related Words on save</label>
                </div>

                {rows.length > 0 && (
                    <div className="batch-results" style={{ marginTop: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, color: 'var(--tx2)' }}>Words ({rows.length})</h3>
                            <Button 
                                variant="save" 
                                onClick={handleSaveSelected}
                                disabled={selectedWords.size === 0 || isSaving}
                            >
                                {isSaving ? <><Loader2 size={16} className="spinner" /> Saving...</> : `Save Selected (${selectedWords.size})`}
                            </Button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto', paddingRight: '10px' }}>
                            {rows.map(row => (
                                <div 
                                    key={row.id} 
                                    style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'auto 200px 1fr', 
                                        gap: '15px', 
                                        background: selectedWords.has(row.id) ? 'var(--s3)' : 'var(--s2)',
                                        padding: '15px',
                                        borderRadius: '8px',
                                        border: `1px solid ${selectedWords.has(row.id) ? 'var(--acc)' : 'transparent'}`
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', paddingTop: '10px' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedWords.has(row.id)}
                                            onChange={() => toggleSelection(row.id)}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--tx)', textTransform: 'capitalize' }}>
                                            {row.englishWord}
                                        </div>
                                        <select 
                                            className="generator-input" 
                                            style={{ padding: '4px', fontSize: '0.85rem' }}
                                            value={row.wordClass}
                                            onChange={(e) => updateRow(row.id, 'wordClass', e.target.value)}
                                        >
                                            <option value="noun">Noun</option>
                                            <option value="verb">Verb</option>
                                            <option value="adjective">Adjective</option>
                                            <option value="adverb">Adverb</option>
                                            <option value="pronoun">Pronoun</option>
                                            <option value="particle">Particle</option>
                                        </select>
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <input 
                                                type="text" 
                                                placeholder="Conlang Word..." 
                                                className="generator-input custom-font-text notranslate"
                                                value={row.conlangWord}
                                                onChange={(e) => updateRow(row.id, 'conlangWord', e.target.value)}
                                                style={{ flex: 1, margin: 0 }}
                                            />
                                            <button 
                                                className="icon-btn" 
                                                style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 'var(--rad-sm)', padding: '0 10px', color: 'var(--tx)' }}
                                                title="Roll random valid word"
                                                onClick={() => rollDice(row.id, row.wordClass)}
                                            >
                                                <Dice5 size={18} />
                                            </button>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <input 
                                                type="text" 
                                                placeholder="Tags (comma separated)..." 
                                                className="generator-input"
                                                value={row.tags}
                                                onChange={(e) => updateRow(row.id, 'tags', e.target.value)}
                                                style={{ margin: 0, fontSize: '0.85rem', padding: '6px' }}
                                            />
                                            <input 
                                                type="text" 
                                                placeholder="Description..." 
                                                className="generator-input"
                                                value={row.description}
                                                onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                                                style={{ margin: 0, fontSize: '0.85rem', padding: '6px' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}


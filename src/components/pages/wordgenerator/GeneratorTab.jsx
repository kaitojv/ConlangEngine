import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import Card from '@/components/UI/Card/Card.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import { useWordGenerator } from '@/hooks/useWordGenerator.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { applyRuleToWord } from '@/utils/morphologyEngine.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import { validateNewWord } from '@/utils/validationEngine.jsx';
import { commonWords } from '@/components/pages/wordgenerator/commonWords.jsx';
import { Wand2, Send, Dna, BookCopy, SkipForward, Check, Settings2, Download } from 'lucide-react';
import './generatorTab.css';


export default function GeneratorTab() {
    const { generatedWord, generatedIpa, generatedClass, generateWord } = useWordGenerator();
    const [numSyllables, setNumSyllables] = useState(2);
    const [targetClass, setTargetClass] = useState('random');
    const navigate = useNavigate();

    // Pull global state required for the Derivations Preview
    const grammarRules = useConfigStore((state) => state.grammarRules) || [];
    const vowels = useConfigStore((state) => state.vowels);
    const verbMarker = useConfigStore((state) => state.verbMarker);
    const cliticsRules = useConfigStore((state) => state.cliticsRules);
    const generatorMarkers = useConfigStore((state) => state.generatorMarkers) || {};
    const updateConfig = useConfigStore((state) => state.updateConfig);
    
    const [showMarkerConfig, setShowMarkerConfig] = useState(false);
    
    // UI State for different modes
    const [isFillMode, setIsFillMode] = useState(false);
    const [isBatchMode, setIsBatchMode] = useState(false);

    const handleGenerate = () => {
        generateWord(numSyllables, targetClass);
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

        const applicableRules = grammarRules.filter(rule => {
            const classes = (rule.appliesTo || 'all').split(',').map(c => c.trim().toLowerCase());
            return classes.includes('all') || classes.includes(generatedClass.toLowerCase());
        });

        return applicableRules.map(rule => {
            const result = applyRuleToWord(base, rule, grammarRules, vowels);
            return { name: rule.name, result };
        });
    }, [generatedWord, generatedClass, grammarRules, vowels, verbMarker, cliticsRules]);

    if (isFillMode) return <FillMode onExit={() => setIsFillMode(false)} />;
    if (isBatchMode) return <BatchMode onExit={() => setIsBatchMode(false)} />;

    return (
        <div className="generator-container">
            <Card>
                <h2 className='flex sg-title generator-header-title'>
                    <Dna /> Word Generator
                </h2>
                <p className="generator-description">Configure the parameters below to generate a new phonotactically valid word based on your conlang's rules.</p>
                
                <div className="generator-input-row">
                    <div className="generator-input-group">
                        <label className="generator-label">Syllable Count</label>
                        <input 
                            type="number" min="1" max="10"
                            className="generator-input"
                            value={numSyllables} onChange={(e) => setNumSyllables(Number(e.target.value))} 
                        />
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

                <div className="fill-mode-prompt" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <Button variant="edit" onClick={() => setIsFillMode(true)}>
                        <BookCopy size={18} /> Fill Mode
                    </Button>
                    <Button variant="imp" onClick={() => setIsBatchMode(true)}>
                        <Wand2 size={18} /> Batch Generator
                    </Button>
                </div>
            </Card>


            {generatedWord && (
                <Card>
                    <h2 className='flex sg-title' style={{ marginBottom: 0 }}>Laboratory Result</h2>
                    <div className="generator-result-section">
                        <h1 className="custom-font-text notranslate generator-result-word">{generatedWord}</h1>
                        <p className="generator-result-meta"><span className="notranslate generator-ipa">/{generatedIpa}/</span> <span className="generator-separator">|</span> <span className="generator-class-badge">{generatedClass}</span></p>
                    </div>
                    {derivations.length > 0 && (
                        <div className="derivation-preview-section">
                            <h3 className="derivation-preview-title">Derivation Preview</h3>
                            <div className="derivation-grid">
                                {derivations.map((d, i) => (<div key={i} className="derivation-item"><span className="derivation-rule-name">{d.name}</span><span className="custom-font-text notranslate derivation-result-word">{d.result || '---'}</span></div>))}
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
    const configData = useConfigStore();
    const { normalizeToBase } = useTransliterator();

    const currentChallenge = commonWords[currentIndex];

    const handleSkip = () => {
        setCurrentIndex(prev => (prev + 1) % commonWords.length);
        setConlangWord('');
    };

    const handleSaveAndNext = () => {
        const translation = currentChallenge.word;
        const wordClass = currentChallenge.class;

        if (!conlangWord.trim()) {
            alert("Please enter a translation.");
            return;
        }
        if (checkDuplicate(conlangWord, translation)) {
            alert("This word or translation already exists in your dictionary!");
            return;
        }

        const safeWord = normalizeToBase(conlangWord.trim());
        const validation = validateNewWord(safeWord, configData);
        
        if (!validation.valid) {
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

        handleSkip();
    };

    return (
        <div className="fill-mode-container">
            <Card>
                <div className="fill-mode-header">
                    <h2 className='flex sg-title'><BookCopy /> Fill Mode</h2>
                    <Button variant="cancel" onClick={onExit}>Exit Fill Mode</Button>
                </div>
                <p>Translate the common English word into your conlang. The word will be validated and added to your dictionary.</p>
                
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
    const { generateWord } = useWordGenerator();
    const addWord = useLexiconStore((state) => state.addWord);
    
    const [batchSize, setBatchSize] = useState(20);
    const [numSyllables, setNumSyllables] = useState(2);
    const [generatedBatch, setGeneratedBatch] = useState([]);
    const [selectedWords, setSelectedWords] = useState(new Set());
    const [translations, setTranslations] = useState({});

    const handleGenerateBatch = () => {
        const newBatch = [];
        for (let i = 0; i < batchSize; i++) {
            const result = generateWord(numSyllables, 'random');
            if (result && !newBatch.some(w => w.word === result.word)) {
                newBatch.push({ ...result, id: crypto.randomUUID() });
            }
        }
        setGeneratedBatch(newBatch);
        setSelectedWords(new Set());
        setTranslations({});
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
        
        alert(`Successfully saved ${savedCount} words to the dictionary!`);
        
        // Remove saved words from the batch
        setGeneratedBatch(prev => prev.filter(w => !selectedWords.has(w.id)));
        setSelectedWords(new Set());
    };

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
                        <label className="generator-label">Words to Generate</label>
                        <input 
                            type="number" min="5" max="50"
                            className="generator-input"
                            value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} 
                        />
                    </div>
                    <div className="generator-input-group">
                        <label className="generator-label">Syllables per Word</label>
                        <input 
                            type="number" min="1" max="10"
                            className="generator-input"
                            value={numSyllables} onChange={(e) => setNumSyllables(Number(e.target.value))} 
                        />
                    </div>
                </div>
                
                <Button variant="imp" onClick={handleGenerateBatch} style={{ marginBottom: '20px' }}>
                    Generate {batchSize} Words
                </Button>

                {generatedBatch.length > 0 && (
                    <div className="batch-results">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, color: 'var(--tx2)' }}>Results ({generatedBatch.length})</h3>
                            <Button 
                                variant="save" 
                                onClick={handleSaveSelected}
                                disabled={selectedWords.size === 0}
                            >
                                Save Selected ({selectedWords.size})
                            </Button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                            {generatedBatch.map(item => (
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
                                        <div className="custom-font-text notranslate" style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--tx)' }}>{item.word}</div>
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

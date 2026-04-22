import React, { useMemo, useState } from 'react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { applyRuleToWord, getPersonRules } from '@/utils/morphologyEngine.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import { Lightbulb, Edit2, Save } from 'lucide-react';
import './matrixmodal.css';

export default function MatrixModal({ wordObj }) {
    // Grab the language settings and dictionary from our global stores
    const grammarRules = useConfigStore((state) => state.grammarRules) || [];
    const vowels = useConfigStore((state) => state.vowels);
    const verbMarker = useConfigStore((state) => state.verbMarker);
    const cliticsRules = useConfigStore((state) => state.cliticsRules);
    const personsConfig = useConfigStore((state) => state.personRules); 
    const syntaxOrder = useConfigStore((state) => state.syntaxOrder) || 'SVO';

    const lexicon = useLexiconStore((state) => state.lexicon);
    const updateWord = useLexiconStore((state) => state.updateWord);
    const addWord = useLexiconStore((state) => state.addWord);

    const { transliterate } = useTransliterator();
    const [isEditMode, setIsEditMode] = useState(false);
    const [conjugationMode, setConjugationMode] = useState('affix');
    
    // State for saving derivations
    const [derivationToSave, setDerivationToSave] = useState(null);
    const [derivationTranslation, setDerivationTranslation] = useState('');
    const [derivationClass, setDerivationClass] = useState('');

    // Figure out exactly what word we're looking at and prep its base form for conjugation
    const liveWord = lexicon.find(w => w.id === wordObj?.id) || wordObj;

    const cleanBaseWord = useMemo(() => {
        if (!liveWord?.word) return '';
        let base = liveWord.word;

        // Strip clitics if they are attached to the base word
        if (cliticsRules) {
            const clitics = cliticsRules.split(',').map(c => c.trim().replace(/^-/, '')).filter(Boolean);
            const matchedClitic = clitics.find(c => base.endsWith(c));
            if (matchedClitic) base = base.slice(0, -matchedClitic.length);
        }

        // If it's a verb, we strip the infinitive marker before applying affixes
        const liveClasses = liveWord.wordClass ? liveWord.wordClass.split(',').map(c => c.trim().toLowerCase()) : [];
        if (liveClasses.includes('verb') && verbMarker) {
            const markers = verbMarker.split(',').map(m => m.trim().replace(/^-/, '')).filter(Boolean);
            const matchedMarker = markers.find(m => base.endsWith(m));
            if (matchedMarker) base = base.slice(0, -matchedMarker.length);
        }

        return base;
    }, [liveWord, cliticsRules, verbMarker]);

    const applicableRules = useMemo(() => {
        if (!liveWord) return [];
        const liveClasses = liveWord.wordClass ? liveWord.wordClass.split(',').map(c => c.trim().toLowerCase()) : [];
        
        return grammarRules.filter(rule => {
            const classes = rule.appliesTo.split(',').map(c => c.trim().toLowerCase());
            return classes.includes('all') || liveClasses.some(lc => classes.includes(lc));
        });
    }, [liveWord, grammarRules]);

    const personRules = useMemo(() => {
        const parsedPersons = getPersonRules(personsConfig);
        const liveClasses = liveWord.wordClass ? liveWord.wordClass.split(',').map(c => c.trim().toLowerCase()) : [];
        
        const filtered = parsedPersons.filter(person => {
            const applies = person.appliesTo ? person.appliesTo.split(',').map(c => c.trim().toLowerCase()) : ['all'];
            return applies.includes('all') || liveClasses.some(lc => applies.includes(lc));
        });

        return [{ name: 'BASE', affix: '', freeForm: '', appliesTo: 'all' }, ...filtered];
    }, [personsConfig, liveWord]);

    const hasNonStandaloneRules = applicableRules.some(rule => !rule.standalone); // Rules that need person/class
    const hasStandaloneRules = applicableRules.some(rule => rule.standalone); // Rules that don't need person/class
    const hasDualConjugation = personRules.some(p => p.affix && p.freeForm); // Check if any person rule has both affix and free form

    const showPersonColumn = personRules.length > 1 && hasNonStandaloneRules;

    if (!liveWord) return null;

    // Tools for saving manual overrides and running the morphology engine
    const handleOverrideChange = (overrideKey, value) => {
        const currentOverrides = liveWord.inflectionOverrides || {};
        updateWord(liveWord.id, {
            inflectionOverrides: {
                ...currentOverrides,
                [overrideKey]: value
            }
        });
    };

    const generateInflection = (rule, person) => {
        let generatedResult = applyRuleToWord(cleanBaseWord, rule, grammarRules, vowels);

        if (generatedResult && !rule.standalone && person.name !== 'BASE') {
            const useFree = (conjugationMode === 'free' && person.freeForm) || (!person.affix && person.freeForm);
            const useAffix = (conjugationMode === 'affix' && person.affix) || (!person.freeForm && person.affix);

            if (useFree) {
                const sIndex = syntaxOrder.toUpperCase().indexOf('S');
                const vIndex = syntaxOrder.toUpperCase().indexOf('V');
                
                if (vIndex !== -1 && sIndex !== -1 && vIndex < sIndex) {
                    generatedResult = `${generatedResult} ${person.freeForm}`;
                } else {
                    generatedResult = `${person.freeForm} ${generatedResult}`;
                }
            } else if (useAffix) {
                generatedResult = applyRuleToWord(generatedResult, person, grammarRules, vowels);
            }
        }

        return generatedResult;
    };

    // Time to paint the UI!
    return (
        <div className="matrix-modal-container">
            <div className="matrix-header-box">
                <div>
                   {isEditMode ? (
                        <>
                            <span className="matrix-base-label">Edit Root & IPA</span>
                            <div className="matrix-edit-fields-wrapper">
                                <input 
                                    type="text"
                                    className="matrix-input matrix-edit-input-root custom-font-text notranslate"
                                    value={liveWord.word}
                                    onChange={(e) => updateWord(liveWord.id, { word: e.target.value })}
                                    placeholder="Root word"
                                />
                                <input 
                                    type="text"
                                    className="matrix-input matrix-edit-input-ipa notranslate"
                                    value={liveWord.ipa || ''}
                                    onChange={(e) => updateWord(liveWord.id, { ipa: e.target.value })}
                                    placeholder="IPA (e.g. /ma/)"
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <span className="matrix-base-label">Base Root</span>
                            <div className="matrix-base-display-wrapper">
                                <div className="matrix-base-word notranslate custom-font-text">
                                    {transliterate(liveWord.word)}
                                </div>
                                {liveWord.ipa && (
                                    <span className="notranslate matrix-ipa-text">
                                        /{liveWord.ipa}/
                                    </span>
                                )}
                            </div>
                        </>
                    )}
                </div>
                <span className="matrix-word-class-badge">
                    {liveWord.wordClass}
                </span>
            </div>

            <div className="matrix-toolbar">
                <span className="matrix-toolbar-text">
                    {isEditMode 
                        ? <><Lightbulb size={14} /> Spreadsheet Mode: Press Tab to move between cells.</> 
                        : 'Displaying generated paradigm.'}
                </span>
                
                <div className="matrix-toolbar-actions">
                    {hasDualConjugation && (
                        <div className="matrix-toggle-group">
                            <button 
                                className={`matrix-toggle-btn ${conjugationMode === 'free' ? 'active' : ''}`}
                                onClick={() => setConjugationMode('free')}
                            >
                                Free Word
                            </button>
                            <button 
                                className={`matrix-toggle-btn ${conjugationMode === 'affix' ? 'active' : ''}`}
                                onClick={() => setConjugationMode('affix')}
                            >
                                Affix
                            </button>
                        </div>
                    )}
                    <button 
                        className={`matrix-edit-btn ${isEditMode ? 'active' : ''}`}
                        onClick={() => setIsEditMode(!isEditMode)}
                    >
                        {isEditMode ? <><Save size={16} /> Save & Close</> : <><Edit2 size={16} /> Edit</>}
                    </button>
                </div>
            </div>

            {derivationToSave && (
                <div style={{ background: 'var(--s2)', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid var(--acc)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h4 style={{ margin: 0, color: 'var(--tx)' }}>
                            Save Derived Word: <span className="custom-font-text notranslate" style={{ color: 'var(--acc)', fontSize: '1.2em', marginLeft: '5px' }}>{transliterate(derivationToSave.word)}</span>
                        </h4>
                        <button onClick={() => setDerivationToSave(null)} style={{ background: 'none', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ flex: 2 }}>
                            <input 
                                type="text" 
                                className="fi" 
                                placeholder="Translation (e.g., cats)" 
                                value={derivationTranslation} 
                                onChange={e => setDerivationTranslation(e.target.value)} 
                                autoFocus
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <select className="fi" value={derivationClass} onChange={e => setDerivationClass(e.target.value)}>
                                <option value="noun">Noun</option>
                                <option value="verb">Verb</option>
                                <option value="adjective">Adjective</option>
                                <option value="adverb">Adverb</option>
                                <option value="pronoun">Pronoun</option>
                                <option value="particle">Particle</option>
                                <option value="conjunction">Conjunction</option>
                                <option value="preposition">Preposition</option>
                                <option value="adposition">Adposition</option>
                                <option value="classifier">Classifier</option>
                                <option value="numeral">Numeral</option>
                                <option value="article">Article</option>
                                <option value="determiner">Determiner</option>
                                <option value="interjection">Interjection</option>
                            </select>
                        </div>
                        <button 
                            className="btn-save btn-base" 
                            onClick={() => {
                                if (!derivationTranslation.trim()) return alert("Translation required");
                                addWord({ word: derivationToSave.word, wordClass: derivationClass, translation: derivationTranslation.trim() });
                                setDerivationToSave(null);
                                alert("Saved to dictionary!");
                            }}
                        >
                            Save
                        </button>
                    </div>
                </div>
            )}

            <div className="matrix-table-container">
                <table className="matrix-table">
                    <thead>
                        <tr className="matrix-th-row">
                            {showPersonColumn && (
                                <th className="matrix-th">PERSON/CLASS</th>
                            )}
                            {applicableRules.map(rule => (
                                <th key={`header_${rule.name}`} className="matrix-th">
                                    {rule.name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                    {personRules.map(person => {
                        if (person.name !== 'BASE' && !showPersonColumn) return null;
                        if (person.name === 'BASE' && personRules.length > 1 && !hasStandaloneRules) return null;

                        return (
                            <tr key={`row_${person.name}`} className="matrix-tr-row">
                                
                                {showPersonColumn && (
                                    <td className={`matrix-td-person ${person.name === 'BASE' ? 'base' : ''}`}>
                                        {person.name}
                                    </td>
                                )}

                                {applicableRules.map(rule => {
                                    if (person.name !== 'BASE' && rule.standalone) {
                                        return (
                                            <td key={`cell_empty_${person.name}_${rule.name}`} className="matrix-td-empty">
                                                —
                                            </td>
                                        );
                                    }
                                    
                                    const isConjugated = !rule.standalone && person.name !== 'BASE';
                                    const overrideKey = isConjugated 
                                        ? `${person.name}_${rule.name}_${conjugationMode}` 
                                        : `${person.name}_${rule.name}`;
                                    const manualValue = liveWord.inflectionOverrides?.[overrideKey] || '';

                                    const generatedResult = generateInflection(rule, person);
                                    const finalWordToDisplay = manualValue || generatedResult;

                                    return (
                                        <td key={`cell_${overrideKey}`} className="matrix-td">
                                            {isEditMode ? (
                                                <input 
                                                    id={`input_${overrideKey}`}
                                                    type="text"
                                                    className={`notranslate matrix-input custom-font-text ${manualValue ? 'overridden' : ''}`}
                                                    placeholder={generatedResult ? transliterate(generatedResult) : 'Invalid'}
                                                    value={manualValue}
                                                    onChange={(e) => handleOverrideChange(overrideKey, e.target.value)}
                                                />
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <span className={`notranslate matrix-output custom-font-text ${manualValue ? 'overridden' : ''}`}>
                                                        {finalWordToDisplay ? transliterate(finalWordToDisplay) : <span className="matrix-invalid">Invalid</span>}
                                                    </span>
                                                    {finalWordToDisplay && (
                                                        <button 
                                                            className="matrix-quick-save-btn"
                                                            onClick={() => {
                                                                setDerivationToSave({ word: finalWordToDisplay, ruleName: rule.name, personName: person.name });
                                                                setDerivationTranslation('');
                                                                
                                                                // Smartly default the target class based on the grammar rule
                                                                const ruleClasses = rule.appliesTo.split(',').map(c => c.trim().toLowerCase());
                                                                if (ruleClasses.includes('all')) {
                                                                    setDerivationClass(liveWord.wordClass ? liveWord.wordClass.split(',')[0].trim().toLowerCase() : 'noun');
                                                                } else {
                                                                    setDerivationClass(ruleClasses[0]); // Default to the first class this rule applies to
                                                                }
                                                            }}
                                                            title="Save to Lexicon"
                                                        >
                                                            +
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
                </table>
            </div>

            {applicableRules.length === 0 && (
                <div className="matrix-empty-state">
                    <p className="matrix-empty-text">No grammar rules found for the <b>{liveWord.wordClass}</b> class.</p>
                </div>
            )}
        </div>
    );
}  
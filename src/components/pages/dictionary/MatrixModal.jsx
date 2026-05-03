import React, { useMemo, useState } from 'react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { applyRuleToWord, getPersonRules } from '@/utils/morphologyEngine.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import { Lightbulb, Edit2, Save, Download } from 'lucide-react';
import { exportTextAsSVG } from '@/utils/svgExporter.jsx';
import toast from 'react-hot-toast';
import './matrixmodal.css';

export default function MatrixModal({ wordObj }) {
    // Grab the language settings and lexicon from our global stores
    const grammarRules = useConfigStore((state) => state.grammarRules) || [];
    const vowels = useConfigStore((state) => state.vowels);
    const consonants = useConfigStore((state) => state.consonants);
    const otherPhonemes = useConfigStore((state) => state.otherPhonemes);
    const verbMarker = useConfigStore((state) => state.verbMarker);
    const cliticsRules = useConfigStore((state) => state.cliticsRules);
    const personsConfig = useConfigStore((state) => state.personRules); 
    const syntaxOrder = useConfigStore((state) => state.syntaxOrder) || 'SVO';
    const phonologyTypes = useConfigStore((state) => state.phonologyTypes);

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

        // Verb markers are no longer stripped, they only act as a validation warning during creation

        return base;
    }, [liveWord, cliticsRules, verbMarker]);

    const applicableRules = useMemo(() => {
        if (!liveWord) return [];
        const liveClasses = liveWord.wordClass ? liveWord.wordClass.split(',').map(c => c.trim().toLowerCase()) : [];
        
        return grammarRules.filter(rule => {
            const classes = (rule.appliesTo || 'all').split(',').map(c => c.trim().toLowerCase());
            return classes.includes('all') || liveClasses.some(lc => classes.includes(lc));
        });
    }, [liveWord, grammarRules]);

    const personRules = useMemo(() => {
        const parsedPersons = getPersonRules(personsConfig);
        const liveClasses = liveWord.wordClass ? liveWord.wordClass.split(',').map(c => c.trim().toLowerCase()) : [];
        const wordTags = (liveWord.tags || []).map(t => t.toLowerCase());
        
        const filtered = parsedPersons.filter(person => {
            // 1. Existing appliesTo class filter
            const applies = person.appliesTo ? person.appliesTo.split(',').map(c => c.trim().toLowerCase()) : ['all'];
            const classMatch = applies.includes('all') || liveClasses.some(lc => applies.includes(lc));
            if (!classMatch) return false;

            // 2. Option A: rootTag filter
            if (person.rootTag && person.rootTag.trim() !== '') {
                if (!wordTags.includes(person.rootTag.toLowerCase())) return false;
            }

            // 3. Option B: personCategory filter
            if (liveWord.personCategory && liveWord.personCategory.trim() !== '') {
                // Only filter if the person rule has a specific person set that doesn't match
                if (person.person && person.person !== liveWord.personCategory) return false;
            }

            return true;
        });

        return [{ name: 'BASE', affix: '', freeForm: '', appliesTo: 'all' }, ...filtered];
    }, [personsConfig, liveWord]);

    const hasNonStandaloneRules = applicableRules.some(rule => !rule.standalone); // Rules that need person/class
    const hasStandaloneRules = applicableRules.some(rule => rule.standalone); // Rules that don't need person/class
    const hasDualConjugation = personRules.some(p => p.affix && p.freeForm); // Check if any person rule has both affix and free form

    // Scan for existing derivations in the lexicon to prevent duplicates
    const existingDerivationsMap = useMemo(() => {
        const map = {};
        lexicon.forEach(entry => {
            if (entry.parentRootId === liveWord.id && entry.derivationRuleId) {
                map[entry.derivationRuleId] = entry;
            }
        });
        return map;
    }, [lexicon, liveWord.id]);

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
        let generatedResult = applyRuleToWord(cleanBaseWord, rule, grammarRules, vowels, consonants, otherPhonemes);

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
                generatedResult = applyRuleToWord(generatedResult, person, grammarRules, vowels, consonants, otherPhonemes);
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
                                <div className={`matrix-base-word notranslate custom-font-text ${phonologyTypes === 'featural_block' ? 'featural-block-render' : ''}`}>
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
                <div className="matrix-quick-save-row">
                    <div className="matrix-quick-save-header">
                        <h4 className="matrix-quick-save-title">
                            Save Derived Word: <span className="custom-font-text notranslate matrix-quick-save-word">{transliterate(derivationToSave.word)}</span>
                        </h4>
                        <button onClick={() => setDerivationToSave(null)} className="matrix-quick-save-cancel">Cancel</button>
                    </div>
                    <div className="matrix-quick-save-form">
                        <div className="matrix-quick-save-trans-wrap">
                            <input 
                                type="text" 
                                className="fi" 
                                placeholder="Translation (e.g., cats)" 
                                value={derivationTranslation} 
                                onChange={e => setDerivationTranslation(e.target.value)} 
                                autoFocus
                            />
                        </div>
                        <div className="matrix-quick-save-class-wrap">
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
                                if (!derivationTranslation.trim()) return toast.error("Translation required");
                                addWord({ 
                                    word: derivationToSave.word, 
                                    wordClass: derivationClass, 
                                    translation: derivationTranslation.trim(),
                                    parentRootId: liveWord.id,
                                    derivationRuleId: derivationToSave.ruleId
                                });
                                setDerivationToSave(null);
                                toast.success("Saved to lexicon!");
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
                        // Always show the BASE row. For other rows, only show if we have person markers to display.
                        if (person.name !== 'BASE' && !showPersonColumn) return null;

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
                                                <div className="matrix-cell-content">
                                                    <span className={`notranslate matrix-output custom-font-text ${manualValue ? 'overridden' : ''} ${phonologyTypes === 'featural_block' ? 'featural-block-render' : ''} ${existingDerivationsMap[rule.id] ? 'existing-derivation' : ''}`}>
                                                        {finalWordToDisplay ? transliterate(finalWordToDisplay) : <span className="matrix-invalid">Invalid</span>}
                                                    </span>
                                                    {existingDerivationsMap[rule.id] && !manualValue && (
                                                        <span className="existing-badge" title="Already in Lexicon">✓</span>
                                                    )}
                                                    {finalWordToDisplay && (
                                                        <div className="matrix-cell-actions">
                                                            {phonologyTypes !== 'alphabetic' && (
                                                                <button 
                                                                    className="matrix-quick-save-btn"
                                                                    onClick={() => exportTextAsSVG(transliterate(finalWordToDisplay), `${finalWordToDisplay}.svg`)}
                                                                    title="Download SVG"
                                                                >
                                                                    <Download size={14} />
                                                                </button>
                                                            )}
                                                            <button 
                                                                className="matrix-quick-save-btn"
                                                                onClick={() => {
                                                                    if (existingDerivationsMap[rule.id]) {
                                                                        return toast.error(`This derivation (${finalWordToDisplay}) is already in your Lexicon.`);
                                                                    }
                                                                    setDerivationToSave({ 
                                                                        word: finalWordToDisplay, 
                                                                        ruleName: rule.name, 
                                                                        ruleId: rule.id,
                                                                        personName: person.name 
                                                                    });
                                                                    setDerivationTranslation('');
                                                                    
                                                                    // Smartly default the target class based on the grammar rule
                                                                    if (rule.targetPOS) {
                                                                        setDerivationClass(rule.targetPOS);
                                                                    } else {
                                                                        const ruleClasses = (rule.appliesTo || 'all').split(',').map(c => c.trim().toLowerCase());
                                                                        if (ruleClasses.includes('all')) {
                                                                            setDerivationClass(liveWord.wordClass ? liveWord.wordClass.split(',')[0].trim().toLowerCase() : 'noun');
                                                                        } else {
                                                                            setDerivationClass(ruleClasses[0]); // Default to the first class this rule applies to
                                                                        }
                                                                    }
                                                                }}
                                                                title="Save to Lexicon"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
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
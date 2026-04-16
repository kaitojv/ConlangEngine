import React, { useMemo, useState } from 'react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { applyRuleToWord, getPersonRules } from '@/utils/morphologyEngine.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import { Lightbulb, Edit2, Save } from 'lucide-react';
import './matrixmodal.css';

export default function MatrixModal({ wordObj }) {
    // --- 1. GLOBAL STATE & STORE HOOKS ---
    const grammarRules = useConfigStore((state) => state.grammarRules) || [];
    const vowels = useConfigStore((state) => state.vowels);
    const verbMarker = useConfigStore((state) => state.verbMarker);
    const cliticsRules = useConfigStore((state) => state.cliticsRules);
    const personsConfig = useConfigStore((state) => state.personRules); // Fixed property name
    const syntaxOrder = useConfigStore((state) => state.syntaxOrder) || 'SVO';

    const lexicon = useLexiconStore((state) => state.lexicon);
    const updateWord = useLexiconStore((state) => state.updateWord);

    const { transliterate } = useTransliterator();
    const [isEditMode, setIsEditMode] = useState(false);
    const [conjugationMode, setConjugationMode] = useState('affix');

    // --- 2. LIVE DATA & DERIVED STATE ---
    const liveWord = lexicon.find(w => w.id === wordObj?.id) || wordObj;

    const cleanBaseWord = useMemo(() => {
        if (!liveWord?.word) return '';
        let base = liveWord.word;

        if (cliticsRules) {
            const clitics = cliticsRules.split(',').map(c => c.trim().replace(/^-/, '')).filter(Boolean);
            const matchedClitic = clitics.find(c => base.endsWith(c));
            if (matchedClitic) base = base.slice(0, -matchedClitic.length);
        }

        if (liveWord.wordClass?.toLowerCase() === 'verb' && verbMarker) {
            const markers = verbMarker.split(',').map(m => m.trim().replace(/^-/, '')).filter(Boolean);
            const matchedMarker = markers.find(m => base.endsWith(m));
            if (matchedMarker) base = base.slice(0, -matchedMarker.length);
        }

        return base;
    }, [liveWord, cliticsRules, verbMarker]);

    const applicableRules = useMemo(() => {
        if (!liveWord) return [];
        return grammarRules.filter(rule => {
            const classes = rule.appliesTo.split(',').map(c => c.trim().toLowerCase());
            return classes.includes('all') || classes.includes(liveWord.wordClass.toLowerCase());
        });
    }, [liveWord, grammarRules]);

    const personRules = useMemo(() => {
        const parsedPersons = getPersonRules(personsConfig);
        return [{ name: 'BASE', affix: '', free: '', appliesTo: 'all' }, ...parsedPersons];
    }, [personsConfig]);

    const hasNonStandaloneRules = applicableRules.some(rule => !rule.standalone);
    const hasStandaloneRules = applicableRules.some(rule => rule.standalone);
    const hasDualConjugation = personRules.some(p => p.affix && p.free);
    
    const showPersonColumn = personRules.length > 1 && hasNonStandaloneRules;

    if (!liveWord) return null;

    // --- 3. HANDLERS & HELPERS ---
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
            const useFree = (conjugationMode === 'free' && person.free) || (!person.affix && person.free);
            const useAffix = (conjugationMode === 'affix' && person.affix) || (!person.free && person.affix);

            if (useFree) {
                const sIndex = syntaxOrder.toUpperCase().indexOf('S');
                const vIndex = syntaxOrder.toUpperCase().indexOf('V');
                
                if (vIndex !== -1 && sIndex !== -1 && vIndex < sIndex) {
                    generatedResult = `${generatedResult} ${person.free}`;
                } else {
                    generatedResult = `${person.free} ${generatedResult}`;
                }
            } else if (useAffix) {
                generatedResult = applyRuleToWord(generatedResult, person, grammarRules, vowels);
            }
        }

        return generatedResult;
    };

    // --- 4. RENDER ---
    return (
        <div className="matrix-modal-container">
            <div className="matrix-header-box">
                <div>
                   {isEditMode ? (
                        <>
                            <span className="matrix-base-label">Edit Root & IPA</span>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                <input 
                                    type="text"
                                    className="matrix-input custom-font-text notranslate"
                                    value={liveWord.word}
                                    onChange={(e) => updateWord(liveWord.id, { word: e.target.value })}
                                    placeholder="Root word"
                                    style={{ width: '160px', fontSize: '1.2rem', padding: '4px 8px', fontWeight: 'bold' }}
                                />
                                <input 
                                    type="text"
                                    className="matrix-input notranslate"
                                    value={liveWord.ipa || ''}
                                    onChange={(e) => updateWord(liveWord.id, { ipa: e.target.value })}
                                    placeholder="IPA (e.g. /ma/)"
                                    style={{ width: '120px', fontSize: '1rem', padding: '4px 8px' }}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <span className="matrix-base-label">Base Root</span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                                <div className="matrix-base-word notranslate custom-font-text">
                                    {transliterate(liveWord.word)}
                                </div>
                                {liveWord.ipa && (
                                    <span className="notranslate" style={{ color: 'var(--tx3)', fontSize: '1.1rem' }}>
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
                        {isEditMode ? <><Save size={16} /> Save & Close</> : <><Edit2 size={16} /> Edit Exceptions</>}
                    </button>
                </div>
            </div>

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
                                                <span className={`notranslate matrix-output custom-font-text ${manualValue ? 'overridden' : ''}`}>
                                                    {finalWordToDisplay ? transliterate(finalWordToDisplay) : <span className="matrix-invalid">Invalid</span>}
                                                </span>
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
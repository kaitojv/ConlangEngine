import React, { useState, useMemo, useRef } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import Card from '../../UI/Card/Card.jsx';
import Input from '../../UI/Input/Input.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import { Languages, Hash, Plus, Trash2, Calculator, Settings, Edit2, Check, Table2, BookA, Type, Mic2, PenTool, ListChecks } from 'lucide-react';
import IpaReferencePage from './IpaReferencePage.jsx';
import './orthographyPage.css';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { useTransliterator } from '../../../hooks/useTransliterator.jsx';
import { getScriptSystem, buildScriptConfig, getDefaultScriptId } from '../../../utils/scriptResolver.js';
import ScriptManager from '../../UI/ScriptManager/ScriptManager.jsx';
import ScriptRulesEditor from '../../UI/ScriptRulesEditor/ScriptRulesEditor.jsx';
import toast from 'react-hot-toast';

// --- SUB-COMPONENTS ---

// Returns large glyph/font data scoped to a specific script. Falls back to the
// legacy global fields ONLY for the default script, so a non-default script
// (e.g. a freshly created logographic register) starts empty instead of
// inheriting every custom glyph from the default script. See FIX.md.
const useScriptScopedData = (scriptId) => {
    const scriptDataById = useConfigStore(state => state.scriptDataById);
    const defaultScriptId = useConfigStore(state => state.scriptRules?.defaultScriptId) || 'default';
    const customGlyphsG = useConfigStore(state => state.customGlyphs);
    const syllabaryMapG = useConfigStore(state => state.syllabaryMap);
    const featuralComponentsG = useConfigStore(state => state.featuralComponents);
    const alphabetGlyphsG = useConfigStore(state => state.alphabetGlyphs);
    const sd = scriptId ? scriptDataById?.[scriptId] : null;
    const isDefault = !scriptId || scriptId === defaultScriptId;
    return {
        customGlyphs: sd?.customGlyphs || (isDefault ? customGlyphsG : {}) || {},
        syllabaryMap: sd?.syllabaryMap || (isDefault ? syllabaryMapG : {}) || {},
        featuralComponents: sd?.featuralComponents || (isDefault ? featuralComponentsG : {}) || {},
        alphabetGlyphs: sd?.alphabetGlyphs || (isDefault ? alphabetGlyphsG : {}) || {},
    };
};

const NumberDerivationView = ({ generateNumberName, numeralBase }) => {
    const numberMatrix = useConfigStore(state => state.numberMatrix) || {};
    const numberDerivedRules = useConfigStore(state => state.numberDerivedRules) || { ordinal: '', fractional: '', multiplier: '' };
    const timeSystemVocab = useConfigStore(state => state.timeSystemVocab) || { second: '', minute: '', hour: '', day: '', week: '', month: '', year: '' };
    const updateConfig = useConfigStore(state => state.updateConfig);
    const addWord = useLexiconStore(state => state.addWord);
    const { transliterate } = useTransliterator();

    const [testNum, setTestNum] = useState(1);

    const handleRuleChange = (field, value) => {
        updateConfig({ numberDerivedRules: { ...numberDerivedRules, [field]: value } });
    };

    const handleTimeChange = (field, value) => {
        updateConfig({ timeSystemVocab: { ...timeSystemVocab, [field]: value } });
    };

    const handleMatrixChange = (num, field, value) => {
        const currentMatrix = { ...numberMatrix };
        if (!currentMatrix[num]) currentMatrix[num] = {};
        currentMatrix[num][field] = value;
        updateConfig({ numberMatrix: currentMatrix });
    };

    const applyAffix = (baseWord, affixRaw) => {
        if (!baseWord || !affixRaw) return baseWord || '';
        const affix = affixRaw.trim();
        if (affix.startsWith('-')) return `${baseWord}${affix.slice(1)}`;
        if (affix.endsWith('-')) return `${affix.slice(0, -1)}${baseWord}`;
        return `${baseWord} ${affix}`; // Fallback to separate word
    };

    const handleSaveToLexicon = () => {
        let addedCount = 0;
        
        // Save Core Time Vocab
        Object.entries(timeSystemVocab).forEach(([key, val]) => {
            if (val.trim()) {
                const label = key.charAt(0).toUpperCase() + key.slice(1);
                addWord({ word: val.trim(), wordClass: 'Noun', translation: label });
                addedCount++;
            }
        });

        // Save Specific Days (1-7)
        for (let i = 1; i <= 7; i++) {
            const val = numberMatrix[i]?.day;
            if (val?.trim()) {
                addWord({ word: val.trim(), wordClass: 'Noun', translation: `Day ${i}` });
                addedCount++;
            }
        }

        // Save Specific Months (1-12)
        for (let i = 1; i <= 12; i++) {
            const val = numberMatrix[i]?.month;
            if (val?.trim()) {
                addWord({ word: val.trim(), wordClass: 'Noun', translation: `Month ${i}` });
                addedCount++;
            }
        }
        
        if (addedCount === 0) {
            toast.error("No vocabulary to save.");
            return;
        }
        toast.success(`Saved ${addedCount} time entries to Lexicon!`);
    };

    const testBaseForm = generateNumberName(testNum);
    const testOrdinal = applyAffix(testBaseForm, numberDerivedRules.ordinal);
    const testFractional = applyAffix(testBaseForm, numberDerivedRules.fractional);
    const testMultiplier = applyAffix(testBaseForm, numberDerivedRules.multiplier);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-1rem' }}>
                <button 
                    className="btn-add" 
                    style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '0.6rem 1.5rem', height: 'auto', borderRadius: '0.75rem', fontSize: '1rem', whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)' }} 
                    onClick={handleSaveToLexicon}
                >
                    <Check size={18} /> Save to Lexicon
                </button>
            </div>

            <Card className="matrix-card">
                <div className="matrix-header" style={{ marginBottom: '1.5rem' }}>
                    <h2 className="sg-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Derived Mathematical Forms Engine</h2>
                    <p style={{ color: 'var(--tx2)' }}>Define affixes (using hyphens, e.g. <code>-stu</code> or <code>ka-</code>) to automatically generate forms for infinite numbers.</p>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--tx2)' }}>Ordinal Affix</label>
                        <input className="fi" placeholder="e.g. -stu" value={numberDerivedRules.ordinal} onChange={(e) => handleRuleChange('ordinal', e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--tx2)' }}>Fractional Affix</label>
                        <input className="fi" placeholder="e.g. -ly" value={numberDerivedRules.fractional} onChange={(e) => handleRuleChange('fractional', e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--tx2)' }}>Multiplier Affix</label>
                        <input className="fi" placeholder="e.g. -ce" value={numberDerivedRules.multiplier} onChange={(e) => handleRuleChange('multiplier', e.target.value)} />
                    </div>
                </div>

                <div style={{ background: 'var(--s2)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--bd)' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 className="sg-title" style={{ fontSize: '1.1rem', color: 'var(--acc)' }}>Live Tester</h3>
                        <input type="number" min="0" className="fi" style={{ width: '120px' }} value={testNum} onChange={(e) => setTestNum(parseInt(e.target.value) || 0)} />
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                        <div style={{ background: 'var(--s4)', padding: '1rem', borderRadius: '0.75rem', border: '1px dashed var(--acc)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 700 }}>Base</div>
                            <div className="custom-font-text" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--tx)' }}>{transliterate(testBaseForm || '') || '-'}</div>
                        </div>
                        <div style={{ background: 'var(--s4)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--bd)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 700 }}>Ordinal</div>
                            <div className="custom-font-text" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--tx)' }}>{transliterate(testOrdinal || '') || '-'}</div>
                        </div>
                        <div style={{ background: 'var(--s4)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--bd)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 700 }}>Fractional</div>
                            <div className="custom-font-text" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--tx)' }}>{transliterate(testFractional || '') || '-'}</div>
                        </div>
                        <div style={{ background: 'var(--s4)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--bd)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 700 }}>Multiplier</div>
                            <div className="custom-font-text" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--tx)' }}>{transliterate(testMultiplier || '') || '-'}</div>
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="matrix-card">
                <div style={{ marginBottom: '1.5rem' }}>
                    <h2 className="sg-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Time & Calendar System</h2>
                    <p style={{ color: 'var(--tx2)' }}>Define words for time units. These can be combined with base numbers (e.g. <code>uri fle</code> for 'hour one').</p>
                </div>
                
                <h3 className="sg-title" style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--acc)' }}>Core Time Vocabulary</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                    {Object.entries({ second: 'Second', minute: 'Minute', hour: 'Hour (e.g. fle)', day: 'Day', week: 'Week', month: 'Month', year: 'Year' }).map(([key, label]) => (
                        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--tx2)' }}>{label}</label>
                            <input 
                                className="fi" 
                                placeholder={`Word for ${key}`}
                                value={timeSystemVocab[key] || ''} 
                                onChange={(e) => handleTimeChange(key, e.target.value)} 
                            />
                        </div>
                    ))}
                </div>

                <div style={{ width: '100%', height: '1px', background: 'var(--bd)', marginBottom: '2.5rem' }}></div>

                <h3 className="sg-title" style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--acc)' }}>Specific Calendar Names (Optional)</h3>
                <p style={{ color: 'var(--tx2)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Only fill these if your language has specific names for each day/month instead of just using numbered days (like "Day One").</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    <div className="matrix-table-wrapper">
                        <table className="matrix-table">
                            <thead>
                                <tr>
                                    <th>Day of the Week</th>
                                    <th>Word</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[1,2,3,4,5,6,7].map(day => (
                                    <tr key={day}>
                                        <td className="matrix-num-cell" style={{ color: 'var(--tx2)' }}>Day {day}</td>
                                        <td>
                                            <input 
                                                className="fi matrix-input" 
                                                placeholder="e.g. Monday"
                                                value={numberMatrix[day]?.day || ''} 
                                                onChange={(e) => handleMatrixChange(day, 'day', e.target.value)} 
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="matrix-table-wrapper">
                        <table className="matrix-table">
                            <thead>
                                <tr>
                                    <th>Month of the Year</th>
                                    <th>Word</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[1,2,3,4,5,6,7,8,9,10,11,12].map(month => (
                                    <tr key={month}>
                                        <td className="matrix-num-cell" style={{ color: 'var(--tx2)' }}>Month {month}</td>
                                        <td>
                                            <input 
                                                className="fi matrix-input" 
                                                placeholder="e.g. January"
                                                value={numberMatrix[month]?.month || ''} 
                                                onChange={(e) => handleMatrixChange(month, 'month', e.target.value)} 
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
        </div>
    );
};



const NumbersTab = () => {
    const numeralBase = useConfigStore(state => state.numeralBase) || 10;
    const numberSystem = useConfigStore(state => state.numberSystem) || {
        zero: '',
        digits: {},
        stems: {},
        powers: {},
        irregulars: {},
        settings: { 
            fusion: false, 
            globalFusion: false, 
            useStemsForUnits: false,
            separator: ' ', 
            internalOrder: 'digit-first',
            magnitudeOrder: 'standard',
            hideOne: false 
        }
    };
    const updateConfig = useConfigStore(state => state.updateConfig);
    const { transliterate } = useTransliterator();
    const [testNumber, setTestNumber] = useState('');
    const [matrixMode, setMatrixMode] = useState(false);
    
    const newIrrValRef = useRef(null);
    const newIrrNameRef = useRef(null);

    // Dynamic power count — start at 6 or however many powers already exist
    const [powerCount, setPowerCount] = useState(() => {
        const existingPowers = Object.keys(numberSystem.powers || {}).map(k => {
            // Find which exponent produces this key: base^p = key
            const val = Number(k);
            if (val <= 0 || !numeralBase || numeralBase <= 1) return 0;
            return Math.round(Math.log(val) / Math.log(numeralBase));
        }).filter(p => p > 0);
        return Math.max(6, ...existingPowers);
    });

    const updateSystem = (field, value) => {
        updateConfig({
            numberSystem: { ...numberSystem, [field]: value }
        });
    };

    const updateMap = (mapName, key, value) => {
        const newMap = { ...(numberSystem[mapName] || {}) };
        if (value === '') delete newMap[key];
        else newMap[key] = value;
        updateSystem(mapName, newMap);
    };

    const generateNumberName = (num) => {
        if (num === 0) return numberSystem.zero || '0';
        if (numberSystem.irregulars?.[num]) return numberSystem.irregulars[num];

        const base = numeralBase > 1 ? numeralBase : 10;
        const s = numberSystem.settings || {};
        
        // Destructure with default values for backwards compatibility
        const {
            fusion = false,
            globalFusion = false,
            useStemsForUnits = false,
            separator = ' ',
            internalOrder = 'digit-first',
            magnitudeOrder = 'standard',
            hideOne = false
        } = s;
        
        let remaining = num;
        let components = []; 
        let power = 0;

        while (remaining > 0) {
            const digit = remaining % base;
            if (digit > 0) {
                const powerVal = Math.pow(base, power);
                const componentVal = digit * powerVal;
                
                if (numberSystem.irregulars?.[componentVal]) {
                    // Only use component-level irregulars when the component equals the full original number.
                    // This prevents overrides like "20 → vingt" from bleeding into 21, 22, etc.
                    if (componentVal === num) {
                        components.push(numberSystem.irregulars[componentVal]);
                    } else if (power === 0) {
                        const dName = (useStemsForUnits && numberSystem.stems?.[digit])
                            ? numberSystem.stems[digit]
                            : (numberSystem.digits?.[digit] || `(${digit})`);
                        components.push(dName);
                    } else {
                        const pName = numberSystem.powers?.[powerVal] || `[Base^${power}]`;
                        let dName = '';
                        
                        if (!(hideOne && digit === 1)) {
                            dName = (fusion && numberSystem.stems?.[digit]) 
                                ? numberSystem.stems[digit] 
                                : (numberSystem.digits?.[digit] || `(${digit})`);
                        }

                        let word;
                        if (!dName) {
                            word = pName;
                        } else {
                            word = internalOrder === 'unit-first' 
                                ? `${pName}${fusion ? '' : separator}${dName}`
                                : `${dName}${fusion ? '' : separator}${pName}`;
                        }
                        components.push(word);
                    }
                } else if (power === 0) {
                    const dName = (useStemsForUnits && numberSystem.stems?.[digit])
                        ? numberSystem.stems[digit]
                        : (numberSystem.digits?.[digit] || `(${digit})`);
                    components.push(dName);
                } else {
                    const pName = numberSystem.powers?.[powerVal] || `[Base^${power}]`;
                    let dName = '';
                    
                    if (!(hideOne && digit === 1)) {
                        dName = (fusion && numberSystem.stems?.[digit]) 
                            ? numberSystem.stems[digit] 
                            : (numberSystem.digits?.[digit] || `(${digit})`);
                    }

                    let word;
                    if (!dName) {
                        word = pName;
                    } else {
                        word = internalOrder === 'unit-first' 
                            ? `${pName}${fusion ? '' : separator}${dName}`
                            : `${dName}${fusion ? '' : separator}${pName}`;
                    }
                    components.push(word);
                }
            }
            remaining = Math.floor(remaining / base);
            power++;
            if (power > 20) break; 
        }

        if (magnitudeOrder === 'standard') {
            components.reverse();
        }

        return components.filter(Boolean).join(globalFusion ? '' : separator);
    };

    const testResult = useMemo(() => {
        const val = parseInt(testNumber);
        if (isNaN(val)) return '';
        return generateNumberName(val);
    }, [testNumber, numberSystem, numeralBase]);

    const digitIndices = Array.from({ length: Math.max(0, numeralBase - 1) }, (_, i) => i + 1);

    const handleAddIrregular = () => {
        const v = newIrrValRef.current?.value;
        const n = newIrrNameRef.current?.value;
        if (v && n) {
            updateMap('irregulars', v, n);
            if (newIrrValRef.current) newIrrValRef.current.value = '';
            if (newIrrNameRef.current) newIrrNameRef.current.value = '';
        }
    };

    return (
        <div className="tab-pane-container">
            <div className="matrix-toggle-container" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                <div className="tabs tabs-boxed page-subnav">
                    <button className={`tab ${!matrixMode ? 'tab-active' : ''}`} onClick={() => setMatrixMode(false)}>
                        <Settings size={16} style={{ marginRight: '6px' }}/> Basic Setup
                    </button>
                    <button className={`tab ${matrixMode ? 'tab-active' : ''}`} onClick={() => setMatrixMode(true)}>
                        <Table2 size={16} style={{ marginRight: '6px' }}/> Vocabulary Matrix
                    </button>
                </div>
            </div>

            {!matrixMode ? (
                <>
                    <Infobox title="Building your Number System">
                        <p>This engine uses a <b>Recursive Base System</b> to name any quantity:</p>
                        <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem' }}>
                    <li><b>Base Digits</b>: The names for 0 to base-1 (e.g., 2 = <i>paro</i>).</li>
                    <li><b>Powers</b>: Multipliers like Base^1 (Ten), Base^2 (Hundred).</li>
                    <li><b>Advanced Fusion & Ordering</b>:
                        <ul style={{ paddingLeft: '1.2rem', opacity: 0.8, fontSize: '0.9em', marginTop: '0.25rem' }}>
                            <li><b>Internal Fusion</b>: Merges a digit with its power (e.g. 2 * 10 = <i>pardeko</i>).</li>
                            <li><b>Global Fusion</b>: Removes spaces between all number components (e.g. 10 + 2 = <i>dekopar</i>).</li>
                            <li><b>Internal Word Order</b>: Choose if the multiplier comes first (<i>Two-Ten</i>) or last (<i>Ten-Two</i>).</li>
                            <li><b>Magnitude Order</b>: Choose if the sequence starts with big numbers (100, 10, 1) or units (1, 10, 100).</li>
                            <li><b>Separator</b>: The character placed between parts of the number when fusion is disabled (usually a space or hyphen).</li>
                        </ul>
                    </li>
                </ul>
            </Infobox>

            <div className="numbers-layout">
                <div className="numbers-main">
                    <Card>
                        <h2 className="flex sg-title items-center gap-2">
                            <Settings size={20} />
                            Base Digits (1-{numeralBase - 1})
                        </h2>
                        <div className="digits-grid-wide">
                            <div className="digit-entry-header">
                                <span>Num</span>
                                <span>Full Name</span>
                                <span>Stem (for fusion)</span>
                            </div>
                            <div className="digit-row-entry">
                                <span className="digit-label">0</span>
                                <input 
                                    className="char-name-input"
                                    value={numberSystem.zero || ''}
                                    onChange={(e) => updateSystem('zero', e.target.value)}
                                    placeholder="e.g. Zero"
                                />
                                <div className="spacer-stem"></div>
                            </div>
                            {digitIndices.map(d => (
                                <div key={d} className="digit-row-entry">
                                    <span className="digit-label">{d}</span>
                                    <input 
                                        className="char-name-input"
                                        value={numberSystem.digits?.[d] || ''}
                                        onChange={(e) => updateMap('digits', d, e.target.value)}
                                        placeholder="Name"
                                    />
                                    <input 
                                        className="char-name-input stem-input"
                                        value={numberSystem.stems?.[d] || ''}
                                        onChange={(e) => updateMap('stems', d, e.target.value)}
                                        placeholder="Stem"
                                    />
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card>
                        <h2 className="flex sg-title items-center gap-2">
                            <Plus size={20} />
                            Powers of {numeralBase}
                        </h2>
                        <div className="powers-grid">
                            {Array.from({ length: powerCount }, (_, i) => i + 1).map(p => {
                                const val = Math.pow(numeralBase, p);
                                // Format large numbers with commas for readability
                                const labelVal = val.toLocaleString();
                                return (
                                    <div key={p} className="digit-entry">
                                        <label>{numeralBase}<sup>{p}</sup> ({labelVal})</label>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <input 
                                                className="char-name-input"
                                                value={numberSystem.powers?.[val] || ''}
                                                onChange={(e) => updateMap('powers', val, e.target.value)}
                                                placeholder={`Name for ${labelVal}`}
                                                style={{ flex: 1, minWidth: 0 }}
                                            />
                                            {p === powerCount && p > 6 && (
                                                <button 
                                                    className="irr-del" 
                                                    onClick={() => {
                                                        updateMap('powers', val, '');
                                                        setPowerCount(prev => prev - 1);
                                                    }}
                                                    title="Remove this power"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <button 
                            className="btn-add" 
                            style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => setPowerCount(prev => prev + 1)}
                        >
                            <Plus size={14} /> Add Power
                        </button>
                    </Card>

                    <Card>
                        <h2 className="flex sg-title items-center gap-2">
                            <Trash2 size={20} />
                            Irregulars & Overrides
                        </h2>
                        <div className="irregulars-list">
                            {Object.entries(numberSystem.irregulars || {}).map(([val, name]) => (
                                <div key={val} className="irregular-row">
                                    <span className="irr-val">{val}</span>
                                    <input 
                                        className="irr-input"
                                        value={name}
                                        onChange={(e) => updateMap('irregulars', val, e.target.value)}
                                    />
                                    <button className="irr-del" onClick={() => updateMap('irregulars', val, '')}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            <div className="add-irregular">
                                <input type="number" ref={newIrrValRef} placeholder="Num" className="small-num-input" />
                                <input type="text" ref={newIrrNameRef} placeholder="Name" className="small-name-input" />
                                <button className="btn-add" onClick={handleAddIrregular}>Add</button>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="numbers-sidebar">
                    <Card className="settings-card">
                        <h2 className="flex sg-title items-center gap-2">
                            <Settings size={20} />
                            Naming Strategy
                        </h2>
                        <div className="strategy-options">
                            <div className="toggle-row">
                                <label className="strategy-label">Hide '1' on Powers</label>
                                <label className="switch">
                                    <input 
                                        type="checkbox" 
                                        checked={numberSystem.settings?.hideOne || false}
                                        onChange={(e) => updateSystem('settings', { ...numberSystem.settings, hideOne: e.target.checked })}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                            <div className="toggle-row">
                                <label className="strategy-label">Internal Fusion</label>
                                <label className="switch">
                                    <input 
                                        type="checkbox" 
                                        checked={numberSystem.settings?.fusion || false}
                                        onChange={(e) => updateSystem('settings', { ...numberSystem.settings, fusion: e.target.checked })}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                            <div className="toggle-row">
                                <label className="strategy-label">Global Fusion</label>
                                <label className="switch">
                                    <input 
                                        type="checkbox" 
                                        checked={numberSystem.settings?.globalFusion || false}
                                        onChange={(e) => updateSystem('settings', { ...numberSystem.settings, globalFusion: e.target.checked })}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                            <div className="toggle-row">
                                <label className="strategy-label">Use Stems for Units</label>
                                <label className="switch">
                                    <input 
                                        type="checkbox" 
                                        checked={numberSystem.settings?.useStemsForUnits || false}
                                        onChange={(e) => updateSystem('settings', { ...numberSystem.settings, useStemsForUnits: e.target.checked })}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                            
                            <div className="select-row">
                                <label>Internal Word Order</label>
                                <select 
                                    className="select select-bordered select-sm w-full"
                                    value={numberSystem.settings?.internalOrder || 'digit-first'}
                                    onChange={(e) => updateSystem('settings', { ...numberSystem.settings, internalOrder: e.target.value })}
                                >
                                    <option value="digit-first">Digit + Power (Eng)</option>
                                    <option value="unit-first">Power + Digit (Old Eng)</option>
                                </select>
                            </div>

                            <div className="select-row">
                                <label>Magnitude Order</label>
                                <select 
                                    className="select select-bordered select-sm w-full"
                                    value={numberSystem.settings?.magnitudeOrder || 'standard'}
                                    onChange={(e) => updateSystem('settings', { ...numberSystem.settings, magnitudeOrder: e.target.value })}
                                >
                                    <option value="standard">High to Low (100, 10, 1)</option>
                                    <option value="unit-first">Low to High (1, 10, 100)</option>
                                </select>
                            </div>

                            <div className="input-row">
                                <label>Separator</label>
                                <input 
                                    className="fi w-full"
                                    value={numberSystem.settings?.separator ?? ' '}
                                    onChange={(e) => updateSystem('settings', { ...numberSystem.settings, separator: e.target.value })}
                                />
                            </div>
                        </div>
                    </Card>

                    <Card className="preview-card sticky-top">
                        <h2 className="flex sg-title items-center gap-2">
                            <Calculator size={20} />
                            Preview
                        </h2>
                        <div className="preview-body">
                            <input 
                                type="number"
                                className="fi test-input"
                                value={testNumber}
                                onChange={(e) => setTestNumber(e.target.value)}
                                placeholder="42"
                            />
                            <div className="result-display">
                                <label>Result:</label>
                                <div className="result-value custom-font-text">{transliterate(testResult || '') || '—'}</div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
                </>
            ) : (
                <NumberDerivationView generateNumberName={generateNumberName} numeralBase={numeralBase} />
            )}
        </div>
    );
};

const AlphabeticShowcase = ({ scriptId } = {}) => {
    const consonants = useConfigStore(state => state.consonants) || '';
    const vowels = useConfigStore(state => state.vowels) || '';
    const otherPhonemes = useConfigStore(state => state.otherPhonemes) || '';
    const alphabetNames = useConfigStore(state => state.alphabetNames) || {};
    const { alphabetGlyphs } = useScriptScopedData(scriptId);
    const { transliterate } = useTransliterator();

    const parseChars = (str) => {
        if (!str) return [];
        return str.split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .map(s => {
                // RIGHT side of IPA=Text is the grapheme/letter identity
                if (s.includes('=')) return s.split('=')[1].trim();
                return s;
            });
    };

    const allChars = useMemo(() => {
        return [
            ...new Set([
                ...parseChars(consonants),
                ...parseChars(vowels),
                ...parseChars(otherPhonemes)
            ])
        ];
    }, [consonants, vowels, otherPhonemes]);

    return (
        <div className="tab-pane-container">
            <Infobox title="Alphabetic Register">
                This is the complete register of your language's alphabet. You can manage the names and draw the custom glyphs for these characters in the <b>System &rarr; Phonology</b> tab.
            </Infobox>

            <div className="alphabet-grid">
                {allChars.length > 0 ? (
                    allChars.map((char) => {
                        const charName = alphabetNames[char] || 'unnamed';
                        const customGlyph = alphabetGlyphs[char];
                        
                        return (
                            <div key={char} className="char-card glass" style={{ cursor: 'default' }}>
                                <div className="char-display custom-font-text" style={{ fontSize: customGlyph ? '3rem' : '2rem', marginBottom: customGlyph ? '0' : '0.5rem' }}>
                                    {customGlyph || transliterate(char)}
                                </div>
                                {customGlyph && (
                                    <div style={{ fontSize: '0.9rem', color: 'var(--tx2)', marginBottom: '12px' }}>
                                        ({char})
                                    </div>
                                )}
                                <div className="char-name-display">
                                    <span className="name-label" style={{ fontWeight: 700 }}>{charName}</span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="empty-state glass">
                        <Type size={48} className="text-tx2 opacity-20" />
                        <p>No characters found in your Phonology settings.</p>
                        <button className="btn-link" onClick={() => window.location.hash = '#/settings'}>
                            Go to Phonology Settings
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── SYLLABARY SHOWCASE ───────────────────────────────────────────────────────

const SyllabaryShowcase = ({ scriptId } = {}) => {
    const { syllabaryMap, customGlyphs } = useScriptScopedData(scriptId);
    const consonants   = useConfigStore(state => state.consonants) || '';
    const vowels       = useConfigStore(state => state.vowels) || '';

    const parseList = (str) => str.split(',').map(s => {
        let c = s.trim();
        if (c.includes('=')) c = c.split('=')[0].trim();
        return c;
    }).filter(Boolean);

    // Build phoneme → script-character map from IPA=char phonology entries
    const phonemeToChar = useMemo(() => {
        const map = {};
        [...consonants.split(','), ...vowels.split(',')].forEach(s => {
            const parts = s.trim().split('=');
            if (parts.length === 2) map[parts[0].trim()] = parts[1].trim();
        });
        return map;
    }, [consonants, vowels]);

    const consList = ['', ...parseList(consonants)];
    const vowList  = parseList(vowels);

    const allEntries = useMemo(() => {
        const grid = [];
        consList.forEach(c => {
            vowList.forEach(v => {
                const syl = c + v;
                // Display label uses mapped characters, not raw phonemes
                const conChar = phonemeToChar[c] || c;
                const vowChar = phonemeToChar[v] || v;
                const displayLabel = conChar + vowChar || vowChar;
                grid.push({ key: syl, displayLabel, symbol: syllabaryMap[syl] || '' });
            });
        });
        Object.keys(syllabaryMap).forEach(k => {
            if (!grid.find(e => e.key === k)) {
                grid.push({ key: k, displayLabel: k, symbol: syllabaryMap[k] });
            }
        });
        return grid;
    }, [syllabaryMap, consonants, vowels, phonemeToChar]);

    // Render as crisp SVG strokes if available, else font char, else dash
    const renderSymbol = (symbol) => {
        if (!symbol) return <span style={{ color: 'var(--tx2)', fontSize: '1.5rem', opacity: 0.3 }}>—</span>;
        const codePoint = symbol.codePointAt(0);
        const strokes = customGlyphs[codePoint];
        if (strokes && strokes.length > 0) {
            return (
                <svg viewBox="0 0 300 300" width="52" height="52">
                    {strokes.map((stroke, i) => (
                        <path
                            key={i}
                            d={`M ${stroke.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                            stroke="var(--acc)"
                            strokeWidth="14"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                        />
                    ))}
                </svg>
            );
        }
        return <span className="custom-font-text" style={{ fontSize: '2.2rem', color: 'var(--acc)', lineHeight: 1 }}>{symbol}</span>;
    };

    return (
        <div className="tab-pane-container">
            <Infobox title="Syllabary Register">
                Read-only showcase of every syllable mapped in your writing system. Draw and edit syllables in <b>System &rarr; Phonology</b>.
            </Infobox>
            {allEntries.length === 0 ? (
                <div className="empty-state glass">
                    <Type size={48} style={{ opacity: 0.2 }} />
                    <p>No syllables mapped yet. Add them in Phonology Settings.</p>
                </div>
            ) : (
                <div className="showcase-syllabary-grid">
                    {allEntries.map(({ key, displayLabel, symbol }) => (
                        <div key={key} className="showcase-syl-card glass">
                            <div className="showcase-syl-symbol">{renderSymbol(symbol)}</div>
                            <div className="showcase-syl-label">{displayLabel}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── LOGOGRAPHIC SHOWCASE ─────────────────────────────────────────────────────

const LogographicShowcase = ({ scriptId } = {}) => {
    const lexicon = useLexiconStore(state => state.lexicon) || [];
    const { customGlyphs } = useScriptScopedData(scriptId);

    const logographicWords = useMemo(() => {
        return lexicon.filter(w => w.ideogram && w.ideogram.trim() !== '');
    }, [lexicon]);

    // Render strokes as crisp inline SVG instead of font character
    const renderGlyph = (ideogram) => {
        const codePoint = ideogram.codePointAt(0);
        const strokes = customGlyphs[codePoint];
        if (strokes && strokes.length > 0) {
            return (
                <svg viewBox="0 0 300 300" width="80" height="80">
                    {strokes.map((stroke, i) => (
                        <path
                            key={i}
                            d={`M ${stroke.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                            stroke="var(--acc)"
                            strokeWidth="12"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                        />
                    ))}
                </svg>
            );
        }
        // Fallback: render the character itself at large size with smoothing
        return (
            <span className="custom-font-text" style={{
                fontSize: '4rem',
                lineHeight: 1,
                display: 'block',
                textRendering: 'geometricPrecision',
                WebkitFontSmoothing: 'antialiased',
            }}>{ideogram}</span>
        );
    };

    return (
        <div className="tab-pane-container">
            <Infobox title="Logographic Register">
                Every word in your lexicon that has a custom ideogram/character assigned appears here. Manage ideograms on individual lexicon entries.
            </Infobox>
            {logographicWords.length === 0 ? (
                <div className="empty-state glass">
                    <Languages size={48} style={{ opacity: 0.2 }} />
                    <p>No logographic entries found. Add ideograms to words in your Lexicon.</p>
                </div>
            ) : (
                <div className="alphabet-grid">
                    {logographicWords.map(word => (
                        <div key={word.id} className="char-card glass" style={{ cursor: 'default' }}>
                            <div className="char-display" style={{ height: 'auto', marginBottom: '0.5rem' }}>
                                {renderGlyph(word.ideogram)}
                            </div>
                            <div className="char-name-display" style={{ flexDirection: 'column', gap: '2px', textAlign: 'center' }}>
                                <span style={{ fontWeight: 700, color: 'var(--acc)' }}>{word.word}</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--tx2)' }}>{word.translation}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── HELPER COMPONENTS ───────────────────────────────────────────────────────────

const BlockShowcase = ({ scriptId } = {}) => {
    const { syllabaryMap, featuralComponents, customGlyphs } = useScriptScopedData(scriptId);
    const consonants         = useConfigStore(state => state.consonants) || '';
    const vowels             = useConfigStore(state => state.vowels) || '';
    const otherPhonemes      = useConfigStore(state => state.otherPhonemes) || '';

    const parseList = (str) => (str || '').split(',').map(s => {
        let c = s.trim();
        if (c.includes('=')) c = c.split('=')[0].trim();
        return c;
    }).filter(Boolean);

    // Build phoneme → script-character map
    const phonemeToChar = useMemo(() => {
        const map = {};
        [...consonants.split(','), ...vowels.split(','), ...otherPhonemes.split(',')].forEach(s => {
            const parts = s.trim().split('=');
            if (parts.length === 2) map[parts[0].trim()] = parts[1].trim();
        });
        return map;
    }, [consonants, vowels, otherPhonemes]);

    const allComponents = [...new Set([
        ...parseList(consonants),
        ...parseList(vowels),
        ...parseList(otherPhonemes)
    ])];

    const drawnComponents = allComponents.filter(c => featuralComponents[c]?.length > 0);
    const blockEntries    = Object.entries(syllabaryMap).filter(([, v]) => v && v.trim() !== '');

    // Translate a phoneme key (e.g. "ʁé") to morpheme chars (e.g. "ꞃɛ")
    const toMorphemeLabel = (key) => {
        // Try to map each character in the key through phonemeToChar
        // Keys can be multi-char phonemes like "ks", so we try longest-match
        let result = '';
        let remaining = key;
        while (remaining.length > 0) {
            let matched = false;
            // Try longest first
            for (let len = Math.min(remaining.length, 4); len >= 1; len--) {
                const chunk = remaining.slice(0, len);
                if (phonemeToChar[chunk]) {
                    result += phonemeToChar[chunk];
                    remaining = remaining.slice(len);
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                result += remaining[0];
                remaining = remaining.slice(1);
            }
        }
        return result;
    };

    // Render a compiled block as SVG strokes if available, else custom font char
    const renderBlockSymbol = (val) => {
        if (!val) return <span style={{ opacity: 0.3 }}>—</span>;
        const codePoint = val.codePointAt(0);
        const strokes = customGlyphs[codePoint];
        if (strokes && strokes.length > 0) {
            return (
                <svg viewBox="0 0 300 300" width="52" height="52">
                    {strokes.map((stroke, i) => (
                        <path
                            key={i}
                            d={`M ${stroke.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                            stroke="var(--acc)"
                            strokeWidth="14"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                        />
                    ))}
                </svg>
            );
        }
        return <span className="custom-font-text" style={{ fontSize: '2.2rem', color: 'var(--acc)', lineHeight: 1 }}>{val}</span>;
    };

    // ── Nothing at all ──────────────────────────────────────────────────────────
    if (drawnComponents.length === 0 && blockEntries.length === 0) {
        return (
            <div className="tab-pane-container">
                <Infobox title="Featural Block Register">
                    Showcase of your compiled block script. Draw base characters and compile in <b>System &rarr; Phonology</b>.
                </Infobox>
                <div className="empty-state glass">
                    <Hash size={48} style={{ opacity: 0.2 }} />
                    <p style={{ fontWeight: 700 }}>No base characters drawn yet.</p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--tx2)' }}>
                        Go to <b>System &rarr; Phonology</b>, draw each base character, then click <b>Compile Block Font</b> to generate your script.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="tab-pane-container">
            <Infobox title="Featural Block Register">
                Showcase of your compiled block script. Draw base characters and compile in <b>System &rarr; Phonology</b>.
            </Infobox>

            {/* Base Characters */}
            {drawnComponents.length > 0 && (
                <>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--tx2)', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Base Characters ({drawnComponents.length})
                    </h3>
                    <div className="showcase-block-base-grid">
                        {drawnComponents.map(comp => (
                            <div key={comp} className="showcase-block-base-card glass">
                                <svg viewBox="0 0 300 300" width="64" height="64" className="showcase-block-svg">
                                    {featuralComponents[comp].map((stroke, i) => (
                                        <path
                                            key={i}
                                            d={`M ${stroke.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                                            stroke="var(--acc)"
                                            strokeWidth="10"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            fill="none"
                                        />
                                    ))}
                                </svg>
                                <div className="showcase-syl-label">{phonemeToChar[comp] || comp}</div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Compiled Blocks */}
            {blockEntries.length > 0 ? (
                <>
                    <h3 style={{ margin: '2rem 0 1rem', color: 'var(--tx2)', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Compiled Blocks ({blockEntries.length})
                    </h3>
                    <div className="showcase-syllabary-grid">
                        {blockEntries.map(([key, val]) => (
                            <div key={key} className="showcase-syl-card glass">
                                <div className="showcase-syl-symbol">{renderBlockSymbol(val)}</div>
                                <div className="showcase-syl-label">{toMorphemeLabel(key)}</div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="empty-state glass" style={{ marginTop: '2rem' }}>
                    <Hash size={40} style={{ opacity: 0.2 }} />
                    <p style={{ fontWeight: 700 }}>Base characters ready — blocks not compiled yet.</p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--tx2)' }}>
                        Go to <b>System &rarr; Phonology</b> and click <b>Compile Block Font</b> to generate the full block grid.
                    </p>
                </div>
            )}
        </div>
    );
};


// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function OrthographyPage() {
    const phonologyTypes = useConfigStore(state => state.phonologyTypes);
    const activeScriptSystemId = useConfigStore(state => state.activeScriptSystemId);
    const scriptSystems = useConfigStore(state => state.scriptSystems) || [];
    const scriptRules = useConfigStore(state => state.scriptRules) || {};
    const setActiveScriptSystem = useConfigStore(state => state.setActiveScriptSystem);
    const [activeTab, setActiveTab] = useState('script');

    const defaultScriptId = scriptRules.defaultScriptId || getDefaultScriptId({ scriptSystems, scriptRules });
    const activeScript = getScriptSystem({ scriptSystems, scriptRules, phonologyTypes }, activeScriptSystemId || defaultScriptId);
    const scriptType = activeScript?.type || phonologyTypes || 'alphabetic';

    // Active script selector bar (shown on script-editing tabs)
    const showScriptPicker = scriptSystems.length > 1 && (activeTab === 'script' || activeTab === 'rules');

    const renderActiveScriptDropdown = () => {
        if (!showScriptPicker) return null;
        return (
            <div className="script-active-dropdown-wrap">
                <label className="script-active-dropdown-label">Editing script:</label>
                <select
                    className="script-active-dropdown"
                    value={activeScriptSystemId || defaultScriptId}
                    onChange={e => setActiveScriptSystem(e.target.value)}
                >
                    {scriptSystems.map(s => (
                        <option key={s.id} value={s.id}>{s.name}{s.id === defaultScriptId ? ' (default)' : ''}</option>
                    ))}
                </select>
            </div>
        );
    };

    const renderScriptShowcase = () => {
        switch (scriptType) {
            case 'syllabic':      return <SyllabaryShowcase scriptId={activeScriptSystemId} />;
            case 'logographic':   return <LogographicShowcase scriptId={activeScriptSystemId} />;
            case 'featural_block':
            case 'featural':
            case 'block':         return <BlockShowcase scriptId={activeScriptSystemId} />;
            default:              return <AlphabeticShowcase scriptId={activeScriptSystemId} />;
        }
    };

    return (
        <div className="orthography-page-container">
            <header className="page-header">
                <div className="header-content">
                    <h1 className="flex gap-3 items-center">
                        <Languages className="text-accent" size={32} />
                        Writing System & Numerals
                    </h1>
                    <p className="subtitle">
                        Define how your language represents sounds, quantities, and time.
                    </p>
                </div>

                <nav className="tabs tabs-boxed page-subnav">
                    <button 
                        className={`tab ${activeTab === 'scripts' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('scripts')}
                    >
                        <PenTool size={18} /> Scripts
                    </button>
                    <button 
                        className={`tab ${activeTab === 'script' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('script')}
                    >
                        <BookA size={18} /> Script Register
                    </button>
                    <button 
                        className={`tab ${activeTab === 'rules' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('rules')}
                    >
                        <ListChecks size={18} /> Rules
                    </button>
                    <button 
                        className={`tab ${activeTab === 'numbers' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('numbers')}
                    >
                        <Hash size={18} /> Numeric System
                    </button>
                    <button 
                        className={`tab ${activeTab === 'ipa' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('ipa')}
                    >
                        <Mic2 size={18} /> IPA Reference
                    </button>
                </nav>
            </header>

            <main className="page-main-content">
                {activeTab === 'scripts'  && (
                    <div className="tab-pane-container">
                        <ScriptManager />
                    </div>
                )}
                {activeTab === 'script'  && (
                    <div className="tab-pane-container">
                        {renderActiveScriptDropdown()}
                        {renderScriptShowcase()}
                    </div>
                )}
                {activeTab === 'rules'   && (
                    <div className="tab-pane-container">
                        {renderActiveScriptDropdown()}
                        <ScriptRulesEditor />
                    </div>
                )}
                {activeTab === 'numbers' && <NumbersTab />}
                {activeTab === 'ipa'     && <IpaReferencePage />}
            </main>
        </div>
    );
}

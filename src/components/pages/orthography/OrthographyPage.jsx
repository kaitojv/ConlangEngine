import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import Card from '../../UI/Card/Card.jsx';
import Input from '../../UI/Input/Input.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import { Languages, Hash, Plus, Trash2, Calculator, Settings, Edit2, Check, Table2, BookA, Type, Mic2, PenTool, ListChecks, Rows, Eye, EyeOff, FileX as FileXIcon, Sparkles } from 'lucide-react';
import IpaReferencePage from './IpaReferencePage.jsx';
import './orthographyPage.css';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { useTransliterator } from '../../../hooks/useTransliterator.jsx';
import { getScriptSystem, getDefaultScriptId, buildScriptConfig } from '../../../utils/scriptResolver.js';
import { transliterateText } from '../../../utils/transliteration.js';
import { useShallow } from 'zustand/react/shallow';
import ScriptManager from '../../UI/ScriptManager/ScriptManager.jsx';
import ScriptRulesEditor from '../../UI/ScriptRulesEditor/ScriptRulesEditor.jsx';
import GlyphDetailsModal from '../../UI/GlyphDetailsModal/GlyphDetailsModal.jsx';
import GlyphPreviewBadge from '../../UI/Glyph/GlyphPreviewBadge.jsx';
import { getGlyphMetrics } from '../../UI/Glyph/resolveGlyphStrokes.js';
import {
    resolveNumeralComponents,
    buildNumeralAtoms,
    numeralName,
    buildLexiconIndex,
    resolveWordGlyphs
} from '../../UI/Glyph/resolveNumeralGlyphs.js';
import GlyphBaselineRow from '../../UI/Glyph/GlyphBaselineRow.jsx';
import StrokeOrderModal from '../../UI/StrokeOrder/StrokeOrderModal.jsx';
import NumeralGlyphPickerModal from './NumeralGlyphPickerModal.jsx';
import toast from 'react-hot-toast';

// --- SUB-COMPONENTS ---

// Every config field buildScriptConfig() and transliterateText() read. Selected
// with useShallow so the numerals preview only recomputes when one of them changes.
const SCRIPT_CONFIG_KEYS = [
    'scriptSystems', 'scriptRules', 'scriptDataById', 'activeScriptSystemId',
    'phonologyTypes', 'alphabeticScript', 'writingDirection', 'syllabificationAlgorithm',
    'blockSettings', 'blockTemplates', 'alphabetNames',
    'customGlyphs', 'syllabaryMap', 'featuralComponents', 'alphabetGlyphs',
    'customFontBase64', 'customFont', 'puaCounter',
    'consonants', 'vowels', 'otherPhonemes', 'typographySettings'
];

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

const NumberDerivationView = ({ generateNumberName }) => {
    const { t } = useTranslation();
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
                    <Check size={18} /> {t('orthography.numerals.saveToLexicon')}
                </button>
            </div>

            <Card className="matrix-card">
                <div className="matrix-header" style={{ marginBottom: '1.5rem' }}>
                    <h2 className="sg-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{t('orthography.numerals.derivedEngineTitle')}</h2>
                    <p style={{ color: 'var(--tx2)' }}>{t('orthography.numerals.derivedEngineDesc')}</p>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--tx2)' }}>{t('orthography.numerals.ordinalAffix')}</label>
                        <input className="fi" placeholder="e.g. -stu" value={numberDerivedRules.ordinal} onChange={(e) => handleRuleChange('ordinal', e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--tx2)' }}>{t('orthography.numerals.fractionalAffix')}</label>
                        <input className="fi" placeholder="e.g. -ly" value={numberDerivedRules.fractional} onChange={(e) => handleRuleChange('fractional', e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--tx2)' }}>{t('orthography.numerals.multiplierAffix')}</label>
                        <input className="fi" placeholder="e.g. -ce" value={numberDerivedRules.multiplier} onChange={(e) => handleRuleChange('multiplier', e.target.value)} />
                    </div>
                </div>

                <div style={{ background: 'var(--s2)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--bd)' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 className="sg-title" style={{ fontSize: '1.1rem', color: 'var(--acc)' }}>{t('orthography.numerals.liveTester')}</h3>
                        <input type="number" min="0" className="fi" style={{ width: '120px' }} value={testNum} onChange={(e) => setTestNum(parseInt(e.target.value) || 0)} />
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                        <div style={{ background: 'var(--s4)', padding: '1rem', borderRadius: '0.75rem', border: '1px dashed var(--acc)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 700 }}>{t('orthography.numerals.baseLabel')}</div>
                            <div className="custom-font-text" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--tx)' }}>{transliterate(testBaseForm || '') || '-'}</div>
                        </div>
                        <div style={{ background: 'var(--s4)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--bd)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 700 }}>{t('orthography.numerals.ordinalLabel')}</div>
                            <div className="custom-font-text" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--tx)' }}>{transliterate(testOrdinal || '') || '-'}</div>
                        </div>
                        <div style={{ background: 'var(--s4)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--bd)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 700 }}>{t('orthography.numerals.fractionalLabel')}</div>
                            <div className="custom-font-text" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--tx)' }}>{transliterate(testFractional || '') || '-'}</div>
                        </div>
                        <div style={{ background: 'var(--s4)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--bd)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 700 }}>{t('orthography.numerals.multiplierLabel')}</div>
                            <div className="custom-font-text" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--tx)' }}>{transliterate(testMultiplier || '') || '-'}</div>
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="matrix-card">
                <div style={{ marginBottom: '1.5rem' }}>
                    <h2 className="sg-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{t('orthography.numerals.timeSystemTitle')}</h2>
                    <p style={{ color: 'var(--tx2)' }}>{t('orthography.numerals.timeSystemDesc')}</p>
                </div>
                
                <h3 className="sg-title" style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--acc)' }}>{t('orthography.numerals.coreTimeVocab')}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                    {[
                        { key: 'second', label: t('orthography.numerals.timeSecond') },
                        { key: 'minute', label: t('orthography.numerals.timeMinute') },
                        { key: 'hour', label: t('orthography.numerals.timeHour') },
                        { key: 'day', label: t('orthography.numerals.timeDay') },
                        { key: 'week', label: t('orthography.numerals.timeWeek') },
                        { key: 'month', label: t('orthography.numerals.timeMonth') },
                        { key: 'year', label: t('orthography.numerals.timeYear') },
                    ].map(({ key, label }) => (
                        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--tx2)' }}>{label}</label>
                            <input 
                                className="fi" 
                                placeholder={t('orthography.numerals.wordForUnit', { unit: key })}
                                value={timeSystemVocab[key] || ''} 
                                onChange={(e) => handleTimeChange(key, e.target.value)} 
                            />
                        </div>
                    ))}
                </div>

                <div style={{ width: '100%', height: '1px', background: 'var(--bd)', marginBottom: '2.5rem' }}></div>

                <h3 className="sg-title" style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--acc)' }}>{t('orthography.numerals.specificCalendarNames')}</h3>
                <p style={{ color: 'var(--tx2)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{t('orthography.numerals.specificCalendarDesc')}</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    <div className="matrix-table-wrapper">
                        <table className="matrix-table">
                            <thead>
                                <tr>
                                    <th>{t('orthography.numerals.dayOfWeekHeader')}</th>
                                    <th>{t('orthography.numerals.wordHeader')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[1,2,3,4,5,6,7].map(day => (
                                    <tr key={day}>
                                        <td className="matrix-num-cell" style={{ color: 'var(--tx2)' }}>{t('orthography.numerals.dayN', { num: day })}</td>
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
                                    <th>{t('orthography.numerals.monthOfYearHeader')}</th>
                                    <th>{t('orthography.numerals.wordHeader')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[1,2,3,4,5,6,7,8,9,10,11,12].map(month => (
                                    <tr key={month}>
                                        <td className="matrix-num-cell" style={{ color: 'var(--tx2)' }}>{t('orthography.numerals.monthN', { num: month })}</td>
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

const MeasurementSystemView = () => {
    const { t } = useTranslation();
    const measurementSystem = useConfigStore(state => state.measurementSystem) || { units: [] };
    const updateConfig = useConfigStore(state => state.updateConfig);
    
    const [units, setUnits] = useState(measurementSystem.units || []);

    const saveUnits = (newUnits) => {
        setUnits(newUnits);
        updateConfig({ measurementSystem: { ...measurementSystem, units: newUnits } });
    };

    const addUnit = () => {
        const newUnit = { id: `unit_${Date.now()}`, name: '', type: 'length', baseEquivalent: '', isBaseUnit: false, conversionFactor: 1, description: '' };
        saveUnits([...units, newUnit]);
    };

    const updateUnit = (id, field, value) => {
        saveUnits(units.map(u => u.id === id ? { ...u, [field]: value } : u));
    };

    const removeUnit = (id) => {
        saveUnits(units.filter(u => u.id !== id));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <Card className="matrix-card">
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 className="sg-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{t('orthography.numerals.measurementTitle')}</h2>
                        <p style={{ color: 'var(--tx2)' }}>{t('orthography.numerals.measurementDesc')}</p>
                    </div>
                    <button className="btn-add" onClick={addUnit} style={{ display: 'flex', alignItems: 'center', gap: '6px', height: 'fit-content' }}>
                        <Plus size={16} /> {t('orthography.numerals.addUnitBtn')}
                    </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {units.map(unit => (
                        <div key={unit.id} style={{ background: 'var(--s2)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--bd)', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                            <div style={{ flex: '1 1 150px' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>{t('orthography.numerals.unitNameLabel')}</label>
                                <input className="fi" placeholder="e.g. schmekal" value={unit.name} onChange={(e) => updateUnit(unit.id, 'name', e.target.value)} />
                            </div>
                            <div style={{ flex: '1 1 120px' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>{t('orthography.numerals.unitTypeLabel')}</label>
                                <select className="select select-bordered select-sm w-full" value={unit.type} onChange={(e) => updateUnit(unit.id, 'type', e.target.value)} style={{ height: '42px' }}>
                                    <option value="length">{t('orthography.numerals.typeLength')}</option>
                                    <option value="mass">{t('orthography.numerals.typeMass')}</option>
                                    <option value="volume">{t('orthography.numerals.typeVolume')}</option>
                                    <option value="time">{t('orthography.numerals.typeTime')}</option>
                                    <option value="other">{t('orthography.numerals.typeOther')}</option>
                                </select>
                            </div>
                            <div style={{ flex: '2 1 200px' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>{t('orthography.numerals.unitEquivalentLabel')}</label>
                                <input className="fi" placeholder="e.g. 27 schmems or 1 kg" value={unit.baseEquivalent} onChange={(e) => updateUnit(unit.id, 'baseEquivalent', e.target.value)} />
                            </div>
                            <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', height: '100%', paddingTop: '1.5rem' }}>
                                <button className="irr-del" onClick={() => removeUnit(unit.id)} title={t('orthography.numerals.removeUnit')} style={{ padding: '8px' }}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {units.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--tx3)' }}>
                            {t('orthography.numerals.noUnits')}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

const NumbersTab = ({ activeScriptDropdown = null } = {}) => {
    const { t } = useTranslation();
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
    const phonologyTypes = useConfigStore(state => state.phonologyTypes);
    const { transliterate } = useTransliterator();
    // Required by transliterate()'s logographic branch: it resolves a word to its
    // drawn glyph via the lexicon entry's `ideogram`. Without it the call falls
    // through to `return cleanWord`, i.e. the romanized name instead of the glyph.
    const lexicon = useLexiconStore(state => state.lexicon) || [];

    // Numeral glyphs are resolved through the ACTIVE script only. Every script
    // allocates its own PUA codepoints from U+E000, so looking a codepoint up in
    // "any script" (or transliterating with the root config while another script
    // is active) drew glyphs from the wrong script - the "random letters" bug.
    const scriptState = useConfigStore(useShallow(state => {
        const cfg = {};
        for (const key of SCRIPT_CONFIG_KEYS) cfg[key] = state[key];
        return cfg;
    }));
    const activeScriptId = scriptState.activeScriptSystemId || getDefaultScriptId(scriptState);
    const scriptConfig = useMemo(
        () => buildScriptConfig(scriptState, activeScriptId),
        [scriptState, activeScriptId]
    );
    const activeScriptType = scriptConfig.phonologyTypes || phonologyTypes || 'alphabetic';
    const lexiconIndex = useMemo(() => buildLexiconIndex(lexicon), [lexicon]);
    // Read here (not via a per-glyph hook) because the number preview resolves MANY
    // glyphs in a loop, which requires the pure lookup rather than a hook call.
    const glyphOpts = useMemo(() => ({
        scriptType: activeScriptType,
        customGlyphs: scriptConfig.customGlyphs || {},
        lexiconIndex,
        lexicon,
        numberSystem,
        // Numeral names are not lexicon words, so no lexicon is passed: a syllabic
        // transliteration would otherwise substitute another script's ideogram.
        transliterate: (word) => transliterateText(word, scriptConfig, []),
        getMetrics: getGlyphMetrics
    }), [activeScriptType, scriptConfig, lexiconIndex, lexicon, numberSystem]);
    const [testNumber, setTestNumber] = useState('');
    // Eye toggle: hides the generated number glyph until explicitly revealed.
    const [showTestResult, setShowTestResult] = useState(false);
    const [viewMode, setViewMode] = useState('basic');
    const [listCols, setListCols] = useState(1);
    const [selectedNumberForStroke, setSelectedNumberForStroke] = useState(null);
    const [selectedNumberForGlyphPicker, setSelectedNumberForGlyphPicker] = useState(null);
    // Which digit rows have their (rendered) number revealed via the eye toggle.
    const [revealedNumbers, setRevealedNumbers] = useState({});
    
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

    const generateNumberName = useCallback(
        (num) => {
            const atoms = buildNumeralAtoms(num, numberSystem, numeralBase);
            return numeralName(atoms, numberSystem.settings);
        },
        [numberSystem, numeralBase]
    );

    // Glyph form of the previewed number.
    //
    // Two separate things had to be fixed here:
    //
    // 1. The old code joined the whole number into one string and asked for a SINGLE
    //    codepoint, so any multi-glyph number reported "No glyph entry".
    // 2. Splitting per numeral component was still not enough. A component is a
    //    *written* name (e.g. senary "f┼ì" for one), which transliterates to a
    //    *run* of script characters - and with Internal Fusion on, one component
    //    fuses power+digit ("n┼½n─½") into several glyphs. A component is therefore
    //    NOT one glyph.
    //
    // So each component is transliterated first, then the RESULT is split into
    // individual characters, and every character is resolved on its own. That is the
    // same per-character contract the rest of the app uses, so it works for stems,
    // fusion, and every script type.
    const testNumberValue = parseInt(testNumber);
    const testAtoms = useMemo(
        () => (isNaN(testNumberValue) ? [] : buildNumeralAtoms(testNumberValue, numberSystem, numeralBase)),
        [testNumberValue, numberSystem, numeralBase]
    );

    const testResult = useMemo(() => {
        if (isNaN(testNumberValue)) return '';
        return numeralName(testAtoms, numberSystem.settings);
    }, [testNumberValue, testAtoms, numberSystem.settings]);

    // Flat list of { char, strokes, sepBefore } in numeral order.
    // Built from atoms and resolved through the active script's customGlyphs,
    // so stems legitimately fall back to their digit's ideogram and alphabetic
    // scripts resolve via transliteration rather than checking the lexicon.
    const testGlyphParts = useMemo(() => resolveNumeralComponents(testAtoms, {
        ...glyphOpts,
        getMetrics: getGlyphMetrics
    }), [testAtoms, glyphOpts]);

    const testHasGlyph = testGlyphParts.length > 0;

    // Glyphs are joined with the same separator the written form uses, so the two
    // representations stay visually consistent. Global Fusion means no separator.
    const testGlyphSeparator = (numberSystem.settings?.globalFusion)
        ? ''
        : (numberSystem.settings?.separator ?? ' ');

    // Fallback glyph string for the stroke-order modal: the rendered glyphs only,
    // with no separator, so resolveWordStrokes() sees pure glyph characters.
    const testGlyph = useMemo(
        () => testGlyphParts.map(p => p.char).join(''),
        [testGlyphParts]
    );

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

    // Shared trailing controls for each number row: a pen button to edit the glyph,
    // an eye button that reveals the rendered glyph, and a sparkles button to pick or define the main glyph.
    const renderDigitControls = (key, name, val) => {
        const resolved = name ? resolveWordGlyphs(name, glyphOpts) : null;
        const isPinned = Boolean(numberSystem.digitGlyphs?.[key]);
        const itemLabel = key.startsWith('power-')
            ? `Base^${key.replace('power-', '')}`
            : key === '0'
            ? 'Digit 0'
            : `Digit ${key}`;

        const openPicker = () => setSelectedNumberForGlyphPicker({
            key,
            name,
            value: val !== undefined ? val : (key.startsWith('power-') ? Number(key.replace('power-', '')) : Number(key)),
            label: itemLabel
        });

        return (
            <div className="digit-number-cell">
                {name && (
                    <>
                        <button
                            type="button"
                            className="num-icon-btn"
                            onClick={() => setSelectedNumberForStroke({
                                word: name,
                                name: `${key} (${name})`,
                                scriptType: activeScriptType
                            })}
                            title={t('orthography.numerals.viewStroke')}
                        >
                            <PenTool size={13} />
                        </button>
                        <button
                            type="button"
                            className={`num-icon-btn ${revealedNumbers[key] ? 'active' : ''}`}
                            onClick={() => setRevealedNumbers(prev => ({ ...prev, [key]: !prev[key] }))}
                            title={revealedNumbers[key] ? t('orthography.numerals.hideGlyph') : t('orthography.numerals.showGlyph')}
                        >
                            {revealedNumbers[key] ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <button
                            type="button"
                            className={`num-icon-btn ${isPinned ? 'active pinned' : ''}`}
                            onClick={openPicker}
                            title={isPinned ? t('orthography.numerals.pinnedMainGlyph', { glyph: numberSystem.digitGlyphs[key] }) : t('orthography.numerals.chooseMainGlyph')}
                        >
                            <Sparkles size={13} />
                        </button>
                        {revealedNumbers[key] && resolved && (
                            resolved.complete ? (
                                <span 
                                    className="digit-glyphs-inline" 
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }}
                                    onClick={openPicker}
                                    title={t('orthography.numerals.clickToChooseGlyph')}
                                >
                                    {resolved.chars.map((c, i) => (
                                        <GlyphPreviewBadge
                                            key={i}
                                            glyph={c.char}
                                            strokes={c.raw}
                                            scriptId={activeScriptId}
                                            size={24}
                                            showCode={false}
                                            title={isPinned ? `Pinned: ${c.char}` : "Custom glyph"}
                                        />
                                    ))}
                                    {isPinned && <span className="pinned-dot" title="User-chosen main glyph">★</span>}
                                </span>
                            ) : (
                                <span 
                                    className="custom-font-text notranslate digit-glyphs-inline" 
                                    style={{ fontSize: '0.9rem', color: 'var(--tx2)', cursor: 'pointer' }}
                                    onClick={openPicker}
                                    title={t('orthography.numerals.clickToChooseGlyph')}
                                >
                                    {resolved.chars.map(c => c.char).join('') || name}
                                    {isPinned && <span className="pinned-dot" title="User-chosen main glyph">★</span>}
                                </span>
                            )
                        )}
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="tab-pane-container">
            {activeScriptDropdown && (
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-start' }}>
                    {activeScriptDropdown}
                </div>
            )}
            <div className="matrix-toggle-container" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                <div className="tabs tabs-boxed page-subnav">
                    <button className={`tab ${viewMode === 'basic' ? 'tab-active' : ''}`} onClick={() => setViewMode('basic')}>
                        <Settings size={16} style={{ marginRight: '6px' }}/> {t('orthography.numerals.tabs.basic')}
                    </button>
                    <button className={`tab ${viewMode === 'matrix' ? 'tab-active' : ''}`} onClick={() => setViewMode('matrix')}>
                        <Table2 size={16} style={{ marginRight: '6px' }}/> {t('orthography.numerals.tabs.matrix')}
                    </button>
                    <button className={`tab ${viewMode === 'measurement' ? 'tab-active' : ''}`} onClick={() => setViewMode('measurement')}>
                        <Rows size={16} style={{ marginRight: '6px' }}/> {t('orthography.numerals.tabs.measurement')}
                    </button>
                </div>
            </div>

            {viewMode === 'basic' ? (
                <>
                    <Infobox title={t('orthography.numerals.infobox.title')}>
                        <p>{t('orthography.numerals.infobox.intro')}</p>
                        <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem' }}>
                            <li>{t('orthography.numerals.infobox.baseDigits')}</li>
                            <li>{t('orthography.numerals.infobox.powers')}</li>
                            <li><b>{t('orthography.numerals.infobox.fusionTitle')}</b>
                                <ul style={{ paddingLeft: '1.2rem', opacity: 0.8, fontSize: '0.9em', marginTop: '0.25rem' }}>
                                    <li>{t('orthography.numerals.infobox.internalFusion')}</li>
                                    <li>{t('orthography.numerals.infobox.globalFusion')}</li>
                                    <li>{t('orthography.numerals.infobox.internalOrder')}</li>
                                    <li>{t('orthography.numerals.infobox.magnitudeOrder')}</li>
                                    <li>{t('orthography.numerals.infobox.separator')}</li>
                                </ul>
                            </li>
                        </ul>
                    </Infobox>

            <div className="numbers-layout">
                <div className="numbers-main">
                    <Card>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <h2 className="flex sg-title items-center gap-2" style={{ margin: 0 }}>
                                <Settings size={20} />
                                {t('orthography.numerals.baseDigitsTitle', { base: numeralBase - 1 })}
                            </h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--tx2)', fontWeight: 600 }}>{t('orthography.numerals.columns')}</span>
                                <input 
                                    type="range" 
                                    min="1" max="4" 
                                    value={listCols} 
                                    onChange={(e) => setListCols(parseInt(e.target.value))}
                                    style={{ width: '80px', accentColor: 'var(--acc)' }}
                                />
                                <span style={{ fontSize: '0.85rem', color: 'var(--tx)', width: '12px', textAlign: 'center', fontWeight: 600 }}>{listCols}</span>
                            </div>
                        </div>
                        <div className="digits-grid-wide" style={{ '--grid-cols': `repeat(${listCols}, 1fr)` }}>
                            {Array.from({ length: listCols }).map((_, i) => (
                                <div key={`header-${i}`} className="digit-entry-header">
                                    <span>{t('orthography.numerals.num')}</span>
                                    <span>{t('orthography.numerals.fullName')}</span>
                                    <span>{t('orthography.numerals.stem')}</span>
                                </div>
                            ))}
                            <div className="digit-row-entry">
                                <span className="digit-label">0</span>
                                <input 
                                    className="char-name-input"
                                    value={numberSystem.zero || ''}
                                    onChange={(e) => updateSystem('zero', e.target.value)}
                                    placeholder={t('orthography.numerals.zeroPlaceholder')}
                                />
                                <div className="digit-stem-cell">
                                    {renderDigitControls('0', numberSystem.zero, 0)}
                                </div>
                            </div>
                            {digitIndices.map(d => (
                                <div key={d} className="digit-row-entry">
                                    <span className="digit-label">{d}</span>
                                    <input 
                                        className="char-name-input"
                                        value={numberSystem.digits?.[d] || ''}
                                        onChange={(e) => updateMap('digits', d, e.target.value)}
                                        placeholder={t('orthography.numerals.namePlaceholder')}
                                    />
                                    <div className="digit-stem-cell">
                                        <input 
                                            className="char-name-input stem-input"
                                            value={numberSystem.stems?.[d] || ''}
                                            onChange={(e) => updateMap('stems', d, e.target.value)}
                                            placeholder={t('orthography.numerals.stemPlaceholder')}
                                        />
                                        {renderDigitControls(String(d), numberSystem.digits?.[d], d)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card>
                        <h2 className="flex sg-title items-center gap-2">
                            <Plus size={20} />
                            {t('orthography.numerals.powersTitle', { base: numeralBase })}
                        </h2>
                        <div className="powers-grid">
                            {Array.from({ length: powerCount }, (_, i) => i + 1).map(p => {
                                const val = Math.pow(numeralBase, p);
                                // Format large numbers with commas for readability
                                const labelVal = val.toLocaleString();
                                return (
                                    <div key={p} className="digit-entry">
                                        <label>{numeralBase}<sup>{p}</sup> ({labelVal})</label>
                                        <div className="power-row-controls">
                                            <input 
                                                className="char-name-input power-name-input"
                                                value={numberSystem.powers?.[val] || ''}
                                                onChange={(e) => updateMap('powers', val, e.target.value)}
                                                placeholder={t('orthography.numerals.nameForPower', { value: labelVal })}
                                            />
                                            {renderDigitControls(`power-${val}`, numberSystem.powers?.[val], val)}
                                            {p === powerCount && p > 6 && (
                                                <button 
                                                    type="button"
                                                    className="num-icon-btn"
                                                    onClick={() => {
                                                        updateMap('powers', val, '');
                                                        setPowerCount(prev => prev - 1);
                                                    }}
                                                    title={t('orthography.numerals.removePower')}
                                                >
                                                    <Trash2 size={13} />
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
                            <Plus size={14} /> {t('orthography.numerals.addPower')}
                        </button>
                    </Card>

                    <Card>
                        <h2 className="flex sg-title items-center gap-2">
                            <Trash2 size={20} />
                            {t('orthography.numerals.irregularsTitle')}
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
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        {name && (
                                            <button 
                                                type="button"
                                                className="num-stroke-preview-btn" 
                                                onClick={() => setSelectedNumberForStroke({ word: name, name: `${val} (${name})` })}
                                                title={t('orthography.numerals.viewStroke')}
                                            >
                                                <span className="custom-font-text notranslate">{transliterate(name)}</span>
                                                <PenTool size={12} />
                                            </button>
                                        )}
                                        <button className="irr-del" onClick={() => updateMap('irregulars', val, '')}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <div className="add-irregular">
                                <input type="number" ref={newIrrValRef} placeholder={t('orthography.numerals.num')} className="small-num-input" />
                                <input type="text" ref={newIrrNameRef} placeholder={t('orthography.numerals.namePlaceholder')} className="small-name-input" />
                                <button className="btn-add" onClick={handleAddIrregular}>{t('orthography.numerals.add')}</button>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="numbers-sidebar">
                    <Card className="settings-card">
                        <h2 className="flex sg-title items-center gap-2">
                            <Settings size={20} />
                            {t('orthography.numerals.namingStrategy')}
                        </h2>
                        <div className="strategy-options">
                            <div className="toggle-row">
                                <label className="strategy-label">{t('orthography.numerals.hideOne')}</label>
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
                                <label className="strategy-label">{t('orthography.numerals.internalFusion')}</label>
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
                                <label className="strategy-label">{t('orthography.numerals.globalFusion')}</label>
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
                                <label className="strategy-label">{t('orthography.numerals.useStemsForUnits')}</label>
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
                                <label>{t('orthography.numerals.internalOrder')}</label>
                                <select 
                                    className="select select-bordered select-sm w-full"
                                    value={numberSystem.settings?.internalOrder || 'digit-first'}
                                    onChange={(e) => updateSystem('settings', { ...numberSystem.settings, internalOrder: e.target.value })}
                                >
                                    <option value="digit-first">{t('orthography.numerals.digitPlusPower')}</option>
                                    <option value="unit-first">{t('orthography.numerals.powerPlusDigit')}</option>
                                </select>
                            </div>

                            <div className="select-row">
                                <label>{t('orthography.numerals.magnitudeOrder')}</label>
                                <select 
                                    className="select select-bordered select-sm w-full"
                                    value={numberSystem.settings?.magnitudeOrder || 'standard'}
                                    onChange={(e) => updateSystem('settings', { ...numberSystem.settings, magnitudeOrder: e.target.value })}
                                >
                                    <option value="standard">{t('orthography.numerals.highToLow')}</option>
                                    <option value="unit-first">{t('orthography.numerals.lowToHigh')}</option>
                                </select>
                            </div>

                            <div className="input-row">
                                <label>{t('orthography.numerals.separator')}</label>
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
                            {t('orthography.numerals.preview')}
                        </h2>
                        <div className="preview-body">
                            <div className="preview-input-row">
                                <input
                                    type="number"
                                    className="fi test-input"
                                    value={testNumber}
                                    onChange={(e) => setTestNumber(e.target.value)}
                                    placeholder={t('orthography.numerals.previewPlaceholder')}
                                />
                                {testResult && (
                                    <>
                                        <button
                                            type="button"
                                            className="num-icon-btn"
                                            onClick={() => setSelectedNumberForStroke({
                                                // Prefer the resolved glyphs so the viewer tabs
                                                // through exactly what the preview shows. Falls
                                                // back to the written name if none resolved.
                                                word: testGlyph || testResult,
                                                name: `${testNumber || 'Result'}: ${testResult}`,
                                                scriptType: activeScriptType
                                            })}
                                            title={t('orthography.numerals.viewStroke')}
                                        >
                                            <PenTool size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            className={`num-icon-btn ${showTestResult ? 'active' : ''}`}
                                            onClick={() => setShowTestResult(prev => !prev)}
                                            title={showTestResult ? t('orthography.numerals.hideGlyph') : t('orthography.numerals.showGlyph')}
                                        >
                                            {showTestResult ? <EyeOff size={13} /> : <Eye size={13} />}
                                        </button>
                                    </>
                                )}
                            </div>
                            <div className="result-display">
                                <span className="result-label">{t('orthography.numerals.resultLabel')}</span>
                                {/* Default: the written (romanized) form. The eye toggle
                                    swaps this for the drawn glyph. */}
                                {testResult ? (
                                    showTestResult ? (
                                        testHasGlyph ? (
                                            /* Glyphs sit on a shared baseline and are spaced by
                                                each glyph's own character gaps, matching the
                                                compiled font. Not one badge per glyph - connected
                                                scripts must read as a continuous run. */
                                            <GlyphBaselineRow
                                                parts={testGlyphParts}
                                                separator={testGlyphSeparator}
                                                height={110}
                                            />
                                        ) : (
                                            <div className="result-no-glyph">
                                                <FileXIcon size={24} />
                                                <span>{t('orthography.numerals.noGlyph')}</span>
                                            </div>
                                        )
                                    ) : (
                                        <div
                                            className="result-value custom-font-text notranslate result-value-clickable"
                                            onClick={() => setSelectedNumberForStroke({
                                                word: testResult,
                                                name: `${testNumber || 'Result'}: ${testResult}`,
                                                scriptType: activeScriptType
                                            })}
                                            title={t('orthography.numerals.viewStroke')}
                                        >
                                            <span>{testResult}</span>
                                        </div>
                                    )
                                ) : (
                                    <div className="result-value result-value-empty">
                                        <span>—</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
                </>
            ) : viewMode === 'matrix' ? (
                <NumberDerivationView generateNumberName={generateNumberName} numeralBase={numeralBase} />
            ) : (
                <MeasurementSystemView />
            )}

            {selectedNumberForStroke && (
                <StrokeOrderModal
                    isOpen={!!selectedNumberForStroke}
                    onClose={() => setSelectedNumberForStroke(null)}
                    word={selectedNumberForStroke.word}
                    name={selectedNumberForStroke.name}
                    scriptType={selectedNumberForStroke.scriptType || activeScriptType}
                />
            )}

            {selectedNumberForGlyphPicker && (
                <NumeralGlyphPickerModal
                    isOpen={!!selectedNumberForGlyphPicker}
                    onClose={() => setSelectedNumberForGlyphPicker(null)}
                    item={selectedNumberForGlyphPicker}
                    scriptId={activeScriptId}
                    scriptConfig={scriptConfig}
                    lexicon={lexicon}
                    currentOverride={numberSystem.digitGlyphs?.[selectedNumberForGlyphPicker.key]}
                    onSelectGlyph={(glyph) => {
                        const newOverrides = { ...(numberSystem.digitGlyphs || {}) };
                        if (glyph) {
                            newOverrides[selectedNumberForGlyphPicker.key] = glyph;
                        } else {
                            delete newOverrides[selectedNumberForGlyphPicker.key];
                        }
                        updateSystem('digitGlyphs', newOverrides);
                    }}
                />
            )}
        </div>
    );
};

const AlphabeticShowcase = ({ scriptId, onGlyphClick, registerCols } = {}) => {
    const { t } = useTranslation();
    const consonants = useConfigStore(state => state.consonants) || '';
    const vowels = useConfigStore(state => state.vowels) || '';
    const otherPhonemes = useConfigStore(state => state.otherPhonemes) || '';
    const alphabetNames = useConfigStore(state => state.alphabetNames) || {};
    const { alphabetGlyphs } = useScriptScopedData(scriptId);

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
            <Infobox title={t('orthography.alphabeticRegisterTitle')}>
                <span dangerouslySetInnerHTML={{ __html: t('orthography.alphabeticRegisterDesc') }} />
            </Infobox>

            <div className="alphabet-grid" style={registerCols > 0 ? { '--grid-cols': `repeat(${registerCols}, 1fr)` } : {}}>
                {allChars.length > 0 ? (
                    allChars.map((char) => {
                        const charName = alphabetNames[char] || 'unnamed';
                        const customGlyph = alphabetGlyphs[char];
                        
                        return (
                            <div 
                                key={char} 
                                className="char-card glass interactive-card" 
                                onClick={() => onGlyphClick && onGlyphClick({ char, glyph: customGlyph || char, type: 'alphabetic', name: charName, scriptId })}
                            >
                                <div className="char-display custom-font-text" style={{ fontSize: customGlyph ? '3rem' : '2rem', marginBottom: customGlyph ? '0' : '0.5rem' }}>
                                    {customGlyph || char}
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
                        <p>{t('orthography.noCharsFound')}</p>
                        <button className="btn-link" onClick={() => window.location.hash = '#/settings'}>
                            {t('orthography.goToPhonologyBtn')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── SYLLABARY SHOWCASE ───────────────────────────────────────────────────────

const SyllabaryShowcase = ({ scriptId, onGlyphClick, registerCols } = {}) => {
    const { t } = useTranslation();
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
            const cleanStrokes = strokes.filter(s => Array.isArray(s) && !(s.length === 1 && (s[0].x === -999 || s[0].x === -998)));
            return (
                <svg viewBox="0 0 300 300" width="52" height="52">
                    {cleanStrokes.map((stroke, i) => (
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
            <Infobox title={t('orthography.syllabaryRegisterTitle')}>
                <span dangerouslySetInnerHTML={{ __html: t('orthography.syllabaryRegisterDesc') }} />
            </Infobox>
            {allEntries.length === 0 ? (
                <div className="empty-state glass">
                    <Type size={48} style={{ opacity: 0.2 }} />
                    <p>{t('orthography.noSyllablesMapped')}</p>
                </div>
            ) : (
                <div className="showcase-syllabary-grid" style={registerCols > 0 ? { '--grid-cols': `repeat(${registerCols}, 1fr)` } : {}}>
                    {allEntries.map(({ key, displayLabel, symbol }) => (
                        <div 
                            key={key} 
                            className="showcase-syl-card glass interactive-card"
                            onClick={() => onGlyphClick && onGlyphClick({ char: displayLabel, glyph: symbol || displayLabel, type: 'syllabic', name: displayLabel, scriptId })}
                        >
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

const LogographicShowcase = ({ scriptId, onGlyphClick, registerCols } = {}) => {
    const { t } = useTranslation();
    const lexicon = useLexiconStore(state => state.lexicon) || [];
    const { customGlyphs } = useScriptScopedData(scriptId);

    const logographicWords = useMemo(() => {
        const charMap = new Map();
        
        // Sort lexicon by ideogram length ascending, so that "singular" words claim characters 
        // before words that use "multiple" characters.
        const sortedLexicon = [...lexicon].sort((a, b) => {
            const lenA = (a.ideogram && a.ideogram.trim() !== '') ? Array.from(a.ideogram.trim()).length : 999;
            const lenB = (b.ideogram && b.ideogram.trim() !== '') ? Array.from(b.ideogram.trim()).length : 999;
            return lenA - lenB;
        });

        for (const w of sortedLexicon) {
            if (w.ideogram && w.ideogram.trim() !== '') {
                const chars = Array.from(w.ideogram.trim());
                for (const char of chars) {
                    if (char.trim() === '') continue;
                    if (!charMap.has(char)) {
                        charMap.set(char, {
                            id: `${w.id}-${char}`,
                            ideogram: char,
                            word: w.word,
                            translation: w.translation
                        });
                    }
                }
            }
        }
        return Array.from(charMap.values());
    }, [lexicon]);

    // Render strokes as crisp inline SVG instead of font character
    const renderGlyph = (ideogram) => {
        const codePoint = ideogram.codePointAt(0);
        const strokes = customGlyphs[codePoint];
        if (strokes && strokes.length > 0) {
            const cleanStrokes = strokes.filter(s => Array.isArray(s) && !(s.length === 1 && (s[0].x === -999 || s[0].x === -998)));
            return (
                <svg viewBox="0 0 300 300" width="80" height="80">
                    {cleanStrokes.map((stroke, i) => (
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
            <Infobox title={t('orthography.logographicRegisterTitle')}>
                {t('orthography.logographicRegisterDesc')}
            </Infobox>
            {logographicWords.length === 0 ? (
                <div className="empty-state glass">
                    <Languages size={48} style={{ opacity: 0.2 }} />
                    <p>{t('orthography.noLogographicFound')}</p>
                </div>
            ) : (
                <div className="alphabet-grid" style={registerCols > 0 ? { '--grid-cols': `repeat(${registerCols}, 1fr)` } : {}}>
                    {logographicWords.map(word => (
                        <div 
                            key={word.id} 
                            className="char-card glass interactive-card"
                            onClick={() => onGlyphClick && onGlyphClick({ char: word.ideogram, glyph: word.ideogram, type: 'logographic', name: word.translation || word.word, scriptId })}
                        >
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

const BlockShowcase = ({ scriptId, onGlyphClick, registerCols } = {}) => {
    const { t } = useTranslation();
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
                <Infobox title={t('orthography.blockRegisterTitle')}>
                    <span dangerouslySetInnerHTML={{ __html: t('orthography.blockRegisterDesc') }} />
                </Infobox>
                <div className="empty-state glass">
                    <Hash size={48} style={{ opacity: 0.2 }} />
                    <p style={{ fontWeight: 700 }}>{t('orthography.noBaseCharsDrawn')}</p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--tx2)' }} dangerouslySetInnerHTML={{ __html: t('orthography.noBaseCharsDrawnDesc') }} />
                </div>
            </div>
        );
    }

    return (
        <div className="tab-pane-container">
            <Infobox title={t('orthography.blockRegisterTitle')}>
                <span dangerouslySetInnerHTML={{ __html: t('orthography.blockRegisterDesc') }} />
            </Infobox>

            {/* Base Characters */}
            {drawnComponents.length > 0 && (
                <>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--tx2)', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {t('orthography.baseCharsHeader', { count: drawnComponents.length })}
                    </h3>
                    <div className="showcase-block-base-grid" style={registerCols > 0 ? { '--grid-cols': `repeat(${registerCols}, 1fr)` } : {}}>
                        {drawnComponents.map(comp => (
                            <div 
                                key={comp} 
                                className="showcase-block-base-card glass interactive-card"
                                onClick={() => onGlyphClick && onGlyphClick({ 
                                    char: comp, 
                                    glyph: phonemeToChar[comp] || comp, 
                                    strokes: featuralComponents[comp], 
                                    type: 'featural_block', 
                                    name: phonemeToChar[comp] || comp, 
                                    scriptId 
                                })}
                            >
                                <svg viewBox="0 0 300 300" width="64" height="64" className="showcase-block-svg">
                                    {featuralComponents[comp]
                                        .filter(s => Array.isArray(s) && !(s.length === 1 && (s[0].x === -999 || s[0].x === -998)))
                                        .map((stroke, i) => (
                                            <path
                                                key={i}
                                                d={`M ${stroke.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                                                stroke="var(--acc)"
                                                strokeWidth="10"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                fill="none"
                                            />
                                        ))
                                    }
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
                        {t('orthography.compiledBlocksHeader', { count: blockEntries.length })}
                    </h3>
                    <div className="showcase-syllabary-grid" style={registerCols > 0 ? { '--grid-cols': `repeat(${registerCols}, 1fr)` } : {}}>
                        {blockEntries.map(([key, val]) => (
                            <div 
                                key={key} 
                                className="showcase-syl-card glass interactive-card"
                                onClick={() => onGlyphClick && onGlyphClick({ 
                                    char: toMorphemeLabel(key), 
                                    glyph: val || toMorphemeLabel(key), 
                                    type: 'featural_block', 
                                    name: toMorphemeLabel(key), 
                                    scriptId 
                                })}
                            >
                                <div className="showcase-syl-symbol">{renderBlockSymbol(val)}</div>
                                <div className="showcase-syl-label">{toMorphemeLabel(key)}</div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="empty-state glass" style={{ marginTop: '2rem' }}>
                    <Hash size={40} style={{ opacity: 0.2 }} />
                    <p style={{ fontWeight: 700 }}>{t('orthography.baseCharsReady')}</p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--tx2)' }} dangerouslySetInnerHTML={{ __html: t('orthography.baseCharsReadyDesc') }} />
                </div>
            )}
        </div>
    );
};


// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function OrthographyPage() {
    const { t } = useTranslation();
    const phonologyTypes = useConfigStore(state => state.phonologyTypes);
    const activeScriptSystemId = useConfigStore(state => state.activeScriptSystemId);
    const scriptSystems = useConfigStore(state => state.scriptSystems) || [];
    const scriptRules = useConfigStore(state => state.scriptRules) || {};
    const setActiveScriptSystem = useConfigStore(state => state.setActiveScriptSystem);
    const [activeTab, setActiveTab] = useState('script');
    const [selectedGlyphDetails, setSelectedGlyphDetails] = useState(null);
    const [registerCols, setRegisterCols] = useState(0); // 0 = Auto

    const defaultScriptId = scriptRules.defaultScriptId || getDefaultScriptId({ scriptSystems, scriptRules });
    const activeScript = getScriptSystem({ scriptSystems, scriptRules, phonologyTypes }, activeScriptSystemId || defaultScriptId);
    const scriptType = activeScript?.type || phonologyTypes || 'alphabetic';

    // Active script selector bar (shown on script-editing tabs and numbers tab)
    const showScriptPicker = scriptSystems.length > 1 && (activeTab === 'script' || activeTab === 'rules' || activeTab === 'numbers');

    const renderActiveScriptDropdown = () => {
        if (!showScriptPicker) return null;
        return (
            <div className="script-active-dropdown-wrap">
                <label className="script-active-dropdown-label">{t('orthography.editingScript')}</label>
                <select
                    className="script-active-dropdown"
                    value={activeScriptSystemId || defaultScriptId}
                    onChange={e => setActiveScriptSystem(e.target.value)}
                >
                    {scriptSystems.map(s => (
                        <option key={s.id} value={s.id}>{s.name}{s.id === defaultScriptId ? ` (${t('orthography.scriptManager.isDefault').toLowerCase()})` : ''}</option>
                    ))}
                </select>
            </div>
        );
    };

    const renderScriptShowcase = () => {
        switch (scriptType) {
            case 'syllabic':      return <SyllabaryShowcase scriptId={activeScriptSystemId} onGlyphClick={setSelectedGlyphDetails} registerCols={registerCols} />;
            case 'logographic':   return <LogographicShowcase scriptId={activeScriptSystemId} onGlyphClick={setSelectedGlyphDetails} registerCols={registerCols} />;
            case 'featural_block':
            case 'featural':
            case 'block':         return <BlockShowcase scriptId={activeScriptSystemId} onGlyphClick={setSelectedGlyphDetails} registerCols={registerCols} />;
            default:              return <AlphabeticShowcase scriptId={activeScriptSystemId} onGlyphClick={setSelectedGlyphDetails} registerCols={registerCols} />;
        }
    };

    return (
        <div className="orthography-page-container">
            {selectedGlyphDetails && (
                <GlyphDetailsModal 
                    isOpen={!!selectedGlyphDetails} 
                    onClose={() => setSelectedGlyphDetails(null)} 
                    {...selectedGlyphDetails} 
                />
            )}
            
            <header className="page-header">
                <div className="header-content">
                    <h1 className="flex gap-3 items-center">
                        <Languages className="text-accent" size={32} />
                        {t('orthography.title')}
                    </h1>
                    <p className="subtitle">
                        {t('orthography.subtitle')}
                    </p>
                </div>

                <nav className="tabs tabs-boxed page-subnav">
                    <button 
                        className={`tab ${activeTab === 'scripts' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('scripts')}
                    >
                        <PenTool size={18} /> {t('orthography.tabs.scripts')}
                    </button>
                    <button 
                        className={`tab ${activeTab === 'script' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('script')}
                    >
                        <BookA size={18} /> {t('orthography.tabs.script')}
                    </button>
                    <button 
                        className={`tab ${activeTab === 'rules' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('rules')}
                    >
                        <ListChecks size={18} /> {t('orthography.tabs.rules')}
                    </button>
                    <button 
                        className={`tab ${activeTab === 'numbers' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('numbers')}
                    >
                        <Hash size={18} /> {t('orthography.tabs.numbers')}
                    </button>
                    <button 
                        className={`tab ${activeTab === 'ipa' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('ipa')}
                    >
                        <Mic2 size={18} /> {t('orthography.tabs.ipa')}
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: 'var(--s2)', padding: '0.75rem 1rem', borderRadius: '1rem', border: '1px solid var(--bd)', flexWrap: 'wrap', gap: '1rem' }}>
                            {renderActiveScriptDropdown() || <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--tx)' }}>{t('orthography.scriptRegister')}</div>}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--tx2)', fontWeight: 600, whiteSpace: 'nowrap' }}>{t('orthography.gridColumns')}</span>
                                <select 
                                    className="select select-bordered" 
                                    style={{ height: '40px', minHeight: '40px' }}
                                    value={registerCols} 
                                    onChange={e => setRegisterCols(parseInt(e.target.value))}
                                >
                                    <option value={0}>{t('orthography.autoLayout')}</option>
                                    <option value={1}>{t('orthography.column1')}</option>
                                    <option value={2}>{t('orthography.columnsN', { count: 2 })}</option>
                                    <option value={3}>{t('orthography.columnsN', { count: 3 })}</option>
                                    <option value={4}>{t('orthography.columnsN', { count: 4 })}</option>
                                    <option value={5}>{t('orthography.columnsN', { count: 5 })}</option>
                                    <option value={6}>{t('orthography.columnsN', { count: 6 })}</option>
                                    <option value={8}>{t('orthography.columnsN', { count: 8 })}</option>
                                    <option value={10}>{t('orthography.columnsN', { count: 10 })}</option>
                                </select>
                            </div>
                        </div>
                        {renderScriptShowcase()}
                    </div>
                )}
                {activeTab === 'rules'   && (
                    <div className="tab-pane-container">
                        {renderActiveScriptDropdown()}
                        <ScriptRulesEditor />
                    </div>
                )}
                {activeTab === 'numbers' && <NumbersTab activeScriptDropdown={renderActiveScriptDropdown()} />}
                {activeTab === 'ipa'     && <IpaReferencePage />}
            </main>
        </div>
    );
}

import React, { useState, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import { useShallow } from 'zustand/react/shallow';
import { useNavigate } from 'react-router';
import Card from '@/components/UI/Card/Card.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import { useWordGenerator } from '@/hooks/useWordGenerator.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { applyRuleToWord, expandWildcardDependencies, validateRegexRule } from '@/utils/morphologyEngine.jsx';
import {
    getAvailableWordClasses,
    getCommonPatterns,
    getSyllablePresetBundles,
    parsePatternTokens,
    importClassMarkersFromGrammar,
    extractComplexGrammarRules,
    COMPLEX_REGEX_PRESETS,
} from '@/utils/wordGeneratorEngine.js';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import { validateNewWord } from '@/utils/validationEngine.jsx';
import { commonWords } from '@/components/pages/wordgenerator/commonWords.jsx';
import {
    Wand2, Send, Dna, BookCopy, SkipForward, Check,
    Settings2, Download, SlidersHorizontal, ListChecks,
    Copy, Plus, Trash2, X, RotateCcw, AlertTriangle, Code2
} from 'lucide-react';
import toast from 'react-hot-toast';
import VocabChecklist from '@/components/pages/wordgenerator/VocabChecklist.jsx';
import './generatorTab.css';

const PRESET_LABEL_KEYS = {
    open: 'generator.presetOpen',
    balanced: 'generator.presetBalanced',
    flexible: 'generator.presetFlexible',
    complex: 'generator.presetComplex',
    otherCoda: 'generator.presetOtherCoda',
};

const REGEX_PRESET_LABEL_KEYS = {
    hiatusRepair: 'generator.presetHiatusRepair',
    geminateCollapse: 'generator.presetGeminateCollapse',
    nasalAssimilation: 'generator.presetNasalAssimilation',
    palatalization: 'generator.presetPalatalization',
    dropFinalVowel: 'generator.presetDropFinalVowel',
    intervocalicVoicing: 'generator.presetIntervocalicVoicing',
};

const STANDARD_CLASS_LABELS = ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'particle'];

const sanitizeCsvCell = (value) => {
    const str = String(value ?? '');
    const neutralized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
    return `"${neutralized.replace(/"/g, '""')}"`;
};

export default function GeneratorTab() {
    const { t } = useTranslation();
    const { transliterate, normalizeToBase } = useTransliterator();
    const {
        generatedWord,
        generatedIpa,
        generatedClass,
        generatedStem,
        setGeneratedPreview,
        generateWord
    } = useWordGenerator();
    const [selectedLengths, setSelectedLengths] = useState([2, 3]);
    const [targetClass, setTargetClass] = useState('random');
    const [history, setHistory] = useState([]);
    const [quickTranslation, setQuickTranslation] = useState('');
    const [customPatternInput, setCustomPatternInput] = useState('');
    const [regexTestInput, setRegexTestInput] = useState('pataka');
    const navigate = useNavigate();

    const grammarRules = useConfigStore((state) => state.grammarRules) || [];
    const vowels = useConfigStore((state) => state.vowels);
    const consonants = useConfigStore((state) => state.consonants);
    const otherPhonemes = useConfigStore((state) => state.otherPhonemes);
    const otherPhonemeMapping = useConfigStore((state) => state.otherPhonemeMapping);
    const verbMarker = useConfigStore((state) => state.verbMarker);
    const cliticsRules = useConfigStore((state) => state.cliticsRules);
    const generatorMarkers = useConfigStore((state) => state.generatorMarkers) || {};
    const generatorRegexRules = useConfigStore((state) => state.generatorRegexRules) || [];
    const generatorOptions = useConfigStore((state) => state.generatorOptions) || {};
    const customWordClasses = useConfigStore((state) => state.customWordClasses) || [];
    const vowelHarmonySets = useConfigStore((state) => state.vowelHarmonySets) || [];
    const syllablePattern = useConfigStore((state) => state.syllablePattern) || '';
    const syllablePatternWeights = useConfigStore((state) => state.syllablePatternWeights) || {};
    const updateConfig = useConfigStore((state) => state.updateConfig);

    const lexicon = useLexiconStore((state) => state.lexicon) || [];
    const addWord = useLexiconStore((state) => state.addWord);
    const checkDuplicate = useLexiconStore((state) => state.checkDuplicate);

    const [showMarkerConfig, setShowMarkerConfig] = useState(false);
    const [showWeightConfig, setShowWeightConfig] = useState(false);
    const [showComplexRules, setShowComplexRules] = useState(false);

    const [isFillMode, setIsFillMode] = useState(false);
    const [isBatchMode, setIsBatchMode] = useState(false);
    const [isListFillMode, setIsListFillMode] = useState(false);

    const allWordClasses = useMemo(
        () => getAvailableWordClasses(customWordClasses, generatorMarkers),
        [customWordClasses, generatorMarkers]
    );

    const formatClassLabel = (cls) => {
        if (STANDARD_CLASS_LABELS.includes(cls)) return t(`generator.${cls}`);
        return cls.charAt(0).toUpperCase() + cls.slice(1);
    };

    const parsedPatterns = useMemo(
        () => parsePatternTokens(syllablePattern),
        [syllablePattern]
    );

    const commonPatterns = useMemo(
        () => getCommonPatterns(otherPhonemeMapping),
        [otherPhonemeMapping]
    );

    const presetBundles = useMemo(
        () => getSyllablePresetBundles(otherPhonemeMapping),
        [otherPhonemeMapping]
    );

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

    const handleTogglePattern = (pat) => {
        const upper = pat.trim().toUpperCase();
        if (!upper) return;
        const exists = parsedPatterns.includes(upper);
        if (exists && parsedPatterns.length <= 1) return;
        const next = exists
            ? parsedPatterns.filter(p => p !== upper)
            : [...parsedPatterns, upper];
        updateConfig({ syllablePattern: next.join(', ') });
    };

    const handleAddCustomPattern = (e) => {
        e?.preventDefault?.();
        const cleaned = customPatternInput.trim().toUpperCase();
        if (!cleaned) return;
        const tokens = parsePatternTokens(cleaned);
        if (tokens.length === 0) return;
        const merged = [...new Set([...parsedPatterns, ...tokens])];
        updateConfig({ syllablePattern: merged.join(', ') });
        setCustomPatternInput('');
    };

    const handleApplyPresetBundle = (patternsStr) => {
        updateConfig({ syllablePattern: patternsStr });
    };

    const handleWeightChange = (pattern, value) => {
        const numVal = Math.max(0, Number(value) || 0);
        updateConfig({ syllablePatternWeights: { ...syllablePatternWeights, [pattern]: numVal } });
    };

    const handleResetWeights = () => {
        const reset = {};
        parsedPatterns.forEach(p => { reset[p] = 1; });
        updateConfig({ syllablePatternWeights: reset });
    };

    const handleGenerate = () => {
        if (selectedLengths.length === 0) {
            return toast.error(t('generator.selectSyllableLengthError'));
        }
        const res = generateWord(selectedLengths, targetClass);
        if (res && res.word) {
            setQuickTranslation('');
            setHistory(prev => {
                const filtered = prev.filter(item => item.word !== res.word);
                return [res, ...filtered].slice(0, 10);
            });
        }
    };

    const handleCopyText = (text) => {
        if (!text || !navigator?.clipboard) return;
        navigator.clipboard.writeText(text);
        toast.success(t('generator.copiedToast'));
    };

    const handleQuickSave = (e) => {
        e?.preventDefault?.();
        if (!generatedWord) return;
        const translation = quickTranslation.trim();
        if (!translation) return toast.error(t('generator.enterTranslationError'));
        const safeWord = normalizeToBase(generatedWord.trim());
        const { isDuplicateWord, isDuplicateTranslation } = checkDuplicate(safeWord, translation);
        if (isDuplicateWord || isDuplicateTranslation) {
            return toast.error(t('generator.duplicateEntryError'));
        }
        addWord({
            word: safeWord,
            ipa: generatedIpa,
            wordClass: generatedClass || 'noun',
            translation,
        });
        toast.success(t('generator.quickSaveSuccess', { word: transliterate(safeWord) }));
        setQuickTranslation('');
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

    const handleImportFromGrammar = () => {
        const { markers, updatedClasses, updatedCount } = importClassMarkersFromGrammar({
            grammarRules,
            verbMarker,
            currentMarkers: generatorMarkers,
            customWordClasses,
        });

        updateConfig({ generatorMarkers: markers });
        if (updatedCount > 0) {
            toast.success(
                t('generator.grammarImportSuccess', {
                    count: updatedCount,
                    classes: updatedClasses.map(formatClassLabel).join(', ')
                })
            );
        } else {
            toast(t('generator.grammarImportNone'));
        }
    };

    const handleMarkerChange = (cls, value) => {
        updateConfig({ generatorMarkers: { ...generatorMarkers, [cls]: value } });
    };

    const handleAddRegexRule = (preset = null) => {
        const newRule = {
            id: `regex_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            name: preset ? (t(REGEX_PRESET_LABEL_KEYS[preset.id]) || preset.name) : '',
            rule: preset ? preset.rule : '',
            appliesTo: preset?.appliesTo || 'all',
            enabled: true,
        };
        updateConfig({ generatorRegexRules: [...generatorRegexRules, newRule] });
    };

    const handleUpdateRegexRule = (id, patch) => {
        updateConfig({
            generatorRegexRules: generatorRegexRules.map(r => (r.id === id ? { ...r, ...patch } : r))
        });
    };

    const handleDeleteRegexRule = (id) => {
        updateConfig({
            generatorRegexRules: generatorRegexRules.filter(r => r.id !== id)
        });
    };

    const handleImportComplexFromGrammar = () => {
        const { newRules, addedCount } = extractComplexGrammarRules(grammarRules, generatorRegexRules);
        if (addedCount === 0) {
            toast(t('generator.complexImportNone'));
            return;
        }
        updateConfig({ generatorRegexRules: [...generatorRegexRules, ...newRules] });
        toast.success(t('generator.complexImportSuccess', { count: addedCount }));
    };

    const regexTesterOutput = useMemo(() => {
        if (!regexTestInput) return '';
        let out = regexTestInput;
        for (const r of generatorRegexRules) {
            if (!r || r.enabled === false || !r.rule || !r.rule.trim()) continue;
            const check = validateRegexRule(r.rule, { vowels, consonants, otherPhonemes });
            if (!check.valid) continue;
            const applied = applyRuleToWord(out, { affix: r.rule, condition: 'always' }, grammarRules, vowels, consonants, otherPhonemes);
            if (applied != null) out = applied;
        }
        return out;
    }, [regexTestInput, generatorRegexRules, vowels, consonants, otherPhonemes, grammarRules]);

    const isGeneratedDuplicate = useMemo(() => {
        if (!generatedWord) return false;
        const norm = normalizeToBase(generatedWord).toLowerCase();
        return lexicon.some(w => normalizeToBase((w.word || '').replace(/\*/g, '')).toLowerCase() === norm);
    }, [generatedWord, lexicon, normalizeToBase]);

    const derivations = useMemo(() => {
        if (!generatedWord) return [];

        let base = generatedStem || generatedWord;

        if (!generatedStem) {
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
        }

        let applicableRules = grammarRules.filter(rule => {
            const classes = (rule.appliesTo || 'all').split(',').map(c => c.trim().toLowerCase());
            return classes.includes('all') || classes.includes((generatedClass || '').toLowerCase());
        });

        applicableRules = expandWildcardDependencies(applicableRules, grammarRules);

        return applicableRules.map(rule => {
            const result = applyRuleToWord(base, rule, grammarRules, vowels, consonants, otherPhonemes);
            return {
                name: rule.name,
                gloss: rule.gloss,
                isRegex: Boolean(rule.affix && rule.affix.includes('=>')),
                result
            };
        });
    }, [generatedWord, generatedStem, generatedClass, grammarRules, vowels, consonants, otherPhonemes, verbMarker, cliticsRules]);

    if (isFillMode) return <FillMode onExit={() => setIsFillMode(false)} />;
    if (isBatchMode) return <BatchMode onExit={() => setIsBatchMode(false)} />;
    if (isListFillMode) return <ListFillMode onExit={() => setIsListFillMode(false)} />;

    return (
        <div className="generator-container">
            <Card>
                <h2 className='flex sg-title generator-header-title'>
                    <Dna /> {t('generator.title')}
                </h2>
                <p className="generator-description">{t('generator.desc')}</p>

                <div className="generator-input-row">
                    <div className="generator-input-group">
                        <label className="generator-label">{t('generator.syllableLengths')}</label>
                        <div className="generator-length-row">
                            {[1, 2, 3, 4, 5, 6, 7].map(len => (
                                <button
                                    key={len}
                                    type="button"
                                    className={`generator-length-btn ${selectedLengths.includes(len) ? 'active' : ''}`}
                                    onClick={() => {
                                        if (selectedLengths.includes(len)) {
                                            if (selectedLengths.length > 1) {
                                                setSelectedLengths(selectedLengths.filter(l => l !== len));
                                            }
                                        } else {
                                            setSelectedLengths([...selectedLengths, len].sort((a, b) => a - b));
                                        }
                                    }}
                                >
                                    {len}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="generator-input-group">
                        <label className="generator-label">{t('generator.wordClass')}</label>
                        <select
                            className="generator-input"
                            value={targetClass}
                            onChange={(e) => setTargetClass(e.target.value)}
                        >
                            <option value="random">{t('generator.random')}</option>
                            {allWordClasses.map(cls => (
                                <option key={cls} value={cls}>{formatClassLabel(cls)}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="generator-options-row">
                    <label className="generator-option-check">
                        <input
                            type="checkbox"
                            checked={Boolean(generatorOptions.avoidDuplicates)}
                            onChange={(e) => updateConfig({
                                generatorOptions: { ...generatorOptions, avoidDuplicates: e.target.checked }
                            })}
                        />
                        <span>{t('generator.avoidDuplicates')}</span>
                    </label>
                    {vowelHarmonySets.length > 0 && (
                        <label className="generator-option-check">
                            <input
                                type="checkbox"
                                checked={Boolean(generatorOptions.respectVowelHarmony)}
                                onChange={(e) => updateConfig({
                                    generatorOptions: { ...generatorOptions, respectVowelHarmony: e.target.checked }
                                })}
                            />
                            <span>{t('generator.followVowelHarmony', { count: vowelHarmonySets.length })}</span>
                        </label>
                    )}
                </div>

                <Button onClick={handleGenerate}>
                    <div className="generator-btn-content"><Wand2 size={18} /> {t('generator.generateBtn')}</div>
                </Button>

                {/* ── Common Syllable Patterns & Weights ── */}
                <div className="marker-config-section">
                    <button
                        type="button"
                        className="marker-config-toggle"
                        onClick={() => setShowWeightConfig(v => !v)}
                    >
                        <SlidersHorizontal size={15} />
                        {t('generator.syllablesAndWeights')}
                        <span className="marker-config-count">{parsedPatterns.length}</span>
                        <span className="marker-config-arrow">{showWeightConfig ? '▲' : '▼'}</span>
                    </button>

                    {showWeightConfig && (
                        <div className="marker-config-panel">
                            <div className="marker-config-header">
                                <p className="marker-config-desc">{t('generator.patternWeightsDesc')}</p>
                                {parsedPatterns.length > 0 && (
                                    <Button variant="default" onClick={handleResetWeights}>
                                        <RotateCcw size={13} /> {t('generator.resetWeights')}
                                    </Button>
                                )}
                            </div>

                            <div className="pattern-presets-bar">
                                <span className="pattern-bar-label">{t('generator.patternPresets')}</span>
                                {presetBundles.map(bundle => (
                                    <button
                                        key={bundle.id}
                                        type="button"
                                        className="pattern-preset-btn"
                                        onClick={() => handleApplyPresetBundle(bundle.patterns)}
                                        title={bundle.patterns}
                                    >
                                        {t(PRESET_LABEL_KEYS[bundle.id])}
                                    </button>
                                ))}
                            </div>

                            <div className="pattern-presets-bar">
                                <span className="pattern-bar-label">{t('generator.commonPatterns')}</span>
                            </div>
                            <div className="common-patterns-grid">
                                {commonPatterns.map(pat => {
                                    const active = parsedPatterns.includes(pat);
                                    return (
                                        <button
                                            key={pat}
                                            type="button"
                                            className={`common-pattern-chip ${active ? 'active' : ''}`}
                                            onClick={() => handleTogglePattern(pat)}
                                        >
                                            {pat}
                                        </button>
                                    );
                                })}
                            </div>

                            <form className="custom-pattern-add-row" onSubmit={handleAddCustomPattern}>
                                <input
                                    type="text"
                                    className="generator-input custom-pattern-input"
                                    value={customPatternInput}
                                    onChange={(e) => setCustomPatternInput(e.target.value)}
                                    placeholder={t('generator.customPatternPlaceholder')}
                                />
                                <Button type="submit" variant="edit">
                                    <Plus size={14} /> {t('generator.addPatternBtn')}
                                </Button>
                            </form>

                            {parsedPatterns.length === 0 ? (
                                <p className="weight-empty">{t('generator.noPatterns')}</p>
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
                                                <button
                                                    type="button"
                                                    className="weight-remove-btn"
                                                    onClick={() => handleTogglePattern(pattern)}
                                                    title={t('generator.removePatternTitle')}
                                                    disabled={parsedPatterns.length <= 1}
                                                >
                                                    <X size={13} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Class Markers & Smart Grammar Import ── */}
                <div className="marker-config-section">
                    <button
                        type="button"
                        className="marker-config-toggle"
                        onClick={() => setShowMarkerConfig(v => !v)}
                    >
                        <Settings2 size={15} />
                        {t('generator.classMarkers')}
                        <span className="marker-config-count">
                            {Object.values(generatorMarkers).filter(Boolean).length}
                        </span>
                        <span className="marker-config-arrow">{showMarkerConfig ? '▲' : '▼'}</span>
                    </button>

                    {showMarkerConfig && (
                        <div className="marker-config-panel">
                            <div className="marker-config-header">
                                <p className="marker-config-desc">
                                    {t('generator.classMarkersDesc')}
                                </p>
                                <Button variant="edit" onClick={handleImportFromGrammar}>
                                    <Download size={14} /> {t('generator.importFromGrammar')}
                                </Button>
                            </div>
                            <div className="marker-config-grid">
                                {allWordClasses.map((cls) => {
                                    const marker = generatorMarkers[cls] || '';
                                    const isRegex = marker.includes('=>');
                                    const isInfix = !isRegex && marker.includes('@');
                                    return (
                                        <div key={cls} className="marker-config-row">
                                            <div className="marker-label-row">
                                                <label className="marker-config-label">{formatClassLabel(cls)}</label>
                                                {isRegex && <span className="marker-type-tag">regex</span>}
                                                {isInfix && <span className="marker-type-tag">infix</span>}
                                            </div>
                                            <input
                                                type="text"
                                                className="generator-input marker-config-input notranslate"
                                                value={marker}
                                                onChange={e => handleMarkerChange(cls, e.target.value)}
                                                placeholder={t('generator.markerPlaceholder')}
                                            />
                                            {grammarRules.some(r => r.affix) && (
                                                <select
                                                    className="generator-input marker-rule-select"
                                                    value=""
                                                    onChange={(e) => {
                                                        if (e.target.value) handleMarkerChange(cls, e.target.value);
                                                    }}
                                                >
                                                    <option value="">{t('generator.pickGrammarRule')}</option>
                                                    {grammarRules.filter(r => r.affix).map(r => (
                                                        <option key={r.id || r.name} value={r.affix}>
                                                            {(r.name || r.gloss || cls)}: {r.affix}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Complex Regex Rules Pipeline ── */}
                <div className="marker-config-section">
                    <button
                        type="button"
                        className="marker-config-toggle"
                        onClick={() => setShowComplexRules(v => !v)}
                    >
                        <Code2 size={15} />
                        {t('generator.complexRulesTitle')}
                        <span className="marker-config-count">
                            {generatorRegexRules.filter(r => r.enabled !== false && r.rule).length}
                        </span>
                        <span className="marker-config-arrow">{showComplexRules ? '▲' : '▼'}</span>
                    </button>

                    {showComplexRules && (
                        <div className="marker-config-panel">
                            <div className="marker-config-header">
                                <p className="marker-config-desc">{t('generator.complexRulesDesc')}</p>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <Button variant="edit" onClick={handleImportComplexFromGrammar}>
                                        <Download size={14} /> {t('generator.importComplexFromGrammar')}
                                    </Button>
                                    <Button variant="default" onClick={() => handleAddRegexRule(null)}>
                                        <Plus size={14} /> {t('generator.addRegexRule')}
                                    </Button>
                                </div>
                            </div>

                            <div className="regex-presets-row">
                                <span className="pattern-bar-label">{t('generator.regexPresetsLabel')}</span>
                                {COMPLEX_REGEX_PRESETS.map(preset => (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        className="pattern-preset-btn"
                                        onClick={() => handleAddRegexRule(preset)}
                                        title={preset.rule}
                                    >
                                        + {t(REGEX_PRESET_LABEL_KEYS[preset.id])}
                                    </button>
                                ))}
                            </div>

                            {generatorRegexRules.length === 0 ? (
                                <p className="weight-empty">{t('generator.noComplexRules')}</p>
                            ) : (
                                <div className="regex-rules-list">
                                    {generatorRegexRules.map(rule => {
                                        const check = validateRegexRule(rule.rule, { vowels, consonants, otherPhonemes });
                                        return (
                                            <div
                                                key={rule.id}
                                                className={`regex-rule-row ${rule.enabled === false ? 'disabled' : ''} ${!check.valid ? 'invalid' : ''}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={rule.enabled !== false}
                                                    onChange={(e) => handleUpdateRegexRule(rule.id, { enabled: e.target.checked })}
                                                />
                                                <input
                                                    type="text"
                                                    className="generator-input marker-config-input"
                                                    value={rule.name || ''}
                                                    onChange={(e) => handleUpdateRegexRule(rule.id, { name: e.target.value })}
                                                    placeholder={t('generator.regexRuleNamePlaceholder')}
                                                />
                                                <input
                                                    type="text"
                                                    className="generator-input marker-config-input regex-expr-input notranslate"
                                                    value={rule.rule || ''}
                                                    onChange={(e) => handleUpdateRegexRule(rule.id, { rule: e.target.value })}
                                                    placeholder={t('generator.regexRuleExprPlaceholder')}
                                                    spellCheck="false"
                                                />
                                                <select
                                                    className="generator-input marker-config-input"
                                                    value={rule.appliesTo || 'all'}
                                                    onChange={(e) => handleUpdateRegexRule(rule.id, { appliesTo: e.target.value })}
                                                >
                                                    <option value="all">{t('generator.regexRuleAppliesAll')}</option>
                                                    {allWordClasses.map(cls => (
                                                        <option key={cls} value={cls}>{formatClassLabel(cls)}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    className="weight-remove-btn"
                                                    onClick={() => handleDeleteRegexRule(rule.id)}
                                                    title={t('generator.deleteRuleTitle')}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                                {!check.valid && (
                                                    <span className="regex-error-msg">
                                                        {t('generator.regexInvalid', { error: check.error })}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="regex-tester-box">
                                <span className="pattern-bar-label">{t('generator.regexTesterLabel')}:</span>
                                <input
                                    type="text"
                                    className="generator-input regex-tester-input notranslate"
                                    value={regexTestInput}
                                    onChange={(e) => setRegexTestInput(e.target.value)}
                                    placeholder={t('generator.regexTesterPlaceholder')}
                                />
                                <span className="generator-separator">→</span>
                                <span className="regex-tester-output custom-font-text notranslate">
                                    {transliterate(regexTesterOutput)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="fill-mode-prompt">
                    <Button variant="edit" onClick={() => setIsFillMode(true)}>
                        <BookCopy size={18} /> {t('generator.fillMode')}
                    </Button>
                    <Button variant="imp" onClick={() => setIsBatchMode(true)}>
                        <Wand2 size={18} /> {t('generator.batchGen')}
                    </Button>
                    <Button variant="save" onClick={() => setIsListFillMode(true)}>
                        <ListChecks size={18} /> {t('generator.vocabChecklist')}
                    </Button>
                </div>
            </Card>

            {generatedWord && (
                <Card>
                    <h2 className='flex sg-title' style={{ marginBottom: 0 }}>{t('generator.labResult')}</h2>
                    <div className="generator-result-section">
                        <div className="generator-result-word-row">
                            <h1 className="custom-font-text notranslate generator-result-word">{transliterate(generatedWord)}</h1>
                            <button
                                type="button"
                                className="generator-copy-btn"
                                onClick={() => handleCopyText(generatedWord)}
                                aria-label={t('generator.copyWordAria')}
                            >
                                <Copy size={14} />
                            </button>
                        </div>
                        <div className="generator-result-meta">
                            <span className="notranslate generator-ipa">/{generatedIpa}/</span>
                            <button
                                type="button"
                                className="generator-copy-btn"
                                onClick={() => handleCopyText(`/${generatedIpa}/`)}
                                aria-label={t('generator.copyIpaAria')}
                            >
                                <Copy size={12} />
                            </button>
                            <span className="generator-separator">|</span>
                            <span className="generator-class-badge">{formatClassLabel(generatedClass || 'noun')}</span>
                            {isGeneratedDuplicate && (
                                <span className="generator-dup-badge">
                                    <AlertTriangle size={12} /> {t('generator.alreadyInLexicon')}
                                </span>
                            )}
                        </div>
                    </div>

                    {history.length > 1 && (
                        <div className="generator-history-bar">
                            <span className="pattern-bar-label">{t('generator.recentHistory')}:</span>
                            {history.map((item, idx) => (
                                <button
                                    key={`${item.word}_${idx}`}
                                    type="button"
                                    className={`generator-history-chip custom-font-text notranslate ${item.word === generatedWord ? 'active' : ''}`}
                                    onClick={() => setGeneratedPreview(item)}
                                    title={`/${item.ipa}/ (${item.wordClass})`}
                                >
                                    {transliterate(item.word)}
                                </button>
                            ))}
                        </div>
                    )}

                    {derivations.length > 0 && (
                        <div className="derivation-preview-section">
                            <h3 className="derivation-preview-title">{t('generator.derivationPreview')}</h3>
                            <div className="derivation-grid">
                                {derivations.map((d, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        className="derivation-item"
                                        onClick={() => d.result && handleCopyText(d.result)}
                                        title={d.result || ''}
                                    >
                                        <div className="derivation-rule-header">
                                            <span className="derivation-rule-name">{d.name}</span>
                                            {d.gloss && <span className="derivation-gloss-tag">{d.gloss}</span>}
                                            {d.isRegex && <span className="derivation-gloss-tag">fx</span>}
                                        </div>
                                        <span className="custom-font-text notranslate derivation-result-word">
                                            {transliterate(d.result || '') || '---'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="generator-actions">
                        <form className="generator-quick-save" onSubmit={handleQuickSave}>
                            <input
                                type="text"
                                className="generator-input"
                                value={quickTranslation}
                                onChange={(e) => setQuickTranslation(e.target.value)}
                                placeholder={t('generator.quickSavePlaceholder')}
                            />
                            <Button type="submit" variant="save">
                                <div className="generator-btn-content"><Check size={16} /> {t('generator.quickSaveBtn')}</div>
                            </Button>
                        </form>
                        <Button variant="imp" onClick={handleSendToCreateWord}>
                            <div className="generator-btn-content"><Send size={18} /> {t('generator.sendToCreate')}</div>
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
}

function FillMode({ onExit }) {
    const { t } = useTranslation();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [conlangWord, setConlangWord] = useState('');

    const addWord = useLexiconStore((state) => state.addWord);
    const checkDuplicate = useLexiconStore((state) => state.checkDuplicate);
    const lexicon = useLexiconStore((state) => state.lexicon) || [];
    const configData = useConfigStore(useShallow(state => ({
        phonologyTypes: state.phonologyTypes,
        consonants: state.consonants,
        vowels: state.vowels,
        syllablePattern: state.syllablePattern,
        syllabaryMap: state.syllabaryMap,
        otherPhonemes: state.otherPhonemes,
        otherPhonemeMapping: state.otherPhonemeMapping,
        skipSyllableValidation: state.skipSyllableValidation,
        ipaMappingRules: state.ipaMappingRules,
        vowelHarmonyMode: state.vowelHarmonyMode,
    })));
    const { normalizeToBase } = useTransliterator();

    const availableWords = useMemo(() => {
        return commonWords.filter(cw => {
            const target = cw.word.toLowerCase();
            return !lexicon.some(lw => {
                const trans = (lw.translation || '').toLowerCase().trim();
                const cleanTrans = trans.replace(/\s*[([].*?[)\]]\s*/g, ' ').trim();
                if (cleanTrans === target || cleanTrans === `to ${target}`) return true;
                const parts = cleanTrans.split(/[,/;|]+/).map(p => p.trim());
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
            toast.error(t('generator.enterTranslationError'));
            return;
        }
        const { isDuplicateWord, isDuplicateTranslation } = checkDuplicate(conlangWord, translation);
        if (isDuplicateWord || isDuplicateTranslation) {
            toast.error(t('generator.duplicateEntryError'));
            return;
        }

        const safeWord = normalizeToBase(conlangWord.trim());
        const validation = validateNewWord(safeWord, configData, wordClass, []);

        if (!validation.valid && validation.type === 'vowel_harmony') {
            const mode = configData.vowelHarmonyMode || 'complete';
            if (mode === 'complete') {
                toast.error(t('generator.harmonyBlocked', { reason: validation.reason }));
                return;
            }
            if (!window.confirm(t('generator.harmonyConfirm', { reason: validation.reason }))) return;
        } else if (!validation.valid) {
            if (!window.confirm(t('generator.syntaxConfirm', { reason: validation.reason }))) return;
        }

        addWord({
            word: safeWord,
            wordClass,
            translation,
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
                        <h2 className='flex sg-title'><BookCopy /> {t('generator.fillMode')}</h2>
                        <Button variant="cancel" onClick={onExit}>{t('generator.exitFillMode')}</Button>
                    </div>
                    <div className="explore-empty">
                        <Check size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                        <h3>{t('generator.allDone')}</h3>
                        <p>{t('generator.allDoneDesc')}</p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="fill-mode-container">
            <Card>
                <div className="fill-mode-header">
                    <h2 className='flex sg-title'><BookCopy /> {t('generator.fillMode')}</h2>
                    <Button variant="cancel" onClick={onExit}>{t('generator.exitFillMode')}</Button>
                </div>
                <p>{t('generator.fillModeDesc')}</p>

                <div className="fill-challenge">
                    <div className="challenge-word-container">
                        <p className="challenge-label">{t('generator.translateLabel')}</p>
                        <h1 className="challenge-word">{currentChallenge.word}</h1>
                        <p className="challenge-class">({currentChallenge.class})</p>
                    </div>
                    <Input
                        label={t('generator.yourConlangWord')}
                        value={conlangWord}
                        onChange={(e) => setConlangWord(e.target.value)}
                        placeholder={t('generator.fillWordPlaceholder')}
                        className="custom-font-text notranslate"
                        autoFocus
                    />
                </div>

                <div className="fill-actions">
                    <Button variant="default" onClick={handleSkip}><SkipForward size={18} /> {t('generator.skip')}</Button>
                    <Button variant="save" onClick={handleSaveAndNext}><Check size={18} /> {t('generator.saveAndNext')}</Button>
                </div>
            </Card>
        </div>
    );
}

function BatchMode({ onExit }) {
    const { t } = useTranslation();
    const { transliterate } = useTransliterator();
    const { generateWord } = useWordGenerator();
    const addWord = useLexiconStore((state) => state.addWord);
    const checkDuplicate = useLexiconStore((state) => state.checkDuplicate);
    const lexicon = useLexiconStore((state) => state.lexicon) || [];
    const customWordClasses = useConfigStore((state) => state.customWordClasses) || [];
    const generatorMarkers = useConfigStore((state) => state.generatorMarkers) || {};

    const [batchSize, setBatchSize] = useState(20);
    const [selectedLengths, setSelectedLengths] = useState([2, 3]);
    const [batchClass, setBatchClass] = useState('random');
    const [avoidLexiconDups, setAvoidLexiconDups] = useState(true);
    const [generatedBatch, setGeneratedBatch] = useState([]);
    const [selectedWords, setSelectedWords] = useState(new Set());
    const [translations, setTranslations] = useState({});

    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 50;

    const allWordClasses = useMemo(
        () => getAvailableWordClasses(customWordClasses, generatorMarkers),
        [customWordClasses, generatorMarkers]
    );

    const formatClassLabel = (cls) => {
        if (STANDARD_CLASS_LABELS.includes(cls)) return t(`generator.${cls}`);
        return cls.charAt(0).toUpperCase() + cls.slice(1);
    };

    const handleGenerateBatch = () => {
        if (selectedLengths.length === 0) {
            return toast.error(t('generator.selectSyllableLengthError'));
        }
        const newBatch = [];
        const seenWords = avoidLexiconDups
            ? new Set(lexicon.map(w => (w.word || '').replace(/\*/g, '').trim().toLowerCase()).filter(Boolean))
            : new Set();

        const targetCount = Math.min(3000, Math.max(1, Number(batchSize) || 20));
        const maxIterations = targetCount * 3;

        for (let i = 0; i < maxIterations && newBatch.length < targetCount; i++) {
            const result = generateWord(selectedLengths, batchClass, {
                silent: i > 0,
                skipStateUpdate: true,
                avoidDuplicates: avoidLexiconDups,
                existingWords: seenWords,
                maxAttempts: 10,
            });
            if (!result) break;
            const norm = (result.word || '').toLowerCase();
            if (!seenWords.has(norm)) {
                seenWords.add(norm);
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
        if (val.trim() && !selectedWords.has(id)) {
            toggleSelection(id);
        }
    };

    const handleSelectAll = () => {
        setSelectedWords(new Set(generatedBatch.map(w => w.id)));
    };

    const handleClearSelection = () => {
        setSelectedWords(new Set());
    };

    const handleExportCsv = () => {
        if (generatedBatch.length === 0) return;
        const rows = [
            ['Word', 'IPA', 'Class', 'Translation'].map(sanitizeCsvCell).join(','),
            ...generatedBatch.map(item =>
                [item.word, item.ipa, item.wordClass, translations[item.id] || ''].map(sanitizeCsvCell).join(',')
            )
        ];
        const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'generated_words.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleSaveSelected = () => {
        let savedCount = 0;
        let duplicateCount = 0;
        const savedIds = new Set();

        selectedWords.forEach(id => {
            const entry = generatedBatch.find(w => w.id === id);
            if (entry) {
                const translation = translations[id] || 'Unknown';
                const { isDuplicateWord, isDuplicateTranslation } = checkDuplicate(entry.word, translation);

                if (isDuplicateWord || isDuplicateTranslation) {
                    duplicateCount++;
                } else {
                    addWord({
                        word: entry.word,
                        ipa: entry.ipa,
                        wordClass: entry.wordClass,
                        translation,
                    });
                    savedCount++;
                    savedIds.add(id);
                }
            }
        });

        if (duplicateCount > 0) {
            toast.success(t('generator.batchSavedWithDupsToast', { saved: savedCount, skipped: duplicateCount }));
        } else {
            toast.success(t('generator.batchSavedToast', { saved: savedCount }));
        }

        setGeneratedBatch(prev => {
            const newBatch = prev.filter(w => !savedIds.has(w.id));
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
                    <h2 className='flex sg-title'><Wand2 /> {t('generator.batchGen')}</h2>
                    <Button variant="cancel" onClick={onExit}>{t('generator.exitBatchMode')}</Button>
                </div>
                <p>{t('generator.batchDesc')}</p>

                <div className="generator-input-row" style={{ marginTop: '20px' }}>
                    <div className="generator-input-group">
                        <label className="generator-label">{t('generator.wordsToGen')}</label>
                        <input
                            type="number" min="5" max="3000"
                            className="generator-input"
                            value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))}
                        />
                    </div>
                    <div className="generator-input-group">
                        <label className="generator-label">{t('generator.wordClass')}</label>
                        <select
                            className="generator-input"
                            value={batchClass}
                            onChange={(e) => setBatchClass(e.target.value)}
                        >
                            <option value="random">{t('generator.random')}</option>
                            {allWordClasses.map(cls => (
                                <option key={cls} value={cls}>{formatClassLabel(cls)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="generator-input-group">
                        <label className="generator-label">{t('generator.syllableLengths')}</label>
                        <div className="generator-length-row">
                            {[1, 2, 3, 4, 5, 6, 7].map(len => (
                                <button
                                    key={len}
                                    type="button"
                                    className={`generator-length-btn ${selectedLengths.includes(len) ? 'active' : ''}`}
                                    onClick={() => {
                                        if (selectedLengths.includes(len)) {
                                            if (selectedLengths.length > 1) {
                                                setSelectedLengths(selectedLengths.filter(l => l !== len));
                                            }
                                        } else {
                                            setSelectedLengths([...selectedLengths, len].sort((a, b) => a - b));
                                        }
                                    }}
                                >
                                    {len}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="generator-options-row">
                    <label className="generator-option-check">
                        <input
                            type="checkbox"
                            checked={avoidLexiconDups}
                            onChange={(e) => setAvoidLexiconDups(e.target.checked)}
                        />
                        <span>{t('generator.avoidDuplicates')}</span>
                    </label>
                </div>

                <Button variant="imp" onClick={handleGenerateBatch} style={{ marginBottom: '20px' }}>
                    {t('generator.generateCount', { count: batchSize })}
                </Button>

                {generatedBatch.length > 0 && (
                    <div className="batch-results">
                        <div className="batch-toolbar">
                            <h3 style={{ margin: 0, color: 'var(--tx2)' }}>{t('generator.resultsCount', { count: generatedBatch.length })}</h3>

                            <div className="batch-toolbar-actions">
                                <Button variant="default" onClick={handleSelectAll}>{t('generator.selectAll')}</Button>
                                <Button variant="default" onClick={handleClearSelection}>{t('generator.clearSelection')}</Button>
                                <Button variant="edit" onClick={handleExportCsv}>
                                    <Download size={14} /> {t('generator.exportCsv')}
                                </Button>
                                <Button
                                    variant="save"
                                    onClick={handleSaveSelected}
                                    disabled={selectedWords.size === 0}
                                >
                                    {t('generator.saveSelected', { count: selectedWords.size })}
                                </Button>
                            </div>
                        </div>

                        {totalPages > 1 && (
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                                <Button
                                    variant="default"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    {t('generator.prevPage')}
                                </Button>
                                <span style={{ color: 'var(--tx2)', fontSize: '0.9rem' }}>
                                    {t('generator.pageOf', { current: currentPage, total: totalPages })}
                                </span>
                                <Button
                                    variant="default"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    {t('generator.nextPage')}
                                </Button>
                            </div>
                        )}

                        <div className="batch-list">
                            {paginatedBatch.map(item => (
                                <div
                                    key={item.id}
                                    className={`batch-item-row ${selectedWords.has(item.id) ? 'selected' : ''}`}
                                    onClick={(e) => {
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
                                        <div className="custom-font-text notranslate" style={{ fontSize: '1.15rem', fontWeight: 'bold', color: 'var(--tx)' }}>{transliterate(item.word)}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--tx3)' }}>/{item.ipa}/ • {formatClassLabel(item.wordClass)}</div>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder={t('generator.enterTransPlaceholder')}
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
    return <VocabChecklist onExit={onExit} />;
}

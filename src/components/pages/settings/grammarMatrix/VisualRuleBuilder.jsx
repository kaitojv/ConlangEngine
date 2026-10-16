import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Wand2, X, ArrowRight, RefreshCw, Layers, Repeat, Type, Wand } from 'lucide-react';
import Button from '../../../UI/Buttons/Buttons.jsx';
import { useTranslation } from '../../../../hooks/useTranslation.jsx';
import './visualRuleBuilder.css';

const PRESET_TEST_WORDS = ['Pata', 'Patem', 'Keleme', 'Boros', 'Tak'];

const parseAffixToState = (currentAffix = '', initialMode = 'standard') => {
    const af = (currentAffix || '').trim();
    const defaults = {
        mode: initialMode || 'standard',
        stdType: 'suffix',
        stdValue: '',
        stdInfixPos: '@V',
        stdPrecededBy: '',
        stdFollowedBy: '',
        mutFind: '',
        mutReplace: '',
        mutPos: 'end',
        mutPrecededBy: '',
        mutFollowedBy: '',
        redType: 'prefix',
        redCount: 2,
        redSep: 'none',
        transTarget: 'vowels',
        transTo: 'i'
    };

    if (!af) return defaults;

    if (af.includes('=>')) {
        const [pattern = '', replacement = ''] = af.split('=>').map(s => s.trim());

        const fullRedup = (pattern === '^(.+)$' || pattern === '^(.+)') && replacement.includes('$1');
        const prefixRedup = pattern.match(/^\^\(\.\{(\d+)\}\)\(\.\*\)$/);
        const suffixRedup = pattern.match(/^\(\.\*\)\(\.\{(\d+)\}\)\$$/);

        if (fullRedup) {
            return {
                ...defaults,
                mode: 'reduplication',
                redType: 'full',
                redSep: replacement.includes('$1-$1') ? 'hyphen' : (replacement.includes('$1 $1') ? 'space' : 'none')
            };
        }
        if (prefixRedup) {
            return {
                ...defaults,
                mode: 'reduplication',
                redType: 'prefix',
                redCount: parseInt(prefixRedup[1], 10) || 2,
                redSep: replacement.includes('$1-$1') ? 'hyphen' : 'none'
            };
        }
        if (suffixRedup) {
            return {
                ...defaults,
                mode: 'reduplication',
                redType: 'suffix',
                redCount: parseInt(suffixRedup[1], 10) || 2,
                redSep: replacement.includes('$2-$2') ? 'hyphen' : 'none'
            };
        }

        if (pattern === '[aeiou]' || pattern.includes('[aeiou]') || pattern.includes('[^aeiou\\s]')) {
            let target = 'vowels';
            if (pattern.includes('(?=[^aeiou]*$)')) target = 'lastVowel';
            else if (pattern.startsWith('^([^aeiou]*)[aeiou]')) target = 'firstVowel';
            else if (pattern === '[aeiou]') target = 'vowels';
            else if (pattern.startsWith('^([^aeiou\\s])')) target = 'firstConsonant';
            else if (pattern.endsWith('([^aeiou\\s])$')) target = 'lastConsonant';
            else target = 'consonants';

            return {
                ...defaults,
                mode: 'transformation',
                transTarget: target,
                transTo: replacement
            };
        }

        // Mutation rule
        let cleanPattern = pattern;
        let pos = 'everywhere';
        if (cleanPattern.startsWith('^')) {
            pos = 'start';
            cleanPattern = cleanPattern.slice(1);
        } else if (cleanPattern.endsWith('$')) {
            pos = 'end';
            cleanPattern = cleanPattern.slice(0, -1);
        }

        let precededBy = '';
        const lbMatch = cleanPattern.match(/^\(\?<=([^)]+)\)/);
        if (lbMatch) {
            precededBy = lbMatch[1];
            cleanPattern = cleanPattern.replace(/^\(\?<=([^)]+)\)/, '');
        }

        let followedBy = '';
        const laMatch = cleanPattern.match(/\(\?=([^)]+)\)$/);
        if (laMatch) {
            followedBy = laMatch[1];
            cleanPattern = cleanPattern.replace(/\(\?=([^)]+)\)$/, '');
        }

        return {
            ...defaults,
            mode: 'mutation',
            mutFind: cleanPattern,
            mutReplace: replacement,
            mutPos: pos,
            mutPrecededBy: precededBy,
            mutFollowedBy: followedBy
        };
    }

    if (af.includes('@')) {
        const parts = af.split('@');
        return {
            ...defaults,
            mode: 'standard',
            stdType: 'infix',
            stdValue: parts[0].replace(/^-|-$/g, ''),
            stdInfixPos: '@' + (parts[1] || 'V')
        };
    }
    if (af.endsWith('-') && !af.startsWith('-')) {
        return {
            ...defaults,
            mode: 'standard',
            stdType: 'prefix',
            stdValue: af.replace(/-$/, '')
        };
    }
    if (af.startsWith('-')) {
        return {
            ...defaults,
            mode: 'standard',
            stdType: 'suffix',
            stdValue: af.replace(/^-/, '')
        };
    }
    return {
        ...defaults,
        mode: 'standard',
        stdType: 'free',
        stdValue: af
    };
};

const VisualRuleBuilderDialog = ({ onClose, onApply, currentAffix, initialMode }) => {
    const { t } = useTranslation();
    const initialState = useMemo(() => parseAffixToState(currentAffix, initialMode), [currentAffix, initialMode]);

    const [mode, setMode] = useState(initialState.mode);
    const [testWord, setTestWord] = useState('Pata');

    // Standard Mode State
    const [stdType, setStdType] = useState(initialState.stdType);
    const [stdValue, setStdValue] = useState(initialState.stdValue);
    const [stdInfixPos, setStdInfixPos] = useState(initialState.stdInfixPos);
    const [stdPrecededBy, setStdPrecededBy] = useState(initialState.stdPrecededBy);
    const [stdFollowedBy, setStdFollowedBy] = useState(initialState.stdFollowedBy);

    // Mutation Mode State
    const [mutFind, setMutFind] = useState(initialState.mutFind);
    const [mutReplace, setMutReplace] = useState(initialState.mutReplace);
    const [mutPos, setMutPos] = useState(initialState.mutPos);
    const [mutPrecededBy, setMutPrecededBy] = useState(initialState.mutPrecededBy);
    const [mutFollowedBy, setMutFollowedBy] = useState(initialState.mutFollowedBy);

    // Reduplication Mode State
    const [redType, setRedType] = useState(initialState.redType);
    const [redCount, setRedCount] = useState(initialState.redCount);
    const [redSep, setRedSep] = useState(initialState.redSep);

    // Transformation Mode State
    const [transTarget, setTransTarget] = useState(initialState.transTarget);
    const [transTo, setTransTo] = useState(initialState.transTo);

    // Compile formula purely via useMemo (zero setState cascades)
    const result = useMemo(() => {
        if (mode === 'standard') {
            const val = stdValue.trim();
            if (!val) return '';

            if (stdPrecededBy || stdFollowedBy) {
                const lookbehind = stdPrecededBy ? `(?<=${stdPrecededBy})` : '';
                const lookahead = stdFollowedBy ? `(?=${stdFollowedBy})` : '';
                if (stdType === 'prefix') {
                    return `^${lookahead} => ${val}`;
                } else if (stdType === 'suffix') {
                    return `${lookbehind}$ => ${val}`;
                } else {
                    return `${lookbehind}${val}${lookahead}`;
                }
            } else {
                const clean = val.replace(/^-|-$/g, '');
                if (stdType === 'prefix') return `${clean}-`;
                if (stdType === 'suffix') return `-${clean}`;
                if (stdType === 'infix') return `-${clean}-${stdInfixPos}`;
                return clean;
            }
        } 
        if (mode === 'mutation') {
            const find = mutFind.trim();
            const rep = mutReplace.trim();
            if (!find && !rep) return '';

            const lookbehind = mutPrecededBy ? `(?<=${mutPrecededBy})` : '';
            const lookahead = mutFollowedBy ? `(?=${mutFollowedBy})` : '';

            let pattern = '';
            if (mutPos === 'start') {
                pattern = `^${lookbehind}${find}${lookahead}`;
            } else if (mutPos === 'end') {
                pattern = `${lookbehind}${find}${lookahead}$`;
            } else {
                pattern = `${lookbehind}${find}${lookahead}`;
            }

            if ((pattern === '^' || pattern === '$') && !rep) return '';

            return `${pattern} => ${rep}`;
        }
        if (mode === 'reduplication') {
            const sep = redSep === 'hyphen' ? '-' : (redSep === 'space' ? ' ' : '');
            if (redType === 'full') {
                return `^(.+)$ => $1${sep}$1`;
            } else if (redType === 'prefix') {
                return `^(.{${redCount}})(.*) => $1${sep}$1$2`;
            } else {
                return `(.*)(.{${redCount}})$ => $1$2${sep}$2`;
            }
        }
        if (mode === 'transformation') {
            const to = transTo.trim() || 'i';
            if (transTarget === 'vowels') {
                return `[aeiou] => ${to}`;
            } else if (transTarget === 'lastVowel') {
                return `([aeiou])(?=[^aeiou]*$) => ${to}`;
            } else if (transTarget === 'firstVowel') {
                return `^([^aeiou]*)[aeiou] => $1${to}`;
            } else if (transTarget === 'firstConsonant') {
                return `^([^aeiou\\s]) => ${to}`;
            } else if (transTarget === 'lastConsonant') {
                return `([^aeiou\\s])$ => ${to}`;
            } else {
                return `[^aeiou\\s] => ${to}`;
            }
        }
        return '';
    }, [
        mode, stdType, stdValue, stdInfixPos, stdPrecededBy, stdFollowedBy,
        mutFind, mutReplace, mutPos, mutPrecededBy, mutFollowedBy,
        redType, redCount, redSep,
        transTarget, transTo
    ]);

    // Calculate preview transformation
    const previewResult = useMemo(() => {
        if (!testWord) return '';
        if (!result) return testWord;

        try {
            if (result.includes('=>')) {
                const [pattern, replacement = ''] = result.split('=>').map(s => s.trim());
                if (!pattern) return testWord;
                const regex = new RegExp(pattern, 'gi');
                return testWord.replace(regex, replacement);
            } else {
                const clean = stdValue.replace(/^-|-$/g, '');
                if (!clean) return testWord;
                if (stdType === 'prefix') return clean + testWord;
                if (stdType === 'suffix') return testWord + clean;
                if (stdType === 'free') return clean + ' ' + testWord;
                if (stdType === 'infix') {
                    const vowels = 'aeiouAEIOU';
                    if (stdInfixPos === '@V') {
                        const idx = testWord.split('').findIndex(c => vowels.includes(c));
                        if (idx !== -1) {
                            return testWord.slice(0, idx + 1) + clean + testWord.slice(idx + 1);
                        }
                    } else if (stdInfixPos === '@C') {
                        const idx = testWord.split('').findIndex(c => !vowels.includes(c));
                        if (idx !== -1) {
                            return testWord.slice(0, idx + 1) + clean + testWord.slice(idx + 1);
                        }
                    }
                    return testWord.slice(0, Math.floor(testWord.length / 2)) + clean + testWord.slice(Math.floor(testWord.length / 2));
                }
            }
        } catch {
            return t('settings.grammar.vrbInvalidRule');
        }
        return testWord;
    }, [testWord, result, stdType, stdValue, stdInfixPos, t]);

    const isMatch = Boolean(result && previewResult && previewResult !== testWord && previewResult !== t('settings.grammar.vrbInvalidRule'));
    const isInvalid = previewResult === t('settings.grammar.vrbInvalidRule');

    const handleApply = () => {
        if (!result) {
            onClose();
            return;
        }
        onApply(result);
        onClose();
    };

    return (
        <div className="vrb-overlay" role="presentation" onClick={onClose}>
            <div className="vrb-modal" role="dialog" aria-modal="true" aria-label={t('settings.grammar.vrbTitle')} onClick={e => e.stopPropagation()}>
                
                <div className="vrb-header">
                    <Wand2 size={20} className="vrb-header-icon" />
                    <h2>{t('settings.grammar.vrbTitle')}</h2>
                    <button 
                        type="button" 
                        className="vrb-close-btn" 
                        onClick={onClose}
                        aria-label={t('common.close') || 'Close'}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="vrb-content">
                    
                    {/* MODE SELECTION */}
                    <div className="vrb-modes" role="tablist">
                        <button 
                            type="button"
                            role="tab"
                            aria-selected={mode === 'standard'}
                            className={`vrb-mode-btn ${mode === 'standard' ? 'active' : ''}`}
                            onClick={() => setMode('standard')}
                        >
                            <Layers size={18} />
                            <span>{t('settings.grammar.vrbAffix')}</span>
                        </button>
                        <button 
                            type="button"
                            role="tab"
                            aria-selected={mode === 'mutation'}
                            className={`vrb-mode-btn ${mode === 'mutation' ? 'active' : ''}`}
                            onClick={() => setMode('mutation')}
                        >
                            <RefreshCw size={18} />
                            <span>{t('settings.grammar.vrbMutation')}</span>
                        </button>
                        <button 
                            type="button"
                            role="tab"
                            aria-selected={mode === 'reduplication'}
                            className={`vrb-mode-btn ${mode === 'reduplication' ? 'active' : ''}`}
                            onClick={() => setMode('reduplication')}
                        >
                            <Repeat size={18} />
                            <span>{t('settings.grammar.vrbReduplication')}</span>
                        </button>
                        <button 
                            type="button"
                            role="tab"
                            aria-selected={mode === 'transformation'}
                            className={`vrb-mode-btn ${mode === 'transformation' ? 'active' : ''}`}
                            onClick={() => setMode('transformation')}
                        >
                            <Type size={18} />
                            <span>{t('settings.grammar.vrbTransformation')}</span>
                        </button>
                    </div>

                    {/* FORM SECTION */}
                    <div className="vrb-form">
                        
                        {mode === 'standard' && (
                            <>
                                <div className="vrb-form-grid">
                                    <div className="vrb-field-group">
                                        <label className="vrb-label">{t('settings.grammar.vrbType')}</label>
                                        <select className="vrb-select" value={stdType} onChange={e => setStdType(e.target.value)}>
                                            <option value="prefix">{t('settings.grammar.vrbPrefix')}</option>
                                            <option value="suffix">{t('settings.grammar.vrbSuffix')}</option>
                                            <option value="infix">{t('settings.grammar.vrbInfix')}</option>
                                            <option value="free">{t('settings.grammar.vrbFree')}</option>
                                        </select>
                                    </div>
                                    <div className="vrb-field-group">
                                        <label className="vrb-label">{t('settings.grammar.vrbMorpheme')}</label>
                                        <input 
                                            className="vrb-input notranslate" 
                                            placeholder="e.g. s, un, ma" 
                                            value={stdValue}
                                            onChange={e => setStdValue(e.target.value)}
                                        />
                                    </div>
                                </div>
                                {stdType === 'infix' && (
                                    <div className="vrb-form-grid" style={{ marginTop: '0.6rem' }}>
                                        <div className="vrb-field-group">
                                            <label className="vrb-label">{t('settings.grammar.vrbInsertionPoint')}</label>
                                            <select className="vrb-select" value={stdInfixPos} onChange={e => setStdInfixPos(e.target.value)}>
                                                <option value="@V">{t('settings.grammar.vrbAfterVowel')}</option>
                                                <option value="@C">{t('settings.grammar.vrbAfterConsonant')}</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                                {(stdType === 'prefix' || stdType === 'suffix') && (
                                    <div className="vrb-form-grid" style={{ marginTop: '0.6rem' }}>
                                        <div className="vrb-field-group">
                                            <label className="vrb-label">{t('settings.grammar.vrbPrecededBy')}</label>
                                            <input 
                                                className="vrb-input notranslate" 
                                                placeholder="e.g. a (optional)" 
                                                value={stdPrecededBy} 
                                                onChange={e => setStdPrecededBy(e.target.value)} 
                                            />
                                        </div>
                                        <div className="vrb-field-group">
                                            <label className="vrb-label">{t('settings.grammar.vrbFollowedBy')}</label>
                                            <input 
                                                className="vrb-input notranslate" 
                                                placeholder="e.g. i (optional)" 
                                                value={stdFollowedBy} 
                                                onChange={e => setStdFollowedBy(e.target.value)} 
                                            />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {mode === 'mutation' && (
                            <>
                                <div className="vrb-form-grid">
                                    <div className="vrb-field-group">
                                        <label className="vrb-label">{t('settings.grammar.vrbFind')}</label>
                                        <input 
                                            className="vrb-input notranslate" 
                                            placeholder="e.g. em, k, a" 
                                            value={mutFind} 
                                            onChange={e => setMutFind(e.target.value)} 
                                        />
                                    </div>
                                    <div className="vrb-field-group">
                                        <label className="vrb-label">{t('settings.grammar.vrbReplace')}</label>
                                        <input 
                                            className="vrb-input notranslate" 
                                            placeholder="e.g. esh, ch, e" 
                                            value={mutReplace} 
                                            onChange={e => setMutReplace(e.target.value)} 
                                        />
                                    </div>
                                </div>
                                <div className="vrb-form-grid" style={{ marginTop: '0.6rem' }}>
                                    <div className="vrb-field-group">
                                        <label className="vrb-label">{t('settings.grammar.vrbAtPosition')}</label>
                                        <select className="vrb-select" value={mutPos} onChange={e => setMutPos(e.target.value)}>
                                            <option value="end">{t('settings.grammar.vrbPosEnd')}</option>
                                            <option value="start">{t('settings.grammar.vrbPosStart')}</option>
                                            <option value="everywhere">{t('settings.grammar.vrbPosEverywhere')}</option>
                                        </select>
                                    </div>
                                    <div className="vrb-field-group">
                                        <label className="vrb-label">{t('settings.grammar.vrbPrecededBy')}</label>
                                        <input 
                                            className="vrb-input notranslate" 
                                            placeholder="e.g. a (optional)" 
                                            value={mutPrecededBy} 
                                            onChange={e => setMutPrecededBy(e.target.value)} 
                                        />
                                    </div>
                                </div>
                                <div className="vrb-form-grid" style={{ marginTop: '0.6rem' }}>
                                    <div className="vrb-field-group">
                                        <label className="vrb-label">{t('settings.grammar.vrbFollowedBy')}</label>
                                        <input 
                                            className="vrb-input notranslate" 
                                            placeholder="e.g. i (optional)" 
                                            value={mutFollowedBy} 
                                            onChange={e => setMutFollowedBy(e.target.value)} 
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {mode === 'reduplication' && (
                            <>
                                <div className="vrb-form-grid">
                                    <div className="vrb-field-group">
                                        <label className="vrb-label">{t('settings.grammar.vrbRedupType') || 'Reduplication Type'}</label>
                                        <select className="vrb-select" value={redType} onChange={e => setRedType(e.target.value)}>
                                            <option value="full">{t('settings.grammar.vrbRedupFull') || 'Full Word'}</option>
                                            <option value="prefix">{t('settings.grammar.vrbRedupPrefix') || 'Prefix (First N Chars)'}</option>
                                            <option value="suffix">{t('settings.grammar.vrbRedupSuffix') || 'Suffix (Last N Chars)'}</option>
                                        </select>
                                    </div>
                                    <div className="vrb-field-group">
                                        <label className="vrb-label">{t('settings.grammar.vrbSeparator') || 'Separator'}</label>
                                        <select className="vrb-select" value={redSep} onChange={e => setRedSep(e.target.value)}>
                                            <option value="none">{t('settings.grammar.vrbSepNone') || 'None'}</option>
                                            <option value="hyphen">{t('settings.grammar.vrbSepHyphen') || 'Hyphen (-)'}</option>
                                            <option value="space">{t('settings.grammar.vrbSepSpace') || 'Space'}</option>
                                        </select>
                                    </div>
                                </div>
                                {redType !== 'full' && (
                                    <div className="vrb-form-grid" style={{ marginTop: '0.6rem' }}>
                                        <div className="vrb-field-group">
                                            <label className="vrb-label">{t('settings.grammar.vrbCharCount')}</label>
                                            <input 
                                                type="number"
                                                className="vrb-input" 
                                                value={redCount}
                                                onChange={e => setRedCount(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)))}
                                                min="1" 
                                                max="10"
                                            />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {mode === 'transformation' && (
                            <div className="vrb-form-grid">
                                <div className="vrb-field-group">
                                    <label className="vrb-label">{t('settings.grammar.vrbTarget')}</label>
                                    <select className="vrb-select" value={transTarget} onChange={e => setTransTarget(e.target.value)}>
                                        <option value="vowels">{t('settings.grammar.vrbVowels') || 'All Vowels'}</option>
                                        <option value="lastVowel">{t('settings.grammar.vrbLastVowel') || 'Last Vowel (Ablaut/Umlaut)'}</option>
                                        <option value="firstVowel">{t('settings.grammar.vrbFirstVowel') || 'First Vowel'}</option>
                                        <option value="consonants">{t('settings.grammar.vrbConsonants') || 'All Consonants'}</option>
                                        <option value="firstConsonant">{t('settings.grammar.vrbFirstConsonant') || 'Initial Consonant'}</option>
                                        <option value="lastConsonant">{t('settings.grammar.vrbLastConsonant') || 'Final Consonant'}</option>
                                    </select>
                                </div>
                                <div className="vrb-field-group">
                                    <label className="vrb-label">{t('settings.grammar.vrbTransformTo')}</label>
                                    <input 
                                        className="vrb-input notranslate" 
                                        placeholder="e.g. i, e, u, k" 
                                        value={transTo}
                                        onChange={e => setTransTo(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                    </div>

                    {/* PREVIEW SECTION */}
                    <div className="vrb-preview-box">
                        <div className="vrb-preview-title">
                            <Wand size={13} /> {t('settings.grammar.vrbLivePreview')}
                        </div>

                        <div className="vrb-preview-presets">
                            <span>Test word:</span>
                            {PRESET_TEST_WORDS.map(preset => (
                                <button
                                    key={preset}
                                    type="button"
                                    className="vrb-preset-chip notranslate"
                                    onClick={() => setTestWord(preset)}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>

                        <div className="vrb-preview-grid">
                            <div className="vrb-preview-item">
                                <input 
                                    className="vrb-preview-input notranslate" 
                                    value={testWord}
                                    onChange={e => setTestWord(e.target.value)}
                                    placeholder={t('settings.grammar.vrbTestWord')}
                                />
                                <div className="vrb-preview-label">{t('settings.grammar.vrbRootInput')}</div>
                            </div>
                            <div className="vrb-preview-arrow">
                                <ArrowRight size={18} />
                            </div>
                            <div className="vrb-preview-item">
                                <div className={`vrb-preview-word notranslate ${isInvalid ? 'invalid' : (!isMatch ? 'unchanged' : '')}`}>
                                    {previewResult}
                                </div>
                                <div className="vrb-preview-label">
                                    {t('settings.grammar.vrbInflectedForm')}
                                    {result && !isMatch && !isInvalid && (
                                        <span style={{ display: 'block', textTransform: 'none', opacity: 0.7 }}>
                                            ({t('settings.grammar.vrbNoMatch') || 'no pattern match in word'})
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="vrb-result-formula">
                            <div className="vrb-label">{t('settings.grammar.vrbGenFormula')}</div>
                            <div className={`vrb-formula-tag notranslate ${!result ? 'empty' : ''}`}>
                                {result || (t('settings.grammar.vrbNoFormula') || '—')}
                            </div>
                        </div>
                    </div>

                </div>

                <div className="vrb-footer">
                    <Button variant="cancel" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant="save" onClick={handleApply} disabled={!result.trim()}>
                        {t('settings.grammar.vrbApplyRule')}
                    </Button>
                </div>

            </div>
        </div>
    );
};

export const VisualRuleBuilder = ({ isOpen, onClose, onApply, currentAffix = "", initialMode = 'standard' }) => {
    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <VisualRuleBuilderDialog
            key={`${isOpen}_${currentAffix}_${initialMode}`}
            onClose={onClose}
            onApply={onApply}
            currentAffix={currentAffix}
            initialMode={initialMode}
        />,
        document.body
    );
};

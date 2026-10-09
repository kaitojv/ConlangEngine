import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Wand2, X, ArrowRight, RefreshCw, Layers, Repeat, Type, Wand } from 'lucide-react';
import Button from '../../../UI/Buttons/Buttons.jsx';
import { useTranslation } from '../../../../hooks/useTranslation.jsx';
import './visualRuleBuilder.css';

export const VisualRuleBuilder = ({ isOpen, onClose, onApply, currentAffix = "", initialMode = 'standard' }) => {
    const { t } = useTranslation();
    const [mode, setMode] = useState(initialMode);
    
    // Reset mode when modal opens
    useEffect(() => {
        if (isOpen) setMode(initialMode);
    }, [isOpen, initialMode]);

    const [testWord, setTestWord] = useState('Pata');
    const [result, setResult] = useState('');
    
    // Standard Mode State
    const [stdType, setStdType] = useState('suffix'); // prefix, suffix, infix, free
    const [stdValue, setStdValue] = useState('');
    const [stdInfixPos, setStdInfixPos] = useState('@V');

    // Mutation Mode State
    const [mutFind, setMutFind] = useState('');
    const [mutReplace, setMutReplace] = useState('');
    const [mutPos, setMutPos] = useState('end'); // start, end, everywhere
    const [mutPrecededBy, setMutPrecededBy] = useState('');
    const [mutFollowedBy, setMutFollowedBy] = useState('');

    // Reduplication Mode State
    const [redSource, setRedSource] = useState('start'); // start, end
    const [redCount, setRedCount] = useState(2);
    
    // Transformation Mode State
    const [transTarget, setTransTarget] = useState('vowels'); // vowels, consonants
    const [transTo, setTransTo] = useState('i');

    // Compile the rule whenever inputs change
    useEffect(() => {
        let compiled = '';
        
        if (mode === 'standard') {
            const lookbehind = mutPrecededBy ? `(?<=${mutPrecededBy})` : '';
            const lookahead = mutFollowedBy ? `(?=${mutFollowedBy})` : '';
            
            if (stdType === 'prefix') compiled = `^${lookbehind}${stdValue}-${lookahead}`;
            else if (stdType === 'suffix') compiled = `${lookbehind}-${stdValue}${lookahead}$`;
            else if (stdType === 'infix') compiled = `-${stdValue}-${stdInfixPos}`;
            else compiled = stdValue;
        } 
        else if (mode === 'mutation') {
            const anchor = mutPos === 'start' ? '^' : (mutPos === 'end' ? '$' : '');
            const lookbehind = mutPrecededBy ? `(?<=${mutPrecededBy})` : '';
            const lookahead = mutFollowedBy ? `(?=${mutFollowedBy})` : '';
            
            let pattern = mutFind;
            if (mutPos === 'start') pattern = `${anchor}${lookbehind}${mutFind}${lookahead}`;
            else if (mutPos === 'end') pattern = `${lookbehind}${mutFind}${lookahead}${anchor}`;
            else pattern = `${lookbehind}${mutFind}${lookahead}`;
            
            compiled = `${pattern} => ${mutReplace}`;
        }
        else if (mode === 'reduplication') {
            if (redSource === 'start') {
                compiled = `^(.{${redCount}})(.*) => $1$1$2`;
            } else {
                compiled = `(.*)(.{${redCount}})$ => $1$2$2`;
            }
        }
        else if (mode === 'transformation') {
            const pattern = transTarget === 'vowels' ? '[aeiou]' : '[^aeiou\\s]';
            compiled = `${pattern} => ${transTo}`;
        }
        
        setResult(compiled);
    }, [mode, stdType, stdValue, stdInfixPos, mutFind, mutReplace, mutPos, redSource, redCount, transTarget, transTo]);

    // Calculate preview transformation
    const previewResult = useMemo(() => {
        if (!testWord) return '';
        if (!result) return testWord;

        try {
            if (result.includes('=>')) {
                const [pattern, replacement] = result.split('=>').map(s => s.trim());
                // Use 'gi' for global and case-insensitive matching
                const regex = new RegExp(pattern, 'gi');
                return testWord.replace(regex, replacement);
            } else {
                // Handle standard affixes manually for preview
                if (stdType === 'prefix') return stdValue + testWord;
                if (stdType === 'suffix') return testWord + stdValue;
                if (stdType === 'free') return stdValue || testWord;
                if (stdType === 'infix') {
                    // Simple infix logic for preview
                    const vowels = 'aeiouAEIOU';
                    const targetIdx = testWord.split('').findIndex(c => vowels.includes(c));
                    if (targetIdx !== -1 && stdInfixPos === '@V') {
                        return testWord.slice(0, targetIdx + 1) + stdValue + testWord.slice(targetIdx + 1);
                    }
                    return testWord.slice(0, Math.floor(testWord.length / 2)) + stdValue + testWord.slice(Math.floor(testWord.length / 2));
                }
            }
        } catch {
            return t('settings.grammar.vrbInvalidRule');
        }
        return testWord;
    }, [testWord, result, stdType, stdValue, stdInfixPos, t]);

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="vrb-overlay" role="presentation" onClick={onClose}>
            <div className="vrb-modal" role="dialog" aria-modal="true" aria-label={t('settings.grammar.vrbTitle')} onClick={e => e.stopPropagation()}>
                
                <div className="vrb-header">
                    <Wand2 size={20} className="text-purple-400" />
                    <h2>{t('settings.grammar.vrbTitle')}</h2>
                    <button className="ml-auto text-slate-500 hover:text-white" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="vrb-content">
                    
                    {/* MODE SELECTION */}
                    <div className="vrb-modes">
                        <button 
                            className={`vrb-mode-btn ${mode === 'standard' ? 'active' : ''}`}
                            onClick={() => setMode('standard')}
                        >
                            <Layers size={18} />
                            <span>{t('settings.grammar.vrbAffix')}</span>
                        </button>
                        <button 
                            className={`vrb-mode-btn ${mode === 'mutation' ? 'active' : ''}`}
                            onClick={() => setMode('mutation')}
                        >
                            <RefreshCw size={18} />
                            <span>{t('settings.grammar.vrbMutation')}</span>
                        </button>
                        <button 
                            className={`vrb-mode-btn ${mode === 'reduplication' ? 'active' : ''}`}
                            onClick={() => setMode('reduplication')}
                        >
                            <Repeat size={18} />
                            <span>{t('settings.grammar.vrbReduplication')}</span>
                        </button>
                        <button 
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
                                            className="vrb-input" 
                                            placeholder="e.g. ma, s" 
                                            value={stdValue}
                                            onChange={e => setStdValue(e.target.value)}
                                        />
                                    </div>
                                </div>
                                {(stdType === 'infix' || stdType === 'prefix' || stdType === 'suffix') && (
                                    <div className="vrb-form-grid" style={{ gridTemplateColumns: stdType === 'infix' ? '1fr 1fr' : '0.8fr 1.1fr 1.1fr', marginTop: '0.5rem', gap: '0.5rem' }}>
                                        {stdType === 'infix' ? (
                                            <div className="vrb-field-group">
                                                <label className="vrb-label">{t('settings.grammar.vrbInsertionPoint')}</label>
                                                <select className="vrb-select" value={stdInfixPos} onChange={e => setStdInfixPos(e.target.value)}>
                                                    <option value="@V">{t('settings.grammar.vrbAfterVowel')}</option>
                                                    <option value="@C">{t('settings.grammar.vrbAfterConsonant')}</option>
                                                </select>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="vrb-field-group">
                                                    <label className="vrb-label">{t('settings.grammar.vrbTypeLocked')}</label>
                                                    <div className="vrb-input" style={{ opacity: 0.5, fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>{stdType}</div>
                                                </div>
                                                <div className="vrb-field-group">
                                                    <label className="vrb-label">{t('settings.grammar.vrbPrecededBy')}</label>
                                                    <input className="vrb-input" placeholder="e.g. a" value={mutPrecededBy} onChange={e => setMutPrecededBy(e.target.value)} />
                                                </div>
                                                <div className="vrb-field-group">
                                                    <label className="vrb-label">{t('settings.grammar.vrbFollowedBy')}</label>
                                                    <input className="vrb-input" placeholder="e.g. i" value={mutFollowedBy} onChange={e => setMutFollowedBy(e.target.value)} />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {mode === 'mutation' && (
                            <>
                                <div className="vrb-form-grid">
                                    <div className="vrb-field-group">
                                        <label className="vrb-label">{t('settings.grammar.vrbFind')}</label>
                                        <input className="vrb-input" placeholder="e.g. em" value={mutFind} onChange={e => setMutFind(e.target.value)} />
                                    </div>
                                    <div className="vrb-field-group">
                                        <label className="vrb-label">{t('settings.grammar.vrbReplace')}</label>
                                        <input className="vrb-input" placeholder="e.g. esh" value={mutReplace} onChange={e => setMutReplace(e.target.value)} />
                                    </div>
                                </div>
                                <div className="vrb-form-grid" style={{ gridTemplateColumns: '0.8fr 1.1fr 1.1fr', marginTop: '0.5rem', gap: '0.5rem' }}>
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
                                        <input className="vrb-input" placeholder="e.g. a" value={mutPrecededBy} onChange={e => setMutPrecededBy(e.target.value)} />
                                    </div>
                                    <div className="vrb-field-group">
                                        <label className="vrb-label">{t('settings.grammar.vrbFollowedBy')}</label>
                                        <input className="vrb-input" placeholder="e.g. i" value={mutFollowedBy} onChange={e => setMutFollowedBy(e.target.value)} />
                                    </div>
                                </div>
                            </>
                        )}

                        {mode === 'reduplication' && (
                            <>
                                <div className="vrb-field-group">
                                    <label className="vrb-label">{t('settings.grammar.vrbCopyFrom')}</label>
                                    <select className="vrb-select" value={redSource} onChange={e => setRedSource(e.target.value)}>
                                        <option value="start">{t('settings.grammar.vrbCopyStart')}</option>
                                        <option value="end">{t('settings.grammar.vrbCopyEnd')}</option>
                                    </select>
                                </div>
                                <div className="vrb-field-group">
                                    <label className="vrb-label">{t('settings.grammar.vrbCharCount')}</label>
                                    <input 
                                        type="number"
                                        className="vrb-input" 
                                        value={redCount}
                                        onChange={e => setRedCount(parseInt(e.target.value) || 1)}
                                        min="1" max="10"
                                    />
                                </div>
                            </>
                        )}

                        {mode === 'transformation' && (
                            <>
                                <div className="vrb-field-group">
                                    <label className="vrb-label">{t('settings.grammar.vrbTarget')}</label>
                                    <select className="vrb-select" value={transTarget} onChange={e => setTransTarget(e.target.value)}>
                                        <option value="vowels">{t('settings.grammar.vrbVowels')}</option>
                                        <option value="consonants">{t('settings.grammar.vrbConsonants')}</option>
                                    </select>
                                </div>
                                <div className="vrb-field-group">
                                    <label className="vrb-label">{t('settings.grammar.vrbTransformTo')}</label>
                                    <input 
                                        className="vrb-input" 
                                        placeholder="e.g. i, u, k" 
                                        value={transTo}
                                        onChange={e => setTransTo(e.target.value)}
                                    />
                                </div>
                            </>
                        )}

                    </div>

                    {/* PREVIEW SECTION */}
                    <div className="vrb-preview-box">
                        <div className="vrb-preview-title">
                            <Wand size={12} /> {t('settings.grammar.vrbLivePreview')}
                        </div>
                        <div className="vrb-preview-grid">
                            <div className="vrb-preview-item">
                                <input 
                                    className="vrb-input text-center" 
                                    style={{ background: 'transparent', border: '1px dashed rgba(255,255,255,0.2)' }}
                                    value={testWord}
                                    onChange={e => setTestWord(e.target.value)}
                                    placeholder={t('settings.grammar.vrbTestWord')}
                                />
                                <div className="vrb-preview-label">{t('settings.grammar.vrbRootInput')}</div>
                            </div>
                            <div className="vrb-preview-arrow">
                                <ArrowRight />
                            </div>
                            <div className="vrb-preview-item">
                                <div className="vrb-preview-word text-purple-300">{previewResult}</div>
                                <div className="vrb-preview-label">{t('settings.grammar.vrbInflectedForm')}</div>
                            </div>
                        </div>

                        <div className="vrb-result-formula">
                            <div className="vrb-label" style={{ margin: 0 }}>{t('settings.grammar.vrbGenFormula')}</div>
                            <div className="vrb-formula-tag">{result || '—'}</div>
                        </div>
                    </div>

                </div>

                <div className="vrb-footer">
                    <Button variant="edit" onClick={onClose} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant="edit" onClick={() => onApply(result)}>
                        {t('settings.grammar.vrbApplyRule')}
                    </Button>
                </div>

            </div>
        </div>,
        document.body
    );
};

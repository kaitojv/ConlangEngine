import React, { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';
import {
    Sparkles, X, Settings, Copy, Check, ArrowRight, Plus,
    ChevronDown, ArrowDownLeft, RefreshCw, GripVertical,
    RotateCcw, BookOpen, Layers, AlertTriangle, CheckCircle2,
    ExternalLink, Wrench
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { buildScriptConfig } from '@/utils/scriptResolver.js';
import { transliterateText } from '@/utils/transliteration.js';
import { extractCoreOrderLabel } from '@/utils/wordAssist/syntaxOrdering.js';
import { buildGrammarRuleEntry } from '@/utils/wordAssist/configResolver.js';
import './liveTranslatorPanel.css';

const ROLE_OPTIONS = [
    { code: 'S', label: 'Subject', short: 'S', badge: 'role-badge-subject' },
    { code: 'V', label: 'Verb', short: 'V', badge: 'role-badge-verb' },
    { code: 'M', label: 'Modal / Aux', short: 'M', badge: 'role-badge-modal' },
    { code: 'O', label: 'Direct Object', short: 'O', badge: 'role-badge-object' },
    { code: 'D', label: 'Indirect Object (Dative)', short: 'D', badge: 'role-badge-dative' },
    { code: 'J', label: 'Adjective / Modifier', short: 'J', badge: 'role-badge-modifier' },
    { code: 'R', label: 'Adverb', short: 'R', badge: 'role-badge-modifier' },
    { code: 'P', label: 'Adposition (Prep/Post)', short: 'P', badge: 'role-badge-adposition' },
    { code: 'L', label: 'Locative / PP Object', short: 'L', badge: 'role-badge-adposition' },
    { code: 'G', label: 'Genitive / Possessive', short: 'G', badge: 'role-badge-modifier' },
    { code: 'N', label: 'Negation', short: 'N', badge: 'role-badge-negation' },
    { code: 'A', label: 'Article / Determiner', short: 'A', badge: 'role-badge-article' },
    { code: 'T', label: 'Time Adjunct', short: 'T', badge: 'role-badge-modifier' },
    { code: 'Q', label: 'Question Word', short: 'Q', badge: 'role-badge-conjunction' },
    { code: 'C', label: 'Subordinator / Linker', short: 'C', badge: 'role-badge-conjunction' },
    { code: 'K', label: 'Conjunction', short: 'K', badge: 'role-badge-conjunction' }
];

const ROLE_META_MAP = ROLE_OPTIONS.reduce((acc, item) => {
    acc[item.code] = item;
    return acc;
}, {});

function roleToWordClass(role) {
    switch (role) {
        case 'V': return 'Verb';
        case 'M': return 'Auxiliary';
        case 'J': return 'Adjective';
        case 'R': return 'Adverb';
        case 'P': return 'Preposition';
        case 'N': return 'Particle';
        case 'A': return 'Article';
        case 'C':
        case 'K': return 'Conjunction';
        case 'S':
        case 'O':
        case 'D':
        case 'L':
        default:
            return 'Noun';
    }
}

export default function LiveTranslatorPanel({
    analyzer,
    initialSourceText = '',
    onInsert,
    onClose,
    onOpenSettings,
    onOpenAddWord,
    syntaxOrder = 'SVO',
    transliterate = (s) => s,
    lexicon = [],
    config = null,
    updateConfig = null,
    grammarRules = null,
    scriptSystems = [],
    activeScriptId = 'default'
}) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const storeUpdateConfig = useConfigStore((s) => s.updateConfig);
    const storeGrammarRules = useConfigStore((s) => s.grammarRules);
    const storeWaConfig = useConfigStore((s) => s.wordAssistConfig);
    const effectiveUpdateConfig = updateConfig || storeUpdateConfig;
    const effectiveGrammarRules = Array.isArray(grammarRules)
        ? grammarRules
        : (Array.isArray(config?.grammarRules) ? config.grammarRules : (storeGrammarRules || []));
    const effectiveWaConfig = config?.wordAssistConfig || storeWaConfig || {};

    const [sourceText, setSourceText] = useState(initialSourceText || '');
    const [showReadiness, setShowReadiness] = useState(false);
    const [inlineRuleDiagId, setInlineRuleDiagId] = useState(null);
    const [inlineRuleDraft, setInlineRuleDraft] = useState({
        name: '', affix: '', gloss: '', appliesTo: 'all', standalone: false
    });
    const [manualRoles, setManualRoles] = useState({});
    const [wordChoices, setWordChoices] = useState({});
    const [customTokenOrder, setCustomTokenOrder] = useState(null);
    const [activeReadingIdx, setActiveReadingIdx] = useState(0);
    const [openRoleMenuKey, setOpenRoleMenuKey] = useState(null);
    const [openCandidateKey, setOpenCandidateKey] = useState(null);
    const [draggedIdx, setDraggedIdx] = useState(null);
    const [copiedType, setCopiedType] = useState(null);
    const [showGloss, setShowGloss] = useState(true);
    const [previewScriptId, setPreviewScriptId] = useState(activeScriptId || 'default');

    const lastAutoSourceRef = useRef(initialSourceText || '');
    const panelRef = useRef(null);

    useEffect(() => {
        setPreviewScriptId(activeScriptId || 'default');
    }, [activeScriptId]);

    // Sync with editor cursor sentence unless user typed custom scratch text inside panel
    useEffect(() => {
        const incoming = initialSourceText || '';
        if (incoming && (sourceText === lastAutoSourceRef.current || !sourceText.trim())) {
            setSourceText(incoming);
            lastAutoSourceRef.current = incoming;
            setCustomTokenOrder(null);
            setActiveReadingIdx(0);
        }
    }, [initialSourceText, sourceText]);

    // Close popovers on outside click
    useEffect(() => {
        const handleOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setOpenRoleMenuKey(null);
                setOpenCandidateKey(null);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    const deferredSourceText = useDeferredValue(sourceText);

    const translationSuggestions = useMemo(() => {
        const clean = deferredSourceText.trim();
        if (!clean || !analyzer?.computePhraseSuggestion) return [];
        try {
            const res = analyzer.computePhraseSuggestion(
                clean,
                clean.length,
                syntaxOrder,
                manualRoles,
                undefined,
                wordChoices
            );
            return Array.isArray(res) ? res : [];
        } catch (e) {
            console.error('LiveTranslator error:', e);
            return [];
        }
    }, [deferredSourceText, analyzer, syntaxOrder, manualRoles, wordChoices]);

    const safeReadingIdx = activeReadingIdx < translationSuggestions.length ? activeReadingIdx : 0;
    const baseSuggestion = translationSuggestions[safeReadingIdx] || null;

    // Apply optional React-state custom drag order on top of analyzer's reordered tokens
    const orderedTokens = useMemo(() => {
        const list = baseSuggestion?.reordered || [];
        if (!customTokenOrder || customTokenOrder.length === 0) return list;

        const keyMap = new Map();
        list.forEach((tok, idx) => {
            const k = tok?.occKey || `idx:${idx}`;
            keyMap.set(k, tok);
        });

        const arranged = [];
        const used = new Set();
        customTokenOrder.forEach((k) => {
            if (keyMap.has(k) && !used.has(k)) {
                arranged.push(keyMap.get(k));
                used.add(k);
            }
        });
        list.forEach((tok, idx) => {
            const k = tok?.occKey || `idx:${idx}`;
            if (!used.has(k)) {
                arranged.push(tok);
            }
        });
        return arranged;
    }, [baseSuggestion, customTokenOrder]);

    const { finalRomanized, finalDisplay, interlinearTokens } = useMemo(() => {
        if (!baseSuggestion) {
            return { finalRomanized: '', finalDisplay: '', interlinearTokens: [] };
        }

        const buildRomanized = () => {
            if (!customTokenOrder || customTokenOrder.length === 0) {
                return baseSuggestion.romanized || '';
            }
            let s = '';
            orderedTokens.forEach((w) => {
                if (!w || w.swallowed || w.encodedInVerb) return;
                const wordStr = w.conlang;
                if (!wordStr) return;
                if (w.isPunct) s = s.trim() + wordStr + ' ';
                else s += wordStr + ' ';
            });
            return s.trim();
        };

        const rom = buildRomanized();

        let disp = '';
        if (config && (scriptSystems?.length > 0 || previewScriptId !== 'default')) {
            const scriptCfg = buildScriptConfig(config, previewScriptId);
            disp = transliterateText(rom, scriptCfg, lexicon);
        } else {
            disp = customTokenOrder ? transliterate(rom, lexicon) : (baseSuggestion.display || transliterate(rom, lexicon));
        }

        const glossItems = orderedTokens
            .filter(w => w && !w.swallowed && !w.encodedInVerb && !w.isPunct)
            .map(w => ({
                conlang: w.conlang,
                orig: w.original.replace(/[.,!?()[\]{}"`:;]/g, ''),
                role: w.role || '?',
                found: w.found
            }));

        return {
            finalRomanized: rom,
            finalDisplay: disp,
            interlinearTokens: glossItems
        };
    }, [baseSuggestion, orderedTokens, customTokenOrder, config, scriptSystems, previewScriptId, lexicon, transliterate]);

    const shortOrderLabel = useMemo(() => {
        const raw = baseSuggestion?.effectiveSyntaxOrder || syntaxOrder;
        return extractCoreOrderLabel(raw);
    }, [baseSuggestion, syntaxOrder]);

    const readiness = useMemo(
        () => (analyzer?.auditReadiness ? analyzer.auditReadiness() : null),
        [analyzer]
    );

    const alignmentBadge = useMemo(() => {
        const align = baseSuggestion?.effectiveSettings?.alignment || effectiveWaConfig?.alignment || 'accusative';
        if (align === 'ergative') return 'ERG';
        if (align === 'neutral') return 'NEUT';
        return 'ACC';
    }, [baseSuggestion, effectiveWaConfig]);

    const handleOpenDiagnosticTarget = (diag) => {
        if (diag?.targetRoute) {
            navigate(diag.targetRoute);
            return;
        }
        const tab = diag?.targetTab || 'grammar';
        const sub = tab === 'grammar'
            ? (diag?.kind === 'setting' ? '&sub=syntax' : '&sub=morphology')
            : '';
        navigate(`/settings?tab=${tab}${sub}`);
    };

    const handleStartInlineRule = (diag) => {
        if (inlineRuleDiagId === diag.id) {
            setInlineRuleDiagId(null);
            return;
        }
        const sug = diag.suggestedRule || {};
        setInlineRuleDiagId(diag.id);
        setInlineRuleDraft({
            name: sug.name || diag.slotId || 'Rule',
            affix: sug.affix || `-${(sug.gloss || 'mk').toLowerCase()}`,
            gloss: sug.gloss || '',
            appliesTo: (sug.targetPOS || 'all').toLowerCase(),
            standalone: Boolean(sug.standalone)
        });
    };

    const handleSaveInlineRule = (diag) => {
        if (!inlineRuleDraft.name.trim() || !inlineRuleDraft.affix.trim()) {
            toast.error('Enter both rule name and affix / marker.');
            return;
        }
        const newRule = buildGrammarRuleEntry(diag.slotId, inlineRuleDraft);
        const nextRules = [...effectiveGrammarRules, newRule];
        const nextBindings = { ...(effectiveWaConfig.ruleBindings || {}) };
        if (diag.slotId) nextBindings[diag.slotId] = newRule.id;
        effectiveUpdateConfig({
            grammarRules: nextRules,
            wordAssistConfig: {
                ...effectiveWaConfig,
                ruleBindings: nextBindings
            }
        });
        setInlineRuleDiagId(null);
        toast.success(`Added rule "${newRule.name}" (${newRule.affix})`);
    };

    const handleEnableZeroCopula = () => {
        effectiveUpdateConfig({
            wordAssistConfig: {
                ...effectiveWaConfig,
                copulaBehavior: 'zero_copula'
            }
        });
        toast.success('Zero Copula enabled in Grammar Settings.');
    };

    const hasCustomOverrides = Object.keys(manualRoles).length > 0 || Object.keys(wordChoices).length > 0 || !!customTokenOrder;

    const handleResetCustomizations = () => {
        setManualRoles({});
        setWordChoices({});
        setCustomTokenOrder(null);
        setOpenRoleMenuKey(null);
        setOpenCandidateKey(null);
    };

    const handleRoleSelect = (occKey, newRole) => {
        setManualRoles(prev => ({ ...prev, [occKey]: newRole }));
        setOpenRoleMenuKey(null);
    };

    const handleCandidateSelect = (occKey, candidateId) => {
        setWordChoices(prev => ({ ...prev, [occKey]: candidateId }));
        setOpenCandidateKey(null);
    };

    const handleDragStart = (idx) => {
        setDraggedIdx(idx);
    };

    const handleDrop = (targetIdx) => {
        if (draggedIdx === null || draggedIdx === targetIdx) {
            setDraggedIdx(null);
            return;
        }
        const currentKeys = orderedTokens.map((tok, i) => tok?.occKey || `idx:${i}`);
        const [moved] = currentKeys.splice(draggedIdx, 1);
        currentKeys.splice(targetIdx, 0, moved);
        setCustomTokenOrder(currentKeys);
        setDraggedIdx(null);
    };

    const handleCopy = (textToCopy, type) => {
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy);
        setCopiedType(type);
        setTimeout(() => setCopiedType(null), 1600);
    };

    const handleSyncFromEditor = () => {
        setSourceText(initialSourceText || '');
        lastAutoSourceRef.current = initialSourceText || '';
        setCustomTokenOrder(null);
    };

    const glossText = interlinearTokens.map(g => `${g.conlang} (${g.role}:${g.orig})`).join(' · ');

    const activeScript = useMemo(() => {
        return (scriptSystems || []).find(s => s.id === previewScriptId) || null;
    }, [scriptSystems, previewScriptId]);

    const hasCustomScriptFont = Boolean(
        activeScript?.customFontFamily ||
        activeScript?.fontData ||
        config?.customFont ||
        (scriptSystems && scriptSystems.length > 0)
    );

    return (
        <div className="live-translator-panel" ref={panelRef}>
            {/* Sticky Header */}
            <div className="live-translator-header">
                <div className="live-translator-title-group">
                    <h3 className="live-translator-title">
                        <Sparkles size={15} style={{ color: 'var(--acc)' }} />
                        Word Assist
                    </h3>
                    <span
                        className="live-translator-order-badge"
                        title={`Active word order: ${baseSuggestion?.effectiveSyntaxOrder || syntaxOrder} (${alignmentBadge})`}
                    >
                        {shortOrderLabel} · {alignmentBadge}
                    </span>
                    {readiness && (
                        <button
                            type="button"
                            className={`ltp-readiness-pill ${readiness.scorePercent >= 75 ? 'good' : readiness.scorePercent >= 40 ? 'mid' : 'low'}`}
                            onClick={() => setShowReadiness(v => !v)}
                            title={`Conlang grammar & lexicon readiness: ${readiness.readyCount}/${readiness.totalCount} ready (click to inspect)`}
                        >
                            {readiness.scorePercent >= 75 ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                            {readiness.scorePercent}%
                        </button>
                    )}
                </div>
                <div className="live-translator-actions-top">
                    {hasCustomOverrides && (
                        <button
                            type="button"
                            className="live-translator-icon-btn"
                            onClick={handleResetCustomizations}
                            title="Reset manual roles, word choices & order"
                        >
                            <RotateCcw size={13} />
                        </button>
                    )}
                    <button
                        type="button"
                        className="live-translator-icon-btn"
                        onClick={onOpenSettings}
                        title={t('wiki.corpus.wordAssistSettings') || 'Word Assist Settings'}
                    >
                        <Settings size={14} />
                    </button>
                    <button
                        type="button"
                        className="live-translator-icon-btn"
                        onClick={onClose}
                        title="Close"
                    >
                        <X size={15} />
                    </button>
                </div>
            </div>

            <div className="live-translator-body">
                {showReadiness && readiness && (
                    <div className="ltp-readiness-card">
                        <div className="ltp-readiness-header">
                            <span>Language Readiness ({readiness.readyCount}/{readiness.totalCount})</span>
                            <button
                                type="button"
                                className="ltp-inline-link-btn"
                                onClick={onOpenSettings}
                            >
                                Word Assist Settings
                            </button>
                        </div>
                        <div className="ltp-readiness-list">
                            {readiness.checks.map((chk) => (
                                <div key={chk.id} className={`ltp-readiness-row ${chk.status === 'ok' ? 'ok' : 'missing'}`}>
                                    <span className="ltp-readiness-icon">
                                        {chk.status === 'ok' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                                    </span>
                                    <div className="ltp-readiness-copy">
                                        <strong>{chk.label}</strong>
                                        <span>{chk.detail}</span>
                                    </div>
                                    {chk.status !== 'ok' && (chk.targetTab || chk.targetRoute) && (
                                        <button
                                            type="button"
                                            className="ltp-diag-btn"
                                            onClick={() => handleOpenDiagnosticTarget(chk)}
                                        >
                                            <ExternalLink size={11} /> Fix
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 1. English Source Input */}
                <div className="live-translator-source-box">
                    <div className="live-translator-label-row">
                        <span>English Input</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {initialSourceText && initialSourceText.trim() !== sourceText.trim() && (
                                <button
                                    type="button"
                                    className="live-translator-sync-btn"
                                    onClick={handleSyncFromEditor}
                                    title="Pull current line/selection from editor"
                                >
                                    <RefreshCw size={11} /> Sync
                                </button>
                            )}
                            {sourceText && (
                                <button
                                    type="button"
                                    className="live-translator-sync-btn"
                                    onClick={() => {
                                        setSourceText('');
                                        setManualRoles({});
                                        setWordChoices({});
                                        setCustomTokenOrder(null);
                                    }}
                                    style={{ color: 'var(--tx3)' }}
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>
                    <textarea
                        className="live-translator-textarea"
                        value={sourceText}
                        onChange={(e) => {
                            setSourceText(e.target.value);
                            setCustomTokenOrder(null);
                            setActiveReadingIdx(0);
                        }}
                        placeholder="Type an English sentence or clause (e.g. 'The black cat saw the dog in the house')"
                        spellCheck={false}
                    />
                </div>

                {/* 2. Reading Variants + Multi-Script Switcher + Result Card */}
                {baseSuggestion ? (
                    <div className="live-translator-target-card">
                        {/* Variant Tabs (Affix vs Free / Zero Copula / Alternate S-O) */}
                        {translationSuggestions.length > 1 && (
                            <div className="ltp-variant-tabs">
                                {translationSuggestions.map((sugg, idx) => {
                                    const shortName = (sugg.label || `Option ${idx + 1}`)
                                        .replace('TRANSLATION SUGGESTION', 'Standard')
                                        .replace('TRANSLATION ', '')
                                        .replace('ALTERNATE READING ', 'Alt ');
                                    return (
                                        <button
                                            key={sugg.key || idx}
                                            type="button"
                                            className={`ltp-variant-tab ${idx === safeReadingIdx ? 'active' : ''}`}
                                            onClick={() => {
                                                setActiveReadingIdx(idx);
                                                setCustomTokenOrder(null);
                                            }}
                                            title={sugg.label}
                                        >
                                            {shortName}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Script Selector if multiple scripts configured */}
                        {scriptSystems && scriptSystems.length > 1 && (
                            <div className="ltp-script-bar">
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: 'var(--tx3)' }}>
                                    <Layers size={11} /> Script:
                                </span>
                                <select
                                    className="ltp-script-select"
                                    value={previewScriptId}
                                    onChange={(e) => setPreviewScriptId(e.target.value)}
                                >
                                    {scriptSystems.map(sys => (
                                        <option key={sys.id} value={sys.id}>{sys.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Output Script + Romanized */}
                        <div
                            className={`live-translator-target-script ${hasCustomScriptFont ? 'custom-font-text notranslate' : ''}`}
                            data-script-id={previewScriptId}
                            style={activeScript?.writingDirection === 'rtl' ? { direction: 'rtl', textAlign: 'right' } : undefined}
                        >
                            {finalDisplay || finalRomanized || '—'}
                        </div>

                        {finalRomanized && finalRomanized !== finalDisplay && (
                            <div className="live-translator-target-romanized">
                                {finalRomanized}
                            </div>
                        )}

                        {/* Optional Interlinear Gloss Preview */}
                        {showGloss && interlinearTokens.length > 0 && (
                            <div className="ltp-gloss-line">
                                {interlinearTokens.map((g, i) => (
                                    <span key={i} className={`ltp-gloss-item ${g.found ? '' : 'missing'}`}>
                                        <strong>{g.conlang}</strong>
                                        <span>{g.role}:{g.orig}</span>
                                    </span>
                                ))}
                            </div>
                        )}

                        {baseSuggestion?.appliedGrammar?.length > 0 && (
                            <div className="ltp-applied-rules">
                                {baseSuggestion.appliedGrammar.map((ruleName, rIdx) => (
                                    <span key={`${ruleName}-${rIdx}`} className="ltp-applied-pill">
                                        {ruleName}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="live-translator-target-meta">
                            <div className="live-translator-target-copy-group">
                                <button
                                    type="button"
                                    className="live-translator-pill-btn"
                                    onClick={() => handleCopy(finalDisplay || finalRomanized, 'script')}
                                    title="Copy script text"
                                >
                                    {copiedType === 'script' ? <Check size={11} /> : <Copy size={11} />} Script
                                </button>
                                <button
                                    type="button"
                                    className="live-translator-pill-btn"
                                    onClick={() => handleCopy(finalRomanized, 'rom')}
                                    title="Copy romanized text"
                                >
                                    {copiedType === 'rom' ? <Check size={11} /> : <Copy size={11} />} Rom
                                </button>
                                <button
                                    type="button"
                                    className={`live-translator-pill-btn ${showGloss ? 'active' : ''}`}
                                    onClick={() => setShowGloss(v => !v)}
                                    title="Toggle inline gloss"
                                >
                                    <BookOpen size={11} /> Gloss
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="ltp-empty-state">
                        Type an English phrase above or place your cursor on a sentence in the document to inspect lexicon matches, POS roles, and word order.
                    </div>
                )}

                {/* 2.5 Actionable Missing Rules & Vocabulary Diagnostics */}
                {baseSuggestion?.diagnostics?.length > 0 && (
                    <div className="ltp-diagnostics-card">
                        <div className="ltp-diagnostics-header">
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <AlertTriangle size={13} /> Missing Rules &amp; Vocabulary ({baseSuggestion.diagnostics.length})
                            </span>
                        </div>
                        <div className="ltp-diagnostics-list">
                            {baseSuggestion.diagnostics.map((diag) => (
                                <div key={diag.id} className={`ltp-diag-item kind-${diag.kind || 'rule'}`}>
                                    <div className="ltp-diag-main">
                                        <div className="ltp-diag-copy">
                                            <strong>{diag.title}</strong>
                                            <span>{diag.description}</span>
                                        </div>
                                        <div className="ltp-diag-actions">
                                            {(diag.kind === 'word' || diag.kind === 'pronoun') && onOpenAddWord && (diag.lemma || diag.original) && (
                                                <button
                                                    type="button"
                                                    className="ltp-diag-btn primary"
                                                    onClick={() => onOpenAddWord({
                                                        word: '',
                                                        translation: (diag.lemma || diag.original || '').toLowerCase(),
                                                        wordClass: diag.suggestedPos || (diag.kind === 'pronoun' ? 'pronoun' : 'noun')
                                                    })}
                                                >
                                                    <Plus size={11} /> Add {diag.suggestedPos || (diag.kind === 'pronoun' ? 'Pronoun' : 'Word')}
                                                </button>
                                            )}
                                            {diag.kind === 'rule' && (
                                                <button
                                                    type="button"
                                                    className="ltp-diag-btn primary"
                                                    onClick={() => handleStartInlineRule(diag)}
                                                >
                                                    <Wrench size={11} /> Create Rule
                                                </button>
                                            )}
                                            {diag.id === 'missing_copula_or_zero' && (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="ltp-diag-btn primary"
                                                        onClick={handleEnableZeroCopula}
                                                    >
                                                        Enable Zero Copula
                                                    </button>
                                                    {onOpenAddWord && (
                                                        <button
                                                            type="button"
                                                            className="ltp-diag-btn"
                                                            onClick={() => onOpenAddWord({
                                                                word: '',
                                                                translation: 'be',
                                                                wordClass: 'verb'
                                                            })}
                                                        >
                                                            <Plus size={11} /> Add &quot;be&quot;
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            {diag.id !== 'missing_copula_or_zero' && (diag.targetTab || diag.targetRoute) && (
                                                <button
                                                    type="button"
                                                    className="ltp-diag-btn"
                                                    onClick={() => handleOpenDiagnosticTarget(diag)}
                                                    title="Open corresponding Settings tab"
                                                >
                                                    <ExternalLink size={11} /> {diag.kind === 'pronoun' ? 'Pronouns' : 'Settings'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {inlineRuleDiagId === diag.id && (
                                        <div className="ltp-inline-rule-form">
                                            <input
                                                type="text"
                                                className="fi"
                                                value={inlineRuleDraft.name}
                                                onChange={(e) => setInlineRuleDraft(d => ({ ...d, name: e.target.value }))}
                                                placeholder="Rule name"
                                            />
                                            <input
                                                type="text"
                                                className="fi"
                                                value={inlineRuleDraft.affix}
                                                onChange={(e) => setInlineRuleDraft(d => ({ ...d, affix: e.target.value }))}
                                                placeholder="Affix (e.g. -ka) or particle"
                                            />
                                            <label className="ltp-inline-rule-check">
                                                <input
                                                    type="checkbox"
                                                    checked={inlineRuleDraft.standalone}
                                                    onChange={(e) => setInlineRuleDraft(d => ({ ...d, standalone: e.target.checked }))}
                                                />
                                                Standalone
                                            </label>
                                            <button
                                                type="button"
                                                className="ltp-diag-btn primary"
                                                onClick={() => handleSaveInlineRule(diag)}
                                            >
                                                Save
                                            </button>
                                            <button
                                                type="button"
                                                className="ltp-diag-btn"
                                                onClick={() => setInlineRuleDiagId(null)}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. Interactive Token-by-Token Syntax & Lexicon Chips */}
                {orderedTokens.length > 0 && (
                    <div className="live-translator-tokens-section">
                        <div className="live-translator-tokens-header">
                            <span>Word & Syntax Breakdown ({orderedTokens.filter(t => !t.isPunct).length})</span>
                            {customTokenOrder && (
                                <button
                                    type="button"
                                    className="live-translator-sync-btn"
                                    onClick={() => setCustomTokenOrder(null)}
                                >
                                    <RotateCcw size={10} /> Reset Order
                                </button>
                            )}
                        </div>

                        <div className="live-translator-chips-grid">
                            {orderedTokens.map((tok, idx) => {
                                if (!tok) return null;
                                if (tok.isPunct) {
                                    return (
                                        <div key={`p-${idx}`} className="ltp-punct-divider">
                                            <span>{tok.original}</span>
                                        </div>
                                    );
                                }

                                const occKey = tok.occKey || `idx:${idx}`;
                                const roleMeta = ROLE_META_MAP[tok.role] || { short: tok.role || '?', label: tok.role || 'Other', badge: '' };
                                const cleanOrig = (tok.original || '').replace(/[.,!?()[\]{}"`:;]/g, '');
                                const isManualRole = Boolean(manualRoles[occKey]);
                                const isManualWord = Boolean(wordChoices[occKey]);
                                const candidates = tok.candidates || [];
                                const hasMultipleChoices = candidates.length > 1;
                                const isSwallowed = Boolean(tok.swallowed || tok.encodedInVerb);

                                return (
                                    <div
                                        key={`${occKey}-${idx}`}
                                        className={`live-translator-chip ${!tok.found && !isSwallowed ? 'missing-word' : ''} ${isSwallowed ? 'is-swallowed' : ''} ${tok.isClauseConjunction ? 'is-conjunction' : ''} ${draggedIdx === idx ? 'is-dragging' : ''}`}
                                        draggable
                                        onDragStart={() => handleDragStart(idx)}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={() => handleDrop(idx)}
                                        onDragEnd={() => setDraggedIdx(null)}
                                        style={{ position: 'relative' }}
                                    >
                                        <div className="live-translator-chip-top">
                                            <div className="live-translator-chip-words">
                                                <GripVertical size={12} className="ltp-drag-handle" />
                                                <span className="live-translator-chip-orig" title={tok.original}>
                                                    {tok.original}
                                                </span>
                                                <ArrowRight size={11} className="live-translator-chip-arrow" />
                                                {candidates.length > 0 ? (
                                                    <button
                                                        type="button"
                                                        className={`ltp-word-choice-trigger ${hasMultipleChoices ? 'has-alt' : ''} ${isManualWord ? 'manual' : ''}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenRoleMenuKey(null);
                                                            setOpenCandidateKey(openCandidateKey === occKey ? null : occKey);
                                                        }}
                                                        title={hasMultipleChoices ? `${candidates.length} lexicon matches — click to switch word` : 'View lexicon match details'}
                                                    >
                                                        <span className="live-translator-chip-conlang">
                                                            {isSwallowed ? `(${tok.original})` : (tok.conlang || `[${cleanOrig}]`)}
                                                        </span>
                                                        {hasMultipleChoices && (
                                                            <span className="ltp-syn-count">
                                                                {candidates.length} <ChevronDown size={10} />
                                                            </span>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <span className="live-translator-chip-conlang">
                                                        {isSwallowed
                                                            ? (tok.absorbedInCase ? '→ case affix' : tok.encodedInVerb ? '→ in verb' : 'omitted')
                                                            : (tok.conlang || `[${cleanOrig}]`)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Role Badge Button */}
                                            <button
                                                type="button"
                                                className={`live-translator-role-tag ${roleMeta.badge} ${isManualRole ? 'is-manual' : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenCandidateKey(null);
                                                    setOpenRoleMenuKey(openRoleMenuKey === occKey ? null : occKey);
                                                }}
                                                title={`${roleMeta.label} (${roleMeta.short}) — click to override POS / Role`}
                                            >
                                                {roleMeta.short}
                                                <ChevronDown size={10} />
                                            </button>
                                        </div>

                                        {/* Bottom Tags Row */}
                                        <div className="live-translator-chip-bottom">
                                            {tok.entry?.wordClass && (
                                                <span className="ltp-pos-tag">{tok.entry.wordClass}</span>
                                            )}
                                            {tok.entry?.translation && (
                                                <span className="ltp-gloss-chip" title={tok.entry.translation}>
                                                    “{tok.entry.shortTranslation || tok.entry.translation}”
                                                </span>
                                            )}
                                            {tok.inflected && tok.ruleSource && (
                                                <span className="live-translator-case-tag" title={tok.ruleSource}>
                                                    +{tok.ruleName || tok.ruleSource.split(',')[0].replace(/^Grammar Rule:\s*/i, '').replace(/^Word Assist:\s*/i, '')}
                                                </span>
                                            )}
                                            {tok.absorbedInCase && (
                                                <span className="ltp-meta-note">→ absorbed as {tok.ruleName || 'case'}</span>
                                            )}
                                            {tok.encodedInVerb && (
                                                <span className="ltp-meta-note">→ encoded on verb (pro-drop)</span>
                                            )}
                                            {!tok.found && !isSwallowed && cleanOrig && onOpenAddWord && (
                                                <button
                                                    type="button"
                                                    className="live-translator-quick-add-btn"
                                                    onClick={() => onOpenAddWord({
                                                        word: '',
                                                        translation: cleanOrig.toLowerCase(),
                                                        wordClass: roleToWordClass(tok.role)
                                                    })}
                                                >
                                                    <Plus size={10} /> Add {roleToWordClass(tok.role)}
                                                </button>
                                            )}
                                        </div>

                                        {/* Candidate / Synonym Popover */}
                                        {openCandidateKey === occKey && candidates.length > 0 && (
                                            <div className="ltp-candidate-popover" onClick={(e) => e.stopPropagation()}>
                                                <div className="ltp-candidate-header">
                                                    <span>Lexicon Candidates for “{cleanOrig}”</span>
                                                    {wordChoices[occKey] && (
                                                        <button
                                                            type="button"
                                                            className="ltp-cand-reset"
                                                            onClick={() => {
                                                                setWordChoices(prev => {
                                                                    const copy = { ...prev };
                                                                    delete copy[occKey];
                                                                    return copy;
                                                                });
                                                                setOpenCandidateKey(null);
                                                            }}
                                                        >
                                                            Auto
                                                        </button>
                                                    )}
                                                </div>
                                                {candidates.map((cand) => (
                                                    <button
                                                        key={cand.id}
                                                        type="button"
                                                        className={`ltp-candidate-option ${cand.isSelected ? 'selected' : ''}`}
                                                        onClick={() => handleCandidateSelect(occKey, cand.id)}
                                                    >
                                                        <div className="ltp-cand-main">
                                                            <strong>{cand.conlang || cand.word}</strong>
                                                            {cand.wordClass && <span className="ltp-cand-wc">{cand.wordClass}</span>}
                                                        </div>
                                                        <div className="ltp-cand-sub">
                                                            {cand.shortTranslation || cand.translation || cand.definition}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Grammatical Role Override Menu */}
                                        {openRoleMenuKey === occKey && (
                                            <div className="live-translator-role-menu" style={{ right: 8, top: 34 }} onClick={(e) => e.stopPropagation()}>
                                                {ROLE_OPTIONS.map((opt) => (
                                                    <button
                                                        key={opt.code}
                                                        type="button"
                                                        className="live-translator-role-option"
                                                        onClick={() => handleRoleSelect(occKey, opt.code)}
                                                        style={tok.role === opt.code ? { color: 'var(--acc)', fontWeight: 700 } : undefined}
                                                    >
                                                        <span>{opt.label}</span>
                                                        <span style={{ opacity: 0.7 }}>{opt.short}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 4. Bottom Insert Actions */}
                {onInsert && (finalRomanized || finalDisplay) && (
                    <div className="live-translator-insert-footer">
                        <button
                            type="button"
                            className="live-translator-insert-btn primary"
                            onClick={() => onInsert(finalDisplay || finalRomanized)}
                        >
                            <ArrowDownLeft size={14} /> Insert Conlang Text
                        </button>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {finalRomanized && finalRomanized !== finalDisplay && (
                                <button
                                    type="button"
                                    className="live-translator-insert-btn secondary"
                                    style={{ flex: 1 }}
                                    onClick={() => onInsert(finalRomanized)}
                                >
                                    Romanized
                                </button>
                            )}
                            <button
                                type="button"
                                className="live-translator-insert-btn secondary"
                                style={{ flex: 1 }}
                                onClick={() => onInsert(`${finalDisplay || finalRomanized} (${sourceText.trim()})`)}
                            >
                                Bilingual
                            </button>
                            {glossText && (
                                <button
                                    type="button"
                                    className="live-translator-insert-btn secondary"
                                    style={{ flex: 1 }}
                                    onClick={() => onInsert(glossText)}
                                >
                                    Gloss
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

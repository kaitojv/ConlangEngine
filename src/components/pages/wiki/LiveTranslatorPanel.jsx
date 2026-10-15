import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Languages,
    Copy,
    Check,
    X,
    Settings,
    Plus,
    CornerDownLeft,
    Layers,
    Sparkles,
    Volume2,
    RefreshCw,
    Sliders,
    ChevronDown,
    AlignLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import './liveTranslatorPanel.css';

const ROLES_LIST = [
    { code: 'S', label: 'Subject', className: 'role-badge-subject' },
    { code: 'V', label: 'Verb', className: 'role-badge-verb' },
    { code: 'M', label: 'Modal / Auxiliary', className: 'role-badge-modal' },
    { code: 'O', label: 'Direct Object', className: 'role-badge-object' },
    { code: 'D', label: 'Indirect Object (Dative)', className: 'role-badge-dative' },
    { code: 'N', label: 'Negation', className: 'role-badge-negation' },
    { code: 'A', label: 'Article', className: 'role-badge-article' },
    { code: 'J', label: 'Adjective', className: 'role-badge-modifier' },
    { code: 'R', label: 'Adverb', className: 'role-badge-modifier' },
    { code: 'P', label: 'Preposition', className: 'role-badge-adposition' },
    { code: 'L', label: 'Locative / Place', className: 'role-badge-adposition' },
    { code: 'G', label: 'Genitive', className: 'role-badge-modifier' },
    { code: 'T', label: 'Time', className: 'role-badge-modifier' },
    { code: 'Q', label: 'Question Word', className: 'role-badge-modifier' },
    { code: 'C', label: 'Conjunction / Particle', className: 'role-badge-conjunction' }
];

export default function LiveTranslatorPanel({
    analyzer,
    initialSourceText = '',
    onInsert,
    onClose,
    onOpenSettings,
    onOpenAddWord,
    syntaxOrder = 'SVO',
    transliterate = (s) => s,
    lexicon = []
}) {
    const [sourceText, setSourceText] = useState(initialSourceText || '');
    const [manualRoles, setManualRoles] = useState({});
    const [activeRoleDropdown, setActiveRoleDropdown] = useState(null); // chipIdx
    const [copiedTarget, setCopiedTarget] = useState(null); // 'conlang' | 'rom'
    const [draggedChipIdx, setDraggedChipIdx] = useState(null);

    const textareaRef = useRef(null);

    // Sync when initialSourceText updates from cursor line in document (unless focused on panel input)
    useEffect(() => {
        if (initialSourceText && document.activeElement !== textareaRef.current) {
            setSourceText(initialSourceText);
        }
    }, [initialSourceText]);

    // Live calculation of suggestions
    const translationSuggestions = useMemo(() => {
        const clean = sourceText.trim();
        if (!clean || !analyzer?.computePhraseSuggestion) return [];
        try {
            const res = analyzer.computePhraseSuggestion(
                clean,
                clean.length,
                syntaxOrder,
                manualRoles
            );
            return Array.isArray(res) ? res : [];
        } catch (e) {
            console.error('LiveTranslator error:', e);
            return [];
        }
    }, [sourceText, analyzer, syntaxOrder, manualRoles]);

    const primarySuggestion = translationSuggestions[0] || null;

    // Word breakdown list
    const tokenList = useMemo(() => {
        if (!primarySuggestion) return [];
        return primarySuggestion.reordered || primarySuggestion.wordBreakdown || [];
    }, [primarySuggestion]);

    // Clean word order badge display
    const displayOrderBadge = useMemo(() => {
        if (!syntaxOrder) return 'SVO';
        if (syntaxOrder.length <= 4) return syntaxOrder;
        const core = [];
        for (const c of syntaxOrder) {
            if (['S', 'V', 'O'].includes(c) && !core.includes(c)) {
                core.push(c);
            }
        }
        return core.length === 3 ? core.join('') : syntaxOrder.slice(0, 4);
    }, [syntaxOrder]);

    // Role badge color helper
    const getRoleInfo = (roleCode) => {
        const found = ROLES_LIST.find((r) => r.code === roleCode);
        return found || { code: roleCode || '?', label: roleCode || 'Word', className: 'role-badge-modifier' };
    };

    // Copy to clipboard helper
    const handleCopy = (text, type) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedTarget(type);
        toast.success(type === 'conlang' ? 'Conlang text copied' : 'Romanization copied');
        setTimeout(() => setCopiedTarget(null), 2000);
    };

    // Role override click handler
    const handleSelectRole = (chipIdx, originalWord, newRole) => {
        const wordKey = (originalWord || '').toLowerCase();
        setManualRoles((prev) => ({ ...prev, [wordKey]: newRole }));
        setActiveRoleDropdown(null);
    };

    // Drag-and-drop reordering inside token list
    const handleDrop = (targetIdx) => {
        if (draggedChipIdx === null || draggedChipIdx === targetIdx) return;
        if (!primarySuggestion?.reordered) return;

        const newReordered = [...primarySuggestion.reordered];
        const [moved] = newReordered.splice(draggedChipIdx, 1);
        newReordered.splice(targetIdx, 0, moved);

        primarySuggestion.reordered = newReordered;
        primarySuggestion.romanized = newReordered
            .filter((w) => !w.swallowed && !w.encodedInVerb)
            .map((w) => w.conlang)
            .join(' ');
        primarySuggestion.display = transliterate(primarySuggestion.romanized, lexicon);
        setDraggedChipIdx(null);
    };

    // Insertion actions
    const handleInsert = (mode) => {
        if (!primarySuggestion) return;
        const conlangText = primarySuggestion.romanized || '';
        const enText = sourceText.trim();

        if (mode === 'conlang') {
            onInsert?.(conlangText, 'replace_selection');
        } else if (mode === 'bilingual') {
            const formatted = `${enText}\n${conlangText}\n`;
            onInsert?.(formatted, 'replace_selection');
        } else if (mode === 'gloss') {
            // Leipzig 3-line gloss format
            const line1Words = [];
            const line2Glosses = [];

            tokenList.forEach((tok) => {
                if (!tok || tok.swallowed || tok.encodedInVerb) return;
                line1Words.push(tok.conlang);
                let glossTag = tok.entry?.translation || tok.original;
                if (tok.ruleName) {
                    glossTag += `-${tok.ruleName.toUpperCase()}`;
                }
                line2Glosses.push(glossTag);
            });

            const glossBlock = `${line1Words.join('\t')}\n${line2Glosses.join('\t')}\n"${enText}"\n`;
            onInsert?.(glossBlock, 'replace_selection');
        }
    };

    return (
        <aside className="live-translator-panel" aria-label="Live Conlang Translator">
            {/* Header */}
            <div className="live-translator-header">
                <div className="live-translator-title-group">
                    <h3 className="live-translator-title">
                        <Languages size={17} color="var(--acc)" />
                        Live Translator
                    </h3>
                    <span className="live-translator-order-badge" title={`Word order: ${syntaxOrder}`}>
                        {displayOrderBadge}
                    </span>
                </div>

                <div className="live-translator-actions-top">
                    {onOpenSettings && (
                        <button
                            type="button"
                            className="live-translator-icon-btn"
                            onClick={onOpenSettings}
                            title="Grammar & Word Assist Settings"
                        >
                            <Settings size={15} />
                        </button>
                    )}
                    {onClose && (
                        <button
                            type="button"
                            className="live-translator-icon-btn"
                            onClick={onClose}
                            title="Close Translator"
                        >
                            <X size={15} />
                        </button>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="live-translator-body">
                {/* Source Input */}
                <div className="live-translator-source-box">
                    <div className="live-translator-label-row">
                        <span>Source (English)</span>
                        {manualRoles && Object.keys(manualRoles).length > 0 && (
                            <button
                                type="button"
                                className="live-translator-sync-btn"
                                onClick={() => setManualRoles({})}
                                title="Reset manual grammatical role overrides"
                            >
                                <RefreshCw size={11} /> Reset Roles
                            </button>
                        )}
                    </div>

                    <textarea
                        ref={textareaRef}
                        className="live-translator-textarea"
                        placeholder="Type an English sentence to translate..."
                        value={sourceText}
                        onChange={(e) => setSourceText(e.target.value)}
                        rows={3}
                    />
                </div>

                {/* Target Output Card */}
                {primarySuggestion ? (
                    <div className="live-translator-target-card">
                        <div className="live-translator-target-script custom-font-text notranslate">
                            {primarySuggestion.display}
                        </div>

                        <div className="live-translator-target-romanized notranslate">
                            {primarySuggestion.romanized}
                        </div>

                        <div className="live-translator-target-meta">
                            <span style={{ fontSize: '0.72rem', color: 'var(--tx3)' }}>
                                {tokenList.filter((t) => t.found || t.swallowed || t.encodedInVerb).length} / {tokenList.length} words matched
                            </span>

                            <div className="live-translator-target-copy-group">
                                <button
                                    type="button"
                                    className="live-translator-pill-btn"
                                    onClick={() => handleCopy(primarySuggestion.romanized, 'rom')}
                                    title="Copy Romanization"
                                >
                                    {copiedTarget === 'rom' ? <Check size={12} color="var(--acc)" /> : <Copy size={12} />}
                                    Romanized
                                </button>
                                <button
                                    type="button"
                                    className="live-translator-pill-btn"
                                    onClick={() => handleCopy(primarySuggestion.display, 'conlang')}
                                    title="Copy Conlang Script"
                                >
                                    {copiedTarget === 'conlang' ? <Check size={12} color="var(--acc)" /> : <Copy size={12} />}
                                    Script
                                </button>
                            </div>
                        </div>
                    </div>
                ) : sourceText.trim() ? (
                    <div style={{ padding: '14px', textAlign: 'center', color: 'var(--tx3)', fontSize: '0.82rem' }}>
                        No direct translation pattern found. Check your lexicon entries.
                    </div>
                ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--tx3)', fontSize: '0.82rem' }}>
                        <Sparkles size={22} style={{ opacity: 0.3, marginBottom: '6px' }} />
                        <div>Enter a sentence above to view real-time grammatical translation and cases.</div>
                    </div>
                )}

                {/* Tokens & Syntax Inspector */}
                {tokenList.length > 0 && (
                    <div className="live-translator-tokens-section">
                        <div className="live-translator-tokens-header">
                            <span>Syntax & Case Inspector</span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 'normal' }}>Drag cards to reorder</span>
                        </div>

                        <div className="live-translator-chips-grid">
                            {tokenList.map((token, chipIdx) => {
                                if (!token || !token.original) return null;
                                const isMissing = !token.found && !token.swallowed && !token.encodedInVerb;
                                const roleInfo = getRoleInfo(token.role);
                                const isDropdownOpen = activeRoleDropdown === chipIdx;

                                return (
                                    <div
                                        key={chipIdx}
                                        className={`live-translator-chip ${isMissing ? 'missing-word' : ''} ${
                                            token.swallowed || token.encodedInVerb ? 'is-swallowed' : ''
                                        }`}
                                        draggable
                                        onDragStart={() => setDraggedChipIdx(chipIdx)}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={() => handleDrop(chipIdx)}
                                    >
                                        <div className="live-translator-chip-top">
                                            <div className="live-translator-chip-words">
                                                <span className="live-translator-chip-orig">{token.original}</span>
                                                <span className="live-translator-chip-arrow">→</span>
                                                <span className="live-translator-chip-conlang notranslate">
                                                    {token.conlang || transliterate(token.conlangBase || `[${token.original}]`, lexicon)}
                                                </span>
                                            </div>

                                            {isMissing && onOpenAddWord && (
                                                <button
                                                    type="button"
                                                    className="live-translator-quick-add-btn"
                                                    onClick={() =>
                                                        onOpenAddWord({
                                                            word: '',
                                                            translation: token.original,
                                                            wordClass:
                                                                token.role === 'V' ? 'Verb' :
                                                                token.role === 'J' ? 'Adjective' :
                                                                token.role === 'R' ? 'Adverb' :
                                                                token.role === 'M' ? 'Verb' :
                                                                token.role === 'P' ? 'Preposition' : 'Noun'
                                                        })
                                                    }
                                                    title={`Add "${token.original}" to lexicon`}
                                                >
                                                    <Plus size={11} /> Add
                                                </button>
                                            )}
                                        </div>

                                        <div className="live-translator-chip-bottom">
                                            {/* Role Selector */}
                                            <div style={{ position: 'relative' }}>
                                                <button
                                                    type="button"
                                                    className={`live-translator-role-tag ${roleInfo.className}`}
                                                    onClick={() =>
                                                        setActiveRoleDropdown(isDropdownOpen ? null : chipIdx)
                                                    }
                                                    title="Click to override grammatical role"
                                                >
                                                    {roleInfo.label}
                                                    <ChevronDown size={10} />
                                                </button>

                                                {/* Role Popover */}
                                                {isDropdownOpen && (
                                                    <div className="live-translator-role-menu">
                                                        {ROLES_LIST.map((r) => (
                                                            <button
                                                                key={r.code}
                                                                type="button"
                                                                className="live-translator-role-option"
                                                                onClick={() =>
                                                                    handleSelectRole(chipIdx, token.original, r.code)
                                                                }
                                                            >
                                                                <span>{r.label}</span>
                                                                <span style={{ opacity: 0.6 }}>[{r.code}]</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Case / Rule Badge */}
                                            {token.ruleName && (
                                                <span
                                                    className="live-translator-case-tag"
                                                    title={token.ruleSource || 'Grammar Rule Applied'}
                                                >
                                                    {token.ruleName}
                                                </span>
                                            )}

                                            {/* POS info */}
                                            {token.entry?.wordClass && (
                                                <span style={{ opacity: 0.6, fontSize: '0.68rem' }}>
                                                    ({token.entry.wordClass})
                                                </span>
                                            )}

                                            {/* Synonym alts */}
                                            {token.matchCount > 1 && (
                                                <span
                                                    style={{ color: 'var(--acc)', fontSize: '0.65rem' }}
                                                    title={`Alternatives: ${token.alternatives?.join(', ')}`}
                                                >
                                                    {token.matchCount} syn
                                                </span>
                                            )}

                                            {token.absorbedInCase && (
                                                <span style={{ color: 'var(--tx3)', fontStyle: 'italic', fontSize: '0.65rem' }}>
                                                    (absorbed in case)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Insertion Actions */}
                {primarySuggestion && (
                    <div className="live-translator-insert-footer">
                        <button
                            type="button"
                            className="live-translator-insert-btn primary"
                            onClick={() => handleInsert('conlang')}
                        >
                            <CornerDownLeft size={14} />
                            Insert Conlang Text
                        </button>

                        <button
                            type="button"
                            className="live-translator-insert-btn secondary"
                            onClick={() => handleInsert('bilingual')}
                        >
                            <AlignLeft size={14} />
                            Insert Bilingual Pair
                        </button>

                        <button
                            type="button"
                            className="live-translator-insert-btn secondary"
                            onClick={() => handleInsert('gloss')}
                            title="Insert Leipzig 3-line interlinear gloss block"
                        >
                            <Layers size={14} />
                            Insert Interlinear Gloss Block
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}

// src/components/pages/orthography/NumeralGlyphPickerModal.jsx
import React, { useState, useMemo } from 'react';
import Modal from '../../UI/Modal/Modal.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import GlyphPreviewBadge from '../../UI/Glyph/GlyphPreviewBadge.jsx';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { findNumeralGlyphCandidates, findCharGlyph } from '../../UI/Glyph/resolveNumeralGlyphs.js';
import { Sparkles, Star, RotateCcw, Check, Type, BookA, PenTool, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import './numeralGlyphPickerModal.css';

export default function NumeralGlyphPickerModal({
    isOpen,
    onClose,
    item,
    scriptId,
    scriptConfig = {},
    lexicon = [],
    currentOverride,
    onSelectGlyph
}) {
    const [customInput, setCustomInput] = useState('');
    const [filterQuery, setFilterQuery] = useState('');
    const updateWord = useLexiconStore((state) => state.updateWord);

    const candidatesData = useMemo(() => {
        if (!item) return { lexiconCandidates: [], scriptGlyphs: [] };
        return findNumeralGlyphCandidates(item.key, item.name, item.value, {
            lexicon,
            scriptConfig,
            customGlyphs: scriptConfig.customGlyphs || {}
        });
    }, [item, lexicon, scriptConfig]);

    if (!isOpen || !item) return null;

    const { lexiconCandidates, scriptGlyphs } = candidatesData;

    // Filter lexicon candidates if the user types in the search filter
    const filteredLexiconCandidates = lexiconCandidates.filter(c => {
        if (!filterQuery.trim()) return true;
        const q = filterQuery.toLowerCase();
        return (c.entry?.word || '').toLowerCase().includes(q)
            || (c.entry?.translation || '').toLowerCase().includes(q)
            || (c.glyph || '').includes(q);
    });

    const handleApplyOverride = (glyph) => {
        if (!glyph) return;
        onSelectGlyph(glyph);
        toast.success(`Set "${glyph}" as main glyph for ${item.label || item.name}!`);
        onClose();
    };

    const handleResetToAutomatic = () => {
        onSelectGlyph(null);
        toast.success(`Reset ${item.label || item.name} to automatic resolution.`);
        onClose();
    };

    const handleTogglePrimaryWord = (entry) => {
        if (!entry) return;
        const wordKey = (entry.word || '').replace(/\*/g, '').toLowerCase().trim();
        const newStatus = !entry.isPrimary;

        lexicon.forEach(item => {
            const itemKey = (item.word || '').replace(/\*/g, '').toLowerCase().trim();
            if (itemKey === wordKey) {
                if (item.id === entry.id) {
                    updateWord(item.id, { isPrimary: newStatus });
                } else if (newStatus && item.isPrimary) {
                    updateWord(item.id, { isPrimary: false });
                }
            }
        });

        if (newStatus) {
            toast.success(`"${entry.word}" (${entry.ideogram || entry.translation}) marked as main reading.`);
        } else {
            toast.success(`Removed main reading status.`);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Choose Main Glyph for ${item.label || item.key} (${item.name || 'unnamed'})`}
            className="modal-wide numeral-glyph-picker-modal"
        >
            <div className="picker-modal-body">
                {/* Active Selection Banner */}
                <div className="picker-active-banner">
                    <div className="picker-active-info">
                        <span className="picker-active-title">Current Setting:</span>
                        <div className="picker-active-badge-wrap">
                            {currentOverride ? (
                                <>
                                    <span className="picker-override-pill">
                                        <Sparkles size={13} /> Custom Override Pinned: <b>{currentOverride}</b>
                                    </span>
                                    <Button variant="default" className="btn-sm" onClick={handleResetToAutomatic}>
                                        <RotateCcw size={13} /> Reset to Automatic
                                    </Button>
                                </>
                            ) : (
                                <span className="picker-auto-pill">
                                    Automatic Resolution (uses dictionary ideogram or script transliteration)
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 1: Conlang Dictionary Candidates */}
                <div className="picker-section">
                    <div className="picker-section-header">
                        <div className="picker-section-title">
                            <BookA size={16} />
                            <span>Dictionary Candidates & Ideograms</span>
                            <span className="picker-count-badge">({filteredLexiconCandidates.length})</span>
                        </div>
                        {lexiconCandidates.length > 4 && (
                            <input
                                type="text"
                                className="picker-search-input"
                                placeholder="Filter candidates..."
                                value={filterQuery}
                                onChange={(e) => setFilterQuery(e.target.value)}
                            />
                        )}
                    </div>

                    {filteredLexiconCandidates.length > 0 ? (
                        <div className="picker-candidates-grid">
                            {filteredLexiconCandidates.map((cand, idx) => {
                                const entry = cand.entry;
                                const isSelected = currentOverride === cand.glyph;
                                const strokes = findCharGlyph(cand.glyph, { scriptConfig, scriptId });

                                return (
                                    <div key={idx} className={`picker-candidate-card ${isSelected ? 'selected' : ''}`}>
                                        <div className="candidate-glyph-col">
                                            <GlyphPreviewBadge
                                                glyph={cand.glyph}
                                                strokes={strokes}
                                                scriptId={scriptId}
                                                size={38}
                                                showCode={false}
                                                title={cand.glyph}
                                            />
                                        </div>

                                        <div className="candidate-info-col">
                                            <div className="candidate-word-row">
                                                <span className="candidate-word">{entry?.word}</span>
                                                <span className="candidate-trans">"{entry?.translation}"</span>
                                                {entry?.isPrimary && (
                                                    <span className="homophone-primary-badge-inline" title="This is the conlang's main reading for this sound">
                                                        ★ Main Word
                                                    </span>
                                                )}
                                                {cand.isExactName && (
                                                    <span className="picker-tag-match">Matches Name</span>
                                                )}
                                            </div>

                                            {entry?.tags && entry.tags.length > 0 && (
                                                <div className="candidate-tags-row">
                                                    {entry.tags.map((t, ti) => (
                                                        <span key={ti} className="candidate-tag">#{t}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="candidate-actions-col">
                                            <button
                                                type="button"
                                                className={`picker-star-btn ${entry?.isPrimary ? 'active' : ''}`}
                                                onClick={() => handleTogglePrimaryWord(entry)}
                                                title={entry?.isPrimary ? "Primary reading in dictionary (click to unset)" : "Set as primary reading in dictionary"}
                                            >
                                                <Star size={14} fill={entry?.isPrimary ? "currentColor" : "none"} />
                                            </button>

                                            <Button
                                                variant={isSelected ? "accent" : "default"}
                                                className="btn-sm"
                                                onClick={() => handleApplyOverride(cand.glyph)}
                                                title="Select as main number glyph"
                                            >
                                                {isSelected ? <Check size={13} /> : null}
                                                {isSelected ? 'Chosen' : 'Use Glyph'}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="picker-empty-note">
                            No direct dictionary matches found for "{item.name}". You can select any drawn script glyph below or enter a custom character.
                        </div>
                    )}
                </div>

                {/* Section 2: Font Studio Drawn Glyphs */}
                {scriptGlyphs.length > 0 && (
                    <div className="picker-section">
                        <div className="picker-section-header">
                            <div className="picker-section-title">
                                <PenTool size={16} />
                                <span>Active Script Drawings ({scriptGlyphs.length})</span>
                            </div>
                        </div>

                        <div className="picker-script-glyphs-grid">
                            {scriptGlyphs.map((sg, sgi) => {
                                const isSelected = currentOverride === sg.glyph;
                                return (
                                    <button
                                        key={sgi}
                                        type="button"
                                        className={`picker-script-glyph-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleApplyOverride(sg.glyph)}
                                        title={`Codepoint: ${sg.label}. Click to use.`}
                                    >
                                        <GlyphPreviewBadge
                                            glyph={sg.glyph}
                                            strokes={sg.strokes}
                                            scriptId={scriptId}
                                            size={32}
                                            showCode={false}
                                        />
                                        <span className="picker-script-glyph-code">
                                            {sg.glyph.codePointAt(0)?.toString(16).toUpperCase() || sg.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Section 3: Custom Text / Ideogram Input */}
                <div className="picker-section">
                    <div className="picker-section-header">
                        <div className="picker-section-title">
                            <Type size={16} />
                            <span>Direct Unicode / Ideogram Input</span>
                        </div>
                    </div>

                    <div className="picker-custom-input-row">
                        <input
                            type="text"
                            className="fi picker-custom-input"
                            placeholder="Paste or type character, e.g. 二 or 𓏥..."
                            value={customInput}
                            onChange={(e) => setCustomInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && customInput.trim()) {
                                    handleApplyOverride(customInput.trim());
                                }
                            }}
                        />
                        <Button
                            variant="default"
                            disabled={!customInput.trim()}
                            onClick={() => handleApplyOverride(customInput.trim())}
                        >
                            Set Custom Glyph
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

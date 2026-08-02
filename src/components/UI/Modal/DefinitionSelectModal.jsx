import React, { useState, useMemo } from 'react';
import Modal from './Modal.jsx';
import Button from '../Buttons/Buttons.jsx';
import { BookOpen, Check, Loader2, Sparkles, Filter, Info } from 'lucide-react';
import './definitionSelectModal.css';

export default function DefinitionSelectModal({
    isOpen,
    onClose,
    translation = '',
    wordClass = '',
    definitions = [],
    isLoading = false,
    onSelectDefinition
}) {
    const [selectedIdState, setSelectedIdState] = useState(null);
    const [customTextState, setCustomTextState] = useState(null);
    const [activePosFilter, setActivePosFilter] = useState('all');

    // Normalized target wordClass
    const targetPos = useMemo(() => {
        if (!wordClass) return '';
        return wordClass.split(',')[0].trim().toLowerCase();
    }, [wordClass]);

    // Compute best matching default definition
    const defaultItem = useMemo(() => {
        if (!definitions || definitions.length === 0) return null;
        let match = targetPos
            ? definitions.find(d => d.pos?.toLowerCase().includes(targetPos))
            : null;
        return match || definitions[0];
    }, [definitions, targetPos]);

    const selectedId = selectedIdState ?? defaultItem?.id ?? null;
    const customText = customTextState ?? defaultItem?.definition ?? '';

    // Extract unique POS tags from definitions
    const posList = useMemo(() => {
        const set = new Set();
        definitions.forEach(d => {
            if (d.pos) set.add(d.pos.toLowerCase());
        });
        return [...set].sort();
    }, [definitions]);

    // Filter definitions by active POS filter
    const filteredDefinitions = useMemo(() => {
        if (activePosFilter === 'all') return definitions;
        return definitions.filter(d => d.pos?.toLowerCase() === activePosFilter);
    }, [definitions, activePosFilter]);

    const handleCardClick = (defObj) => {
        setSelectedIdState(defObj.id);
        setCustomTextState(defObj.definition);
    };

    const handleClose = () => {
        setSelectedIdState(null);
        setCustomTextState(null);
        setActivePosFilter('all');
        onClose();
    };

    const handleApply = () => {
        if (!customText.trim()) return;
        onSelectDefinition(customText.trim());
        handleClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={
                <div className="def-modal-title">
                    <BookOpen size={20} className="def-modal-title-icon" />
                    <span>Choose Definition for &quot;<strong className="def-target-word">{translation}</strong>&quot;</span>
                </div>
            }
            className="modal-wide def-select-modal"
        >
            <div className="def-modal-body">
                {isLoading ? (
                    <div className="def-modal-loading">
                        <Loader2 className="spinner" size={32} />
                        <p>Searching definitions for &quot;{translation}&quot;...</p>
                    </div>
                ) : definitions.length === 0 ? (
                    <div className="def-modal-empty">
                        <Info size={36} className="def-modal-empty-icon" />
                        <h4>No definition senses found</h4>
                        <p>We couldn&apos;t automatically retrieve definitions for &quot;{translation}&quot;. You can manually type a custom definition below.</p>
                    </div>
                ) : (
                    <>
                        <div className="def-modal-header-desc">
                            <p>
                                Multiple definitions were found. Select the sense that best matches your word, or tweak the definition text before applying.
                            </p>

                            {posList.length > 1 && (
                                <div className="def-pos-filter-bar">
                                    <span className="def-pos-filter-label">
                                        <Filter size={14} /> Filter POS:
                                    </span>
                                    <button
                                        className={`def-pos-chip ${activePosFilter === 'all' ? 'active' : ''}`}
                                        onClick={() => setActivePosFilter('all')}
                                    >
                                        All ({definitions.length})
                                    </button>
                                    {posList.map(pos => (
                                        <button
                                            key={pos}
                                            className={`def-pos-chip ${activePosFilter === pos ? 'active' : ''} ${targetPos && pos.includes(targetPos) ? 'target-match' : ''}`}
                                            onClick={() => setActivePosFilter(pos)}
                                        >
                                            {pos} ({definitions.filter(d => d.pos?.toLowerCase() === pos).length})
                                            {targetPos && pos.includes(targetPos) && <span className="chip-badge">POS</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="def-options-list">
                            {filteredDefinitions.map((item) => {
                                const isSelected = selectedId === item.id;
                                const isPosMatch = targetPos && item.pos?.toLowerCase().includes(targetPos);

                                return (
                                    <div
                                        key={item.id}
                                        className={`def-option-card ${isSelected ? 'selected' : ''} ${isPosMatch ? 'pos-matched' : ''}`}
                                        onClick={() => handleCardClick(item)}
                                    >
                                        <div className="def-option-radio">
                                            <input
                                                type="radio"
                                                name="def-sense-choice"
                                                checked={isSelected}
                                                onChange={() => handleCardClick(item)}
                                            />
                                        </div>

                                        <div className="def-option-content">
                                            <div className="def-option-meta">
                                                <span className="def-pos-badge">{item.pos}</span>
                                                {isPosMatch && (
                                                    <span className="def-match-badge" title="Matches current word Part of Speech">
                                                        <Sparkles size={12} /> Matches POS: {targetPos}
                                                    </span>
                                                )}
                                                <span className="def-source-badge">{item.source}</span>
                                            </div>

                                            <div className="def-option-text">
                                                {item.definition}
                                            </div>

                                            {item.example && (
                                                <div className="def-option-example">
                                                    <em>&quot;{item.example}&quot;</em>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                <div className="def-custom-editor-section">
                    <label className="form-label def-editor-label">
                        Definition Text Preview & Customization
                    </label>
                    <textarea
                        className="input-v def-custom-textarea"
                        rows={3}
                        value={customText}
                        onChange={(e) => setCustomTextState(e.target.value)}
                        placeholder="Selected definition text will appear here. You can edit it before applying..."
                    />
                </div>

                <div className="def-modal-footer">
                    <Button variant="sec" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="save"
                        onClick={handleApply}
                        disabled={!customText.trim() || isLoading}
                    >
                        <Check size={16} /> Apply Selected Definition
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

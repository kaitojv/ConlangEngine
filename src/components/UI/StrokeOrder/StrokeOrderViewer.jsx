import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, ChevronDown, PenTool, Brush, ArrowLeft, ArrowRight, ArrowLeftRight, Merge, Check } from 'lucide-react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { resolveWordStrokes, cleanStrokes, calculateStrokeArrowAndNumber } from '../../../utils/strokeOrderResolver.js';
import GlyphPreviewBadge from '../Glyph/GlyphPreviewBadge.jsx';
import Modal from '../Modal/Modal.jsx';
import FontStudioModal from '../Fontstudio/FontStudio.jsx';
import toast from 'react-hot-toast';
import './strokeOrderViewer.css';

/**
 * Calligraphy Tianzige/Mizige practice grid background for each SVG cell.
 */
const TianzigeGrid = ({ width = 300, height = 300 }) => (
    <g className="tianzige-grid" pointerEvents="none">
        <rect x="0" y="0" width={width} height={height} fill="var(--s2)" stroke="var(--bd)" strokeWidth="2" />
        {/* Horizontal center dashed line */}
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="var(--bd)" strokeWidth="1" strokeDasharray="5 5" />
        {/* Vertical center dashed line */}
        <line x1={width / 2} y1="0" x2={width / 2} y2={height} stroke="var(--bd)" strokeWidth="1" strokeDasharray="5 5" />
        {/* Diagonal dashed lines */}
        <line x1="0" y1="0" x2={width} y2={height} stroke="var(--bd)" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.3" />
        <line x1={width} y1="0" x2="0" y2={height} stroke="var(--bd)" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.3" />
    </g>
);

/**
 * Renders a single stroke path as an SVG element.
 */
const RenderStroke = ({ stroke, color = 'var(--tx)', strokeWidth = 12 }) => {
    if (!stroke || stroke.length === 0) return null;

    if (stroke.length === 1) {
        return <circle cx={stroke[0].x} cy={stroke[0].y} r={strokeWidth / 2} fill={color} />;
    }

    const d = `M ${stroke[0].x} ${stroke[0].y} ` + stroke.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    const lineCap = stroke.lineCap || 'round';

    if (stroke.isFilled) {
        return <path d={`${d} Z`} fill={color} stroke="none" strokeLinejoin="round" />;
    }

    return (
        <path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap={lineCap}
            strokeLinejoin="round"
        />
    );
};

export default function StrokeOrderViewer({ word, char, scriptType: explicitScriptType, rawStrokes, onStrokesChange }) {
    const phonologyTypes = useConfigStore(state => state.phonologyTypes);
    const customGlyphs = useConfigStore(state => state.customGlyphs) || {};
    const scriptDataById = useConfigStore(state => state.scriptDataById) || {};
    const scriptRules = useConfigStore(state => state.scriptRules);
    const scriptSystems = useConfigStore(state => state.scriptSystems);
    const activeScriptSystemId = useConfigStore(state => state.activeScriptSystemId);
    const addCustomGlyph = useConfigStore(state => state.addCustomGlyph);
    const typographySettings = useConfigStore(state => state.typographySettings) || {};

    const rawLexicon = useLexiconStore(state => state.lexicon);
    const lexicon = useMemo(() => Array.isArray(rawLexicon) ? rawLexicon : (rawLexicon?.lexicon || []), [rawLexicon]);

    const targetInput = char || word || '';
    const activeConfig = useMemo(() => ({
        phonologyTypes: explicitScriptType || phonologyTypes || 'alphabetic',
        customGlyphs,
        scriptDataById,
        scriptRules,
        scriptSystems,
        activeScriptSystemId
    }), [explicitScriptType, phonologyTypes, customGlyphs, scriptDataById, scriptRules, scriptSystems, activeScriptSystemId]);

    // Local override for edits made directly in this viewer
    const [customStrokesOverride, setCustomStrokesOverride] = useState(null);
    const [isEditingOrder, setIsEditingOrder] = useState(false);
    const [isFontStudioModalOpen, setIsFontStudioModalOpen] = useState(false);
    const [mergePickSource, setMergePickSource] = useState(null); // null = idle, -1 = ready to pick 1st, >=0 = index of 1st stroke

    // Resolve strokes for the word/character
    const resolvedData = useMemo(() => {
        if (rawStrokes && Array.isArray(rawStrokes)) {
            const cleaned = cleanStrokes(rawStrokes);
            return {
                characters: [{
                    char: char || word || 'Character',
                    charCode: null,
                    label: 'Live Preview',
                    strokes: cleaned,
                    arrows: cleaned.map((s, idx) => calculateStrokeArrowAndNumber(s, idx)),
                    hasStrokes: cleaned.length > 0
                }],
                hasStrokes: cleaned.length > 0
            };
        }
        return resolveWordStrokes(targetInput, activeConfig, lexicon);
    }, [rawStrokes, targetInput, activeConfig, lexicon, char, word]);

    const { characters, hasStrokes } = resolvedData;

    const [selectedCharIndex, setSelectedCharIndex] = useState(0);
    const baseCharData = characters[selectedCharIndex] || characters[0];

    // Compute effective strokes for the currently active character
    const strokes = useMemo(() => {
        if (customStrokesOverride != null) return customStrokesOverride;
        return baseCharData?.strokes || [];
    }, [customStrokesOverride, baseCharData]);

    const arrows = useMemo(() => {
        return strokes.map((s, idx) => calculateStrokeArrowAndNumber(s, idx));
    }, [strokes]);

    const totalStrokes = strokes.length;

    // Player state
    const [currentStep, setCurrentStep] = useState(totalStrokes);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speedMultiplier, setSpeedMultiplier] = useState(1);
    const timerRef = useRef(null);
    const saveTimerRef = useRef(null);
    const [strokeHistory, setStrokeHistory] = useState([]);

    const handleCharChange = (idx) => {
        setSelectedCharIndex(idx);
        setCustomStrokesOverride(null);
        setStrokeHistory([]);
        setMergePickSource(null);
        setIsPlaying(false);
        if (timerRef.current) clearInterval(timerRef.current);
        const charStrokes = characters[idx]?.strokes?.length || 0;
        setCurrentStep(charStrokes);
    };

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, []);

    // Step forward handler
    const stepForward = useCallback(() => {
        setCurrentStep(prev => {
            if (prev >= totalStrokes) {
                setIsPlaying(false);
                return totalStrokes;
            }
            return prev + 1;
        });
    }, [totalStrokes]);

    // Play/Pause interval
    useEffect(() => {
        if (isPlaying) {
            const intervalTime = Math.max(300, Math.floor(900 / speedMultiplier));
            timerRef.current = setInterval(stepForward, intervalTime);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPlaying, speedMultiplier, stepForward]);

    const togglePlay = () => {
        if (isPlaying) {
            setIsPlaying(false);
        } else {
            if (currentStep >= totalStrokes) {
                setCurrentStep(1);
            }
            setIsPlaying(true);
        }
    };

    const handleReset = () => {
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const handlePrevStep = () => {
        setIsPlaying(false);
        setCurrentStep(prev => Math.max(0, prev - 1));
    };

    const handleNextStep = () => {
        setIsPlaying(false);
        setCurrentStep(prev => Math.min(totalStrokes, prev + 1));
    };

    const toggleSpeed = () => {
        setSpeedMultiplier(prev => {
            if (prev === 0.5) return 1;
            if (prev === 1) return 2;
            return 0.5;
        });
    };

    // Save and propagate stroke changes smoothly without freezing the UI
    const applyStrokeUpdate = useCallback((newStrokesList, recordHistory = true) => {
        if (recordHistory) {
            setStrokeHistory(prev => [...prev.slice(-25), strokes]);
        }

        // Instant optimistic UI update
        setCustomStrokesOverride(newStrokesList);
        setCurrentStep(prev => Math.min(prev, newStrokesList.length));

        if (onStrokesChange) {
            onStrokesChange(newStrokesList);
        }

        const charCode = baseCharData?.charCode;
        if (charCode != null) {
            const state = useConfigStore.getState();
            const defaultScriptId = state.scriptRules?.defaultScriptId || 'default';
            const activeScriptId = state.activeScriptSystemId || defaultScriptId;
            let targetScriptId = defaultScriptId;
            let existing = state.customGlyphs?.[charCode] || state.customGlyphs?.[String(charCode)];

            if (!existing && state.scriptDataById) {
                const searchOrder = [activeScriptId, defaultScriptId, ...Object.keys(state.scriptDataById)];
                for (const sId of searchOrder) {
                    const sg = state.scriptDataById[sId]?.customGlyphs;
                    if (sg && (sg[charCode] || sg[String(charCode)])) {
                        existing = sg[charCode] || sg[String(charCode)];
                        targetScriptId = sId;
                        break;
                    }
                }
            }

            let metaObj = null;
            if (existing && existing.length > 0 && !Array.isArray(existing[0]) && existing[0]?.isMeta) {
                metaObj = existing[0];
            }
            const strokesToSave = metaObj ? [metaObj, ...newStrokesList] : newStrokesList;

            // Debounce store/DB update by 250ms to eliminate freezing and lag.
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
            saveTimerRef.current = setTimeout(() => {
                addCustomGlyph(charCode, strokesToSave, null, targetScriptId, true);
            }, 250);
        }
    }, [strokes, onStrokesChange, baseCharData, addCustomGlyph]);

    // Undo last stroke change
    const handleUndo = useCallback(() => {
        if (strokeHistory.length === 0) return;
        const previous = strokeHistory[strokeHistory.length - 1];
        setStrokeHistory(prev => prev.slice(0, -1));
        applyStrokeUpdate(previous, false);
        toast.success("Undone!");
    }, [strokeHistory, applyStrokeUpdate]);

    // Keyboard shortcut for Undo (Ctrl+Z / Cmd+Z)
    useEffect(() => {
        if (!isEditingOrder) return;
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                handleUndo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isEditingOrder, handleUndo]);

    // Stroke reordering: move from fromIdx to toIdx
    const handleMoveStroke = (fromIdx, toIdx) => {
        if (toIdx < 0 || toIdx >= strokes.length) return;
        const next = [...strokes];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        applyStrokeUpdate(next);
    };

    // Stroke reversal: reverse direction of stroke at index
    const handleReverseStroke = (index) => {
        if (index < 0 || index >= strokes.length) return;
        const target = strokes[index];
        if (!Array.isArray(target) || target.length < 2) return;

        const reversed = [...target].reverse();
        if (target.isFilled) reversed.isFilled = true;
        if (target.lineCap) reversed.lineCap = target.lineCap;

        const next = [...strokes];
        next[index] = reversed;
        applyStrokeUpdate(next);
        toast.success(`Stroke ${index + 1} direction reversed`);
    };

    // Merge stroke at indexA with stroke at indexB
    const handleMergeStroke = (indexA, indexB) => {
        if (indexA < 0 || indexA >= strokes.length || indexB < 0 || indexB >= strokes.length || indexA === indexB) return;
        const [firstIdx, secondIdx] = indexA < indexB ? [indexA, indexB] : [indexB, indexA];
        const strokeA = strokes[firstIdx];
        const strokeB = strokes[secondIdx];
        if (!Array.isArray(strokeA) || !Array.isArray(strokeB)) return;

        const mergedPoints = [...strokeA, ...strokeB];
        if (strokeA.isFilled || strokeB.isFilled) mergedPoints.isFilled = true;
        if (strokeA.lineCap || strokeB.lineCap) mergedPoints.lineCap = strokeA.lineCap || strokeB.lineCap;

        const next = [...strokes];
        next.splice(secondIdx, 1);
        next.splice(firstIdx, 1, mergedPoints);
        applyStrokeUpdate(next);
        setMergePickSource(null);
        toast.success(`Merged stroke ${firstIdx + 1} and stroke ${secondIdx + 1}`);
    };

    // If no custom strokes available anywhere for this character
    if (!hasStrokes || !baseCharData || totalStrokes === 0) {
        return (
            <div className="stroke-order-container">
                <div className="so-empty-card">
                    <PenTool size={36} style={{ color: 'var(--tx3)' }} />
                    <div className="so-empty-title">No Stroke Data Found</div>
                    <div className="so-empty-desc">
                        There are no custom drawn strokes recorded for <strong>{targetInput}</strong>. 
                        Draw or import this character in <strong>Font Studio</strong> to enable stroke order diagrams.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="stroke-order-container">
            {/* SVG Markers for Red Arrowhead */}
            <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
                <defs>
                    <marker
                        id="red-arrowhead"
                        viewBox="0 0 10 10"
                        refX="7"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto"
                    >
                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ef4444" />
                    </marker>
                </defs>
            </svg>

            {/* Header Toolbar: Title, Reorder Toggle & Font Studio button */}
            <div className="so-header-toolbar">
                <div className="so-toolbar-title">
                    <PenTool size={16} />
                    <span>{baseCharData.label || baseCharData.char || 'Stroke Order'}</span>
                    {baseCharData.charCode && (
                        <span className="glyph-code-tag">
                            U+{baseCharData.charCode.toString(16).toUpperCase().padStart(4, '0')}
                        </span>
                    )}
                </div>
                <div className="so-toolbar-actions">
                    <button
                        type="button"
                        className={`so-btn-toolbar ${isEditingOrder ? 'active' : ''}`}
                        onClick={() => {
                            setIsEditingOrder(!isEditingOrder);
                            setMergePickSource(null);
                        }}
                        title={isEditingOrder ? "Finish stroke editing" : "Enable stroke reordering, reversing, and merging"}
                    >
                        {isEditingOrder ? <Check size={14} /> : <ArrowLeftRight size={14} />}
                        <span>{isEditingOrder ? 'Done Editing' : 'Reorder / Merge Strokes'}</span>
                    </button>

                    {(baseCharData.charCode != null || explicitScriptType === 'logographic') && (
                        <button
                            type="button"
                            className="so-btn-toolbar"
                            onClick={() => setIsFontStudioModalOpen(true)}
                            title="Open Font Studio to draw or edit this character"
                        >
                            <Brush size={14} />
                            <span>Font Studio</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Active Editing Sub-toolbar */}
            {isEditingOrder && (
                <div className="so-edit-tools-drawer">
                    <div className="so-edit-tools-inner">
                        <button
                            type="button"
                            className={`so-btn-toolbar ${mergePickSource !== null ? 'active' : ''}`}
                            onClick={() => setMergePickSource(mergePickSource !== null ? null : -1)}
                            title="Click any two stroke cards to merge them together"
                        >
                            <Merge size={14} />
                            <span>{mergePickSource !== null ? 'Cancel Merge Pick' : 'Pick 2 Strokes to Merge'}</span>
                        </button>

                        <button
                            type="button"
                            className="so-btn-toolbar"
                            onClick={handleUndo}
                            disabled={strokeHistory.length === 0}
                            title="Undo last change (Ctrl+Z)"
                        >
                            <RotateCcw size={14} />
                            <span>Undo {strokeHistory.length > 0 ? `(${strokeHistory.length})` : ''}</span>
                        </button>

                        <span className="so-edit-tools-note">
                            {mergePickSource !== null 
                                ? (mergePickSource === -1 
                                    ? '👉 Click the 1st stroke card below to merge' 
                                    : `👉 Now click the 2nd stroke card to merge with Stroke ${mergePickSource + 1}`)
                                : 'Use ← / → to reorder, ⇄ to reverse, or click Merge under a card to combine.'}
                        </span>
                    </div>
                </div>
            )}

            {/* Character Selector Tabs for Multi-Character Words */}
            {characters.length > 1 && (
                <div className="so-char-tabs">
                    {characters.map((item, idx) => (
                        <button
                            key={idx}
                            className={`so-char-tab ${selectedCharIndex === idx ? 'active' : ''}`}
                            onClick={() => handleCharChange(idx)}
                        >
                            <GlyphPreviewBadge glyph={item.char} strokes={item.strokes} size={24} />
                            <span>{item.label || `Char ${idx + 1}`}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Interactive Animated Player */}
            <div className="so-player-card">
                <div className="so-player-canvas-wrapper">
                    <svg viewBox="0 0 300 300" className="so-player-svg">
                        <TianzigeGrid />

                        {/* Render all strokes up to currentStep */}
                        {strokes.slice(0, currentStep).map((stroke, sIdx) => {
                            const isCurrent = sIdx === currentStep - 1;
                            const color = isCurrent ? 'var(--tx)' : 'var(--tx2)';
                            return (
                                <g key={sIdx}>
                                    <RenderStroke stroke={stroke} color={color} strokeWidth={12} />
                                </g>
                            );
                        })}

                        {/* Active stroke red directional arrow, starting point marker & number */}
                        {currentStep > 0 && currentStep <= strokes.length && arrows[currentStep - 1] && (
                            <g key={`arrow-${currentStep - 1}`}>
                                {arrows[currentStep - 1].startMarker && (
                                    <circle
                                        cx={arrows[currentStep - 1].startMarker.x}
                                        cy={arrows[currentStep - 1].startMarker.y}
                                        r={arrows[currentStep - 1].isClosed ? 4.5 : 3.5}
                                        fill="#ef4444"
                                        stroke="#ffffff"
                                        strokeWidth="1.5"
                                    />
                                )}
                                {arrows[currentStep - 1].isDot ? (
                                    <text
                                        x={arrows[currentStep - 1].numX}
                                        y={arrows[currentStep - 1].numY}
                                        fill="#ef4444"
                                        fontSize="18"
                                        fontWeight="bold"
                                        textAnchor="middle"
                                    >
                                        {arrows[currentStep - 1].number}
                                    </text>
                                ) : (
                                    <>
                                        <path
                                            d={arrows[currentStep - 1].arrowPathD}
                                            stroke="#ef4444"
                                            strokeWidth="3"
                                            fill="none"
                                            strokeLinecap="round"
                                            markerEnd="url(#red-arrowhead)"
                                        />
                                        <text
                                            x={arrows[currentStep - 1].numX}
                                            y={arrows[currentStep - 1].numY}
                                            fill="#ef4444"
                                            fontSize="18"
                                            fontWeight="bold"
                                            textAnchor="middle"
                                            dominantBaseline="central"
                                        >
                                            {arrows[currentStep - 1].number}
                                        </text>
                                    </>
                                )}
                            </g>
                        )}
                    </svg>
                </div>

                {/* Player Controls */}
                <div className="so-player-controls">
                    <button 
                        className="so-control-btn"
                        onClick={handleReset}
                        title="Restart from beginning"
                    >
                        <RotateCcw size={16} />
                    </button>

                    <button 
                        className="so-control-btn"
                        onClick={handlePrevStep}
                        disabled={currentStep <= 0}
                        title="Previous Stroke"
                    >
                        <ChevronLeft size={18} />
                    </button>

                    <button 
                        className="so-control-btn so-btn-primary"
                        onClick={togglePlay}
                        title={isPlaying ? "Pause" : "Play Stroke Animation"}
                    >
                        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                            {isPlaying ? "Pause" : "Play"}
                        </span>
                    </button>

                    <button 
                        className="so-control-btn"
                        onClick={handleNextStep}
                        disabled={currentStep >= totalStrokes}
                        title="Next Stroke"
                    >
                        <ChevronRight size={18} />
                    </button>

                    <button 
                        className="so-control-btn so-btn-speed"
                        onClick={toggleSpeed}
                        title="Toggle Speed (0.5x, 1x, 2x)"
                    >
                        {speedMultiplier}x
                    </button>
                </div>

                {/* Progress bar */}
                <div className="so-player-progress">
                    <span className="so-step-indicator">
                        Stroke {currentStep} of {totalStrokes}
                    </span>
                    <input
                        type="range"
                        min="0"
                        max={totalStrokes}
                        value={currentStep}
                        onChange={(e) => {
                            setIsPlaying(false);
                            setCurrentStep(parseInt(e.target.value, 10));
                        }}
                        className="so-progress-slider"
                    />
                </div>
            </div>

            {/* Sequential Tianzige Strip (Frames 1..N with Red Arrow & Number) */}
            <div className="so-strip-section">
                <div className="so-strip-header">
                    <span className="so-strip-title">Step-by-Step Sequence ({totalStrokes} Strokes)</span>
                    <span className="so-strip-hint">
                        {isEditingOrder
                            ? "Use arrows below each card to reorder (←/→), reverse (⇄), or merge with next stroke"
                            : "Click any square to view that step in the player"}
                    </span>
                </div>

                <div className="so-strip-scroll">
                    {/* Frame 0: Full Complete Character */}
                    <div 
                        className={`so-cell-card ${currentStep === totalStrokes ? 'active' : ''}`}
                        onClick={() => { setIsPlaying(false); setCurrentStep(totalStrokes); }}
                        title="View Full Character"
                    >
                        <div className="so-cell-svg-wrapper">
                            <svg viewBox="0 0 300 300" className="so-cell-svg">
                                <TianzigeGrid />
                                {strokes.map((stroke, sIdx) => (
                                    <RenderStroke key={sIdx} stroke={stroke} color="var(--tx)" strokeWidth={12} />
                                ))}
                            </svg>
                        </div>
                        <span className="so-cell-label">Full</span>
                    </div>

                    {/* Frames 1..N: Cumulative Strokes with Red Arrow, Start Marker & Number */}
                    {strokes.map((stroke, k) => {
                        const arrow = arrows[k];
                        const isSelected = currentStep === k + 1;
                        const isMergeSource = mergePickSource === k;
                        const isMergeTarget = mergePickSource !== null && mergePickSource !== -1 && mergePickSource !== k;

                        return (
                            <div
                                key={k}
                                className={`so-cell-card ${isSelected ? 'active' : ''} ${isMergeSource ? 'merge-source' : ''} ${isMergeTarget ? 'merge-target' : ''} ${mergePickSource !== null ? 'merge-picking' : ''}`}
                                onClick={() => {
                                    if (mergePickSource !== null) {
                                        if (mergePickSource === -1) {
                                            setMergePickSource(k);
                                        } else if (mergePickSource === k) {
                                            setMergePickSource(null);
                                        } else {
                                            handleMergeStroke(mergePickSource, k);
                                        }
                                        return;
                                    }
                                    setIsPlaying(false);
                                    setCurrentStep(k + 1);
                                }}
                                title={mergePickSource !== null 
                                    ? (mergePickSource === -1 
                                        ? `Click to select Stroke ${k + 1}` 
                                        : (mergePickSource === k 
                                            ? 'Click to deselect' 
                                            : `Click to merge Stroke ${mergePickSource + 1} with Stroke ${k + 1}`))
                                    : `Step ${k + 1}`}
                            >
                                <div className="so-cell-svg-wrapper">
                                    <svg viewBox="0 0 300 300" className="so-cell-svg">
                                        <TianzigeGrid />

                                        {/* Prior strokes 0..k-1 rendered in muted grey */}
                                        {strokes.slice(0, k).map((priorStroke, pIdx) => (
                                            <RenderStroke
                                                key={`prior-${pIdx}`}
                                                stroke={priorStroke}
                                                color="var(--tx2)"
                                                strokeWidth={12}
                                            />
                                        ))}

                                        {/* Current stroke k rendered in prominent color */}
                                        <RenderStroke
                                            key={`current-${k}`}
                                            stroke={stroke}
                                            color="var(--tx)"
                                            strokeWidth={12}
                                        />

                                        {/* Red Arrow, Start Marker and Number */}
                                        {arrow && (
                                            <g key={`arrow-k-${k}`}>
                                                {arrow.startMarker && (
                                                    <circle
                                                        cx={arrow.startMarker.x}
                                                        cy={arrow.startMarker.y}
                                                        r={arrow.isClosed ? 4.5 : 3.5}
                                                        fill="#ef4444"
                                                        stroke="#ffffff"
                                                        strokeWidth="1.5"
                                                    />
                                                )}
                                                {arrow.isDot ? (
                                                    <text
                                                        x={arrow.numX}
                                                        y={arrow.numY}
                                                        fill="#ef4444"
                                                        fontSize="18"
                                                        fontWeight="bold"
                                                        textAnchor="middle"
                                                    >
                                                        {arrow.number}
                                                    </text>
                                                ) : (
                                                    <>
                                                        <path
                                                            d={arrow.arrowPathD}
                                                            stroke="#ef4444"
                                                            strokeWidth="3"
                                                            fill="none"
                                                            strokeLinecap="round"
                                                            markerEnd="url(#red-arrowhead)"
                                                        />
                                                        <text
                                                            x={arrow.numX}
                                                            y={arrow.numY}
                                                            fill="#ef4444"
                                                            fontSize="18"
                                                            fontWeight="bold"
                                                            textAnchor="middle"
                                                            dominantBaseline="central"
                                                        >
                                                            {arrow.number}
                                                        </text>
                                                    </>
                                                )}
                                            </g>
                                        )}
                                    </svg>
                                </div>
                                <span className="so-cell-label">{k + 1}</span>

                                {/* Editing Controls when isEditingOrder is active */}
                                {isEditingOrder && (
                                    <div className="so-cell-edit-actions" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            type="button"
                                            className="so-cell-btn"
                                            disabled={k === 0}
                                            onClick={() => handleMoveStroke(k, k - 1)}
                                            title="Move Earlier"
                                        >
                                            <ArrowLeft size={12} />
                                        </button>
                                        <button
                                            type="button"
                                            className="so-cell-btn"
                                            disabled={k === strokes.length - 1}
                                            onClick={() => handleMoveStroke(k, k + 1)}
                                            title="Move Later"
                                        >
                                            <ArrowRight size={12} />
                                        </button>
                                        <button
                                            type="button"
                                            className="so-cell-btn"
                                            onClick={() => handleReverseStroke(k)}
                                            title="Reverse Direction (flips start and arrow)"
                                        >
                                            <ArrowLeftRight size={12} />
                                        </button>
                                        {k < strokes.length - 1 && (
                                            <button
                                                type="button"
                                                className="so-cell-btn merge-btn"
                                                onClick={() => handleMergeStroke(k, k + 1)}
                                                title={`Merge stroke ${k + 1} with stroke ${k + 2}`}
                                            >
                                                <Merge size={12} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Final Frame: Complete (if more than 1 stroke) */}
                    {totalStrokes > 1 && (
                        <div 
                            className={`so-cell-card ${currentStep === totalStrokes ? 'active' : ''}`}
                            onClick={() => { setIsPlaying(false); setCurrentStep(totalStrokes); }}
                            title="Complete"
                        >
                            <div className="so-cell-svg-wrapper">
                                <svg viewBox="0 0 300 300" className="so-cell-svg">
                                <TianzigeGrid />
                                {strokes.map((s, idx) => (
                                    <RenderStroke key={idx} stroke={s} color="var(--tx2)" strokeWidth={12} />
                                ))}
                                </svg>
                            </div>
                            <span className="so-cell-label">Done</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Font Studio Modal if user clicks "Edit in Font Studio" */}
            {isFontStudioModalOpen && (
                <Modal
                    isOpen={isFontStudioModalOpen}
                    onClose={() => setIsFontStudioModalOpen(false)}
                    title={`Edit Glyph: ${baseCharData.label || baseCharData.char}`}
                >
                    <FontStudioModal
                        targetLabel={baseCharData.label || baseCharData.char}
                        existingCharCode={baseCharData.charCode}
                        onSave={(newChar, newStrokes) => {
                            applyStrokeUpdate(cleanStrokes(newStrokes));
                            setIsFontStudioModalOpen(false);
                            toast.success('Character updated!');
                        }}
                        onCancel={() => setIsFontStudioModalOpen(false)}
                    />
                </Modal>
            )}
        </div>
    );
}

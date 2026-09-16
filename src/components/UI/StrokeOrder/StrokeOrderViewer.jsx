import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, PenTool } from 'lucide-react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { resolveWordStrokes } from '../../../utils/strokeOrderResolver.js';
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

export default function StrokeOrderViewer({ word, char, scriptType: explicitScriptType }) {
    const config = useConfigStore();
    const rawLexicon = useLexiconStore(state => state.lexicon);
    const lexicon = useMemo(() => Array.isArray(rawLexicon) ? rawLexicon : (rawLexicon?.lexicon || []), [rawLexicon]);

    const targetInput = char || word || '';
    const activeConfig = useMemo(() => ({
        ...config,
        phonologyTypes: explicitScriptType || config.phonologyTypes || 'alphabetic'
    }), [config, explicitScriptType]);

    // Resolve strokes for the word/character
    const { characters, hasStrokes } = useMemo(() => {
        return resolveWordStrokes(targetInput, activeConfig, lexicon);
    }, [targetInput, activeConfig, lexicon]);

    const [selectedCharIndex, setSelectedCharIndex] = useState(0);
    const activeCharData = characters[selectedCharIndex] || characters[0];

    const totalStrokes = activeCharData?.strokes?.length || 0;

    // Player state
    const [currentStep, setCurrentStep] = useState(totalStrokes);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speedMultiplier, setSpeedMultiplier] = useState(1);
    const timerRef = useRef(null);

    const handleCharChange = (idx) => {
        setSelectedCharIndex(idx);
        setIsPlaying(false);
        if (timerRef.current) clearInterval(timerRef.current);
        const charStrokes = characters[idx]?.strokes?.length || 0;
        setCurrentStep(charStrokes);
    };

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
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

    // If no custom strokes available anywhere for this character
    if (!hasStrokes || !activeCharData || totalStrokes === 0) {
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

    const strokes = activeCharData.strokes || [];
    const arrows = activeCharData.arrows || [];

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

            {/* Character Selector Tabs for Multi-Character Words */}
            {characters.length > 1 && (
                <div className="so-char-tabs">
                    {characters.map((item, idx) => (
                        <button
                            key={idx}
                            className={`so-char-tab ${selectedCharIndex === idx ? 'active' : ''}`}
                            onClick={() => handleCharChange(idx)}
                        >
                            <span className="so-char-preview custom-font-text">{item.char}</span>
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

                        {/* Active stroke red directional arrow & number */}
                        {currentStep > 0 && currentStep <= strokes.length && arrows[currentStep - 1] && (
                            <g key={`arrow-${currentStep - 1}`}>
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
                    <button className="so-control-btn" onClick={handleReset} title="Reset">
                        <RotateCcw size={14} />
                    </button>
                    <button className="so-control-btn" onClick={handlePrevStep} disabled={currentStep <= 0} title="Previous Stroke">
                        <ChevronLeft size={16} />
                    </button>
                    <button className="so-control-btn primary" onClick={togglePlay} title={isPlaying ? "Pause" : "Play"}>
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button className="so-control-btn" onClick={handleNextStep} disabled={currentStep >= totalStrokes} title="Next Stroke">
                        <ChevronRight size={16} />
                    </button>

                    <div className="so-step-indicator">
                        {currentStep === 0 ? 'Empty' : currentStep === totalStrokes ? 'Complete' : `Stroke ${currentStep} of ${totalStrokes}`}
                    </div>

                    <span className="so-speed-toggle" onClick={toggleSpeed} title="Toggle animation speed">
                        {speedMultiplier}x
                    </span>
                </div>
            </div>

            {/* Sequential Strip (Matching User Image) */}
            <div className="so-strip-wrapper">
                <div className="so-strip-title">
                    <span>Stroke Sequence ({totalStrokes} Strokes)</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--tx3)' }}>Scroll horizontally</span>
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

                    {/* Frames 1..N: Cumulative Strokes with Red Arrow & Number */}
                    {strokes.map((stroke, k) => {
                        const arrow = arrows[k];
                        const isSelected = currentStep === k + 1;

                        return (
                            <div
                                key={k}
                                className={`so-cell-card ${isSelected ? 'active' : ''}`}
                                onClick={() => { setIsPlaying(false); setCurrentStep(k + 1); }}
                                title={`Step ${k + 1}`}
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

                                        {/* Red Arrow and Number */}
                                        {arrow && (
                                            <g key={`arrow-k-${k}`}>
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
        </div>
    );
}

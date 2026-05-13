// src/components/UI/Modal/FontStudioModal.jsx
import React, { useRef, useState, useEffect } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { compileFont } from '../../../utils/fontCompiler.jsx';
import Button from '../Buttons/Buttons.jsx';
import { RotateCcw, Trash2, Download, Pencil, Minus, Spline, Eraser, Feather, FlipHorizontal, FlipVertical, Grid } from 'lucide-react';
import { exportStrokesAsSVG } from '../../../utils/svgExporter.jsx';
import './fontStudio.css';

export default function FontStudioModal({ targetLabel, onSave, onCancel }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [strokes, setStrokes] = useState([]);
    const [currentStroke, setCurrentStroke] = useState([]);
    const [brushSize, setBrushSize] = useState(5);
    const [activeTool, setActiveTool] = useState('brush'); // 'brush', 'line', 'curve'
    const [isCalligraphy, setIsCalligraphy] = useState(false);
    const [symmetryMode, setSymmetryMode] = useState('none'); // 'none', 'horizontal', 'vertical'
    const [isSnapToGrid, setIsSnapToGrid] = useState(false);
    const [lineCap, setLineCap] = useState('round'); // 'round', 'butt'
    const [isFillMode, setIsFillMode] = useState(false);
    const [interactionPoints, setInteractionPoints] = useState([]); // [P0, P1, P2]
    const [interactionStage, setInteractionStage] = useState(0); // 0: Idle, 1: Dragging, 2: Setting Curve Control

    const { customGlyphs, puaCounter, addCustomGlyph, incrementPuaCounter } = useConfigStore();

    // Redraw the canvas whenever strokes change (for Undo support)
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.lineWidth = brushSize; 
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--tx').trim() || '#0f172a';
        
        strokes.forEach(stroke => {
            if (stroke.length < 2) return;
            
            ctx.lineCap = stroke.lineCap || 'round';
            ctx.lineJoin = 'round';

            if (stroke.isFilled) {
                ctx.fillStyle = ctx.strokeStyle;
                ctx.beginPath();
                ctx.moveTo(stroke[0].x, stroke[0].y);
                for (let i = 1; i < stroke.length; i++) {
                    ctx.lineTo(stroke[i].x, stroke[i].y);
                }
                ctx.closePath();
                ctx.fill();
            } else if (isCalligraphy) {
                // ...
                for (let i = 0; i < stroke.length - 1; i++) {
                    const p1 = stroke[i];
                    const p2 = stroke[i+1];
                    const taper = Math.sin((i / (stroke.length - 1)) * Math.PI);
                    const currentWidth = brushSize * (0.3 + 0.7 * taper);
                    
                    ctx.lineWidth = currentWidth;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            } else {
                ctx.lineWidth = brushSize;
                ctx.beginPath();
                ctx.moveTo(stroke[0].x, stroke[0].y);
                for (let i = 1; i < stroke.length; i++) {
                    ctx.lineTo(stroke[i].x, stroke[i].y);
                }
                ctx.stroke();
            }
        });

        // Draw preview of current stroke
        if (currentStroke.length >= 2) {
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--tx2').trim() || '#64748b';
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 2; // Preview line always thin
            ctx.beginPath();
            ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
            for (let i = 1; i < currentStroke.length; i++) {
                ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }, [strokes, currentStroke, brushSize, isCalligraphy]);

    const getCoords = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        if (isSnapToGrid) {
            const gridSize = 20;
            x = Math.round(x / gridSize) * gridSize;
            y = Math.round(y / gridSize) * gridSize;
        }

        return { x, y };
    };

    const generateCurvePoints = (p0, p1, p2) => {
        const points = [];
        const steps = 20;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
            const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
            points.push({ x, y });
        }
        return points;
    };

    const getMirroredStroke = (stroke, mode) => {
        if (mode === 'none') return null;
        const CANVAS_SIZE = 300;
        return stroke.map(pt => ({
            x: mode === 'horizontal' ? CANVAS_SIZE - pt.x : pt.x,
            y: mode === 'vertical' ? CANVAS_SIZE - pt.y : pt.y
        }));
    };

    const eraseStrokesAt = (coords) => {
        setStrokes(prev => prev.filter(strokeObj => {
            const points = Array.isArray(strokeObj) ? strokeObj : (strokeObj.points || []);
            return !points.some(pt => {
                const dx = pt.x - coords.x;
                const dy = pt.y - coords.y;
                return Math.sqrt(dx*dx + dy*dy) < (brushSize + 10);
            });
        }));
    };

    const handlePointerDown = (e) => {
        const coords = getCoords(e);

        if (activeTool === 'brush') {
            e.currentTarget.setPointerCapture(e.pointerId);
            setIsDrawing(true);
            setCurrentStroke([coords]);
        } else if (activeTool === 'line') {
            e.currentTarget.setPointerCapture(e.pointerId);
            setIsDrawing(true);
            setInteractionPoints([coords]);
        } else if (activeTool === 'curve') {
            if (interactionStage === 0) {
                e.currentTarget.setPointerCapture(e.pointerId);
                setInteractionStage(1);
                setInteractionPoints([coords]);
            } else if (interactionStage === 2) {
                // Finalize curve
                const [p0, p2] = interactionPoints;
                const p1 = coords;
                const curvePoints = generateCurvePoints(p0, p1, p2);
                
                const mirror = getMirroredStroke(curvePoints, symmetryMode);
                const finalStroke = [...curvePoints];
                finalStroke.lineCap = lineCap;
                finalStroke.isFilled = isFillMode;

                if (mirror) {
                    mirror.lineCap = lineCap;
                    mirror.isFilled = isFillMode;
                    setStrokes(prev => [...prev, finalStroke, mirror]);
                } else {
                    setStrokes(prev => [...prev, finalStroke]);
                }

                setInteractionStage(0);
                setInteractionPoints([]);
                setCurrentStroke([]);
            }
        } else if (activeTool === 'eraser') {
            e.currentTarget.setPointerCapture(e.pointerId);
            setIsDrawing(true);
            eraseStrokesAt(coords);
        }
    };

    const handlePointerMove = (e) => {
        const coords = getCoords(e);

        if (activeTool === 'brush' && isDrawing) {
            const lastPoint = currentStroke[currentStroke.length - 1];
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.lineWidth = brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--tx').trim() || '#0f172a';
            ctx.beginPath();
            ctx.moveTo(lastPoint.x, lastPoint.y);
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
            setCurrentStroke(prev => [...prev, coords]);
        } else if (activeTool === 'line' && isDrawing) {
            setCurrentStroke([interactionPoints[0], coords]);
        } else if (activeTool === 'curve') {
            if (interactionStage === 1) {
                setCurrentStroke([interactionPoints[0], coords]);
            } else if (interactionStage === 2) {
                const [p0, p2] = interactionPoints;
                const p1 = coords;
                setCurrentStroke(generateCurvePoints(p0, p1, p2));
            }
        } else if (activeTool === 'eraser' && isDrawing) {
            eraseStrokesAt(coords);
        }
    };

    const handlePointerUp = () => {
        if (activeTool === 'brush' && isDrawing) {
            setIsDrawing(false);
            if (currentStroke.length > 0) {
                const finalStroke = [...currentStroke];
                finalStroke.lineCap = lineCap;
                finalStroke.isFilled = isFillMode;

                const mirror = getMirroredStroke(finalStroke, symmetryMode);
                if (mirror) {
                    mirror.lineCap = lineCap;
                    mirror.isFilled = isFillMode;
                    setStrokes(prev => [...prev, finalStroke, mirror]);
                } else {
                    setStrokes(prev => [...prev, finalStroke]);
                }
            }
            setCurrentStroke([]);
        } else if (activeTool === 'line' && isDrawing) {
            setIsDrawing(false);
            const finalStroke = [...currentStroke];
            finalStroke.lineCap = lineCap;
            finalStroke.isFilled = isFillMode;

            const mirror = getMirroredStroke(finalStroke, symmetryMode);
            if (mirror) {
                mirror.lineCap = lineCap;
                mirror.isFilled = isFillMode;
                setStrokes(prev => [...prev, finalStroke, mirror]);
            } else {
                setStrokes(prev => [...prev, finalStroke]);
            }
            setCurrentStroke([]);
            setInteractionPoints([]);
        } else if (activeTool === 'eraser' && isDrawing) {
            setIsDrawing(false);
            setCurrentStroke([]);
        } else if (interactionStage === 1) {
            const endPoint = currentStroke[1];
            setInteractionPoints(prev => [prev[0], endPoint]);
            setInteractionStage(2);
        }
    };

    const handleUndo = () => {
        setStrokes(prev => prev.slice(0, -1));
    };

    const handleClear = () => {
        setStrokes([]);
        setCurrentStroke([]);
    };

    const handleSave = async () => {
        if (strokes.length === 0) return alert("Draw something before saving!");

        const charCode = puaCounter;
        incrementPuaCounter();

        // 1. Temporarily add the new strokes to the dictionary for the compiler
        // We include a metadata stroke if calligraphy is on (hacky but keeps the schema)
        const strokesToSave = isCalligraphy 
            ? [{ x: -999, y: -999 }, ...strokes] 
            : strokes;

        const updatedGlyphDb = { ...customGlyphs, [charCode]: strokesToSave };
        
        // 2. Compile the font
        const base64Font = await compileFont(updatedGlyphDb);
        
        // 3. Save everything to Zustand
        if (base64Font) {
            addCustomGlyph(charCode, strokesToSave, base64Font);
            
            // 4. Give the generated Unicode character and the strokes back to the parent component!
            const newChar = String.fromCodePoint(charCode);
            onSave(newChar, strokesToSave);
        }
    };

    return (
        <div className="fs-container">
            <div className="fs-header">
                <h3 className="fs-title">Drawing: <span className="custom-font-text">{targetLabel}</span></h3>
                <p className="fs-subtitle">Draw your custom ideogram below.</p>
            </div>

            <div className="fs-canvas-wrapper">
                {/* Visual Blueprint Background Lines */}
                <div className="fs-canvas-grid"></div>
                
                {/* Typographical Metric Lines */}
                <div className="fs-metric-line ascent" title="Ascent"><span>ASC</span></div>
                <div className="fs-metric-line cap-height" title="Cap Height"><span>CAP</span></div>
                <div className="fs-metric-line x-height" title="x-Height"><span>X-H</span></div>
                <div className="fs-metric-line baseline" title="Baseline"><span>BASE</span></div>
                <div className="fs-metric-line descent" title="Descent"><span>DESC</span></div>
                
                <canvas
                    ref={canvasRef}
                    width={300}
                    height={300}
                    className="fs-canvas"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                />
            </div>

            <div className="fs-controls">
                <div className="fs-tool-selector">
                    <div className="fs-tool-group-wrapper">
                        <button 
                            className={`fs-tool-btn ${activeTool === 'brush' ? 'active' : ''}`}
                            onClick={() => setActiveTool('brush')}
                            title="Brush"
                        >
                            <Pencil size={18} />
                        </button>
                        <div className="fs-tool-options-popup">
                            <button className={`fs-opt-btn ${lineCap === 'round' ? 'active' : ''}`} onClick={() => setLineCap('round')}>Round Cap</button>
                            <button className={`fs-opt-btn ${lineCap === 'butt' ? 'active' : ''}`} onClick={() => setLineCap('butt')}>Flat Cap</button>
                        </div>
                    </div>

                    <button 
                        className={`fs-tool-btn ${activeTool === 'line' ? 'active' : ''}`}
                        onClick={() => setActiveTool('line')}
                        title="Line"
                    >
                        <Minus size={18} />
                    </button>
                    <button 
                        className={`fs-tool-btn ${activeTool === 'curve' ? 'active' : ''}`}
                        onClick={() => setActiveTool('curve')}
                        title="Curve"
                    >
                        <Spline size={18} />
                    </button>
                    <button 
                        className={`fs-tool-btn ${activeTool === 'eraser' ? 'active' : ''}`}
                        onClick={() => setActiveTool('eraser')}
                        title="Eraser"
                    >
                        <Eraser size={18} />
                    </button>
                    <div className="fs-tool-separator" />
                    <button 
                        className={`fs-tool-btn ${isFillMode ? 'active' : ''}`}
                        onClick={() => setIsFillMode(!isFillMode)}
                        title="Fill Mode (Closes & fills path)"
                    >
                        <Download size={18} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                    <div className="fs-tool-separator" />
                    <button 
                        className={`fs-tool-btn ${isCalligraphy ? 'active' : ''}`}
                        onClick={() => setIsCalligraphy(!isCalligraphy)}
                        title="Calligraphy Mode"
                    >
                        <Feather size={18} />
                    </button>
                    <div className="fs-tool-separator" />
                    <button 
                        className={`fs-tool-btn ${symmetryMode === 'horizontal' ? 'active' : ''}`}
                        onClick={() => setSymmetryMode(symmetryMode === 'horizontal' ? 'none' : 'horizontal')}
                        title="Horizontal Symmetry"
                    >
                        <FlipHorizontal size={18} />
                    </button>
                    <button 
                        className={`fs-tool-btn ${symmetryMode === 'vertical' ? 'active' : ''}`}
                        onClick={() => setSymmetryMode(symmetryMode === 'vertical' ? 'none' : 'vertical')}
                        title="Vertical Symmetry"
                    >
                        <FlipVertical size={18} />
                    </button>
                    <div className="fs-tool-separator" />
                    <button 
                        className={`fs-tool-btn ${isSnapToGrid ? 'active' : ''}`}
                        onClick={() => setIsSnapToGrid(!isSnapToGrid)}
                        title="Snap to Grid"
                    >
                        <Grid size={18} />
                    </button>
                </div>

                <div className="fs-brush-control">
                    <span className="fs-brush-label">Size:</span>
                    <input 
                        type="range" 
                        min="2" max="15" 
                        value={brushSize} 
                        onChange={(e) => setBrushSize(parseInt(e.target.value))} 
                        className="fs-brush-slider"
                    />
                </div>
                <div className="fs-controls-group">
                    <Button variant="default" className="btn-sm" onClick={handleUndo}>
                        <RotateCcw size={16} />
                    </Button>
                    <Button variant="default" className="btn-sm fs-clear-btn" onClick={handleClear}>
                        <Trash2 size={16} />
                    </Button>
                </div>
            </div>

            <div className="fs-action-btns">
                <Button variant="cancel" className="fs-btn-full" onClick={onCancel}>Cancel</Button>
                <Button 
                    variant="default" 
                    className="fs-btn-full" 
                    onClick={() => exportStrokesAsSVG(strokes, `${targetLabel || 'glyph'}.svg`)}
                >
                    <Download size={16} /> Export SVG
                </Button>
                <Button variant="edit" className="fs-btn-full fs-btn-save" onClick={handleSave}>💾 Save Glyph</Button>
            </div>

            <div className="fs-preview-section">
                <span className="fs-preview-label">Live Context Preview (Updates on stroke finish):</span>
                <div className="fs-preview-text">
                    {(() => {
                        const char = targetLabel.includes(':') ? targetLabel.split(':')[1].trim() : targetLabel;
                        
                        // Internal component for the mini-svg
                        const MiniSVG = () => (
                            <svg 
                                width="1.2em" 
                                height="1.2em" 
                                viewBox="0 0 300 300" 
                                style={{ verticalAlign: 'middle', margin: '0 2px', display: 'inline-block' }}
                            >
                                {(() => {
                                    const allStrokes = currentStroke.length >= 2 
                                        ? [...strokes, currentStroke] 
                                        : strokes;
                                        
                                    return allStrokes.map((stroke, i) => {
                                        if (stroke.length < 2) return null;
                                        // Skip the calligraphy meta-point if present
                                        if (stroke.length === 1 && stroke[0].x === -999) return null;
                                        const d = `M ${stroke[0].x} ${stroke[0].y} ` + 
                                                  stroke.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
                                        return (
                                            <path 
                                                key={i} 
                                                d={d + (stroke.isFilled ? ' Z' : '')} 
                                                fill={stroke.isFilled ? 'currentColor' : 'none'} 
                                                stroke="currentColor" 
                                                strokeWidth={stroke.isFilled ? 0 : brushSize * 2} 
                                                strokeLinecap={stroke.lineCap || 'round'} 
                                                strokeLinejoin="round" 
                                            />
                                        );
                                    });
                                })()}
                            </svg>
                        );

                        return (
                            <>
                                <MiniSVG /> <MiniSVG /> — 
                                The quick <MiniSVG /> brown <MiniSVG /> fox jumps over the lazy <MiniSVG />.
                            </>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}
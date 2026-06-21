// src/components/UI/Modal/FontStudioModal.jsx
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { compileFont } from '../../../utils/fontCompiler.jsx';
import Button from '../Buttons/Buttons.jsx';
import { RotateCcw, Trash2, Download, Pencil, Minus, Spline, Eraser, Feather, FlipHorizontal, FlipVertical, Grid, Square, Circle, Triangle, SquareDashed, PenTool } from 'lucide-react';
import { exportStrokesAsSVG } from '../../../utils/svgExporter.jsx';
import { parseSVGToStrokes } from '../../../utils/svgImporter.jsx';
import './fontStudio.css';

export default function FontStudioModal({ targetLabel, onSave, onCancel, existingCharCode }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [strokes, setStrokes] = useState([]);
    const [currentStroke, setCurrentStroke] = useState([]);
    const [brushSize, setBrushSize] = useState(5);
    const [activeTool, setActiveTool] = useState('brush'); // 'brush', 'line', 'curve', 'rect', 'circle', 'select_erase'
    const [isCalligraphy, setIsCalligraphy] = useState(false);
    const [isBrushPen, setIsBrushPen] = useState(false);
    const [symmetryMode, setSymmetryMode] = useState('none'); // 'none', 'horizontal', 'vertical'
    const [isSnapToGrid, setIsSnapToGrid] = useState(false);
    const [lineCap, setLineCap] = useState('round'); // 'round', 'butt'
    const [isFillMode, setIsFillMode] = useState(false);
    const [interactionPoints, setInteractionPoints] = useState([]); // [P0, P1, P2]
    const [interactionStage, setInteractionStage] = useState(0); // 0: Idle, 1: Dragging, 2: Setting Curve Control

    // Metadata States
    const [glyphScale, setGlyphScale] = useState(1.0);
    const [leftMargin, setLeftMargin] = useState(100);
    const [rightMargin, setRightMargin] = useState(100);
    const [yOffset, setYOffset] = useState(0);

    const [backgroundStrokes, setBackgroundStrokes] = useState([]);
    const [backgroundText, setBackgroundText] = useState('');
    const [selectedReferenceId, setSelectedReferenceId] = useState('');
    const fileInputRef = useRef(null);

    const { customGlyphs, puaCounter, addCustomGlyph, incrementPuaCounter, alphabetGlyphs, alphabetNames, featuralComponents } = useConfigStore();

    const drawnGlyphsOptions = useMemo(() => {
        const options = [];
        if (alphabetGlyphs) {
            Object.entries(alphabetGlyphs).forEach(([charKey, unicodeChar]) => {
                if (!unicodeChar) return;
                const charCode = unicodeChar.codePointAt(0);
                if (customGlyphs[charCode]) {
                    const name = alphabetNames?.[charKey] || charKey;
                    options.push({ label: `${name} (${charKey})`, strokes: customGlyphs[charCode], id: charCode });
                }
            });
        }
        if (featuralComponents) {
            Object.entries(featuralComponents).forEach(([comp, strokes]) => {
                if (strokes && strokes.length > 0) {
                    options.push({ label: `Radical: ${comp}`, strokes: strokes, id: `rad_${comp}` });
                }
            });
        }
        // Add untracked custom glyphs as generic
        Object.entries(customGlyphs).forEach(([code, strokes]) => {
            if (!options.find(o => o.id == code)) {
                options.push({ label: `Glyph ${code}`, strokes: strokes, id: code });
            }
        });
        return options;
    }, [alphabetGlyphs, alphabetNames, customGlyphs, featuralComponents]);

    // Load existing strokes if we are redrawing an existing character
    useEffect(() => {
        if (existingCharCode && customGlyphs[existingCharCode]) {
            const existingStrokes = customGlyphs[existingCharCode];
            if (existingStrokes && existingStrokes.length > 0) {
                let actualStrokes = existingStrokes;
                const firstStroke = existingStrokes[0];
                
                if (!Array.isArray(firstStroke) && firstStroke.isMeta) {
                    setGlyphScale(firstStroke.scale ?? 1.0);
                    setLeftMargin(firstStroke.leftMargin ?? 100);
                    setRightMargin(firstStroke.rightMargin ?? 100);
                    setYOffset(firstStroke.yOffset ?? 0);
                    setIsCalligraphy(firstStroke.isCalligraphy ?? false);
                    setIsBrushPen(firstStroke.isBrushPen ?? false);
                    actualStrokes = existingStrokes.slice(1);
                } else if (Array.isArray(firstStroke) && firstStroke.length === 1 && firstStroke[0].x === -999) {
                    setIsCalligraphy(true);
                    actualStrokes = existingStrokes.slice(1);
                } else if (Array.isArray(firstStroke) && firstStroke.length === 1 && firstStroke[0].x === -998) {
                    setIsBrushPen(true);
                    actualStrokes = existingStrokes.slice(1);
                }
                
                setStrokes(actualStrokes);
            }
        }
    }, [existingCharCode]); // Only run on mount or when existingCharCode changes

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const svgContent = event.target.result;
            const importedStrokes = parseSVGToStrokes(svgContent);
            if (importedStrokes && importedStrokes.length > 0) {
                setStrokes(prev => [...prev, ...importedStrokes]);
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSetBackground = () => {
        const opt = drawnGlyphsOptions.find(o => o.id == selectedReferenceId);
        if (opt) {
            const validStrokes = opt.strokes.filter(s => !(s.length === 1 && (s[0].x === -999 || s[0].x === -998)));
            setBackgroundStrokes(validStrokes);
        }
    };

    const handleLoadToCanvas = () => {
        const opt = drawnGlyphsOptions.find(o => o.id == selectedReferenceId);
        if (opt) {
            // Filter out meta strokes (calligraphy/brush pen flags)
            const validStrokes = opt.strokes.filter(s => !(s.length === 1 && (s[0].x === -999 || s[0].x === -998)));
            // Deep clone to prevent state mutation and bugging other characters
            const clonedStrokes = validStrokes.map(stroke => {
                const newStroke = stroke.map(pt => ({ ...pt }));
                newStroke.lineCap = stroke.lineCap;
                newStroke.isFilled = stroke.isFilled;
                return newStroke;
            });
            setStrokes(prev => [...prev, ...clonedStrokes]);
        }
    };

    // Redraw the canvas whenever strokes change (for Undo support)
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.lineWidth = brushSize; 
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--tx').trim() || '#0f172a';
        
        // Draw background strokes first
        if (backgroundStrokes && backgroundStrokes.length > 0) {
            ctx.save();
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--tx2').trim() || '#64748b';
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = brushSize;
            backgroundStrokes.forEach(stroke => {
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
                } else {
                    ctx.beginPath();
                    ctx.moveTo(stroke[0].x, stroke[0].y);
                    for (let i = 1; i < stroke.length; i++) {
                        ctx.lineTo(stroke[i].x, stroke[i].y);
                    }
                    ctx.stroke();
                }
            });
            ctx.restore();
        }

        // Draw text background if any
        if (backgroundText) {
            ctx.save();
            ctx.font = '200px sans-serif';
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--tx2').trim() || '#64748b';
            ctx.globalAlpha = 0.15;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(backgroundText, canvas.width / 2, canvas.height / 2);
            ctx.restore();
        }

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
            } else if (isBrushPen) {
                // Brush Pen simulation
                for (let i = 0; i < stroke.length - 1; i++) {
                    const p1 = stroke[i];
                    const p2 = stroke[i+1];
                    const progress = i / (stroke.length - 1 || 1);
                    const widthMult = progress < 0.8 ? 1.0 : (1.0 - (progress - 0.8) * 5); // 1.0 down to 0.0
                    const startMult = progress < 0.1 ? (0.5 + progress * 5) : 1.0; 
                    const currentWidth = brushSize * Math.max(0.1, widthMult * startMult);
                    
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
    }, [strokes, currentStroke, brushSize, isCalligraphy, isBrushPen, backgroundStrokes, backgroundText]);

    const getCoords = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        
        let x = (e.clientX - rect.left) * scaleX;
        let y = (e.clientY - rect.top) * scaleY;

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

    const splitStrokes = (strokesToFilter, isInsideFn) => {
        const newStrokes = [];
        strokesToFilter.forEach(strokeObj => {
            const points = Array.isArray(strokeObj) ? strokeObj : (strokeObj.points || []);
            
            if (points.length === 1 && (points[0].x === -999 || points[0].x === -998)) {
                newStrokes.push(strokeObj);
                return;
            }

            // Resample to ensure dense points for accurate erasing (fixes shape collapse)
            const densePoints = [points[0]];
            for (let i = 1; i < points.length; i++) {
                const p1 = points[i-1];
                const p2 = points[i];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const len = Math.sqrt(dx*dx + dy*dy);
                const steps = Math.max(1, Math.ceil(len / 2)); // 2px density
                for (let j = 1; j <= steps; j++) {
                    densePoints.push({
                        x: p1.x + (dx * j) / steps,
                        y: p1.y + (dy * j) / steps
                    });
                }
            }

            let currentNewStroke = [];
            for (let i = 0; i < densePoints.length; i++) {
                const pt = densePoints[i];
                
                if (!isInsideFn(pt)) {
                    currentNewStroke.push(pt);
                } else {
                    if (currentNewStroke.length > 0) {
                        currentNewStroke.lineCap = strokeObj.lineCap;
                        currentNewStroke.isFilled = strokeObj.isFilled;
                        newStrokes.push(currentNewStroke);
                        currentNewStroke = [];
                    }
                }
            }
            
            if (currentNewStroke.length > 0) {
                currentNewStroke.lineCap = strokeObj.lineCap;
                currentNewStroke.isFilled = strokeObj.isFilled;
                newStrokes.push(currentNewStroke);
            }
        });
        return newStrokes;
    };

    const eraseStrokesAt = (coords) => {
        setStrokes(prev => splitStrokes(prev, (pt) => {
            const dx = pt.x - coords.x;
            const dy = pt.y - coords.y;
            return Math.sqrt(dx*dx + dy*dy) < (brushSize + 10);
        }));
    };

    const handlePointerDown = (e) => {
        const coords = getCoords(e);

        if (activeTool === 'brush') {
            setIsDrawing(true);
            setCurrentStroke([coords]);
        } else if (activeTool === 'line') {
            setIsDrawing(true);
            setInteractionPoints([coords]);
        } else if (activeTool === 'curve') {
            if (interactionStage === 0) {
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
            setIsDrawing(true);
            eraseStrokesAt(coords);
        } else if (activeTool === 'rect' || activeTool === 'circle' || activeTool === 'triangle' || activeTool === 'select_erase') {
            setIsDrawing(true);
            setInteractionPoints([coords]);
        }
    };

    const handlePointerMove = (e) => {
        const coords = getCoords(e);

        if (activeTool === 'brush' && isDrawing) {
            const lastPoint = currentStroke[currentStroke.length - 1];
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.lineWidth = brushSize;
            ctx.lineCap = lineCap;
            ctx.lineJoin = lineCap === 'butt' ? 'miter' : 'round';
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
        } else if (activeTool === 'rect' && isDrawing) {
            const p0 = interactionPoints[0];
            const p1 = coords;
            setCurrentStroke([
                p0, {x: p1.x, y: p0.y}, p1, {x: p0.x, y: p1.y}, p0
            ]);
        } else if (activeTool === 'circle' && isDrawing) {
            const p0 = interactionPoints[0];
            const p1 = coords;
            const r = Math.sqrt(Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2));
            const pts = [];
            for (let i=0; i<=36; i++) {
                const a = (i/36) * Math.PI * 2;
                pts.push({ x: p0.x + Math.cos(a)*r, y: p0.y + Math.sin(a)*r });
            }
            setCurrentStroke(pts);
        } else if (activeTool === 'triangle' && isDrawing) {
            const p0 = interactionPoints[0];
            const p1 = coords;
            const minX = Math.min(p0.x, p1.x);
            const maxX = Math.max(p0.x, p1.x);
            const minY = Math.min(p0.y, p1.y);
            const maxY = Math.max(p0.y, p1.y);
            const midX = (minX + maxX) / 2;
            setCurrentStroke([
                {x: midX, y: minY},
                {x: maxX, y: maxY},
                {x: minX, y: maxY},
                {x: midX, y: minY}
            ]);
        } else if (activeTool === 'select_erase' && isDrawing) {
            const p0 = interactionPoints[0];
            const p1 = coords;
            // Draw a dashed selection box preview (visualized as a normal stroke preview)
            setCurrentStroke([
                p0, {x: p1.x, y: p0.y}, p1, {x: p0.x, y: p1.y}, p0
            ]);
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
        } else if ((activeTool === 'rect' || activeTool === 'circle' || activeTool === 'triangle') && isDrawing) {
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
            setInteractionPoints([]);
        } else if (activeTool === 'select_erase' && isDrawing) {
            setIsDrawing(false);
            if (currentStroke.length >= 3) {
                const p0 = interactionPoints[0];
                const p1 = currentStroke[2]; // P1 is the opposite corner
                const minX = Math.min(p0.x, p1.x);
                const maxX = Math.max(p0.x, p1.x);
                const minY = Math.min(p0.y, p1.y);
                const maxY = Math.max(p0.y, p1.y);
                
                setStrokes(prev => splitStrokes(prev, (pt) => {
                    return pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY;
                }));
            }
            setCurrentStroke([]);
            setInteractionPoints([]);
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

        // If we're redrawing an existing character, reuse its charCode.
        // Only allocate a new PUA slot for genuinely new characters.
        let charCode;
        if (existingCharCode != null) {
            charCode = typeof existingCharCode === 'number' ? existingCharCode : parseInt(existingCharCode);
        } else {
            charCode = puaCounter;
            incrementPuaCounter();
        }

        // 1. Save metadata object as the first stroke
        const metaObj = {
            isMeta: true,
            scale: glyphScale,
            leftMargin: leftMargin,
            rightMargin: rightMargin,
            yOffset: yOffset,
            isCalligraphy: isCalligraphy,
            isBrushPen: isBrushPen
        };

        const strokesToSave = [metaObj, ...strokes];

        const updatedGlyphDb = { ...customGlyphs, [charCode]: strokesToSave };
        
        // 2. Compile the font
        const typographySettings = useConfigStore.getState().typographySettings || {};
        const base64Font = await compileFont(updatedGlyphDb, typographySettings.traceWidth ?? 30, typographySettings.customFontScale ?? 1.0);
        
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
                <p className="fs-subtitle">Draw your custom ideogram below or use a reference.</p>
                <div className="fs-reference-tools">
                    <div className="fs-ref-group">
                        <select 
                            className="fs-ref-select" 
                            value={selectedReferenceId} 
                            onChange={(e) => setSelectedReferenceId(e.target.value)}
                        >
                            <option value="">-- Select Existing Glyph --</option>
                            {drawnGlyphsOptions.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                        </select>
                        <Button variant="default" className="btn-sm" onClick={handleSetBackground} disabled={!selectedReferenceId}>
                            Set Background
                        </Button>
                        <Button variant="default" className="btn-sm" onClick={handleLoadToCanvas} disabled={!selectedReferenceId} title="Insert strokes into your drawing">
                            Load to Canvas
                        </Button>
                        <div style={{ width: '1px', height: '20px', background: 'var(--bd)' }}></div>
                        <input 
                            type="text" 
                            className="fs-ref-select" 
                            style={{ width: '80px', minWidth: '80px', textAlign: 'center', paddingRight: '10px', backgroundImage: 'none' }} 
                            placeholder="A B C"
                            maxLength={5}
                            value={backgroundText}
                            onChange={(e) => setBackgroundText(e.target.value)}
                            title="Type system letters here to see them faintly in the background for tracing!"
                        />
                    </div>
                    <div className="fs-import-group">
                        <input 
                            type="file" 
                            accept=".svg" 
                            ref={fileInputRef} 
                            style={{ display: 'none' }} 
                            onChange={handleFileUpload} 
                        />
                        <Button variant="default" className="btn-sm" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                            <Download size={14} style={{ transform: 'rotate(180deg)', marginRight: '4px' }} /> Import SVG
                        </Button>
                    </div>
                </div>

                <div className="fs-metadata-tools">
                    <div className="fs-metadata-group">
                        <label className="fs-metadata-label">Scale ({glyphScale.toFixed(2)}x)</label>
                        <input type="range" className="range range-xs range-primary" min="0.5" max="2.0" step="0.05" value={glyphScale} onChange={(e) => setGlyphScale(parseFloat(e.target.value))} />
                    </div>
                    <div className="fs-metadata-group">
                        <label className="fs-metadata-label">Left Margin ({leftMargin})</label>
                        <input type="range" className="range range-xs range-primary" min="-200" max="500" step="10" value={leftMargin} onChange={(e) => setLeftMargin(parseInt(e.target.value))} />
                    </div>
                    <div className="fs-metadata-group">
                        <label className="fs-metadata-label">Right Margin ({rightMargin})</label>
                        <input type="range" className="range range-xs range-primary" min="-200" max="500" step="10" value={rightMargin} onChange={(e) => setRightMargin(parseInt(e.target.value))} />
                    </div>
                    <div className="fs-metadata-group">
                        <label className="fs-metadata-label">Y-Offset ({yOffset})</label>
                        <input type="range" className="range range-xs range-primary" min="-500" max="500" step="10" value={yOffset} onChange={(e) => setYOffset(parseInt(e.target.value))} />
                    </div>
                </div>
            </div>

            <div className="fs-workspace">
                <div className="fs-sidebar">
                    <div className="fs-tool-selector vertical">
                        <div className="fs-tool-group-wrapper">
                            <button 
                                className={`fs-tool-btn ${activeTool === 'brush' ? 'active' : ''}`}
                                onClick={() => setActiveTool('brush')}
                                title="Brush"
                            >
                                <Pencil size={18} />
                            </button>
                            <div className="fs-tool-options-popup right">
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
                            className={`fs-tool-btn ${activeTool === 'rect' ? 'active' : ''}`}
                            onClick={() => setActiveTool('rect')}
                            title="Rectangle"
                        >
                            <Square size={18} />
                        </button>
                        <button 
                            className={`fs-tool-btn ${activeTool === 'circle' ? 'active' : ''}`}
                            onClick={() => setActiveTool('circle')}
                            title="Circle"
                        >
                            <Circle size={18} />
                        </button>
                        <button 
                            className={`fs-tool-btn ${activeTool === 'triangle' ? 'active' : ''}`}
                            onClick={() => setActiveTool('triangle')}
                            title="Triangle"
                        >
                            <Triangle size={18} />
                        </button>
                        <div className="fs-tool-separator horizontal" />
                        <button 
                            className={`fs-tool-btn ${activeTool === 'eraser' ? 'active' : ''}`}
                            onClick={() => setActiveTool('eraser')}
                            title="Eraser (Point)"
                        >
                            <Eraser size={18} />
                        </button>
                        <button 
                            className={`fs-tool-btn ${activeTool === 'select_erase' ? 'active' : ''}`}
                            onClick={() => setActiveTool('select_erase')}
                            title="Select Erase (Box)"
                        >
                            <SquareDashed size={18} />
                        </button>
                        <div className="fs-tool-separator horizontal" />
                        <button 
                            className={`fs-tool-btn ${isFillMode ? 'active' : ''}`}
                            onClick={() => setIsFillMode(!isFillMode)}
                            title="Fill Mode (Closes & fills path)"
                        >
                            <Download size={18} style={{ transform: 'rotate(180deg)' }} />
                        </button>
                        <div className="fs-tool-separator horizontal" />
                        <button 
                            className={`fs-tool-btn ${isCalligraphy ? 'active' : ''}`}
                            onClick={() => { setIsCalligraphy(!isCalligraphy); setIsBrushPen(false); }}
                            title="Calligraphy Mode (Rounded Taper)"
                        >
                            <Feather size={18} />
                        </button>
                        <button 
                            className={`fs-tool-btn ${isBrushPen ? 'active' : ''}`}
                            onClick={() => { setIsBrushPen(!isBrushPen); setIsCalligraphy(false); }}
                            title="Asian Brush Pen (Sharp Taper)"
                        >
                            <PenTool size={18} />
                        </button>
                        <div className="fs-tool-separator horizontal" />
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
                        <div className="fs-tool-separator horizontal" />
                        <button 
                            className={`fs-tool-btn ${isSnapToGrid ? 'active' : ''}`}
                            onClick={() => setIsSnapToGrid(!isSnapToGrid)}
                            title="Snap to Grid"
                        >
                            <Grid size={18} />
                        </button>
                    </div>
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
            </div>

            <div className="fs-controls">
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
                        // The char was previously used for preview logic, safe to remove if unused.
                        
                        // Render the mini-svg inline
                        const renderMiniSVG = (key) => (
                            <svg 
                                key={key}
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
                                        if (stroke.length === 1 && (stroke[0].x === -999 || stroke[0].x === -998)) return null;
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
                                {renderMiniSVG('svg-1')} {renderMiniSVG('svg-2')} — 
                                The quick {renderMiniSVG('svg-3')} brown {renderMiniSVG('svg-4')} fox jumps over the lazy {renderMiniSVG('svg-5')}.
                            </>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}
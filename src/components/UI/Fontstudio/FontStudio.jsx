// src/components/UI/Modal/FontStudioModal.jsx
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { compileFont } from '../../../utils/fontCompiler.jsx';
import Button from '../Buttons/Buttons.jsx';
import { RotateCcw, RotateCw, Trash2, Download, Pencil, Minus, Spline, Eraser, Feather, FlipHorizontal, FlipVertical, Grid, Square, Circle, Triangle, SquareDashed, PenTool, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ZoomIn, ZoomOut, MousePointer, Maximize2, Sliders, Move, Crosshair, Brush, Type, Plus } from 'lucide-react';
import { exportStrokesAsSVG } from '../../../utils/svgExporter.jsx';
import { parseSVGToStrokes } from '../../../utils/svgImporter.jsx';
import './fontStudio.css';

const generateCurvePoints = (p0, p1, p2) => {
    const points = [];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
        const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
        if (!isNaN(x) && !isNaN(y)) {
            points.push({ x, y });
        }
    }
    return points;
};

const generateSerifStroke = (p1, p2, bSize, lCap) => {
    if (!p1 || !p2) return null;
    let dx = p2.x - p1.x;
    let dy = p2.y - p1.y;
    let len = Math.sqrt(dx*dx + dy*dy);
    if (len < 0.001) return null; // Prevent zero length or NaN
    
    const nx = -dy / len; 
    const ny = dx / len;  
    const vx = dx / len;  
    const vy = dy / len;  
    
    const w = bSize * 1.6; 
    const d = bSize * 1.5; 
    const r = bSize * 0.5; 
    const t = bSize * 0.3; 
    
    const capOffset = (lCap === 'butt' ? 0 : bSize * 0.5);
    const bx = p1.x - vx * capOffset;
    const by = p1.y - vy * capOffset;
    
    const pts = [];
    // Start at bottom right tip
    pts.push({ x: bx + nx * w, y: by + ny * w });
    // Bottom left tip
    pts.push({ x: bx - nx * w, y: by - ny * w });
    
    // Top left tip (adds thickness to serif)
    const trTip = { x: bx - nx * w + vx * t, y: by - ny * w + vy * t };
    pts.push(trTip);
    
    // Curve into stem (left)
    const curve1 = generateCurvePoints(
        trTip, 
        { x: bx - nx * r + vx * t, y: by - ny * r + vy * t },
        { x: bx - nx * r + vx * d, y: by - ny * r + vy * d } 
    );
    pts.push(...curve1.slice(1));
    
    // Cross over to right stem
    const stemLeft = { x: bx + nx * r + vx * d, y: by + ny * r + vy * d };
    pts.push(stemLeft);
    
    // Curve out to right tip
    const tlTip = { x: bx + nx * w + vx * t, y: by + ny * w + vy * t };
    const curve2 = generateCurvePoints(
        stemLeft,
        { x: bx + nx * r + vx * t, y: by + ny * r + vy * t },
        tlTip
    );
    pts.push(...curve2.slice(1));
    
    // Close the path perfectly
    pts.push(pts[0]);
    
    const stroke = pts;
    stroke.isFilled = true;
    stroke.lineCap = lCap;
    return stroke;
};

export default function FontStudioModal({ targetLabel, onSave, onCancel, existingCharCode }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [strokes, setStrokes] = useState([]);
    const [currentStroke, setCurrentStroke] = useState([]);
    const [brushSize, setBrushSize] = useState(5);
    const [activeTool, setActiveTool] = useState('brush'); // 'brush', 'line', 'curve', 'rect', 'circle', 'select_erase'
    const [isCalligraphy, setIsCalligraphy] = useState(false);
    const [isBrushPen, setIsBrushPen] = useState(false);
    const [isChisel, setIsChisel] = useState(false);
    const [isPaintBrush, setIsPaintBrush] = useState(false);
    const [isSerifPen, setIsSerifPen] = useState(false);
    const [chiselAngle, setChiselAngle] = useState(45);
    const [symmetryMode, setSymmetryMode] = useState('none'); // 'none', 'horizontal', 'vertical'
    const [isSnapToGrid, setIsSnapToGrid] = useState(false);
    const [isSnapToMetrics, setIsSnapToMetrics] = useState(false);
    const [gridDivisions, setGridDivisions] = useState(20);
    const gridSize = gridDivisions > 0 ? 300 / gridDivisions : 0;
    const [zoom, setZoom] = useState(1.0);
    const [lineCap, setLineCap] = useState('round'); // 'round', 'butt'
    const [isFillMode, setIsFillMode] = useState(false);
    const [interactionPoints, setInteractionPoints] = useState([]); // [P0, P1, P2]
    const [interactionStage, setInteractionStage] = useState(0); // 0: Idle, 1: Dragging, 2: Setting Curve Control
    
    // Node Editing States
    const [selectedNode, setSelectedNode] = useState(null); // { strokeIndex, pointIndex }
    const [hoveredNode, setHoveredNode] = useState(null); // { strokeIndex, pointIndex } or { isSegment, insertAfterIndex, insertPoint }
    const [cursorCoords, setCursorCoords] = useState({x: 0, y: 0});
    const [fineNudgeStep, setFineNudgeStep] = useState(1);

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
                    setIsChisel(firstStroke.isChisel ?? false);
                    setIsPaintBrush(firstStroke.isPaintBrush ?? false);
                    setIsSerifPen(firstStroke.isSerifPen ?? false);
                    actualStrokes = existingStrokes.slice(1);
                } else if (Array.isArray(firstStroke) && firstStroke.length === 1 && firstStroke[0].x === -999) {
                    setIsCalligraphy(true);
                    actualStrokes = existingStrokes.slice(1);
                } else if (Array.isArray(firstStroke) && firstStroke.length === 1 && firstStroke[0].x === -998) {
                    setIsBrushPen(true);
                    actualStrokes = existingStrokes.slice(1);
                } else if (Array.isArray(firstStroke) && firstStroke.length === 1 && firstStroke[0].x === -997) {
                    setIsPaintBrush(true);
                    actualStrokes = existingStrokes.slice(1);
                } else if (Array.isArray(firstStroke) && firstStroke.length === 1 && firstStroke[0].x === -996) {
                    setIsSerifPen(true);
                    actualStrokes = existingStrokes.slice(1);
                }
                
                // Migrate legacy strokes that relied on global isSerifPen renderer
                if (firstStroke.isSerifPen || (Array.isArray(firstStroke) && firstStroke.length === 1 && firstStroke[0].x === -996)) {
                    const migratedStrokes = [];
                    actualStrokes.forEach(s => {
                        migratedStrokes.push(s);
                        if (Array.isArray(s) && s.length >= 2 && !s.isFilled) {
                            const s1 = generateSerifStroke(s[0], s[1], 5, s.lineCap || 'round'); // Use default brush size 5
                            if (s1) migratedStrokes.push(s1);
                            const s2 = generateSerifStroke(s[s.length-1], s[s.length-2], 5, s.lineCap || 'round');
                            if (s2) migratedStrokes.push(s2);
                        }
                    });
                    actualStrokes = migratedStrokes;
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
            const validStrokes = opt.strokes.filter(s => {
                // Filter out new-format metadata objects
                if (!Array.isArray(s) && s.isMeta) return false;
                // Filter out legacy calligraphy/brush pen markers
                if (s.length === 1 && (s[0].x === -999 || s[0].x === -998)) return false;
                return true;
            });
            setBackgroundStrokes(validStrokes);
        }
    };

    const handleLoadToCanvas = () => {
        const opt = drawnGlyphsOptions.find(o => o.id == selectedReferenceId);
        if (opt) {
            // Filter out meta objects and legacy calligraphy/brush pen markers
            const validStrokes = opt.strokes.filter(s => {
                if (!Array.isArray(s) && s.isMeta) return false;
                if (s.length === 1 && (s[0].x === -999 || s[0].x === -998)) return false;
                return true;
            });
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
        
        ctx.save();
        ctx.scale(2, 2); // Scale by 2 for retina clarity (canvas width is 600, CSS is 300)
        
        ctx.lineWidth = brushSize; 
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--tx').trim() || '#0f172a';
        
        ctx.save();
        ctx.translate(150, 150);
        ctx.scale(zoom, zoom);
        ctx.translate(-150, -150);

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
                    ctx.lineWidth = currentWidth;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            } else if (isPaintBrush) {
                for (let i = 0; i < stroke.length - 1; i++) {
                    const p1 = stroke[i];
                    const p2 = stroke[i+1];
                    const hash = (p1.x * 13 + p1.y * 17) % 10;
                    const widthMult = 0.7 + (hash / 10) * 0.4;
                    ctx.lineWidth = brushSize * widthMult;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }

            } else if (isChisel) {
                const radAngle = (chiselAngle * Math.PI) / 180;
                for (let i = 0; i < stroke.length - 1; i++) {
                    const p1 = stroke[i];
                    const p2 = stroke[i+1];
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const strokeAngle = Math.atan2(dy, dx);
                    const diff = Math.abs(Math.sin(strokeAngle - radAngle));
                    const w = Math.max(1.5, brushSize * (0.2 + 0.8 * diff));
                    ctx.lineWidth = w;
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
                    ctx.stroke();
                }
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
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Render Nodes if in node_edit mode
        if (activeTool === 'node_edit') {
            strokes.forEach((stroke, sIdx) => {
                if (!Array.isArray(stroke) || stroke.isMeta) return;
                
                // Draw connecting segments
                ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--acc').trim() || '#3b82f6';
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 2]);
                ctx.beginPath();
                ctx.moveTo(stroke[0].x, stroke[0].y);
                for (let i = 1; i < stroke.length; i++) {
                    ctx.lineTo(stroke[i].x, stroke[i].y);
                }
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Draw anchor points
                stroke.forEach((pt, pIdx) => {
                    const isSelected = selectedNode && selectedNode.strokeIndex === sIdx && selectedNode.pointIndex === pIdx;
                    
                    if (isSelected) {
                        ctx.fillStyle = '#ef4444'; // Red for selected
                        ctx.fillRect(pt.x - 4, pt.y - 4, 8, 8);
                    } else {
                        ctx.fillStyle = '#3b82f6'; // Blue for default
                        ctx.fillRect(pt.x - 3, pt.y - 3, 6, 6);
                    }
                });
            });
        }
        ctx.restore();
        ctx.restore(); // Restore retina scale
    }, [strokes, currentStroke, brushSize, isCalligraphy, isBrushPen, isChisel, isPaintBrush, isSerifPen, backgroundStrokes, backgroundText, zoom, activeTool, selectedNode]);

    const getCoords = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        // Since canvas is 600x600 but rendered at rect.width, our internal space is 300x300, 
        // so we map client to 300 space.
        const scale = 300 / rect.width;
        let x = (e.clientX - rect.left) * scale;
        let y = (e.clientY - rect.top) * scale;
        
        // Apply zoom adjustments (relative to canvas center 150, 150)
        x = (x - 150) / zoom + 150;
        y = (y - 150) / zoom + 150;

        // Metric Snapping (ASC 20, CAP 80, X-H 140, BASE 240, DESC 280)
        if (isSnapToMetrics) {
            const metrics = [20, 80, 140, 240, 280];
            metrics.forEach(m => {
                if (Math.abs(y - m) <= 4) {
                    y = m;
                }
            });
        }

        // Grid Snapping
        if (isSnapToGrid && gridSize > 0) {
            x = Math.round(x / gridSize) * gridSize;
            y = Math.round(y / gridSize) * gridSize;
        }

        const finalCoords = { 
            x: Math.min(300, Math.max(0, Math.round(x * 10) / 10)), 
            y: Math.min(300, Math.max(0, Math.round(y * 10) / 10)) 
        };

        setCursorCoords(finalCoords);
        return finalCoords;
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

        if (activeTool === 'node_edit') {
            let foundNode = null;
            // Reverse loop to pick topmost strokes first
            for (let sIdx = strokes.length - 1; sIdx >= 0; sIdx--) {
                const stroke = strokes[sIdx];
                if (!Array.isArray(stroke) || stroke.isMeta) continue;
                for (let pIdx = stroke.length - 1; pIdx >= 0; pIdx--) {
                    const pt = stroke[pIdx];
                    const dist = Math.sqrt(Math.pow(pt.x - coords.x, 2) + Math.pow(pt.y - coords.y, 2));
                    if (dist < 10) { // 10px hit area
                        foundNode = { strokeIndex: sIdx, pointIndex: pIdx };
                        break;
                    }
                }
                if (foundNode) break;
            }
            if (foundNode) {
                setSelectedNode(foundNode);
                setIsDrawing(true);
            } else {
                setSelectedNode(null);
            }
        } else if (activeTool === 'brush') {
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
                
                const finalStroke = [...curvePoints];
                finalStroke.lineCap = lineCap;
                finalStroke.isFilled = isFillMode;

                const newStrokes = [finalStroke];
                if (isSerifPen && finalStroke.length >= 2) {
                    const s1 = generateSerifStroke(finalStroke[0], finalStroke[1], brushSize, lineCap);
                    if (s1) newStrokes.push(s1);
                    const s2 = generateSerifStroke(finalStroke[finalStroke.length-1], finalStroke[finalStroke.length-2], brushSize, lineCap);
                    if (s2) newStrokes.push(s2);
                }

                const allMirrored = [];
                newStrokes.forEach(s => {
                    allMirrored.push(s);
                    const mirror = getMirroredStroke(s, symmetryMode);
                    if (mirror) {
                        mirror.lineCap = s.lineCap;
                        mirror.isFilled = s.isFilled;
                        allMirrored.push(mirror);
                    }
                });

                setStrokes(prev => [...prev, ...allMirrored]);
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

        if (activeTool === 'node_edit' && isDrawing && selectedNode) {
            setStrokes(prev => {
                const newStrokes = [...prev];
                const stroke = [...newStrokes[selectedNode.strokeIndex]];
                stroke[selectedNode.pointIndex] = { ...stroke[selectedNode.pointIndex], x: coords.x, y: coords.y };
                newStrokes[selectedNode.strokeIndex] = stroke;
                return newStrokes;
            });
        } else if (activeTool === 'brush' && isDrawing) {
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

    const simplifyStroke = (stroke) => {
        if (!stroke || stroke.length <= 2) return stroke;
        const simplified = [stroke[0]];
        let lastPt = stroke[0];
        for (let i = 1; i < stroke.length - 1; i++) {
            const pt = stroke[i];
            const dist = Math.sqrt(Math.pow(pt.x - lastPt.x, 2) + Math.pow(pt.y - lastPt.y, 2));
            if (dist > 5) {
                simplified.push(pt);
                lastPt = pt;
            }
        }
        simplified.push(stroke[stroke.length - 1]);
        return simplified;
    };



    const handlePointerUp = () => {
        if (activeTool === 'node_edit' && isDrawing) {
            setIsDrawing(false);
        } else if (activeTool === 'brush' && isDrawing) {
            setIsDrawing(false);
            if (currentStroke.length > 0) {
                const finalStroke = simplifyStroke([...currentStroke]);
                finalStroke.lineCap = lineCap;
                finalStroke.isFilled = isFillMode;

                const newStrokes = [finalStroke];
                if (isSerifPen && finalStroke.length >= 2) {
                    const s1 = generateSerifStroke(finalStroke[0], finalStroke[1], brushSize, lineCap);
                    if (s1) newStrokes.push(s1);
                    const s2 = generateSerifStroke(finalStroke[finalStroke.length-1], finalStroke[finalStroke.length-2], brushSize, lineCap);
                    if (s2) newStrokes.push(s2);
                }

                const allMirrored = [];
                newStrokes.forEach(s => {
                    allMirrored.push(s);
                    const mirror = getMirroredStroke(s, symmetryMode);
                    if (mirror) {
                        mirror.lineCap = s.lineCap;
                        mirror.isFilled = s.isFilled;
                        allMirrored.push(mirror);
                    }
                });
                setStrokes(prev => [...prev, ...allMirrored]);
            }
            setCurrentStroke([]);
        } else if (activeTool === 'line' && isDrawing) {
            setIsDrawing(false);
            const finalStroke = [...currentStroke];
            finalStroke.lineCap = lineCap;
            finalStroke.isFilled = isFillMode;

            const newStrokes = [finalStroke];
            if (isSerifPen && finalStroke.length >= 2) {
                const s1 = generateSerifStroke(finalStroke[0], finalStroke[1], brushSize, lineCap);
                if (s1) newStrokes.push(s1);
                const s2 = generateSerifStroke(finalStroke[finalStroke.length-1], finalStroke[finalStroke.length-2], brushSize, lineCap);
                if (s2) newStrokes.push(s2);
            }

            const allMirrored = [];
            newStrokes.forEach(s => {
                allMirrored.push(s);
                const mirror = getMirroredStroke(s, symmetryMode);
                if (mirror) {
                    mirror.lineCap = s.lineCap;
                    mirror.isFilled = s.isFilled;
                    allMirrored.push(mirror);
                }
            });
            setStrokes(prev => [...prev, ...allMirrored]);
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

    const handleDeleteSelectedNode = () => {
        if (!selectedNode) return;
        setStrokes(prev => {
            const next = prev.map((stroke, sIdx) => {
                if (sIdx !== selectedNode.strokeIndex) return stroke;
                const updated = stroke.filter((_, pIdx) => pIdx !== selectedNode.pointIndex);
                updated.lineCap = stroke.lineCap;
                updated.isFilled = stroke.isFilled;
                return updated;
            }).filter(s => s.length >= 2);
            return next;
        });
        setSelectedNode(null);
    };

    const handleSmoothNode = () => {
        if (!selectedNode) return;
        setStrokes(prev => prev.map((stroke, sIdx) => {
            if (sIdx !== selectedNode.strokeIndex) return stroke;
            const pIdx = selectedNode.pointIndex;
            if (pIdx === 0 || pIdx === stroke.length - 1) return stroke;
            
            const A = stroke[pIdx - 1];
            const B = stroke[pIdx];
            const C = stroke[pIdx + 1];

            const curvePoints = [];
            const steps = 6;
            for (let t = 1/steps; t < 1; t += 1/steps) {
                const x = (1-t)*(1-t)*A.x + 2*(1-t)*t*B.x + t*t*C.x;
                const y = (1-t)*(1-t)*A.y + 2*(1-t)*t*B.y + t*t*C.y;
                curvePoints.push({x, y});
            }

            const newStroke = [...stroke];
            newStroke.splice(pIdx, 1, ...curvePoints);
            newStroke.lineCap = stroke.lineCap;
            newStroke.isFilled = stroke.isFilled;
            return newStroke;
        }));
        setSelectedNode(null);
    };

    const handleAddNodeAfter = () => {
        if (!selectedNode) return;
        setStrokes(prev => prev.map((stroke, sIdx) => {
            if (sIdx !== selectedNode.strokeIndex) return stroke;
            const pIdx = selectedNode.pointIndex;
            if (pIdx === stroke.length - 1) return stroke;
            
            const A = stroke[pIdx];
            const B = stroke[pIdx + 1];
            const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
            
            const newStroke = [...stroke];
            newStroke.splice(pIdx + 1, 0, mid);
            newStroke.lineCap = stroke.lineCap;
            newStroke.isFilled = stroke.isFilled;
            return newStroke;
        }));
        setSelectedNode({ strokeIndex: selectedNode.strokeIndex, pointIndex: selectedNode.pointIndex + 1 });
    };

    const handleClear = () => {
        setStrokes([]);
        setCurrentStroke([]);
        setSelectedNode(null);
    };

    const handleRotate = () => {
        const cx = 150;
        const cy = 150;
        setStrokes(prev => prev.map(stroke => {
            if (!Array.isArray(stroke) && stroke.isMeta) return stroke;
            if (Array.isArray(stroke) && stroke.length === 1 && (stroke[0].x === -999 || stroke[0].x === -998)) return stroke;

            const newStroke = stroke.map(pt => ({
                x: cx - (pt.y - cy),
                y: cy + (pt.x - cx)
            }));
            newStroke.lineCap = stroke.lineCap;
            newStroke.isFilled = stroke.isFilled;
            return newStroke;
        }));
    };

    const handleMove = (dx, dy) => {
        setStrokes(prev => prev.map(stroke => {
            if (!Array.isArray(stroke) && stroke.isMeta) return stroke;
            if (Array.isArray(stroke) && stroke.length === 1 && (stroke[0].x === -999 || stroke[0].x === -998)) return stroke;

            const newStroke = stroke.map(pt => ({
                x: pt.x + dx,
                y: pt.y + dy
            }));
            newStroke.lineCap = stroke.lineCap;
            newStroke.isFilled = stroke.isFilled;
            return newStroke;
        }));
    };

    const handleScaleStrokes = (factor) => {
        const cx = 150;
        const cy = 150;
        setStrokes(prev => prev.map(stroke => {
            if (!Array.isArray(stroke) && stroke.isMeta) return stroke;
            if (Array.isArray(stroke) && stroke.length === 1 && (stroke[0].x === -999 || stroke[0].x === -998)) return stroke;

            const newStroke = stroke.map(pt => ({
                x: cx + (pt.x - cx) * factor,
                y: cy + (pt.y - cy) * factor
            }));
            newStroke.lineCap = stroke.lineCap;
            newStroke.isFilled = stroke.isFilled;
            return newStroke;
        }));
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
            isBrushPen: isBrushPen,
            isChisel: isChisel,
            isPaintBrush: isPaintBrush,
            isSerifPen: isSerifPen
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
                                title="Brush Tool"
                            >
                                <Pencil size={18} />
                            </button>
                            <div className="fs-tool-options-popup right">
                                <button className={`fs-opt-btn ${lineCap === 'round' ? 'active' : ''}`} onClick={() => setLineCap('round')}>Round Cap</button>
                                <button className={`fs-opt-btn ${lineCap === 'butt' ? 'active' : ''}`} onClick={() => setLineCap('butt')}>Flat Cap</button>
                            </div>
                        </div>
                        <button 
                            className={`fs-tool-btn ${activeTool === 'node_edit' ? 'active' : ''}`}
                            onClick={() => setActiveTool('node_edit')}
                            title="Vector Node Edit Tool (Select & Drag Anchor Points)"
                        >
                            <MousePointer size={18} />
                        </button>
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
                            onClick={() => { setIsCalligraphy(!isCalligraphy); setIsBrushPen(false); setIsChisel(false); setIsPaintBrush(false); setIsSerifPen(false); }}
                            title="Calligraphy Mode (Rounded Taper)"
                        >
                            <Feather size={18} />
                        </button>
                        <button 
                            className={`fs-tool-btn ${isBrushPen ? 'active' : ''}`}
                            onClick={() => { setIsBrushPen(!isBrushPen); setIsCalligraphy(false); setIsChisel(false); setIsPaintBrush(false); setIsSerifPen(false); }}
                            title="Asian Brush Pen (Sharp Taper)"
                        >
                            <PenTool size={18} />
                        </button>
                        <button 
                            className={`fs-tool-btn ${isChisel ? 'active' : ''}`}
                            onClick={() => { setIsChisel(!isChisel); setIsCalligraphy(false); setIsBrushPen(false); setIsPaintBrush(false); setIsSerifPen(false); }}
                            title="Broad Nib Chisel Calligraphy"
                        >
                            <Sliders size={18} />
                        </button>
                        <button 
                            className={`fs-tool-btn ${isPaintBrush ? 'active' : ''}`}
                            onClick={() => { setIsPaintBrush(!isPaintBrush); setIsCalligraphy(false); setIsBrushPen(false); setIsChisel(false); setIsSerifPen(false); }}
                            title="Dry Paint Brush (Textured width)"
                        >
                            <Brush size={18} />
                        </button>
                        <button 
                            className={`fs-tool-btn ${isSerifPen ? 'active' : ''}`}
                            onClick={() => { setIsSerifPen(!isSerifPen); setIsCalligraphy(false); setIsBrushPen(false); setIsChisel(false); setIsPaintBrush(false); }}
                            title="Serif Pen (Auto-adds serifs to ends)"
                        >
                            <Type size={18} />
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
                    </div>
                </div>

                <div className="fs-canvas-wrapper-container">
                    <div className="fs-controls" style={{ width: '100%' }}>
                        <div className="fs-brush-control">
                            <span className="fs-brush-label">Size:</span>
                            <input 
                                type="range" 
                                min="2" max="20" 
                                value={brushSize} 
                                onChange={(e) => setBrushSize(parseInt(e.target.value))} 
                                className="fs-brush-slider"
                                title="Brush Thickness"
                            />
                        </div>
                        <div className="fs-brush-control">
                            <span className="fs-brush-label">Grid:</span>
                            <input 
                                type="number" 
                                min="2" max="50" step="1"
                                value={gridDivisions} 
                                onChange={(e) => setGridDivisions(parseInt(e.target.value) || 2)} 
                                style={{ width: '50px', background: 'var(--s2)', color: 'var(--tx)', border: '1px solid var(--bd)', borderRadius: '4px', padding: '2px 4px', textAlign: 'center' }}
                                title="Number of Grid Blocks"
                            />
                        </div>
                        <div className="fs-controls-group">
                            <Button variant="default" className="btn-sm" onClick={handleRotate} title="Rotate 90° Clockwise">
                                <RotateCw size={16} />
                            </Button>
                            <Button variant="default" className="btn-sm" onClick={() => handleMove(0, -gridSize)} title="Move Up"><ArrowUp size={16} /></Button>
                            <Button variant="default" className="btn-sm" onClick={() => handleMove(0, gridSize)} title="Move Down"><ArrowDown size={16} /></Button>
                            <Button variant="default" className="btn-sm" onClick={() => handleMove(-gridSize, 0)} title="Move Left"><ArrowLeft size={16} /></Button>
                            <Button variant="default" className="btn-sm" onClick={() => handleMove(gridSize, 0)} title="Move Right"><ArrowRight size={16} /></Button>
                            <Button variant="default" className="btn-sm" onClick={() => setZoom(prev => Math.min(3.0, prev + 0.25))} title="Zoom Viewport In"><ZoomIn size={16} /></Button>
                            <Button variant="default" className="btn-sm" onClick={() => setZoom(prev => Math.max(1.0, prev - 0.25))} title="Zoom Viewport Out"><ZoomOut size={16} /></Button>
                            <Button variant="default" className="btn-sm" onClick={handleUndo} title="Undo">
                                <RotateCcw size={16} />
                            </Button>
                            <Button variant="default" className="btn-sm fs-clear-btn" onClick={handleClear} title="Clear Canvas">
                                <Trash2 size={16} />
                            </Button>
                        </div>
                    </div>

                    <div 
                        className="fs-canvas-wrapper"
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                    >
                        <div className="fs-canvas-grid" style={{ 
                            backgroundSize: `${zoom * (340/300) * gridSize}px ${zoom * (340/300) * gridSize}px`, 
                            opacity: isSnapToGrid ? 0.3 : 0.1,
                            backgroundPosition: '0px 0px'
                        }}></div>
                        
                        {isSnapToMetrics && (
                            <>
                                <div className="fs-metric-line ascent"><span>ASC</span></div>
                                <div className="fs-metric-line cap-height"><span>CAP</span></div>
                                <div className="fs-metric-line x-height"><span>X-H</span></div>
                                <div className="fs-metric-line baseline"><span>BASE</span></div>
                                <div className="fs-metric-line descent"><span>DESC</span></div>
                            </>
                        )}
                        
                        <canvas ref={canvasRef} className="fs-canvas" width={600} height={600} />
                    </div>

                    <div className="fs-status-bar">
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div className="fs-status-item">
                                <Grid size={12} style={{ marginRight: '4px', opacity: isSnapToGrid ? 1 : 0.3 }}/> 
                                <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setIsSnapToGrid(!isSnapToGrid)}>
                                    Grid Snap {isSnapToGrid ? 'ON' : 'OFF'}
                                </span>
                            </div>
                            <div className="fs-status-item">
                                <Maximize2 size={12} style={{ marginRight: '4px', opacity: isSnapToMetrics ? 1 : 0.3 }}/> 
                                <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setIsSnapToMetrics(!isSnapToMetrics)}>
                                    Metric Snap {isSnapToMetrics ? 'ON' : 'OFF'}
                                </span>
                            </div>
                            <div className="fs-status-item" style={{ visibility: zoom !== 1.0 ? 'visible' : 'hidden' }}>
                                <span style={{ cursor: 'pointer', color: 'var(--acc)' }} onClick={() => setZoom(1.0)}>
                                    Reset Zoom ({(zoom * 100).toFixed(0)}%)
                                </span>
                            </div>
                        </div>

                        {selectedNode && (
                            <div className="fs-status-item node-info">
                                <span>Node [{selectedNode.strokeIndex + 1}:{selectedNode.pointIndex + 1}]</span>
                                <button className="fs-mini-del-btn" onClick={handleSmoothNode} title="Smooth Corner (Turns corner into curve)">
                                    <Spline size={14} />
                                </button>
                                <button className="fs-mini-del-btn" onClick={handleAddNodeAfter} title="Add Node Between Next">
                                    <Plus size={14} />
                                </button>
                                <button className="fs-mini-del-btn" onClick={handleDeleteSelectedNode} title="Delete Node (Del)">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        )}
                    </div>
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
                                                strokeWidth={stroke.isFilled ? 0 : brushSize} 
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
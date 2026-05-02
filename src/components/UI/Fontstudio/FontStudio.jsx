// src/components/UI/Modal/FontStudioModal.jsx
import React, { useRef, useState, useEffect } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { compileFont } from '../../../utils/fontCompiler.jsx';
import Button from '../Buttons/Buttons.jsx';
import { RotateCcw, Trash2 } from 'lucide-react';
import './fontStudio.css';

export default function FontStudioModal({ targetLabel, onSave, onCancel }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [strokes, setStrokes] = useState([]);
    const [currentStroke, setCurrentStroke] = useState([]);
    const [brushSize, setBrushSize] = useState(5);

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
            ctx.beginPath();
            ctx.moveTo(stroke[0].x, stroke[0].y);
            for (let i = 1; i < stroke.length; i++) {
                ctx.lineTo(stroke[i].x, stroke[i].y);
            }
            ctx.stroke();
        });
    }, [strokes, brushSize]);

    const getCoords = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handlePointerDown = (e) => {
        e.currentTarget.setPointerCapture(e.pointerId); // Locks pointer to canvas
        setIsDrawing(true);
        const coords = getCoords(e);
        setCurrentStroke([coords]);
    };

    const handlePointerMove = (e) => {
        if (!isDrawing) return;
        const coords = getCoords(e);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        ctx.lineWidth = brushSize; 
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--tx').trim() || '#0f172a';

        const lastPoint = currentStroke[currentStroke.length - 1];
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();

        setCurrentStroke(prev => [...prev, coords]);
    };

    const handlePointerUp = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        if (currentStroke.length > 0) {
            setStrokes(prev => [...prev, currentStroke]);
        }
        setCurrentStroke([]);
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
        const updatedGlyphDb = { ...customGlyphs, [charCode]: strokes };
        
        // 2. Compile the font
        const base64Font = await compileFont(updatedGlyphDb);
        
        // 3. Save everything to Zustand
        if (base64Font) {
            addCustomGlyph(charCode, strokes, base64Font);
            
            // 4. Give the generated Unicode character and the strokes back to the parent component!
            const newChar = String.fromCharCode(charCode);
            onSave(newChar, strokes);
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
                <div className="fs-brush-control">
                    <span className="fs-brush-label">Brush:</span>
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
                        <RotateCcw size={16} /> Undo
                    </Button>
                    <Button variant="default" className="btn-sm fs-clear-btn" onClick={handleClear}>
                        <Trash2 size={16} /> Clear
                    </Button>
                </div>
            </div>

            <div className="fs-action-btns">
                <Button variant="cancel" className="fs-btn-full" onClick={onCancel}>Cancel</Button>
                <Button variant="edit" className="fs-btn-full fs-btn-save" onClick={handleSave}>💾 Save Glyph</Button>
            </div>
        </div>
    );
}
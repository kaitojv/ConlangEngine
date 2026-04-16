// src/components/UI/Modal/FontStudioModal.jsx
import React, { useRef, useState, useEffect } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { compileFont } from '../../../utils/fontCompiler.jsx';

//'


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
        ctx.strokeStyle = '#0f172a';
        
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
        ctx.strokeStyle = '#0f172a';

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
            
            // 4. Give the generated Unicode character back to the parent component!
            const newChar = String.fromCharCode(charCode);
            onSave(newChar);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
                <h3 style={{ margin: 0, color: 'var(--tx)' }}>Drawing: <span className="custom-font-text">{targetLabel}</span></h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--tx2)' }}>Draw your custom ideogram below.</p>
            </div>

            <div style={{ position: 'relative', border: '2px solid var(--bd)', borderRadius: '8px', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
                {/* Visual Blueprint Background Lines */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.5 }}></div>
                
                <canvas
                    ref={canvasRef}
                    width={300}
                    height={300}
                    style={{ display: 'block', touchAction: 'none' }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                />
            </div>

            <div style={{ display: 'flex', gap: '8px', width: '300px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--tx2)' }}>Brush:</span>
                    <input 
                        type="range" 
                        min="2" max="15" 
                        value={brushSize} 
                        onChange={(e) => setBrushSize(parseInt(e.target.value))} 
                        style={{ width: '80px' }}
                    />
                </div>
                <div>
                    <button onClick={handleUndo} style={{ padding: '6px 12px', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}>↩️ Undo</button>
                    <button onClick={handleClear} style={{ padding: '6px 12px', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: '4px', cursor: 'pointer', color: 'var(--err)' }}>🗑️ Clear</button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
                <button onClick={onCancel} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--bd)', color: 'var(--tx2)', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSave} style={{ flex: 1, padding: '12px', background: 'var(--acc)', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>💾 Save Glyph</button>
            </div>
        </div>
    );
}
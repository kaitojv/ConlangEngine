import React, { useState, useRef, useEffect } from 'react';
import Modal from '@/components/UI/Modal/Modal.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import { 
    Pencil, Minus, ArrowRight, Square, Circle, Eraser, 
    RotateCcw, RotateCw, Trash2, Grid, Check, Type
} from 'lucide-react';
import { compressAndValidateImage, DEFAULT_MAX_IMAGE_MB } from './imageCompressor.js';

const PALETTE = [
    { label: 'Ink', color: '#f8fafc' },
    { label: 'Primary', color: '#38bdf8' },
    { label: 'Indigo', color: '#818cf8' },
    { label: 'Emerald', color: '#34d399' },
    { label: 'Amber', color: '#fbbf24' },
    { label: 'Rose', color: '#fb7185' },
    { label: 'Purple', color: '#c084fc' },
    { label: 'Dark', color: '#1e293b' }
];

const STROKE_WIDTHS = [
    { label: 'Fine', value: 1.5 },
    { label: 'Medium', value: 3 },
    { label: 'Bold', value: 5 },
    { label: 'Thick', value: 8 }
];

const BACKGROUNDS = [
    { id: 'grid', label: 'Linguistic Grid' },
    { id: 'dots', label: 'Dot Grid' },
    { id: 'dark', label: 'Plain Dark' },
    { id: 'transparent', label: 'Transparent' }
];

export default function WikiDoodleModal({ isOpen, onClose, onInsert, t }) {
    const tr = (key, fallback) => (t ? t(key) || fallback : fallback);
    const canvasRef = useRef(null);
    const [tool, setTool] = useState('pen'); // 'pen' | 'line' | 'arrow' | 'rect' | 'circle' | 'eraser' | 'text'
    const [color, setColor] = useState('#38bdf8');
    const [strokeWidth, setStrokeWidth] = useState(3);
    const [bgStyle, setBgStyle] = useState('grid');
    const [caption, setCaption] = useState('');
    const [alignment, setAlignment] = useState('center');
    const [width, setWidth] = useState('100%');

    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [snapshot, setSnapshot] = useState(null);
    const [textPromptOpen, setTextPromptOpen] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [textCoords, setTextCoords] = useState({ x: 50, y: 50 });

    // History for Undo / Redo
    const historyRef = useRef([]);
    const historyIndexRef = useRef(-1);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const updateHistoryButtons = () => {
        setCanUndo(historyIndexRef.current > 0);
        setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    };

    const pushHistory = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Truncate any redos
        historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
        historyRef.current.push(imgData);
        historyIndexRef.current = historyRef.current.length - 1;
        updateHistoryButtons();
    };

    const initCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        historyRef.current = [];
        historyIndexRef.current = -1;
        pushHistory();
    };

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                initCanvas();
            }, 50);
        }
    }, [isOpen]);

    const handleUndo = () => {
        if (historyIndexRef.current > 0) {
            historyIndexRef.current -= 1;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
            updateHistoryButtons();
        }
    };

    const handleRedo = () => {
        if (historyIndexRef.current < historyRef.current.length - 1) {
            historyIndexRef.current += 1;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
            updateHistoryButtons();
        }
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pushHistory();
    };

    // Coordinate helper
    const getCanvasCoords = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const handleMouseDown = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const coords = getCanvasCoords(e);

        if (tool === 'text') {
            setTextCoords(coords);
            setTextPromptOpen(true);
            return;
        }

        setIsDrawing(true);
        setStartPos(coords);

        // Save snapshot for shapes preview
        setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));

        ctx.beginPath();
        ctx.strokeStyle = tool === 'eraser' ? '#000000' : color;
        ctx.lineWidth = tool === 'eraser' ? strokeWidth * 4 : strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.arc(coords.x, coords.y, strokeWidth * 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (tool === 'pen') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.moveTo(coords.x, coords.y);
        }
    };

    const handleMouseMove = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const coords = getCanvasCoords(e);

        if (tool === 'pen') {
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
        } else if (tool === 'eraser') {
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
        } else if (snapshot) {
            // Restore snapshot to draw shape preview smoothly
            ctx.putImageData(snapshot, 0, 0);
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = color;
            ctx.lineWidth = strokeWidth;

            if (tool === 'line') {
                ctx.beginPath();
                ctx.moveTo(startPos.x, startPos.y);
                ctx.lineTo(coords.x, coords.y);
                ctx.stroke();
            } else if (tool === 'arrow') {
                drawArrow(ctx, startPos.x, startPos.y, coords.x, coords.y, strokeWidth);
            } else if (tool === 'rect') {
                ctx.strokeRect(startPos.x, startPos.y, coords.x - startPos.x, coords.y - startPos.y);
            } else if (tool === 'circle') {
                const rx = Math.abs(coords.x - startPos.x) / 2;
                const ry = Math.abs(coords.y - startPos.y) / 2;
                const cx = (coords.x + startPos.x) / 2;
                const cy = (coords.y + startPos.y) / 2;
                ctx.beginPath();
                ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    };

    const handleMouseUp = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.globalCompositeOperation = 'source-over';
        }
        pushHistory();
    };

    // Draw Arrow Helper
    const drawArrow = (ctx, fromx, fromy, tox, toy, width) => {
        const headlen = Math.max(10, width * 3.5);
        const angle = Math.atan2(toy - fromy, tox - fromx);
        ctx.beginPath();
        ctx.moveTo(fromx, fromy);
        ctx.lineTo(tox, toy);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(tox, toy);
        ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
        ctx.lineTo(tox, toy);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
    };

    const handleAddText = () => {
        if (!textInput.trim()) {
            setTextPromptOpen(false);
            return;
        }
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = color;
            ctx.font = `600 ${Math.max(16, strokeWidth * 6)}px system-ui, sans-serif`;
            ctx.fillText(textInput.trim(), textCoords.x, textCoords.y);
            pushHistory();
        }
        setTextInput('');
        setTextPromptOpen(false);
    };

    // Render final image and insert
    const handleInsert = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Render doodle with selected background pattern
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        const eCtx = exportCanvas.getContext('2d');

        if (bgStyle === 'dark') {
            eCtx.fillStyle = '#0f172a';
            eCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        } else if (bgStyle === 'grid') {
            eCtx.fillStyle = '#0b0f19';
            eCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
            // Draw grid
            eCtx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
            eCtx.lineWidth = 1;
            const step = 20;
            for (let x = 0; x < exportCanvas.width; x += step) {
                eCtx.beginPath();
                eCtx.moveTo(x, 0);
                eCtx.lineTo(x, exportCanvas.height);
                eCtx.stroke();
            }
            for (let y = 0; y < exportCanvas.height; y += step) {
                eCtx.beginPath();
                eCtx.moveTo(0, y);
                eCtx.lineTo(exportCanvas.width, y);
                eCtx.stroke();
            }
        } else if (bgStyle === 'dots') {
            eCtx.fillStyle = '#0b0f19';
            eCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
            eCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            const step = 20;
            for (let x = 10; x < exportCanvas.width; x += step) {
                for (let y = 10; y < exportCanvas.height; y += step) {
                    eCtx.beginPath();
                    eCtx.arc(x, y, 1.2, 0, Math.PI * 2);
                    eCtx.fill();
                }
            }
        }

        // Overlay user drawing
        eCtx.drawImage(canvas, 0, 0);

        const dataUrl = exportCanvas.toDataURL('image/webp', 0.88);
        const result = await compressAndValidateImage(dataUrl, { maxMB: DEFAULT_MAX_IMAGE_MB });

        if (!result.ok) {
            alert(result.error);
            return;
        }

        onInsert({
            src: result.dataUrl,
            caption: caption.trim() || tr('wiki.richText.doodleTool', 'Doodle & Sketch'),
            alt: caption.trim() || tr('wiki.richText.doodleTool', 'Doodle & Sketch'),
            align: alignment,
            width: width || '100%'
        });

        onClose();
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={tr('wiki.richText.doodleTool', 'Doodle & Drawing Tool')}
        >
            <div className="wiki-doodle-container">
                {/* Canvas Toolbar */}
                <div className="wiki-doodle-toolbar">
                    {/* Tools */}
                    <div className="wiki-doodle-tool-group">
                        <button 
                            type="button" 
                            className={`wiki-doodle-btn ${tool === 'pen' ? 'active' : ''}`}
                            onClick={() => setTool('pen')}
                            title={tr('wiki.richText.doodlePen', 'Pencil / Freehand')}
                        >
                            <Pencil size={15} />
                        </button>
                        <button 
                            type="button" 
                            className={`wiki-doodle-btn ${tool === 'line' ? 'active' : ''}`}
                            onClick={() => setTool('line')}
                            title={tr('wiki.richText.doodleLine', 'Straight Line')}
                        >
                            <Minus size={15} />
                        </button>
                        <button 
                            type="button" 
                            className={`wiki-doodle-btn ${tool === 'arrow' ? 'active' : ''}`}
                            onClick={() => setTool('arrow')}
                            title={tr('wiki.richText.doodleArrow', 'Arrow (Pointer)')}
                        >
                            <ArrowRight size={15} />
                        </button>
                        <button 
                            type="button" 
                            className={`wiki-doodle-btn ${tool === 'rect' ? 'active' : ''}`}
                            onClick={() => setTool('rect')}
                            title={tr('wiki.richText.doodleRect', 'Rectangle')}
                        >
                            <Square size={15} />
                        </button>
                        <button 
                            type="button" 
                            className={`wiki-doodle-btn ${tool === 'circle' ? 'active' : ''}`}
                            onClick={() => setTool('circle')}
                            title={tr('wiki.richText.doodleCircle', 'Circle')}
                        >
                            <Circle size={15} />
                        </button>
                        <button 
                            type="button" 
                            className={`wiki-doodle-btn ${tool === 'text' ? 'active' : ''}`}
                            onClick={() => setTool('text')}
                            title={tr('wiki.richText.doodleText', 'Text / Label')}
                        >
                            <Type size={15} />
                        </button>
                        <button 
                            type="button" 
                            className={`wiki-doodle-btn ${tool === 'eraser' ? 'active' : ''}`}
                            onClick={() => setTool('eraser')}
                            title={tr('wiki.richText.doodleEraser', 'Eraser')}
                        >
                            <Eraser size={15} />
                        </button>
                    </div>

                    <div className="wiki-toolbar-divider"></div>

                    {/* Palette */}
                    <div className="wiki-doodle-colors">
                        {PALETTE.map(p => (
                            <button
                                key={p.color}
                                type="button"
                                className={`wiki-color-swatch ${color === p.color ? 'active' : ''}`}
                                style={{ backgroundColor: p.color }}
                                onClick={() => { setColor(p.color); if (tool === 'eraser') setTool('pen'); }}
                                title={p.label}
                            >
                                {color === p.color && <Check size={11} color={p.color === '#f8fafc' ? '#000' : '#fff'} />}
                            </button>
                        ))}
                    </div>

                    <div className="wiki-toolbar-divider"></div>

                    {/* Widths */}
                    <div className="wiki-doodle-widths">
                        {STROKE_WIDTHS.map(w => (
                            <button
                                key={w.label}
                                type="button"
                                className={`wiki-width-btn ${strokeWidth === w.value ? 'active' : ''}`}
                                onClick={() => setStrokeWidth(w.value)}
                                title={w.label}
                            >
                                <div 
                                    className="wiki-width-line" 
                                    style={{ height: `${Math.min(6, w.value)}px`, backgroundColor: color }} 
                                />
                            </button>
                        ))}
                    </div>

                    <div className="wiki-toolbar-divider"></div>

                    {/* Background */}
                    <select 
                        className="wiki-select wiki-select-compact"
                        value={bgStyle}
                        onChange={(e) => setBgStyle(e.target.value)}
                        title="Canvas Background Pattern"
                    >
                        <option value="grid">{tr('wiki.richText.doodleGrid', 'Linguistic Grid')}</option>
                        <option value="dots">{tr('wiki.richText.doodleDots', 'Dot Grid')}</option>
                        <option value="dark">{tr('wiki.richText.doodleDark', 'Plain Dark')}</option>
                        <option value="transparent">{tr('wiki.richText.doodleTransparent', 'Transparent')}</option>
                    </select>

                    <div className="wiki-toolbar-spacer"></div>

                    {/* Undo / Redo / Clear */}
                    <button 
                        type="button" 
                        className="wiki-doodle-btn" 
                        onClick={handleUndo} 
                        disabled={!canUndo}
                        title="Undo (Ctrl+Z)"
                    >
                        <RotateCcw size={14} />
                    </button>
                    <button 
                        type="button" 
                        className="wiki-doodle-btn" 
                        onClick={handleRedo} 
                        disabled={!canRedo}
                        title="Redo"
                    >
                        <RotateCw size={14} />
                    </button>
                    <button 
                        type="button" 
                        className="wiki-doodle-btn wiki-doodle-del" 
                        onClick={handleClear} 
                        title={tr('wiki.richText.clearCanvas', 'Clear Canvas')}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>

                {/* Text Placement Modal Overlay */}
                {textPromptOpen && (
                    <div className="wiki-text-prompt-box">
                        <Input 
                            label={tr('wiki.richText.doodleText', 'Enter Text Label')} 
                            placeholder="e.g. [+nasal], SVO, Dialect A..." 
                            value={textInput} 
                            onChange={(e) => setTextInput(e.target.value)}
                            autoFocus
                        />
                        <div className="wiki-text-prompt-actions">
                            <Button variant="sec" onClick={() => setTextPromptOpen(false)}>{tr('wiki.richText.cancel', 'Cancel')}</Button>
                            <Button variant="imp" onClick={handleAddText}>{tr('wiki.richText.placeTextBtn', 'Place Text')}</Button>
                        </div>
                    </div>
                )}

                {/* Canvas Drawing Area */}
                <div className={`wiki-canvas-wrapper bg-pattern-${bgStyle}`}>
                    <canvas
                        ref={canvasRef}
                        width={840}
                        height={460}
                        className="wiki-drawing-canvas"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    />
                </div>

                {/* Caption & Controls */}
                <div className="wiki-doodle-footer-row">
                    <div style={{ flex: 1 }}>
                        <Input 
                            label={tr('wiki.richText.doodleCaption', 'Doodle Caption')} 
                            placeholder={tr('wiki.richText.captionPlaceholder', 'e.g. Map of ancient dialects, Royal Syllabary...')} 
                            value={caption} 
                            onChange={(e) => setCaption(e.target.value)} 
                        />
                    </div>
                    <div style={{ width: '140px' }}>
                        <label className="wiki-field-label">{tr('wiki.richText.widthLabel', 'Size')}</label>
                        <select 
                            className="wiki-select"
                            value={width}
                            onChange={(e) => setWidth(e.target.value)}
                        >
                            <option value="100%">{tr('wiki.richText.fullWidth', '100% (Full Width)')}</option>
                            <option value="75%">{tr('wiki.richText.largeWidth', '75% (Large)')}</option>
                            <option value="50%">{tr('wiki.richText.mediumWidth', '50% (Medium)')}</option>
                            <option value="35%">{tr('wiki.richText.compactWidth', '35% (Compact)')}</option>
                            <option value="25%">{tr('wiki.richText.thumbWidth', '25% (Thumbnail)')}</option>
                        </select>
                    </div>
                    <div style={{ width: '130px' }}>
                        <label className="wiki-field-label">{tr('wiki.richText.alignmentLabel', 'Alignment')}</label>
                        <select 
                            className="wiki-select"
                            value={alignment}
                            onChange={(e) => setAlignment(e.target.value)}
                        >
                            <option value="center">{tr('wiki.richText.alignCenter', 'Center')}</option>
                            <option value="left">{tr('wiki.richText.alignLeft', 'Left')}</option>
                            <option value="right">{tr('wiki.richText.alignRight', 'Right')}</option>
                        </select>
                    </div>
                </div>

                <div className="wiki-modal-footer">
                    <Button variant="sec" onClick={onClose}>{tr('wiki.richText.cancel', 'Cancel')}</Button>
                    <Button variant="imp" onClick={handleInsert}>
                        {tr('wiki.richText.insertDoodleBtn', 'Insert Doodle')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

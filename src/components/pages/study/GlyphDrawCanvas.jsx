// src/components/pages/study/GlyphDrawCanvas.jsx
// Student-facing drawing surface for the "Draw the Glyph" exercise.
import React, { useRef, useEffect, useCallback } from 'react';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import { Undo2, Eraser, Eye, EyeOff } from 'lucide-react';
import './glyphDrawCanvas.css';

/** Authoring space used by FontStudio/StrokeOrderViewer (viewBox 0 0 300 300). */
export const GLYPH_SPACE = 300;

/** Backing-store multiplier for crisp lines on high-DPI screens. */
const RETINA = 2;

const cssVar = (name, fallback) => {
    if (typeof document === 'undefined') return fallback;
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
};

/** Paints one polyline. Single-point strokes are drawn as dots. */
const paintStroke = (ctx, stroke, { color, width, alpha = 1 }) => {
    if (!stroke || stroke.length === 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.length === 1) {
        ctx.beginPath();
        ctx.arc(stroke[0].x, stroke[0].y, width / 2, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
        ctx.stroke();
    }
    ctx.restore();
};

/**
 * @param {Array}  drawnStrokes - student's strokes, in GLYPH_SPACE units
 * @param {Function} onChange  - receives the new stroke array
 * @param {Array}  targetStrokes - optional guide outline (0-300 space)
 * @param {boolean} showGuide - render the guide outline faintly
 * @param {boolean} disabled  - freeze input (after answering)
 */
export default function GlyphDrawCanvas({
    drawnStrokes = [],
    onChange,
    targetStrokes = [],
    showGuide = false,
    disabled = false,
    strokeColor,
    guideColor
}) {
    const canvasRef = useRef(null);
    const isDrawingRef = useRef(false);
    const currentRef = useRef([]);

    const ink = strokeColor || cssVar('--tx', '#0f172a');
    const guide = guideColor || cssVar('--tx2', '#94a3b8');

    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(RETINA, RETINA);

        // Guide outline sits underneath the student's ink.
        if (showGuide) {
            targetStrokes.forEach((s) => paintStroke(ctx, s, { color: guide, width: 14, alpha: 0.28 }));
        }

        drawnStrokes.forEach((s) => paintStroke(ctx, s, { color: ink, width: 14 }));
    }, [drawnStrokes, targetStrokes, showGuide, ink, guide]);

    useEffect(() => { redraw(); }, [redraw]);

    // Theme colours arrive from CSS custom properties, so repaint on change.
    useEffect(() => {
        const observer = new MutationObserver(() => redraw());
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });
        return () => observer.disconnect();
    }, [redraw]);

    const toGlyphCoords = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * GLYPH_SPACE,
            y: ((e.clientY - rect.top) / rect.height) * GLYPH_SPACE
        };
    };

    const paintSegment = (stroke) => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(RETINA, RETINA);
        paintStroke(ctx, stroke, { color: ink, width: 14 });
    };

const handlePointerDown = (e) => {
        if (disabled) return;
        // Ignore secondary mouse buttons so right-click panning still works.
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);

        const p = toGlyphCoords(e);
        currentRef.current = [p];
        isDrawingRef.current = true;

        // Paint immediately so a simple tap registers visually.
        paintSegment([p]);
    };

    const handlePointerMove = (e) => {
        if (!isDrawingRef.current || disabled) return;
        e.preventDefault();

        const p = toGlyphCoords(e);
        const last = currentRef.current[currentRef.current.length - 1];

        // Drop sub-pixel jitter so the resampled stroke stays compact.
        if (last && Math.hypot(p.x - last.x, p.y - last.y) < 0.6) return;
        currentRef.current.push(p);
        paintSegment([last, p]);
    };

    const endStroke = () => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        const stroke = currentRef.current;
        currentRef.current = [];
        if (stroke.length > 0) onChange([...drawnStrokes, stroke]);
    };

    const handleUndo = () => {
        if (disabled || drawnStrokes.length === 0) return;
        onChange(drawnStrokes.slice(0, -1));
    };

    const handleClear = () => {
        if (disabled || drawnStrokes.length === 0) return;
        onChange([]);
    };

    return (
        <div className="gdc-wrapper">
            <div
                className={`gdc-surface ${disabled ? 'disabled' : ''}`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endStroke}
                onPointerLeave={endStroke}
                onPointerCancel={endStroke}
            >
                <canvas
                    ref={canvasRef}
                    className="gdc-canvas"
                    width={GLYPH_SPACE * RETINA}
                    height={GLYPH_SPACE * RETINA}
                />
            </div>

            <div className="gdc-toolbar">
                <Button variant="default" onClick={handleUndo} disabled={disabled || drawnStrokes.length === 0} style={{ padding: '6px 10px' }} title="Undo last stroke">
                    <Undo2 size={15} />
                </Button>
                <Button variant="default" onClick={handleClear} disabled={disabled || drawnStrokes.length === 0} style={{ padding: '6px 10px' }} title="Clear drawing">
                    <Eraser size={15} />
                </Button>
                <span className="gdc-count">
                    {drawnStrokes.length} stroke{drawnStrokes.length === 1 ? '' : 's'}
                </span>
                <span className="gdc-guide-toggle">
                    {showGuide ? <Eye size={14} /> : <EyeOff size={14} />}
                    {showGuide ? 'Guide on' : 'No guide'}
                </span>
            </div>
        </div>
    );
}

import React from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { cleanStrokes } from '../../../utils/strokeOrderResolver.js';
import './glyphPreviewBadge.css';

/**
 * Renders a visual preview of a glyph.
 * If strokes exist in customGlyphs (or passed via props), renders vector SVG strokes.
 * This guarantees that custom PUA characters (e.g. U+E000) NEVER render as tofu boxes.
 */
export default function GlyphPreviewBadge({
    glyph,
    strokes = null,
    size = 48,
    strokeColor = 'var(--acc)',
    strokeWidth = 14,
    showCode = false,
    className = '',
    onClick,
    title,
}) {
    const customGlyphs = useConfigStore(state => state.customGlyphs) || {};

    let resolvedStrokes = null;
    let codePointHex = null;

    if (strokes && Array.isArray(strokes)) {
        resolvedStrokes = cleanStrokes(strokes);
    } else if (glyph) {
        let code = null;
        if (typeof glyph === 'number') {
            code = glyph;
        } else if (typeof glyph === 'string' && glyph.length > 0) {
            code = glyph.codePointAt(0);
        }

        if (code != null) {
            codePointHex = `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;
            const rawStrokes = customGlyphs[code] || customGlyphs[String(code)] || customGlyphs[glyph];
            if (rawStrokes) {
                resolvedStrokes = cleanStrokes(rawStrokes);
            }
        }
    }

    const hasStrokes = resolvedStrokes && resolvedStrokes.length > 0;
    const isInteractive = Boolean(onClick);

    if (!glyph && !hasStrokes) {
        return (
            <div
                className={`glyph-preview-badge glyph-preview-empty ${className}`}
                style={{ width: size, height: size }}
                title={title || 'No glyph'}
            >
                —
            </div>
        );
    }

    return (
        <div className="glyph-badge-container">
            <div
                className={`glyph-preview-badge ${isInteractive ? 'interactive' : ''} ${className}`}
                style={{ width: size, height: size }}
                onClick={onClick}
                title={title || (codePointHex ? `Glyph (${codePointHex})` : 'Glyph')}
            >
                {hasStrokes ? (
                    <svg viewBox="0 0 300 300" width={size * 0.85} height={size * 0.85}>
                        {resolvedStrokes.map((stroke, i) => {
                            if (stroke.length < 2) {
                                const pt = stroke[0] || { x: 150, y: 150 };
                                return (
                                    <circle
                                        key={i}
                                        cx={pt.x}
                                        cy={pt.y}
                                        r={strokeWidth / 2}
                                        fill={strokeColor}
                                    />
                                );
                            }
                            const d = `M ${stroke[0].x} ${stroke[0].y} ` +
                                stroke.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
                            return (
                                <path
                                    key={i}
                                    d={d + (stroke.isFilled ? ' Z' : '')}
                                    stroke={strokeColor}
                                    strokeWidth={stroke.isFilled ? 0 : strokeWidth}
                                    strokeLinecap={stroke.lineCap || 'round'}
                                    strokeLinejoin="round"
                                    fill={stroke.isFilled ? strokeColor : 'none'}
                                />
                            );
                        })}
                    </svg>
                ) : (
                    <span
                        className="glyph-preview-text custom-font-text notranslate"
                        style={{ fontSize: `${size * 0.55}px` }}
                    >
                        {glyph}
                    </span>
                )}
            </div>
            {showCode && codePointHex && (
                <span className="glyph-code-tag">{codePointHex}</span>
            )}
        </div>
    );
}

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
    plain = false,
}) {
    const customGlyphs = useConfigStore(state => state.customGlyphs) || {};
    const scriptDataById = useConfigStore(state => state.scriptDataById) || {};

    let resolvedStrokes = null;
    let codePointHex = null;

    if (strokes && Array.isArray(strokes)) {
        resolvedStrokes = cleanStrokes(strokes);
    } else if (glyph) {
        let code = null;
        if (typeof glyph === 'number') {
            code = glyph;
        } else if (typeof glyph === 'string' && glyph.length > 0) {
            const chars = [...glyph];
            if (chars.length === 1) {
                code = glyph.codePointAt(0);
            }
        }

        if (code != null) {
            codePointHex = `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;
        }

        let rawStrokes = null;
        if (code != null) {
            rawStrokes = customGlyphs[code] || customGlyphs[String(code)] || customGlyphs[glyph];
        } else {
            rawStrokes = customGlyphs[glyph];
        }

        if (!rawStrokes && scriptDataById) {
            for (const scriptData of Object.values(scriptDataById)) {
                const sg = scriptData?.customGlyphs;
                if (!sg) continue;
                if (code != null && (sg[code] || sg[String(code)] || sg[glyph])) {
                    rawStrokes = sg[code] || sg[String(code)] || sg[glyph];
                    break;
                } else if (sg[glyph]) {
                    rawStrokes = sg[glyph];
                    break;
                }
            }
        }

        if (rawStrokes) {
            resolvedStrokes = cleanStrokes(rawStrokes);
        }
    }

    const hasStrokes = resolvedStrokes && resolvedStrokes.length > 0;
    const isInteractive = Boolean(onClick);
    const finalStrokeColor = (plain && strokeColor === 'var(--acc)') ? 'currentColor' : strokeColor;

    if (plain) {
        if (hasStrokes) {
            return (
                <span
                    className={`glyph-plain-preview ${className}`}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: size,
                        height: size,
                        flexShrink: 0,
                        verticalAlign: 'middle',
                    }}
                    onClick={onClick}
                    title={title || (codePointHex ? `Glyph (${codePointHex})` : 'Glyph')}
                >
                    <svg viewBox="0 0 300 300" width={size} height={size} style={{ display: 'block' }}>
                        {resolvedStrokes.map((stroke, i) => {
                            if (stroke.length < 2) {
                                const pt = stroke[0] || { x: 150, y: 150 };
                                return (
                                    <circle
                                        key={i}
                                        cx={pt.x}
                                        cy={pt.y}
                                        r={strokeWidth / 2}
                                        fill={finalStrokeColor}
                                    />
                                );
                            }
                            const d = `M ${stroke[0].x} ${stroke[0].y} ` +
                                stroke.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
                            return (
                                <path
                                    key={i}
                                    d={d + (stroke.isFilled ? ' Z' : '')}
                                    stroke={finalStrokeColor}
                                    strokeWidth={stroke.isFilled ? 0 : strokeWidth}
                                    strokeLinecap={stroke.lineCap || 'round'}
                                    strokeLinejoin="round"
                                    fill={stroke.isFilled ? finalStrokeColor : 'none'}
                                />
                            );
                        })}
                    </svg>
                </span>
            );
        }

        return (
            <span
                className={`glyph-plain-preview custom-font-text notranslate ${className}`}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'inherit',
                    color: 'inherit',
                    lineHeight: 1,
                }}
                onClick={onClick}
                title={title || (codePointHex ? `Glyph (${codePointHex})` : 'Glyph')}
            >
                {glyph || '—'}
            </span>
        );
    }

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

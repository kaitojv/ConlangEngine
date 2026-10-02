// src/components/UI/Glyph/GlyphBaselineRow.jsx
// Renders a run of glyphs on a shared baseline, honouring each glyph's own
// character gaps (left/right margins) and yOffset, the same values the font
// compiler uses for advance width. This keeps the preview typographically
// faithful to the rendered script - important for connected/baseline scripts
// where glyphs visually join.
import React from 'react';
import { BASELINE_Y } from './resolveGlyphStrokes.js';
import './glyphBaselineRow.css';

/** Authoring space each glyph is authored in. */
const SPACE = 300;

/** Visual stroke weight, in authoring units. */
const STROKE_W = 14;

/**
 * Lays out one glyph and returns the pen advance, matching fontCompiler's formula:
 *   advance = leftMargin + inkWidth * 2.85 * scale + rightMargin + strokeWidth * scale
 * Using the same maths here means the gaps shown match the real font metrics.
 */
const layoutGlyph = (metrics) => {
    const scale = metrics?.scale ?? 1;
    const width = metrics ? metrics.ink.width * 2.85 * scale : SPACE;
    const left = metrics ? metrics.leftMargin : 0;
    const right = metrics ? metrics.rightMargin : 0;
    const advance = left + width + right + STROKE_W * scale;
    // Shift so the glyph's ink starts just after its left bearing.
    const offsetX = left - (metrics ? metrics.ink.minX * scale : 0);
    return { advance, offsetX, offsetY: metrics?.yOffset ?? 0 };
};

/**
 * Walks the run once, advancing a pen by each glyph's own advance width and
 * inserting the separator only at component boundaries. Pure: returns the
 * finished positions so the render pass never mutates state.
 */
const layoutRun = (parts, separator) => {
    const out = [];
    let pen = 0;
    parts.forEach((part, i) => {
        const layout = layoutGlyph(part.metrics);
        if (part.isNewComponent && i > 0 && separator) {
            pen += separator.length * 6;
        }
        out.push({
            part,
            key: `${part.char}-${i}`,
            gx: pen + layout.offsetX,
            gy: layout.offsetY,
            midX: pen + layout.advance / 2
        });
        pen += layout.advance;
    });
    return { items: out, total: pen };
};

const GlyphBaselineRow = ({
    parts = [],
    separator = '',
    strokeColor = 'var(--acc)',
    strokeWidth = STROKE_W,
    height = 96,
    showBaseline = true,
    className = ''
}) => {
    if (parts.length === 0) return null;

    const { items, total } = layoutRun(parts, separator);
    if (total <= 0) return null;

    const viewHeight = height;
    const viewWidth = total;
    const scale = viewHeight / SPACE;

    return (
        <div className={`gbr-wrapper ${className}`} style={{ width: viewWidth * scale, height: viewHeight }}>
            <svg
                className="gbr-svg"
                viewBox={`0 0 ${viewWidth} ${viewHeight}`}
                width={viewWidth * scale}
                height={viewHeight}
                role="img"
            >
                {showBaseline && (
                    <line
                        x1={0}
                        y1={BASELINE_Y}
                        x2={viewWidth}
                        y2={BASELINE_Y}
                        stroke="var(--bd)"
                        strokeWidth={1.5}
                        strokeDasharray="6 5"
                    />
                )}

                {items.map((item) => {
                        const { part, gx, gy, midX } = item;
                        if (!part.metrics || part.metrics.strokes.length === 0) {
                            return (
                                <text
                                    key={item.key}
                                    x={midX}
                                    y={BASELINE_Y - 12}
                                    textAnchor="middle"
                                    fill="var(--tx3)"
                                    fontSize="26"
                                >
                                    {part.char}
                                </text>
                            );
                        }

                        return (
                            <g key={item.key} transform={`translate(${gx} ${gy})`}>
                                {part.metrics.strokes.map((stroke, si) => {
                                    if (!stroke.length) return null;
                                    if (stroke.length === 1) {
                                        return (
                                            <circle
                                                key={si}
                                                cx={stroke[0].x}
                                                cy={stroke[0].y}
                                                r={strokeWidth / 2}
                                                fill={strokeColor}
                                            />
                                        );
                                    }
                                    const d = `M ${stroke[0].x} ${stroke[0].y} ` +
                                        stroke.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ');
                                    return (
                                        <path
                                            key={si}
                                            d={d + (stroke.isFilled ? ' Z' : '')}
                                            stroke={strokeColor}
                                            strokeWidth={stroke.isFilled ? 0 : strokeWidth}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            fill={stroke.isFilled ? strokeColor : 'none'}
                                        />
                                    );
                                })}
                            </g>
                        );
                    })}
            </svg>
        </div>
    );
};

export default GlyphBaselineRow;

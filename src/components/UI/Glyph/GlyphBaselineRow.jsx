// src/components/UI/Glyph/GlyphBaselineRow.jsx
// Renders a run of glyphs on a shared baseline using the very metrics
// fontCompiler bakes into the compiled font - per-glyph character gaps, yOffset,
// ink scale and trace width - and then charges the Graphism "Letter Spacing"
// between them exactly like the CSS letter-spacing the real font receives.
// Reading those settings straight from the store is what keeps a drawn run in
// step with the rendered script at all times, which matters most for connected
// scripts where a mismatched gap breaks the word apart.
import React from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { layoutRun } from './glyphRunLayout.js';
import './glyphBaselineRow.css';

/** Font-unit padding so the dashed baseline is never clipped by the viewBox. */
const BASELINE_PAD = 12;

const GlyphBaselineRow = ({
    parts = [],
    separator = '',
    strokeColor = 'var(--acc)',
    height = 96,
    showBaseline = true,
    className = '',
    // Optional overrides; by default the Graphism settings are the source of truth.
    letterSpacing,
    fontScale,
    traceWidth
}) => {
    const settings = useConfigStore(state => state.typographySettings) || {};

    const spacing = Number.isFinite(letterSpacing)
        ? letterSpacing
        : (settings.letterSpacing ?? 0);
    const scaleSetting = Number.isFinite(fontScale)
        ? fontScale
        : (settings.customFontScale ?? 1);
    const traceSetting = Number.isFinite(traceWidth)
        ? traceWidth
        : (settings.traceWidth ?? 30);

    if (parts.length === 0) return null;

    const { items, box } = layoutRun(parts, {
        separator,
        traceWidth: traceSetting,
        letterSpacing: spacing,
        fontScale: scaleSetting
    });
    if (!box || box.width <= 0 || box.height <= 0) return null;

    // The font baseline sits at fontY 0, i.e. below the whole ink box.
    const top = showBaseline ? Math.min(box.y, -BASELINE_PAD) : box.y;
    const bottom = showBaseline
        ? Math.max(box.y + box.height, BASELINE_PAD)
        : box.y + box.height;
    const viewHeight = bottom - top;

    const scale = height / viewHeight;
    const viewWidth = box.width * scale;

    return (
        <div className={`gbr-wrapper ${className}`} style={{ width: viewWidth, height }}>
            <svg
                className="gbr-svg"
                viewBox={`${box.x} ${top} ${box.width} ${viewHeight}`}
                width={viewWidth}
                height={height}
                role="img"
            >
                {showBaseline && (
                    <line
                        x1={box.x}
                        y1={0}
                        x2={box.x + box.width}
                        y2={0}
                        stroke="var(--bd)"
                        strokeWidth={1.5}
                        strokeDasharray="6 5"
                        vectorEffect="non-scaling-stroke"
                    />
                )}

                {items.map((item) => {
                        if (!item.hasInk) {
                            return (
                                <text
                                    key={item.key}
                                    x={item.centerX}
                                    y={0}
                                    textAnchor="middle"
                                    fill="var(--tx3)"
                                    fontSize={item.fontSize}
                                >
                                    {item.part.char}
                                </text>
                            );
                        }

                        return (
                            <g key={item.key} transform={item.transform}>
                                {item.part.metrics.strokes.map((stroke, si) => {
                                    if (!stroke.length) return null;
                                    if (stroke.length === 1) {
                                        return (
                                            <circle
                                                key={si}
                                                cx={stroke[0].x}
                                                cy={stroke[0].y}
                                                r={item.strokeWidth / 2}
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
                                            strokeWidth={stroke.isFilled ? 0 : item.strokeWidth}
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

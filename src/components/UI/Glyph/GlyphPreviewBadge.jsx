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
    hideOnEmpty = false,
    scriptId = null,
}) {
    const customGlyphs = useConfigStore(state => state.customGlyphs) || {};
    const scriptDataById = useConfigStore(state => state.scriptDataById) || {};
    const rootAlphabetGlyphs = useConfigStore(state => state.alphabetGlyphs) || {};
    const rootSyllabaryMap = useConfigStore(state => state.syllabaryMap) || {};
    const activeScriptSystemId = useConfigStore(state => state.activeScriptSystemId);
    const defaultScriptId = useConfigStore(state => state.scriptRules?.defaultScriptId) || 'default';

    let resolvedStrokes = null;
    let codePointHex = null;

    if (strokes && Array.isArray(strokes)) {
        resolvedStrokes = cleanStrokes(strokes);
    } else if (glyph) {
        const targetScriptId = scriptId || activeScriptSystemId || defaultScriptId;
        const targetScriptData = scriptDataById?.[targetScriptId];

        // Resolve aliases if glyph is a letter/syllable rather than a PUA char
        let effectiveGlyph = glyph;
        if (typeof glyph === 'string') {
            const agMap = targetScriptData?.alphabetGlyphs || rootAlphabetGlyphs;
            const sylMap = targetScriptData?.syllabaryMap || rootSyllabaryMap;
            if (agMap?.[glyph]) {
                effectiveGlyph = agMap[glyph];
            } else if (sylMap?.[glyph]) {
                effectiveGlyph = sylMap[glyph];
            }
        }

        let code = null;
        if (typeof effectiveGlyph === 'number') {
            code = effectiveGlyph;
        } else if (typeof effectiveGlyph === 'string' && effectiveGlyph.length > 0) {
            const chars = [...effectiveGlyph];
            if (chars.length === 1) {
                code = effectiveGlyph.codePointAt(0);
            }
        }

        if (code != null) {
            codePointHex = `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;
        }

        const lookupInMap = (map) => {
            if (!map) return null;
            if (code != null) {
                return map[code] || map[String(code)] || map[effectiveGlyph] || map[glyph] || null;
            }
            return map[effectiveGlyph] || map[glyph] || null;
        };

        // 1. Scoped script customGlyphs
        let rawStrokes = lookupInMap(targetScriptData?.customGlyphs);

        // 2. Root customGlyphs
        if (!rawStrokes) {
            rawStrokes = lookupInMap(customGlyphs);
        }

        // 3. Fallback to default script if different
        if (!rawStrokes && targetScriptId !== defaultScriptId && scriptDataById?.[defaultScriptId]) {
            rawStrokes = lookupInMap(scriptDataById[defaultScriptId]?.customGlyphs);
        }

        // 4. Fallback to any script ONLY if still not found
        if (!rawStrokes && scriptDataById) {
            for (const [sId, sData] of Object.entries(scriptDataById)) {
                if (sId === targetScriptId || sId === defaultScriptId) continue;
                rawStrokes = lookupInMap(sData?.customGlyphs);
                if (rawStrokes) break;
            }
        }

        if (rawStrokes) {
            resolvedStrokes = cleanStrokes(rawStrokes);
        }
    }

    const hasStrokes = resolvedStrokes && resolvedStrokes.length > 0;
    const isInteractive = Boolean(onClick);
    const finalStrokeColor = (plain && strokeColor === 'var(--acc)') ? 'currentColor' : strokeColor;

    // When requested, render nothing unless the glyph actually has custom drawn strokes.
    if (hideOnEmpty && !hasStrokes) return null;

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

import React, { useMemo } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { getScriptTypographySettings } from '../../../utils/scriptResolver.js';
import { cleanStrokes, buildSvgPathDFromStrokes, extractStrokeMetaAndPoints } from '../../../utils/fontCompiler.js';
import './glyphPreviewBadge.css';

function renderStrokeElements(resolvedStrokes, strokeColor, strokeWidth) {
    return resolvedStrokes.map((stroke, i) => {
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
    });
}

/**
 * Renders a visual preview of a glyph.
 * If strokes exist in customGlyphs (or passed via props), renders contoured vector SVG
 * matching Font Studio trace modes and the active script's Trace Width.
 * This guarantees that custom PUA characters (e.g. U+E000) NEVER render as tofu boxes.
 */
export default function GlyphPreviewBadge({
    glyph,
    strokes = null,
    size = 48,
    strokeColor = 'var(--acc)',
    strokeWidth = null,
    showCode = false,
    className = '',
    onClick,
    title,
    plain = false,
    hideOnEmpty = false,
    scriptId = null,
}) {
    const customGlyphs = useConfigStore(state => state.customGlyphs);
    const scriptDataById = useConfigStore(state => state.scriptDataById);
    const rootAlphabetGlyphs = useConfigStore(state => state.alphabetGlyphs);
    const rootSyllabaryMap = useConfigStore(state => state.syllabaryMap);
    const activeScriptSystemId = useConfigStore(state => state.activeScriptSystemId);
    const scriptRules = useConfigStore(state => state.scriptRules);
    const scriptSystems = useConfigStore(state => state.scriptSystems);
    const typographySettings = useConfigStore(state => state.typographySettings);
    const defaultScriptId = scriptRules?.defaultScriptId || 'default';
    const targetScriptId = scriptId || activeScriptSystemId || defaultScriptId;

    const { rawStrokes, resolvedStrokes, codePointHex } = useMemo(() => {
        let nextRawStrokes = null;
        let nextCodeHex = null;

        if (strokes && Array.isArray(strokes)) {
            nextRawStrokes = strokes;
        } else if (glyph) {
            const targetScriptData = scriptDataById?.[targetScriptId];
            const isDefaultTarget = targetScriptId === defaultScriptId;
            const allowCrossScriptFallback = !scriptId || isDefaultTarget;

            // Resolve aliases if glyph is a letter/syllable rather than a PUA char
            let effectiveGlyph = glyph;
            if (typeof glyph === 'string') {
                const agMap = targetScriptData?.alphabetGlyphs || (isDefaultTarget ? rootAlphabetGlyphs : {});
                const sylMap = targetScriptData?.syllabaryMap || (isDefaultTarget ? rootSyllabaryMap : {});
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
                nextCodeHex = `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;
            }

            const lookupInMap = (map) => {
                if (!map) return null;
                if (code != null) {
                    return map[code] || map[String(code)] || map[effectiveGlyph] || map[glyph] || null;
                }
                return map[effectiveGlyph] || map[glyph] || null;
            };

            // 1. Scoped script customGlyphs
            nextRawStrokes = lookupInMap(targetScriptData?.customGlyphs);

            // 2. Root customGlyphs (for default script or unscoped badges)
            if (!nextRawStrokes && allowCrossScriptFallback) {
                nextRawStrokes = lookupInMap(customGlyphs);
            }

            // 3. Fallback to default script only for unscoped badges
            if (!nextRawStrokes && !scriptId && targetScriptId !== defaultScriptId && scriptDataById?.[defaultScriptId]) {
                nextRawStrokes = lookupInMap(scriptDataById[defaultScriptId]?.customGlyphs);
            }

            // 4. Fallback to other scripts ONLY if no explicit scriptId was given
            if (!nextRawStrokes && !scriptId && scriptDataById) {
                for (const [sId, sData] of Object.entries(scriptDataById)) {
                    if (sId === targetScriptId || sId === defaultScriptId) continue;
                    nextRawStrokes = lookupInMap(sData?.customGlyphs);
                    if (nextRawStrokes) break;
                }
            }
        }

        return {
            rawStrokes: nextRawStrokes,
            resolvedStrokes: nextRawStrokes ? cleanStrokes(nextRawStrokes) : null,
            codePointHex: nextCodeHex,
        };
    }, [
        strokes, glyph, scriptId, targetScriptId, defaultScriptId,
        scriptDataById, rootAlphabetGlyphs, rootSyllabaryMap, customGlyphs
    ]);

    const effectiveStrokeWidth = useMemo(() => {
        if (Number.isFinite(Number(strokeWidth)) && strokeWidth !== null) {
            return Number(strokeWidth);
        }
        const scriptTypo = getScriptTypographySettings({
            scriptSystems,
            scriptRules,
            scriptDataById,
            typographySettings
        }, targetScriptId);
        const tw = Number.isFinite(Number(scriptTypo?.traceWidth)) ? Number(scriptTypo.traceWidth) : 30;
        // Convert font-space half-width (traceWidth) to 300x300 SVG authoring diameter: 2 * traceWidth / 2.85
        return Math.max(2, Number(((2 * tw) / 2.85).toFixed(2)));
    }, [strokeWidth, scriptSystems, scriptRules, scriptDataById, typographySettings, targetScriptId]);

    const hasStrokes = Boolean(resolvedStrokes && resolvedStrokes.length > 0);

    const contouredPathD = useMemo(() => {
        if (!hasStrokes || !rawStrokes) return '';
        const { meta, actualStrokes } = extractStrokeMetaAndPoints(rawStrokes);
        const needsContouredNib = Boolean(
            meta.isCalligraphy ||
            meta.isBrushPen ||
            meta.isChisel ||
            meta.isPaintBrush ||
            actualStrokes.some(s => s && !Array.isArray(s) && (s.isCalligraphy || s.isBrushPen || s.isChisel || s.isPaintBrush))
        );
        if (!needsContouredNib) return '';
        return buildSvgPathDFromStrokes(rawStrokes, { strokeWidth: effectiveStrokeWidth, skipUnion: true });
    }, [hasStrokes, rawStrokes, effectiveStrokeWidth]);

    const isInteractive = Boolean(onClick);
    const finalStrokeColor = (plain && strokeColor === 'var(--acc)') ? 'currentColor' : strokeColor;
    const scriptClass = targetScriptId ? `conlang-script-${targetScriptId}` : '';

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
                        {contouredPathD ? (
                            <path d={contouredPathD} fill={finalStrokeColor} fillRule="nonzero" stroke="none" />
                        ) : (
                            renderStrokeElements(resolvedStrokes, finalStrokeColor, effectiveStrokeWidth)
                        )}
                    </svg>
                </span>
            );
        }

        return (
            <span
                className={`glyph-plain-preview custom-font-text ${scriptClass} notranslate ${className}`}
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
                        {contouredPathD ? (
                            <path d={contouredPathD} fill={strokeColor} fillRule="nonzero" stroke="none" />
                        ) : (
                            renderStrokeElements(resolvedStrokes, strokeColor, effectiveStrokeWidth)
                        )}
                    </svg>
                ) : (
                    <span
                        className={`glyph-preview-text custom-font-text ${scriptClass} notranslate`}
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

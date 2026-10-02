import { cleanStrokes } from '../../../utils/strokeOrderResolver.js';

/** Authoring canvas the glyph editor draws in (matches StrokeOrderViewer). */
const GLYPH_SPACE = 300;

/** Fallback side bearings when a glyph carries no meta block. */
const DEFAULT_MARGIN = 100;

const isPoint = (p) => p && typeof p.x === 'number' && typeof p.y === 'number';

/**
 * Extracts per-glyph layout metrics from a raw customGlyphs entry.
 *
 * customGlyphs entries may carry a leading meta object (fontCompiler reads it as
 * `isMeta`) holding leftMargin/rightMargin - the character gaps - plus yOffset,
 * which lifts a glyph off the baseline. Those are exactly the values the font
 * compiler uses for advance width, so reusing them here keeps the preview
 * typographically identical to the rendered script.
 *
 * Returns null for glyphs with no drawable ink.
 */
export function getGlyphMetrics(raw) {
    if (!raw || !Array.isArray(raw)) return null;

    let meta = null;
    let strokes = raw;

    const first = raw[0];
    if (!Array.isArray(first) && first && first.isMeta) {
        meta = first;
        strokes = raw.slice(1);
    } else if (Array.isArray(first) && first.length === 1 && first[0]?.x === -999) {
        meta = { isCalligraphy: true };
        strokes = raw.slice(1);
    } else if (Array.isArray(first) && first.length === 1 && first[0]?.x === -998) {
        meta = { isBrushPen: true };
        strokes = raw.slice(1);
    }

    const clean = cleanStrokes(strokes);
    if (clean.length === 0) return null;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const stroke of clean) {
        for (const p of stroke) {
            if (!isPoint(p)) continue;
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }
    }
    if (!Number.isFinite(minX)) return null;

    return {
        strokes: clean,
        leftMargin: Number.isFinite(meta?.leftMargin) ? meta.leftMargin : DEFAULT_MARGIN,
        rightMargin: Number.isFinite(meta?.rightMargin) ? meta.rightMargin : DEFAULT_MARGIN,
        yOffset: Number.isFinite(meta?.yOffset) ? meta.yOffset : 0,
        scale: Number.isFinite(meta?.scale) ? meta.scale : 1,
        // Ink extent in authoring units, used for hit-testing the baseline.
        ink: { minX, maxX, minY, maxY, width: maxX - minX }
    };
}

/** Y coordinate of the shared baseline in authoring space. */
export const BASELINE_Y = GLYPH_SPACE * 0.78;


/**
 * Pure stroke lookup for a single glyph. Mirrors GlyphPreviewBadge's own resolution:
 * explicit strokes, then root customGlyphs, then any script's customGlyphs.
 *
 * Deliberately a plain function rather than a hook so callers resolving MANY glyphs
 * at once (e.g. the number preview, which maps over numeral components) can call it
 * inside a loop without violating the Rules of Hooks.
 */
/**
 * Looks up the raw customGlyphs entry for a glyph without stripping its meta block,
 * so callers can read per-glyph layout (margins, yOffset). Returns null when the
 * glyph has no entry or is not exactly one character.
 *
 * Deliberately a plain function rather than a hook so callers resolving MANY glyphs
 * at once (e.g. the number preview) can call it inside a loop without violating the
 * Rules of Hooks.
 */
export function resolveRawGlyph(glyph, { customGlyphs = {}, scriptDataById = {}, strokes = null } = {}) {
    if (strokes && Array.isArray(strokes)) return strokes;
    if (!glyph) return null;

    let code = null;
    if (typeof glyph === 'number') {
        code = glyph;
    } else if (typeof glyph === 'string' && glyph.length > 0) {
        const chars = [...glyph];
        if (chars.length === 1) code = glyph.codePointAt(0);
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

    return rawStrokes || null;
}

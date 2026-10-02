import { cleanStrokes } from '../../../utils/strokeOrderResolver.js';

/**
 * Pure stroke lookup for a single glyph. Mirrors GlyphPreviewBadge's own resolution:
 * explicit strokes, then root customGlyphs, then any script's customGlyphs.
 *
 * Deliberately a plain function rather than a hook so callers resolving MANY glyphs
 * at once (e.g. the number preview, which maps over numeral components) can call it
 * inside a loop without violating the Rules of Hooks.
 */
export function resolveGlyphStrokesPure(glyph, { customGlyphs = {}, scriptDataById = {}, strokes = null } = {}) {
    if (strokes && Array.isArray(strokes)) return cleanStrokes(strokes);
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

    return rawStrokes ? cleanStrokes(rawStrokes) : null;
}

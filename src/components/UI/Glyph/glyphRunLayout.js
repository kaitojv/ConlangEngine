// src/components/UI/Glyph/glyphRunLayout.js
// Pure layout maths for a run of drawn glyphs.
//
// The numbers below are a deliberate copy of src/utils/fontCompiler.jsx, so a
// preview advances its pen exactly like the compiled font does. Once the advance
// is faithful, the Graphism "Letter Spacing" slider can be added on top exactly
// the way the browser adds it to the real font - which is the only way the drawn
// preview and the rendered script can ever agree.
//
// Kept import-free and JSX-free so it can be unit tested straight from Node.

/** Authoring canvas every glyph is drawn in. */
export const GLYPH_SPACE = 300;

/** fontCompiler turns authoring units into font units with this factor. */
export const INK_SCALE = 2.85;

/**
 * fontCompiler's vertical mapping, verbatim:
 *   fontY = FONT_Y_ORIGIN + (FONT_Y_CEILING - y * INK_SCALE) * scale + yOffset
 * Font space counts upwards from the baseline, authoring space counts down.
 */
const FONT_Y_ORIGIN = 400;
const FONT_Y_CEILING = 400;

/** Advance fontCompiler gives a glyph it has no points for. */
export const BLANK_ADVANCE = 500;

/** fontCompiler's 'space' advance, charged per separator character. */
export const SEPARATOR_ADVANCE = 500;

/** Cap height (font units) of the placeholder char shown for an inkless glyph. */
const FALLBACK_FONT_SIZE = 600;

const num = (value, fallback) => (Number.isFinite(value) ? value : fallback);

/** unitsPerEm the compiled font gets for a given Custom Font Scale. */
export const fontUnitsPerEm = (fontScale = 1) =>
    Math.max(10, Math.round(1000 / (num(fontScale, 1) || 1)));

/**
 * Pen advance, in font units, that the Graphism letter spacing contributes
 * between two glyphs. `letterSpacing` is in em - the same unit useFontInjector
 * writes into the `letter-spacing` CSS - so it has to be resolved against the
 * compiled font's unitsPerEm before it can join a font-unit advance.
 */
export const letterSpacingUnits = (letterSpacing = 0, fontScale = 1) =>
    num(letterSpacing, 0) * fontUnitsPerEm(fontScale);

/**
 * Places one glyph, mirroring fontCompiler's path maths:
 *   advance = leftMargin + inkWidth*2.85*scale + rightMargin + traceWidth*scale
 * `x`/`y` are the translate() of a group that maps authoring points into font
 * units; multiplying that group by `k` reproduces the 2.85*scale ink scale, which
 * is what makes the drawn ink fill the advance the compiler reserved for it.
 */
export const layoutGlyph = (metrics, traceWidth = 30) => {
    if (!metrics || !metrics.ink) {
        return { advance: BLANK_ADVANCE, scale: 1, k: 1, x: 0, y: 0, stroke: 0, blank: true };
    }
    const scale = num(metrics.scale, 1);
    const k = INK_SCALE * scale;
    const left = num(metrics.leftMargin, 0);
    const right = num(metrics.rightMargin, 0);
    return {
        advance: left + metrics.ink.width * k + right + num(traceWidth, 30) * scale,
        scale,
        k,
        // Stroke the compiled font gives this glyph: it extrudes +-traceWidth*scale.
        stroke: Math.max(1, 2 * num(traceWidth, 30) * scale),
        x: left - metrics.ink.minX * k,
        // Negated because SVG y grows downwards while font y grows upwards.
        y: -(FONT_Y_ORIGIN + FONT_Y_CEILING * scale) - num(metrics.yOffset, 0),
        blank: false
    };
};

/**
 * Walks the run once, advancing a pen by each glyph's own advance width, charging
 * the letter spacing at every inter-glyph step, and returning the finished
 * positions plus the ink box they occupy. Pure, so the render pass never mutates.
 */
export const layoutRun = (parts = [], {
    separator = '',
    traceWidth = 30,
    letterSpacing = 0,
    fontScale = 1
} = {}) => {
    const gap = letterSpacingUnits(letterSpacing, fontScale);
    const items = [];
    let pen = 0;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    parts.forEach((part, i) => {
        if (part.isNewComponent && i > 0 && separator) {
            pen += [...separator].length * SEPARATOR_ADVANCE;
        }

        const hasInk = Boolean(part.metrics && part.metrics.strokes && part.metrics.strokes.length);
        const layout = layoutGlyph(hasInk ? part.metrics : null, traceWidth);
        const tx = pen + layout.x;
        const item = { part, key: `${part.char}-${i}`, hasInk, centerX: pen + layout.advance / 2 };

        if (hasInk) {
            const { ink } = part.metrics;
            const pad = layout.stroke / 2;
            item.transform = `translate(${tx} ${layout.y}) scale(${layout.k})`;
            // The group is scaled by k, so the stroke is pre-divided to land on the
            // thickness the compiled font would have drawn.
            item.strokeWidth = layout.stroke / layout.k;
            minX = Math.min(minX, tx + ink.minX * layout.k - pad);
            maxX = Math.max(maxX, tx + ink.maxX * layout.k + pad);
            minY = Math.min(minY, layout.y + ink.minY * layout.k - pad);
            maxY = Math.max(maxY, layout.y + ink.maxY * layout.k + pad);
        } else {
            item.fontSize = FALLBACK_FONT_SIZE;
            minX = Math.min(minX, pen);
            maxX = Math.max(maxX, pen + layout.advance);
            minY = Math.min(minY, -FALLBACK_FONT_SIZE);
            maxY = Math.max(maxY, 0);
        }

        items.push(item);
        // CSS letter-spacing sits between glyphs; nothing trails the last one.
        pen += layout.advance + (i < parts.length - 1 ? gap : 0);
    });

    if (!items.length || !Number.isFinite(minX)) {
        return { items, total: pen, box: null };
    }

    return { items, total: pen, box: { x: minX, y: minY, width: maxX - minX, height: maxY - minY } };
};

// Pure geometry, serif, style preset, stamp, and metric alignment utilities for Font Studio.

export const FONT_STUDIO_CANVAS_SIZE = 300;

export const TYPOGRAPHY_METRICS = {
    ascent: 20,
    capHeight: 80,
    xHeight: 140,
    baseline: 240,
    descent: 280,
};

export const SERIF_STYLES = [
    { id: 'none', label: 'Sans (None)', desc: 'Clean unserifed stroke endings' },
    { id: 'classic', label: 'Classic Serif', desc: 'Flared bracketed book serifs' },
    { id: 'slab', label: 'Slab Serif', desc: 'Crisp rectangular block terminals' },
    { id: 'wedge', label: 'Carved Wedge', desc: 'Chiseled triangular rune serifs' },
    { id: 'ball', label: 'Ball Terminal', desc: 'Rounded teardrop ink finials' },
];

export const NIB_STYLE_OPTIONS = [
    {
        id: 'sans',
        name: 'Monoline',
        desc: 'Uniform crisp stroke thickness',
        flags: { isCalligraphy: false, isBrushPen: false, isChisel: false, isPaintBrush: false, chiselAngle: 45, lineCap: 'round' },
    },
    {
        id: 'calligraphy',
        name: 'Calligraphy',
        desc: 'Graceful elliptical ink swell',
        flags: { isCalligraphy: true, isBrushPen: false, isChisel: false, isPaintBrush: false, chiselAngle: 45, lineCap: 'round' },
    },
    {
        id: 'chisel',
        name: 'Broad Chisel',
        desc: 'Angled blackletter / italic nib',
        flags: { isCalligraphy: false, isBrushPen: false, isChisel: true, isPaintBrush: false, chiselAngle: 35, lineCap: 'butt' },
    },
    {
        id: 'brush',
        name: 'East Brush',
        desc: 'Expressive pointed brush taper',
        flags: { isCalligraphy: false, isBrushPen: true, isChisel: false, isPaintBrush: false, chiselAngle: 45, lineCap: 'round' },
    },
    {
        id: 'paint',
        name: 'Dry Ink',
        desc: 'Organic textured edge grit',
        flags: { isCalligraphy: false, isBrushPen: false, isChisel: false, isPaintBrush: true, chiselAngle: 45, lineCap: 'round' },
    },
];

export const FONT_STYLE_PRESETS = [
    {
        id: 'sans',
        name: 'Clean Sans',
        desc: 'Modern uniform monoline strokes',
        flags: {
            isCalligraphy: false,
            isBrushPen: false,
            isChisel: false,
            isPaintBrush: false,
            isSerifPen: false,
            serifStyle: 'none',
            chiselAngle: 45,
            lineCap: 'round',
        },
    },
    {
        id: 'serif',
        name: 'Classic Serif',
        desc: 'Traditional bracketed book serifs',
        flags: {
            isCalligraphy: false,
            isBrushPen: false,
            isChisel: false,
            isPaintBrush: false,
            isSerifPen: true,
            serifStyle: 'classic',
            chiselAngle: 45,
            lineCap: 'butt',
        },
    },
    {
        id: 'slab',
        name: 'Slab Serif',
        desc: 'Bold geometric typewriter slabs',
        flags: {
            isCalligraphy: false,
            isBrushPen: false,
            isChisel: false,
            isPaintBrush: false,
            isSerifPen: true,
            serifStyle: 'slab',
            chiselAngle: 45,
            lineCap: 'butt',
        },
    },
    {
        id: 'wedge',
        name: 'Carved Wedge',
        desc: 'Flared inscriptional stone serifs',
        flags: {
            isCalligraphy: false,
            isBrushPen: false,
            isChisel: false,
            isPaintBrush: false,
            isSerifPen: true,
            serifStyle: 'wedge',
            chiselAngle: 45,
            lineCap: 'butt',
        },
    },
    {
        id: 'calligraphy',
        name: 'Calligraphy',
        desc: 'Graceful elliptical ink swell',
        flags: {
            isCalligraphy: true,
            isBrushPen: false,
            isChisel: false,
            isPaintBrush: false,
            isSerifPen: false,
            serifStyle: 'none',
            chiselAngle: 45,
            lineCap: 'round',
        },
    },
    {
        id: 'chisel',
        name: 'Broad Chisel',
        desc: 'Angled blackletter / italic nib',
        flags: {
            isCalligraphy: false,
            isBrushPen: false,
            isChisel: true,
            isPaintBrush: false,
            isSerifPen: false,
            serifStyle: 'none',
            chiselAngle: 35,
            lineCap: 'butt',
        },
    },
    {
        id: 'brush',
        name: 'East Brush',
        desc: 'Expressive pointed brush taper',
        flags: {
            isCalligraphy: false,
            isBrushPen: true,
            isChisel: false,
            isPaintBrush: false,
            isSerifPen: false,
            serifStyle: 'none',
            chiselAngle: 45,
            lineCap: 'round',
        },
    },
    {
        id: 'paint',
        name: 'Dry Ink',
        desc: 'Organic textured edge grit',
        flags: {
            isCalligraphy: false,
            isBrushPen: false,
            isChisel: false,
            isPaintBrush: true,
            isSerifPen: false,
            serifStyle: 'none',
            chiselAngle: 45,
            lineCap: 'round',
        },
    },
];

export const LEGACY_SENTINEL_COORDS = new Set([-999, -998, -997, -996]);

export function isLegacySentinelStroke(stroke) {
    return Array.isArray(stroke) && stroke.length === 1 && LEGACY_SENTINEL_COORDS.has(stroke[0]?.x);
}

/**
 * Clones a stroke array of `{x, y}` points while preserving all metadata flags.
 */
export function cloneStrokeWithMeta(points, sourceStroke = null) {
    const cloned = (points || []).map((pt) => ({ x: pt.x, y: pt.y }));
    const src = sourceStroke || points;
    if (src) {
        if (src.lineCap !== undefined) cloned.lineCap = src.lineCap;
        if (src.isFilled !== undefined) cloned.isFilled = Boolean(src.isFilled);
        if (src.isSerifPart !== undefined) cloned.isSerifPart = Boolean(src.isSerifPart);
        if (src.serifStyle !== undefined) cloned.serifStyle = src.serifStyle;
        if (src.isCalligraphy !== undefined) cloned.isCalligraphy = Boolean(src.isCalligraphy);
        if (src.isBrushPen !== undefined) cloned.isBrushPen = Boolean(src.isBrushPen);
        if (src.isChisel !== undefined) cloned.isChisel = Boolean(src.isChisel);
        if (src.isPaintBrush !== undefined) cloned.isPaintBrush = Boolean(src.isPaintBrush);
        if (src.chiselAngle !== undefined) cloned.chiselAngle = src.chiselAngle;
        if (Number.isFinite(src.strokeWeight)) cloned.strokeWeight = src.strokeWeight;
    }
    return cloned;
}

export function generateQuadraticCurvePoints(p0, p1, p2, steps = 20) {
    const points = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
        const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
        if (Number.isFinite(x) && Number.isFinite(y)) {
            points.push({ x, y });
        }
    }
    return points;
}

/**
 * Computes normalized bounding box metrics for an array of strokes (optionally restricted to selected indices).
 */
export function getStrokesBounds(strokes, indices = null) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let count = 0;

    (strokes || []).forEach((stroke, idx) => {
        if (indices && !indices.has(idx)) return;
        if (!Array.isArray(stroke) || stroke.isMeta || isLegacySentinelStroke(stroke)) return;
        stroke.forEach((pt) => {
            if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) return;
            if (pt.x < minX) minX = pt.x;
            if (pt.y < minY) minY = pt.y;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y > maxY) maxY = pt.y;
            count++;
        });
    });

    if (count === 0) return null;
    return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
        cx: (minX + maxX) / 2,
        cy: (minY + maxY) / 2,
    };
}

function mapSelectedStrokes(strokes, indices, transformPoint) {
    return (strokes || []).map((stroke, idx) => {
        if (indices && !indices.has(idx)) return stroke;
        if (!Array.isArray(stroke) || stroke.isMeta || isLegacySentinelStroke(stroke)) return stroke;
        const mapped = stroke.map((pt) => transformPoint(pt));
        return cloneStrokeWithMeta(mapped, stroke);
    });
}

export function translateStrokes(strokes, dx, dy, indices = null) {
    return mapSelectedStrokes(strokes, indices, (pt) => ({
        x: pt.x + dx,
        y: pt.y + dy,
    }));
}

export function flipStrokes(strokes, axis = 'horizontal', indices = null) {
    const bounds = getStrokesBounds(strokes, indices);
    const cx = bounds ? bounds.cx : FONT_STUDIO_CANVAS_SIZE / 2;
    const cy = bounds ? bounds.cy : FONT_STUDIO_CANVAS_SIZE / 2;
    return mapSelectedStrokes(strokes, indices, (pt) => ({
        x: axis === 'horizontal' ? cx * 2 - pt.x : pt.x,
        y: axis === 'vertical' ? cy * 2 - pt.y : pt.y,
    }));
}

export function centerStrokesHorizontally(strokes, targetX = FONT_STUDIO_CANVAS_SIZE / 2, indices = null) {
    const bounds = getStrokesBounds(strokes, indices);
    if (!bounds) return strokes;
    return translateStrokes(strokes, targetX - bounds.cx, 0, indices);
}

export function alignStrokesToBaseline(strokes, baseline = TYPOGRAPHY_METRICS.baseline, indices = null) {
    const bounds = getStrokesBounds(strokes, indices);
    if (!bounds) return strokes;
    return translateStrokes(strokes, 0, baseline - bounds.maxY, indices);
}

/**
 * Uniformly scales and centers strokes so their height (and safe horizontal span) matches a target typographic band.
 */
export function fitStrokesToBand(strokes, band = 'cap_to_base', indices = null) {
    const bounds = getStrokesBounds(strokes, indices);
    if (!bounds) return strokes;

    let minTop = TYPOGRAPHY_METRICS.capHeight;
    let maxBottom = TYPOGRAPHY_METRICS.baseline;
    if (band === 'x_to_base') {
        minTop = TYPOGRAPHY_METRICS.xHeight;
        maxBottom = TYPOGRAPHY_METRICS.baseline;
    } else if (band === 'asc_to_desc') {
        minTop = TYPOGRAPHY_METRICS.ascent;
        maxBottom = TYPOGRAPHY_METRICS.descent;
    } else if (band === 'center_square') {
        minTop = 45;
        maxBottom = 255;
    }

    const targetH = Math.max(20, maxBottom - minTop);
    const maxTargetW = 230;
    const srcW = Math.max(1e-3, bounds.width);
    const srcH = Math.max(1e-3, bounds.height);

    let scale;
    if (bounds.height < 4 && bounds.width >= 4) {
        scale = Math.min(maxTargetW / srcW, 1);
    } else if (bounds.width < 4 && bounds.height >= 4) {
        scale = targetH / srcH;
    } else {
        scale = Math.min(targetH / srcH, maxTargetW / srcW);
    }

    const scaledH = bounds.height * scale;
    const destCy = band === 'center_square'
        ? (minTop + maxBottom) / 2
        : maxBottom - scaledH / 2;
    const destCx = FONT_STUDIO_CANVAS_SIZE / 2;

    return mapSelectedStrokes(strokes, indices, (pt) => ({
        x: destCx + (pt.x - bounds.cx) * scale,
        y: destCy + (pt.y - bounds.cy) * scale,
    }));
}

export function reverseStrokesDirection(strokes, indices = null) {
    return (strokes || []).map((stroke, idx) => {
        if (indices && !indices.has(idx)) return stroke;
        if (!Array.isArray(stroke) || stroke.isMeta || isLegacySentinelStroke(stroke)) return stroke;
        const reversed = [...stroke].reverse();
        return cloneStrokeWithMeta(reversed, stroke);
    });
}

export function snapPointToTypographyGuides(point, { snapToGrid, gridSize, snapToMetrics }) {
    let { x, y } = point;

    if (snapToMetrics) {
        const lines = Object.values(TYPOGRAPHY_METRICS);
        for (const metricY of lines) {
            if (Math.abs(y - metricY) <= 5) {
                y = metricY;
                break;
            }
        }
        // Center vertical X=150 guide
        if (Math.abs(x - 150) <= 4) {
            x = 150;
        }
    }

    if (snapToGrid && gridSize > 0) {
        x = Math.round(x / gridSize) * gridSize;
        y = Math.round(y / gridSize) * gridSize;
    }

    return {
        x: Math.min(FONT_STUDIO_CANVAS_SIZE, Math.max(0, Math.round(x * 10) / 10)),
        y: Math.min(FONT_STUDIO_CANVAS_SIZE, Math.max(0, Math.round(y * 10) / 10)),
    };
}

/**
 * Generates a single parametric serif cap polygon at `tip`, facing back toward `neighbor`.
 */
export function generateSerifEndcap(tip, neighbor, options = {}) {
    if (!tip || !neighbor) return null;
    const dx = neighbor.x - tip.x;
    const dy = neighbor.y - tip.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.001) return null;

    const style = options.serifStyle || 'classic';
    if (style === 'none') return null;

    const bSize = Math.max(2, Number(options.size) || 5);
    const serifScale = Math.max(0.4, Math.min(2.6, Number(options.serifScale) || 1.15));
    const lineCap = options.lineCap || 'round';
    const endFactor = Number.isFinite(options.endWidthFactor) ? Math.max(0.15, Math.min(1.5, options.endWidthFactor)) : 1.0;

    const vx = dx / len; // Unit vector pointing back along stem toward interior
    const vy = dy / len;
    const nx = -vy;      // Unit normal perpendicular to stem
    const ny = vx;

    // Enclose the full terminal dome (radius = 0.5 * bSize * endFactor for round caps) plus crisp overhang
    const capOffset = lineCap === 'butt'
        ? Math.max(1.0, bSize * 0.16)
        : Math.max(1.4, bSize * endFactor * 0.62);
    const bx = tip.x - vx * capOffset;
    const by = tip.y - vy * capOffset;

    const halfWidth = bSize * 1.55 * serifScale;
    const halfStem = Math.max(1.2, bSize * 0.50 * Math.max(0.35, endFactor));
    const bracketDepth = Math.max(bSize * 1.55 * serifScale, capOffset + bSize * 0.95);
    const slabThickness = Math.max(2, bSize * 0.58 * serifScale + (lineCap === 'butt' ? 0 : bSize * 0.12));

    let pts = [];

    if (style === 'slab') {
        const innerOffset = Math.max(slabThickness, capOffset + bSize * 0.35);
        pts = [
            { x: bx + nx * halfWidth, y: by + ny * halfWidth },
            { x: bx - nx * halfWidth, y: by - ny * halfWidth },
            { x: bx - nx * halfWidth + vx * innerOffset, y: by - ny * halfWidth + vy * innerOffset },
            { x: bx + nx * halfWidth + vx * innerOffset, y: by + ny * halfWidth + vy * innerOffset },
            { x: bx + nx * halfWidth, y: by + ny * halfWidth },
        ];
    } else if (style === 'wedge') {
        const neckHalf = Math.max(halfStem * 0.95, 1.2);
        const neckDepth = Math.max(bracketDepth * 1.18, capOffset + bSize * 1.1);
        const flareWidth = halfWidth * 1.08;
        pts = [
            { x: bx + nx * flareWidth, y: by + ny * flareWidth },
            { x: bx - nx * flareWidth, y: by - ny * flareWidth },
            { x: bx - nx * flareWidth + vx * Math.max(slabThickness * 0.45, capOffset * 0.35), y: by - ny * flareWidth + vy * Math.max(slabThickness * 0.45, capOffset * 0.35) },
            { x: bx - nx * neckHalf + vx * neckDepth, y: by - ny * neckHalf + vy * neckDepth },
            { x: bx + nx * neckHalf + vx * neckDepth, y: by + ny * neckHalf + vy * neckDepth },
            { x: bx + nx * flareWidth + vx * Math.max(slabThickness * 0.45, capOffset * 0.35), y: by + ny * flareWidth + vy * Math.max(slabThickness * 0.45, capOffset * 0.35) },
            { x: bx + nx * flareWidth, y: by + ny * flareWidth },
        ];
    } else if (style === 'ball') {
        const r = Math.max(2.8, bSize * 0.85 * serifScale);
        const cx = tip.x + vx * (r * 0.12) + nx * (bSize * 0.16);
        const cy = tip.y + vy * (r * 0.12) + ny * (bSize * 0.16);
        const steps = 14;
        for (let i = 0; i <= steps; i++) {
            const a = (i / steps) * Math.PI * 2;
            pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
        }
    } else {
        // 'classic' bracketed book serif
        const t = Math.max(1.6, bSize * 0.36 * serifScale, capOffset * 0.5);
        const trTip = { x: bx - nx * halfWidth + vx * t, y: by - ny * halfWidth + vy * t };
        const tlTip = { x: bx + nx * halfWidth + vx * t, y: by + ny * halfWidth + vy * t };
        const stemRight = { x: bx - nx * halfStem + vx * bracketDepth, y: by - ny * halfStem + vy * bracketDepth };
        const stemLeft = { x: bx + nx * halfStem + vx * bracketDepth, y: by + ny * halfStem + vy * bracketDepth };

        const curveLeft = generateQuadraticCurvePoints(
            trTip,
            { x: bx - nx * halfStem + vx * t, y: by - ny * halfStem + vy * t },
            stemRight,
            10
        );
        const curveRight = generateQuadraticCurvePoints(
            stemLeft,
            { x: bx + nx * halfStem + vx * t, y: by + ny * halfStem + vy * t },
            tlTip,
            10
        );

        pts = [
            { x: bx + nx * halfWidth, y: by + ny * halfWidth },
            { x: bx - nx * halfWidth, y: by - ny * halfWidth },
            trTip,
            ...curveLeft.slice(1),
            stemLeft,
            ...curveRight.slice(1),
            { x: bx + nx * halfWidth, y: by + ny * halfWidth },
        ];
    }

    const stroke = pts.map((pt) => ({
        x: Math.round(pt.x * 100) / 100,
        y: Math.round(pt.y * 100) / 100,
    }));
    stroke.isFilled = true;
    stroke.isSerifPart = true;
    stroke.serifStyle = style;
    stroke.lineCap = lineCap;
    return stroke;
}

export function stripSerifParts(strokes) {
    return (strokes || []).filter((s) => !(Array.isArray(s) && s.isSerifPart));
}

function pointTouchesOtherStroke(pt, sourceIndex, strokes, radius) {
    for (let i = 0; i < strokes.length; i++) {
        if (i === sourceIndex) continue;
        const other = strokes[i];
        if (!Array.isArray(other) || other.isSerifPart || other.isMeta) continue;
        for (let j = 0; j < other.length; j++) {
            if (Math.hypot(other[j].x - pt.x, other[j].y - pt.y) <= radius) {
                return true;
            }
        }
    }
    return false;
}

function findDistinctNeighbor(stroke, fromStart, minSpan = 5) {
    if (!Array.isArray(stroke) || stroke.length < 2) return null;
    const tip = fromStart ? stroke[0] : stroke[stroke.length - 1];
    let fallback = fromStart ? stroke[1] : stroke[stroke.length - 2];
    let bestDist = Math.hypot(fallback.x - tip.x, fallback.y - tip.y);

    if (fromStart) {
        for (let i = 1; i < stroke.length; i++) {
            const d = Math.hypot(stroke[i].x - tip.x, stroke[i].y - tip.y);
            if (d >= minSpan) return stroke[i];
            if (d > bestDist) {
                bestDist = d;
                fallback = stroke[i];
            }
        }
    } else {
        for (let i = stroke.length - 2; i >= 0; i--) {
            const d = Math.hypot(stroke[i].x - tip.x, stroke[i].y - tip.y);
            if (d >= minSpan) return stroke[i];
            if (d > bestDist) {
                bestDist = d;
                fallback = stroke[i];
            }
        }
    }
    return fallback;
}

/**
 * Non-destructively regenerates serifs on existing open base strokes.
 * Any prior generated serif caps (`isSerifPart === true`) are replaced cleanly.
 */
export function applySerifsToStrokes(strokes, options = {}) {
    const baseStrokes = stripSerifParts(strokes);
    const serifStyle = options.serifStyle || 'classic';
    if (serifStyle === 'none') return baseStrokes;

    const targetMode = options.targetMode || 'terminals'; // 'terminals' | 'verticals' | 'all'
    const size = Math.max(2, Number(options.size) || 5);
    const serifScale = Number(options.serifScale) || 1.15;
    const joinRadius = Math.max(4, size * 1.1);
    const neighborSpan = Math.max(4, size * 0.75);
    const isCalligraphy = Boolean(options.isCalligraphy);
    const isBrushPen = Boolean(options.isBrushPen);
    const result = [...baseStrokes];

    baseStrokes.forEach((stroke, sIdx) => {
        if (!Array.isArray(stroke) || stroke.length < 2 || stroke.isFilled || stroke.isMeta || isLegacySentinelStroke(stroke)) {
            return;
        }
        // Skip closed loops (e.g. circles, rectangles)
        const start = stroke[0];
        const end = stroke[stroke.length - 1];
        if (stroke.length > 3 && Math.hypot(end.x - start.x, end.y - start.y) <= Math.max(3, size * 0.6)) {
            return;
        }

        const startFactor = (stroke.isCalligraphy ?? isCalligraphy)
            ? 0.45
            : (stroke.isBrushPen ?? isBrushPen)
                ? 0.55
                : 1.0;
        const endFactor = (stroke.isCalligraphy ?? isCalligraphy)
            ? 0.45
            : (stroke.isBrushPen ?? isBrushPen)
                ? 0.35
                : 1.0;

        const endpoints = [
            { tip: start, neighbor: findDistinctNeighbor(stroke, true, neighborSpan), endWidthFactor: startFactor },
            { tip: end, neighbor: findDistinctNeighbor(stroke, false, neighborSpan), endWidthFactor: endFactor },
        ];

        endpoints.forEach(({ tip, neighbor, endWidthFactor }) => {
            if (!tip || !neighbor) return;
            const dx = neighbor.x - tip.x;
            const dy = neighbor.y - tip.y;
            const len = Math.hypot(dx, dy);
            if (len < 0.8) return;

            if (targetMode === 'verticals') {
                // Only add serif when terminal direction is mostly vertical (~|sin| >= 0.55)
                if (Math.abs(dy / len) < 0.55) return;
            }
            if (targetMode !== 'all') {
                if (pointTouchesOtherStroke(tip, sIdx, baseStrokes, joinRadius)) {
                    return;
                }
            }

            const cap = generateSerifEndcap(tip, neighbor, {
                serifStyle,
                size,
                serifScale,
                lineCap: stroke.lineCap || options.lineCap || 'round',
                endWidthFactor,
            });
            if (cap) {
                result.push(cap);
            }
        });
    });

    return result;
}

/**
 * Applies a Font Style Preset object to an existing saved glyph entry (`[metaObj, ...strokes]` or legacy format).
 */
export function applyStylePresetToGlyphEntry(glyphEntry, preset, options = {}) {
    if (!Array.isArray(glyphEntry) || glyphEntry.length === 0 || !preset) return glyphEntry;
    const flags = preset.flags || {};

    let meta = {
        isMeta: true,
        scale: 1.0,
        leftMargin: 100,
        rightMargin: 100,
        yOffset: 0,
        xOffset: 0,
        consistentSize: undefined,
    };
    let actual = glyphEntry;

    if (!Array.isArray(glyphEntry[0]) && glyphEntry[0]?.isMeta) {
        meta = { ...meta, ...glyphEntry[0] };
        actual = glyphEntry.slice(1);
    } else if (isLegacySentinelStroke(glyphEntry[0])) {
        actual = glyphEntry.slice(1);
    }

    const resolvedSerifStyle = options.serifStyle ?? flags.serifStyle ?? 'none';
    const resolvedIsSerifPen = options.isSerifPen !== undefined
        ? Boolean(options.isSerifPen && resolvedSerifStyle !== 'none')
        : Boolean(flags.isSerifPen && resolvedSerifStyle !== 'none');

    const updatedMeta = {
        ...meta,
        isCalligraphy: Boolean(flags.isCalligraphy),
        isBrushPen: Boolean(flags.isBrushPen),
        isChisel: Boolean(flags.isChisel),
        isPaintBrush: Boolean(flags.isPaintBrush),
        isSerifPen: resolvedIsSerifPen,
        serifStyle: resolvedIsSerifPen ? resolvedSerifStyle : 'none',
        chiselAngle: Number.isFinite(options.chiselAngle) ? options.chiselAngle : (flags.chiselAngle ?? meta.chiselAngle ?? 45),
        ...(Number.isFinite(options.strokeWeight) ? { strokeWeight: options.strokeWeight } : {}),
    };

    const restyledStrokes = actual.map((s) => {
        if (!Array.isArray(s) || isLegacySentinelStroke(s)) return s;
        const copy = cloneStrokeWithMeta(s, s);
        copy.lineCap = flags.lineCap || 'round';
        // Clear stale per-stroke overrides when styling the whole glyph consistently
        delete copy.isCalligraphy;
        delete copy.isBrushPen;
        delete copy.isChisel;
        delete copy.isPaintBrush;
        return copy;
    });

    const finalStrokes = updatedMeta.isSerifPen
        ? applySerifsToStrokes(restyledStrokes, {
            serifStyle: updatedMeta.serifStyle || 'classic',
            size: options.serifBrushSize || 5,
            serifScale: options.serifScale || 1.15,
            targetMode: options.serifTargetMode || 'terminals',
            lineCap: flags.lineCap || 'round',
            isCalligraphy: updatedMeta.isCalligraphy,
            isBrushPen: updatedMeta.isBrushPen,
        })
        : stripSerifParts(restyledStrokes);

    return [updatedMeta, ...finalStrokes];
}

/**
 * Clickable metric-aligned typographic stamps so builders can assemble consistent alphabets rapidly.
 */
export const GLYPH_STAMPS = [
    {
        id: 'stem_cap',
        name: 'Cap Stem',
        desc: 'Vertical stem Cap -> Base',
        strokes: [[{ x: 150, y: 80 }, { x: 150, y: 240 }]],
    },
    {
        id: 'stem_x',
        name: 'X-Stem',
        desc: 'Short vertical X-Height -> Base',
        strokes: [[{ x: 150, y: 140 }, { x: 150, y: 240 }]],
    },
    {
        id: 'stem_asc',
        name: 'Ascender',
        desc: 'Tall stem Ascent -> Base',
        strokes: [[{ x: 150, y: 20 }, { x: 150, y: 240 }]],
    },
    {
        id: 'stem_desc',
        name: 'Descender',
        desc: 'Dropping stem X -> Descent',
        strokes: [[{ x: 150, y: 140 }, { x: 150, y: 280 }]],
    },
    {
        id: 'bar_cap',
        name: 'Top Bar',
        desc: 'Horizontal bar at Cap-Height',
        strokes: [[{ x: 85, y: 80 }, { x: 215, y: 80 }]],
    },
    {
        id: 'bar_mid',
        name: 'Crossbar',
        desc: 'Center crossbar at X-Height',
        strokes: [[{ x: 95, y: 140 }, { x: 205, y: 140 }]],
    },
    {
        id: 'bar_base',
        name: 'Base Bar',
        desc: 'Horizontal foot at Baseline',
        strokes: [[{ x: 85, y: 240 }, { x: 215, y: 240 }]],
    },
    {
        id: 'arch_x',
        name: 'Arch',
        desc: 'Smooth rounded n-arch',
        strokes: [
            [
                { x: 95, y: 240 },
                { x: 95, y: 178 },
                ...generateQuadraticCurvePoints({ x: 95, y: 178 }, { x: 95, y: 140 }, { x: 150, y: 140 }, 10).slice(1),
                ...generateQuadraticCurvePoints({ x: 150, y: 140 }, { x: 205, y: 140 }, { x: 205, y: 178 }, 10).slice(1),
                { x: 205, y: 240 },
            ],
        ],
    },
    {
        id: 'bowl_right',
        name: 'Right Bowl',
        desc: 'Round D/P bowl arc',
        strokes: [
            [
                { x: 105, y: 80 },
                { x: 155, y: 80 },
                ...generateQuadraticCurvePoints({ x: 155, y: 80 }, { x: 225, y: 80 }, { x: 225, y: 160 }, 12).slice(1),
                ...generateQuadraticCurvePoints({ x: 225, y: 160 }, { x: 225, y: 240 }, { x: 155, y: 240 }, 12).slice(1),
                { x: 105, y: 240 },
            ],
        ],
    },
    {
        id: 'oval_x',
        name: 'X-Oval',
        desc: 'Closed oval X-Height -> Base',
        strokes: [
            Array.from({ length: 29 }, (_, i) => {
                const a = (i / 28) * Math.PI * 2;
                return { x: 150 + Math.cos(a) * 52, y: 190 + Math.sin(a) * 50 };
            }),
        ],
    },
    {
        id: 'hook_desc',
        name: 'J-Hook',
        desc: 'Stem with descender tail',
        strokes: [
            [
                { x: 165, y: 140 },
                { x: 165, y: 235 },
                ...generateQuadraticCurvePoints({ x: 165, y: 235 }, { x: 165, y: 280 }, { x: 115, y: 276 }, 12).slice(1),
            ],
        ],
    },
    {
        id: 'dia_dot',
        name: 'Top Dot',
        desc: 'Tittle / diacritic dot',
        strokes: [[{ x: 150, y: 52 }]],
    },
    {
        id: 'dia_acute',
        name: 'Acute ´',
        desc: 'Top accent slash',
        strokes: [[{ x: 168, y: 36 }, { x: 136, y: 66 }]],
    },
    {
        id: 'dia_macron',
        name: 'Macron ¯',
        desc: 'Top overbar accent',
        strokes: [[{ x: 112, y: 52 }, { x: 188, y: 52 }]],
    },
];

export function instantiateStampStrokes(stamp, options = {}) {
    if (!stamp || !Array.isArray(stamp.strokes)) return [];
    const lineCap = options.lineCap || 'round';
    const isFilled = Boolean(options.isFilled);
    return stamp.strokes.map((pts) => {
        const s = cloneStrokeWithMeta(pts);
        s.lineCap = lineCap;
        if (pts.length > 2) s.isFilled = isFilled;
        return s;
    });
}

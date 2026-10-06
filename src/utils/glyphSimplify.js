/**
 * Glyph stroke simplification.
 *
 * Font Studio records strokes as dense point lists (a curve is sampled at a
 * fixed density so erasing and rendering stay accurate). That keeps drawing
 * precise but makes each glyph enormous once stored as JSON: a real workspace
 * measured ~264 points per glyph on average, with individual glyphs in the
 * thousands, and 45.7 bytes per point because coordinates are serialised at
 * full float precision.
 *
 * These helpers reduce an existing glyph to a visually equivalent one. They are
 * pure functions over the stored stroke format:
 *
 *   glyph = [ { isMeta: true, scale, ... }, [ {x, y}, ... ], [ {x, y}, ... ] ]
 *
 * so they can run over already-saved glyphs without touching the drawing code.
 */

// Canvas coordinates come from a 300x300 grid (FontStudio CANVAS_SIZE), so two
// decimal places is far below a visible pixel while removing ~10 chars a number.
const DEFAULT_PRECISION = 2;

// Sentinel points Font Studio uses for metadata-only strokes.
const SENTINEL_X = new Set([-999, -998]);

function isMetaEntry(entry) {
    return !Array.isArray(entry) && entry && entry.isMeta === true;
}

function isSentinelStroke(points) {
    return points.length === 1 && SENTINEL_X.has(points[0].x);
}

/** Squared distance from p to segment ab. Avoids a sqrt per point. */
function distToSegmentSquared(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    if (dx === 0 && dy === 0) {
        const ex = px - ax;
        const ey = py - ay;
        return ex * ex + ey * ey;
    }
    let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    const ex = px - cx;
    const ey = py - cy;
    return ex * ex + ey * ey;
}

/**
 * Ramer-Douglas-Peucker: keep the points that carry the shape, drop the rest.
 *
 * Handles closed rings so the seam between the last and first point is treated
 * as a real edge and a ring is never thinned at an arbitrary point.
 */
export function simplifyPolyline(points, tolerance, isClosed = false) {
    const n = points.length;
    if (tolerance <= 0 || n <= 2) return points.slice();

    // Safe ceiling (2.0px) ensures glyph curves, loops, and sharp corners
    // are never obliterated on the 300x300 drawing canvas.
    const effectiveTol = Math.min(tolerance, 2.0);

    const keep = new Uint8Array(n);
    keep[0] = 1;
    if (n > 1) keep[n - 1] = 1;

    const tolSq = effectiveTol * effectiveTol;
    const stack = [];

    if (isClosed) {
        // Seed from the two furthest-apart points on the ring, so the first
        // split is stable rather than depending on where the array began.
        let farA = 0;
        let farB = 1;
        let best = -1;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const dx = points[i].x - points[j].x;
                const dy = points[i].y - points[j].y;
                const d = dx * dx + dy * dy;
                if (d > best) { best = d; farA = i; farB = j; }
            }
        }
        keep[farA] = 1;
        keep[farB] = 1;
        stack.push([farA, farB], [farB, farA + n]);
    } else {
        stack.push([0, n - 1]);
    }

    while (stack.length) {
        const [start, end] = stack.pop();
        if (end - start < 2) continue;
        const a = points[start % n];
        const b = points[end % n];
        let maxDist = 0;
        let maxIdx = -1;
        for (let i = start + 1; i < end; i++) {
            const p = points[i % n];
            const d = distToSegmentSquared(p.x, p.y, a.x, a.y, b.x, b.y);
            if (d > maxDist) { maxDist = d; maxIdx = i; }
        }
        if (maxIdx !== -1 && maxDist > tolSq) {
            keep[maxIdx % n] = 1;
            stack.push([start, maxIdx], [maxIdx, end]);
        }
    }

    const out = [];
    for (let i = 0; i < n; i++) if (keep[i]) out.push(points[i]);
    return out;
}

/** Rounds coordinates, dropping -0 and float noise like 3.0000000000000004. */
function roundCoord(v, precision) {
    const r = Number(v.toFixed(precision));
    return Object.is(r, -0) ? 0 : r;
}

/**
 * Simplifies a single stroke, preserving its lineCap / isFilled annotations.
 */
export function simplifyStroke(stroke, options = {}) {
    const rawTol = options.tolerance ?? 0.5;
    // Allow 0 for exact retention, otherwise clamp to pixel-perfect ceiling [0.05, 2.0]
    const tolerance = rawTol <= 0 ? 0 : Math.min(Math.max(rawTol, 0.05), 2.0);
    const precision = options.precision ?? DEFAULT_PRECISION;

    const points = Array.isArray(stroke) ? stroke : (stroke?.points || []);
    if (isSentinelStroke(points)) return stroke;

    // Strokes of 1-2 points have no geometry to simplify, but they still get
    // rounded: precision alone is the single biggest size win, since a typical
    // stored coordinate runs to 17 significant digits.
    if (points.length <= 2) {
        const rounded = points.map((p) => ({
            x: roundCoord(p.x, precision),
            y: roundCoord(p.y, precision),
        }));
        if (Array.isArray(stroke)) {
            rounded.lineCap = stroke.lineCap;
            rounded.isFilled = stroke.isFilled;
            return rounded;
        }
        return { ...stroke, points: rounded };
    }

    const isClosed = looksClosed(points);
    let simplified = simplifyPolyline(points, tolerance, isClosed);

    // Round only after the geometry is settled, so rounding cannot change which
    // points RDP decided to keep.
    simplified = simplified.map((p) => ({
        x: roundCoord(p.x, precision),
        y: roundCoord(p.y, precision),
    }));

    // A closed ring that lost its seam point still needs it, otherwise the
    // renderer draws a gap between the last and first segment.
    if (isClosed && simplified.length >= 2) {
        const first = simplified[0];
        const last = simplified[simplified.length - 1];
        if (first.x !== last.x || first.y !== last.y) simplified.push({ x: first.x, y: first.y });
    }

    if (Array.isArray(stroke)) {
        simplified.lineCap = stroke.lineCap;
        simplified.isFilled = stroke.isFilled;
        return simplified;
    }
    return { ...stroke, points: simplified };
}

/**
 * Simplifies a whole glyph (the array stored under a char code), leaving the
 * metadata entry and any sentinel strokes untouched.
 */
export function simplifyGlyph(glyph, options = {}) {
    if (!Array.isArray(glyph)) return glyph;
    return glyph.map((entry) => {
        if (isMetaEntry(entry)) return entry;
        if (!Array.isArray(entry)) return entry;
        return simplifyStroke(entry, options);
    });
}

/** Total point count across a glyph, used for before/after reporting. */
export function countGlyphPoints(glyph) {
    if (!Array.isArray(glyph)) return 0;
    let total = 0;
    for (const entry of glyph) {
        if (Array.isArray(entry)) total += entry.length;
        else if (entry && Array.isArray(entry.points)) total += entry.points.length;
    }
    return total;
}

/**
 * Summarises what a simplification run would do, so the UI can show a preview
 * before anything is written. Returns the simplified glyphs too, so the caller
 * can preview or batch-compile from a single pass.
 */
export function previewSimplification(glyphs, options = {}) {
    let beforePoints = 0;
    let afterPoints = 0;
    let beforeBytes = 0;
    let afterBytes = 0;
    const perGlyph = [];

    for (const [code, glyph] of Object.entries(glyphs || {})) {
        const before = countGlyphPoints(glyph);
        const simplified = simplifyGlyph(glyph, options);
        const after = countGlyphPoints(simplified);
        beforePoints += before;
        afterPoints += after;
        beforeBytes += JSON.stringify(glyph).length;
        afterBytes += JSON.stringify(simplified).length;
        perGlyph.push({ code, before, after, glyph: simplified });
    }

    return {
        beforePoints,
        afterPoints,
        beforeBytes,
        afterBytes,
        glyphCount: perGlyph.length,
        pointReduction: beforePoints ? 1 - afterPoints / beforePoints : 0,
        byteReduction: beforeBytes ? 1 - afterBytes / beforeBytes : 0,
        perGlyph,
    };
}

/**
 * Simplifies every glyph in a customGlyphs map, returning a new map.
 */
export function simplifyGlyphMap(customGlyphs, options = {}) {
    const out = {};
    for (const [code, glyph] of Object.entries(customGlyphs || {})) {
        out[code] = simplifyGlyph(glyph, options);
    }
    return out;
}

/** A stroke whose first and last point coincide is a closed ring. */
function looksClosed(points) {
    if (points.length < 4) return false;
    const first = points[0];
    const last = points[points.length - 1];
    return Math.abs(first.x - last.x) <= 1 && Math.abs(first.y - last.y) <= 1;
}
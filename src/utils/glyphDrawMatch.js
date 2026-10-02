// src/utils/glyphDrawMatch.js
//
// Pure geometry helpers backing the "Draw the Glyph" exercise.
//
// Stroke data comes from resolveWordStrokes() and lives in a 0-300 coordinate
// space (see StrokeOrderViewer's `viewBox="0 0 300 300"`). A stroke is an array
// of {x, y} points; a glyph is an array of strokes.
//
// The matcher is intentionally geometric rather than ML: it normalises both
// drawings into a shared unit box, resamples each stroke to equidistant points,
// and scores mean point-to-point distance. That forgives the natural wobble of
// a finger/stylus trace while still rejecting a genuinely different shape.

/** Number of equidistant samples each stroke is reduced to before comparing. */
const RESAMPLE_POINTS = 32;

/**
 * Mean point-to-point distance (in unit-box space) at which similarity hits
 * zero. Calibrated so a correct-but-wobbly hand trace (~0.1) still scores well
 * above the 0.7 pass threshold, while a genuinely different shape — a vertical
 * stroke against a horizontal one averages ~0.38 — scores zero.
 */
const MAX_MEAN_DISTANCE = 0.35;

/** Score gap below which a stroke is never reported as reversed. */
const REVERSE_MARGIN = 0.12;

/**
 * Multiplier applied to a stroke's similarity when the student traced it in the
 * wrong direction and order is being enforced. The shape is still worth credit,
 * but tracing direction is part of the skill being tested.
 */
const REVERSED_PENALTY = 0.5;

const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

const isPoint = (p) => p && typeof p.x === 'number' && typeof p.y === 'number';

/**
 * Filters a raw stroke list down to usable polylines. Single-point strokes
 * (dots/accents) are kept — they are meaningful in conlang scripts.
 */
export const sanitizeStrokes = (strokes) => {
    if (!Array.isArray(strokes)) return [];
    return strokes
        .filter(Array.isArray)
        .map((s) => s.filter(isPoint).map((p) => ({ x: p.x, y: p.y })))
        .filter((s) => s.length > 0);
};

/**
 * Translates and uniformly scales a stroke set into a centred unit box.
 *
 * Scaling is uniform (based on the larger dimension) rather than per-axis, so
 * the glyph's aspect ratio is preserved — stretching a narrow glyph to fill a
 * square would let a badly drawn letter pass.
 *
 * @returns {{strokes: Array, scale: number}|null} null when there is no ink.
 */
export const normalizeStrokes = (strokes) => {
    const clean = sanitizeStrokes(strokes);
    if (clean.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const stroke of clean) {
        for (const p of stroke) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }
    }

    const width = maxX - minX;
    const height = maxY - minY;
    const span = Math.max(width, height);

    // A pure dot (no extent) has no meaningful scale; centre it as a single point.
    const scale = span > 1e-6 ? 1 / span : 0;
    const offsetX = (minX + maxX) / 2;
    const offsetY = (minY + maxY) / 2;

    const normalized = clean.map((stroke) =>
        stroke.map((p) => ({
            x: scale > 0 ? (p.x - offsetX) * scale : 0,
            y: scale > 0 ? (p.y - offsetY) * scale : 0
        }))
    );

    return { strokes: normalized, scale };
};

/**
 * Reduces a polyline to `n` equidistant points along its arc length.
 * Dots collapse to n copies of the same point, which keeps scoring stable.
 */
export const resampleStroke = (points, n = RESAMPLE_POINTS) => {
    const clean = (points || []).filter(isPoint);
    if (clean.length === 0) return [];
    if (clean.length === 1) return new Array(n).fill({ x: clean[0].x, y: clean[0].y });

    const cumulative = [0];
    for (let i = 1; i < clean.length; i++) {
        cumulative.push(cumulative[i - 1] + Math.hypot(clean[i].x - clean[i - 1].x, clean[i].y - clean[i - 1].y));
    }

    const total = cumulative[cumulative.length - 1];
    if (total < 1e-6) return new Array(n).fill({ x: clean[0].x, y: clean[0].y });

    const out = [];
    let seg = 1;
    for (let i = 0; i < n; i++) {
        const target = (i / (n - 1)) * total;
        while (seg < cumulative.length - 1 && cumulative[seg] < target) seg++;
        const segStart = cumulative[seg - 1];
        const segLen = cumulative[seg] - segStart || 1e-6;
        const t = clamp((target - segStart) / segLen);
        out.push({
            x: clean[seg - 1].x + (clean[seg].x - clean[seg - 1].x) * t,
            y: clean[seg - 1].y + (clean[seg].y - clean[seg - 1].y) * t
        });
    }
    return out;
};

/** Mean point-to-point distance between two resampled polylines (0 = identical). */
const meanDistance = (a, b) => {
    const len = Math.min(a.length, b.length);
    if (len === 0) return Infinity;
    let sum = 0;
    for (let i = 0; i < len; i++) {
        sum += Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y);
    }
    return sum / len;
};

/** Converts a mean distance in unit-box space into a 0-1 similarity. */
const distanceToScore = (distance) => {
    if (!Number.isFinite(distance)) return 0;
    return clamp(1 - distance / MAX_MEAN_DISTANCE);
};

/**
 * Scores one drawn stroke against one target stroke.
 * Detects reversal by comparing the forward and backward traces.
 */
/** Distance (in unit-box space) under which a stroke's endpoints count as meeting. */
const CLOSED_EPSILON = 0.08;

/** True when a stroke's start and end meet, i.e. the shape is closed. */
const isClosedStroke = (stroke) => {
    const s = (stroke || []).filter(isPoint);
    if (s.length < 3) return false;
    const a = s[0];
    const b = s[s.length - 1];
    return Math.hypot(a.x - b.x, a.y - b.y) < CLOSED_EPSILON;
};

/**
 * Scores one drawn stroke against one target stroke.
 * Detects reversal by comparing the forward and backward traces.
 *
 * @param {boolean} normalize - Set false when the caller has already run both
 *   sets through normalizeStrokes() as a whole glyph. Re-normalising per stroke
 *   would discard the relative geometry between strokes (a vertical stroke and
 *   a horizontal stroke both collapse to the same unit line), so gradeDrawing
 *   passes false here.
 */
export const scoreStrokePair = (drawnStroke, targetStroke, { normalize = true } = {}) => {
    let dSource = [drawnStroke];
    let tSource = [targetStroke];

    if (normalize) {
        const dN = normalizeStrokes(dSource);
        const tN = normalizeStrokes(tSource);
        if (!dN || !tN) return { score: 0, forward: 0, backward: 0, reversed: false };
        dSource = dN.strokes;
        tSource = tN.strokes;
    }

    const dFwd = resampleStroke(dSource[0]);
    const tFwd = resampleStroke(tSource[0]);
    const tRev = resampleStroke([...(tSource[0] || [])].reverse());

    const forward = distanceToScore(meanDistance(dFwd, tFwd));
    const backward = distanceToScore(meanDistance(dFwd, tRev));

    // Closed shapes (circles, loops) have no meaningful start-to-end direction,
    // so a reversal there is expected rather than wrong.
    const reversed = !isClosedStroke(tSource[0])
        && tFwd.length > 1
        && backward > forward + REVERSE_MARGIN;

    return {
        // Shape quality only — direction is reported separately as `reversed`
        // and penalised by gradeDrawing, so a correct shape traced backwards
        // still earns partial credit.
        score: Math.max(forward, backward),
        forward,
        backward,
        reversed
    };
};

/**
 * Pairs drawn strokes to target strokes.
 *
 * When `checkOrder` is true the pairing is positional (drawn[0] -> target[0]),
 * which is what enforces stroke order. Otherwise a greedy best-first assignment
 * finds the strongest pairing, so a student who draws the strokes in any
 * sequence is still credited.
 */
export const matchStrokes = (drawn, target, { checkOrder = true, normalize = false } = {}) => {
    const d = sanitizeStrokes(drawn);
    const t = sanitizeStrokes(target);
    if (t.length === 0) return [];

    // Callers that hand us already-normalised glyphs (gradeDrawing) must not
    // have each stroke re-scaled in isolation.
    const scoreOpts = { normalize };

    if (checkOrder) {
        return t.map((targetStroke, i) => {
            const drawnStroke = d[i];
            if (!drawnStroke) {
                return { targetIndex: i, drawnIndex: null, score: 0, reversed: false, missing: true };
            }
            return { targetIndex: i, drawnIndex: i, ...scoreStrokePair(drawnStroke, targetStroke, scoreOpts) };
        });
    }

    // Greedy: consider every pair, repeatedly claiming the best unused combination.
    const candidates = [];
    d.forEach((drawnStroke, di) => {
        t.forEach((targetStroke, ti) => {
            const { score, reversed } = scoreStrokePair(drawnStroke, targetStroke, scoreOpts);
            candidates.push({ di, ti, score, reversed });
        });
    });
    candidates.sort((a, b) => b.score - a.score);

    const usedDrawn = new Set();
    const usedTarget = new Set();
    const pairs = new Map();

    for (const c of candidates) {
        if (pairs.size >= t.length) break;
        if (usedDrawn.has(c.di) || usedTarget.has(c.ti)) continue;
        usedDrawn.add(c.di);
        usedTarget.add(c.ti);
        pairs.set(c.ti, { targetIndex: c.ti, drawnIndex: c.di, score: c.score, reversed: c.reversed });
    }

    return t.map((_, ti) => pairs.get(ti) || { targetIndex: ti, drawnIndex: null, score: 0, reversed: false, missing: true });
};

/**
 * Grades a whole drawing against the target glyph.
 *
 * @param {Array} drawn   - strokes captured from the canvas (0-300 space)
 * @param {Array} target  - strokes from resolveWordStrokes (0-300 space)
 * @param {Object} opts   - { checkOrder, threshold }
 * @returns {{gradable, score, passed, pairs, coverage, strokeCountMatch,
 *            drawnCount, targetCount, reversedCount, threshold}}
 */
export const gradeDrawing = (drawn, target, { checkOrder = true, threshold = 0.7 } = {}) => {
    const dCount = sanitizeStrokes(drawn).length;
    const tCount = sanitizeStrokes(target).length;

    const result = {
        gradable: false,
        score: 0,
        passed: false,
        pairs: [],
        coverage: 0,
        strokeCountMatch: false,
        drawnCount: dCount,
        targetCount: tCount,
        reversedCount: 0,
        threshold
    };

    if (tCount === 0) return result;

    const dNorm = normalizeStrokes(drawn);
    const tNorm = normalizeStrokes(target);
    if (!tNorm) return result;

    if (!dNorm) {
        // Nothing drawn — still gradable so the UI can explain the failure.
        result.gradable = true;
        return result;
    }

    const pairs = matchStrokes(dNorm.strokes, tNorm.strokes, { checkOrder });
    const matched = pairs.filter((p) => !p.missing);

    // Backwards strokes keep their shape credit but are discounted when the
    // creator asked for stroke order to be enforced.
    const base = matched.length > 0
        ? matched.reduce((sum, p) => sum + p.score * (checkOrder && p.reversed ? REVERSED_PENALTY : 1), 0) / matched.length
        : 0;

    // Multiplicative penalties so both a skipped stroke and a spurious extra one
    // drag the score down proportionally.
    const coverage = matched.length / tCount;
    const countRatio = tCount / Math.max(dCount, tCount);

    result.gradable = true;
    result.pairs = pairs;
    result.coverage = coverage;
    result.strokeCountMatch = dCount === tCount;
    result.reversedCount = checkOrder ? pairs.filter((p) => p.reversed).length : 0;
    result.score = base * coverage * countRatio;
    result.passed = result.score >= threshold;

    return result;
};

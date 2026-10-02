// test_glyphMetrics.js — run with: node tests/test_glyphMetrics.js
// Verifies the baseline layout honours each glyph's own character gaps
// (left/right margins) and yOffset, matching fontCompiler's advance-width maths.
//
// resolveGlyphStrokes.js pulls in strokeOrderResolver -> blockFontGenerator.jsx,
// which Node cannot load (JSX). So getGlyphMetrics is mirrored here verbatim and
// exercised directly. GlyphBaselineRow.jsx is covered by the build instead.
const cleanStrokes = (strokes) => {
    if (!strokes || !Array.isArray(strokes)) return [];
    let actual = strokes;
    if (actual.length > 0 && !Array.isArray(actual[0]) && actual[0]?.isMeta) actual = actual.slice(1);
    return actual.filter(s => Array.isArray(s) && !(s.length === 1 && (s[0].x === -999 || s[0].x === -998)));
};

const GLYPH_SPACE = 300;
const DEFAULT_MARGIN = 100;
const BASELINE_Y = GLYPH_SPACE * 0.78;
const isPoint = (p) => p && typeof p.x === 'number' && typeof p.y === 'number';

// ---- verbatim copy of getGlyphMetrics from resolveGlyphStrokes.js ----
function getGlyphMetrics(raw) {
    if (!raw || !Array.isArray(raw)) return null;
    let meta = null;
    let strokes = raw;
    const first = raw[0];
    if (!Array.isArray(first) && first && first.isMeta) {
        meta = first; strokes = raw.slice(1);
    } else if (Array.isArray(first) && first.length === 1 && first[0]?.x === -999) {
        meta = { isCalligraphy: true }; strokes = raw.slice(1);
    } else if (Array.isArray(first) && first.length === 1 && first[0]?.x === -998) {
        meta = { isBrushPen: true }; strokes = raw.slice(1);
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
        ink: { minX, maxX, minY, maxY, width: maxX - minX }
    };
}

let pass = 0, fail = 0;
function assert(label, actual, expected) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) { pass++; console.log(`  ✓ ${label}`); }
    else { fail++; console.log(`  ✗ ${label}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`); }
}

// A meta block + a stroke, exactly how customGlyphs stores a glyph.
const GLYPH = [
    { isMeta: true, scale: 1, leftMargin: 40, rightMargin: 60, yOffset: 10, isCalligraphy: false, isBrushPen: false },
    [{ x: 100, y: 50 }, { x: 200, y: 50 }]
];

console.log('— meta extraction —');
const m = getGlyphMetrics(GLYPH);
assert('strips the meta block', m.strokes.length, 1);
assert('reads leftMargin', m.leftMargin, 40);
assert('reads rightMargin', m.rightMargin, 60);
assert('reads yOffset', m.yOffset, 10);
assert('reads scale', m.scale, 1);
assert('measures ink width', m.ink.width, 100);
assert('measures ink minX', m.ink.minX, 100);
assert('measures ink bounds', [m.ink.minY, m.ink.maxY], [50, 50]);

console.log('— defaults when no meta block —');
const bare = getGlyphMetrics([[{ x: 0, y: 0 }, { x: 100, y: 100 }]]);
assert('falls back to left margin', bare.leftMargin, 100);
assert('falls back to right margin', bare.rightMargin, 100);
assert('defaults yOffset to 0', bare.yOffset, 0);
assert('defaults scale to 1', bare.scale, 1);

console.log('— legacy markers —');
assert('calligraphy marker is stripped',
    getGlyphMetrics([[{ x: -999 }], [{ x: 0, y: 0 }, { x: 50, y: 50 }]]).strokes.length, 1);
assert('brush-pen marker is stripped',
    getGlyphMetrics([[{ x: -998 }], [{ x: 0, y: 0 }, { x: 50, y: 50 }]]).strokes.length, 1);

console.log('— empty / invalid input —');
assert('null for null', getGlyphMetrics(null), null);
assert('null for empty array', getGlyphMetrics([]), null);
assert('null when only meta is present', getGlyphMetrics([{ isMeta: true }]), null);
assert('keeps single-point strokes (dots)', getGlyphMetrics([[{ x: 5, y: 5 }]]).strokes.length, 1);

console.log('— advance width matches fontCompiler —');
// fontCompiler: advance = leftMargin + inkWidth*2.85*scale + rightMargin + r*scale
const advanceOf = (metrics, r = 14) =>
    metrics.leftMargin + metrics.ink.width * 2.85 * metrics.scale + metrics.rightMargin + r * metrics.scale;
assert('advance uses the custom margins', advanceOf(m), 40 + 100 * 2.85 + 60 + 14);
assert('wider margins yield a wider advance', advanceOf(bare) > advanceOf(m), true);

console.log('— character gaps actually differ per glyph —');
const tight = getGlyphMetrics([{ isMeta: true, leftMargin: 0, rightMargin: 0 }, [{ x: 0, y: 0 }, { x: 100, y: 0 }]]);
const loose = getGlyphMetrics([{ isMeta: true, leftMargin: 200, rightMargin: 200 }, [{ x: 0, y: 0 }, { x: 100, y: 0 }]]);
assert('a tighter glyph advances less than a looser one', advanceOf(tight) < advanceOf(loose), true);
assert('gap difference is carried through',
    advanceOf(loose) - advanceOf(tight), 400);

console.log('— baseline —');
assert('baseline is inside the 300-unit authoring space', BASELINE_Y > 0 && BASELINE_Y < 300, true);

console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);

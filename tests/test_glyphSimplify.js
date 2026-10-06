// Tests for glyph stroke simplification.
import assert from 'node:assert';
import {
    simplifyPolyline,
    simplifyStroke,
    simplifyGlyph,
    simplifyGlyphMap,
    countGlyphPoints,
    previewSimplification,
} from '../src/utils/glyphSimplify.js';

let passed = 0;
let failed = 0;
function test(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  ok ${name}`);
    } catch (e) {
        failed++;
        console.log(`  FAIL ${name}`);
        console.log(`      ${e.message}`);
    }
}

const META = { isMeta: true, scale: 1, leftMargin: 0, rightMargin: 0, yOffset: 0 };

console.log('simplifyPolyline:');

test('a straight horizontal line collapses to its endpoints', () => {
    const pts = Array.from({ length: 200 }, (_, i) => ({ x: i, y: 50 }));
    const out = simplifyPolyline(pts, 0.5, false);
    assert.strictEqual(out.length, 2, `expected 2 points, got ${out.length}`);
    assert.deepStrictEqual(out[0], { x: 0, y: 50 });
    assert.deepStrictEqual(out[1], { x: 199, y: 50 });
});

test('a corner is preserved', () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
    assert.strictEqual(simplifyPolyline(pts, 0.5, false).length, 3);
});

test('a real curve keeps enough points to describe it', () => {
    const pts = Array.from({ length: 180 }, (_, i) => {
        const a = (i / 179) * (Math.PI / 2);
        return { x: Math.cos(a) * 100, y: Math.sin(a) * 100 };
    });
    const out = simplifyPolyline(pts, 0.5, false);
    assert.ok(out.length >= 8, `curve should keep >=8 points, kept ${out.length}`);
    assert.ok(out.length < 180, 'curve should be reduced');
});

test('tolerance 0 keeps everything', () => {
    const pts = Array.from({ length: 50 }, (_, i) => ({ x: i, y: i % 2 }));
    assert.strictEqual(simplifyPolyline(pts, 0, false).length, 50);
});

test('fewer than 3 points is returned unchanged', () => {
    assert.strictEqual(simplifyPolyline([{ x: 1, y: 1 }, { x: 2, y: 2 }], 1, false).length, 2);
});

test('closed ring is thinned uniformly around the whole loop', () => {
    // A ring sampled WITHOUT a duplicated closing point, so first and last do
    // not coincide (seam gap ~2px). It must still be treated as a ring rather
    // than thinned hardest at one arbitrary point.
    const pts = [];
    for (let i = 0; i < 120; i++) {
        const a = (i / 120) * Math.PI * 2;
        pts.push({ x: 50 + Math.cos(a) * 40, y: 50 + Math.sin(a) * 40 });
    }
    const out = simplifyPolyline(pts, 0.5, true);
    assert.ok(out.length >= 8, `ring should keep >=8 points, kept ${out.length}`);
    assert.ok(out.length < 120, 'ring should be reduced');

    // Closed mode must keep points spread around the ring, not clustered in
    // one arc: every quadrant should be represented.
    for (const quadrant of [[45, 135], [135, 225], [225, 315], [315, 405]]) {
        const count = out.filter((p) => {
            const deg = (Math.atan2(p.y - 50, p.x - 50) * 180) / Math.PI;
            const d = (deg + 360) % 360;
            return d >= quadrant[0] && d < quadrant[1];
        }).length;
        assert.ok(count > 0, `no points kept in quadrant ${quadrant[0]}-${quadrant[1]}`);
    }
});

test('closed stroke gets a duplicated seam point so no gap renders', () => {
    // A ring whose first and last point coincide is re-seamed after rounding,
    // otherwise the renderer would draw a gap on the final segment.
    const pts = [];
    for (let i = 0; i <= 120; i++) {
        const a = (i / 120) * Math.PI * 2;
        pts.push({ x: 50 + Math.cos(a) * 40, y: 50 + Math.sin(a) * 40 });
    }
    // Force an exact duplicate to represent the common "closed ring" encoding.
    pts[pts.length - 1] = { x: pts[0].x, y: pts[0].y };
    const out = simplifyStroke(pts, { tolerance: 0.5, precision: 2 });
    const first = out[0];
    const last = out[out.length - 1];
    assert.deepStrictEqual(
        { x: last.x, y: last.y },
        { x: first.x, y: first.y },
        'seam point should be restored'
    );
});

console.log('\nsimplifyStroke:');

test('coordinates are rounded to the requested precision', () => {
    const pts = [{ x: 125.4950495049505, y: 43.86139671401222 }, { x: 200.123456789, y: 10.987654321 }];
    const out = simplifyStroke(pts, { tolerance: 0.5, precision: 2 });
    assert.strictEqual(out[0].x, 125.5);
    assert.strictEqual(out[0].y, 43.86);
    assert.strictEqual(out[1].x, 200.12);
    assert.strictEqual(out[1].y, 10.99);
});

test('lineCap and isFilled survive simplification', () => {
    const pts = Array.from({ length: 100 }, (_, i) => ({ x: i, y: 10 }));
    pts.lineCap = 'round';
    pts.isFilled = true;
    const out = simplifyStroke(pts, { tolerance: 0.5 });
    assert.strictEqual(out.lineCap, 'round');
    assert.strictEqual(out.isFilled, true);
});

test('sentinel stroke is left alone', () => {
    const out = simplifyStroke([{ x: -999, y: -999 }], { tolerance: 0.5 });
    assert.strictEqual(out.length, 1);
    assert.strictEqual(out[0].x, -999);
});

test('two-point strokes are still rounded', () => {
    const pts = [{ x: 1.23456789, y: 2.3456789 }, { x: 9.87654321, y: 8.7654321 }];
    const out = simplifyStroke(pts, { tolerance: 0.5, precision: 2 });
    assert.strictEqual(out[0].x, 1.23);
    assert.strictEqual(out[1].y, 8.77);
});

test('excessive tolerance is safely clamped to pixel-perfect ceiling', () => {
    const pts = [];
    for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2;
        pts.push({ x: 50 + Math.cos(a) * 30, y: 50 + Math.sin(a) * 30 });
    }
    const out = simplifyStroke(pts, { tolerance: 50, precision: 2 });
    assert.ok(out.length >= 6, `circle outline should survive excessive tolerance, kept ${out.length} pts`);
});

console.log('\nsimplifyGlyph:');

test('metadata entry is preserved exactly', () => {
    const glyph = [META, [{ x: 0, y: 0 }, { x: 100, y: 0 }]];
    assert.deepStrictEqual(simplifyGlyph(glyph, { tolerance: 0.5 })[0], META);
});

test('dense straight stroke shrinks dramatically', () => {
    const dense = Array.from({ length: 500 }, (_, i) => ({ x: i, y: 100 }));
    const glyph = [META, dense];
    assert.strictEqual(countGlyphPoints(glyph), 500);
    assert.strictEqual(countGlyphPoints(simplifyGlyph(glyph, { tolerance: 0.5 })), 2);
});

test('non-array glyph is returned unchanged', () => {
    assert.strictEqual(simplifyGlyph(null), null);
    assert.strictEqual(simplifyGlyph(undefined), undefined);
});

console.log('\nsimplifyGlyphMap + preview:');

test('map simplification reduces every glyph', () => {
    const glyphs = {};
    for (let c = 0; c < 5; c++) {
        const pts = Array.from({ length: 200 }, (_, i) => ({ x: i, y: c * 10 }));
        glyphs[0xe000 + c] = [META, pts];
    }
    const out = simplifyGlyphMap(glyphs, { tolerance: 0.5 });
    assert.strictEqual(Object.keys(out).length, 5);
    for (const key of Object.keys(out)) {
        assert.strictEqual(countGlyphPoints(out[key]), 2);
    }
});

test('preview reports reductions without mutating input', () => {
    const pts = Array.from({ length: 300 }, (_, i) => ({ x: i, y: 50 }));
    const glyphs = { 0xe000: [META, pts] };
    const frozen = JSON.stringify(glyphs);
    const p = previewSimplification(glyphs, { tolerance: 0.5 });
    assert.strictEqual(p.glyphCount, 1);
    assert.strictEqual(p.beforePoints, 300);
    assert.strictEqual(p.afterPoints, 2);
    assert.ok(p.pointReduction > 0.99, `expected >99% point reduction, got ${p.pointReduction}`);
    assert.ok(p.byteReduction > 0.9, `expected >90% byte reduction, got ${p.byteReduction}`);
    assert.strictEqual(JSON.stringify(glyphs), frozen, 'input must not be mutated');
});

test('preview handles an empty map', () => {
    const p = previewSimplification({}, {});
    assert.strictEqual(p.glyphCount, 0);
    assert.strictEqual(p.pointReduction, 0);
    assert.strictEqual(p.byteReduction, 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
// test_glyphDrawMatch.js — run with: node tests/test_glyphDrawMatch.js
import {
    sanitizeStrokes,
    normalizeStrokes,
    resampleStroke,
    scoreStrokePair,
    gradeDrawing
} from '../src/utils/glyphDrawMatch.js';

let pass = 0;
let fail = 0;
function assert(label, actual, expected) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) { pass++; console.log(`  ✓ ${label}`); }
    else { fail++; console.log(`  ✗ ${label}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`); }
}
function assertTrue(label, cond) { assert(label, !!cond, true); }
function assertFalse(label, cond) { assert(label, !!cond, false); }

// A glyph in the 0-300 source space: one horizontal bar, one vertical bar.
const CROSS = [
    [{ x: 50, y: 150 }, { x: 250, y: 150 }],
    [{ x: 150, y: 50 }, { x: 150, y: 250 }]
];
// Two separate diagonal strokes.
const TWOPARTS = [
    [{ x: 50, y: 50 }, { x: 120, y: 120 }],
    [{ x: 180, y: 180 }, { x: 250, y: 250 }]
];

console.log('— sanitizeStrokes —');
assert('rejects non-arrays', sanitizeStrokes(null), []);
assert('drops empty strokes', sanitizeStrokes([[], [{x:1,y:1}]]).length, 1);
assert('keeps single-point dots', sanitizeStrokes([[{x:5,y:5}]]).length, 1);
assert('strips junk points', sanitizeStrokes([[{x:5,y:5},null,{y:2}]])[0].length, 1);

console.log('— normalizeStrokes —');
assert('null when empty', normalizeStrokes([]), null);
// Uniform scaling must preserve aspect: a 200x100 glyph keeps a 2:1 ratio.
const n = normalizeStrokes([
    [{ x: 0, y: 0 }, { x: 200, y: 0 }],
    [{ x: 0, y: 0 }, { x: 0, y: 100 }]
]);
assertTrue('scales larger dimension to 1', Math.abs(Math.max(...n.strokes[0].map(p => p.x)) - 0.5) < 1e-9);
assertTrue('preserves aspect ratio', Math.abs(n.strokes[1][1].y - 0.25) < 1e-9);
assertTrue('centres on origin', Math.abs((n.strokes[0][0].x + n.strokes[0][1].x) / 2) < 1e-9);
assertTrue('dot-only glyph does not crash', normalizeStrokes([[{x:10,y:10}]]) !== null);

console.log('— resampleStroke —');
assert('empty in, empty out', resampleStroke([]).length, 0);
assert('dot expands to n points', resampleStroke([{ x: 1, y: 1 }]).length, 32);
const line = resampleStroke([{ x: 0, y: 0 }, { x: 100, y: 0 }], 5);
console.log('— scoreStrokePair —');
const perfect = scoreStrokePair(CROSS[0], CROSS[0]);
assertTrue('identical stroke scores ~1', perfect.score > 0.95);
assertFalse('identical stroke is not reversed', perfect.reversed);
const shifted = scoreStrokePair([{ x: 50, y: 160 }, { x: 250, y: 160 }], CROSS[0]);
assertTrue('small offset still scores high', shifted.score > 0.7);
const wrong = scoreStrokePair(CROSS[1], CROSS[0]);
assertTrue('perpendicular stroke scores low', wrong.score < 0.2);
// Same line traced end-to-start.
const rev = scoreStrokePair([{ x: 250, y: 150 }, { x: 50, y: 150 }], CROSS[0]);
assertTrue('reversed trace flagged', rev.reversed, true);
assertTrue('reversed trace keeps shape credit', rev.score > 0.9);
// A closed shape must NOT be flagged when reversed.
const circle = [];
for (let i = 0; i <= 32; i++) { const a = (i / 32) * Math.PI * 2; circle.push({ x: 150 + Math.cos(a) * 100, y: 150 + Math.sin(a) * 100 }); }
assertFalse('closed shape is not flagged reversed', scoreStrokePair([...circle].reverse(), circle).reversed);

console.log('— gradeDrawing —');
assert('no target is not gradable', gradeDrawing(CROSS, []).gradable, false);
assertFalse('empty drawing fails', gradeDrawing([], CROSS).passed);
assertTrue('empty drawing is gradable (so UI can explain)', gradeDrawing([], CROSS).gradable);

const exact = gradeDrawing(CROSS, CROSS, { checkOrder: true });
assert('exact trace passes', exact.passed, true);
assert('stroke count matches', exact.strokeCountMatch, true);
assertTrue('score is near 1', exact.score > 0.95);

// Same shape drawn at half scale and translated — uniform normalisation must
// absorb both. (A squashed, differently-proportioned glyph is deliberately NOT
// forgiven: that is covered by the aspect-ratio test in normalizeStrokes.)
const scaled = gradeDrawing([
    [{ x: 120, y: 140 }, { x: 220, y: 140 }],
    [{ x: 170, y: 90 }, { x: 170, y: 190 }]
], CROSS, { checkOrder: true });
assert('uniformly scaled + offset trace still passes', scaled.passed, true);

// Wrong order, order enforced -> should fail or at least drop sharply.
const swapped = gradeDrawing([CROSS[1], CROSS[0]], CROSS, { checkOrder: true });
const sameSet = gradeDrawing([CROSS[1], CROSS[0]], CROSS, { checkOrder: false });
assertTrue('order-free mode credits swapped strokes', sameSet.passed, true);
assertTrue('order-enforced mode penalises swapped strokes', swapped.score < sameSet.score);

// Missing a stroke is penalised via coverage.
const partial = gradeDrawing([CROSS[0]], CROSS, { checkOrder: true });
assertFalse('missing stroke fails', partial.passed);
assert('coverage reflects the missing stroke', partial.coverage, 0.5);

// Extra strokes are penalised via the count ratio.
const extra = gradeDrawing([...CROSS, CROSS[0]], CROSS, { checkOrder: true });
assertFalse('extra stroke fails', extra.passed);
assertFalse('extra stroke flagged as count mismatch', extra.strokeCountMatch);

// Reversal reporting only applies in order-enforced mode.
const reversedDraw = gradeDrawing([[...CROSS[0]].reverse(), CROSS[1]], CROSS, { checkOrder: true });
assertTrue('reversed stroke counted in order mode', reversedDraw.reversedCount >= 1);
assert('reversal not counted in order-free mode', gradeDrawing([...CROSS].reverse(), CROSS, { checkOrder: false }).reversedCount, 0);
// A backwards stroke must score below a forwards one when order is enforced.
const forwardDraw = gradeDrawing(CROSS, CROSS, { checkOrder: true });
assertTrue('backwards trace scores below forwards', reversedDraw.score < forwardDraw.score);
assertTrue('but still earns partial credit', reversedDraw.score > 0.2);

// Disjoint strokes fail cleanly.
assert('unrelated strokes fail', gradeDrawing(TWOPARTS, CROSS, { checkOrder: false }).passed, false);

// Threshold is respected.
assertTrue('threshold 0 still passes a decent trace', gradeDrawing(CROSS, CROSS, { threshold: 0 }).passed, true);

console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);

assert('first sample is the start', [line[0].x, line[0].y], [0, 0]);
assert('last sample is the end', [line[4].x, line[4].y], [100, 0]);
assertTrue('interior samples are evenly spaced', Math.abs(line[2].x - 50) < 1e-9);
assertTrue('identical points collapse to dot', resampleStroke([{x:4,y:4},{x:4,y:4},{x:4,y:4}], 3).every(p => p.x === 4));

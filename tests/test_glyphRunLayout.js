// test_glyphRunLayout.js — run with: node tests/test_glyphRunLayout.js
// Verifies the drawn run layout matches fontCompiler: the pen advance, the ink
// scale that makes the drawn ink fill that advance, and above all the Graphism
// "Letter Spacing" the compiled font receives as CSS at runtime.
import {
    INK_SCALE,
    SEPARATOR_ADVANCE,
    fontUnitsPerEm,
    letterSpacingUnits,
    layoutGlyph,
    layoutRun
} from '../src/components/UI/Glyph/glyphRunLayout.js';

let pass = 0, fail = 0;
function assert(label, actual, expected) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) { pass++; console.log(`  ✓ ${label}`); }
    else { fail++; console.log(`  ✗ ${label}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`); }
}
const assertTrue = (label, cond) => assert(label, !!cond, true);
const round = (n) => Math.round(n * 1000) / 1000;

// A drawn glyph as getGlyphMetrics() hands it over: meta + ink bounds.
const METRICS = (o = {}) => ({
    strokes: [[{ x: 100, y: 50 }, { x: 200, y: 250 }]],
    leftMargin: 40, rightMargin: 60, yOffset: 0, scale: 1,
    ink: { minX: 100, maxX: 200, minY: 50, maxY: 250, width: 100 },
    ...o
});
// part(char, flags) - flags.isNewComponent opens a new component, and
// flags.metrics overrides the meta/ink of the drawn glyph.
const part = (char, flags = {}) => ({
    char,
    ...flags,
    metrics: flags.metrics === null ? null : METRICS(flags.metrics)
});

console.log('— unitsPerEm follows Custom Font Scale —');
// fontCompiler: upe = max(10, round(1000 / fontScale))
assert('default scale gives 1000', fontUnitsPerEm(1), 1000);
assert('1.5x scale gives 667', fontUnitsPerEm(1.5), 667);
assert('2x scale gives 500', fontUnitsPerEm(2), 500);
assert('a zero scale cannot divide by zero', fontUnitsPerEm(0), 1000);

console.log('— letter spacing is resolved against the compiled em —');
assert('0em adds nothing', letterSpacingUnits(0, 1), 0);
assert('-0.25em at 1x is -250 font units', letterSpacingUnits(-0.25, 1), -250);
assert('-0.25em at 2x is -125 font units', letterSpacingUnits(-0.25, 2), -125);
assert('a missing value is treated as 0', letterSpacingUnits(undefined, 1), 0);
assert('a non-numeric value is treated as 0', letterSpacingUnits('nope', 1), 0);

console.log('— advance width matches fontCompiler —');
// fontCompiler: leftMargin + inkWidth*2.85*scale + rightMargin + traceWidth*scale
const g = layoutGlyph(METRICS(), 30);
assert('advance uses the custom margins', round(g.advance), 40 + 100 * INK_SCALE + 60 + 30);
assert('per-glyph scale widens the ink and the stroke',
    round(layoutGlyph(METRICS({ scale: 2 }), 30).advance),
    40 + 100 * INK_SCALE * 2 + 60 + 30 * 2);
assert('an inkless glyph takes the notdef advance', layoutGlyph(null, 30).advance, 500);

console.log('— ink is drawn at the scale the advance reserved —');
assert('the group scales ink by 2.85*scale', g.k, INK_SCALE);
assert('the ink starts after the left bearing', round(g.x), 40 - 100 * INK_SCALE);
assert('y is anchored so the font baseline lands on 0', round(g.y), -800);
assert('yOffset lifts the glyph off the baseline',
    round(layoutGlyph(METRICS({ yOffset: 25 }), 30).y), -825);
assert('the stroke is pre-divided by the group scale',
    round(g.stroke / g.k), round(2 * 30 / INK_SCALE));

console.log('— a run honours the Graphism letter spacing —');
const parts = [part('a'), part('b'), part('c')];
const opts = { traceWidth: 30, fontScale: 1 };
const tight = layoutRun(parts, { ...opts, letterSpacing: 0 });
const loose = layoutRun(parts, { ...opts, letterSpacing: 0.2 });
const joined = layoutRun(parts, { ...opts, letterSpacing: -0.2 });
assert('2 gaps of 0.2em widen the run by 400', round(loose.total - tight.total), 400);
assert('2 gaps of -0.2em shorten the run by 400', round(tight.total - joined.total), 400);
assert('nothing trails the last glyph', round(tight.total), round(3 * g.advance));
assert('a 2x font scale turns 0.2em into half the font units',
    round(layoutRun(parts, { ...opts, letterSpacing: 0.2, fontScale: 2 }).total - tight.total), 200);

console.log('— glyphs land on their own advance —');
const run = layoutRun(parts, { ...opts, letterSpacing: -0.2 });
const txOf = (it) => parseFloat(it.transform.match(/translate\(([-\d.]+)/)[1]);
// The group is scaled, so its origin is negative; what matters is where the ink
// lands inside it, which is fontCompiler's leftMargin.
assert('the first ink starts at the left bearing', round(txOf(run.items[0]) + 100 * g.k), 40);
assertTrue('every glyph carries a group transform',
    run.items.every((it) => it.transform.startsWith('translate(')));
assertTrue('every glyph sits left of the next one',
    run.items.every((it, i) => i === 0 || it.centerX > run.items[i - 1].centerX));

console.log('— the box never clips the ink —');
assertTrue('the box covers the whole run', run.box.width > 0 && run.box.height > 0);
assertTrue('glyphs sit above the baseline', run.box.y < 0 && run.box.y + run.box.height < 0);
const descending = layoutRun([part('a', { metrics: { ink: { minX: 100, maxX: 200, minY: 200, maxY: 295, width: 100 } } })], opts);
assertTrue('a descender drops below the baseline', descending.box.y + descending.box.height > 0);
const squished = layoutRun(parts, { ...opts, letterSpacing: -0.5 });
assertTrue('negative letter spacing pulls glyphs into each other',
    squished.box.width < run.box.width);
assertTrue('letter spacing cannot change the line height',
    round(squished.box.height) === round(run.box.height));

console.log('— separators —');
const fused = [part('a'), part('b', { isNewComponent: true })];
assert('no separator means no extra advance',
    round(layoutRun(fused, opts).total), round(2 * g.advance));
assert('a space costs the compiled space advance',
    round(layoutRun(fused, { ...opts, separator: ' ' }).total - layoutRun(fused, opts).total),
    SEPARATOR_ADVANCE);
assert('the first glyph never gets a leading separator',
    round(layoutRun([part('a', { isNewComponent: true })], { ...opts, separator: ' ' }).total),
    round(g.advance));

console.log('— glyphs with no ink —');
const missing = layoutRun([part('a'), part('b', { metrics: null })], opts);
assert('the second glyph falls back to a placeholder', missing.items[1].hasInk, false);
assertTrue('the placeholder still has a font size', missing.items[1].fontSize > 0);
assertTrue('the box still covers the placeholder',
    missing.box.y < 0 && missing.box.y + missing.box.height >= 0);

console.log('— empty run —');
assert('no parts yields no box', layoutRun([]).box, null);
assert('a default argument is safe', layoutRun().items.length, 0);

console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);

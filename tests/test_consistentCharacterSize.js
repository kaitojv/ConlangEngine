// tests/test_consistentCharacterSize.js — run with: node tests/test_consistentCharacterSize.js
// Verifies that when Consistent Character Size (Square / Monospace Em-Box) is enabled:
// 1. Every glyph has the exact same advance width (e.g. 1000 units = 1.0 em), matching CJK/ideographs/kana.
// 2. Complex/wide glyphs and simple/narrow glyphs take up identical horizontal & vertical space.
// 3. Ink is automatically centered in the em-box cell without stretching or distortion.
// 4. Per-glyph overrides and custom advance widths work as expected.

import {
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

console.log('— 1. Uniform advance widths for variable ink widths —');
// Glyph A: wide complex character (like '我'), ink width = 200
const wideMetrics = {
    strokes: [[{ x: 50, y: 50 }, { x: 250, y: 250 }]],
    leftMargin: 100, rightMargin: 100, yOffset: 0, scale: 1,
    ink: { minX: 50, maxX: 250, minY: 50, maxY: 250, width: 200, height: 200 }
};

// Glyph B: narrow simple character (like 'し' or '1'), ink width = 40
const narrowMetrics = {
    strokes: [[{ x: 130, y: 50 }, { x: 170, y: 250 }]],
    leftMargin: 100, rightMargin: 100, yOffset: 0, scale: 1,
    ink: { minX: 130, maxX: 170, minY: 50, maxY: 250, width: 40, height: 200 }
};

// Glyph C: single dot, ink width = 0
const dotMetrics = {
    strokes: [[{ x: 150, y: 150 }]],
    leftMargin: 100, rightMargin: 100, yOffset: 0, scale: 1,
    ink: { minX: 150, maxX: 150, minY: 150, maxY: 150, width: 0, height: 0 }
};

// Without consistent sizing (proportional variable width)
const varWide = layoutGlyph(wideMetrics, 30, { consistentCharacterSize: false });
const varNarrow = layoutGlyph(narrowMetrics, 30, { consistentCharacterSize: false });
assertTrue('in variable mode, wide and narrow have DIFFERENT advances', varWide.advance !== varNarrow.advance);

// With consistent sizing (Square / Monospace Em-Box Mode)
const conWide = layoutGlyph(wideMetrics, 30, { consistentCharacterSize: true });
const conNarrow = layoutGlyph(narrowMetrics, 30, { consistentCharacterSize: true });
const conDot = layoutGlyph(dotMetrics, 30, { consistentCharacterSize: true });

assert('wide glyph gets fixed advance 1000', conWide.advance, 1000);
assert('narrow glyph gets fixed advance 1000', conNarrow.advance, 1000);
assert('dot glyph gets fixed advance 1000', conDot.advance, 1000);
assert('all three have IDENTICAL advance width', conWide.advance === conNarrow.advance && conNarrow.advance === conDot.advance, true);

console.log('— 2. 50 wide ideographs match 50 narrow characters identically —');
const fiftyWide = Array.from({ length: 50 }, (_, i) => ({ char: '我', isNewComponent: true, metrics: wideMetrics }));
const fiftyNarrow = Array.from({ length: 50 }, (_, i) => ({ char: 'あ', isNewComponent: true, metrics: narrowMetrics }));

const runWide = layoutRun(fiftyWide, { consistentCharacterSize: true });
const runNarrow = layoutRun(fiftyNarrow, { consistentCharacterSize: true });

assert('50 wide characters have exact same run total as 50 narrow characters', runWide.total, runNarrow.total);
assert('50 characters exactly equal 50,000 font units (50.0 em)', runWide.total, 50000);

console.log('— 3. Ink is auto-centered horizontally inside the em-box cell —');
// For wideMetrics (width = 200 * 2.85 = 570):
// left bearing = (1000 - 570) / 2 = 215.
// ink starts at left bearing = 215, ends at 215 + 570 = 785. Distance to right edge = 215. Perfect!
const inkWidthWide = 200 * 2.85;
const expectedLeftBearingWide = Math.round((1000 - inkWidthWide) / 2);
assert('wide glyph left bearing centers the ink', conWide.x, expectedLeftBearingWide - 50 * 2.85);

// For narrowMetrics (width = 40 * 2.85 = 114):
// left bearing = (1000 - 114) / 2 = 443.
const inkWidthNarrow = 40 * 2.85;
const expectedLeftBearingNarrow = Math.round((1000 - inkWidthNarrow) / 2);
assert('narrow glyph left bearing centers the ink', conNarrow.x, expectedLeftBearingNarrow - 130 * 2.85);

console.log('— 4. Configurable advance width (e.g. 800 narrow or 1200 wide monospace) —');
const con800 = layoutGlyph(wideMetrics, 30, { consistentCharacterSize: true, fixedAdvanceWidth: 800 });
const con1200 = layoutGlyph(narrowMetrics, 30, { consistentCharacterSize: true, fixedAdvanceWidth: 1200 });

assert('supports 800 unit cell', con800.advance, 800);
assert('supports 1200 unit cell', con1200.advance, 1200);

console.log('— 5. Per-glyph consistentSize override —');
const perGlyphTrue = layoutGlyph({ ...wideMetrics, consistentSize: true }, 30, { consistentCharacterSize: false });
const perGlyphFalse = layoutGlyph({ ...wideMetrics, consistentSize: false }, 30, { consistentCharacterSize: true });

assert('per-glyph consistentSize: true wins even if global is false', perGlyphTrue.advance, 1000);
assertTrue('per-glyph consistentSize: false wins even if global is true', perGlyphFalse.advance !== 1000);

console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);

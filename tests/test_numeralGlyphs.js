// test_numeralGlyphs.js — run with: node tests/test_numeralGlyphs.js
//
// Regression cover for the numeral preview resolving to DRAWN glyphs.
//
// The bug: the number preview ran each numeral component through transliterate().
// For a logographic conlang that function only returns a lexicon entry's
// `ideogram`; anything else falls through to `return cleanWord`, i.e. the raw
// romanized letters. Those letters ("ō" = U+014D) have no drawn glyph, so the
// preview rendered a row of empty boxes - most visibly on fused components like
// "nūnī", which is why it looked like the *stems* were breaking the rendering.
//
// The fix resolves in a fixed order: lexicon ideogram -> direct glyph ->
// per-character glyphs, and drops components with no drawn form.
//
// resolveNumeralGlyphs.js is deliberately import-free so it loads straight from
// Node; getGlyphMetrics is mirrored here from resolveGlyphStrokes.js because that
// module pulls in JSX.

import {
    findCharGlyph,
    hasDrawnGlyph,
    buildLexiconIndex,
    resolveNumeralName,
    resolveNumeralComponents
} from '../src/components/UI/Glyph/resolveNumeralGlyphs.js';

let pass = 0, fail = 0;
function assert(label, actual, expected) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) { pass++; console.log(`  ✓ ${label}`); }
    else { fail++; console.log(`  ✗ ${label}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`); }
}

// --- mirror of getGlyphMetrics (resolveGlyphStrokes.js) -----------------
const cleanStrokes = (strokes) => {
    if (!strokes || !Array.isArray(strokes)) return [];
    return strokes
        .filter(Array.isArray)
        .map(s => s.filter(p => p && typeof p.x === 'number' && typeof p.y === 'number'))
        .filter(s => s.length > 0);
};
function getGlyphMetrics(raw) {
    if (!raw || !Array.isArray(raw)) return null;
    let strokes = raw;
    const first = raw[0];
    if (!Array.isArray(first) && first && first.isMeta) strokes = raw.slice(1);
    const clean = cleanStrokes(strokes);
    if (!clean.length) return null;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const s of clean) for (const p of s) {
        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    }
    if (!Number.isFinite(minX)) return null;
    return { strokes: clean, leftMargin: 100, rightMargin: 100, yOffset: 0, scale: 1, ink: { minX, maxX, minY, maxY, width: maxX - minX } };
}

// A single-stroke stand-in for a drawn glyph.
const ink = (w = 40) => [[{ x: 0, y: 0 }, { x: w, y: 40 }]];

// --- fixtures modelled on the real workspace ----------------------------
const PUA = 0xe000;
const puaChar = (n) => String.fromCodePoint(PUA + n);

const scriptDataById = {
    default: { customGlyphs: { [PUA + 1]: ink(), [PUA + 2]: ink(), [PUA + 3]: ink(), [PUA + 4]: ink() } }
};
const customGlyphs = {};   // root map empty, exactly like the real project

const lexicon = [
    { word: 'fō',  ideogram: puaChar(1) },
    { word: 'nì',  ideogram: puaChar(2) },
    { word: 'sǎ',  ideogram: puaChar(3) },
    { word: 'nū',  ideogram: puaChar(4) },
    { word: 'nī',  ideogram: '' },        // stem: no drawn form yet
    { word: 'chò', ideogram: '' }
];
const lexiconIndex = buildLexiconIndex(lexicon);

console.log('— the real-world shape: root map empty, glyphs live in scriptDataById —');
assert('root customGlyphs is empty', Object.keys(customGlyphs).length, 0);
assert('a PUA char resolves from scriptDataById', Boolean(findCharGlyph(puaChar(1), { customGlyphs, scriptDataById })), true);
assert('a romanized vowel does NOT resolve', findCharGlyph('ō', { customGlyphs, scriptDataById }), null);
assert('hasDrawnGlyph is false for raw romanization', hasDrawnGlyph('nūnī', { customGlyphs, scriptDataById }), false);

console.log('\n— lexicon ideogram wins for a logographic conlang —');
assert('fō -> its ideogram', resolveNumeralName('fō', { lexiconIndex, customGlyphs, scriptDataById }), { text: puaChar(1), source: 'lexicon' });
assert('lookup is case/asterisk insensitive', resolveNumeralName('Fō', { lexiconIndex, customGlyphs, scriptDataById }).source, 'lexicon');
assert('nī with an empty ideogram is NOT claimed as lexicon', resolveNumeralName('nī', { lexiconIndex, customGlyphs, scriptDataById }), { text: '', source: 'none' });
assert('an unlisted name is not invented', resolveNumeralName('zzz', { lexiconIndex, customGlyphs, scriptDataById }), { text: '', source: 'none' });

console.log('\n— REGRESSION: the exact failing case, 13 = fō + nūnī —');
// Component "nūnī" is power nū (drawn) fused with stem nī (NOT drawn).
const parts13 = resolveNumeralComponents(['fō', 'nūnī'], { lexiconIndex, customGlyphs, scriptDataById, getMetrics: getGlyphMetrics });
assert('the drawn part of the number survives', parts13.length, 1);
assert('and it is the ideogram for fō', parts13[0].char, puaChar(1));
assert('it carries real metrics', Boolean(parts13[0].metrics && parts13[0].metrics.strokes.length), true);
assert('no empty-box parts are emitted', parts13.filter(p => !p.metrics).length, 0);

console.log('\n— component boundaries drive the separator —');
const partsTwo = resolveNumeralComponents(['fō', 'nì'], { lexiconIndex, customGlyphs, scriptDataById, getMetrics: getGlyphMetrics });
assert('two components -> two parts', partsTwo.length, 2);
assert('first part starts a component', partsTwo[0].isComponentStart, true);
assert('second part starts a NEW component (separator goes here)', partsTwo[1].isNewComponent, true);
assert('no separator is charged inside one component', parts13.filter(p => p.isNewComponent).length, 0);

console.log('\n— alphabetic conlangs still resolve per character —');
const alphaGlyphs = { 102: ink(), 111: ink(), 110: ink() };  // f, o, n
// An EMPTY lexicon here, so this actually exercises the per-character path rather
// than short-circuiting on the ideogram for fō above.
const alpha = resolveNumeralName('fo', { lexicon: [], customGlyphs: alphaGlyphs, scriptDataById: {} });
assert('a letter-glyph conlang resolves per char', alpha.source, 'chars');
assert('and keeps every character of the name', alpha.text, 'fo');

console.log('\n— a name that is itself one drawn glyph —');
const oneGlyph = resolveNumeralName(puaChar(2), { lexicon: [], customGlyphs, scriptDataById });
assert('a single drawn ideogram resolves directly', oneGlyph, { text: puaChar(2), source: 'glyph' });

console.log('\n— guards two defects these tests caught —');
// findCharGlyph keys on the FIRST codepoint, so a 2-char name must never be
// reported as one drawn glyph just because its first letter happens to exist.
assert('a multi-char name is NOT misreported as a single glyph', resolveNumeralName('fo', { lexicon: [], customGlyphs: alphaGlyphs, scriptDataById: {} }).source, 'chars');
// Per-character resolution must be all-or-nothing, else a partially drawn name
// still renders as a mix of glyphs and empty boxes.
assert('a partially drawn name resolves to nothing', resolveNumeralName('fx', { lexicon: [], customGlyphs: alphaGlyphs, scriptDataById: {} }), { text: '', source: 'none' });

console.log('\n— degenerate inputs must not throw —');
assert('empty component list', resolveNumeralComponents([], { lexiconIndex, customGlyphs, scriptDataById }), []);
assert('empty names are dropped', resolveNumeralComponents(['', '  ', null], { lexiconIndex, customGlyphs, scriptDataById }), []);
assert('whitespace inside a name is not drawn', resolveNumeralName('a b', { lexicon: [], customGlyphs: {}, scriptDataById: {} }).text, '');
assert('a lexicon arg is optional (falls back to the passed index)', resolveNumeralName('fō', { lexiconIndex, customGlyphs, scriptDataById }).source, 'lexicon');

console.log('\n— the index must not let a bare duplicate shadow a drawn entry —');
const dupIndex = buildLexiconIndex([
    { word: 'x', ideogram: '' },
    { word: 'x', ideogram: puaChar(3) }
]);
assert('drawn duplicate wins', dupIndex.get('x').ideogram, puaChar(3));

console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);

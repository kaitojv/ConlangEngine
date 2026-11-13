// tests/test_fontExporter.js
// Verifies custom font export across Alphabetic, Syllabic, Featural/Block, and Logographic scripts,
// including Latin key aliases, OpenType GSUB ligatures, Supplementary PUA CMAP-12, chunking, and specimen HTML.

import test from 'node:test';
import assert from 'node:assert/strict';
import opentype from 'opentype.js';
import {
    collectScriptExportData,
    chunkGlyphExportData,
    exportFontArtifacts,
    buildFontFaceCss,
} from '../src/utils/fontExporter.js';
import {
    buildGlyphPathAndMetrics,
    buildOpenTypeFont,
    buildSvgPathDFromStrokes,
    fixOpenTypeChecksums,
} from '../src/utils/fontCompiler.js';
import { signedArea } from '../src/utils/polygonUnion.js';

const squareStroke = (offset = 0) => [
    { isMeta: true, scale: 1, leftMargin: 80, rightMargin: 80, yOffset: 0, xOffset: 0 },
    [
        { x: 50 + offset, y: 50 },
        { x: 200 + offset, y: 50 },
        { x: 200 + offset, y: 200 },
        { x: 50 + offset, y: 200 },
    ]
];

test('Custom Font Exporter', async (t) => {
    await t.test('exports Alphabetic script with PUA glyphs, Latin aliases, Uppercase, and digraph GSUB ligatures', async () => {
        const config = {
            conlangName: 'Aurelian',
            phonologyTypes: 'alphabetic',
            customGlyphs: {
                [0xE000]: squareStroke(0),
                [0xE001]: squareStroke(10),
                [0xE002]: squareStroke(20),
            },
            alphabetGlyphs: {
                a: '\uE000',
                a_uppercase: '\uE001',
                sh: '\uE002',
            },
            alphabetNames: {
                a: 'Alif',
                sh: 'Shin',
            },
        };

        const artifacts = await exportFontArtifacts(config, [], null, {
            familyName: 'Aurelian Sans',
            designer: 'Tester',
            yieldEvery: 0,
        });

        assert.equal(artifacts.ttfFiles.length, 1);
        const parsed = opentype.parse(artifacts.ttfFiles[0].buffer);

        assert.equal(parsed.names.fontFamily.en, 'Aurelian Sans');
        assert.equal(parsed.names.designer.en, 'Tester');

        // PUA codepoints present
        assert.ok(parsed.charToGlyphIndex('\uE000') > 0);
        assert.ok(parsed.charToGlyphIndex('\uE001') > 0);
        assert.ok(parsed.charToGlyphIndex('\uE002') > 0);

        // Direct Latin aliases present ('a' and 'A')
        assert.ok(parsed.charToGlyphIndex('a') > 0);
        assert.ok(parsed.charToGlyphIndex('A') > 0);

        // Digraph 'sh' resolves to single GSUB ligature glyph
        const shGlyphs = parsed.stringToGlyphs('sh');
        assert.equal(shGlyphs.length, 1);
        assert.equal(shGlyphs[0].unicode, 0xE002);
    });

    await t.test('exports Syllabic script with longest-match-first GSUB ligatures', async () => {
        const config = {
            conlangName: 'KanaLang',
            phonologyTypes: 'syllabic',
            customGlyphs: {
                [0xE010]: squareStroke(0),
                [0xE011]: squareStroke(10),
                [0xE012]: squareStroke(20),
            },
            syllabaryMap: {
                ka: '\uE010',
                sh: '\uE011',
                shi: '\uE012',
            },
        };

        const artifacts = await exportFontArtifacts(config, [], null, { yieldEvery: 0 });
        const parsed = opentype.parse(artifacts.ttfFiles[0].buffer);

        // 'kashi' should resolve to [ka, shi] (2 glyphs), NOT [ka, sh, i]
        const kashi = parsed.stringToGlyphs('kashi');
        assert.equal(kashi.length, 2);
        assert.equal(kashi[0].unicode, 0xE010);
        assert.equal(kashi[1].unicode, 0xE012);
    });

    await t.test('reconstructs and exports Featural Block script with Plane 15 PUA (CMAP 12) and ligatures', async () => {
        const config = {
            conlangName: 'BlockScript',
            phonologyTypes: 'featural_block',
            consonants: 'k, n',
            vowels: 'a',
            blockTemplates: [
                {
                    id: 'cvc',
                    maxChars: 3,
                    layoutTemplate: '2top1bottom',
                    slotMapping: [
                        { label: 'Init', source: 'consonants' },
                        { label: 'Vowel', source: 'vowels' },
                        { label: 'Final', source: 'consonants' },
                    ]
                }
            ],
            featuralComponents: {
                k: [[{ x: 20, y: 20 }, { x: 180, y: 180 }]],
                a: [[{ x: 100, y: 20 }, { x: 100, y: 200 }]],
                n: [[{ x: 20, y: 150 }, { x: 200, y: 150 }]],
            },
            syllabaryMap: {
                kan: String.fromCodePoint(0xF0000),
                k: String.fromCodePoint(0xF0001),
            },
        };

        const artifacts = await exportFontArtifacts(config, [], null, { yieldEvery: 0 });
        const parsed = opentype.parse(artifacts.ttfFiles[0].buffer);

        const kanIdx = parsed.charToGlyphIndex(String.fromCodePoint(0xF0000));
        assert.ok(kanIdx > 0, 'Plane 15 PUA U+F0000 should be present in CMAP format 12');

        const kanLig = parsed.stringToGlyphs('kan');
        assert.equal(kanLig.length, 1);
        assert.equal(kanLig[0].unicode, 0xF0000);
    });

    await t.test('exports Logographic script with lexicon ideograms and configurable trigger modes', async () => {
        const config = {
            conlangName: 'LogoLang',
            phonologyTypes: 'logographic',
            customGlyphs: {
                [0xE100]: squareStroke(0),
                [0xF0010]: squareStroke(15),
            },
        };
        const lexicon = [
            { id: '1', word: 'kawa', translation: 'water, river', ideogram: '\uE100' },
            { id: '2', word: 'sol', translation: 'sun', ideogram: String.fromCodePoint(0xF0010) },
        ];

        // Colon mode (:word:) + gloss ligatures
        const colonArtifacts = await exportFontArtifacts(config, lexicon, null, {
            logoTriggerMode: 'colon',
            includeGlossLigatures: true,
            yieldEvery: 0,
        });
        const colonParsed = opentype.parse(colonArtifacts.ttfFiles[0].buffer);
        const colonLigs = colonParsed.substitution.getLigatures('liga');
        const idxSeq = (str) => Array.from(str).map(ch => colonParsed.charToGlyphIndex(ch));
        const targetIdx = colonParsed.charToGlyphIndex('\uE100');
        assert.ok(colonLigs.some(l => l.by === targetIdx && JSON.stringify(l.sub) === JSON.stringify(idxSeq(':kawa:'))));
        assert.ok(colonLigs.some(l => l.by === targetIdx && JSON.stringify(l.sub) === JSON.stringify(idxSeq(':water:'))));
        // Raw 'kawa' should NOT have a ligature in colon mode
        assert.equal(colonParsed.stringToGlyphs('kawa').length, 4);

        // Raw word mode
        const wordArtifacts = await exportFontArtifacts(config, lexicon, null, {
            logoTriggerMode: 'word',
            yieldEvery: 0,
        });
        const wordParsed = opentype.parse(wordArtifacts.ttfFiles[0].buffer);
        assert.equal(wordParsed.stringToGlyphs('sol').length, 1);
        assert.equal(wordParsed.stringToGlyphs('sol')[0].unicode, 0xF0010);

        // None mode (PUA only)
        const noneData = collectScriptExportData(config, lexicon, null, {
            logoTriggerMode: 'none',
        });
        assert.equal(noneData.stats.ligatureCount, 0);
        assert.equal(noneData.stats.drawnCount, 2);
    });

    await t.test('chunks large glyph inventories into multiple valid TTF parts and CSS unicode-range', async () => {
        const glyphs = {};
        for (let i = 0; i < 25; i++) {
            glyphs[0xE000 + i] = squareStroke(i);
        }
        const config = {
            conlangName: 'MegaLogo',
            phonologyTypes: 'logographic',
            customGlyphs: glyphs,
        };

        const data = collectScriptExportData(config, [], null, { maxGlyphsPerFont: 10 });
        const chunks = chunkGlyphExportData(data, 10);
        assert.equal(chunks.length, 3);
        assert.equal(chunks[0].unicodeRange, 'U+E000-E009');
        assert.equal(chunks[1].unicodeRange, 'U+E00A-E013');
        assert.equal(chunks[2].unicodeRange, 'U+E014-E018');

        const artifacts = await exportFontArtifacts(config, [], null, {
            maxGlyphsPerFont: 10,
            yieldEvery: 0,
        });
        assert.equal(artifacts.ttfFiles.length, 3);
        assert.ok(artifacts.cssText.includes('unicode-range: U+E000-E009;'));
        assert.ok(artifacts.cssText.includes('MegaLogo_Main_Script_Part2.ttf'));

        const parsedPart2 = opentype.parse(artifacts.ttfFiles[1].buffer);
        assert.ok(parsedPart2.charToGlyphIndex('\uE00A') > 0);
    });

    await t.test('escapes HTML safely in specimen sheet and builds valid glyph-map JSON', async () => {
        const config = {
            conlangName: 'Test<Script>',
            phonologyTypes: 'alphabetic',
            customGlyphs: { [0xE000]: squareStroke(0) },
            alphabetGlyphs: { a: '\uE000' },
            alphabetNames: { a: '<img src=x onerror=alert(1)>' },
        };

        const artifacts = await exportFontArtifacts(config, [], null, { yieldEvery: 0 });
        assert.ok(!artifacts.specimenHtml.includes('<img src=x'));
        assert.ok(artifacts.specimenHtml.includes('&lt;img src=x'));

        const map = JSON.parse(artifacts.mappingJson);
        assert.equal(map.glyphs.length, 1);
        assert.equal(map.aliases.length, 1);
        assert.equal(map.aliases[0].key, 'a');

        const css = buildFontFaceCss('My Font', [{ filename: 'My_Font.ttf' }]);
        assert.ok(css.includes("font-family: 'My Font'"));
    });

    await t.test('unions crossing/curved strokes into non-overlapping integer CCW contours with nib mode parity', () => {
        const extractContours = (path) => {
            const rings = [];
            let curr = null;
            for (const cmd of path.commands) {
                if (cmd.type === 'M') {
                    curr = [{ x: cmd.x, y: cmd.y }];
                    rings.push(curr);
                } else if (cmd.type === 'L' && curr) {
                    curr.push({ x: cmd.x, y: cmd.y });
                }
            }
            return rings;
        };

        // Crossing '+' strokes must merge into 1 single outer CCW contour with integer coords
        const crossStrokes = [
            { isMeta: true, scale: 1, leftMargin: 80, rightMargin: 80, yOffset: 0, xOffset: 0 },
            [{ x: 150, y: 40 }, { x: 150, y: 260 }],
            [{ x: 40, y: 150 }, { x: 260, y: 150 }],
        ];
        const crossResult = buildGlyphPathAndMetrics(crossStrokes, 20, 1.0);
        const crossRings = extractContours(crossResult.path);
        assert.equal(crossRings.length, 1);
        assert.ok(signedArea(crossRings[0]) > 0, 'outer contour must be CCW');
        for (const pt of crossRings[0]) {
            assert.equal(pt.x, Math.round(pt.x));
            assert.equal(pt.y, Math.round(pt.y));
        }

        // Closed loop 'O' must produce 1 outer CCW ring + 1 inner CW hole ring
        const loopPts = [];
        for (let i = 0; i <= 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            loopPts.push({ x: 150 + Math.cos(a) * 80, y: 150 + Math.sin(a) * 80 });
        }
        const loopResult = buildGlyphPathAndMetrics([{ isMeta: true }, loopPts], 16, 1.0);
        const loopRings = extractContours(loopResult.path);
        assert.equal(loopRings.length, 2);
        const loopAreas = loopRings.map(r => signedArea(r)).sort((a, b) => a - b);
        assert.ok(loopAreas[0] < 0, 'inner hole contour must be CW');
        assert.ok(loopAreas[1] > 0, 'outer loop contour must be CCW');

        // Calligraphy, Chisel, PaintBrush, and Serif filled shapes compile cleanly with positive CCW area
        const curvePts = [{ x: 40, y: 240 }, { x: 110, y: 180 }, { x: 190, y: 110 }, { x: 250, y: 40 }];
        const chiselRes = buildGlyphPathAndMetrics([{ isMeta: true, isChisel: true, chiselAngle: 30 }, curvePts], 20, 1.0);
        const chiselRings = extractContours(chiselRes.path);
        assert.equal(chiselRings.length, 1);
        assert.ok(signedArea(chiselRings[0]) > 0);

        const serifFilled = Object.assign(
            [{ x: 80, y: 40 }, { x: 220, y: 40 }, { x: 170, y: 90 }, { x: 130, y: 90 }],
            { isFilled: true }
        );
        const paintSerifRes = buildGlyphPathAndMetrics(
            [{ isMeta: true, isPaintBrush: true, isSerifPen: true }, [{ x: 150, y: 60 }, { x: 150, y: 240 }], serifFilled],
            20,
            1.0
        );
        const paintSerifRings = extractContours(paintSerifRes.path);
        assert.equal(paintSerifRings.length, 1);
        assert.ok(signedArea(paintSerifRings[0]) > 0);
    });

    await t.test('preserves non-ASCII/IPA characters in OpenType family name instead of replacing with spaces', async () => {
        const glyphs = { [0xE000]: squareStroke(0) };
        const { font } = await buildOpenTypeFont(glyphs, 30, 1.0, {
            familyName: 'Mɑni Script 2',
            designer: 'Zoë',
        });
        const buf = fixOpenTypeChecksums(font.toArrayBuffer());
        const parsed = opentype.parse(buf);

        assert.equal(parsed.names.fontFamily.en, 'Mɑni Script 2');
        assert.equal(parsed.names.fullName.en, 'Mɑni Script 2 Regular');
        assert.equal(parsed.names.designer.en, 'Zoë');
        assert.equal(parsed.names.postScriptName.en, 'Mani_Script_2-Regular');
    });

    await t.test('generates filled SVG outlines honoring Calligraphy, Brush, Chisel, PaintBrush, and Dot modes', () => {
        const line = [[{ x: 40, y: 150 }, { x: 100, y: 150 }, { x: 180, y: 150 }, { x: 260, y: 150 }]];
        const plainD = buildSvgPathDFromStrokes(line, { strokeWidth: 12 });
        const calligD = buildSvgPathDFromStrokes(line, { isCalligraphy: true, strokeWidth: 12 });
        const brushD = buildSvgPathDFromStrokes(line, { isBrushPen: true, strokeWidth: 12 });
        const chiselD = buildSvgPathDFromStrokes(line, { isChisel: true, chiselAngle: 0, strokeWidth: 12 });
        const paintD = buildSvgPathDFromStrokes(line, { isPaintBrush: true, strokeWidth: 12 });

        assert.ok(plainD.startsWith('M ') && plainD.endsWith(' Z'));
        assert.notEqual(calligD, plainD, 'calligraphy SVG outline must differ from uniform stroke');
        assert.notEqual(brushD, plainD, 'brush pen SVG outline must differ from uniform stroke');
        assert.notEqual(paintD, plainD, 'paint brush SVG outline must differ from uniform stroke');
        assert.notEqual(
            chiselD,
            buildSvgPathDFromStrokes(line, { isChisel: true, chiselAngle: 90, strokeWidth: 12 }),
            'chisel SVG outline must respond to chiselAngle'
        );

        // Single-point dot produces non-empty closed outline instead of being dropped
        const dotD = buildSvgPathDFromStrokes([[{ x: 150, y: 150 }]], { strokeWidth: 10 });
        assert.ok(dotD.startsWith('M ') && dotD.endsWith(' Z'));
    });
});

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
});

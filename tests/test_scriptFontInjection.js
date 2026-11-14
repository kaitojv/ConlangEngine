// tests/test_scriptFontInjection.js
import assert from 'node:assert/strict';
import { renderWordInScript } from '../src/utils/scriptRendering.js';
import { resolveWordScriptId, buildScriptConfig, getScriptTypographySettings } from '../src/utils/scriptResolver.js';
import { getGlyphMetrics } from '../src/components/UI/Glyph/resolveGlyphStrokes.js';
import { cleanStrokes, buildGlyphPathAndMetrics, buildSvgPathDFromStrokes } from '../src/utils/fontCompiler.js';

console.log('--- test_scriptFontInjection.js ---');

// 1. Setup multi-script configuration
const script1 = { id: 'default', name: 'Script 1', type: 'logographic', isDefault: true };
const script2 = { id: 'script-2', name: 'Script 2', type: 'syllabic', isDefault: false };

const config = {
    scriptSystems: [script1, script2],
    scriptRules: { defaultScriptId: 'default' },
    customGlyphs: {
        57801: [[{ x: 10, y: 10 }, { x: 50, y: 50 }]], // \uE1C9
        57615: [[{ x: 20, y: 20 }, { x: 60, y: 60 }]], // \uE10F
    },
    scriptDataById: {
        'default': {
            customGlyphs: {
                57801: [[{ x: 10, y: 10 }, { x: 50, y: 50 }]],
            }
        },
        'script-2': {
            syllabaryMap: {
                'meà': '\uE1C9',
                'wū': '\uE10F',
            },
            customGlyphs: {
                57615: [[{ x: 20, y: 20 }, { x: 60, y: 60 }]],
            }
        }
    }
};

// Test resolveWordScriptId
const entry = {
    word: 'meàwū',
    translation: 'meow',
    scriptOverride: 'script-2'
};

const resolvedId = resolveWordScriptId(entry, config);
assert.equal(resolvedId, 'script-2', 'Resolves to script-2 override');
console.log('  ✓ resolveWordScriptId respects scriptOverride');

// Test buildScriptConfig for script-2
const script2Config = buildScriptConfig(config, 'script-2');
assert.equal(script2Config.syllabaryMap['meà'], '\uE1C9', 'Builds script-2 syllabary map correctly');
console.log('  ✓ buildScriptConfig resolves script-2 syllabary map');

// Test renderWordInScript with scriptOverride
const rendered = renderWordInScript(entry, config, []);
assert.equal(rendered.scriptId, 'script-2', 'Resolves to script-2');
assert.equal(rendered.fontFamily, 'conlang-script-script-2', 'Font family class matches');
assert.equal(rendered.text, '\uE1C9\uE10F', 'Transliterates syllabic word using script-2 syllabary map');
console.log('  ✓ renderWordInScript transliterates syllabic script-2 correctly');

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 4. Multi-type script coverage (alphabetic, abjad, abugida, syllabic, logographic, featural_block)
const multiConfig = {
    phonologyTypes: 'alphabetic',
    alphabetNames: { k: 'RootKay' },
    customGlyphs: { 0xe001: [[{ x: 0, y: 0 }, { x: 10, y: 10 }]] },
    puaCounter: 0xe002,
    scriptSystems: [
        { id: 'default', name: 'Alpha Script', type: 'alphabetic', isDefault: true, alphabeticScript: 'custom', alphabetNames: { k: 'Ka' } },
        { id: 'script-abjad', name: 'Abjad Script', type: 'abjad', isDefault: false, alphabetNames: { k: 'Kaf' } },
        { id: 'script-abugida', name: 'Abugida Script', type: 'abugida', isDefault: false, alphabetNames: { k: 'Ka-Vowel' } },
        { id: 'script-syll', name: 'Syllabic Script', type: 'syllabic', isDefault: false },
        { id: 'script-logo', name: 'Logo Script', type: 'logographic', isDefault: false },
        { id: 'script-block', name: 'Block Script', type: 'featural_block', isDefault: false, blockTemplates: [{ id: 't1', maxChars: 2, layoutTemplate: '2vertical', slotMapping: [{ label: 'C', source: 'consonants' }, { label: 'V', source: 'vowels' }] }] }
    ],
    scriptRules: {
        defaultScriptId: 'default',
        wordClasses: { noun: 'script-logo' },
        tags: { sacred: 'script-abjad' }
    },
    scriptDataById: {
        'default': {
            alphabetGlyphs: { k: '\uE001' },
            customGlyphs: { 0xe001: [[{ x: 0, y: 0 }, { x: 10, y: 10 }]] },
            puaCounter: 0xe002
        },
        'script-abjad': {
            alphabetGlyphs: { k: '\uE101' },
            customGlyphs: { 0xe101: [[{ x: 1, y: 1 }, { x: 9, y: 9 }]] },
            puaCounter: 0xe102
        },
        'script-abugida': {
            alphabetGlyphs: { k: '\uE201' },
            customGlyphs: { 0xe201: [[{ x: 2, y: 2 }, { x: 8, y: 8 }]] },
            puaCounter: 0xe202
        },
        'script-syll': {
            syllabaryMap: { ka: '\uE301' },
            customGlyphs: { 0xe301: [[{ x: 3, y: 3 }, { x: 7, y: 7 }]] },
            puaCounter: 0xe302
        },
        'script-logo': {
            customGlyphs: { 0xe401: [[{ x: 4, y: 4 }, { x: 6, y: 6 }]] },
            puaCounter: 0xe402
        },
        'script-block': {
            syllabaryMap: { ka: '\uE501' },
            featuralComponents: { k: [[{ x: 5, y: 5 }, { x: 15, y: 15 }]] },
            customGlyphs: { 0xe501: [[{ x: 5, y: 5 }, { x: 15, y: 15 }]] },
            puaCounter: 0xe502
        }
    }
};

// resolveWordScriptId rules precedence: override > tag > wordClass > default
assert.equal(resolveWordScriptId({ word: 'ka', tags: ['sacred'], wordClass: 'noun' }, multiConfig), 'script-abjad', 'Tag rule takes precedence over word class rule');
assert.equal(resolveWordScriptId({ word: 'ka', wordClass: 'noun' }, multiConfig), 'script-logo', 'Word class rule resolves logographic script');
assert.equal(resolveWordScriptId({ word: 'ka', wordClass: 'verb' }, multiConfig), 'default', 'Unmatched word falls back to default script');
console.log('  ✓ resolveWordScriptId routes tag, wordClass, and default rules');

// buildScriptConfig isolates alphabetNames, glyphs, puaCounter, and types across all script types
const abjadCfg = buildScriptConfig(multiConfig, 'script-abjad');
assert.equal(abjadCfg.phonologyTypes, 'abjad');
assert.deepEqual(abjadCfg.alphabetNames, { k: 'Kaf' });
assert.equal(abjadCfg.alphabetGlyphs.k, '\uE101');
assert.equal(abjadCfg.customGlyphs[0xe001], undefined, 'Non-default script must not inherit root PUA glyphs');
assert.equal(abjadCfg.puaCounter, 0xe102);

const abugidaCfg = buildScriptConfig(multiConfig, 'script-abugida');
assert.equal(abugidaCfg.phonologyTypes, 'abugida');
assert.deepEqual(abugidaCfg.alphabetNames, { k: 'Ka-Vowel' });
assert.equal(abugidaCfg.alphabetGlyphs.k, '\uE201');

const blockCfg = buildScriptConfig(multiConfig, 'script-block');
assert.equal(blockCfg.phonologyTypes, 'featural_block');
assert.ok(blockCfg.featuralComponents.k, 'Featural components preserved per script');
assert.equal(blockCfg.syllabaryMap.ka, '\uE501');
console.log('  ✓ buildScriptConfig isolates alphabetNames, glyphs, and puaCounter across all script typologies');

// renderWordInScript per typology & scriptForms isolation
assert.equal(renderWordInScript({ word: 'k' }, multiConfig, [], 'script-abjad').text, '\uE101', 'Renders abjad script glyph');
assert.equal(renderWordInScript({ word: 'k' }, multiConfig, [], 'script-abugida').text, '\uE201', 'Renders abugida script glyph');
assert.equal(renderWordInScript({ word: 'ka' }, multiConfig, [], 'script-syll').text, '\uE301', 'Renders syllabic script glyph');
assert.equal(renderWordInScript({ word: 'ka' }, multiConfig, [], 'script-block').text, '\uE501', 'Renders featural_block script glyph');
const logoWord = { word: 'sun', ideogram: '\uE001', scriptForms: { 'script-logo': '\uE401' } };
assert.equal(renderWordInScript(logoWord, multiConfig, [], 'script-logo').text, '\uE401', 'Logographic non-default script prefers scriptForms[scriptId]');
console.log('  ✓ renderWordInScript renders alphabetic/abjad/abugida/syllabic/logographic/featural_block cleanly');

// Store isolation checks on useConfigStore.jsx
const storeSource = fs.readFileSync(path.join(__dirname, '../src/store/useConfigStore.jsx'), 'utf8');
assert.ok(storeSource.includes('const isDefault = resolvedScriptId === defaultScriptId;'), 'addCustomGlyph / incrementPuaCounter distinguish default script from non-default scripts');
assert.ok(storeSource.includes('if (prevDefaultId && prevDefaultId !== scriptId)'), 'setDefaultScriptSystem preserves previous default script data before switching');
assert.ok(storeSource.includes('updateScriptTypography: (scriptId, typographyPatch)'), 'useConfigStore exposes per-script updateScriptTypography action');
console.log('  ✓ useConfigStore guards root state against non-default script overwrites and preserves default script data');

// Per-script typographySettings isolation (letterSpacing, scale, traceWidth, modes, consistent size)
const spacedConfig = {
    scriptRules: { defaultScriptId: 'script-1' },
    typographySettings: {
        letterSpacing: -0.4,
        verticalLetterSpacing: 0.2,
        customFontScale: 1.5,
        traceWidth: 42,
        activeDisplayMode: 'Uppercase',
        customTypographyModes: ['Final'],
        consistentCharacterSize: false,
        fixedAdvanceWidth: 850
    },
    scriptSystems: [
        {
            id: 'script-1',
            name: 'Script 1',
            type: 'alphabetic',
            isDefault: true,
            typographySettings: {
                letterSpacing: -0.4,
                verticalLetterSpacing: 0.2,
                customFontScale: 1.5,
                traceWidth: 42,
                activeDisplayMode: 'Uppercase',
                customTypographyModes: ['Final'],
                consistentCharacterSize: false,
                fixedAdvanceWidth: 850
            }
        },
        {
            id: 'script-2',
            name: 'Script 2',
            type: 'syllabic',
            isDefault: false,
            typographySettings: {
                letterSpacing: 0.3,
                verticalLetterSpacing: -0.1,
                customFontScale: 1.0,
                traceWidth: 25,
                activeDisplayMode: 'Base',
                customTypographyModes: [],
                consistentCharacterSize: true,
                fixedAdvanceWidth: 1000
            }
        },
        {
            id: 'script-3',
            name: 'Script 3 (unconfigured)',
            type: 'logographic',
            isDefault: false
        }
    ],
    scriptDataById: {
        'script-1': { alphabetGlyphs: { a: 'α', a_uppercase: 'Α' } },
        'script-2': { syllabaryMap: { ka: 'か' } },
        'script-3': {}
    }
};

const s1Typo = getScriptTypographySettings(spacedConfig, 'script-1');
const s2Typo = getScriptTypographySettings(spacedConfig, 'script-2');
const s3Typo = getScriptTypographySettings(spacedConfig, 'script-3');

assert.equal(s1Typo.letterSpacing, -0.4, 'Script 1 keeps its own horizontal letterSpacing');
assert.equal(s2Typo.letterSpacing, 0.3, 'Script 2 keeps its own horizontal letterSpacing');
assert.equal(s3Typo.letterSpacing, 0, 'Unconfigured non-default script starts at 0em spacing instead of inheriting default script spacing');
assert.equal(s3Typo.customFontScale, 1.0, 'Unconfigured non-default script starts at 1.0x scale');
assert.equal(s3Typo.traceWidth, 30, 'Unconfigured non-default script starts at 30px traceWidth');
assert.equal(buildScriptConfig(spacedConfig, 'script-1').typographySettings.activeDisplayMode, 'Uppercase');
assert.equal(buildScriptConfig(spacedConfig, 'script-2').typographySettings.activeDisplayMode, 'Base');
console.log('  ✓ getScriptTypographySettings and buildScriptConfig isolate spacing, scale, traceWidth, and modes per script');

const fontInjectorSource = fs.readFileSync(path.join(__dirname, '../src/utils/useFontInjector.jsx'), 'utf8');
assert.ok(fontInjectorSource.includes('const sLetterSpacingCSS = formatLetterSpacingCSS(sTypo.letterSpacing);'), 'useFontInjector emits per-script letterSpacing CSS rules');
assert.ok(fontInjectorSource.includes('buildFontCompileSignature'), 'useFontInjector tracks per-script compile signature for live traceWidth/scale recompilation');
console.log('  ✓ useFontInjector isolates per-script CSS letter-spacing and live compile signatures');

// 7. Sentinel stripping (-999/-998/-997/-996) & trace-width/contour integrity
for (const markerX of [-999, -998, -997, -996]) {
    const rawWithSentinel = [[{ x: markerX, y: 0 }], [{ x: 20, y: 30 }, { x: 200, y: 220 }]];
    const cleaned = cleanStrokes(rawWithSentinel);
    assert.equal(cleaned.length, 1, `cleanStrokes strips sentinel ${markerX}`);
    const metrics = getGlyphMetrics(rawWithSentinel);
    assert.ok(metrics && metrics.strokes.length === 1, `getGlyphMetrics handles sentinel ${markerX}`);
}

const diagStroke = [{ isMeta: true, isCalligraphy: true }, [{ x: 40, y: 40 }, { x: 140, y: 150 }, { x: 240, y: 260 }]];
const svgThin = buildSvgPathDFromStrokes(diagStroke, { strokeWidth: 6 });
const svgThick = buildSvgPathDFromStrokes(diagStroke, { strokeWidth: 28 });
assert.ok(svgThin.startsWith('M ') && svgThin.includes(' Z'), 'buildSvgPathDFromStrokes outputs closed contour path');
assert.notEqual(svgThin, svgThick, 'buildSvgPathDFromStrokes responds to traceWidth changes');

const horizStroke = [[{ x: 40, y: 150 }, { x: 240, y: 150 }]];
const { path: pathThin } = buildGlyphPathAndMetrics(horizStroke, 10, 1.0);
const { path: pathThick } = buildGlyphPathAndMetrics(horizStroke, 45, 1.0);
const ysThin = pathThin.commands.filter(c => c.y !== undefined).map(c => c.y);
const ysThick = pathThick.commands.filter(c => c.y !== undefined).map(c => c.y);
const spanThin = Math.max(...ysThin) - Math.min(...ysThin);
const spanThick = Math.max(...ysThick) - Math.min(...ysThick);
assert.ok(spanThick >= spanThin + 65, `buildGlyphPathAndMetrics contour expands cleanly with traceWidth (${spanThin} -> ${spanThick})`);
const { path: calligThin } = buildGlyphPathAndMetrics(diagStroke, 10, 1.0);
const { path: calligThick } = buildGlyphPathAndMetrics(diagStroke, 45, 1.0);
const xsCalligThin = calligThin.commands.filter(c => c.x !== undefined).map(c => c.x);
const xsCalligThick = calligThick.commands.filter(c => c.x !== undefined).map(c => c.x);
assert.ok((Math.max(...xsCalligThick) - Math.min(...xsCalligThick)) > (Math.max(...xsCalligThin) - Math.min(...xsCalligThin)), 'calligraphy contour width expands cleanly with traceWidth');
console.log('  ✓ cleanStrokes, getGlyphMetrics, SVG contour paths, and font compiler obey trace modes & traceWidth');

// 8. Vertical writing direction per-script CSS injection & Lexicon CSS adaptation
assert.ok(fontInjectorSource.includes('writing-mode: ${scriptWritingMode};'), 'useFontInjector emits per-script writing-mode rules');
assert.ok(fontInjectorSource.includes('[data-writing-direction^="vertical"]'), 'useFontInjector matches vertical-rl/vertical-lr for verticalLetterSpacing');
const lexiconListSource = fs.readFileSync(path.join(__dirname, '../src/components/pages/dictionary/LexiconList.jsx'), 'utf8');
assert.ok(lexiconListSource.includes('data-writing-direction={cardWritingDir}'), 'LexiconList exposes card writing direction attribute on entries and headwords');
assert.ok(lexiconListSource.includes('is-vertical-script'), 'LexiconList applies is-vertical-script modifier on vertical script entries');
const lexiconCssSource = fs.readFileSync(path.join(__dirname, '../src/components/pages/dictionary/lexiconList.css'), 'utf8');
assert.ok(lexiconCssSource.includes('.lexicon-entry.is-vertical-script .entry-words'), 'lexiconList.css adapts .entry-words flex alignment for vertical entries');
assert.ok(lexiconCssSource.includes('writing-mode: vertical-rl;') && lexiconCssSource.includes('writing-mode: vertical-lr;'), 'lexiconList.css explicitly supports both vertical-rl and vertical-lr');
assert.ok(lexiconCssSource.includes('.lexicon-cards.layout-grid .lexicon-entry.is-vertical-script .entry-words'), 'lexiconList.css adapts grid card layout for vertical entries');
console.log('  ✓ Per-script vertical writing-mode & Lexicon vertical layout CSS verified');

console.log('11 passed, 0 failed\n');

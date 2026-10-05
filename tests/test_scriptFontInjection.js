// tests/test_scriptFontInjection.js
import assert from 'node:assert/strict';
import { renderWordInScript } from '../src/utils/scriptRendering.js';
import { resolveWordScriptId, buildScriptConfig } from '../src/utils/scriptResolver.js';

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

console.log('3 passed, 0 failed\n');
